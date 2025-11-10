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

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Helper to create metadata instruction
function createMetadataInstruction(
  metadataPDA: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  metadata: any
): TransactionInstruction {
  const keys = [
    { pubkey: metadataPDA, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: false },
    { pubkey: updateAuthority, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(metadata.name);
  const symbolBytes = encoder.encode(metadata.symbol);
  const uriBytes = encoder.encode(metadata.uri);

  // CreateMetadataAccountV3 instruction
  const discriminator = new Uint8Array([33, 165, 251, 238, 27, 197, 199, 184]);
  
  // Calculate total size
  const size = 8 + // discriminator
    4 + nameBytes.length + // name
    4 + symbolBytes.length + // symbol
    4 + uriBytes.length + // uri
    2 + // seller_fee_basis_points
    1 + 4 + (metadata.creators.length * 34) + // creators (Option + Vec)
    1 + // collection (None)
    1 + // uses (None)
    1 + // is_mutable
    1; // collection_details (None)

  const data = new Uint8Array(size);
  let offset = 0;

  // Discriminator
  data.set(discriminator, offset);
  offset += 8;

  // Name
  new DataView(data.buffer).setUint32(offset, nameBytes.length, true);
  offset += 4;
  data.set(nameBytes, offset);
  offset += nameBytes.length;

  // Symbol
  new DataView(data.buffer).setUint32(offset, symbolBytes.length, true);
  offset += 4;
  data.set(symbolBytes, offset);
  offset += symbolBytes.length;

  // URI
  new DataView(data.buffer).setUint32(offset, uriBytes.length, true);
  offset += 4;
  data.set(uriBytes, offset);
  offset += uriBytes.length;

  // Seller fee basis points
  new DataView(data.buffer).setUint16(offset, metadata.sellerFeeBasisPoints, true);
  offset += 2;

  // Creators (Some)
  data[offset++] = 1;
  new DataView(data.buffer).setUint32(offset, metadata.creators.length, true);
  offset += 4;
  for (const creator of metadata.creators) {
    data.set(creator.address.toBytes(), offset);
    offset += 32;
    data[offset++] = creator.verified ? 1 : 0;
    data[offset++] = creator.share;
  }

  // Collection (None)
  data[offset++] = 0;
  // Uses (None)
  data[offset++] = 0;
  // Is mutable
  data[offset++] = 1;
  // Collection details (None)
  data[offset++] = 0;

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: data as any,
  });
}

// Helper to create master edition instruction
function createMasterEditionInstruction(
  masterEditionPDA: PublicKey,
  mint: PublicKey,
  updateAuthority: PublicKey,
  mintAuthority: PublicKey,
  metadataPDA: PublicKey,
  maxSupply: number
): TransactionInstruction {
  const keys = [
    { pubkey: masterEditionPDA, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: updateAuthority, isSigner: true, isWritable: false },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
    { pubkey: metadataPDA, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // CreateMasterEditionV3 instruction
  const discriminator = new Uint8Array([179, 50, 36, 133, 242, 149, 223, 46]);
  const data = new Uint8Array(8 + (maxSupply > 0 ? 9 : 1));
  let offset = 0;

  data.set(discriminator, offset);
  offset += 8;

  if (maxSupply > 0) {
    data[offset++] = 1; // Some
    new DataView(data.buffer).setBigUint64(offset, BigInt(maxSupply), true);
  } else {
    data[offset++] = 0; // None
  }

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: data as any,
  });
}

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

    // Step 4: Mint 1 token to user
    const mintToIx = createMintToInstruction(
      nftMintKeypair.publicKey,
      ata,
      userKeypair.publicKey,
      1, // amount (1 for NFT)
      [],
      TOKEN_PROGRAM_ID
    );

    // Step 5: Create Metadata Account
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBytes(),
        nftMintKeypair.publicKey.toBytes(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const metadata = {
      name: `Strun Land ${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`,
      symbol: 'LAND',
      uri: '', // We'll use on-chain metadata for now
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: userKeypair.publicKey,
          verified: true,
          share: 100,
        }
      ],
      collection: null,
      uses: null,
    };

    // Metaplex CreateMetadataAccountV3 instruction
    const createMetadataIx = createMetadataInstruction(
      metadataPDA,
      nftMintKeypair.publicKey,
      userKeypair.publicKey,
      userKeypair.publicKey,
      userKeypair.publicKey,
      metadata
    );

    // Step 6: Create Master Edition (makes it NFT with supply=1)
    const [masterEditionPDA] = PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBytes(),
        nftMintKeypair.publicKey.toBytes(),
        new TextEncoder().encode('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const createMasterEditionIx = createMasterEditionInstruction(
      masterEditionPDA,
      nftMintKeypair.publicKey,
      userKeypair.publicKey,
      userKeypair.publicKey,
      metadataPDA,
      0 // maxSupply = 0 means unlimited editions, but we'll mint only 1
    );

    // Combine all instructions
    const transaction = new Transaction().add(
      landInstruction,
      createMintAccountIx,
      initMintIx,
      createATAIx,
      mintToIx,
      createMetadataIx,
      createMasterEditionIx
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair, landKeypair, nftMintKeypair]
    );

    console.log('Land NFT minted successfully!');
    console.log('Transaction:', signature);
    console.log('Land account:', landKeypair.publicKey.toString());
    console.log('NFT Mint:', nftMintKeypair.publicKey.toString());
    console.log('Metadata:', metadataPDA.toString());
    console.log('Master Edition:', masterEditionPDA.toString());

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
        metadata: metadataPDA.toString(),
        masterEdition: masterEditionPDA.toString(),
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
