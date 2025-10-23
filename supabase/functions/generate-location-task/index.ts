import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, lat, lon, solPool, maxParticipants, taskDescription, count = 3 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!userId) throw new Error("userId required");

    // Check daily limit for non-sponsored tasks
    if (!solPool) {
      const { data: limitCheck } = await supabase.rpc('check_daily_task_limit', { p_user_id: userId });
      if (!limitCheck) {
        return new Response(JSON.stringify({ error: "Daily limit reached (3/day)", limit_reached: true }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
    const username = profile?.username || "Runner";

    // Sponsored task creation
    if (solPool && maxParticipants && taskDescription) {
      const { data: task } = await supabase.from("tasks").insert({
        name: taskDescription,
        description: taskDescription,
        task_type: "sponsored_challenge",
        lat, lon,
        xp_reward: 200,
        sol_pool: solPool,
        sol_per_completion: solPool / maxParticipants,
        max_participants: maxParticipants,
        current_participants: 0,
        sponsor_user_id: userId,
        created_by: username,
        active_from: new Date().toISOString(),
        active_to: new Date(Date.now() + 7 * 86400000).toISOString(),
      }).select().single();

      return new Response(JSON.stringify({ task, success: true }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // AI task generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get city name
    let city = "your area";
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, 
        { headers: { "User-Agent": "StrunApp/1.0" } });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        city = geo.address?.city || geo.address?.town || geo.address?.village || city;
      }
    } catch {}

    const prompt = `Generate ${count} fun, creative location challenges for ${city} (${lat}, ${lon}). Each must be:
- Fun & engaging (dance, photo, video, social interaction)
- Location-specific with real place names
- Instagram/TikTok worthy content
- Safe and appropriate

Types: photo_challenge, video_challenge, social_challenge, landmark_visit, scavenger_hunt, content_creation

Return JSON array:
[{"name":"Title","description":"Fun instructions","task_type":"type","location_name":"Cafe/Park name","challenge_type":"photo/dance/social","xp_reward":50-200,"lat":${lat}+offset,"lon":${lon}+offset}]`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Creative task generator. Return JSON array only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    let tasks = [];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      tasks = JSON.parse(match ? match[0] : content);
    } catch {
      tasks = [];
    }

    const tasksToInsert = tasks.map((t: any) => ({
      name: t.name,
      description: t.description,
      task_type: t.task_type || "photo_challenge",
      location_name: t.location_name,
      challenge_type: t.challenge_type,
      lat: t.lat || lat,
      lon: t.lon || lon,
      xp_reward: t.xp_reward || 100,
      created_by: username,
      active_from: new Date().toISOString(),
      active_to: new Date(Date.now() + 86400000).toISOString(),
    }));

    const { data: insertedTasks } = await supabase.from("tasks").insert(tasksToInsert).select();
    await supabase.rpc('increment_daily_task_count', { p_user_id: userId });

    const { data: profileData } = await supabase.from("profiles").select("daily_task_count").eq("id", userId).single();
    const remaining = 3 - (profileData?.daily_task_count || 0);

    return new Response(JSON.stringify({ tasks: insertedTasks, success: true, daily_remaining: remaining, city }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});