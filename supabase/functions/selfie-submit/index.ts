import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pin file to IPFS via Pinata
async function pinFileToIPFS(file: Blob, filename: string): Promise<string> {
  const pinataJwt = Deno.env.get('PINATA_JWT');
  
  if (!pinataJwt) {
    throw new Error('PINATA_JWT not configured');
  }

  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('pinataMetadata', JSON.stringify({ name: filename }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJwt}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pinata error:', error);
    throw new Error(`Failed to pin to IPFS: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

// Calculate distance
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371000;
  
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
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const taskId = formData.get('task_id') as string;
    const lat = parseFloat(formData.get('lat') as string);
    const lon = parseFloat(formData.get('lon') as string);
    const timestamp = parseInt(formData.get('timestamp') as string);

    if (!image || !taskId || !lat || !lon || !timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image too large (max 10MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        partner_location:partner_locations(*)
      `)
      .eq('id', taskId)
      .eq('task_type', 'selfie')
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Selfie task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get rules
    const rules = task.rules || {};
    const minParticipants = rules.min_participants || 2;
    const radiusM = rules.radius_m || 50;
    const windowSeconds = rules.window_seconds || 300; // 5 minutes

    // Distance check
    if (task.partner_location) {
      const dist = distanceMeters(lat, lon, task.partner_location.lat, task.partner_location.lon);
      if (dist > radiusM + 30) {
        return new Response(
          JSON.stringify({ error: 'Out of range', distance: Math.round(dist) }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Pin image to IPFS
    const filename = `selfie-${user.id}-${Date.now()}.jpg`;
    const ipfsUri = await pinFileToIPFS(image, filename);
    console.log('Image pinned to IPFS:', ipfsUri);

    // Create user_task entry (pending)
    const { data: userTask, error: insertError } = await supabaseAdmin
      .from('user_tasks')
      .insert({
        user_id: user.id,
        task_id: taskId,
        status: 'pending',
        start_ts: new Date(timestamp * 1000).toISOString(),
        proof_ipfs: ipfsUri,
        lat,
        lon,
        xp_awarded: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user_task:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create selfie group
    const windowStart = new Date(timestamp * 1000);
    const windowEnd = new Date((timestamp + windowSeconds) * 1000);

    const { data: existingGroup } = await supabaseAdmin
      .from('selfie_groups')
      .select('*')
      .eq('task_id', taskId)
      .eq('status', 'pending')
      .lte('window_start', windowEnd.toISOString())
      .gte('window_end', windowStart.toISOString())
      .maybeSingle();

    let groupId: string;

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      // Create new group
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from('selfie_groups')
        .insert({
          task_id: taskId,
          status: 'pending',
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          center_lat: lat,
          center_lon: lon
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating selfie_group:', groupError);
        return new Response(
          JSON.stringify({ error: groupError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      groupId = newGroup.id;
    }

    // Add participant to group
    const { error: participantError } = await supabaseAdmin
      .from('selfie_participants')
      .insert({
        selfie_group_id: groupId,
        user_task_id: userTask.id,
        user_id: user.id,
        image_ipfs: ipfsUri,
        lat,
        lon
      });

    if (participantError) {
      console.error('Error adding participant:', participantError);
      // Might be duplicate, that's okay
    }

    // Check if group is complete
    const { data: participants } = await supabaseAdmin
      .from('selfie_participants')
      .select('*')
      .eq('selfie_group_id', groupId);

    const participantCount = participants?.length || 0;

    // Update participant count
    await supabaseAdmin
      .from('selfie_groups')
      .update({ participant_count: participantCount })
      .eq('id', groupId);

    if (participantCount >= minParticipants && participants) {
      // Approve all participants
      const userTaskIds = participants.map(p => p.user_task_id);
      
      await supabaseAdmin
        .from('user_tasks')
        .update({
          status: 'approved',
          xp_awarded: task.xp_reward,
          end_ts: new Date().toISOString()
        })
        .in('id', userTaskIds);

      // Award XP to all participants
      for (const p of participants) {
        await supabaseAdmin
          .rpc('increment', { x: 1, row_id: p.user_id })
          .eq('id', p.user_id);
      }

      // Update group status
      await supabaseAdmin
        .from('selfie_groups')
        .update({ status: 'approved' })
        .eq('id', groupId);

      return new Response(
        JSON.stringify({
          status: 'approved',
          xp_awarded: task.xp_reward,
          participant_count: participantCount,
          group_id: groupId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'pending',
        message: `Waiting for ${minParticipants - participantCount} more participant(s)`,
        participant_count: participantCount,
        required: minParticipants,
        group_id: groupId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in selfie-submit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});