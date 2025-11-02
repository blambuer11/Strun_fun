import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JoinTaskSchema = z.object({
  taskId: z.string().uuid()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const body = await req.json();
    const { taskId } = JoinTaskSchema.parse(body);

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

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
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.error('Error joining task:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
