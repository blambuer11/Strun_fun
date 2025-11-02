import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Transaction, SystemProgram } from "https://esm.sh/@solana/web3.js@1.95.0";
import { 
  getConnection, 
  decodePrivateKey,
  findRunPDA,
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
    const { routeHash, distance, duration } = await req.json();
    
    if (!routeHash || distance === undefined || duration === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
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

    // Get user's wallet
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

    console.log('Recording run on Solana for user:', user.id);

    // Decode user's keypair
    const userKeypair = decodePrivateKey(profile.solana_encrypted_key);
    const connection = getConnection();

    // Check balance
    const balance = await getBalance(connection, userKeypair.publicKey);
    if (balance < 0.1) {
      await airdropSol(connection, userKeypair.publicKey, 1);
    }

    // Generate run ID and find PDA
    const runId = crypto.randomUUID();
    const [runPDA, runBump] = await findRunPDA(runId);

    // Build record run instruction
    const instruction = buildInstruction(
      5, // Record run instruction
      [
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: runPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      {
        runId,
        routeHash,
        distance,
        duration,
        bump: runBump,
      }
    );

    // Send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair]
    );

    console.log('Run recorded successfully:', signature);

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        runPDA: runPDA.toString(),
        runId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in solana-record-run:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to record run', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
