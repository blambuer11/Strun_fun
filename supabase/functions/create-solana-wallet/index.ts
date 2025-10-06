import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Keypair } from "https://esm.sh/@solana/web3.js@1.95.0";

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

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("Creating Solana wallet for user:", userId);

    // Generate new Solana keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKeyArray = Array.from(keypair.secretKey);

    // Simple encryption for secret key (in production, use proper encryption)
    const encryptedKey = btoa(JSON.stringify(secretKeyArray));

    // Update user profile with wallet info
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        solana_public_key: publicKey,
        solana_encrypted_key: encryptedKey,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      throw updateError;
    }

    console.log("Solana wallet created successfully:", publicKey);

    return new Response(
      JSON.stringify({
        success: true,
        publicKey,
        message: "Solana wallet created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-solana-wallet function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
