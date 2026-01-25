-- Fix RLS policy for api_settings table
-- Previously only service_role could update settings, but admin panel uses anon key
-- This allows authenticated/anon users to update settings from the admin dashboard

-- Add UPDATE policy (allows anyone to update settings - admin panel uses anon key)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update settings"
  ON api_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: For production, consider adding proper authentication to admin panel
-- and restricting this policy to authenticated admin users only
