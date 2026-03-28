-- Add missing projects to feature_projects for discover-features workflow
INSERT INTO feature_projects (id, name_en, name_no, name_ua, description_en, description_no, description_ua, repo_url) VALUES
('calendar_bot', 'Calendar Telegram Bot', 'Kalender Telegram-Bot', 'Календар Telegram Бот', 'Smart calendar bot with Spond integration and AI scheduling', 'Smart kalenderbot med Spond-integrasjon og AI-planlegging', 'Розумний бот-календар з інтеграцією Spond та AI-плануванням', 'https://github.com/SmmShaman/calendar-bot'),
('eyeplus', 'Eye+ Camera Cloud', 'Eye+ Kamerasky', 'Eye+ Camera Cloud', 'Cloud-based camera monitoring and management platform', 'Skybasert kameraovervåking og administrasjonsplattform', 'Хмарна платформа моніторингу та управління камерами', 'https://github.com/SmmShaman/eyeplus-camera-cloud'),
('lingleverika', 'Lingva AI', 'Lingva AI', 'Lingva AI', 'AI-powered video translation and understanding platform', 'AI-drevet videooversettelse og forståelsesplattform', 'AI-платформа перекладу та розуміння відео', 'https://github.com/SmmShaman/lingva-ai'),
('ghost_interviewer', 'Ghost Interviewer AI', 'Ghost Interviewer AI', 'Ghost Interviewer AI', 'AI interview preparation and coaching platform', 'AI-intervjuforberedelse og coaching-plattform', 'AI-платформа підготовки до співбесід', 'https://github.com/SmmShaman/Ghost-Interviewer-AI'),
('youtube_manager', 'YouTube Channel Manager', 'YouTube Kanalbehandler', 'YouTube Channel Manager', 'Automated YouTube channel management and content publishing', 'Automatisert YouTube-kanaladministrasjon og innholdspublisering', 'Автоматизоване управління YouTube-каналом та публікація контенту', 'https://github.com/SmmShaman/youtube-channel-manager'),
('elvarika', 'Elvarika', 'Elvarika', 'Elvarika', 'AI language learning platform for immigrants in Norway', 'AI-språklæringsplattform for innvandrere i Norge', 'AI-платформа вивчення мов для іммігрантів у Норвегії', 'https://github.com/SmmShaman/elvarika')
ON CONFLICT (id) DO NOTHING;

-- Update existing repo URLs for renamed repos
UPDATE feature_projects SET repo_url = 'https://github.com/SmmShaman/jobbot-norway' WHERE id = 'jobbot';
UPDATE feature_projects SET repo_url = 'https://github.com/SmmShaman/calendar-bot' WHERE id = 'calendar_bot';
