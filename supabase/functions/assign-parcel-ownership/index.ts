import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { 
  extractParcelsFromRoute, 
  qualifiesForOwnership,
  coordsToParcelId 
} from "../_shared/parcel-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { runId, userId } = await req.json();

    if (!runId || !userId) {
      throw new Error("runId and userId are required");
    }

    // Fetch run details
    const { data: run, error: runError } = await supabaseClient
      .from("runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", userId)
      .single();

    if (runError || !run) {
      throw new Error("Run not found");
    }

    const distanceKm = parseFloat(run.distance) || 0;
    
    // Check if run qualifies for ownership
    if (!qualifiesForOwnership(distanceKm)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Run too short. Minimum ${0.5}km required for land ownership.` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Extract parcels from route
    const routeCoords = run.route_coordinates || [];
    if (!routeCoords.length) {
      throw new Error("No route coordinates found");
    }

    const parcels = extractParcelsFromRoute(routeCoords);
    const newOwnerships: string[] = [];

    // Check and assign ownership for each parcel
    for (const parcel of parcels) {
      const { data: existing } = await supabaseClient
        .from("parcels")
        .select("*")
        .eq("parcel_id", parcel.parcel_id)
        .maybeSingle();

      if (!existing) {
        // Get user's wallet address
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("solana_public_key")
          .eq("id", userId)
          .single();

        // Assign ownership
        const { error: insertError } = await supabaseClient
          .from("parcels")
          .insert({
            parcel_id: parcel.parcel_id,
            owner_id: userId,
            owner_wallet: profile?.solana_public_key,
            center_lat: parcel.center_lat,
            center_lon: parcel.center_lon,
            rent_amount_usdc: 0.10, // Default rent
            rent_policy: 'per_run'
          });

        if (!insertError) {
          newOwnerships.push(parcel.parcel_id);
        }
      }
    }

    // Update run with parcel IDs
    await supabaseClient
      .from("runs")
      .update({ parcel_ids: parcels.map(p => p.parcel_id) })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        parcels_crossed: parcels.length,
        new_ownerships: newOwnerships.length,
        parcel_ids: newOwnerships,
        message: newOwnerships.length > 0 
          ? `Congratulations! You now own ${newOwnerships.length} land parcel(s)!` 
          : "No new land claimed."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
