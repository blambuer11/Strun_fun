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
    const { userId, city, lat, lon, count = 3, solPool, maxParticipants, taskDescription, taskTitle } = await req.json();

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
      const solPerCompletion = parseFloat(solPool) / parseInt(maxParticipants);
      
      // Create pool
      const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
          creator_id: userId,
          total_funded_sol: parseFloat(solPool),
          required_creator_stake: parseFloat(solPool),
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
          max_participants: parseInt(maxParticipants),
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
    
Each task should be:
- Fun and engaging for social content
- Located at interesting public places (parks, squares, landmarks, bridges)
- Safe and accessible
- Encourage short video/photo content
- Include at least one "çak yap" (quick reaction) video task
- Include at least one QR check-in task at a landmark

For each task, provide:
{
  "title": "short catchy title",
  "description": "what user needs to do, max 100 chars",
  "type": "qr_checkin | content_photo | content_video | video_reaction",
  "coordinates": {"lat": number, "lon": number},
  "radius_m": 30-50,
  "location_name": "landmark or place name",
  "verification_prompt": "detailed prompt for AI to verify completion"
}

Return ONLY a JSON array of ${count} tasks, no other text.`;

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

    // Insert tasks into database
    const tasksToInsert = generatedTasks.map((t: any) => ({
      creator_id: userId,
      title: t.title || 'Task',
      name: t.title || 'Task',
      description: t.description || '',
      city: cityName,
      type: t.type || 'content_photo',
      coordinates: t.coordinates || { lat, lon },
      lat: t.coordinates?.lat || lat,
      lon: t.coordinates?.lon || lon,
      radius_m: t.radius_m || 30,
      xp_reward: 50,
      sol_reward: 0,
      status: 'published',
      active_from: new Date().toISOString(),
      meta: { 
        generated_by: 'ai', 
        city: cityName,
        location_name: t.location_name,
        verification_prompt: t.verification_prompt
      }
    }));

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
