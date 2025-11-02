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
    // Fix #4: Add input validation
    const body = await req.json();
    
    // Validate required fields
    if (!body.userId || typeof body.userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinates
    const lat = parseFloat(body.lat);
    const lon = parseFloat(body.lon);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return new Response(
        JSON.stringify({ error: 'Invalid latitude (must be between -90 and 90)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid longitude (must be between -180 and 180)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate count
    const count = body.count ? parseInt(body.count) : 3;
    if (isNaN(count) || count < 1 || count > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid count (must be between 1 and 10)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate solPool if provided
    const solPool = body.solPool ? parseFloat(body.solPool) : null;
    if (solPool !== null && (isNaN(solPool) || solPool < 0 || solPool > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid solPool (must be between 0 and 1000)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate maxParticipants if provided
    const maxParticipants = body.maxParticipants ? parseInt(body.maxParticipants) : null;
    if (maxParticipants !== null && (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid maxParticipants (must be between 1 and 1000)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize text fields
    const taskDescription = body.taskDescription ? String(body.taskDescription).trim().slice(0, 500) : null;
    const taskTitle = body.taskTitle ? String(body.taskTitle).trim().slice(0, 100) : null;
    const city = body.city ? String(body.city).trim().slice(0, 100) : null;
    const userId = body.userId;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check daily limit
    const canGenerate = await supabase.rpc('check_daily_task_limit', { p_user_id: userId });
    
    if (!canGenerate.data) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached', limit_reached: true }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get city name from coordinates if not provided
    let cityName = city;
    if (!cityName && lat && lon) {
      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          { headers: { 'User-Agent': 'StrunApp/1.0' } }
        );
        const geoData = await geoResponse.json();
        cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown';
      } catch (e) {
        console.error('Geocoding error:', e);
        cityName = 'Unknown';
      }
    }

    // If sponsored task
    if (solPool && maxParticipants && taskDescription) {
      const solPerCompletion = solPool / maxParticipants;
      
      // Create pool
      const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
          creator_id: userId,
          total_funded_sol: solPool,
          required_creator_stake: solPool,
          min_participants: 1,
          status: 'active'
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // Create sponsored task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          creator_id: userId,
          title: taskTitle || taskDescription.substring(0, 50),
          name: taskTitle || taskDescription.substring(0, 50),
          description: taskDescription,
          city: cityName,
          type: 'content_photo',
          coordinates: { lat, lon },
          lat,
          lon,
          radius_m: 50,
          xp_reward: 100,
          sol_reward: solPerCompletion,
          max_participants: maxParticipants,
          pool_id: pool.id,
          status: 'published',
          active_from: new Date().toISOString(),
          meta: { sponsored: true, created_by: 'user' }
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Update pool with task_id
      await supabase.from('pools').update({ task_id: task.id }).eq('id', pool.id);

      return new Response(
        JSON.stringify({ success: true, task, pool }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI tasks using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = `Generate ${count} fun, location-based tasks for ${cityName} around coordinates (${lat}, ${lon}).

IMPORTANT: Generate all tasks IN ENGLISH language only.
    
Each task should be:
- Fun and engaging for social content
- Located at interesting public places (parks, squares, landmarks, bridges)
- Safe and accessible
- Encourage short video/photo content
- Include at least one "quick reaction" video task
- Include at least one QR check-in task at a landmark

For each task, provide:
{
  "title": "short catchy title IN ENGLISH",
  "description": "what user needs to do IN ENGLISH, max 100 chars",
  "type": "qr_checkin | content_photo | content_video | video_reaction",
  "coordinates": {"lat": number, "lon": number},
  "radius_m": 30-50,
  "location_name": "landmark or place name IN ENGLISH",
  "verification_prompt": "detailed prompt IN ENGLISH for AI to verify completion"
}

Return ONLY a JSON array of ${count} tasks, no other text. ALL CONTENT MUST BE IN ENGLISH.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI error:', await aiResponse.text());
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON from AI response
    let generatedTasks = [];
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      generatedTasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error('Parse error:', e);
      generatedTasks = [];
    }

    // Insert tasks into database with parcel check
    const tasksToInsert = [];
    
    for (const t of generatedTasks) {
      const taskLat = t.coordinates?.lat || lat;
      const taskLon = t.coordinates?.lon || lon;
      
      // Check parcel ownership using coordsToParcelId
      const parcelId = await (async () => {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/check-parcel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat: taskLat, lon: taskLon })
          });
          const data = await response.json();
          return data.parcel_id;
        } catch (e) {
          console.error('Parcel check error:', e);
          return null;
        }
      })();

      let requires_rent = false;
      let rent_amount_usdc = 0;

      if (parcelId) {
        const { data: parcel } = await supabase
          .from('parcels')
          .select('owner_id, rent_amount_usdc')
          .eq('parcel_id', parcelId)
          .maybeSingle();

        if (parcel && parcel.owner_id && parcel.owner_id !== userId) {
          requires_rent = true;
          rent_amount_usdc = parcel.rent_amount_usdc || 0.10;
        }
      }

      tasksToInsert.push({
        creator_id: userId,
        title: t.title || 'Task',
        name: t.title || 'Task',
        description: t.description || '',
        city: cityName,
        type: t.type || 'content_photo',
        coordinates: { lat: taskLat, lon: taskLon },
        lat: taskLat,
        lon: taskLon,
        radius_m: t.radius_m || 30,
        xp_reward: 50,
        sol_reward: 0,
        parcel_id: parcelId,
        requires_rent,
        rent_amount_usdc,
        status: 'published',
        active_from: new Date().toISOString(),
        meta: { 
          generated_by: 'ai', 
          city: cityName,
          location_name: t.location_name,
          verification_prompt: t.verification_prompt
        }
      });
    }

    const { data: tasks, error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) throw insertError;

    // Increment daily task count
    await supabase.rpc('increment_daily_task_count', { p_user_id: userId });

    // Get remaining count
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_task_count, last_task_date')
      .eq('id', userId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const dailyRemaining = profile?.last_task_date === today ? 3 - (profile?.daily_task_count || 0) : 3;

    return new Response(
      JSON.stringify({
        success: true,
        tasks,
        city: cityName,
        daily_remaining: dailyRemaining
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
