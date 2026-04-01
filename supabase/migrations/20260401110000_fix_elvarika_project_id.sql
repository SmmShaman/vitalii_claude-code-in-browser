-- Fix project_23mai: this IS Elvarika, repo was renamed/deleted
-- Keep project_id as 'project_23mai' to preserve FK with 19 features

UPDATE feature_projects SET
  name_en = 'Elvarika Language Learning',
  name_no = 'Elvarika Spraklaring',
  name_ua = 'Elvarika Мовна Платформа',
  description_en = 'AI language learning platform helping immigrants in Norway learn Norwegian through personalized audio playlists. Hybrid NLP engine (Stanza + SpaCy) for 8 languages including Arabic, Somali, Tigrinya. PDF upload with preview, AI vocabulary extraction, SRS with voice commands, and Dual SYNC TTS (3s per word). Stripe payments, HR dashboard, masterclass. React 18 + TypeScript + Supabase + Python NLP.',
  description_no = 'AI-spraklaaringsplattform som hjelper innvandrere i Norge med a laere norsk gjennom personaliserte lydspillelister. Hybrid NLP-motor (Stanza + SpaCy) for 8 sprak inkludert arabisk, somali, tigrinja. PDF-opplasting med forhandsvisning, AI-ordforradsuvinning, SRS med stemmekommandoer og Dual SYNC TTS (3s per ord). Stripe-betalinger, HR-dashboard, mesterkurs. React 18 + TypeScript + Supabase + Python NLP.',
  description_ua = 'AI-платформа вивчення мов що допомагає іммігрантам в Норвегії вчити норвезьку через персоналізовані аудіо-плейлисти. Гібридний NLP-двигун (Stanza + SpaCy) для 8 мов включно з арабською, сомалі, тигрінья. Завантаження PDF з превʼю, AI-витяг словника, SRS з голосовими командами та Dual SYNC TTS (3с на слово). Stripe платежі, HR дашборд, майстер-клас. React 18 + TypeScript + Supabase + Python NLP.',
  repo_url = 'https://github.com/SmmShaman/elvarika-old',
  image_url = '/images/projects/elvarika-cover.jpg',
  badge = 'E',
  color_bg = 'bg-yellow-500/20',
  color_text = 'text-yellow-400'
WHERE id = 'project_23mai';

-- Remove stale 'elvarika' row if it somehow exists (migration 20260328 may have created it)
DELETE FROM feature_projects WHERE id = 'elvarika' AND NOT EXISTS (
  SELECT 1 FROM features WHERE project_id = 'elvarika'
);
