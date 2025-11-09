/**
 * Solana Program Interaction Utilities
 * Handles all interactions with the Strun Solana program
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  TransactionInstruction,
} from "https://esm.sh/@solana/web3.js@1.98.4";

// Program constants
export const STRUN_PROGRAM_ID = new PublicKey('9qpcky7wTGD3VHMMzVdaG2G2WrEi8SgpmVhhbyzJG8Mf');
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet USDC
export const DEVNET_RPC = 'https://api.devnet.solana.com';

// Program seeds
export const TASK_SEED = 'task';
export const LAND_SEED = 'land';
export const RUN_SEED = 'run';
export const USER_PROFILE_SEED = 'user_profile';

/**
 * Get or create Solana connection
 */
export function getConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || DEVNET_RPC, 'confirmed');
}

/**
 * Decode encrypted private key from database
 */
export function decodePrivateKey(encryptedKey: string): Keypair {
  try {
    const secretKeyArray = JSON.parse(atob(encryptedKey));
    return Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
  } catch (error) {
    throw new Error('Failed to decode private key: ' + error);
  }
}

/**
 * Find Program Derived Address (PDA)
 */
export async function findProgramAddress(
  seeds: Uint8Array[],
  programId: PublicKey = STRUN_PROGRAM_ID
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(seeds, programId);
}

/**
 * Create a task PDA
 */
export async function findTaskPDA(taskId: string): Promise<[PublicKey, number]> {
  const encoder = new TextEncoder();
  return await findProgramAddress([
    encoder.encode(TASK_SEED),
    encoder.encode(taskId),
  ]);
}

/**
 * Create a land PDA
 */
export async function findLandPDA(coordinates: { lat: number; lng: number }): Promise<[PublicKey, number]> {
  const coordinatesStr = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`;
  const encoder = new TextEncoder();
  return await findProgramAddress([
    encoder.encode(LAND_SEED),
    encoder.encode(coordinatesStr),
  ]);
}

/**
 * Create a run PDA
 */
export async function findRunPDA(runId: string): Promise<[PublicKey, number]> {
  const encoder = new TextEncoder();
  return await findProgramAddress([
    encoder.encode(RUN_SEED),
    encoder.encode(runId),
  ]);
}

/**
 * Create a user profile PDA
 */
export async function findUserProfilePDA(userId: string): Promise<[PublicKey, number]> {
  const encoder = new TextEncoder();
  return await findProgramAddress([
    encoder.encode(USER_PROFILE_SEED),
    encoder.encode(userId),
  ]);
}

/**
 * Airdrop SOL for testing (devnet only)
 */
export async function airdropSol(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 1
): Promise<string> {
  console.log(`Requesting ${amount} SOL airdrop for ${publicKey.toString()}`);
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
  console.log(`Airdrop successful: ${signature}`);
  return signature;
}

/**
 * Get account balance
 */
export async function getBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Send and confirm transaction
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<string> {
  const signature = await connection.sendTransaction(transaction, signers);
  await connection.confirmTransaction(signature);
  return signature;
}

/**
 * Calculate Anchor discriminator (first 8 bytes of sha256 hash)
 */
async function getAnchorDiscriminator(name: string): Promise<Uint8Array> {
  const preimage = `global:${name}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(preimage));
  return new Uint8Array(hash).slice(0, 8);
}

/**
 * Create instruction data buffer with Anchor discriminator and borsh serialization
 */
export function createInstructionData(instruction: number, data?: any): Uint8Array {
  if (!data) {
    return new Uint8Array([instruction]);
  }
  
  // For land coordinates - use Anchor discriminator
  if (data.coordinates) {
    // For now, use a synchronous discriminator calculation
    // Anchor discriminator for "mint_land" function
    const discriminator = new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]); // Pre-calculated
    
    const buf = new ArrayBuffer(8 + 8 + 8 + 1); // discriminator + lat(f64) + lng(f64) + bump
    const view = new DataView(buf);
    let offset = 0;
    
    // Set discriminator
    new Uint8Array(buf).set(discriminator, offset);
    offset += 8;
    
    view.setFloat64(offset, data.coordinates.lat, true); // little-endian
    offset += 8;
    
    view.setFloat64(offset, data.coordinates.lng, true);
    offset += 8;
    
    if (data.bump !== undefined) {
      view.setUint8(offset, data.bump);
    }
    
    return new Uint8Array(buf);
  }
  
  // For task creation - use Anchor discriminator
  if (data.taskId) {
    const discriminator = new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]); // "create_task"
    const encoder = new TextEncoder();
    const taskIdBytes = encoder.encode(data.taskId);
    const titleBytes = encoder.encode(data.title || '');
    
    const buf = new ArrayBuffer(
      8 + // discriminator
      4 + taskIdBytes.length + // taskId length + bytes
      4 + titleBytes.length + // title length + bytes
      8 + 8 + // location lat + lng
      8 + 8 + // rewardSol + rewardXp
      8 + // rentUsdc
      1 // bump
    );
    
    const view = new DataView(buf);
    let offset = 0;
    
    new Uint8Array(buf).set(discriminator, offset);
    offset += 8;
    
    view.setUint32(offset, taskIdBytes.length, true);
    offset += 4;
    new Uint8Array(buf).set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    
    view.setUint32(offset, titleBytes.length, true);
    offset += 4;
    new Uint8Array(buf).set(titleBytes, offset);
    offset += titleBytes.length;
    
    view.setFloat64(offset, data.location.lat, true);
    offset += 8;
    view.setFloat64(offset, data.location.lng, true);
    offset += 8;
    
    view.setBigUint64(offset, BigInt(data.rewardSol || 0), true);
    offset += 8;
    view.setBigUint64(offset, BigInt(data.rewardXp || 0), true);
    offset += 8;
    view.setBigUint64(offset, BigInt(data.rentUsdc || 0), true);
    offset += 8;
    
    view.setUint8(offset, data.bump || 0);
    
    return new Uint8Array(buf);
  }
  
  // For run data - use Anchor discriminator
  if (data.routeHash) {
    const discriminator = new Uint8Array([226, 123, 89, 110, 13, 206, 251, 146]); // "record_run"
    const buf = new ArrayBuffer(
      8 + // discriminator
      4 + data.routeHash.length + // routeHash length + bytes
      8 + 8 + // distance + duration
      1 // bump
    );
    
    const view = new DataView(buf);
    let offset = 0;
    
    new Uint8Array(buf).set(discriminator, offset);
    offset += 8;
    
    view.setUint32(offset, data.routeHash.length, true);
    offset += 4;
    new Uint8Array(buf).set(new Uint8Array(data.routeHash), offset);
    offset += data.routeHash.length;
    
    view.setBigUint64(offset, BigInt(data.distance || 0), true);
    offset += 8;
    view.setBigUint64(offset, BigInt(data.duration || 0), true);
    offset += 8;
    
    if (data.bump !== undefined) {
      view.setUint8(offset, data.bump);
    }
    
    return new Uint8Array(buf);
  }
  
  // Fallback: just instruction byte
  return new Uint8Array([instruction]);
}

/**
 * Build a transaction instruction for the Strun program
 */
export function buildInstruction(
  instruction: number,
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  data?: any
): TransactionInstruction {
  return new TransactionInstruction({
    keys,
    programId: STRUN_PROGRAM_ID,
    data: createInstructionData(instruction, data) as any,
  });
}
