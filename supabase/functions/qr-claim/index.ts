import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC verification
async function verifyHmac(payload: string, secret: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const sigBuf = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const dataBuffer = encoder.encode(payload);
  
  return await crypto.subtle.verify('HMAC', key, sigBuf, dataBuffer);
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

// Pin JSON to IPFS via Pinata
async function pinJsonToIPFS(json: any): Promise<string> {
  const pinataJwt = Deno.env.get('PINATA_JWT');
  
  if (!pinataJwt) {
    throw new Error('PINATA_JWT not configured');
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pinataJwt}`
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: `qr-claim-${Date.now()}.json`
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pinata error:', error);
    throw new Error(`Failed to pin to IPFS: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, lat, lon, timestamp, device_meta } = await req.json();

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

    // Decode token (format: taskId|timestamp|signature base64url encoded)
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split('|');
    
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [taskId, tokenTimestamp, signature] = parts;
    const tokenTs = parseInt(tokenTimestamp);

    // Freshness check (2 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tokenTs) > 120) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task and partner location with service role
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
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify HMAC signature
    const payload = `${taskId}|${tokenTimestamp}`;
    const isValid = await verifyHmac(payload, task.partner_location.qr_secret, signature);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Distance check
    const dist = distanceMeters(
      Number(lat),
      Number(lon),
      Number(task.partner_location.lat),
      Number(task.partner_location.lon)
    );

    const allowedRadius = task.partner_location.radius_m + 30; // 30m tolerance
    if (dist > allowedRadius) {
      return new Response(
        JSON.stringify({ 
          error: 'Out of range', 
          distance: Math.round(dist),
          required: allowedRadius 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already claimed this task recently (anti-spam)
    const { data: existing } = await supabaseAdmin
      .from('user_tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Task already claimed recently' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create proof and pin to IPFS
    const proof = {
      type: 'qr_claim',
      user_id: user.id,
      task_id: taskId,
      timestamp: tokenTs,
      claim_timestamp: now,
      lat,
      lon,
      distance_meters: Math.round(dist),
      device_meta
    };

    const ipfsUri = await pinJsonToIPFS(proof);
    console.log('Proof pinned to IPFS:', ipfsUri);

    // Record claim
    const { error: insertError } = await supabaseAdmin
      .from('user_tasks')
      .insert({
        user_id: user.id,
        task_id: taskId,
        status: 'approved',
        start_ts: new Date().toISOString(),
        end_ts: new Date().toISOString(),
        proof_ipfs: ipfsUri,
        xp_awarded: task.xp_reward,
        lat,
        lon,
        device_meta
      });

    if (insertError) {
      console.error('Error inserting user_task:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award XP
    const { error: xpError } = await supabaseAdmin
      .from('profiles')
      .update({ xp: supabaseAdmin.rpc('increment', { x: task.xp_reward }) })
      .eq('id', user.id);

    if (xpError) {
      console.error('Error updating XP:', xpError);
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        xp_awarded: task.xp_reward,
        proof_ipfs: ipfsUri,
        distance: Math.round(dist)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in qr-claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});