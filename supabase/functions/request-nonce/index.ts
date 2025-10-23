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
    const { userId, taskId } = await req.json();

    if (!userId || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or taskId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate nonce (random string)
    const nonce = crypto.randomUUID() + '-' + Date.now();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store nonce
    const { data, error } = await supabase
      .from('nonces')
      .insert({
        user_id: userId,
        task_id: taskId,
        nonce,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ nonce, expires_at: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating nonce:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
