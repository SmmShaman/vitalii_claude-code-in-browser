-- Fix: Replace broad FOR ALL policy with explicit per-command policies
-- using auth.uid() IS NOT NULL (more reliable than auth.role() = 'authenticated')
-- This ensures writes work correctly when the JWT is valid but auth.role() is flaky.

-- Drop the broad FOR ALL policy that overlaps with SELECT
DROP POLICY IF EXISTS "Authenticated users can manage sources" ON news_monitor_sources;

-- Explicit per-command policies using auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert sources" ON news_monitor_sources;
CREATE POLICY "Authenticated can insert sources" ON news_monitor_sources
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update sources" ON news_monitor_sources;
CREATE POLICY "Authenticated can update sources" ON news_monitor_sources
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete sources" ON news_monitor_sources;
CREATE POLICY "Authenticated can delete sources" ON news_monitor_sources
  FOR DELETE USING (auth.uid() IS NOT NULL);
