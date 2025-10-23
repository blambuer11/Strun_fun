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

    // Check daily acceptance limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_task_accept_count, last_accept_date')
      .eq('id', userId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const acceptCount = profile?.last_accept_date === today ? (profile?.daily_task_accept_count || 0) : 0;

    if (acceptCount >= 3) {
      return new Response(
        JSON.stringify({ error: 'Daily acceptance limit reached (3/day)', limit_reached: true }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if task exists and is active
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, pools(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if task is active
    const now = new Date();
    if (task.active_from && new Date(task.active_from) > now) {
      return new Response(
        JSON.stringify({ error: 'Task not yet active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (task.active_to && new Date(task.active_to) < now) {
      return new Response(
        JSON.stringify({ error: 'Task has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max participants
    if (task.max_participants && task.current_participants >= task.max_participants) {
      return new Response(
        JSON.stringify({ error: 'Task is full' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already joined
    const { data: existing } = await supabase
      .from('user_tasks')
      .select('id, status')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Already joined this task', status: existing.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user_task entry
    const { data: userTask, error: joinError } = await supabase
      .from('user_tasks')
      .insert({
        user_id: userId,
        task_id: taskId,
        status: 'pending'
      })
      .select()
      .single();

    if (joinError) throw joinError;

    // Update task participant count
    await supabase
      .from('tasks')
      .update({ current_participants: (task.current_participants || 0) + 1 })
      .eq('id', taskId);

    // Update user's daily acceptance count
    if (profile?.last_accept_date === today) {
      await supabase
        .from('profiles')
        .update({ daily_task_accept_count: acceptCount + 1 })
        .eq('id', userId);
    } else {
      await supabase
        .from('profiles')
        .update({ 
          daily_task_accept_count: 1,
          last_accept_date: today
        })
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_task: userTask,
        remaining_today: 3 - (acceptCount + 1)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error joining task:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
