import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, userTaskId, imageBase64, lat, lon } = await req.json();

    if (!taskId || !userTaskId || !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Verify with AI using vision model
    const verificationPrompt = task.verification_prompt || 
      `Verify if this photo matches the task: "${task.description}". Return true only if the photo clearly shows what was requested.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: verificationPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'verify_photo',
              description: 'Verify if the photo matches the task requirements',
              parameters: {
                type: 'object',
                properties: {
                  verified: {
                    type: 'boolean',
                    description: 'True if photo matches requirements'
                  },
                  reason: {
                    type: 'string',
                    description: 'Explanation for the verification result'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0 to 1'
                  }
                },
                required: ['verified', 'reason', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'verify_photo' } }
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to verify photo with AI');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No verification result from AI');
    }

    const verificationResult = JSON.parse(toolCall.function.arguments);
    const verified = verificationResult.verified && verificationResult.confidence > 0.7;

    // Update user_task status
    const { error: updateError } = await supabase
      .from('user_tasks')
      .update({
        status: verified ? 'completed' : 'rejected',
        proof_url: imageBase64,
        completed_at: verified ? new Date().toISOString() : null,
      })
      .eq('id', userTaskId);

    if (updateError) throw updateError;

    // Award XP if verified
    if (verified) {
      const { data: userTask } = await supabase
        .from('user_tasks')
        .select('user_id')
        .eq('id', userTaskId)
        .single();

      if (userTask) {
        await supabase.rpc('increment_xp', {
          user_id: userTask.user_id,
          xp_amount: task.xp_reward
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: verified,
        reason: verificationResult.reason,
        xp_earned: verified ? task.xp_reward : 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error verifying photo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
