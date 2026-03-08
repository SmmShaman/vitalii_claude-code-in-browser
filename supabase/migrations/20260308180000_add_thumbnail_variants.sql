-- Add thumbnail variants support for Telegram approval flow
ALTER TABLE daily_video_drafts
ADD COLUMN IF NOT EXISTS thumbnail_variants JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS selected_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS clickbait_title TEXT;

-- Ensure daily-videos storage bucket exists (public for Telegram photo URLs)
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-videos', 'daily-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to thumbnails
DO $$ BEGIN
  CREATE POLICY "Public thumbnail read" ON storage.objects
    FOR SELECT USING (bucket_id = 'daily-videos' AND (storage.foldername(name))[1] = 'thumbnails');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow service role to upload thumbnails
DO $$ BEGIN
  CREATE POLICY "Service upload thumbnails" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'daily-videos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service update thumbnails" ON storage.objects
    FOR UPDATE USING (bucket_id = 'daily-videos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
