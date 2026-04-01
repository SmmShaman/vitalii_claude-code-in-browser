-- Add image_url column to feature_projects
ALTER TABLE feature_projects
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update Portfolio with full descriptions + image
UPDATE feature_projects SET
  description_en = 'Full-stack content automation platform running at vitalii.no. Built with Next.js 15, Supabase, and 29 Deno Edge Functions. Features include AI content moderation, multilingual rewriting (EN/NO/UA), video production with Remotion, social media auto-posting to LinkedIn/Instagram/Facebook, BentoGrid UI with GSAP/Three.js animations, and a 10-tab admin dashboard. 20 GitHub Actions workflows.',
  description_no = 'Full-stack innholdsautomatiseringsplattform som kjorer pa vitalii.no. Bygget med Next.js 15, Supabase og 29 Deno Edge Functions. Funksjoner inkluderer AI-innholdsmoderering, flerspraklig omskriving (EN/NO/UA), videoproduksjon med Remotion, automatisk publisering til LinkedIn/Instagram/Facebook, BentoGrid UI med GSAP/Three.js-animasjoner og et admin-dashboard med 10 faner. 20 GitHub Actions-arbeidsflyter.',
  description_ua = 'Full-stack платформа автоматизації контенту на vitalii.no. Побудовано на Next.js 15, Supabase та 29 Deno Edge Functions. AI-модерація контенту, багатомовне переписування (EN/NO/UA), відеовиробництво з Remotion, автопостинг у LinkedIn/Instagram/Facebook, BentoGrid UI з GSAP/Three.js анімаціями та адмін-панель з 10 вкладками. 20 GitHub Actions воркфлоу.',
  image_url = '/images/projects/portfolio-cover.jpg'
WHERE id = 'portfolio';

-- Update JobBot with full descriptions + image
UPDATE feature_projects SET
  description_en = 'Intelligent job search automation for the Norwegian market. React 19 + TypeScript + Supabase + Azure OpenAI GPT-4. AI analyzes job postings and generates cover letters in Norwegian. Skyvern browser automation fills forms on 10+ recruitment platforms (Webcruiter, Easycruit, Teamtailor, FINN). Telegram bot as primary interface with 2FA bridge. Self-learning form memory system. Dashboard with Leaflet job map and Recharts analytics. Multi-user with PostgreSQL RLS isolation.',
  description_no = 'Intelligent jobbsokautomatisering for det norske markedet. React 19 + TypeScript + Supabase + Azure OpenAI GPT-4. AI analyserer stillingsannonser og genererer soknader pa norsk. Skyvern nettleserautomatisering fyller ut skjemaer pa 10+ rekrutteringsplattformer (Webcruiter, Easycruit, Teamtailor, FINN). Telegram-bot som hovedgrensesnitt med 2FA-bro. Selvlaerende skjemahukommelsessystem. Dashboard med Leaflet jobbkart og Recharts-analyse. Flerbruker med PostgreSQL RLS-isolering.',
  description_ua = 'Інтелектуальна автоматизація пошуку роботи для норвезького ринку. React 19 + TypeScript + Supabase + Azure OpenAI GPT-4. AI аналізує вакансії та генерує супровідні листи норвезькою. Skyvern автоматизація браузера заповнює форми на 10+ платформах (Webcruiter, Easycruit, Teamtailor, FINN). Telegram бот як основний інтерфейс з 2FA мостом. Самонавчальна система памʼяті форм. Дашборд з Leaflet картою вакансій та Recharts аналітикою. Мультикористувач з PostgreSQL RLS ізоляцією.',
  image_url = '/images/projects/jobbot-cover.jpg'
WHERE id = 'jobbot';

-- Update Elvarika with full descriptions + image
UPDATE feature_projects SET
  name_en = 'Elvarika Language Learning',
  name_no = 'Elvarika Spraklaring',
  name_ua = 'Elvarika Мовна Платформа',
  description_en = 'AI language learning platform helping immigrants in Norway learn Norwegian through personalized audio playlists. Hybrid NLP engine (Stanza + SpaCy) for 8 languages including Arabic, Somali, Tigrinya. PDF upload with preview, AI vocabulary extraction, SRS with voice commands, and Dual SYNC TTS (3s per word). Stripe payments, HR dashboard, masterclass. React 18 + TypeScript + Supabase + Python NLP.',
  description_no = 'AI-spraklaaringsplattform som hjelper innvandrere i Norge med a laere norsk gjennom personaliserte lydspillelister. Hybrid NLP-motor (Stanza + SpaCy) for 8 sprak inkludert arabisk, somali, tigrinja. PDF-opplasting med forhandsvisning, AI-ordforradsuvinning, SRS med stemmekommandoer og Dual SYNC TTS (3s per ord). Stripe-betalinger, HR-dashboard, mesterkurs. React 18 + TypeScript + Supabase + Python NLP.',
  description_ua = 'AI-платформа вивчення мов що допомагає іммігрантам в Норвегії вчити норвезьку через персоналізовані аудіо-плейлисти. Гібридний NLP-двигун (Stanza + SpaCy) для 8 мов включно з арабською, сомалі, тигрінья. Завантаження PDF з превʼю, AI-витяг словника, SRS з голосовими командами та Dual SYNC TTS (3с на слово). Stripe платежі, HR дашборд, майстер-клас. React 18 + TypeScript + Supabase + Python NLP.',
  image_url = '/images/projects/elvarika-cover.jpg'
WHERE id = 'elvarika';

