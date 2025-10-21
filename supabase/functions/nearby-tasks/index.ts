import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate distance between two points using Haversine formula
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371000; // Earth's radius in meters
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, radius_m = 5000 } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lon' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all active tasks - support both new (lat/lon) and old (partner_location) formats
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        partner_location:partner_locations(*)
      `)
      .eq('active', true);

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter and map tasks by distance
    const nearbyTasks = (tasks || [])
      .filter(task => {
        // Support tasks with direct lat/lon (new format)
        if (task.lat && task.lon) return true;
        // Support tasks with partner_location (old format)
        if (task.partner_location) return true;
        return false;
      })
      .map(task => {
        // Calculate distance based on available location data
        const taskLat = task.lat || task.partner_location?.lat;
        const taskLon = task.lon || task.partner_location?.lon;
        
        if (!taskLat || !taskLon) return null;
        
        const distance = distanceMeters(lat, lon, taskLat, taskLon);
        
        return {
          id: task.id,
          name: task.name,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          xp_reward: task.xp_reward,
          rules: task.rules,
          distance_meters: Math.round(distance),
          lat: taskLat,
          lon: taskLon,
          created_by: task.created_by,
          partner_location_id: task.partner_location_id,
          // Include partner_location if exists (for backward compatibility)
          partner_location: task.partner_location ? {
            id: task.partner_location.id,
            name: task.partner_location.name,
            lat: task.partner_location.lat,
            lon: task.partner_location.lon,
            radius_m: task.partner_location.radius_m,
            sponsor_name: task.partner_location.sponsor_name,
            sponsor_banner_url: task.partner_location.sponsor_banner_url
          } : undefined
        };
      })
      .filter(task => task && task.distance_meters <= radius_m)
      .sort((a, b) => a!.distance_meters - b!.distance_meters);

    return new Response(
      JSON.stringify({ tasks: nearbyTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in nearby-tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
