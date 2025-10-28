-- Create parcels table for land ownership
CREATE TABLE IF NOT EXISTS public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  owner_wallet TEXT,
  rent_amount_usdc NUMERIC DEFAULT 0,
  rent_policy TEXT DEFAULT 'per_run' CHECK (rent_policy IN ('per_run', 'per_hour', 'per_day')),
  is_minted BOOLEAN DEFAULT false,
  nft_token TEXT,
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parcel_accesses table for tracking user payments and access
CREATE TABLE IF NOT EXISTS public.parcel_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  paid_until TIMESTAMP WITH TIME ZONE,
  last_paid_tx TEXT,
  amount_paid NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table for tracking all transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  token TEXT NOT NULL,
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  payee_id UUID REFERENCES auth.users(id),
  purpose TEXT NOT NULL,
  memo TEXT,
  nonce TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Add parcel columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS parcel_id TEXT,
ADD COLUMN IF NOT EXISTS requires_rent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rent_amount_usdc NUMERIC DEFAULT 0;

-- Add parcel_id to runs table for tracking which parcels were covered
ALTER TABLE public.runs
ADD COLUMN IF NOT EXISTS parcel_ids JSONB DEFAULT '[]'::jsonb;

-- RLS policies for parcels
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parcels viewable by everyone"
ON public.parcels FOR SELECT
USING (true);

CREATE POLICY "Owners can update their parcels"
ON public.parcels FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "System can create parcels"
ON public.parcels FOR INSERT
WITH CHECK (true);

-- RLS policies for parcel_accesses
ALTER TABLE public.parcel_accesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accesses"
ON public.parcel_accesses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage accesses"
ON public.parcel_accesses FOR ALL
USING (true);

-- RLS policies for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "System can create payments"
ON public.payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update payments"
ON public.payments FOR UPDATE
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcels_parcel_id ON public.parcels(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_id ON public.parcels(owner_id);
CREATE INDEX IF NOT EXISTS idx_parcel_accesses_user_parcel ON public.parcel_accesses(user_id, parcel_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON public.payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parcel_id ON public.tasks(parcel_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parcels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parcels_updated_at_trigger
BEFORE UPDATE ON public.parcels
FOR EACH ROW
EXECUTE FUNCTION update_parcels_updated_at();