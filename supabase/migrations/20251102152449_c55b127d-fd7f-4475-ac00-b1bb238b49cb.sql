-- Fix missing search_path on database functions
-- This prevents potential SQL injection and ensures consistent schema resolution

-- Fix update_parcels_updated_at function
CREATE OR REPLACE FUNCTION public.update_parcels_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix calculate_level_from_xp function
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  -- Formula: Every 100 XP = 1 level (with square root progression for balance)
  -- Level 1: 0-100 XP
  -- Level 2: 100-400 XP  
  -- Level 3: 400-900 XP
  -- Level 4: 900-1600 XP
  -- Level 5: 1600-2500 XP, etc.
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount / 100.0)) + 1);
END;
$function$;

-- Fix generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'STRUN-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;