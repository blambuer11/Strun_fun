import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Transaction, SystemProgram } from "https://esm.sh/@solana/web3.js@1.95.0";
import { 
  getConnection, 
  decodePrivateKey,
  findTaskPDA,
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
    const { title, location, rewardSol, rewardXp, rentUsdc } = await req.json();
    
    if (!title || !location || rewardSol === undefined || rewardXp === undefined) {
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

    const taskId = crypto.randomUUID();
    const [taskPDA, taskBump] = await findTaskPDA(taskId);

    const instruction = buildInstruction(
      0, // Create task instruction
      [
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: taskPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      {
        taskId,
        title,
        location,
        rewardSol,
        rewardXp,
        rentUsdc: rentUsdc || 0,
        bump: taskBump,
      }
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
        taskPDA: taskPDA.toString(),
        taskId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in solana-create-task:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
