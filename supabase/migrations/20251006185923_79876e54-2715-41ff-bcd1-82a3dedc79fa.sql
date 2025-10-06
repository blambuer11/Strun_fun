-- Update the handle_new_user function to create Solana wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
BEGIN
  -- Generate referral code
  v_referral_code := generate_referral_code();
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    v_referral_code
  );
  
  -- Note: Solana wallet creation will be handled by the edge function
  -- called from the frontend after successful registration
  
  RETURN NEW;
END;
$function$;