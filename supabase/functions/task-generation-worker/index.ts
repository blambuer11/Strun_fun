import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchPOIsForCity } from '../_shared/poi-fetcher.ts';
import { generateDraftsForPOI, normalizeDrafts } from '../_shared/llm-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Task generation worker triggered');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('task_generation_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs');
      return new Response(
        JSON.stringify({ message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each job
    for (const job of jobs) {
      try {
        console.log('Processing job:', job.id, job.city);

        // Mark as processing
        await supabase
          .from('task_generation_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        // 1. Fetch POIs
        const pois = await fetchPOIsForCity(job.city, Math.min(job.count || 20, 60));
        console.log(`Found ${pois.length} POIs for ${job.city}`);

        // Persist POIs
        for (const poi of pois) {
          await supabase
            .from('pois')
            .upsert({
              id: poi.id,
              name: poi.name,
              type: poi.type,
              lat: poi.lat,
              lon: poi.lon,
              tags: poi.tags
            });
        }

        // 2. Get sponsor if specified
        let sponsor = null;
        if (job.sponsor_id) {
          const { data: sponsorData } = await supabase
            .from('sponsors')
            .select('*')
            .eq('id', job.sponsor_id)
            .single();
          sponsor = sponsorData;
        }

        // 3. Generate tasks for each POI
        let totalGenerated = 0;
        for (const poi of pois) {
          try {
            // Generate drafts
            const drafts = await generateDraftsForPOI(poi, sponsor, 2);
            if (!drafts || drafts.length === 0) continue;

            // Normalize drafts
            const normalized = await normalizeDrafts(drafts, poi, job.city, sponsor);
            const accepted = normalized.accepted || [];

            // Insert accepted tasks
            for (const task of accepted) {
              const { error: insertError } = await supabase
                .from('tasks')
                .insert({
                  id: crypto.randomUUID(),
                  city: job.city,
                  poi_id: poi.id,
                  title: task.title,
                  name: task.title,
                  description: task.description,
                  type: task.type,
                  coordinates: task.coordinates,
                  lat: task.coordinates.lat,
                  lon: task.coordinates.lon,
                  radius_m: task.radius_m,
                  xp_reward: task.xp_reward,
                  sol_reward: task.sol_reward,
                  max_participants: task.max_participants,
                  active_from: task.active_from,
                  active_to: task.active_to,
                  creator_id: job.sponsor_id || null,
                  sponsor_id: job.sponsor_id,
                  status: 'pending',
                  meta: { generated_by: 'worker', job_id: job.id, ...task.meta }
                });

              if (!insertError) totalGenerated++;
            }

            console.log(`POI ${poi.id}: ${accepted.length} tasks generated`);
          } catch (poiError) {
            console.error(`Error processing POI ${poi.id}:`, poiError);
          }
        }

        // Mark job as completed
        await supabase
          .from('task_generation_jobs')
          .update({ 
            status: 'completed',
            tasks_generated: totalGenerated
          })
          .eq('id', job.id);

        console.log(`Job ${job.id} completed: ${totalGenerated} tasks generated`);

      } catch (jobError) {
        console.error(`Job ${job.id} failed:`, jobError);
        await supabase
          .from('task_generation_jobs')
          .update({ status: 'failed' })
          .eq('id', job.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: jobs.length,
        message: 'Jobs processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
