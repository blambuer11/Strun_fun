import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VerifyPhotoSchema = z.object({
  taskId: z.string().uuid(),
  userTaskId: z.string().uuid(),
  imageBase64: z.string().max(10485760), // 10MB limit
  lat: z.number().min(-90).max(90).finite(),
  lon: z.number().min(-180).max(180).finite(),
  nonce: z.string().max(100).optional(),
  clientTimestamp: z.string().datetime().optional(),
  deviceInfo: z.object({
    platform: z.string().max(50).optional(),
    model: z.string().max(100).optional()
  }).optional()
});

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
    // Validate input
    const body = await req.json();
    const { taskId, userTaskId, imageBase64, lat, lon, nonce, clientTimestamp, deviceInfo } = VerifyPhotoSchema.parse(body);

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .eq('user_id', user.id) // Verify ownership
      .single();

    if (userTaskError || !userTask) {
      throw new Error('User task not found or unauthorized');
    }

    // Verify nonce if provided
    let nonceVerified = false;
    if (nonce) {
      const { data: nonceData, error: nonceError } = await supabase
        .from('nonces')
        .select('*')
        .eq('nonce', nonce)
        .eq('user_id', user.id)
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
        user_id: user.id,
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

    console.log('Calling Lovable AI for verification...');
    
    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: verificationPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI verification failed: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const aiVerification = aiResult.choices[0].message.content;

    console.log('AI Verification Response:', aiVerification);

    // Parse AI response for score and reasoning
    let contentVerified = false;
    let aiConfidence = 0;
    let aiReasoning = aiVerification;

    // Try to extract score from response
    const scoreMatch = aiVerification.match(/(?:score|rating|confidence)[:\s]+(\d*\.?\d+)/i);
    if (scoreMatch) {
      aiConfidence = parseFloat(scoreMatch[1]);
      contentVerified = aiConfidence >= 0.6;
    } else if (aiVerification.toLowerCase().includes('verified') || 
               aiVerification.toLowerCase().includes('approved') ||
               aiVerification.toLowerCase().includes('matches')) {
      contentVerified = true;
      aiConfidence = 0.8;
    }

    // Calculate weighted final score
    const gpsWeight = 0.3;
    const aiWeight = 0.6;
    const nonceWeight = 0.1;

    const finalScore = (
      (gpsVerified ? gpsWeight : 0) +
      (contentVerified ? aiWeight : 0) +
      (nonceVerified ? nonceWeight : 0)
    );

    const isVerified = finalScore >= 0.6; // Need at least 60% score
    const xpEarned = isVerified ? (task.xp_reward || 0) : 0;

    // Record verification
    const { data: verification } = await supabase
      .from('verifications')
      .insert({
        user_task_id: userTaskId,
        media_id: media.id,
        gps_verified: gpsVerified,
        content_verified: contentVerified,
        nonce_verified: nonceVerified,
        gps_distance_m: Math.round(distance),
        ai_confidence: aiConfidence,
        ai_reasoning: aiReasoning,
        verification_score: finalScore,
        verified_at: new Date().toISOString()
      })
      .select()
      .single();

    // Update user_task status
    const newStatus = isVerified ? 'verified' : 'failed';
    await supabase
      .from('user_tasks')
      .update({
        status: newStatus,
        verification_score: finalScore,
        completed_at: isVerified ? new Date().toISOString() : null,
        xp_awarded: xpEarned
      })
      .eq('id', userTaskId);

    if (isVerified && xpEarned > 0) {
      // Award XP (handled by trigger, but generate claim token for SOL rewards)
      const claimToken = crypto.randomUUID();
      await supabase
        .from('user_tasks')
        .update({ sol_claim_token: claimToken })
        .eq('id', userTaskId);
    }

    console.log('Verification Result:', {
      gpsVerified,
      contentVerified,
      nonceVerified,
      finalScore,
      isVerified,
      xpEarned
    });

    return new Response(
      JSON.stringify({
        success: isVerified,
        verification: {
          gps_verified: gpsVerified,
          content_verified: contentVerified,
          nonce_verified: nonceVerified,
          distance_meters: Math.round(distance),
          ai_confidence: aiConfidence,
          final_score: finalScore,
          status: newStatus
        },
        xp_earned: xpEarned,
        message: isVerified 
          ? 'Task verified successfully!' 
          : `Verification failed. Score: ${(finalScore * 100).toFixed(0)}% (need 60%)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Verification Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Verification failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
