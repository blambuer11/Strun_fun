import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Transaction, PublicKey } from "https://esm.sh/@solana/web3.js@1.95.0";
import { 
  getConnection, 
  decodePrivateKey,
  buildInstruction,
  sendAndConfirmTransaction,
  getBalance,
  airdropSol
} from "../_shared/solana-program.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { landPubkey, rentUsdc } = await req.json();
    
    if (!landPubkey || rentUsdc === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('solana_public_key, solana_encrypted_key')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.solana_encrypted_key) {
      return new Response(
        JSON.stringify({ error: 'User wallet not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userKeypair = decodePrivateKey(profile.solana_encrypted_key);
    const connection = getConnection();

    const balance = await getBalance(connection, userKeypair.publicKey);
    if (balance < 0.1) {
      await airdropSol(connection, userKeypair.publicKey, 1);
    }

    const landPDA = new PublicKey(landPubkey);

    const instruction = buildInstruction(
      4, // Set land rent instruction
      [
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: landPDA, isSigner: false, isWritable: true },
      ],
      { rentUsdc }
    );

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair]
    );

    return new Response(
      JSON.stringify({
        success: true,
        signature,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in solana-set-land-rent:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set rent', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
