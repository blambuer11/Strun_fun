/**
 * Solana Payment Verification Utility
 * Verifies SPL token (USDC) and SOL transfers on Solana blockchain
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from "https://esm.sh/@solana/web3.js@1.87.6";

export interface ExpectedPayment {
  amount: string; // decimal string, e.g. "0.10"
  tokenMint: string | null; // SPL token mint pubkey (USDC). If null -> expect SOL transfer
  payTo: string; // destination address (owner or platform treasury)
  memoPrefix?: string; // e.g. "land:PARCEL:task:TASK:user:USER:nonce:"
  nonce?: string; // nonce string that should appear in memo
  decimals?: number; // token decimals (USDC on Solana usually 6)
}

export interface VerifyResult {
  success: boolean;
  reason?: string;
  tx?: ParsedTransactionWithMeta | null;
  matchedAmount?: string;
  matchedMemo?: string | null;
}

export async function verifyPayment(
  txHash: string,
  expected: ExpectedPayment,
  connection: Connection
): Promise<VerifyResult> {
  // Basic sanity
  if (!txHash) return { success: false, reason: "txHash missing" };

  // Fetch transaction in parsed form
  const tx = await connection.getParsedTransaction(txHash, {
    commitment: "confirmed",
  });

  if (!tx) {
    return { 
      success: false, 
      reason: "transaction not found or not confirmed yet", 
      tx: null 
    };
  }

  // 1) Check memo instruction (optional, but recommended)
  let matchedMemo: string | null = null;
  try {
    const instrs = tx.transaction.message.instructions as any[];
    for (const instr of instrs) {
      const program = instr.program || instr.programId?.toString?.();
      if (
        program === "memo" || 
        program === "memo-program" || 
        (instr.programId && instr.programId.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
      ) {
        const data = instr.parsed?.data ?? instr.data ?? null;
        if (typeof data === "string") {
          matchedMemo = data;
          break;
        }
      }
    }
  } catch (err) {
    console.error("Memo parsing error:", err);
  }

  // If memoPrefix/nonce expected, validate
  if (expected.memoPrefix) {
    if (!matchedMemo) {
      return { 
        success: false, 
        reason: "memo not found in transaction but expected", 
        tx 
      };
    }
    if (!matchedMemo.includes(expected.memoPrefix)) {
      return { 
        success: false, 
        reason: "memo does not contain expected prefix", 
        tx, 
        matchedMemo 
      };
    }
    if (expected.nonce && !matchedMemo.includes(expected.nonce)) {
      return { 
        success: false, 
        reason: "memo does not contain expected nonce", 
        tx, 
        matchedMemo 
      };
    }
  }

  // 2) If expecting SPL token transfer (tokenMint provided)
  if (expected.tokenMint) {
    const parsedMessageInstrs = tx.transaction.message.instructions as any[];
    const decimals = expected.decimals ?? 6; // default 6 for USDC
    const baseUnits = decimalToBaseUnits(expected.amount, decimals);

    let found = false;
    let matchedAmountStr: string | undefined;

    // Scan parsed instructions for "spl-token" transfer
    for (const instr of parsedMessageInstrs) {
      if (
        instr.program === "spl-token" || 
        (instr.programId && instr.programId.toString() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      ) {
        const parsed = instr.parsed;
        if (parsed && parsed.type === "transfer" && parsed.info) {
          const info = parsed.info;
          const dest = info.destination;
          const amountStr = info.amount;
          
          if (dest === expected.payTo && amountStr && BigInt(amountStr) === baseUnits) {
            const mintOk = checkMintInTokenBalances(tx, expected.tokenMint, info);
            if (mintOk) {
              found = true;
              matchedAmountStr = amountStr;
              break;
            }
          }
        }
      }
    }

    // Fallback: check postTokenBalances deltas
    if (!found && tx.meta && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
      const pre = tx.meta.preTokenBalances;
      const post = tx.meta.postTokenBalances;
      
      for (const p of post) {
        if (p.owner === expected.payTo && p.mint === expected.tokenMint) {
          const preEntry = pre.find((q: any) => 
            q.owner === expected.payTo && q.mint === expected.tokenMint
          );
          const preUi = BigInt(preEntry?.uiTokenAmount?.amount ?? "0");
          const postUi = BigInt(p.uiTokenAmount?.amount ?? "0");
          const diff = postUi - preUi;
          
          if (diff === baseUnits) {
            found = true;
            matchedAmountStr = diff.toString();
            break;
          }
        }
      }
    }

    if (!found) {
      return { 
        success: false, 
        reason: "SPL token transfer matching criteria not found", 
        tx 
      };
    }

    return { success: true, tx, matchedAmount: matchedAmountStr, matchedMemo };
  } else {
    // 3) Expecting native SOL transfer
    if (!expected.payTo) {
      return { success: false, reason: "payTo required for SOL transfer check", tx };
    }
    
    const preBalances = tx.meta?.preBalances ?? [];
    const postBalances = tx.meta?.postBalances ?? [];
    const accountKeys = tx.transaction.message.accountKeys as any[];
    
    const idx = accountKeys.findIndex((k: any) => 
      (k.pubkey ? k.pubkey.toString() : k.toString()) === expected.payTo
    );
    
    if (idx === -1) {
      return { 
        success: false, 
        reason: "payTo account not found in transaction accounts", 
        tx 
      };
    }
    
    const pre = BigInt(preBalances[idx] ?? 0);
    const post = BigInt(postBalances[idx] ?? 0);
    const lamportsDiff = post - pre;
    const expectedLamports = solToLamports(expected.amount);
    
    if (lamportsDiff !== expectedLamports) {
      return { 
        success: false, 
        reason: `SOL amount mismatch. expected ${expectedLamports}, got ${lamportsDiff}`, 
        tx 
      };
    }
    
    return { success: true, tx, matchedAmount: lamportsDiff.toString(), matchedMemo };
  }
}

/** Helper Functions **/

function decimalToBaseUnits(amountDecimal: string, decimals: number): bigint {
  const parts = amountDecimal.split(".");
  const whole = parts[0] || "0";
  const frac = parts[1] || "";
  
  if (frac.length > decimals) {
    throw new Error("amount has more decimals than token supports");
  }
  
  const wholeBig = BigInt(whole) * BigInt(10) ** BigInt(decimals);
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const fracBig = BigInt(fracPadded);
  
  return wholeBig + fracBig;
}

function solToLamports(amountDecimal: string): bigint {
  return decimalToBaseUnits(amountDecimal, 9);
}

function checkMintInTokenBalances(
  tx: ParsedTransactionWithMeta, 
  expectedMint: string, 
  info: any
): boolean {
  if (!tx.meta) return false;
  
  const post = tx.meta.postTokenBalances || [];
  const destTokenAccount = info?.destination;
  
  if (!destTokenAccount) return false;

  for (const entry of post) {
    if (entry.accountIndex !== undefined && tx.transaction.message.accountKeys[entry.accountIndex]) {
      const acct = tx.transaction.message.accountKeys[entry.accountIndex];
      const acctPub = acct.pubkey ? acct.pubkey.toString() : acct.toString();
      
      if ((acctPub === destTokenAccount || entry.address === destTokenAccount) && entry.mint === expectedMint) {
        return true;
      }
    } else if (entry.address && entry.address === destTokenAccount && entry.mint === expectedMint) {
      return true;
    }
  }

  return false;
}
