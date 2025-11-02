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
    const { userId, title, body, data } = await req.json();
    
    if (!userId || !title) {
      return new Response(JSON.stringify({ error: 'userId and title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Get user's FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.fcm_token) {
      console.log('No FCM token found for user:', userId);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'User has not enabled notifications' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, we just log the notification
    // In production, you would send this to Firebase Cloud Messaging
    console.log('Sending notification:', {
      token: profile.fcm_token,
      title,
      body,
      data,
    });

    // TODO: Implement Firebase Cloud Messaging
    // const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    // if (FCM_SERVER_KEY) {
    //   const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `key=${FCM_SERVER_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       to: profile.fcm_token,
    //       notification: { title, body },
    //       data: data || {},
    //     }),
    //   });
    // }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Notification queued',
      token: profile.fcm_token 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
