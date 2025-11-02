-- Add status column to land_nfts table to track mint status
ALTER TABLE land_nfts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing records to 'minted' if they have a transaction hash
UPDATE land_nfts SET status = 'minted' WHERE mint_transaction_hash IS NOT NULL AND mint_transaction_hash != '';

-- Add comment
COMMENT ON COLUMN land_nfts.status IS 'Mint status: pending (IPFS uploaded), minting (Solana transaction in progress), minted (confirmed on Solana), failed (mint failed)';