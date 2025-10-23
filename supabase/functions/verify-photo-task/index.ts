import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, userTaskId, imageBase64, lat, lon, nonce, clientTimestamp, deviceInfo } = await req.json();

    if (!taskId || !userTaskId || !imageBase64 || !lat || !lon) {
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

    // Get task and user_task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    const { data: userTask, error: userTaskError } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('id', userTaskId)
      .single();

    if (userTaskError || !userTask) {
      throw new Error('User task not found');
    }

    // Verify nonce if provided
    let nonceVerified = false;
    if (nonce) {
      const { data: nonceData, error: nonceError } = await supabase
        .from('nonces')
        .select('*')
        .eq('nonce', nonce)
        .eq('user_id', userTask.user_id)
        .eq('task_id', taskId)
        .eq('used', false)
        .single();

      if (nonceData && new Date(nonceData.expires_at) > new Date()) {
        // Mark nonce as used
        await supabase
          .from('nonces')
          .update({ used: true })
          .eq('id', nonceData.id);
        nonceVerified = true;
      }
    }

    // Verify GPS location
    const taskCoords = task.coordinates as { lat: number; lon: number };
    const distance = haversineDistance(lat, lon, taskCoords.lat, taskCoords.lon);
    const gpsVerified = distance <= (task.radius_m || 30);

    console.log('GPS Check:', { 
      distance, 
      allowed: task.radius_m,
      verified: gpsVerified,
      userLat: lat,
      userLon: lon,
      taskLat: taskCoords.lat,
      taskLon: taskCoords.lon
    });

    // Generate file hash for deduplication
    const encoder = new TextEncoder();
    const data = encoder.encode(imageBase64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store media
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .insert({
        user_id: userTask.user_id,
        task_id: taskId,
        url: imageBase64, // In production, upload to storage first
        file_hash: fileHash,
        file_type: 'photo',
        exif: {
          gps: { lat, lon },
          timestamp: clientTimestamp || new Date().toISOString(),
          device: deviceInfo
        }
      })
      .select()
      .single();

    if (mediaError) throw mediaError;

    // Verify with AI using vision model
    const verificationPrompt = task.verification_prompt || 
      `Verify if this photo/video matches the task: "${task.description}". 
      
Check:
1. Does the content match what was requested?
2. Is it clearly visible and not blurry?
3. Is it appropriate (no explicit content)?
4. Does it look authentic (not screenshot or reused)?
5. For reaction videos: is there genuine reaction/emotion?

Be strict but fair. Score 0.0 to 1.0 where:
- 1.0 = Perfect match, clear, authentic
- 0.7-0.9 = Good but minor issues
- 0.5-0.6 = Questionable quality or match
- Below 0.5 = Does not meet requirements`;

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
    const aiScore = verificationResult.confidence;
    const aiContentVerified = verificationResult.verified && aiScore > 0.5;

    // Calculate final verification score (weighted)
    const weights = {
      gps: 0.3,
      ai: 0.5,
      nonce: 0.2
    };
    
    const finalScore = (
      (gpsVerified ? 1 : 0) * weights.gps +
      aiScore * weights.ai +
      (nonceVerified ? 1 : 0) * weights.nonce
    );

    const verified = finalScore >= 0.7 && gpsVerified && aiContentVerified;
    const suspicious = !gpsVerified || !nonceVerified || aiScore < 0.6;

    console.log('Verification scores:', {
      gpsVerified,
      aiScore,
      nonceVerified,
      finalScore,
      verified,
      suspicious
    });

    // Create verification record
    await supabase.from('verifications').insert({
      user_task_id: userTaskId,
      method: 'automated',
      gps_verified: gpsVerified,
      exif_verified: true, // We checked GPS
      ai_content_verified: aiContentVerified,
      ai_score: aiScore,
      ai_reason: verificationResult.reason,
      nonce_verified: nonceVerified,
      qr_verified: false,
      final_status: verified ? 'verified' : (suspicious ? 'pending_review' : 'rejected')
    });

    // Update user_task
    const updateData: any = {
      media_id: media.id,
      status: verified ? 'verified' : 'rejected',
      verification_score: finalScore,
      lat,
      lon,
      device_meta: deviceInfo,
      suspicious,
      submitted_at: new Date().toISOString(),
      nonce_used: nonce
    };

    if (verified) {
      updateData.verified_at = new Date().toISOString();
      updateData.xp_awarded = task.xp_reward;
      updateData.sol_awarded = task.sol_reward || 0;
    }

    const { error: updateError } = await supabase
      .from('user_tasks')
      .update(updateData)
      .eq('id', userTaskId);

    if (updateError) throw updateError;

    // Award XP if verified
    if (verified) {
      await supabase.rpc('increment_xp', {
        user_id: userTask.user_id,
        xp_amount: task.xp_reward
      });

      // Generate claim token for SOL reward
      if (task.sol_reward && task.sol_reward > 0) {
        const claimToken = crypto.randomUUID();
        await supabase
          .from('user_tasks')
          .update({ claim_token: claimToken, status: 'verified' })
          .eq('id', userTaskId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        verified,
        verification_score: finalScore,
        gps_verified: gpsVerified,
        ai_verified: aiContentVerified,
        nonce_verified: nonceVerified,
        reason: verificationResult.reason,
        xp_earned: verified ? task.xp_reward : 0,
        sol_earned: verified ? (task.sol_reward || 0) : 0,
        suspicious,
        distance_meters: Math.round(distance)
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
