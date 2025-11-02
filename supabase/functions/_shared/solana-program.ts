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
} from "https://esm.sh/@solana/web3.js@1.95.0";

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
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey = STRUN_PROGRAM_ID
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(seeds, programId);
}

/**
 * Create a task PDA
 */
export async function findTaskPDA(taskId: string): Promise<[PublicKey, number]> {
  return await findProgramAddress([
    Buffer.from(TASK_SEED),
    Buffer.from(taskId),
  ]);
}

/**
 * Create a land PDA
 */
export async function findLandPDA(coordinates: { lat: number; lng: number }): Promise<[PublicKey, number]> {
  const coordinatesStr = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`;
  return await findProgramAddress([
    Buffer.from(LAND_SEED),
    Buffer.from(coordinatesStr),
  ]);
}

/**
 * Create a run PDA
 */
export async function findRunPDA(runId: string): Promise<[PublicKey, number]> {
  return await findProgramAddress([
    Buffer.from(RUN_SEED),
    Buffer.from(runId),
  ]);
}

/**
 * Create a user profile PDA
 */
export async function findUserProfilePDA(userId: string): Promise<[PublicKey, number]> {
  return await findProgramAddress([
    Buffer.from(USER_PROFILE_SEED),
    Buffer.from(userId),
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
 * Create instruction data buffer
 */
export function createInstructionData(instruction: number, data?: any): Buffer {
  if (!data) {
    return Buffer.from([instruction]);
  }
  
  const dataBuffer = Buffer.from(JSON.stringify(data));
  const instructionBuffer = Buffer.alloc(1 + dataBuffer.length);
  instructionBuffer.writeUInt8(instruction, 0);
  dataBuffer.copy(instructionBuffer, 1);
  
  return instructionBuffer;
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
    data: createInstructionData(instruction, data),
  });
}
