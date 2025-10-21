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
    const { lat, lon, userId } = await req.json();

    if (!lat || !lon || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lon, userId' }),
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

    // Get nearby landmarks using AI
    const prompt = `Generate a creative photo task for a runner at coordinates ${lat}, ${lon}. 
    The task should be something they can photograph within 500m radius. 
    Consider landmarks, nature, architecture, or interesting objects.
    Return a JSON with this exact structure:
    {
      "title": "Short task title (max 50 chars)",
      "description": "Detailed description of what to photograph",
      "verification_prompt": "Specific instructions for AI to verify the photo"
    }`;

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
            role: 'system',
            content: 'You are a creative task generator for a location-based fitness app. Generate photo tasks that are fun, achievable, and help users explore their surroundings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_photo_task',
              description: 'Create a photo task for the user',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Short task title'
                  },
                  description: {
                    type: 'string',
                    description: 'Detailed description'
                  },
                  verification_prompt: {
                    type: 'string',
                    description: 'AI verification instructions'
                  }
                },
                required: ['title', 'description', 'verification_prompt'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_photo_task' } }
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI service payment required. Please contact support.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to generate task with AI');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const taskData = JSON.parse(toolCall.function.arguments);

    // Create task in database
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        type: 'photo',
        lat: lat,
        lon: lon,
        xp_reward: 100,
        verification_prompt: taskData.verification_prompt,
        created_by: 'system',
        active: true,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        task: task 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating task:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
