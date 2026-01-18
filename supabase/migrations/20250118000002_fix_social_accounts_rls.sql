-- Fix RLS policy to allow anon role to read social_media_accounts
-- The table doesn't contain actual tokens (they're in Supabase Secrets)

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Authenticated users can read social_media_accounts" ON social_media_accounts;

-- Create policy that allows both anon and authenticated to read
CREATE POLICY "Anyone can read social_media_accounts"
  ON social_media_accounts
  FOR SELECT
  TO anon, authenticated
  USING (true);
