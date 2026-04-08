-- Enable RLS on tables flagged by Supabase Security Advisor
-- These tables are not accessed via PostgREST/anon key, so no public policies needed

ALTER TABLE IF EXISTS public.processed_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recruitment_agencies ENABLE ROW LEVEL SECURITY;
