import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Task type templates for rule-based generation
const TASK_TEMPLATES = {
  qr: {
    types: ['qr'],
    baseXp: 40,
    radius: 30,
    titles: ['Check in at', 'Scan & Earn at', 'Quick check-in'],
    description: 'Scan the official QR at the location to claim XP. Must be within range.'
  },
  selfie: {
    types: ['selfie'],
    baseXp: 200,
    radius: 50,
    titles: ['Meetup selfie near', 'Group selfie at', 'Gather & snap at'],
    description: 'Join other community members, take an in-app selfie with nonce overlay to verify proximity.',
    rules: { min_participants: 3, window_seconds: 600 }
  },
  photo: {
    types: ['photo'],
    baseXp: 80,
    radius: 80,
    titles: ['Photo challenge:', 'Capture the vibe at', 'Street photo mission near'],
    description: 'Take a creative photo of the listed feature; follow rules in task details.'
  }
};

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitterPoint(center: { lat: number; lon: number }, radius_m: number) {
  const lat = center.lat;
  const metersToDeg = 1 / 111000;
  const r = Math.random() * radius_m;
  const ang = Math.random() * Math.PI * 2;
  const dx = r * Math.cos(ang);
  const dy = r * Math.sin(ang);
  const dLat = dy * metersToDeg;
  const dLon = dx * metersToDeg / Math.cos(lat * Math.PI / 180);
  return { lat: lat + dLat, lon: center.lon + dLon };
}

async function geocodeCity(cityName: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityName)}`;
  const res = await fetch(url, { 
    headers: { "User-Agent": "Strun/1.0 (fitness-app)" } 
  });
  
  if (!res.ok) throw new Error(`Geocode error ${res.status}`);
  
  const data = await res.json();
  if (!data || data.length === 0) throw new Error("City not found");
  
  const place = data[0];
  return {
    lat: Number(place.lat),
    lon: Number(place.lon),
    bbox: place.boundingbox?.map(Number) || null
  };
}

function generateRuleBasedTask(cityName: string, center: { lat: number; lon: number }, index: number, radius_m: number) {
  const templateKeys = Object.keys(TASK_TEMPLATES);
  const templateKey = templateKeys[index % templateKeys.length];
  const template = TASK_TEMPLATES[templateKey as keyof typeof TASK_TEMPLATES];
  
  const taskType = sample(template.types);
  const xpReward = Math.round(template.baseXp * (0.8 + Math.random() * 0.4));
  const location = jitterPoint(center, radius_m * 0.6);
  
  return {
    name: `${sample(template.titles)} ${cityName}`,
    title: `${sample(template.titles)} ${cityName}`,
    description: template.description,
    task_type: taskType,
    lat: Number(location.lat.toFixed(6)),
    lon: Number(location.lon.toFixed(6)),
    xp_reward: xpReward,
    rules: 'rules' in template ? template.rules : {},
    verification_prompt: `Verify that the user is at the correct location and has completed the ${taskType} task.`,
    created_by: 'system'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, userId, cityName, mode = 'single', count = 1 } = await req.json();

    // Validate input
    if (mode === 'city' && !cityName) {
      return new Response(
        JSON.stringify({ error: 'City name is required for city mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (mode === 'single' && (!lat || !lon)) {
      return new Response(
        JSON.stringify({ error: 'Coordinates are required for single mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let center = { lat, lon };
    let tasksToGenerate = count;
    let targetCityName = cityName || 'your location';

    // If city mode, geocode the city
    if (mode === 'city') {
      try {
        const geoResult = await geocodeCity(cityName);
        center = { lat: geoResult.lat, lon: geoResult.lon };
        console.log(`Geocoded ${cityName} to:`, center);
      } catch (error) {
        console.error('Geocoding error:', error);
        return new Response(
          JSON.stringify({ error: `Could not find city: ${cityName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const tasks = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Generate tasks based on mode
    if (mode === 'rule' || mode === 'city') {
      // Rule-based generation
      for (let i = 0; i < tasksToGenerate; i++) {
        const taskData = generateRuleBasedTask(targetCityName, center, i, 2000);
        
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (taskError) {
          console.error('Error inserting task:', taskError);
          continue;
        }
        
        tasks.push(task);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          tasks,
          mode: 'rule-based',
          city: targetCityName,
          center
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // AI-based generation (single task)
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI generation not available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Generate a creative photo task for a runner at ${targetCityName} (coordinates ${center.lat}, ${center.lon}). 
    The task should be something they can photograph within 500m radius. 
    Consider landmarks, nature, architecture, or interesting objects specific to this location.
    Return a JSON with this exact structure:
    {
      "title": "Short task title (max 50 chars)",
      "description": "Detailed description of what to photograph",
      "verification_prompt": "Specific instructions for AI to verify the photo"
    }`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a creative task generator for a location-based fitness app. Generate photo tasks that are fun, achievable, and help users explore their surroundings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_photo_task',
              description: 'Create a photo task for the user',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Short task title'
                  },
                  description: {
                    type: 'string',
                    description: 'Detailed description'
                  },
                  verification_prompt: {
                    type: 'string',
                    description: 'AI verification instructions'
                  }
                },
                required: ['title', 'description', 'verification_prompt'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_photo_task' } }
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI service payment required. Please contact support.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to generate task with AI');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const taskData = JSON.parse(toolCall.function.arguments);

    // Create AI-generated task in database
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        name: taskData.title,
        title: taskData.title,
        description: taskData.description,
        task_type: 'photo',
        lat: center.lat,
        lon: center.lon,
        xp_reward: 100,
        verification_prompt: taskData.verification_prompt,
        created_by: 'system',
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        task,
        tasks: [task],
        mode: 'ai',
        city: targetCityName,
        center
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating task:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
