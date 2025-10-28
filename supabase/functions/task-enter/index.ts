import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Connection } from "https://esm.sh/@solana/web3.js@1.87.6";
import { calculatePaidUntil } from "../_shared/parcel-utils.ts";
import { verifyPayment, ExpectedPayment } from "../_shared/solana-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-payment",
};

const PLATFORM_TREASURY = Deno.env.get("PLATFORM_TREASURY_ADDRESS") || "TREASURY_PLACEHOLDER";
const SOLANA_RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
const USDC_MINT = Deno.env.get("USDC_MINT_ADDRESS") || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Devnet USDC

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { taskId } = await req.json();
    if (!taskId) {
      throw new Error("taskId is required");
    }

    // Fetch task details
    const { data: task, error: taskError } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error("Task not found");
    }

    // Check if rent is required
    if (!task.requires_rent || !task.parcel_id) {
      return new Response(
        JSON.stringify({ access: true, message: "No payment required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch parcel details
    const { data: parcel, error: parcelError } = await supabaseClient
      .from("parcels")
      .select("*")
      .eq("parcel_id", task.parcel_id)
      .maybeSingle();

    if (parcelError || !parcel || !parcel.owner_id) {
      return new Response(
        JSON.stringify({ access: true, message: "Parcel has no owner" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if user already has access
    const { data: existingAccess } = await supabaseClient
      .from("parcel_accesses")
      .select("*")
      .eq("parcel_id", task.parcel_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAccess && existingAccess.paid_until) {
      const paidUntil = new Date(existingAccess.paid_until);
      if (paidUntil > new Date()) {
        return new Response(
          JSON.stringify({ 
            access: true, 
            message: "Access already granted",
            paid_until: paidUntil.toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Check if payment is provided
    const txHash = req.headers.get("X-PAYMENT");
    
    if (txHash) {
      // Check replay protection
      const { data: existingPayment } = await supabaseClient
        .from("payments")
        .select("*")
        .eq("tx_hash", txHash)
        .maybeSingle();

      if (existingPayment && existingPayment.status === "verified") {
        throw new Error("Transaction already used (replay protection)");
      }

      // Generate nonce for this verification
      const nonce = crypto.randomUUID();
      
      // Verify on-chain payment
      console.log("Verifying Solana payment:", txHash);
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      
      const expected: ExpectedPayment = {
        amount: task.rent_amount_usdc.toString(),
        tokenMint: USDC_MINT,
        payTo: PLATFORM_TREASURY,
        memoPrefix: `land:${task.parcel_id}:task:${taskId}:user:${user.id}`,
        decimals: 6 // USDC decimals
      };

      const verifyResult = await verifyPayment(txHash, expected, connection);
      
      if (!verifyResult.success) {
        console.error("Payment verification failed:", verifyResult.reason);
        return new Response(
          JSON.stringify({ 
            error: "Payment verification failed", 
            reason: verifyResult.reason 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("Payment verified successfully");

      // Create payment record
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await adminClient.from("payments").insert({
        tx_hash: txHash,
        amount: task.rent_amount_usdc,
        token: "USDC",
        payer_id: user.id,
        payee_id: parcel.owner_id,
        purpose: "task_access",
        memo: verifyResult.matchedMemo || `land:${task.parcel_id}:task:${taskId}:user:${user.id}`,
        nonce: nonce,
        status: "verified",
        verified_at: new Date().toISOString()
      });

      // Grant access
      const paidUntil = calculatePaidUntil(parcel.rent_policy);
      
      await adminClient.from("parcel_accesses").insert({
        parcel_id: task.parcel_id,
        user_id: user.id,
        paid_until: paidUntil.toISOString(),
        last_paid_tx: txHash,
        amount_paid: task.rent_amount_usdc
      });

      return new Response(
        JSON.stringify({ 
          access: true, 
          message: "Payment verified on-chain, access granted",
          paid_until: paidUntil.toISOString(),
          verified: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Generate nonce for payment
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + 300_000; // 5 minutes

    // Return 402 Payment Required
    return new Response(
      JSON.stringify({
        message: "Payment required to access this task on owned land",
        payment: {
          amount: task.rent_amount_usdc.toString(),
          token: "USDC",
          pay_to: PLATFORM_TREASURY,
          owner: parcel.owner_id,
          memo: `land:${task.parcel_id}:task:${taskId}:user:${user.id}:nonce:${nonce}`,
          nonce: nonce,
          expires_at: expiresAt
        },
        parcel: {
          id: parcel.parcel_id,
          owner_id: parcel.owner_id,
          rent_policy: parcel.rent_policy
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 402 
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
