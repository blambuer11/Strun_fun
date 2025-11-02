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
    // Fix #3: Add authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user with anon key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();

    // Only allow users to create wallets for themselves
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot create wallet for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = userId || user.id;

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if wallet already exists (idempotency)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('solana_public_key')
      .eq('id', targetUserId)
      .single();

    if (existing?.solana_public_key) {
      return new Response(
        JSON.stringify({
          success: true,
          publicKey: existing.solana_public_key,
          message: 'Wallet already exists',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Creating Solana wallet for user:", targetUserId);

    // Generate new Solana keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKeyArray = Array.from(keypair.secretKey);

    // Fix #2: Implement proper encryption using Web Crypto API
    const MASTER_KEY = Deno.env.get('WALLET_MASTER_KEY') || 'default-master-key-change-in-production';
    
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive encryption key from master key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(MASTER_KEY),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt the secret key
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      encryptionKey,
      new TextEncoder().encode(JSON.stringify(secretKeyArray))
    );
    
    // Combine salt + iv + encrypted data and encode to base64
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    const encryptedKey = btoa(String.fromCharCode(...combined));

    // Update user profile with wallet info
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        solana_public_key: publicKey,
        solana_encrypted_key: encryptedKey,
      })
      .eq("id", targetUserId);

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
