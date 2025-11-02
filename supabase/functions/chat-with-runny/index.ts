import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gather user context
    const [profileRes, runsRes, tasksRes, badgesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_tasks').select('*, tasks(*)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(10),
      supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id)
    ]);

    const profile = profileRes.data;
    const recentRuns = runsRes.data || [];
    const recentTasks = tasksRes.data || [];
    const badges = badgesRes.data || [];

    // Calculate stats
    const totalDistance = recentRuns.reduce((sum, run) => sum + (run.distance || 0), 0);
    const totalRuns = recentRuns.length;
    const completedTasks = recentTasks.filter(t => t.status === 'completed' || t.status === 'verified').length;

    // Build context
    const userContext = `
User Profile:
- Username: ${profile?.username || 'Runner'}
- Level: ${profile?.level || 1}
- XP: ${profile?.xp || 0}
- Total Runs: ${totalRuns}
- Recent Distance: ${(totalDistance / 1000).toFixed(2)} km
- Completed Tasks: ${completedTasks}/${recentTasks.length}
- Badges Earned: ${badges.length}

Recent Activity:
${recentRuns.map(r => `- Run: ${(r.distance / 1000).toFixed(2)}km in ${Math.floor(r.duration / 60)}min (${new Date(r.created_at).toLocaleDateString()})`).join('\n')}

Recent Tasks:
${recentTasks.slice(0, 5).map(t => `- ${t.tasks?.title || 'Task'}: ${t.status} (${t.xp_awarded || 0} XP)`).join('\n')}
`;

    const systemPrompt = `You are Runny, a friendly and energetic AI fitness mascot for the Strun fitness app. You help users with their running goals, provide motivation, suggest training plans, and celebrate their achievements.

Current user context:
${userContext}

Guidelines:
- Be friendly, motivating, and personal
- Use emojis occasionally for energy (🏃💪🔥⭐)
- Give actionable fitness advice based on their recent activity
- Celebrate their progress and milestones
- Suggest specific workouts, rest days, or nutrition tips when relevant
- Keep responses concise and conversational (2-4 sentences usually)
- Reference their actual stats and activities when appropriate
- If they seem tired or overtraining, suggest rest
- Encourage them to complete more tasks and earn XP
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service unavailable, please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
