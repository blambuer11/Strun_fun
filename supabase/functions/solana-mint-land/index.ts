import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Transaction, SystemProgram } from "https://esm.sh/@solana/web3.js@1.95.0";
import { 
  getConnection, 
  decodePrivateKey,
  findLandPDA,
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

  let requestBody: any;
  try {
    requestBody = await req.json();
    const { coordinates, nftId } = requestBody;
    
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
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

    console.log('Minting land NFT for user:', user.id);
    console.log('Coordinates:', coordinates);

    // Decode user's keypair
    const userKeypair = decodePrivateKey(profile.solana_encrypted_key);
    const connection = getConnection();

    // Check balance and airdrop if needed (devnet only)
    const balance = await getBalance(connection, userKeypair.publicKey);
    console.log('User balance:', balance, 'SOL');
    
    if (balance < 0.1) {
      console.log('Balance too low, requesting airdrop...');
      await airdropSol(connection, userKeypair.publicKey, 1);
    }

    // Find land PDA
    const [landPDA, landBump] = await findLandPDA(coordinates);
    console.log('Land PDA:', landPDA.toString());

    // Build mint land instruction
    const instruction = buildInstruction(
      3, // Mint land instruction
      [
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: landPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      {
        coordinates,
        bump: landBump,
      }
    );

    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair]
    );

    console.log('Land minted successfully:', signature);

    // Update land_nfts table with mint status and transaction hash
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseKey);

    let updateError = null;
    
    if (nftId) {
      // Update specific NFT by ID
      const { error } = await adminClient
        .from('land_nfts')
        .update({
          status: 'minted',
          mint_transaction_hash: signature,
          minted_at: new Date().toISOString(),
        })
        .eq('id', nftId)
        .eq('user_id', user.id);
      updateError = error;
    } else {
      // Fallback: update most recent pending NFT
      const { error } = await adminClient
        .from('land_nfts')
        .update({
          status: 'minted',
          mint_transaction_hash: signature,
          minted_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      updateError = error;
    }

    if (updateError) {
      console.error('Failed to update NFT status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        landPDA: landPDA.toString(),
        coordinates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in solana-mint-land:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark NFT as failed if minting failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, supabaseKey);

      // Use the nftId from requestBody if available
      const nftId = requestBody?.nftId;

      // Try to get user from auth header if available
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await adminClient.auth.getUser(token);
        
        if (user) {
          if (nftId) {
            // Update specific NFT by ID
            await adminClient
              .from('land_nfts')
              .update({ status: 'failed' })
              .eq('id', nftId)
              .eq('user_id', user.id);
          } else {
            // Fallback: update most recent pending NFT
            await adminClient
              .from('land_nfts')
              .update({ status: 'failed' })
              .eq('user_id', user.id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1);
          }
        }
      }
    } catch (updateError) {
      console.error('Failed to update NFT status to failed:', updateError);
    }

    return new Response(
      JSON.stringify({ error: 'Failed to mint land', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
