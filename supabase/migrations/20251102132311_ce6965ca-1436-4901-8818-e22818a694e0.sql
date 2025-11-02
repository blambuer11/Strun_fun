-- Add fcm_token column to profiles table for push notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT;