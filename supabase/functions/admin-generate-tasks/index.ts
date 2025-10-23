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
    const { city, mode = 'mix', sponsor_id = null, count = 20 } = await req.json();

    if (!city) {
      return new Response(
        JSON.stringify({ error: 'city required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a generation job record
    const jobId = crypto.randomUUID();
    const { data: job, error: jobError } = await supabase
      .from('task_generation_jobs')
      .insert({
        id: jobId,
        city,
        mode,
        sponsor_id,
        count,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      throw jobError;
    }

    // In a real system with BullMQ, we'd enqueue here.
    // For now, we'll rely on the scheduled worker to pick up pending jobs.

    return new Response(
      JSON.stringify({ 
        jobId: job.id, 
        enqueued: true,
        message: 'Job created. Worker will process it shortly.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