-- Update Calendar Bot with full descriptions + image
UPDATE feature_projects SET
  description_en = 'Telegram bot for calendar management with Spond multi-account support, Google Calendar integration, and AI-powered scheduling. Features PIN-protected admin tabs with public calendar view, optional Google login, event validation, and Places Library integration. Built with TypeScript, Telegram Bot API, Supabase, and Google APIs.',
  description_no = 'Telegram-bot for kalenderstyring med Spond flerkontosstotte, Google Kalender-integrasjon og AI-planlegging. PIN-beskyttede admin-faner med offentlig kalendervisning, valgfri Google-innlogging, hendelsesvalidering og Places Library. TypeScript, Telegram Bot API, Supabase, Google APIs.',
  description_ua = 'Telegram бот для управління календарем з підтримкою Spond, Google Calendar та AI-плануванням. PIN-захищені вкладки адміна, публічний перегляд, валідація подій, Places Library. TypeScript, Telegram Bot API, Supabase, Google APIs.',
  image_url = '/images/projects/calendar-cover.jpg'
WHERE id = 'calendar_bot';

-- Update Ghost Interviewer with full descriptions + image
UPDATE feature_projects SET
  description_en = 'AI-powered interview preparation platform that simulates real job interviews. Enhanced AI translation with improved prompts and faster processing. Helps candidates practice answering questions in Norwegian and English with real-time feedback and scoring. Built with TypeScript, Azure OpenAI, and Supabase Edge Functions.',
  description_no = 'AI-drevet intervjuforberedelsesplattform som simulerer ekte jobbintervjuer. Forbedret AI-oversettelse med optimaliserte prompter. Hjelper kandidater med a ove pa norsk og engelsk med tilbakemelding i sanntid. TypeScript, Azure OpenAI, Supabase Edge Functions.',
  description_ua = 'AI-платформа підготовки до співбесід що симулює реальні інтервʼю. Покращений AI-переклад з оптимізованими промптами. Допомагає кандидатам практикувати відповіді норвезькою та англійською з фідбеком в реальному часі. TypeScript, Azure OpenAI, Supabase.',
  image_url = '/images/projects/ghost-interviewer-cover.jpg'
WHERE id = 'ghost_interviewer';

-- Update Eye+ Camera Cloud with detailed descriptions + image placeholder
UPDATE feature_projects SET
  description_en = 'Cloud-based camera monitoring and management platform for Eye+ security cameras. Real-time video streaming, motion detection alerts, multi-camera dashboard with timeline playback. User management with role-based access control. Built with React, Node.js, WebRTC for live streams, and cloud storage for recordings.',
  description_no = 'Skybasert kameraovervaking og administrasjonsplattform for Eye+ sikkerhetskameraer. Sanntids videostreaming, bevegelsesdeteksjonsvarsler, flerkamera-dashboard med tidslinjenavspilling. Brukeradministrasjon med rollebasert tilgangskontroll. Bygget med React, Node.js, WebRTC for direktestromming og skylagring for opptak.',
  description_ua = 'Хмарна платформа моніторингу та управління камерами Eye+. Відеострімінг в реальному часі, сповіщення про рух, мультикамерний дашборд з програванням таймлайну. Управління користувачами з рольовим доступом. React, Node.js, WebRTC для прямих трансляцій та хмарне сховище для записів.',
  image_url = '/images/projects/eyeplus-cover.jpg'
WHERE id = 'eyeplus';

-- Update Lingva AI with detailed descriptions + image placeholder
UPDATE feature_projects SET
  description_en = 'AI-powered video translation and understanding platform. Automatic speech recognition and translation of video content. Supports multiple languages with context-aware translation. Video summarization, key moment extraction, and searchable transcripts. Built with Python, Whisper ASR, and transformer-based translation models.',
  description_no = 'AI-drevet videooversettelse og forstaelsesplattform. Automatisk talegjenkjenning og oversettelse av videoinnhold. Stotter flere sprak med kontekstbevisst oversettelse. Videooppsummering, utvinning av nokkelmomenter og sokbare transkripsjoner. Bygget med Python, Whisper ASR og transformerbaserte oversettelsesmodeller.',
  description_ua = 'AI-платформа перекладу та розуміння відео. Автоматичне розпізнавання мовлення та переклад відеоконтенту. Підтримка кількох мов з контекстним перекладом. Підсумки відео, виділення ключових моментів та пошукові транскрипти. Python, Whisper ASR та transformer-моделі перекладу.',
  image_url = '/images/projects/lingleverika-cover.jpg'
WHERE id = 'lingleverika';

-- Update YouTube Channel Manager with detailed descriptions + image placeholder
UPDATE feature_projects SET
  description_en = 'Automated YouTube channel management and content publishing system. OAuth 2.0 authentication, scheduled video uploads, metadata optimization, and analytics dashboard. Integrates with Remotion for automated video rendering from news articles. Thumbnail generation, playlist management, and cross-platform publishing triggers. TypeScript, YouTube Data API v3, Supabase, GitHub Actions.',
  description_no = 'Automatisert YouTube-kanaladministrasjon og innholdspubliseringssystem. OAuth 2.0-autentisering, planlagte videoopplastinger, metadataoptimalisering og analysedashboard. Integrerer med Remotion for automatisk videorendering fra nyhetsartikler. Miniatyrbildegenerering, spillelisteadministrasjon og kryssplattform-publiseringsutlosere. TypeScript, YouTube Data API v3, Supabase, GitHub Actions.',
  description_ua = 'Автоматизоване управління YouTube-каналом та публікація контенту. OAuth 2.0 автентифікація, заплановане завантаження відео, оптимізація метаданих та аналітичний дашборд. Інтеграція з Remotion для автоматичного рендерингу відео з новин. Генерація мініатюр, управління плейлистами та крос-платформні тригери публікації. TypeScript, YouTube Data API v3, Supabase, GitHub Actions.',
  image_url = '/images/projects/youtube-manager-cover.jpg'
WHERE id = 'youtube_manager';
