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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const taskId = pathParts[pathParts.length - 2]; // /tasks/:id/share

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'task_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;

    if (!task) {
      return new Response(
        JSON.stringify({ error: 'task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://lovable.app';
    const shareText = `${task.title} — ${task.description}\nJoin me in ${task.city}! #StrunTask`;
    const shareUrl = `${APP_BASE_URL}/tasks/${taskId}`;

    // Social media share intents
    const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    const tiktokHint = {
      note: 'TikTok requires in-app upload. Use mobile share sheet.',
      share_url: shareUrl
    };

    const instagramHint = {
      note: 'Instagram posting requires app. Use share sheet or story sticker.',
      share_url: shareUrl
    };

    return new Response(
      JSON.stringify({
        shareText,
        shareUrl,
        xIntent,
        tiktokHint,
        instagramHint
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
