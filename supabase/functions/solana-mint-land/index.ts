import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { 
  Transaction, 
  SystemProgram, 
  TransactionInstruction,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY
} from "https://esm.sh/@solana/web3.js@1.98.4";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  getAssociatedTokenAddress,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "https://esm.sh/@solana/spl-token@0.4.14";
import { 
  getConnection, 
  decodePrivateKey,
  findLandPDA,
  sendAndConfirmTransaction,
  getBalance,
  airdropSol,
  STRUN_PROGRAM_ID
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

    // Step 1: Create Land account (Rust program)
    const landKeypair = Keypair.generate();
    console.log('Generated land account:', landKeypair.publicKey.toString());

    const { buildInstructionData } = await import("../_shared/solana-program.ts");
    const instructionData = await buildInstructionData('mint_land', { coordinates });
    
    const landInstruction = new TransactionInstruction({
      keys: [
        { pubkey: landKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: STRUN_PROGRAM_ID,
      data: instructionData as any,
    });

    // Step 2: Create NFT Mint
    const nftMintKeypair = Keypair.generate();
    console.log('NFT Mint:', nftMintKeypair.publicKey.toString());

    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: userKeypair.publicKey,
      newAccountPubkey: nftMintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      nftMintKeypair.publicKey,
      0, // 0 decimals for NFT
      userKeypair.publicKey, // mint authority
      userKeypair.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    );

    // Step 3: Create Associated Token Account for user
    const ata = await getAssociatedTokenAddress(
      nftMintKeypair.publicKey,
      userKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
      userKeypair.publicKey, // payer
      ata, // ata
      userKeypair.publicKey, // owner
      nftMintKeypair.publicKey, // mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Step 4: Mint 1 token to user (NFT = supply of 1)
    const mintToIx = createMintToInstruction(
      nftMintKeypair.publicKey,
      ata,
      userKeypair.publicKey,
      1, // amount (1 for NFT)
      [],
      TOKEN_PROGRAM_ID
    );

    // Step 5: Remove mint authority to make it NFT (supply locked at 1)
    const removeMintAuthorityIx = createSetAuthorityInstruction(
      nftMintKeypair.publicKey,
      userKeypair.publicKey,
      AuthorityType.MintTokens,
      null, // Remove authority
      [],
      TOKEN_PROGRAM_ID
    );

    // Combine all instructions
    const transaction = new Transaction().add(
      landInstruction,
      createMintAccountIx,
      initMintIx,
      createATAIx,
      mintToIx,
      removeMintAuthorityIx
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair, landKeypair, nftMintKeypair]
    );

    console.log('Land NFT minted successfully!');
    console.log('Transaction:', signature);
    console.log('Land account:', landKeypair.publicKey.toString());
    console.log('NFT Mint (SPL Token):', nftMintKeypair.publicKey.toString());
    console.log('User Token Account:', ata.toString());

    // Update land_nfts table with NFT info
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
          nft_address: nftMintKeypair.publicKey.toString(), // SPL Token mint address
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
          nft_address: nftMintKeypair.publicKey.toString(),
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
        landAccount: landKeypair.publicKey.toString(),
        nftMint: nftMintKeypair.publicKey.toString(),
        tokenAccount: ata.toString(),
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
