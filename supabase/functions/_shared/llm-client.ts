/**
 * LLM Client - Uses Lovable AI for task generation
 */

import type { POI } from './poi-fetcher.ts';

export interface TaskDraft {
  title: string;
  description: string;
  type: string;
  suggested_radius_m: number;
  suggested_duration_seconds: number;
  suggested_xp: number;
  suggested_sol_reward: number | null;
  max_participants: number;
}

export interface NormalizedTask {
  id: string;
  city: string;
  poi_id: string;
  title: string;
  description: string;
  type: string;
  coordinates: { lat: number; lon: number };
  radius_m: number;
  xp_reward: number;
  sol_reward: number | null;
  max_participants: number;
  active_from: string;
  active_to: string;
  meta: Record<string, any>;
}

export interface Sponsor {
  id: string;
  name: string;
  allowed_categories?: string[];
  disallowed_terms?: string[];
  per_task_budget_sol?: number;
}

export async function generateDraftsForPOI(
  poi: POI,
  sponsor: Sponsor | null = null,
  count = 3
): Promise<TaskDraft[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const sponsorText = sponsor 
    ? `Sponsor: ${sponsor.name}, allowed_categories: ${sponsor.allowed_categories?.join(',') || 'any'}, disallowed_terms: ${sponsor.disallowed_terms?.join(',') || 'none'}`
    : 'No sponsor';

  const prompt = `You are EventGen, a creative location-based micro-task generator.

POI: ${poi.name} (type: ${poi.type}) at ${poi.lat},${poi.lon}.
${sponsorText}

Generate up to ${count} fun, family-friendly micro-tasks for this POI. Each task must be:
- Safe and accessible
- Doable in public spaces
- Photo/video friendly
- ${sponsor ? 'Respect sponsor disallowed_terms' : 'Generic'}

For each task output JSON object with:
{
  "title": "short catchy title",
  "description": "what user does (1-2 sentences)",
  "type": "photo" | "video" | "qr_checkin" | "reaction",
  "suggested_radius_m": 30-50,
  "suggested_duration_seconds": 60-300,
  "suggested_xp": 10-100,
  "suggested_sol_reward": ${sponsor ? (sponsor.per_task_budget_sol || 0.05) : 'null'},
  "max_participants": 5-20
}

Return ONLY a JSON array of ${count} tasks.`;

  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) throw new Error('AI request failed');

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (error) {
    console.error('Draft generation error:', error);
    return [];
  }
}

export async function normalizeDrafts(
  drafts: TaskDraft[],
  poi: POI,
  city: string,
  sponsor: Sponsor | null = null
): Promise<{ accepted: NormalizedTask[]; rejected: any[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `You are a strict normalizer. Convert draft tasks to canonical schema.

POI: ${poi.name} at ${poi.lat},${poi.lon}
City: ${city}
Drafts: ${JSON.stringify(drafts)}

Rules:
- Generate unique task IDs (e.g., "gen-abc123")
- Set active_from = now + 1 hour (ISO format)
- Set active_to = now + 7 days (ISO format)
- Reject if: unsafe, private property, violates sponsor terms
- Ensure sol_reward <= ${sponsor?.per_task_budget_sol || 0} if sponsor exists

Output JSON:
{
  "accepted": [{ id, city, poi_id, title, description, type, coordinates: {lat, lon}, radius_m, xp_reward, sol_reward, max_participants, active_from, active_to, meta: {} }],
  "rejected": [{ draft, reason }]
}`;

  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0
      })
    });

    if (!resp.ok) throw new Error('Normalize request failed');

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { accepted: [], rejected: [] };
    
    return {
      accepted: parsed.accepted || [],
      rejected: parsed.rejected || drafts.map(d => ({ draft: d, reason: 'parse_failed' }))
    };
  } catch (error) {
    console.error('Normalize error:', error);
    return {
      accepted: [],
      rejected: drafts.map(d => ({ draft: d, reason: 'normalize_failed' }))
    };
  }
}
