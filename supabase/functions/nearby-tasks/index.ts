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
    const { lat, lon, radius_km = 10 } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing lat or lon' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all tasks (in production, use PostGIS for efficient geo queries)
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*, pools(*)')
      .or(`active_to.is.null,active_to.gte.${new Date().toISOString()}`);

    if (error) throw error;

    // Filter by distance and add distance to each task
    const now = new Date();
    const tasksWithDistance = (allTasks || [])
      .map((task: any) => {
        const taskCoords = task.coordinates as { lat: number; lon: number };
        if (!taskCoords || !taskCoords.lat || !taskCoords.lon) return null;
        
        const distance = haversineDistance(lat, lon, taskCoords.lat, taskCoords.lon);
        return {
          ...task,
          lat: taskCoords.lat,
          lon: taskCoords.lon,
          distance_meters: Math.round(distance)
        };
      })
      .filter((task: any) => {
        if (!task) return false;
        
        // Within radius
        if (task.distance_meters > radius_km * 1000) return false;
        
        // Check if active
        if (task.active_from && new Date(task.active_from) > now) return false;
        if (task.active_to && new Date(task.active_to) < now) return false;
        
        // Check if not full
        if (task.max_participants && task.current_participants >= task.max_participants) return false;
        
        return true;
      })
      .sort((a: any, b: any) => a.distance_meters - b.distance_meters);

    return new Response(
      JSON.stringify({ tasks: tasksWithDistance }),
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
