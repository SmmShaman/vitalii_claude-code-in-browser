-- Fix RLS policies for api_settings table
-- Previously only service_role could manage settings, but admin panel uses anon key
-- This allows public (anon) users to manage settings from the admin dashboard

-- Add SELECT policy for public users (needed for .select() after update)
CREATE POLICY IF NOT EXISTS "Allow public to read settings"
  ON api_settings
  FOR SELECT
  USING (true);

-- Add UPDATE policy for public users
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update settings"
  ON api_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add INSERT policy for public users (fallback when setting doesn't exist)
CREATE POLICY IF NOT EXISTS "Allow users to insert settings"
  ON api_settings
  FOR INSERT
  WITH CHECK (true);

-- Note: For production, consider adding proper authentication to admin panel
-- and restricting these policies to authenticated admin users only
