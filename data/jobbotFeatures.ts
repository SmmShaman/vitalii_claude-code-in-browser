import { Feature } from './features';

export const jobbotFeatures: Feature[] = [
  // ─── CATEGORY 1: AI & Machine Learning (Cases 1-5) ────────────────────────────

  {
    id: 'j01',
    projectId: 'jobbot',
    category: 'ai_automation',
    title: {
      en: 'AI Job Analyzer — knows you better than a recruiter',
      no: 'AI-jobbanalysator — kjenner deg bedre enn en rekrutterer',
      ua: 'AI, який знає тебе краще за рекрутера',
    },
    shortDescription: {
      en: 'Hundreds of jobs appear daily on FINN.no, NAV.no, and LinkedIn. AI reads every listing and compares it against the full CV, returning a 0-100 score with pros, cons, and workplace aura.',
      no: 'Hundrevis av jobber dukker opp daglig p\u00e5 FINN.no, NAV.no og LinkedIn. AI leser hver annonse og sammenligner den med full CV, og returnerer en 0-100 poengsum med fordeler, ulemper og arbeidsplassaura.',
      ua: 'Щодня на FINN.no, NAV.no та LinkedIn з\'являються сотні вакансій. AI читає кожну і порівнює з повним CV, повертаючи score 0-100 з плюсами, мінусами та аурою робочого середовища.',
    },
    problem: {
      en: 'Hundreds of jobs appear daily across FINN.no, NAV.no, and LinkedIn. Manually reading each one and objectively assessing fit is physically impossible. Subjectivity, fatigue, and missed opportunities define manual job searching in Norway.',
      no: 'Hundrevis av jobber dukker opp daglig p\u00e5 FINN.no, NAV.no og LinkedIn. \u00c5 manuelt lese hver enkelt og objektivt vurdere egnethet er fysisk umulig. Subjektivitet, tretthet og tapte muligheter definerer manuell jobb\u00f8king i Norge.',
      ua: 'Щодня на FINN.no, NAV.no та LinkedIn з\'являються сотні вакансій. Людина фізично не здатна прочитати кожну й об\'єктивно оцінити відповідність. Суб\'єктивність, втома та пропущені шанси — реальність ручного пошуку роботи в Норвегії.',
    },
    solution: {
      en: 'Built an Edge Function that calls Azure OpenAI GPT-4 with a custom "Vibe & Fit Scanner" prompt. AI receives the full job text + structured CV and returns JSON with score (0-100), analysis (pros/cons), tasks, aura (workplace type), and radar (5-axis evaluation). Token costs are logged to system_logs. Batch analysis of 10+ jobs is delegated to GitHub Actions via repository_dispatch.',
      no: 'Bygget en Edge Function som kaller Azure OpenAI GPT-4 med en tilpasset "Vibe & Fit Scanner"-prompt. AI mottar full jobbtekst + strukturert CV og returnerer JSON med poengsum (0-100), analyse (fordeler/ulemper), oppgaver, aura (arbeidsplasstype) og radar (5-akset evaluering). Tokenkostnader logges. Batchanalyse av 10+ jobber delegeres til GitHub Actions.',
      ua: 'Побудовано Edge Function, яка викликає Azure OpenAI GPT-4 з кастомним промптом "Vibe & Fit Scanner". AI отримує повний текст вакансії + структурований CV і повертає JSON з score (0-100), analysis (pros/cons), tasks, aura та radar (5 осей). Підрахунок токенів логується. Пакетний аналіз 10+ вакансій делегується в GitHub Actions через repository_dispatch.',
    },
    result: {
      en: 'Every job automatically receives an objective assessment in seconds. Hot jobs (score >= 50) instantly appear in Telegram with action buttons. The candidate only spends time on relevant positions, saving hours of daily scrolling.',
      no: 'Hver jobb f\u00e5r automatisk en objektiv vurdering p\u00e5 sekunder. Hot jobs (poengsum >= 50) vises umiddelbart i Telegram med handlingsknapper. Kandidaten bruker kun tid p\u00e5 relevante stillinger.',
      ua: 'Кожна вакансія автоматично отримує об\'єктивну оцінку за секунди. Hot jobs (score >= 50) миттєво потрапляють в Telegram з кнопками дій. Кандидат витрачає час лише на релевантні позиції.',
    },
    techStack: ['Azure OpenAI GPT-4', 'Deno Edge Functions', 'Supabase PostgreSQL', 'GitHub Actions'],
    hashtags: ['#AzureOpenAI', '#GPT4', '#JobSearch', '#AIRecruiting', '#Norway', '#MachineLearning'],
  },

  {
    id: 'j02',
    projectId: 'jobbot',
    category: 'ai_automation',
    title: {
      en: 'AI Cover Letter in 8 Seconds — in Norwegian',
      no: 'AI-s\u00f8knad p\u00e5 8 sekunder — p\u00e5 norsk',
      ua: 'Мотиваційний лист за 8 секунд — норвезькою',
    },
    shortDescription: {
      en: 'Writing a s\u00f8knad (cover letter) in Norwegian is painful for foreigners. GPT-4 generates a personalized letter in bokm\u00e5l with a Ukrainian translation for review, taking 8 seconds instead of 60 minutes.',
      no: '\u00c5 skrive en s\u00f8knad p\u00e5 norsk er smertefullt for utlendinger. GPT-4 genererer et personlig brev p\u00e5 bokm\u00e5l med ukrainsk oversettelse for gjennomgang, p\u00e5 8 sekunder i stedet for 60 minutter.',
      ua: 'Написати s\u00f8knad норвезькою — біль для іноземця. GPT-4 генерує персоналізований лист мовою bokm\u00e5l з українським перекладом для перевірки, за 8 секунд замість 60 хвилин.',
    },
    problem: {
      en: 'Writing a s\u00f8knad in Norwegian requires knowledge of cultural nuances, formal bokm\u00e5l style, and letter structure. One quality s\u00f8knad takes 40-60 minutes. When applying to 10+ positions per week, it becomes a second job.',
      no: '\u00c5 skrive en s\u00f8knad p\u00e5 norsk krever kunnskap om kulturelle nyanser, formell bokm\u00e5l-stil og brevstruktur. \u00c9n kvalitets\u00f8knad tar 40-60 minutter. N\u00e5r man s\u00f8ker p\u00e5 10+ stillinger per uke, blir det en andre jobb.',
      ua: 'Написати s\u00f8knad норвезькою потребує знання культурних нюансів, формального стилю bokm\u00e5l та структури листа. Один якісний s\u00f8knad забирає 40-60 хвилин. При 10+ вакансіях на тиждень це стає другою роботою.',
    },
    solution: {
      en: 'Edge Function generate_application takes job_id + user_id, pulls the full job listing and active CV profile from the database. GPT-4 generates cover_letter_no (Norwegian) and cover_letter_uk (Ukrainian) with clear structure: greeting, why this company, experience, motivation, closing. Each generation is saved with cost tracking.',
      no: 'Edge Function generate_application tar job_id + user_id, henter full jobbannonse og aktiv CV-profil fra databasen. GPT-4 genererer cover_letter_no (norsk) og cover_letter_uk (ukrainsk) med klar struktur. Hver generering lagres med kostnadssporing.',
      ua: 'Edge Function generate_application бере job_id + user_id, витягує повну вакансію та активний CV профіль з БД. GPT-4 генерує cover_letter_no (норвезькою) та cover_letter_uk (українською) з чіткою структурою. Кожна генерація зберігається з cost tracking.',
    },
    result: {
      en: 'From button press to finished s\u00f8knad in 8 seconds. The candidate reviews the Ukrainian version, edits if needed, approves, and the letter is ready to send. Productivity jumped from 2 letters per day to 15+.',
      no: 'Fra knappetrykk til ferdig s\u00f8knad p\u00e5 8 sekunder. Kandidaten gjennomg\u00e5r den ukrainske versjonen, redigerer ved behov, godkjenner, og brevet er klart. Produktiviteten \u00f8kte fra 2 brev per dag til 15+.',
      ua: 'Від натискання кнопки до готового s\u00f8knad — 8 секунд. Кандидат переглядає українську версію, редагує, натискає "Approve" — лист готовий. Продуктивність зросла з 2 листів на день до 15+.',
    },
    techStack: ['Azure OpenAI GPT-4', 'Deno Edge Functions', 'Supabase', 'TypeScript'],
    hashtags: ['#CoverLetter', '#Norwegian', '#AIWriting', '#S\u00f8knad', '#Bokm\u00e5l', '#Automation'],
  },

  {
    id: 'j03',
    projectId: 'jobbot',
    category: 'ai_automation',
    title: {
      en: 'PDF Upload — structured profile in 12 seconds',
      no: 'PDF-opplasting — strukturert profil p\u00e5 12 sekunder',
      ua: 'Завантаж PDF — отримай структурований профіль',
    },
    shortDescription: {
      en: 'Manually filling 9 CV sections takes 30+ minutes. AI reads a PDF resume and extracts all data into structured JSON with personal info, work experience, education, skills, and languages.',
      no: 'Manuell utfylling av 9 CV-seksjoner tar 30+ minutter. AI leser en PDF-CV og trekker ut alle data til strukturert JSON med personlig informasjon, arbeidserfaring, utdanning, ferdigheter og spr\u00e5k.',
      ua: 'Ручне заповнення 9 секцій CV займає 30+ хвилин. AI читає PDF-резюме та витягує всі дані в структурований JSON з персональною інформацією, досвідом, освітою, навичками та мовами.',
    },
    problem: {
      en: 'Every candidate has a PDF resume, but the system needs structured data for auto-filling forms and generating cover letters. Manually filling 9 profile sections takes 30+ minutes and nobody wants to do it.',
      no: 'Hver kandidat har en PDF-CV, men systemet trenger strukturerte data for automatisk utfylling av skjemaer og generering av s\u00f8knader. Manuell utfylling av 9 profilseksjoner tar 30+ minutter.',
      ua: 'Кожен кандидат має резюме в PDF, але системі потрібні структуровані дані для автозаповнення форм та генерації s\u00f8knad. Ручне заповнення 9 секцій профілю займає 30+ хвилин.',
    },
    solution: {
      en: 'Edge Function analyze_profile accepts a PDF via Storage, extracts text, and sends it to GPT-4 for structuring. Returns JSON with 9 sections: personalInfo, workExperience, education, skills, languages, certifications, summary, references, additionalInfo. Result is stored as JSONB with versioning support.',
      no: 'Edge Function analyze_profile mottar en PDF via Storage, trekker ut tekst og sender den til GPT-4 for strukturering. Returnerer JSON med 9 seksjoner. Resultatet lagres som JSONB med versjoneringsst\u00f8tte.',
      ua: 'Edge Function analyze_profile приймає PDF через Storage, витягує текст і відправляє в GPT-4 для структуризації. Повертає JSON з 9 секціями: personalInfo, workExperience, education, skills, languages, certifications, summary, references, additionalInfo. Зберігається як JSONB з версіонуванням.',
    },
    result: {
      en: '30 minutes of manual work became a single 12-second upload. The structured profile is immediately ready for auto-filling forms on any recruiting platform.',
      no: '30 minutter med manuelt arbeid ble til \u00e9n 12-sekunders opplasting. Den strukturerte profilen er umiddelbart klar for automatisk utfylling p\u00e5 enhver rekrutteringsplattform.',
      ua: '30 хвилин ручної роботи перетворились на один upload за 12 секунд. Структурований профіль одразу готовий для автозаповнення форм на будь-якій платформі.',
    },
    techStack: ['Azure OpenAI GPT-4', 'Supabase Storage', 'Deno Edge Functions', 'PDF parsing'],
    hashtags: ['#PDF', '#ResumeParser', '#AI', '#StructuredData', '#CVProfile', '#Automation'],
  },

  {
    id: 'j04',
    projectId: 'jobbot',
    category: 'ai_automation',
    title: {
      en: 'MetaClaw — the machine that learns from its mistakes',
      no: 'MetaClaw — maskinen som l\u00e6rer av sine feil',
      ua: 'Машина, що вчиться на своїх помилках',
    },
    shortDescription: {
      en: 'Skyvern fills forms on recruiting sites, but each site is unique. After every attempt, AI analyzes the full step log and generates a "skill guide" that improves future attempts on the same platform.',
      no: 'Skyvern fyller ut skjemaer p\u00e5 rekrutteringssider, men hver side er unik. Etter hvert fors\u00f8k analyserer AI hele stegloggen og genererer en "skill guide" som forbedrer fremtidige fors\u00f8k.',
      ua: 'Skyvern заповнює форми на рекрутингових сайтах, але кожен сайт унікальний. Після кожної спроби AI аналізує повний лог кроків і генерує "skill guide", що покращує наступні спроби на тій же платформі.',
    },
    problem: {
      en: 'Skyvern fills recruiting forms, but each site is unique. The first attempt often fails due to unknown fields, popups, or non-standard uploads. The next attempt on the same site repeats the same mistakes — the system does not learn.',
      no: 'Skyvern fyller ut rekrutteringsskjemaer, men hver side er unik. F\u00f8rste fors\u00f8k mislykkes ofte. Neste fors\u00f8k p\u00e5 samme side gjentar de samme feilene — systemet l\u00e6rer ikke.',
      ua: 'Skyvern заповнює форми на рекрутингових сайтах, але кожен сайт унікальний. Перша спроба часто провалюється через невідомі поля, popup чи нестандартний upload. Наступна спроба повторює ті ж помилки — система не вчиться.',
    },
    solution: {
      en: 'After each Skyvern task, extract_memory_from_task() analyzes all steps, collected fields, and navigation flow. Then generate_skill_from_memory() sends this to Gemini 2.5 Flash to generate a concise SKILL GUIDE. The result is stored in site_form_memory and injected into every future navigation goal as a "PREVIOUS EXPERIENCE" section. Domains are normalized so experience transfers across sites of the same platform.',
      no: 'Etter hver Skyvern-oppgave analyserer extract_memory_from_task() alle steg og navigasjonsflyt. Deretter sender generate_skill_from_memory() dette til Gemini 2.5 Flash for \u00e5 generere en SKILL GUIDE. Resultatet lagres i site_form_memory og injiseres i fremtidige navigasjonsm\u00e5l. Domener normaliseres slik at erfaring overf\u00f8res mellom sider p\u00e5 samme plattform.',
      ua: 'Після кожної Skyvern задачі extract_memory_from_task() аналізує всі кроки та навігаційний потік. Далі generate_skill_from_memory() відправляє дані в Gemini 2.5 Flash для генерації SKILL GUIDE. Результат зберігається в site_form_memory і вставляється в кожну наступну навігаційну мету як секція "PREVIOUS EXPERIENCE". Домени нормалізуються для переносу досвіду між сайтами однієї платформи.',
    },
    result: {
      en: 'The system improves after every iteration. First attempt on Webcruiter: 60% success, third attempt: 90%+. Domain normalization means experience from one site transfers to all sites on the same platform.',
      no: 'Systemet forbedres etter hver iterasjon. F\u00f8rste fors\u00f8k p\u00e5 Webcruiter: 60% suksess, tredje fors\u00f8k: 90%+. Domenormalisering betyr at erfaring fra \u00e9n side overf\u00f8res til alle sider p\u00e5 samme plattform.',
      ua: 'Система покращується після кожної ітерації. Перша спроба на Webcruiter — 60% успіху, третя — 90%+. Нормалізація доменів означає, що досвід з одного сайту переноситься на всі сайти тієї ж платформи.',
    },
    techStack: ['Gemini 2.5 Flash', 'Python', 'Skyvern API', 'Supabase PostgreSQL', 'JSONB'],
    hashtags: ['#MetaClaw', '#SelfLearning', '#AIAgent', '#WebAutomation', '#FormMemory', '#Gemini'],
  },

  {
    id: 'j05',
    projectId: 'jobbot',
    category: 'ai_automation',
    title: {
      en: 'Job Aura — feel the vibe before the interview',
      no: 'Jobbaura — f\u00f8l vibben f\u00f8r intervjuet',
      ua: 'Аура вакансії — відчуй вайб до інтерв\'ю',
    },
    shortDescription: {
      en: 'A relevance score shows if YOU fit the job, but does the JOB fit you? AI reads hidden signals in job text and classifies workplace "aura" into 6 types with a 5-axis radar chart.',
      no: 'En relevanspoengsum viser om DU passer til jobben, men passer JOBBEN til deg? AI leser skjulte signaler i jobbteksten og klassifiserer arbeidsplassens "aura" i 6 typer med et 5-akset radardiagram.',
      ua: 'Score релевантності показує, чи підходиш ТИ вакансії, але чи підходить ВАКАНСІЯ тобі? AI читає приховані сигнали в тексті і класифікує "ауру" робочого середовища в 6 типів з 5-осьовим radar chart.',
    },
    problem: {
      en: 'The relevance score shows if you fit the job, but not if the job fits you. Toxic environment, grind without prospects, or growth company with stock options — impossible to tell from dry text until you work there a month.',
      no: 'Relevanspoengsum viser om du passer til jobben, men ikke om jobben passer til deg. Giftig milj\u00f8, grind uten utsikter, eller vekstselskap med aksjeopsjoner — umulig \u00e5 si fra t\u00f8rr tekst.',
      ua: 'Score релевантності показує, чи підходиш ТИ вакансії. Але чи підходить ВАКАНСІЯ тобі? Токсичне середовище, грайнд без перспектив або компанія зростання зі stock options — неможливо зрозуміти з сухого тексту.',
    },
    solution: {
      en: 'Added an Aura system to the job-analyzer prompt with 6 types: Toxic (high turnover), Growth (stock options, learning budget), Balanced (work-life balance), Chill (remote, flexible), Grind (overtime culture), Neutral (standard corporate). Each aura has a hex color, tags, and explanation. A parallel radar chart has 5 axes: tech_stack fit, soft_skills fit, culture match, salary_potential, career_growth (0-100 each).',
      no: 'Lagt til et Aura-system i job-analyzer-prompten med 6 typer: Toxic, Growth, Balanced, Chill, Grind, Neutral. Hver aura har hex-farge, tagger og forklaring. Et parallelt radardiagram har 5 akser: tech_stack fit, soft_skills fit, culture match, salary_potential, career_growth (0-100 hver).',
      ua: 'В промпт job-analyzer додано Aura-систему з 6 типів: Toxic, Growth, Balanced, Chill, Grind, Neutral. Кожна аура має hex-колір, теги та пояснення. Паралельний Radar chart з 5 осей: tech_stack fit, soft_skills fit, culture match, salary_potential, career_growth (кожен 0-100).',
    },
    result: {
      en: 'Candidates see not just "78% match" but also "Growth aura — Stock Options, Learning Budget, Fast Track." The radar chart visually shows strengths and weaknesses of the match. Informed decisions in 3 seconds instead of 15 minutes of reading.',
      no: 'Kandidater ser ikke bare "78% match" men ogs\u00e5 "Growth aura \u2014 Stock Options, Learning Budget, Fast Track." Radardiagrammet viser visuelt styrker og svakheter. Informerte beslutninger p\u00e5 3 sekunder.',
      ua: 'Кандидат бачить не лише "підходжу на 78%", а й "Growth aura — Stock Options, Learning Budget, Fast Track". Radar chart візуально показує сильні та слабкі сторони. Рішення за 3 секунди замість 15 хвилин читання.',
    },
    techStack: ['Azure OpenAI GPT-4', 'Radar Chart (Recharts)', 'React', 'JSONB', 'Deno'],
    hashtags: ['#AuraScore', '#RadarChart', '#JobFit', '#WorkplaceCulture', '#AI', '#VibeCheck'],
  },

  // ─── CATEGORY 2: Browser Automation (Cases 6-12) ──────────────────────────────

  {
    id: 'j06',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'One Click — form filled on 10+ platforms',
      no: 'Ett klikk — skjema utfylt p\u00e5 10+ plattformer',
      ua: 'Один клік — і форма заповнена',
    },
    shortDescription: {
      en: 'Norwegian recruiting platforms are chaos: multi-step wizards, drag-and-drop uploads, CAPTCHA chains. Skyvern AI-powered browser automation fills forms on 10+ platforms in 2-5 minutes with zero user involvement.',
      no: 'Norske rekrutteringsplattformer er kaos: flerstegsveivisere, drag-and-drop-opplasting, CAPTCHA-kjeder. Skyven AI-drevet nettleserautomatisering fyller ut skjemaer p\u00e5 10+ plattformer p\u00e5 2-5 minutter uten brukerinvolvering.',
      ua: 'Норвезькі рекрутингові платформи — хаос форм: multi-step wizards, drag-and-drop upload, CAPTCHA. Skyvern AI-автоматизація браузера заповнює форми на 10+ платформах за 2-5 хвилин без участі юзера.',
    },
    problem: {
      en: 'Norwegian recruiting platforms are chaos: Webcruiter has 5-step forms with drag-and-drop, Easycruit requires registration before applying, Teamtailor hides fields behind tabs. Filling one form manually takes 10-15 minutes.',
      no: 'Norske rekrutteringsplattformer er kaos: Webcruiter har 5-trinns skjemaer med drag-and-drop, Easycruit krever registrering. \u00c5 fylle ut ett skjema manuelt tar 10-15 minutter.',
      ua: 'Норвезькі рекрутингові платформи — це хаос форм. Webcruiter має 5-крокову форму з drag-and-drop, Easycruit вимагає реєстрацію, Teamtailor ховає поля за табами. Заповнити одну форму вручну — 10-15 хвилин.',
    },
    solution: {
      en: 'Python worker auto_apply.py (4700+ lines) runs as a daemon, polling for applications with status "sending" every 10 seconds. For each application: extracts CV profile, forms a navigation goal for the specific site, launches Skyvern task via REST API, monitors status, handles results. Supports 10+ platforms: Webcruiter, Easycruit, Teamtailor, Jobylon, Lever, Recman, ReachMee, Varbi, HRManager, SuccessFactors, JobbNorge.',
      no: 'Python-worker auto_apply.py (4700+ linjer) kj\u00f8rer som en daemon og sjekker applikasjoner med status "sending" hvert 10. sekund. For hver applikasjon: trekker ut CV-profil, danner navigasjonsm\u00e5l, starter Skyvern-oppgave via REST API. St\u00f8tter 10+ plattformer.',
      ua: 'Python worker auto_apply.py (4700+ рядків) працює як демон, шукає заявки зі статусом "sending" кожні 10 секунд. Для кожної: витягує CV профіль, формує navigation goal для конкретного сайту, запускає Skyvern task через REST API. Підтримка 10+ платформ.',
    },
    result: {
      en: 'Candidate clicks "Send" in Telegram or Dashboard, and within 2-5 minutes the form is filled automatically on any of 10+ platforms. Average submission time dropped from 15 minutes to 3 minutes with zero user involvement.',
      no: 'Kandidaten klikker "Send" i Telegram eller Dashboard, og innen 2-5 minutter er skjemaet fylt ut automatisk. Gjennomsnittlig innsendingstid falt fra 15 til 3 minutter uten brukerinvolvering.',
      ua: 'Кандидат натискає "Send" в Telegram або Dashboard — за 2-5 хвилин форма заповнена на будь-якій з 10+ платформ. Середній час подачі впав з 15 до 3 хвилин при нульовій участі.',
    },
    techStack: ['Skyvern Docker', 'Python asyncio', 'httpx', 'Supabase', 'REST API'],
    hashtags: ['#BrowserAutomation', '#Skyvern', '#FormFilling', '#WebAutomation', '#Python', '#Docker'],
  },

  {
    id: 'j07',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: '2FA via Telegram — when the bot becomes your fingers',
      no: '2FA via Telegram — n\u00e5r boten blir fingrene dine',
      ua: '2FA через Telegram — коли бот стає твоїми пальцями',
    },
    shortDescription: {
      en: 'FINN.no requires 2FA for quick applications. Skyvern fills the form but hits the SMS code wall. A webhook bridge between Skyvern and Telegram lets the user send the code via chat, completing the full cycle in 30 seconds.',
      no: 'FINN.no krever 2FA for hurtige s\u00f8knader. Skyvern fyller ut skjemaet men stopper ved SMS-koden. En webhook-bro mellom Skyvern og Telegram lar brukeren sende koden via chat p\u00e5 30 sekunder.',
      ua: 'FINN.no вимагає 2FA для швидкої подачі. Skyvern заповнює форму, але зупиняється на SMS-коді. Webhook-міст між Skyvern і Telegram дозволяє юзеру надіслати код через чат, завершуючи цикл за 30 секунд.',
    },
    problem: {
      en: 'FINN.no, Norway\'s largest job site, requires 2FA for "Enkel S\u00f8knad" (quick application). Skyvern fills the form, hits "Enter your SMS code," and freezes. Automation stops at the most critical step because 2FA requires a human.',
      no: 'FINN.no, Norges st\u00f8rste jobbside, krever 2FA for "Enkel S\u00f8knad". Skyvern fyller ut skjemaet, treffer "Skriv inn SMS-kode" og fryser. Automatiseringen stopper p\u00e5 det viktigste trinnet.',
      ua: 'FINN.no — найбільший сайт вакансій Норвегії — вимагає 2FA для "Enkel S\u00f8knad". Skyvern заповнює форму, натикається на "Введіть код з SMS" — і зависає. Автоматизація зупиняється на найважливішому кроці.',
    },
    solution: {
      en: 'When Skyvern hits 2FA, the worker creates a record in finn_auth_requests with status code_requested and sends a Telegram message asking for the 6-digit code. The user replies with the code. The finn-2fa-webhook Edge Function polls every 10 seconds and returns the code to Skyvern when available, adapted for Skyvern\'s 30-second HTTP timeout.',
      no: 'N\u00e5r Skyvern treffer 2FA, oppretter workeren en post i finn_auth_requests og sender en Telegram-melding som ber om koden. Brukeren svarer med koden. finn-2fa-webhook Edge Function poller hvert 10. sekund og returnerer koden til Skyvern.',
      ua: 'Коли Skyvern натикається на 2FA, worker створює запис у finn_auth_requests і відправляє Telegram-повідомлення з проханням коду. Юзер відповідає кодом. Edge Function finn-2fa-webhook полює кожні 10 секунд і повертає код Skyvern\'у, адаптований під 30-секундний HTTP timeout.',
    },
    result: {
      en: 'The full "form, 2FA, submit" cycle takes about 30 seconds of human time: receive SMS, send digits in Telegram. Automation handles the rest. FINN Enkel S\u00f8knad is now fully automated.',
      no: 'Hele syklusen "skjema, 2FA, send" tar ca. 30 sekunder menneskelig tid: motta SMS, sende siffer i Telegram. FINN Enkel S\u00f8knad er n\u00e5 fullt automatisert.',
      ua: 'Повний цикл "форма, 2FA, відправка" займає ~30 секунд людського часу: отримати SMS, відправити цифри в Telegram. Решту робить автоматика. FINN Enkel S\u00f8knad повністю автоматизований.',
    },
    techStack: ['Skyvern', 'Telegram Bot API', 'Deno Edge Functions', 'Supabase', 'Python'],
    hashtags: ['#2FA', '#TelegramBot', '#FINN', '#Authentication', '#WebhookBridge', '#Norway'],
  },

  {
    id: 'j08',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Auto-Registration — site accounts created automatically',
      no: 'Autoregistrering — nettstedskontoer opprettet automatisk',
      ua: 'Реєстрація на сайтах — теж автоматична',
    },
    shortDescription: {
      en: 'Many recruiting platforms require registration before applying. A separate Python daemon handles registration: checks for existing accounts, generates secure passwords, asks unknown questions via Telegram, and saves credentials.',
      no: 'Mange rekrutteringsplattformer krever registrering f\u00f8r s\u00f8king. En separat Python-daemon h\u00e5ndterer registrering: sjekker eksisterende kontoer, genererer sikre passord, sp\u00f8r ukjente sp\u00f8rsm\u00e5l via Telegram og lagrer legitimasjon.',
      ua: 'Багато рекрутингових платформ вимагають реєстрацію перед подачею. Окремий Python-демон обробляє реєстрацію: перевіряє існуючі акаунти, генерує безпечні паролі, питає незнайомі запитання через Telegram і зберігає credentials.',
    },
    problem: {
      en: 'Many platforms (Webcruiter, Easycruit, JobbNorge) require registration before applying. Each site has different forms, different fields, different password requirements. Users must register on 5-7 sites manually before starting to apply.',
      no: 'Mange plattformer krever registrering f\u00f8r s\u00f8king. Hver side har ulike skjemaer, felt og passordkrav. Brukere m\u00e5 registrere seg p\u00e5 5-7 sider manuelt f\u00f8r de kan s\u00f8ke.',
      ua: 'Багато платформ вимагають реєстрацію перед подачею. Кожен сайт — окрема форма, інші поля, інші вимоги до пароля. Юзер повинен зареєструватися на 5-7 сайтах вручну.',
    },
    solution: {
      en: 'register_site.py is a separate Python daemon for registration. Generates secure 16-character passwords. Checks site_credentials in the DB to avoid duplicates. When Skyvern encounters an unknown field during registration, it creates a record in registration_questions, and the bot asks the user via Telegram (text or inline buttons). Successful credentials are saved with per-user isolation. Question timeout: 5 minutes.',
      no: 'register_site.py er en separat Python-daemon for registrering. Genererer sikre 16-tegns passord. Sjekker site_credentials for \u00e5 unng\u00e5 duplikater. Ved ukjente felt sp\u00f8r boten brukeren via Telegram. Vellykkede legitimasjoner lagres med brukersisolering.',
      ua: 'register_site.py — окремий Python-демон для реєстрації. Генерує безпечні 16-символьні паролі. Перевіряє site_credentials в БД. Коли Skyvern зустрічає незнайоме поле — бот питає юзера через Telegram. Успішні credentials зберігаються з per-user ізоляцією. Timeout: 5 хвилин.',
    },
    result: {
      en: 'Instead of manual registration on 7 sites (30+ minutes), the user answers 2-3 questions in Telegram in 2 minutes. Credentials are saved permanently and automatically used for future applications.',
      no: 'I stedet for manuell registrering p\u00e5 7 sider (30+ minutter), svarer brukeren p\u00e5 2-3 sp\u00f8rsm\u00e5l i Telegram p\u00e5 2 minutter. Legitimasjoner lagres permanent.',
      ua: 'Замість ручної реєстрації на 7 сайтах (30+ хвилин), юзер відповідає на 2-3 питання в Telegram за 2 хвилини. Credentials зберігаються назавжди і підставляються автоматично.',
    },
    techStack: ['Python', 'Skyvern Docker', 'Telegram Bot API', 'Supabase', 'secrets module'],
    hashtags: ['#AutoRegistration', '#CredentialManagement', '#Skyvern', '#Telegram', '#Automation'],
  },

  {
    id: 'j09',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Login Failed? No problem — bot handles it',
      no: 'Innlogging mislyktes? Ikke noe problem — boten ordner det',
      ua: 'Невірний пароль? Не проблема — бот розрулить',
    },
    shortDescription: {
      en: 'When Skyvern encounters a login failure, the system detects it in real time and asks the user via Telegram: update password or register from scratch. Auto-recovery with backoff retries resolves auth errors in 30 seconds.',
      no: 'N\u00e5r Skyvern m\u00f8ter innloggingsfeil, oppdager systemet det i sanntid og sp\u00f8r brukeren via Telegram: oppdater passord eller registrer p\u00e5 nytt. Auto-gjenoppretting l\u00f8ser auth-feil p\u00e5 30 sekunder.',
      ua: 'Коли Skyvern натикається на помилку логіну, система виявляє це в реальному часі та питає юзера через Telegram: оновити пароль чи зареєструватися з нуля. Автовідновлення з backoff retry вирішує auth-помилки за 30 секунд.',
    },
    problem: {
      en: 'Skyvern logs into a recruiting platform, but the password changed or was wrong. The task fails with login_failed error. The user finds out 30 minutes later when checking logs. Meanwhile, the application deadline may have passed.',
      no: 'Skyvern logger inn p\u00e5 en rekrutteringsplattform, men passordet er endret eller feil. Oppgaven feiler med login_failed. Brukeren finner ut av det 30 minutter senere.',
      ua: 'Skyvern логіниться на платформу, але пароль змінився або був неправильним. Задача падає з помилкою login_failed. Юзер дізнається через 30 хвилин, а дедлайн міг пройти.',
    },
    solution: {
      en: 'Added error code mapping with LLM evaluation to auto_apply.py. On login_failed, the worker identifies the domain and sends a Telegram message with inline buttons: "Update password" or "Register from scratch." Choosing "Yes" triggers a password update; choosing "No" triggers the registration flow. The entire retry chain is automatic with backoff [5s, 10s] and max 3 attempts.',
      no: 'Lagt til error code mapping i auto_apply.py. Ved login_failed sender workeren en Telegram-melding med knapper: "Oppdater passord" eller "Registrer p\u00e5 nytt." Hele gjenfors\u00f8kskjeden er automatisk med backoff og maks 3 fors\u00f8k.',
      ua: 'В auto_apply.py додано error code mapping з LLM evaluation. При login_failed worker відправляє Telegram-повідомлення з кнопками: "Оновити пароль" або "Зареєструватись". Весь retry-ланцюжок автоматичний з backoff [5s, 10s] та максимум 3 спроби.',
    },
    result: {
      en: 'An auth error that previously blocked applications for an hour is now resolved in 30 seconds via Telegram. Auto-recovery plus registration from scratch without leaving the chat.',
      no: 'En auth-feil som tidligere blokkerte s\u00f8knader i en time, l\u00f8ses n\u00e5 p\u00e5 30 sekunder via Telegram. Auto-gjenoppretting pluss registrering uten \u00e5 forlate chatten.',
      ua: 'Помилка авторизації, яка раніше блокувала подачу на годину, тепер вирішується за 30 секунд через Telegram. Автовідновлення + реєстрація з нуля без виходу з чату.',
    },
    techStack: ['Python', 'Skyvern', 'Telegram Bot API', 'Supabase', 'error code mapping'],
    hashtags: ['#ErrorRecovery', '#AutoRetry', '#Login', '#TelegramBot', '#Resilience', '#Automation'],
  },

  {
    id: 'j10',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Form Memory — every attempt makes the system smarter',
      no: 'Skjemahukommelse — hvert fors\u00f8k gj\u00f8r systemet smartere',
      ua: 'Пам\'ять форм — кожна спроба робить систему розумнішою',
    },
    shortDescription: {
      en: 'A knowledge base about each recruiting platform: steps count, upload methods, rich text editors. Domains are normalized so experience from company1.webcruiter.no transfers to all Webcruiter sites. Confidence-based step optimization reduces costs by 40%.',
      no: 'En kunnskapsbase om hver rekrutteringsplattform: antall steg, opplastingsmetoder, rik tekst-editorer. Domener normaliseres slik at erfaring overf\u00f8res mellom alle sider p\u00e5 samme plattform. Tillitsbasert stegoptimalisering reduserer kostnader med 40%.',
      ua: 'База знань про кожну рекрутингову платформу: кількість кроків, методи upload, rich text editors. Домени нормалізуються — досвід з company1.webcruiter.no переноситься на всі Webcruiter сайти. Confidence-based оптимізація зменшує витрати на 40%.',
    },
    problem: {
      en: 'Skyvern fills a form on webcruiter.no. First attempt fails due to non-standard file upload. Second — rich text editor. Third — success. But this experience is not saved. On the next Webcruiter site, everything starts from zero.',
      no: 'Skyvern fyller ut et skjema p\u00e5 webcruiter.no. F\u00f8rste fors\u00f8k mislykkes. Andre ogs\u00e5. Tredje lykkes. Men denne erfaringen lagres ikke. P\u00e5 neste Webcruiter-side starter alt fra null.',
      ua: 'Skyvern заповнює форму на webcruiter.no. Перша спроба провалюється через нестандартний file upload. Друга — rich text editor. Третя — успіх. Але досвід нікуди не зберігається — на наступному webcruiter-сайті все з нуля.',
    },
    solution: {
      en: 'Table site_form_memory stores a JSON record after each attempt: form_fields, navigation_flow, total_steps, upload methods, rich text methods, success/failure counts. normalize_domain_for_memory() reduces 12+ known platforms to base domains. get_form_memory() returns the last successful record. Confidence-based _calc_max_steps() allocates fewer steps as success count grows, optimizing speed and cost.',
      no: 'Tabell site_form_memory lagrer JSON-post etter hvert fors\u00f8k med feltdata, navigasjonsflyt og suksess/feil-tellere. normalize_domain_for_memory() reduserer 12+ plattformer til basedomener. Tillitsbasert _calc_max_steps() tildeler f\u00e6rre steg n\u00e5r suksesstallet vokser.',
      ua: 'Таблиця site_form_memory зберігає JSON-запис після кожної спроби: form_fields, navigation_flow, total_steps, методи upload, success/failure counts. normalize_domain_for_memory() зводить 12+ платформ до базових доменів. Confidence-based _calc_max_steps() зменшує кількість кроків з кожним успіхом.',
    },
    result: {
      en: 'Webcruiter: first attempt 25 steps, fifth 12 steps. Success rate grew from 60% to 92% thanks to accumulated experience. Skyvern token costs decreased by 40%.',
      no: 'Webcruiter: f\u00f8rste fors\u00f8k 25 steg, femte 12 steg. Suksessrate \u00f8kte fra 60% til 92%. Skyvern-tokenkostnader redusert med 40%.',
      ua: 'Webcruiter: перша спроба — 25 кроків, п\'ята — 12 кроків. Success rate зріс з 60% до 92%. Вартість Skyvern-токенів знизилась на 40%.',
    },
    techStack: ['Python', 'Supabase PostgreSQL', 'JSONB', 'Skyvern API'],
    hashtags: ['#FormMemory', '#PatternRecognition', '#DomainNormalization', '#Optimization', '#Database'],
  },

  {
    id: 'j11',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: '7 platforms — 7 automation languages',
      no: '7 plattformer — 7 automatiseringspr\u00e5k',
      ua: '7 платформ — 7 мов автоматизації',
    },
    shortDescription: {
      en: 'Each Norwegian recruiting platform is its own universe. A module with 15+ template functions generates platform-specific navigation goals for Skyvern, with detect_site_type() recognizing 16+ platforms by domain.',
      no: 'Hver norsk rekrutteringsplattform er sitt eget univers. En modul med 15+ malfunksjoner genererer plattformspesifikke navigasjonsm\u00e5l for Skyvern, med detect_site_type() som gjenkjenner 16+ plattformer etter domene.',
      ua: 'Кожна норвезька рекрутингова платформа — це окремий всесвіт. Модуль з 15+ функціями-шаблонами генерує платформо-специфічні navigation goals для Skyvern, з detect_site_type() що розпізнає 16+ платформ за доменом.',
    },
    problem: {
      en: 'Each Norwegian recruiting platform is a separate universe. Webcruiter has a multi-step wizard with mandatory CV upload. Easycruit starts with a popup cookie banner. Teamtailor hides the form behind a button. One generic script does not work.',
      no: 'Hver norsk rekrutteringsplattform er et eget univers. Webcruiter har flerstegsveiviser, Easycruit starter med cookie-popup, Teamtailor skjuler skjemaet bak en knapp. Ett generisk skript fungerer ikke.',
      ua: 'Кожна рекрутингова платформа — це окремий всесвіт. Webcruiter має multi-step wizard з CV upload. Easycruit починає з cookie-popup. Teamtailor ховає форму за кнопкою. Один generic скрипт не працює.',
    },
    solution: {
      en: 'navigation_goals.py contains 15+ template functions: _webcruiter_application(), _easycruit_application(), _teamtailor_application(), _successfactors_application(), _jobbnorge_application(), etc. Each generates a text instruction with specific rules like "DO NOT use drag-and-drop" or "Accept cookies FIRST." detect_site_type() recognizes 16+ platforms by domain. build_memory_section() adds previous experience from site_form_memory.',
      no: 'navigation_goals.py inneholder 15+ malfunksjoner for hver plattform, hver med spesifikke regler. detect_site_type() gjenkjenner 16+ plattformer etter domene. build_memory_section() legger til tidligere erfaring fra site_form_memory.',
      ua: 'navigation_goals.py — модуль з 15+ функціями-шаблонами для кожної платформи з конкретними правилами. detect_site_type() розпізнає 16+ платформ за доменом. build_memory_section() додає попередній досвід з site_form_memory.',
    },
    result: {
      en: 'Instead of one generic "fill the form," 7 personalized scenarios adapted to each platform\'s specifics. Success rate on supported platforms: 85%+. Adding a new platform takes 30 minutes of development.',
      no: 'I stedet for ett generisk "fyll ut skjemaet" — 7 personaliserte scenarier tilpasset hver plattform. Suksessrate p\u00e5 st\u00f8ttede plattformer: 85%+. \u00c5 legge til en ny plattform tar 30 minutter.',
      ua: 'Замість одного "заповни форму" — 7 персоналізованих сценаріїв, адаптованих до кожної платформи. Success rate на підтримуваних платформах — 85%+. Нова платформа — 30 хвилин розробки.',
    },
    techStack: ['Python', 'Skyvern', 'Pattern matching', 'Template system'],
    hashtags: ['#NavigationGoals', '#PlatformSpecific', '#Webcruiter', '#Easycruit', '#Teamtailor', '#Automation'],
  },

  {
    id: 'j12',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'The slider that broke all automation',
      no: 'Slideren som knekte all automatisering',
      ua: 'Слайдер, який зламав всю автоматизацію',
    },
    shortDescription: {
      en: 'Some recruiting forms use slider inputs for experience years or salary. Drag-and-drop fails in headless Chrome. A patched Skyvern handler with DataTransfer drop fallback fixes the entire category of forms.',
      no: 'Noen rekrutteringsskjemaer bruker slider-input for erfarings\u00e5r eller l\u00f8nn. Drag-and-drop feiler i headless Chrome. En patchet Skyvern-handler med DataTransfer drop-fallback l\u00f8ser hele kategorien.',
      ua: 'Деякі рекрутингові форми використовують slider для досвіду чи зарплати. Drag-and-drop не працює в headless Chrome. Патч Skyvern handler з DataTransfer drop fallback фіксить цілу категорію форм.',
    },
    problem: {
      en: 'Some recruiting forms use slider/range inputs for "Years of experience" or "Desired salary." Skyvern tries drag-and-drop — and fails. Browser drag events do not work reliably in headless Chrome. One form with one slider blocks the entire application.',
      no: 'Noen skjemaer bruker slider/range-input for "\u00c5r med erfaring" eller "\u00d8nsket l\u00f8nn." Skyvern pr\u00f8ver drag-and-drop — og feiler. \u00c9tt skjema med \u00e9n slider blokkerer hele s\u00f8knaden.',
      ua: 'Деякі форми використовують slider/range input для "Скільки років досвіду?" або "Бажана зарплата". Skyvern намагається drag-and-drop — і провалюється. Один слайдер блокує всю подачу.',
    },
    solution: {
      en: 'Added special instructions to navigation goals: "For slider/range inputs: DO NOT try to drag. Click the slider to focus, use input_text with the numeric value, fallback to JavaScript element.value." Also patched the Skyvern handler_patched.py with DataTransfer drop fallback, mounted via docker-compose volume.',
      no: 'Lagt til spesielle instruksjoner i navigasjonsm\u00e5l for slidere. Patchet Skyvern handler_patched.py med DataTransfer drop-fallback, montert via docker-compose volume.',
      ua: 'В navigation goals додано інструкцію для слайдерів: "Не drag-and-drop, а click + input_text або JavaScript element.value." Також пропатчено handler_patched.py з DataTransfer drop fallback через docker-compose volume mount.',
    },
    result: {
      en: 'Forms with sliders that always failed now complete on the first attempt. One patched file unblocked an entire category of forms.',
      no: 'Skjemaer med slidere som alltid feilet, fullf\u00f8res n\u00e5 p\u00e5 f\u00f8rste fors\u00f8k. \u00c9n patchet fil l\u00e5ste opp en hel kategori av skjemaer.',
      ua: 'Форми зі слайдерами, що раніше завжди провалювались, тепер заповнюються з першої спроби. Патч одного файлу розблокував цілу категорію форм.',
    },
    techStack: ['Skyvern', 'Docker compose volume mount', 'Python', 'JavaScript injection'],
    hashtags: ['#SliderFix', '#DragAndDrop', '#Headless', '#Docker', '#BrowserHack', '#Workaround'],
  },

  // ─── CATEGORY 3: Web Scraping & Data (Cases 13-17) ────────────────────────────

  {
    id: 'j13',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: '5 patterns for one finnkode',
      no: '5 m\u00f8nstre for \u00e9n finnkode',
      ua: '5 паттернів для одного finnkode',
    },
    shortDescription: {
      en: 'FINN.no has dozens of URL variations for one job listing. A cascading regex system with 5 patterns achieves 100% extraction rate on 2000+ test URLs, plus deadline parsing from 5 date formats.',
      no: 'FINN.no har dusinvis av URL-variasjoner for \u00e9n jobbannonse. Et cascading regex-system med 5 m\u00f8nstre oppn\u00e5r 100% uttrekksrate p\u00e5 2000+ test-URLer, pluss fristparsing fra 5 datoformater.',
      ua: 'FINN.no має десятки варіацій URL для однієї вакансії. Cascading regex-система з 5 паттернами досягає 100% extraction rate на 2000+ тестових URL, плюс парсинг дедлайнів з 5 форматів дат.',
    },
    problem: {
      en: 'FINN.no has dozens of URL variations for one job: /job/123, /job/fulltime/123, /?finnkode=123, /ad/123.html. The finnkode is the key for building the direct application URL. If the parser can\'t extract it, automated application is impossible.',
      no: 'FINN.no har dusinvis av URL-variasjoner for \u00e9n jobb. Finnkode er n\u00f8kkelen for \u00e5 bygge direkte s\u00f8knads-URL. Hvis parseren ikke kan trekke den ut, er automatisert s\u00f8king umulig.',
      ua: 'FINN.no має десятки варіацій URL для однієї вакансії. Finnkode — це ключ для побудови прямого URL подачі. Якщо парсер не витягне його — автоматична подача неможлива.',
    },
    solution: {
      en: 'Implemented extractFinnkode() with 5 regex patterns in priority order: ?finnkode=, /job/digits, /ad/digits, /digits at end, /job/slug/digits. HTML is parsed via Cheerio. Deadlines are extracted from meta tags, JSON-LD, and page text in 5 formats. Critical URL format for applications: finn.no/job/apply?adId=XXXXX (NOT /job/apply/XXXXX which returns 404).',
      no: 'Implementert extractFinnkode() med 5 regex-m\u00f8nstre i prioritetsrekkef\u00f8lge. HTML parses via Cheerio. Frister trekkes ut fra metatagger, JSON-LD og sidetekst i 5 formater. Kritisk URL-format: finn.no/job/apply?adId=XXXXX.',
      ua: 'Реалізовано extractFinnkode() з 5 regex-паттернами в порядку пріоритету. HTML парситься через Cheerio. Дедлайни витягуються з мета-тегів, JSON-LD та тексту в 5 форматах. Критичний формат URL для подачі: finn.no/job/apply?adId=XXXXX.',
    },
    result: {
      en: '100% finnkode extraction rate on 2000+ test URLs. Zero lost jobs due to inability to extract the ID. Correct URL format means zero 404 errors during application.',
      no: '100% finnkode-uttrekksrate p\u00e5 2000+ test-URLer. Null tapte jobber. Korrekt URL-format betyr null 404-feil under s\u00f8king.',
      ua: '100% extraction rate finnkode на 2000+ тестових URL. Жодна вакансія не втрачена. Правильний формат URL — нуль 404 помилок при подачі.',
    },
    techStack: ['Deno', 'Cheerio', 'Regex', 'TypeScript', 'HTML parsing'],
    hashtags: ['#WebScraping', '#FINN', '#Regex', '#URLParsing', '#DataExtraction', '#Norway'],
  },

  {
    id: 'j14',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'The government API nobody knows about',
      no: 'Det offentlige APIet ingen kjenner til',
      ua: 'Державний API, якого ніхто не знає',
    },
    shortDescription: {
      en: 'NAV.no (Arbeidsplassen) is rendered via JavaScript, breaking HTML scrapers monthly. Its public JSON API provides stable structured data without HTML parsing, running 6+ months without a single break.',
      no: 'NAV.no (Arbeidsplassen) rendres via JavaScript, noe som bryter HTML-skrapere m\u00e5nedlig. Deres offentlige JSON API gir stabile strukturerte data uten HTML-parsing, kj\u00f8rt i 6+ m\u00e5neder uten ett eneste brudd.',
      ua: 'NAV.no (Arbeidsplassen) рендериться через JavaScript, ламаючи HTML-скрапери щомісяця. Його публічний JSON API дає стабільні структуровані дані без HTML parsing, працюючи 6+ місяців без жодного збою.',
    },
    problem: {
      en: 'NAV.no (Arbeidsplassen) is Norway\'s government job platform, but HTML scraping is unreliable: the page renders via JavaScript, content is dynamic, structure changes monthly. Classic scraping breaks after every site update.',
      no: 'NAV.no (Arbeidsplassen) er Norges offentlige jobbplattform, men HTML-scraping er up\u00e5litelig: siden rendres via JavaScript, innholdet er dynamisk, strukturen endres m\u00e5nedlig.',
      ua: 'NAV.no (Arbeidsplassen) — державна платформа вакансій Норвегії. HTML-скрапінг ненадійний: сторінка рендериться через JavaScript, контент динамічний, структура змінюється щомісяця.',
    },
    solution: {
      en: 'Implemented NAV enhancer (nav-enhancer.ts) in the job-scraper Edge Function using the Arbeidsplassen Public API to get structured data: title, company, location, deadline, description, contact info, application URL. The API returns clean JSON without HTML parsing. Fallback to HTML parsing if the API is unavailable.',
      no: 'Implementert NAV-enhancer (nav-enhancer.ts) i job-scraper Edge Function ved bruk av Arbeidsplassen Public API for strukturerte data. APIet returnerer ren JSON. Fallback til HTML-parsing hvis APIet er utilgjengelig.',
      ua: 'Реалізовано NAV enhancer (nav-enhancer.ts) в Edge Function job-scraper з використанням Arbeidsplassen Public API для структурованих даних. API повертає чистий JSON без HTML parsing. Fallback на HTML parsing, якщо API не відповідає.',
    },
    result: {
      en: 'Stable NAV.no scraping for 6+ months without a single break. The FINN HTML scraper needed 4 fixes in the same period. JSON API means reliability and clean structured data without regex.',
      no: 'Stabil NAV.no-scraping i 6+ m\u00e5neder uten ett eneste brudd. FINN HTML-scraperen trengte 4 fikser i samme periode. JSON API betyr p\u00e5litelighet.',
      ua: 'Стабільний скрапінг NAV.no вже 6+ місяців без жодного збою. HTML-скрапер FINN потребував 4 фікси за той же період. JSON API — надійність без regex.',
    },
    techStack: ['Deno', 'NAV Public API', 'JSON', 'TypeScript', 'HTTP fetch'],
    hashtags: ['#NAV', '#PublicAPI', '#Arbeidsplassen', '#GovernmentAPI', '#StructuredData', '#Norway'],
  },

  {
    id: 'j15',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'LinkedIn without login — 0% ban risk',
      no: 'LinkedIn uten innlogging — 0% utestengelsesrisiko',
      ua: 'LinkedIn без логіну — 0% ризик бану',
    },
    shortDescription: {
      en: 'LinkedIn aggressively fights scraping with account bans and CAPTCHA. Guest view scraping with rate limiting and User-Agent rotation provides 6 months of uninterrupted data collection with zero risk to professional profiles.',
      no: 'LinkedIn kjemper aggressivt mot scraping med kontoutestengelser og CAPTCHA. Guest view-scraping med hastighetsbegrensning og User-Agent-rotasjon gir 6 m\u00e5neders uavbrutt datainnsamling uten risiko.',
      ua: 'LinkedIn агресивно бореться зі скрапінгом: бани акаунтів, CAPTCHA. Скрапінг guest view з rate limiting та User-Agent rotation дає 6 місяців безперебійного збору даних без ризику для профілю.',
    },
    problem: {
      en: 'LinkedIn is essential for IT job search in Norway, but it aggressively fights scraping: account bans, CAPTCHA, rate limiting. Using login credentials for scraping risks losing your professional profile.',
      no: 'LinkedIn er essensiell for IT-jobb\u00f8k i Norge, men kjemper aggressivt mot scraping: kontoutestengelser, CAPTCHA. \u00c5 bruke innlogging for scraping risikerer profesjonell profil.',
      ua: 'LinkedIn — обов\'язкове джерело вакансій для IT в Норвегії. Але LinkedIn агресивно бореться зі скрапінгом: бани, CAPTCHA, rate limiting. Логін для скрапінгу = ризик втратити профіль.',
    },
    solution: {
      en: 'Implemented LinkedIn Guest API scraping: requests to public job search with parameters location=Norway and keywords from user settings. Parsing JSON-LD and HTML guest view for job details. Rate limiting: max 50 requests per cycle with randomized 1-3 second delays. User-Agent rotation. Results: up to 1000 jobs per scan cycle.',
      no: 'Implementert LinkedIn Guest API-scraping: foresp\u00f8rsler til offentlig jobbs\u00f8k. Parsing av JSON-LD og HTML guest view. Hastighetsbegrensning: maks 50 foresp\u00f8rsler per syklus med randomisert forsinkelse. User-Agent-rotasjon.',
      ua: 'Реалізовано LinkedIn Guest API scraping: запити до публічного пошуку з параметрами location=Norway. Парсинг JSON-LD та HTML guest view. Rate limiting: макс 50 запитів з рандомізованою затримкою. User-Agent rotation. До 1000 вакансій за цикл.',
    },
    result: {
      en: '6 months of uninterrupted LinkedIn scraping without a single ban or CAPTCHA. Zero risk to accounts. Three sources (FINN + NAV + LinkedIn) cover 95%+ of the Norwegian IT job market.',
      no: '6 m\u00e5neder uavbrutt LinkedIn-scraping uten en eneste utestengelse. Null risiko. Tre kilder (FINN + NAV + LinkedIn) dekker 95%+ av det norske IT-jobbmarkedet.',
      ua: '6 місяців безперебійного скрапінгу LinkedIn без жодного бану. Нуль ризику для акаунту. Три джерела (FINN + NAV + LinkedIn) покривають 95%+ норвезького IT-ринку.',
    },
    techStack: ['HTTP fetch', 'JSON-LD parsing', 'Cheerio', 'Rate limiting', 'Deno'],
    hashtags: ['#LinkedIn', '#GuestScraping', '#ZeroRisk', '#RateLimiting', '#JobSearch', '#WebScraping'],
  },

  {
    id: 'j16',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'One job — three sites — zero duplicates',
      no: '\u00c9n jobb — tre sider — null duplikater',
      ua: 'Одна вакансія — три сайти — нуль дублів',
    },
    shortDescription: {
      en: 'Companies post the same job on FINN, LinkedIn, and NAV simultaneously. Cross-source deduplication using normalized company names and titles reduces job count by 15-20% and eliminates wasted AI analysis tokens.',
      no: 'Selskaper publiserer samme jobb p\u00e5 FINN, LinkedIn og NAV samtidig. Krysskildedeuplisering med normaliserte firmanavn reduserer jobbtall med 15-20% og eliminerer bortkastede AI-analysetokens.',
      ua: 'Компанії публікують одну вакансію на FINN, LinkedIn та NAV одночасно. Cross-source дедуплікація з нормалізованими назвами компаній зменшує кількість вакансій на 15-20% і економить AI-токени.',
    },
    problem: {
      en: 'A company posts the same job on FINN.no, LinkedIn, and NAV.no. The scraper collects all three, and the candidate sees "Software Developer at Telenor" three times. This clutters the job list, breaks statistics, and wastes AI tokens analyzing the same thing thrice.',
      no: 'Et selskap publiserer samme jobb p\u00e5 FINN.no, LinkedIn og NAV.no. Skraperen samler alle tre, og kandidaten ser jobben tre ganger. Dette s\u00f8pler jobblisten og kaster bort AI-tokens.',
      ua: 'Компанія публікує вакансію одночасно на FINN, LinkedIn та NAV. Скрапер збирає всі три — кандидат бачить одну вакансію тричі. Це засмічує список і витрачає AI-токени на аналіз одного й того ж.',
    },
    solution: {
      en: 'Deduplication at insert level: before adding a new job, search the DB by user_id + normalized company + normalized title + location similarity. Normalization: toLowerCase(), trim, removal of legal suffixes (AS, ASA, A/S), removal of special characters. If a match is found, the job is updated with an alternative source URL instead of duplicated.',
      no: 'Deduplisering p\u00e5 insert-niv\u00e5: f\u00f8r ny jobb legges til, s\u00f8k i DB etter normalisert firma + tittel + beliggenhet. Normalisering: toLowerCase(), trim, fjerning av juridiske suffikser. Ved treff oppdateres jobben med alternativ kilde-URL.',
      ua: 'Дедуплікація на рівні insert: перед додаванням нової вакансії — пошук в БД за normalized company + title + location. Нормалізація: toLowerCase(), trim, видалення юридичних суфіксів (AS, ASA). При збігу — оновлення з альтернативним source URL.',
    },
    result: {
      en: 'Deduplication reduced job count by 15-20% with the same search queries. Zero duplicate analyses = AI token savings. Candidates see a clean feed without duplicates.',
      no: 'Deduplisering reduserte jobbtallet med 15-20%. Null dobbeltanalyser = AI-tokenbesparelser. Kandidater ser en ren feed uten duplikater.',
      ua: 'Дедуплікація знизила кількість вакансій на 15-20%. Нуль подвійних аналізів = економія AI-токенів. Кандидат бачить чисту стрічку без дублів.',
    },
    techStack: ['PostgreSQL', 'TypeScript', 'String normalization', 'Supabase'],
    hashtags: ['#Deduplication', '#DataQuality', '#CrossSource', '#Normalization', '#PostgreSQL'],
  },

  {
    id: 'j17',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Shadow DOM — the FINN.no boss we outsmarted',
      no: 'Shadow DOM — FINN.no-bossen vi overlisted',
      ua: 'Shadow DOM — бос FINN.no, якого ми перехитрили',
    },
    shortDescription: {
      en: 'FINN.no uses Shadow DOM for the "Enkel S\u00f8knad" button, making it invisible to standard parsers. Three-level detection via HTML text search plus direct URL navigation bypasses Shadow DOM entirely.',
      no: 'FINN.no bruker Shadow DOM for "Enkel S\u00f8knad"-knappen, noe som gj\u00f8r den usynlig for standard parsere. Tre-niv\u00e5 deteksjon via HTML-teksts\u00f8k pluss direkte URL-navigasjon omg\u00e5r Shadow DOM helt.',
      ua: 'FINN.no використовує Shadow DOM для кнопки "Enkel S\u00f8knad", що робить її невидимою для стандартних парсерів. Три рівні детекції через пошук тексту в HTML плюс пряма навігація по URL повністю обходять Shadow DOM.',
    },
    problem: {
      en: 'FINN.no uses Shadow DOM for the "Enkel S\u00f8knad" (quick apply) button. Standard CSS selectors and XPath cannot see it. Skyvern, Cheerio, and any parser "doesn\'t know" the button exists. The system cannot determine the application form type — a critical parameter for automation.',
      no: 'FINN.no bruker Shadow DOM for "Enkel S\u00f8knad"-knappen. Standard CSS-velgere og XPath kan ikke se den. Systemet kan ikke bestemme skjematypen — en kritisk parameter for automatisering.',
      ua: 'FINN.no використовує Shadow DOM для кнопки "Enkel S\u00f8knad". Стандартний CSS selector чи XPath її не бачить. Система не може визначити тип форми подачі — критичний параметр для автоматизації.',
    },
    solution: {
      en: 'Three-level detection: 1) Search for "enkel s\u00f8knad" text in HTML source (case-insensitive). 2) Priority check: if "S\u00f8k her" button exists (external form), it takes priority over "Enkel S\u00f8knad" to prevent false positives. 3) For submission — direct navigation to finn.no/job/apply?adId={finnkode} instead of trying to click the Shadow DOM button.',
      no: 'Tre-niv\u00e5 deteksjon: 1) S\u00f8k etter "enkel s\u00f8knad"-tekst i HTML-kilde. 2) Prioritetssjekk: "S\u00f8k her" har prioritet over "Enkel S\u00f8knad." 3) Direkte navigasjon til finn.no/job/apply?adId={finnkode} i stedet for \u00e5 klikke Shadow DOM-knappen.',
      ua: 'Три рівні детекції: 1) Пошук тексту "enkel s\u00f8knad" в HTML source. 2) Пріоритет: кнопка "S\u00f8k her" має пріоритет над "Enkel S\u00f8knad" для запобігання false positives. 3) Пряма навігація на finn.no/job/apply?adId={finnkode} замість кліку по Shadow DOM.',
    },
    result: {
      en: '100% accurate detection of form type on FINN.no. Zero false positives after implementing the "S\u00f8k her" priority check. Shadow DOM is no longer an obstacle — we simply bypass it.',
      no: '100% n\u00f8yaktig deteksjon av skjematype p\u00e5 FINN.no. Null falske positiver etter "S\u00f8k her"-prioritetssjekk. Shadow DOM er ikke lenger et hinder.',
      ua: '100% точна детекція типу форми на FINN.no. Нуль false positives після впровадження пріоритету "S\u00f8k her". Shadow DOM більше не перешкода — ми його просто обходимо.',
    },
    techStack: ['Cheerio', 'HTML text search', 'Regex', 'Deno', 'URL construction'],
    hashtags: ['#ShadowDOM', '#FINN', '#Workaround', '#HTMLParsing', '#DetectionLogic', '#WebScraping'],
  },

  // ─── CATEGORY 4: Telegram Bot (Cases 18-23) ──────────────────────────────────

  {
    id: 'j18',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: '3200 lines of Telegram magic — the bot that replaced UI',
      no: '3200 linjer Telegram-magi — boten som erstattet UI',
      ua: '3200 рядків Telegram магії — бот, що замінив UI',
    },
    shortDescription: {
      en: 'A 3200+ line Deno Edge Function serves as a full mobile client: scan jobs, view analysis, generate cover letters, approve and submit — all within one Telegram chat. 95% of daily interaction happens here.',
      no: 'En 3200+ linjer Deno Edge Function fungerer som en komplett mobilklient: skann jobber, vis analyse, generer s\u00f8knader, godkjenn og send — alt i \u00e9n Telegram-chat. 95% av daglig interaksjon skjer her.',
      ua: '3200+ рядків Deno Edge Function — повноцінний мобільний клієнт: сканування вакансій, аналіз, генерація s\u00f8knad, підтвердження та відправка — все в одному Telegram-чаті. 95% щоденної взаємодії тут.',
    },
    problem: {
      en: 'A web dashboard is convenient on desktop, but 80% of the time the user is on mobile. Receiving a notification, opening a browser, logging in, finding the job, pressing a button — that\'s 5 steps. And the application deadline might be "today."',
      no: 'Et nett-dashboard er praktisk p\u00e5 desktop, men 80% av tiden er brukeren p\u00e5 mobil. \u00c5 motta varsling, \u00e5pne nettleser, logge inn, finne jobben, trykke knapp — det er 5 steg.',
      ua: 'Веб-дашборд зручний за комп\'ютером, але 80% часу юзер на телефоні. Сповіщення, відкрити браузер, залогінитись, знайти вакансію, натиснути кнопку — 5 кроків. А дедлайн може бути "сьогодні."',
    },
    solution: {
      en: 'telegram-bot/index.ts — 3200+ lines Deno Edge Function (v15.0). Commands: /start (stats + buttons), /scan (launch scan), /report (daily report), /link (account binding), /code (2FA). Callback queries for inline buttons: write cover letter, view, approve, send, batch apply, cancel. URL pipeline: user sends a link, bot scrapes, analyzes, and shows score with action buttons. Multi-user: every handler starts with getUserIdFromChat().',
      no: 'telegram-bot/index.ts \u2014 3200+ linjer Deno Edge Function. Kommandoer: /start, /scan, /report, /link, /code. Callback-queries for inline-knapper. URL-pipeline: brukeren sender lenke, boten skraper og analyserer. Multi-user: hver handler starter med getUserIdFromChat().',
      ua: 'telegram-bot/index.ts — 3200+ рядків Deno Edge Function. Команди: /start, /scan, /report, /link, /code. Callback queries для inline кнопок: написати s\u00f8knad, переглянути, підтвердити, відправити, batch apply. URL pipeline: юзер надсилає лінк — бот скрапить, аналізує, показує score з кнопками. Multi-user через getUserIdFromChat().',
    },
    result: {
      en: '95% of daily system interaction is through Telegram. From new job notification to submitted cover letter — 4 button presses in 30 seconds. The bot became the primary interface.',
      no: '95% av daglig systeminteraksjon er gjennom Telegram. Fra ny jobbvarsling til innsendt s\u00f8knad \u2014 4 knappetrykk p\u00e5 30 sekunder. Boten ble det prim\u00e6re grensesnittet.',
      ua: '95% щоденної взаємодії — через Telegram. Від сповіщення про вакансію до відправки s\u00f8knad — 4 натиски кнопок за 30 секунд. Бот став основним інтерфейсом.',
    },
    techStack: ['Deno', 'Telegram Bot API', 'Supabase', 'TypeScript', 'Cheerio'],
    hashtags: ['#TelegramBot', '#ChatBot', '#MobileFirst', '#EdgeFunction', '#Deno', '#UX'],
  },

  {
    id: 'j19',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Drop a link — get analysis in 15 seconds',
      no: 'Send en lenke — f\u00e5 analyse p\u00e5 15 sekunder',
      ua: 'Кинь лінк — отримай аналіз за 15 секунд',
    },
    shortDescription: {
      en: 'Any job URL sent to the Telegram bot is automatically scraped, saved to the database, analyzed by AI, and returned with a score and action buttons. From link to full analysis in 15 seconds.',
      no: 'Enhver jobb-URL sendt til Telegram-boten blir automatisk skrapet, lagret i databasen, analysert av AI og returnert med poengsum og handlingsknapper. Fra lenke til full analyse p\u00e5 15 sekunder.',
      ua: 'Будь-який URL вакансії, відправлений в Telegram бот, автоматично скрапиться, зберігається в БД, аналізується AI та повертається з оцінкою і кнопками дій. Від лінку до повного аналізу за 15 секунд.',
    },
    problem: {
      en: 'A friend sends a job link in chat. The user opens it, reads for 5 minutes, tries to assess fit. Or doesn\'t read at all — too lazy. The link gets lost in the message feed. A good opportunity missed.',
      no: 'En venn sender en jobblenke i chat. Brukeren \u00e5pner den, leser i 5 minutter, pr\u00f8ver \u00e5 vurdere egnethet. Eller leser ikke i det hele tatt. Lenken g\u00e5r tapt. En god mulighet g\u00e5r tapt.',
      ua: 'Друг скидає лінк на вакансію. Юзер відкриває, читає 5 хвилин, намагається оцінити відповідність. Або не читає — лінь. Лінк губиться в стрічці. Гарна вакансія пропущена.',
    },
    solution: {
      en: 'URL pipeline in telegram-bot: the text handler checks messages for URLs (regex for finn.no, nav.no, linkedin.com, and any other domains). If found: 1) Scrape job details via extract_job_text. 2) Save to jobs DB. 3) Run job-analyzer for AI scoring. 4) Send result: score, aura, pros/cons, action buttons. URL handler has priority BEFORE other message handlers.',
      no: 'URL-pipeline i telegram-bot: teksthandler sjekker meldinger for URLer. Hvis funnet: skrape, lagre, analysere, sende resultat med poengsum og knapper. URL-handler har prioritet F\u00d8R andre meldingshandlere.',
      ua: 'URL pipeline в telegram-bot: text handler перевіряє повідомлення на URL. Якщо знайдено: 1) Скрапить деталі через extract_job_text. 2) Зберігає в БД. 3) AI-аналіз. 4) Відправляє результат: score, aura, кнопки дій. URL handler має пріоритет ПЕРЕД іншими обробниками.',
    },
    result: {
      en: 'From sending a link to full analysis with score — 15 seconds. The user instantly sees "78% match, Growth aura" and can act. No link gets lost — everything enters the system.',
      no: 'Fra sending av lenke til full analyse med poengsum \u2014 15 sekunder. Brukeren ser umiddelbart "78% match, Growth aura." Ingen lenke g\u00e5r tapt.',
      ua: 'Від відправки лінку до повного аналізу з оцінкою — 15 секунд. Юзер одразу бачить "78% match, Growth aura" і може діяти. Жоден лінк не губиться.',
    },
    techStack: ['Telegram Bot API', 'Deno', 'Cheerio', 'Azure OpenAI', 'Supabase'],
    hashtags: ['#URLPipeline', '#InstantAnalysis', '#TelegramBot', '#OneClick', '#AI', '#UX'],
  },

  {
    id: 'j20',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Inline buttons — full workflow in one chat',
      no: 'Inline-knapper — full arbeidsflyt i \u00e9n chat',
      ua: 'Inline кнопки — весь workflow в одному чаті',
    },
    shortDescription: {
      en: 'Every job message has inline buttons for ALL next actions: Write, View, Approve, Send. One chat = full pipeline. The "seen job to submitted application" conversion doubled.',
      no: 'Hver jobbmelding har inline-knapper for ALLE neste handlinger: Skriv, Vis, Godkjenn, Send. \u00c9n chat = full pipeline. Konverteringen "sett jobb til innsendt s\u00f8knad" ble doblet.',
      ua: 'Кожне повідомлення з вакансією має inline кнопки для ВСІХ наступних дій: Написати, Переглянути, Підтвердити, Відправити. Один чат = повний pipeline. Конверсія "побачив вакансію, подав заявку" зросла вдвічі.',
    },
    problem: {
      en: 'Showing job analysis is half the battle. Then the candidate must: open web dashboard, find the job, click "Write s\u00f8knad," wait, confirm, send. 6 steps, 2 platforms, 5 minutes. But the Telegram message already has the job info.',
      no: '\u00c5 vise jobbanalyse er bare halvparten. Kandidaten m\u00e5 deretter \u00e5pne dashboard, finne jobben, klikke "Skriv s\u00f8knad", vente, bekrefte, sende. 6 steg, 2 plattformer, 5 minutter.',
      ua: 'Показати аналіз — половина. Далі потрібно: відкрити дашборд, знайти вакансію, натиснути "Написати s\u00f8knad", дочекатися, підтвердити, відправити. 6 кроків, 2 платформи, 5 хвилин.',
    },
    solution: {
      en: 'Every job message contains InlineKeyboardMarkup with buttons: Write s\u00f8knad, View, Approve, Send to company, Update application type. The callback handler parses prefix + id, performs the action, and updates the message with new buttons. For batch FINN Easy: /apply command collects all approved applications and sends them in batch.',
      no: 'Hver jobbmelding inneholder InlineKeyboardMarkup med knapper: Skriv s\u00f8knad, Vis, Godkjenn, Send, Oppdater type. Callback-handler parser prefix + id, utf\u00f8rer handling og oppdaterer meldingen. For batch FINN Easy: /apply samler godkjente s\u00f8knader.',
      ua: 'Кожне повідомлення містить InlineKeyboardMarkup з кнопками: Написати s\u00f8knad, Переглянути, Підтвердити, Відправити, Оновити тип. Callback handler парсить prefix + id, виконує дію, оновлює повідомлення. Для batch FINN Easy: /apply збирає approved заявки.',
    },
    result: {
      en: 'Full cycle from notification to submitted application — 4 button presses, 30 seconds, without leaving Telegram. The "seen job to submitted application" conversion doubled.',
      no: 'Full syklus fra varsling til innsendt s\u00f8knad \u2014 4 knappetrykk, 30 sekunder, uten \u00e5 forlate Telegram. Konverteringen doblet seg.',
      ua: 'Повний цикл від сповіщення до відправки — 4 натиски кнопок, 30 секунд, без виходу з Telegram. Конверсія "побачив, подав" зросла вдвічі.',
    },
    techStack: ['Telegram Bot API', 'InlineKeyboardMarkup', 'Callback queries', 'Deno'],
    hashtags: ['#InlineButtons', '#ChatUI', '#Workflow', '#OneChat', '#TelegramBot', '#UX'],
  },

  {
    id: 'j21',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Smart Confirmation — show everything before sending',
      no: 'Smart bekreftelse — vis alt f\u00f8r sending',
      ua: 'Покажи все перед відправкою — Smart Confirmation',
    },
    shortDescription: {
      en: 'Before submitting an application, the bot shows a full preview: name, email, phone, cover letter excerpt, and site credentials. Each field is editable via inline buttons. Zero "sent with wrong email" incidents.',
      no: 'F\u00f8r innsending viser boten full forh\u00e5ndsvisning: navn, e-post, telefon, s\u00f8knadsutdrag og nettstedlegitimasjon. Hvert felt kan redigeres via inline-knapper. Null "sendt med feil e-post"-hendelser.',
      ua: 'Перед відправкою бот показує повний preview: ім\'я, email, телефон, фрагмент s\u00f8knad та credentials сайту. Кожне поле редагується через inline кнопки. Нуль випадків "відправив з невірним email."',
    },
    problem: {
      en: 'User clicks "Send" — but what name will be in the form? What email? What phone? If the profile has the wrong number, automated sending without confirmation means a lost application.',
      no: 'Brukeren klikker "Send" \u2014 men hvilket navn st\u00e5r i skjemaet? Hvilken e-post? Automatisk sending uten bekreftelse betyr tapte s\u00f8knader.',
      ua: 'Юзер натискає "Відправити" — яке ім\'я буде в формі? Який email? Який телефон? Автоматична відправка без підтвердження — це загублена заявка.',
    },
    solution: {
      en: 'When pressing "Send to Company," the bot pulls from the DB: active CV profile (name, email, phone), cover letter (first 200 chars), site credentials, form type. Forms a preview message with inline buttons: Edit email, Edit phone, Edit cover letter, Confirm and send, Cancel. When editing — the bot asks for the new value via text and updates the DB.',
      no: 'Ved trykk p\u00e5 "Send" henter boten CV-profil, s\u00f8knad og legitimasjoner fra DB. Viser forh\u00e5ndsvisning med redigerbare felt via inline-knapper. Ved redigering sp\u00f8r boten om ny verdi og oppdaterer DB.',
      ua: 'При натисканні "Відправити" бот витягує з БД: CV профіль, s\u00f8knad, credentials сайту. Формує preview з inline кнопками: редагувати email, телефон, s\u00f8knad, підтвердити, скасувати. При редагуванні — запитує нове значення і оновлює БД.',
    },
    result: {
      en: 'Zero "sent with wrong email" cases after implementing Smart Confirmation. The user sees the full picture in 2 seconds and confidently presses "Confirm."',
      no: 'Null "sendt med feil e-post"-tilfeller etter Smart Confirmation. Brukeren ser hele bildet p\u00e5 2 sekunder og trykker trygt "Bekreft."',
      ua: 'Нуль випадків "відправив з невірним email" після Smart Confirmation. Юзер бачить повну картину за 2 секунди і впевнено натискає "Підтвердити."',
    },
    techStack: ['Telegram Bot API', 'Supabase', 'Inline Keyboard', 'TypeScript'],
    hashtags: ['#SmartConfirmation', '#PreviewBeforeSend', '#QualityControl', '#UX', '#TelegramBot'],
  },

  {
    id: 'j22',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'The bot that asks what it doesn\'t know',
      no: 'Boten som sp\u00f8r om det den ikke vet',
      ua: 'Бот, що питає те, чого не знає',
    },
    shortDescription: {
      en: 'When Skyvern encounters unknown form fields like "Do you live in Norway?", it pauses and asks the user via Telegram with inline button options. Answers are cached so the same question is never asked twice.',
      no: 'N\u00e5r Skyvern m\u00f8ter ukjente skjemafelt som "Bor du i Norge?", stopper det og sp\u00f8r brukeren via Telegram med inline-knapper. Svar caches slik at samme sp\u00f8rsm\u00e5l aldri stilles to ganger.',
      ua: 'Коли Skyvern зустрічає незнайомі поля форми на кшталт "Bor du i Norge?", він зупиняється і питає юзера через Telegram з inline кнопками. Відповіді кешуються — те саме питання ніколи не задається двічі.',
    },
    problem: {
      en: 'A Webcruiter form asks "Bor du i Norge?" (Do you live in Norway?) — this field is not in the CV profile. Skyvern stops because it cannot guess. Previously this meant task failure. Such questions number in dozens: driving license, security clearance, availability date.',
      no: 'Et Webcruiter-skjema sp\u00f8r "Bor du i Norge?" \u2014 dette feltet er ikke i CV-profilen. Skyvern stopper fordi den ikke kan gjette. Slike sp\u00f8rsm\u00e5l er det dusinvis av.',
      ua: 'Форма Webcruiter питає "Bor du i Norge?" — цього поля немає в CV профілі. Skyvern зупиняється — він не може вгадувати. Раніше це означало провал задачі. Таких питань — десятки.',
    },
    solution: {
      en: 'Table registration_questions stores questions from Skyvern. The worker creates a record and sends a Telegram message with the question text + inline buttons with obvious options (Ja/Nei, 1-2 years/3-5 years/5+ years). Users can also answer with text. The worker polls for answers with a 5-minute timeout. Answers are cached and reused for the same questions on other sites.',
      no: 'Tabell registration_questions lagrer sp\u00f8rsm\u00e5l fra Skyvern. Workeren sender Telegram-melding med sp\u00f8rsm\u00e5lstekst + inline-knapper. Svar caches og gjenbrukes for samme sp\u00f8rsm\u00e5l p\u00e5 andre sider. Timeout p\u00e5 5 minutter.',
      ua: 'Таблиця registration_questions зберігає питання від Skyvern. Worker відправляє Telegram-повідомлення з inline кнопками з варіантами. Відповіді кешуються і підставляються для тих самих питань на інших сайтах. Timeout: 5 хвилин.',
    },
    result: {
      en: 'Forms with non-standard fields no longer fail. The user answers 2-3 questions in Telegram, and the form fills completely. Answer caching reduces the number of questions with each attempt.',
      no: 'Skjemaer med ikke-standardfelt feiler ikke lenger. Brukeren svarer p\u00e5 2-3 sp\u00f8rsm\u00e5l i Telegram. Svarcaching reduserer antall sp\u00f8rsm\u00e5l med hvert fors\u00f8k.',
      ua: 'Форми з нестандартними полями більше не провалюються. Юзер відповідає на 2-3 питання в Telegram. Кешування відповідей зменшує кількість питань з кожною спробою.',
    },
    techStack: ['Telegram Bot API', 'Supabase', 'Skyvern', 'InlineKeyboard', 'Python'],
    hashtags: ['#MissingFields', '#QA', '#Interactive', '#TelegramBot', '#FormFilling', '#Automation'],
  },

  {
    id: 'j23',
    projectId: 'jobbot',
    category: 'bot_scraping',
    title: {
      en: 'Pocket job card — compact card with aura',
      no: 'Lommekort — kompakt kort med aura',
      ua: 'Вакансія в кишені — компактна картка з аурою',
    },
    shortDescription: {
      en: 'AI analysis returns tons of data, but nobody reads walls of text on mobile. Compact "job cards" show score, aura emoji, company, deadline, and action buttons — fitting one phone screen. Details expand on tap.',
      no: 'AI-analyse returnerer masse data, men ingen leser tekstvegger p\u00e5 mobil. Kompakte "jobbkort" viser poengsum, aura-emoji, firma, frist og handlingsknapper — p\u00e5 \u00e9n mobilskjerm. Detaljer utvides ved trykk.',
      ua: 'AI-аналіз повертає купу даних, але ніхто не читає стіни тексту на мобільному. Компактні "job cards" показують score, aura emoji, компанію, дедлайн та кнопки дій — на один екран. Деталі розгортаються натиском.',
    },
    problem: {
      en: 'AI analysis returns lots of data: score, aura, 5-axis radar, pros/cons, tasks, deadline, company, location, form type. Sending it all in one message creates a wall of text. Telegram limits messages to 4096 characters. Nobody reads long messages on mobile.',
      no: 'AI-analyse returnerer mye data. \u00c5 sende alt i \u00e9n melding lager en tekstvegg. Telegram begrenser meldinger til 4096 tegn. Ingen leser lange meldinger p\u00e5 mobil.',
      ua: 'AI-аналіз повертає купу даних: score, aura, radar, pros/cons, tasks, deadline. Все в одному повідомленні — стіна тексту. Telegram обмежує повідомлення до 4096 символів. Ніхто не читає довгі повідомлення.',
    },
    solution: {
      en: 'Compact job card format: aura_emoji + company + title, Score + aura status, Deadline, form type + action buttons. "Details" button expands: pros/cons, tasks, radar scores, full URL. Cover letters truncated to 1500 chars with "Full text" button. Aura emoji mapping: Toxic, Growth, Balanced, Chill, Grind, Neutral. HTML formatting for compactness.',
      no: 'Kompakt jobbkortformat: aura_emoji + firma + tittel, poengsum, frist, skjematype + knapper. "Detaljer" utvider: fordeler/ulemper, oppgaver, radar. S\u00f8knader avkortet til 1500 tegn. Aura-emoji-kartlegging for 6 typer.',
      ua: 'Компактний формат job card: aura_emoji + company + title, Score + aura status, Deadline, form type + кнопки. "Детальніше" розгортає: pros/cons, tasks, radar. Cover letters обрізаються до 1500 символів. Aura emoji mapping для 6 типів. HTML formatting для компактності.',
    },
    result: {
      en: 'A compact message fits one phone screen. The "apply or not" decision is made in 3 seconds. Details available with one tap. Zero messages truncated by Telegram\'s character limit.',
      no: 'En kompakt melding passer p\u00e5 \u00e9n mobilskjerm. Beslutningen "s\u00f8ke eller ikke" tas p\u00e5 3 sekunder. Detaljer tilgjengelig med ett trykk. Null meldinger avkortet av Telegram.',
      ua: 'Компактне повідомлення вміщується в один екран. Рішення "подаватись чи ні" за 3 секунди. Деталі — одним натиском. Нуль повідомлень, обрізаних Telegram.',
    },
    techStack: ['Telegram Bot API', 'HTML formatting', 'Emoji system', 'TypeScript'],
    hashtags: ['#JobCard', '#CompactUI', '#Aura', '#TelegramBot', '#MobileUX', '#InformationDesign'],
  },

  // ─── CATEGORY 5: Frontend Dashboard (Cases 24-30) ─────────────────────────────

  {
    id: 'j24',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'Dashboard — the pulse of job hunting',
      no: 'Dashboard — pulsen i jobb\u00f8kingen',
      ua: 'Dashboard — пульс пошуку роботи',
    },
    shortDescription: {
      en: 'A full analytics dashboard with metric cards (jobs, applications, success rate, AI cost), a pipeline stacked bar chart, and a Leaflet map of Norway with color-coded job markers. Full picture in 3 seconds.',
      no: 'Et komplett analyse-dashboard med metrikkort, pipeline stablet s\u00f8ylediagram og Leaflet-kart over Norge med fargekodede jobbmark\u00f8rer. Hele bildet p\u00e5 3 sekunder.',
      ua: 'Повний аналітичний Dashboard з metric cards (вакансії, заявки, success rate, AI cost), pipeline stacked bar chart та Leaflet-карта Норвегії з кольоровими маркерами. Повна картина за 3 секунди.',
    },
    problem: {
      en: 'The candidate does not know where they stand. How many jobs found this week? How many applications in progress? What\'s the conversion rate? Without analytics, job hunting is chaotic poking in the dark. Motivation drops when you can\'t see progress.',
      no: 'Kandidaten vet ikke hvor de st\u00e5r. Hvor mange jobber funnet? Hvor mange s\u00f8knader p\u00e5g\u00e5r? Uten analyse er jobb\u00f8king kaotisk. Motivasjonen faller n\u00e5r man ikke ser fremgang.',
      ua: 'Кандидат не знає, де він стоїть. Скільки вакансій знайдено? Скільки подач в процесі? Без аналітики пошук роботи — хаотичне тикання в темряві. Мотивація падає, коли не бачиш прогресу.',
    },
    solution: {
      en: 'DashboardPage.tsx with three sections: 1) Metric Cards — Total Jobs, Applications, Success Rate, AI Cost with weekly trends. 2) Stacked Bar Chart — Recharts pipeline: New, Analyzed, Written, Approved, Sent, Submitted. 3) Job Map — Leaflet map of Norway with color-coded markers (green=submitted, yellow=in progress, red=rejected). DateRangePicker for period filtering. Real-time data via Supabase RLS queries.',
      no: 'DashboardPage.tsx med tre seksjoner: 1) Metrikkort med ukentlige trender. 2) Stablet s\u00f8ylediagram \u2014 Recharts pipeline. 3) Jobbkart \u2014 Leaflet-kart over Norge med fargekodede mark\u00f8rer. DateRangePicker for periodfiltrering.',
      ua: 'DashboardPage.tsx з трьома секціями: 1) Metric Cards з тижневими трендами. 2) Stacked Bar Chart — Recharts pipeline. 3) Job Map — Leaflet карта Норвегії з кольоровими маркерами. DateRangePicker для фільтрації.',
    },
    result: {
      en: 'The candidate opens the dashboard and sees in 3 seconds: "this week 47 jobs, 12 applications, 3 submitted, cost $2.40." Motivation grows with concrete numbers. The pipeline chart shows bottlenecks requiring action.',
      no: 'Kandidaten \u00e5pner dashboardet og ser p\u00e5 3 sekunder: "denne uken 47 jobber, 12 s\u00f8knader, 3 innsendt, kostnad $2,40." Pipeline-diagrammet viser flaskehalser.',
      ua: 'Кандидат відкриває dashboard і за 3 секунди бачить: "цього тижня 47 вакансій, 12 подач, 3 submitted, cost $2.40." Pipeline chart показує "затори" і що потребує дії.',
    },
    techStack: ['React 19', 'Recharts', 'Leaflet', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    hashtags: ['#Dashboard', '#DataVisualization', '#Recharts', '#Analytics', '#React', '#UX'],
  },

  {
    id: 'j25',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'Map of 160+ Norwegian cities — jobs on the map',
      no: 'Kart over 160+ norske byer — jobber p\u00e5 kartet',
      ua: 'Карта 160+ норвезьких міст — вакансії на мапі',
    },
    shortDescription: {
      en: 'Instead of expensive Google Geocoding API, a built-in cache of 160+ Norwegian city coordinates plus postal code fallback gives free, instant job map visualization on Leaflet.',
      no: 'I stedet for dyr Google Geocoding API, gir en innebygd cache med 160+ norske bykoordinater pluss postnummer-fallback gratis, umiddelbar jobbkartvisualisering p\u00e5 Leaflet.',
      ua: 'Замість дорогого Google Geocoding API — вбудований кеш координат 160+ норвезьких міст плюс fallback на поштові коди дає безкоштовну миттєву візуалізацію вакансій на Leaflet.',
    },
    problem: {
      en: 'Jobs have location text: "Oslo," "Gj\u00f8vik," "Hunndalen," "Bismo." But where is that on a map? Especially for an immigrant who doesn\'t know Hunndalen is 5km from Gj\u00f8vik. A text list gives no spatial understanding. Google Geocoding costs $5/1000 requests.',
      no: 'Jobber har stedsnavntekst, men hvor er det p\u00e5 kartet? Spesielt for en innvandrer. Google Geocoding koster $5/1000 foresp\u00f8rsler.',
      ua: 'Вакансії мають текстову локацію: "Oslo," "Gj\u00f8vik," "Hunndalen." Де це на карті? Особливо для іммігранта. Google Geocoding коштує $5/1000 запитів.',
    },
    solution: {
      en: 'JobMap.tsx with Leaflet: CITY_COORDS — 160+ entries from Oslo to Troms\u00f8, including user-specific regions (Gj\u00f8vik, Hunndalen, Raufoss). POSTAL_RANGES — 4-digit prefix to coordinates. extractLocation() scans text for city names (case-insensitive, with \u00f8/o transliteration) and postal codes. Color-coded markers: green (submitted), blue (analyzed), yellow (in progress), grey (new).',
      no: 'JobMap.tsx med Leaflet: CITY_COORDS \u2014 160+ oppf\u00f8ringer. POSTAL_RANGES \u2014 4-sifret postnummer til koordinater. extractLocation() skanner tekst for bynavn med \u00f8/o-translitterering. Fargekodede mark\u00f8rer.',
      ua: 'JobMap.tsx з Leaflet: CITY_COORDS — 160+ записів від Oslo до Troms\u00f8. POSTAL_RANGES — 4-значний поштовий код до координат. extractLocation() сканує текст на назви міст (з транслітерацією \u00f8/o). Кольорові маркери.',
    },
    result: {
      en: 'A live map of Norway with job markers. The candidate sees clusters in Innlandet, Oslo, Bergen. Click on a marker shows job name and score popup. Zero geocoding API costs.',
      no: 'Et levende kart over Norge med jobbmark\u00f8rer. Kandidaten ser klynger i Innlandet, Oslo, Bergen. Klikk p\u00e5 mark\u00f8r viser popup med jobb og poengsum. Null geocoding-kostnader.',
      ua: 'Жива карта Норвегії з маркерами вакансій. Кандидат бачить кластери в Innlandet, Oslo, Bergen. Клік на маркер — popup з назвою та score. Нуль витрат на geocoding.',
    },
    techStack: ['Leaflet', 'React', 'TypeScript', 'GeoJSON', 'Static coordinates cache'],
    hashtags: ['#JobMap', '#Leaflet', '#Geocoding', '#Norway', '#DataVisualization', '#FreeAPI'],
  },

  {
    id: 'j26',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: '88KB table — the frontend monster that works',
      no: '88KB tabell — frontend-monsteret som fungerer',
      ua: '88KB таблиця — фронтенд-монстр, який працює',
    },
    shortDescription: {
      en: 'The largest project component at 88KB: column filters, company exclusion lists, bulk actions, sort, search, date range, expandable rows, Excel/PDF export. Virtual scrolling handles 500+ rows without lag.',
      no: 'Den st\u00f8rste prosjektkomponenten p\u00e5 88KB: kolonnefiltre, firmautelukking, massehandlinger, sortering, s\u00f8k, datointervall, utvidbare rader, Excel/PDF-eksport. Virtual scrolling h\u00e5ndterer 500+ rader uten forsinkelse.',
      ua: 'Найбільший компонент проекту 88KB: фільтри по колонках, exclusion list компаній, bulk actions, sort, search, date range, expandable rows, Excel/PDF export. Virtual scrolling тримає 500+ рядків без лагів.',
    },
    problem: {
      en: 'After a week of scanning, the DB has 200+ jobs. Finding "IT jobs in Gj\u00f8vik with score > 70 for the last week, excluding recruiter companies" requires 10 filter clicks and 5 minutes of scrolling with a regular table.',
      no: 'Etter en uke med skanning har DB 200+ jobber. \u00c5 finne spesifikke jobber krever 10 filterklikk og 5 minutter med scrolling med en vanlig tabell.',
      ua: 'Після тижня сканування в БД 200+ вакансій. Знайти "IT в Gj\u00f8vik, score > 70 за останній тиждень, без рекрутерів" — 10 кліків фільтрів і 5 хвилин скролінгу.',
    },
    solution: {
      en: 'JobTable.tsx at 88KB is the largest component. Features: 1) Column filters — dropdown by status, form type, source; text search. 2) Company exclusion — "Block Adecco" hides all their jobs permanently. 3) DateRangePicker with presets. 4) Sort by score, date, company, deadline. 5) Bulk actions — checkbox selection for batch approve/send. 6) Expandable rows — pros/cons, tasks, aura, radar. 7) Excel/PDF export. Virtual scrolling for 500+ rows.',
      no: 'JobTable.tsx p\u00e5 88KB med kolonnefiltre, firmaekskludering, datovelger, sortering, massehandlinger, utvidbare rader, Excel/PDF-eksport og virtual scrolling for 500+ rader.',
      ua: 'JobTable.tsx 88KB з фільтрами по колонках, exclusion компаній, DateRangePicker, sort, bulk actions з checkbox selection, expandable rows, Excel/PDF export. Virtual scrolling для 500+ рядків.',
    },
    result: {
      en: 'Finding "IT in Gj\u00f8vik, score > 70" — 3 clicks, 2 seconds. Excluding recruiters — 1 click. Batch approving 5 jobs — 2 clicks. The table handles 500+ rows without lag thanks to virtual scrolling.',
      no: 'Finne "IT i Gj\u00f8vik, poengsum > 70" \u2014 3 klikk, 2 sekunder. Ekskludere rekrutterere \u2014 1 klikk. Godkjenne 5 jobber i batch \u2014 2 klikk. 500+ rader uten forsinkelse.',
      ua: 'Знайти "IT в Gj\u00f8vik, score > 70" — 3 кліки, 2 секунди. Exclude рекрутерів — 1 клік. Approve 5 вакансій пакетом — 2 кліки. 500+ рядків без лагів.',
    },
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Virtual scrolling', 'Lucide icons'],
    hashtags: ['#DataTable', '#Filtering', '#BulkActions', '#React', '#VirtualScrolling', '#UX'],
  },

  {
    id: 'j27',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'Excel export with hyperlinks — HR will appreciate it',
      no: 'Excel-eksport med hyperlenker — HR vil sette pris p\u00e5 det',
      ua: 'Export в Excel з гіперлінками — HR оцінить',
    },
    shortDescription: {
      en: 'One-click Excel export with clickable job URLs, color-coded scores, custom column selection, and auto-fit widths. PDF export with candidate name header for official purposes. Export history saved in DB.',
      no: 'Ett-klikks Excel-eksport med klikkbare jobb-URLer, fargekodede poengsummer, tilpasset kolonnevalg og auto-tilpasset bredde. PDF-eksport med kandidatnavn i topptekst for offisielle form\u00e5l.',
      ua: 'Export в Excel одним кліком з клікабельними URL, кольоровим score, вибором колонок та auto-fit ширини. PDF export з іменем кандидата для офіційних цілей. Історія експортів в БД.',
    },
    problem: {
      en: 'The candidate wants to share a job list with a NAV career consultant or save for offline review. Copy-paste loses formatting. Screenshots aren\'t clickable. PDF can\'t be filtered. A proper Excel file with smart formatting is needed.',
      no: 'Kandidaten vil dele en jobbliste med NAV-karrierr\u00e5dgiver eller lagre for offline gjennomgang. Kopiering mister formatering. Skjermbilder er ikke klikkbare.',
      ua: 'Кандидат хоче поділитися списком вакансій з консультантом NAV або зберегти офлайн. Copy-paste втрачає форматування. Скріншот не клікабельний. Потрібен нормальний Excel.',
    },
    solution: {
      en: 'Export module uses xlsx library for Excel and jsPDF for PDF. Excel: user selects columns via checkbox modal, hyperlinks via { t: "s", v: title, l: { Target: url } }, color-coded scores (green > 70, yellow 40-70, red < 40), auto-fit column width. PDF: header with candidate name, date, table with wrap text, page number footer. Both saved in export_history.',
      no: 'Eksportmodul bruker xlsx for Excel og jsPDF for PDF. Excel: brukeren velger kolonner, hyperlenker, fargekodede poengsummer, auto-tilpasset bredde. PDF: topptekst med kandidatnavn. Begge lagret i export_history.',
      ua: 'Модуль export використовує xlsx для Excel та jsPDF для PDF. Excel: вибір колонок, гіперлінки, кольорове кодування score, auto-fit ширини. PDF: header з ім\'ям кандидата. Обидва зберігаються в export_history.',
    },
    result: {
      en: 'One click — an Excel file with 50 jobs, clickable links, color-coded scores, ready to send to a NAV consultant. PDF for printing and official purposes. Export history saved in the DB.',
      no: 'Ett klikk \u2014 Excel-fil med 50 jobber, klikkbare lenker, fargekodede poengsummer, klar til \u00e5 sende til NAV-r\u00e5dgiver. PDF for utskrift. Eksporthistorikk lagret i DB.',
      ua: 'Один клік — Excel з 50 вакансіями, клікабельними лінками, кольоровим score, готовий для консультанта NAV. PDF для друку. Історія експортів в БД.',
    },
    techStack: ['xlsx', 'jsPDF', 'React', 'TypeScript', 'Supabase'],
    hashtags: ['#ExcelExport', '#PDF', '#DataExport', '#Hyperlinks', '#Spreadsheet', '#Productivity'],
  },

  {
    id: 'j28',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'CV Editor — 9 sections, full control',
      no: 'CV-editor — 9 seksjoner, full kontroll',
      ua: 'CV Editor — 9 секцій, повний контроль',
    },
    shortDescription: {
      en: 'A structured CV editor with 9 expandable sections: personal info, work experience, education, skills, languages, certifications, summary, references, additional info. Drag-and-drop reordering, auto-save, changes instantly available for forms.',
      no: 'En strukturert CV-editor med 9 utvidbare seksjoner: personlig informasjon, arbeidserfaring, utdanning, ferdigheter, spr\u00e5k, sertifiseringer, sammendrag, referanser. Drag-and-drop, autolagring.',
      ua: 'Структурований CV editor з 9 розгортальними секціями: персональні дані, досвід, освіта, навички, мови, сертифікації, summary, рекомендації, додаткова інформація. Drag-and-drop, auto-save.',
    },
    problem: {
      en: 'AI extracted CV from PDF, but there\'s an error in work experience: wrong date, inaccurate position title. To fix it: open PDF editor, find section, edit, re-upload, re-parse. 20 minutes to change one date.',
      no: 'AI hentet CV fra PDF, men det er en feil i arbeidserfaring. For \u00e5 fikse: \u00e5pne PDF-editor, finne seksjon, redigere, laste opp p\u00e5 nytt. 20 minutter for \u00e5 endre \u00e9n dato.',
      ua: 'AI витягнув CV з PDF, але в досвіді помилка: wrong date. Для виправлення: PDF-редактор, знайти секцію, редагувати, re-upload, re-parse. 20 хвилин на зміну однієї дати.',
    },
    solution: {
      en: 'ProfileEditor.tsx — structured CV editor with 9 sections: Personal Info, Work Experience, Education, Skills, Languages, Certifications, Summary, References, Additional Info. Each section is an expandable card with add/edit/delete. Drag-and-drop for reordering. Auto-save on change. Data stored in JSONB structured_content, immediately available for form auto-filling and cover letter generation.',
      no: 'ProfileEditor.tsx \u2014 strukturert CV-editor med 9 seksjoner, hver som utvidbart kort med add/edit/delete. Drag-and-drop for omorganisering. Autolagring. Data lagret i JSONB, umiddelbart tilgjengelig for automatisk skjemautfylling.',
      ua: 'ProfileEditor.tsx — structured CV editor з 9 секціями. Кожна секція — expandable card з add/edit/delete. Drag-and-drop для reorder. Auto-save при зміні. Дані в JSONB structured_content, миттєво доступні для форм та s\u00f8knad.',
    },
    result: {
      en: 'Changing a date in work experience — 3 seconds, 2 clicks. Adding a new language — 5 seconds. All changes instantly available for forms and cover letters. Zero need to re-upload PDF.',
      no: 'Endre en dato i arbeidserfaring \u2014 3 sekunder, 2 klikk. Legge til nytt spr\u00e5k \u2014 5 sekunder. Alle endringer umiddelbart tilgjengelige. Null behov for ny PDF-opplasting.',
      ua: 'Зміна дати в досвіді — 3 секунди, 2 кліки. Нова мова — 5 секунд. Зміни миттєво доступні для форм та s\u00f8knad. Нуль потреби re-upload PDF.',
    },
    techStack: ['React 19', 'TypeScript', 'JSONB', 'Supabase', 'Tailwind CSS', 'Lucide icons'],
    hashtags: ['#CVEditor', '#StructuredData', '#ProfileManagement', '#JSONB', '#React', '#UX'],
  },

  {
    id: 'j29',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'Three languages — one button',
      no: 'Tre spr\u00e5k — \u00e9n knapp',
      ua: 'Три мови — одна кнопка',
    },
    shortDescription: {
      en: 'Full i18n with three languages (UK/NO/EN) where the choice is saved in the database, not localStorage. The entire system adapts: UI, AI analysis, Telegram messages. Language persists across devices.',
      no: 'Full i18n med tre spr\u00e5k (UK/NO/EN) der valget lagres i databasen, ikke localStorage. Hele systemet tilpasses: UI, AI-analyse, Telegram-meldinger. Spr\u00e5ket bevares p\u00e5 tvers av enheter.',
      ua: 'Повний i18n з трьома мовами (UK/NO/EN), де вибір зберігається в БД, а не localStorage. Вся система адаптується: UI, AI-аналіз, Telegram-повідомлення. Мова зберігається між пристроями.',
    },
    problem: {
      en: 'Platform users are Ukrainians in Norway. Some understand Norwegian, some only English, some want their native Ukrainian. A hardcoded interface language means 66% unsatisfied users. Language that resets on reload is even worse.',
      no: 'Plattformbrukere er ukrainere i Norge. Noen forst\u00e5r norsk, noen bare engelsk, noen vil ha ukrainsk. Hardkodet spr\u00e5k betyr 66% misforn\u00f8yde brukere.',
      ua: 'Користувачі — українці в Норвегії. Хтось розуміє норвезьку, хтось лише англійську, хтось хоче українську. Hardcoded мова = 66% незадоволених юзерів.',
    },
    solution: {
      en: 'services/translations.ts with three branches (en, no, uk), each with ~200 keys. LanguageContext.tsx loads preferred_analysis_language from user_settings on login and saves changes back to DB. Language switcher in sidebar with three flags. AI analysis (job-analyzer) receives a language parameter and generates pros/cons in the corresponding language. Telegram bot also adapts.',
      no: 'services/translations.ts med tre grener og ~200 n\u00f8kler. LanguageContext.tsx laster foretrukket spr\u00e5k fra user_settings og lagrer endringer i DB. Spr\u00e5kbytter i sidebar. AI-analyse mottar spr\u00e5kparameter. Telegram-bot tilpasser seg ogs\u00e5.',
      ua: 'services/translations.ts з трьома гілками та ~200 ключами. LanguageContext.tsx завантажує мову з user_settings при логіні та зберігає зміни в БД. Перемикач в sidebar. AI-аналіз отримує language parameter. Telegram-бот теж адаптується.',
    },
    result: {
      en: 'User chooses language once — the entire system adapts: UI, AI analysis, Telegram messages. Logging in from another device — language is already saved. Three languages cover 100% of the target audience.',
      no: 'Brukeren velger spr\u00e5k \u00e9n gang \u2014 hele systemet tilpasses: UI, AI-analyse, Telegram-meldinger. Innlogging fra annen enhet \u2014 spr\u00e5ket er allerede lagret. Tre spr\u00e5k dekker 100% av m\u00e5lgruppen.',
      ua: 'Юзер обирає мову раз — вся система адаптується: UI, AI-аналіз, Telegram. Логін з іншого пристрою — мова збережена. Три мови покривають 100% аудиторії.',
    },
    techStack: ['React Context', 'TypeScript', 'i18n', 'Supabase', 'Deno'],
    hashtags: ['#Internationalization', '#i18n', '#Ukrainian', '#Norwegian', '#MultiLanguage', '#UX'],
  },

  {
    id: 'j30',
    projectId: 'jobbot',
    category: 'frontend_ux',
    title: {
      en: 'New jobs appear on their own — no F5 needed',
      no: 'Nye jobber dukker opp av seg selv — ingen F5 n\u00f8dvendig',
      ua: 'Нові вакансії з\'являються самі — без F5',
    },
    shortDescription: {
      en: 'Supabase Realtime WebSocket subscription pushes new jobs to the dashboard instantly. INSERT adds to the feed, UPDATE refreshes scores, metric cards recalculate. Debounced for batch updates.',
      no: 'Supabase Realtime WebSocket-abonnement pusher nye jobber til dashboardet umiddelbart. INSERT legger til i feeden, UPDATE oppdaterer poengsummer, metrikkort beregnes p\u00e5 nytt. Debounced for masseoppateringer.',
      ua: 'Supabase Realtime WebSocket subscription пушить нові вакансії на Dashboard миттєво. INSERT додає в стрічку, UPDATE оновлює score, metric cards перераховуються. Debounce для batch updates.',
    },
    problem: {
      en: 'The user watches the Dashboard. A scheduled scanner finds 5 new jobs. But the Dashboard shows old data. The user presses F5, waits 3 seconds. Or doesn\'t — and misses a hot job with deadline "today."',
      no: 'Brukeren ser p\u00e5 Dashboard. En planlagt skanner finner 5 nye jobber. Men Dashboard viser gamle data. Brukeren trykker F5 og venter 3 sekunder. Eller ikke \u2014 og g\u00e5r glipp av en hot jobb.',
      ua: 'Юзер дивиться Dashboard. Scanner знаходить 5 нових вакансій. Dashboard показує старі дані. F5, 3 секунди. Або не натисне — і пропустить hot job з дедлайном "сьогодні."',
    },
    solution: {
      en: 'Supabase Realtime subscription on the jobs table filtered by user_id. On INSERT — new job added to state without re-fetch. On UPDATE (e.g., score appears after analysis) — specific row updated. Dashboard metric cards recalculate. 2-second debounce for batch updates. Notification badge on Sidebar shows count of new items since last view.',
      no: 'Supabase Realtime-abonnement p\u00e5 jobs-tabellen filtrert etter user_id. Ved INSERT legges ny jobb til uten re-fetch. Ved UPDATE oppdateres raden. 2-sekunders debounce for masseoppateringer. Varslingsbadge p\u00e5 Sidebar.',
      ua: 'Supabase Realtime subscription на таблицю jobs з фільтром по user_id. При INSERT — новий job додається без re-fetch. При UPDATE — оновлюється конкретний рядок. Debounce 2 секунди для batch updates. Notification badge на Sidebar.',
    },
    result: {
      en: 'New jobs appear in real time — like messages in a chat. The Dashboard is always current. Metric cards update automatically. Zero F5 presses needed.',
      no: 'Nye jobber dukker opp i sanntid \u2014 som meldinger i en chat. Dashboard er alltid oppdatert. Metrikkort oppdateres automatisk. Null F5-trykk n\u00f8dvendig.',
      ua: 'Нові вакансії з\'являються в реальному часі — як повідомлення в чаті. Dashboard завжди актуальний. Metric cards оновлюються автоматично. Жодного F5.',
    },
    techStack: ['Supabase Realtime', 'WebSocket', 'React useState', 'TypeScript'],
    hashtags: ['#RealTime', '#WebSocket', '#LiveUpdate', '#Supabase', '#React', '#NoRefresh'],
  },

  // ─── CATEGORY 6: Multi-user & Security (Cases 31-34) ─────────────────────────

  {
    id: 'j31',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Everyone sees only their own — Row Level Security',
      no: 'Alle ser bare sitt eget — Row Level Security',
      ua: 'Кожен бачить тільки своє — Row Level Security',
    },
    shortDescription: {
      en: 'RLS enabled on ALL tables with policies WHERE user_id = auth.uid(). Even a direct SQL query cannot bypass it. Data isolation tested: login as user B shows 0 jobs, 0 applications, $0 cost.',
      no: 'RLS aktivert p\u00e5 ALLE tabeller med policyer WHERE user_id = auth.uid(). Selv direkte SQL-sp\u00f8rringer kan ikke omg\u00e5 det. Dataisolering testet: innlogging som bruker B viser 0 jobber, 0 s\u00f8knader.',
      ua: 'RLS включено на ВСІХ таблицях з політиками WHERE user_id = auth.uid(). Навіть прямий SQL не обійде. Тест: логін як юзер Б — 0 jobs, 0 applications, $0 cost.',
    },
    problem: {
      en: 'The system became multi-user. User A and User B have jobs, cover letters, credentials. A SELECT without filter shows User A the cover letters of User B. And credentials are login passwords to recruiting sites. Leaking them is a catastrophe.',
      no: 'Systemet ble flerbruker. En SELECT uten filter viser bruker A s\u00f8knadene til bruker B. Og legitimasjoner er innloggingspassord til rekrutteringssider. Lekkasje er katastrofalt.',
      ua: 'Система стала multi-user. SELECT без фільтра — юзер А бачить s\u00f8knad юзера Б. А credentials — це логіни та паролі. Витік = катастрофа.',
    },
    solution: {
      en: 'RLS enabled on ALL tables: jobs, applications, cv_profiles, user_settings, site_credentials, site_form_memory, system_logs, export_history, registration_flows. Policies: SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid(). For Edge Functions with service role key (which bypasses RLS) — mandatory .eq("user_id", userId) in every query. Repair function fix-jobs-rls for post-migration fixes.',
      no: 'RLS aktivert p\u00e5 ALLE tabeller med SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid(). For Edge Functions med service role key \u2014 obligatorisk .eq("user_id", userId) i hver sp\u00f8rring. Reparasjonsfunksjon fix-jobs-rls.',
      ua: 'RLS включено на ВСІХ таблицях: jobs, applications, cv_profiles, site_credentials та інших. Політики: SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid(). Для Edge Functions з service role key — обов\'язковий .eq("user_id", userId). Edge Function fix-jobs-rls для ремонту.',
    },
    result: {
      en: 'Complete data isolation between users at the database level. Even a bug in application code won\'t cause a leak — RLS blocks it. Tested: login as user B shows 0 jobs, 0 applications, $0.00 cost.',
      no: 'Fullstendig dataisolering mellom brukere p\u00e5 databaseniv\u00e5. Selv en feil i applikasjonskoden for\u00e5rsaker ikke lekkasje. Testet: bruker B ser 0 jobber, $0,00 kostnad.',
      ua: 'Повна ізоляція даних між юзерами на рівні БД. Навіть баг в коді не призведе до витоку — RLS заблокує. Тест: логін як юзер Б — 0 jobs, 0 applications, $0.00.',
    },
    techStack: ['PostgreSQL RLS', 'Supabase', 'SQL policies', 'auth.uid()'],
    hashtags: ['#RowLevelSecurity', '#RLS', '#PostgreSQL', '#DataIsolation', '#Security', '#MultiUser'],
  },

  {
    id: 'j32',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'User_id everywhere — paranoid isolation',
      no: 'User_id overalt — paranoid isolering',
      ua: 'User_id скрізь — параноїдальна ізоляція',
    },
    shortDescription: {
      en: 'Edge Functions and Python workers use service role key that bypasses RLS. A complete audit ensures every query has a user_id filter — double isolation at both database and application layers.',
      no: 'Edge Functions og Python-workere bruker service role key som omg\u00e5r RLS. En komplett revisjon sikrer at hver sp\u00f8rring har user_id-filter \u2014 dobbel isolering p\u00e5 b\u00e5de database- og applikasjonsniv\u00e5.',
      ua: 'Edge Functions та Python workers використовують service role key, що bypass RLS. Повний аудит гарантує user_id фільтр у КОЖНОМУ запиті — подвійна ізоляція на рівні БД та application.',
    },
    problem: {
      en: 'RLS works for frontend queries (with JWT). But Edge Functions and Python workers use service role key — it bypasses RLS. One forgotten .eq("user_id", userId) = data leak. And there are hundreds of such queries across scheduled-scanner, job-analyzer, generate_application, auto_apply.py, api.ts.',
      no: 'RLS fungerer for frontend-sp\u00f8rringer (med JWT). Men Edge Functions og Python-workere bruker service role key som omg\u00e5r RLS. En glemt .eq("user_id", userId) = datalekkasje.',
      ua: 'RLS працює для frontend запитів (з JWT). Але Edge Functions та Python worker використовують service role key — він bypass RLS. Один забутий .eq("user_id", userId) = витік даних.',
    },
    solution: {
      en: 'Audit of ALL Supabase queries in the project. Every .from("table").select() verified for .eq("user_id", ...). In scheduled-scanner: loop for each user with auto_scan_enabled — all inner queries filtered by that user\'s ID. In telegram-bot: getUserIdFromChat(chatId) at the start of every handler. In auto_apply.py: user_id extracted from application record and passed to every subsequent query.',
      no: 'Revisjon av ALLE Supabase-sp\u00f8rringer. Hver .from("table").select() verifisert for .eq("user_id", ...). I telegram-bot: getUserIdFromChat() i starten av hver handler. I auto_apply.py: user_id fra application record.',
      ua: 'Аудит ВСІХ Supabase запитів. Кожен .from("table").select() перевірено на .eq("user_id", ...). В telegram-bot: getUserIdFromChat() на початку кожного handler. В auto_apply.py: user_id з application record в кожен запит.',
    },
    result: {
      en: 'Double isolation: RLS at PostgreSQL level + application-level user_id filter. Even if service role key is compromised, every query is restricted to a specific user_id. Zero data leak incidents.',
      no: 'Dobbel isolering: RLS p\u00e5 PostgreSQL-niv\u00e5 + applikasjonsniv\u00e5 user_id-filter. Null datalekkasjer.',
      ua: 'Подвійна ізоляція: RLS на рівні PostgreSQL + application-level user_id filter. Навіть при компрометації service role key — кожен запит обмежений user_id. Нуль витоків.',
    },
    techStack: ['Supabase', 'PostgreSQL', 'TypeScript', 'Python', 'Code audit'],
    hashtags: ['#MultiUser', '#DataIsolation', '#SecurityAudit', '#DefenseInDepth', '#UserID'],
  },

  {
    id: 'j33',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Passwords for 11 sites — secure and convenient',
      no: 'Passord for 11 sider — sikkert og praktisk',
      ua: 'Паролі до 11 сайтів — безпечно і зручно',
    },
    shortDescription: {
      en: 'Centralized credential management for 11+ recruiting sites with per-user RLS isolation, cryptographically secure password generation, and auto-selection by domain. Dashboard UI with masked passwords shown on click.',
      no: 'Sentralisert legitimasjonsh\u00e5ndtering for 11+ rekrutteringssider med RLS-isolering per bruker, kryptografisk sikker passordgenerering og automatisk valg etter domene. Dashboard-UI med maskerte passord.',
      ua: 'Централізоване управління credentials для 11+ рекрутингових сайтів з per-user RLS ізоляцією, криптографічно безпечна генерація паролів та автовибір за доменом. Dashboard UI з маскуванням паролів.',
    },
    problem: {
      en: 'Automation requires logins on Webcruiter, Easycruit, JobbNorge, Teamtailor, Recman, FINN, Jobylon, ReachMee, Varbi, HRManager, SuccessFactors. That\'s 11+ email/password pairs. Storing in .env doesn\'t scale for multi-user. Plain text storage is a security nightmare.',
      no: 'Automatisering krever innlogging p\u00e5 11+ plattformer. Lagring i .env skalerer ikke for flerbruker. Klartekstlagring er et sikkerhetsmareritt.',
      ua: 'Для автоматизації потрібні логіни на 11+ платформах. .env не масштабується для multi-user. Plain text — security nightmare.',
    },
    solution: {
      en: 'Table site_credentials with per-user RLS isolation. Worker checks credentials before each task: if they exist — login; if not — registration via register_site.py. Passwords generated by generate_secure_password(16): uppercase + lowercase + digit + special char. On login failure — bot asks for updated password via Telegram. Dashboard Settings page for viewing/editing credentials (password masked with dots, shown on click).',
      no: 'Tabell site_credentials med RLS-isolering per bruker. Worker sjekker legitimasjoner f\u00f8r oppgaver. Passord generert med generate_secure_password(16). Dashboard Settings for visning/redigering med maskerte passord.',
      ua: 'Таблиця site_credentials з per-user RLS. Worker перевіряє credentials перед задачею. Паролі генеруються generate_secure_password(16). Dashboard Settings для перегляду/редагування з маскуванням паролів.',
    },
    result: {
      en: 'Centralized management for 11+ sites with per-user isolation. Automatic secure password generation. Worker auto-selects the right credential per domain. Zero hardcoded passwords.',
      no: 'Sentralisert h\u00e5ndtering for 11+ sider med brukerisolering. Automatisk sikker passordgenerering. Null hardkodede passord.',
      ua: 'Централізоване управління для 11+ сайтів з per-user ізоляцією. Автоматична генерація secure passwords. Нуль хардкоду паролів.',
    },
    techStack: ['Supabase PostgreSQL', 'RLS', 'Python secrets', 'TypeScript', 'React'],
    hashtags: ['#CredentialManager', '#SecurityByDesign', '#PasswordGeneration', '#MultiUser', '#RLS'],
  },

  {
    id: 'j34',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Supabase SDK hangs — but we don\'t',
      no: 'Supabase SDK henger — men vi gj\u00f8r det ikke',
      ua: 'Supabase SDK зависає — а ми ні',
    },
    shortDescription: {
      en: 'Supabase auth SDK methods hang indefinitely due to a bug. A complete bypass reads sessions directly from localStorage, uses REST API with AbortController timeouts. Auth loads in 500ms instead of infinite spinner.',
      no: 'Supabase auth SDK-metoder henger p\u00e5 ubestemt tid p\u00e5 grunn av en feil. En komplett omg\u00e5else leser sesjoner direkte fra localStorage, bruker REST API med AbortController-timeouts. Auth laster p\u00e5 500ms.',
      ua: 'Supabase auth SDK методи зависають через баг. Повний обхід читає session з localStorage, використовує REST API з AbortController timeouts. Auth завантажується за 500ms замість вічного спінера.',
    },
    problem: {
      en: 'supabase.auth.getSession() hangs indefinitely. supabase.auth.signOut() also hangs. onAuthStateChange never fires. This is a Supabase JS SDK bug from an auth-js update. The user sees an infinite spinner instead of the Dashboard. Or cannot sign out.',
      no: 'supabase.auth.getSession() henger p\u00e5 ubestemt tid. signOut() henger ogs\u00e5. onAuthStateChange utl\u00f8ses aldri. En Supabase JS SDK-feil. Brukeren ser en uendelig spinner.',
      ua: 'supabase.auth.getSession() зависає. signOut() теж. onAuthStateChange не викликається. Баг Supabase JS SDK. Юзер бачить вічний спінер замість Dashboard.',
    },
    solution: {
      en: 'AuthContext.tsx — complete bypass of Supabase auth SDK. On mount: reads STORAGE_KEY from localStorage, parses JSON, extracts access_token and user. fetchWithTimeout(5000) — fetch wrapper with AbortController. fetchUserRoleDirect() — direct REST request to /rest/v1/user_settings. Sign out: localStorage.removeItem() + window.location.reload(). Sign in: direct POST to /auth/v1/token with 5-second timeout.',
      no: 'AuthContext.tsx \u2014 komplett omg\u00e5else av Supabase auth SDK. Leser session fra localStorage, bruker fetchWithTimeout(5000) med AbortController. Direkte REST-foresp\u00f8rsler for autentisering.',
      ua: 'AuthContext.tsx — повний обхід Supabase auth SDK. Читає session з localStorage, парсить JSON. fetchWithTimeout(5000) з AbortController. Прямі REST запити для автентифікації. Sign out через localStorage.removeItem().',
    },
    result: {
      en: 'Auth works stably with 500ms load time instead of infinite hang. Sign out is instant. Zero dependency on buggy SDK auth methods. The workaround has been running for 6+ months without issues.',
      no: 'Auth fungerer stabilt med 500ms lastetid. Utlogging er umiddelbar. Null avhengighet av buggy SDK. L\u00f8sningen har kj\u00f8rt i 6+ m\u00e5neder.',
      ua: 'Auth працює стабільно, 500ms замість вічного зависання. Sign out миттєвий. Нуль залежності від buggy SDK. Workaround працює 6+ місяців.',
    },
    techStack: ['React Context', 'localStorage', 'AbortController', 'REST API', 'TypeScript'],
    hashtags: ['#AuthWorkaround', '#SupabaseBug', '#localStorage', '#Timeout', '#Resilience', '#Frontend'],
  },

  // ─── CATEGORY 7: CI/CD & DevOps (Cases 35-37) ────────────────────────────────

  {
    id: 'j35',
    projectId: 'jobbot',
    category: 'devops_infra',
    title: {
      en: 'Push to main = Edge Functions updated',
      no: 'Push til main = Edge Functions oppdatert',
      ua: 'Push to main = Edge Functions оновлені',
    },
    shortDescription: {
      en: 'GitHub Actions auto-deploys all 14 Edge Functions on push to main. Three no-JWT functions deployed separately, the rest in a loop. Zero manual deploys, zero forgotten functions.',
      no: 'GitHub Actions auto-deployer alle 14 Edge Functions ved push til main. Tre no-JWT-funksjoner deployes separat, resten i en l\u00f8kke. Null manuelle deployer, null glemte funksjoner.',
      ua: 'GitHub Actions автоматично деплоїть всі 14 Edge Functions при push до main. Три no-JWT функції окремо, решта в циклі. Нуль ручних deploy, нуль забутих функцій.',
    },
    problem: {
      en: '14 Edge Functions. Manual deploy for each one. 3 functions need --no-verify-jwt, the rest need JWT. Forget to deploy one — production breaks. Forget --no-verify-jwt for telegram-bot — the webhook stops working. Human error waits around the corner.',
      no: '14 Edge Functions. Manuell deploy for hver. 3 funksjoner trenger --no-verify-jwt. Glem \u00e5 deploye \u00e9n \u2014 produksjon g\u00e5r ned. Menneskelig feil venter.',
      ua: '14 Edge Functions. Ручний deploy кожної. 3 функції потребують --no-verify-jwt. Забув задеплоїти одну — production ламається. Людська помилка чекає.',
    },
    solution: {
      en: 'GitHub Actions workflow deploy-supabase-functions.yml: triggers on push to main with path filter supabase/functions/** + manual workflow_dispatch. Steps: 1) Checkout. 2) Setup Supabase CLI. 3) Deploy telegram-bot, scheduled-scanner, finn-2fa-webhook with --no-verify-jwt. 4) Loop through all other functions (excluding _shared). Secret: SUPABASE_ACCESS_TOKEN.',
      no: 'GitHub Actions deploy-supabase-functions.yml: trigger ved push til main med stifilter + manuell workflow_dispatch. Deployer 3 no-JWT-funksjoner separat, resten i l\u00f8kke.',
      ua: 'GitHub Actions deploy-supabase-functions.yml: trigger на push до main з path filter + manual workflow_dispatch. 3 no-JWT функції окремо, решта в циклі. Secret: SUPABASE_ACCESS_TOKEN.',
    },
    result: {
      en: 'Git push — within 2 minutes all 14 Edge Functions are updated in production. Zero manual work. Zero forgotten deploys. JWT/no-JWT configuration is fixed in code, not in the developer\'s head.',
      no: 'Git push \u2014 innen 2 minutter er alle 14 Edge Functions oppdatert i produksjon. Null manuelt arbeid. Null glemte deployer.',
      ua: 'Git push — за 2 хвилини всі 14 Edge Functions оновлені в production. Нуль ручних дій. Нуль забутих deploy. JWT/no-JWT конфігурація в коді.',
    },
    techStack: ['GitHub Actions', 'Supabase CLI', 'YAML', 'CI/CD pipeline'],
    hashtags: ['#GitHubActions', '#AutoDeploy', '#EdgeFunctions', '#CICD', '#DevOps', '#Supabase'],
  },

  {
    id: 'j36',
    projectId: 'jobbot',
    category: 'devops_infra',
    title: {
      en: 'Each user — their own scan time',
      no: 'Hver bruker — sin egen skannetid',
      ua: 'Кожен юзер — свій час сканування',
    },
    shortDescription: {
      en: 'Instead of scanning all users simultaneously every hour, each user has a scan_time_utc setting. GitHub Actions cron runs hourly, and the Edge Function only scans users whose time matches the current UTC hour.',
      no: 'I stedet for \u00e5 skanne alle brukere samtidig hver time, har hver bruker en scan_time_utc-innstilling. GitHub Actions cron kj\u00f8rer hver time, og Edge Function skanner kun brukere med riktig tid.',
      ua: 'Замість одночасного сканування всіх юзерів щогодини, кожен має scan_time_utc. GitHub Actions cron запускається щогодини, Edge Function сканує лише юзерів, чий час збігається з поточною UTC-годиною.',
    },
    problem: {
      en: 'Scheduled scan ran with forceRun=true — all users scanned simultaneously every hour. User A wants a scan at 7:00 (before work), User B at 12:00 (lunch), User C at 18:00 (after work). Simultaneous scanning creates unnecessary load on FINN.no and triggers rate limiting.',
      no: 'Planlagt skanning kj\u00f8rte alle brukere samtidig hver time. Samtidig skanning skaper un\u00f8dvendig belastning p\u00e5 FINN.no og trigger hastighetsbegrensning.',
      ua: 'Scheduled scan з forceRun=true — всі юзери одночасно щогодини. Одночасний скан = непотрібне навантаження на FINN.no та rate limiting.',
    },
    solution: {
      en: 'scheduled-scan.yml: cron at "0 * * * *" (every hour). Calls scheduled-scanner Edge Function with forceRun=false. Inside the function: SELECT users with auto_scan_enabled=true, for each user check if scan_time_utc matches current UTC hour. Manual workflow_dispatch with force_run=true for debug scans all users. Logging: "Skipping user X: scan_time_utc=14, current_hour=09."',
      no: 'scheduled-scan.yml: cron "0 * * * *". Kaller scheduled-scanner med forceRun=false. Inne i funksjonen: sjekk om brukerens scan_time_utc stemmer med gjeldende UTC-time. Manuell workflow_dispatch med force_run=true for debug.',
      ua: 'scheduled-scan.yml: cron "0 * * * *". Виклик scheduled-scanner з forceRun=false. Всередині: для кожного юзера перевірка scan_time_utc == currentUTCHour. Manual workflow_dispatch з force_run=true для debug.',
    },
    result: {
      en: 'Each user is scanned at their chosen time. Load on FINN.no is distributed evenly throughout the day. Rate limiting does not trigger. Users get fresh jobs exactly when they\'re ready to review them.',
      no: 'Hver bruker skannes til valgt tid. Belastningen p\u00e5 FINN.no fordeles jevnt gjennom dagen. Hastighetsbegrensning utl\u00f8ses ikke.',
      ua: 'Кожен юзер сканується в свій час. Навантаження на FINN.no розподілене рівномірно. Rate limiting не спрацьовує. Свіжі вакансії саме тоді, коли юзер готовий.',
    },
    techStack: ['GitHub Actions cron', 'Deno Edge Functions', 'PostgreSQL', 'UTC timezone'],
    hashtags: ['#Cron', '#PerUserScheduling', '#DistributedLoad', '#GitHubActions', '#Automation'],
  },

  {
    id: 'j37',
    projectId: 'jobbot',
    category: 'devops_infra',
    title: {
      en: '60 minutes instead of 30 seconds — AI in GitHub Actions',
      no: '60 minutter i stedet for 30 sekunder — AI i GitHub Actions',
      ua: '60 хвилин замість 30 секунд — AI в GitHub Actions',
    },
    shortDescription: {
      en: 'Supabase Edge Functions have a 30-second timeout. Batch AI analysis of 10+ jobs exceeds this. An architectural split delegates scraping to Edge Functions and AI analysis to GitHub Actions workers with 60-minute timeout.',
      no: 'Supabase Edge Functions har 30-sekunders timeout. Batch AI-analyse av 10+ jobber overskrider dette. Et arkitektonisk splitt delegerer scraping til Edge Functions og AI-analyse til GitHub Actions-workere med 60-minutters timeout.',
      ua: 'Supabase Edge Functions мають 30-секундний timeout. Пакетний AI-аналіз 10+ вакансій перевищує ліміт. Архітектурний split: скрапінг в Edge Functions, AI-аналіз в GitHub Actions з 60-хвилинним timeout.',
    },
    problem: {
      en: 'Azure OpenAI analysis of one job takes ~3 seconds. 10 jobs = 30 seconds. But Supabase Edge Functions have a hard 30-second timeout. With 10+ new jobs, the function times out, leaving half unanalyzed.',
      no: 'Azure OpenAI-analyse av \u00e9n jobb tar ~3 sekunder. 10 jobber = 30 sekunder. Supabase Edge Functions har 30-sekunders timeout. Med 10+ nye jobber faller funksjonen ut.',
      ua: 'Azure OpenAI аналіз однієї вакансії — ~3 секунди. 10 вакансій — 30 секунд. Supabase Edge Function має 30-секундний timeout. При 10+ вакансіях функція падає.',
    },
    solution: {
      en: 'Architectural split: 1) scheduled-scanner Edge Function (30s) scrapes FINN/NAV/LinkedIn, saves to DB, extracts details. 2) Triggers analyze-jobs.yml via POST /repos/{owner}/{repo}/dispatches with GITHUB_PAT. 3) analyze-jobs.yml runs analyze_worker.py — Python script with Azure OpenAI that batch-analyzes jobs without time limits. 4) Telegram notification for hot jobs (score >= 50).',
      no: 'Arkitektonisk splitt: 1) Edge Function skraper og lagrer. 2) Trigger GitHub Actions via repository_dispatch. 3) Python-worker analyserer uten tidsbegrensning. 4) Telegram-varsling for hot jobs.',
      ua: 'Архітектурний split: 1) Edge Function скрапить і зберігає. 2) Trigger GitHub Actions через repository_dispatch. 3) Python worker аналізує без лімітів часу. 4) Telegram-нотифікація для hot jobs.',
    },
    result: {
      en: 'Edge Function never times out: scraping + saving = 10-15 seconds. AI analysis of 50+ jobs = 3 minutes in GitHub Actions without any limits. Scaling without architecture changes.',
      no: 'Edge Function timer aldri ut: scraping + lagring = 10-15 sekunder. AI-analyse av 50+ jobber = 3 minutter i GitHub Actions. Skalering uten arkitekturendringer.',
      ua: 'Edge Function ніколи не timeout: скрапінг + збереження = 10-15 секунд. AI-аналіз 50+ вакансій = 3 хвилини в GitHub Actions. Масштабування без зміни архітектури.',
    },
    techStack: ['GitHub Actions', 'repository_dispatch', 'Python', 'Azure OpenAI', 'Deno'],
    hashtags: ['#TimeoutWorkaround', '#GitHubActions', '#AsyncProcessing', '#Scalability', '#Architecture'],
  },

  // ─── CATEGORY 8: Platform Integrations (Cases 38-42) ──────────────────────────

  {
    id: 'j38',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Supabase — the entire backend in one platform',
      no: 'Supabase — hele backend i \u00e9n plattform',
      ua: 'Supabase — весь backend в одній платформі',
    },
    shortDescription: {
      en: 'One Supabase project covers everything: PostgreSQL with JSONB, Auth with JWT, 14 Edge Functions, Storage for PDFs, Realtime WebSocket, auto-generated REST API, and RLS. Monthly cost ~$25 vs ~$100+ for equivalent AWS stack.',
      no: 'Ett Supabase-prosjekt dekker alt: PostgreSQL med JSONB, Auth med JWT, 14 Edge Functions, Storage, Realtime WebSocket, auto-generert REST API og RLS. M\u00e5nedlig kostnad ~$25 vs ~$100+ for tilsvarende AWS.',
      ua: 'Один Supabase проект покриває ВСЕ: PostgreSQL з JSONB, Auth з JWT, 14 Edge Functions, Storage для PDF, Realtime WebSocket, авто-REST API та RLS. ~$25/міс замість ~$100+ за еквівалентний AWS.',
    },
    problem: {
      en: 'A typical project needs: database, authentication, serverless functions, file storage, real-time subscriptions, REST API, row-level security. That\'s 5+ different services: Firebase + Auth0 + AWS Lambda + S3 + Pusher. Configuration, billing, keys — exponential complexity.',
      no: 'Et typisk prosjekt trenger 5+ ulike tjenester. Konfigurasjon, fakturering, n\u00f8kler \u2014 eksponentiell kompleksitet.',
      ua: 'Типовий проект потребує 5+ різних сервісів: Firebase + Auth0 + AWS Lambda + S3 + Pusher. Конфігурація, billing, ключі — exponential complexity.',
    },
    solution: {
      en: 'One Supabase project covers everything: PostgreSQL with 10+ tables and JSONB fields, Auth with email/password and JWT, 14 Deno Edge Functions for scraping/AI/bot/webhooks, Storage for PDF uploads, Realtime for live dashboard updates, RLS for per-user data isolation, auto-generated REST API for direct queries from AuthContext. One URL and one service role key for all components.',
      no: 'Ett Supabase-prosjekt dekker alt: PostgreSQL, Auth, 14 Edge Functions, Storage, Realtime, RLS, auto-generert REST API. \u00c9n URL og \u00e9n service role key for alle komponenter.',
      ua: 'Один Supabase проект покриває ВСЕ: PostgreSQL з JSONB, Auth з JWT, 14 Edge Functions, Storage для PDF, Realtime, RLS, авто-REST API. Один URL та один service role key.',
    },
    result: {
      en: 'Zero DevOps overhead: no servers to manage, no Docker for the database. From idea to production in one supabase init. Monthly cost: ~$25 (Pro plan) instead of ~$100+ for equivalent AWS stack.',
      no: 'Null DevOps-overhead: ingen servere, ingen Docker for database. Fra id\u00e9 til produksjon med \u00e9n supabase init. M\u00e5nedlig kostnad: ~$25 i stedet for ~$100+.',
      ua: 'Zero DevOps overhead: жодного сервера, жодного Docker. Від ідеї до production — один supabase init. ~$25/міс замість ~$100+ для AWS.',
    },
    techStack: ['Supabase', 'PostgreSQL', 'Deno', 'Auth', 'Storage', 'Realtime', 'RLS'],
    hashtags: ['#Supabase', '#FullStack', '#BaaS', '#PostgreSQL', '#ServerlessBackend', '#OneStopShop'],
  },

  {
    id: 'j39',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Every AI call — CC\'d to accounting',
      no: 'Hvert AI-kall — kopi til regnskapet',
      ua: 'Кожен AI-виклик — в copy до бухгалтерії',
    },
    shortDescription: {
      en: 'Real-time token cost tracking for every Azure OpenAI call. Dashboard shows current spend, system_logs has detailed breakdown. Average weekly cost: $2-5 for an active user analyzing 200 jobs + 30 cover letters.',
      no: 'Sanntids tokenkostnadssporing for hvert Azure OpenAI-kall. Dashboard viser gjeldende forbruk. Gjennomsnittlig ukentlig kostnad: $2-5 for en aktiv bruker som analyserer 200 jobber + 30 s\u00f8knader.',
      ua: 'Real-time tracking вартості токенів для кожного Azure OpenAI виклику. Dashboard показує поточні витрати, system_logs — детальний breakdown. Середні витрати: $2-5/тиждень на 200 вакансій + 30 s\u00f8knad.',
    },
    problem: {
      en: 'Azure OpenAI GPT-4 is not free. Input: $2.50/1M tokens, Output: $10.00/1M tokens. Analyzing 200 jobs per week + generating 30 cover letters means unpredictable bills. Users don\'t know how much they\'ve spent until billing arrives.',
      no: 'Azure OpenAI GPT-4 er ikke gratis. \u00c5 analysere 200 jobber + generere 30 s\u00f8knader betyr uforutsigbare regninger. Brukere vet ikke forbruket f\u00f8r regningen kommer.',
      ua: 'Azure OpenAI GPT-4 не безкоштовний. Input: $2.50/1M tokens, Output: $10.00/1M tokens. 200 вакансій + 30 s\u00f8knad на тиждень — непередбачуваний рахунок.',
    },
    solution: {
      en: 'In job-analyzer and generate_application: after each Azure OpenAI call, extract usage.prompt_tokens and usage.completion_tokens from the response. Formula: cost = (prompt_tokens * PRICE_INPUT + completion_tokens * PRICE_OUTPUT) / 1_000_000. Write to system_logs: user_id, event_type: "ai_cost", cost_usd, tokens, model, function_name. Dashboard MetricCard "AI Cost" shows SUM for the period. Admin page shows total cost per user.',
      no: 'I job-analyzer og generate_application: etter hvert kall, beregn kostnad fra usage-tokens. Skriv til system_logs. Dashboard MetricCard "AI Cost" viser SUM for perioden. Admin-side viser kostnad per bruker.',
      ua: 'В job-analyzer та generate_application: після кожного виклику — витягуємо usage.prompt_tokens і completion_tokens. Формула: cost = tokens * price / 1M. Запис в system_logs. Dashboard MetricCard "AI Cost" показує SUM. Admin — cost per user.',
    },
    result: {
      en: 'Full cost transparency: users see cost in real time on Dashboard. Admin sees cost per user. Average weekly cost: $2-5 for an active user (200 jobs + 30 cover letters).',
      no: 'Full kostnads\u00e5penhet: brukere ser kostnad i sanntid. Admin ser kostnad per bruker. Gjennomsnittlig ukentlig kostnad: $2-5.',
      ua: 'Повна прозорість витрат: юзер бачить cost в реальному часі. Admin — cost per user. Середній тижневий cost: $2-5 для активного юзера.',
    },
    techStack: ['Azure OpenAI', 'Token counting', 'Supabase system_logs', 'React MetricCard'],
    hashtags: ['#CostTracking', '#AzureOpenAI', '#TokenUsage', '#Billing', '#Transparency', '#FinOps'],
  },

  {
    id: 'j40',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'One file patch — and drag-and-drop works',
      no: '\u00c9n filoppdatering — og drag-and-drop fungerer',
      ua: 'Патч одного файлу — і drag-and-drop працює',
    },
    shortDescription: {
      en: 'Skyvern Docker cannot do drag-and-drop file upload. A patched handler.py with DataTransfer injection instead of mouse events, mounted via docker-compose volume, unblocks all drop-zone recruiting platforms.',
      no: 'Skyvern Docker kan ikke gj\u00f8re drag-and-drop-filopplasting. En patchet handler.py med DataTransfer-injeksjon, montert via docker-compose volume, l\u00e5ser opp alle drop-zone-rekrutteringsplattformer.',
      ua: 'Skyvern Docker не вміє drag-and-drop file upload. Патч handler.py з DataTransfer injection замість mouse events через docker-compose volume розблоковує всі drop-zone платформи.',
    },
    problem: {
      en: 'Skyvern Docker cannot do drag-and-drop file upload. Webcruiter and other platforms have a drop zone: "Drag your file here." Skyvern sees the drop zone, tries to drag — nothing happens. DataTransfer API in headless Chrome works differently than in a regular browser.',
      no: 'Skyvern Docker kan ikke gj\u00f8re drag-and-drop-filopplasting. DataTransfer API i headless Chrome fungerer annerledes enn i en vanlig nettleser.',
      ua: 'Skyvern Docker не вміє drag-and-drop file upload. DataTransfer API в headless Chrome працює інакше. Drop zone платформ не працюють з автоматизацією.',
    },
    solution: {
      en: 'Created handler_patched.py based on Skyvern\'s handler.py. In the upload_file section: instead of mouse drag events, implemented DataTransfer drop fallback: 1) Create DataTransfer object via JavaScript. 2) Inject file blob via dt.items.add(file). 3) Dispatch "drop" event on target element. 4) Fallback to input[type=file].click(). Docker-compose mount: ./handler_patched.py:/app/skyvern/webeye/actions/handler.py. Skyvern .env: BROWSER_LOCALE=nb-NO.',
      no: 'Opprettet handler_patched.py med DataTransfer drop-fallback i stedet for mus-drag-hendelser. Docker-compose volume mount overskriver original handler. Skyvern .env: BROWSER_LOCALE=nb-NO.',
      ua: 'Створено handler_patched.py з DataTransfer drop fallback замість mouse drag events. Docker-compose mount перезаписує оригінальний handler. Skyvern .env: BROWSER_LOCALE=nb-NO.',
    },
    result: {
      en: 'File upload on Webcruiter, Easycruit, and other drag-and-drop platforms works on the first attempt. One patched file unblocked an entire category of sites. Skyvern updates don\'t overwrite the patch (volume mount has priority).',
      no: 'Filopplasting p\u00e5 Webcruiter og andre drag-and-drop-plattformer fungerer p\u00e5 f\u00f8rste fors\u00f8k. Skyvern-oppdateringer overskriver ikke patchen (volume mount har prioritet).',
      ua: 'File upload на Webcruiter та інших drag-and-drop платформах працює з першої спроби. Один патч розблокував цілу категорію сайтів. Оновлення Skyvern не перезатирає патч.',
    },
    techStack: ['Docker compose', 'Volume mount', 'JavaScript DataTransfer API', 'Python'],
    hashtags: ['#DockerPatch', '#DragAndDrop', '#Skyvern', '#FileUpload', '#OpenSource', '#Workaround'],
  },

  {
    id: 'j41',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Push = Production in 15 seconds',
      no: 'Push = Produksjon p\u00e5 15 sekunder',
      ua: 'Push = Production за 15 секунд',
    },
    shortDescription: {
      en: 'Netlify auto-deploy from GitHub: push to main triggers a 15-second Vite build and 5-second CDN deploy. Preview URLs for every PR. Rollback with one click. Zero downtime.',
      no: 'Netlify auto-deploy fra GitHub: push til main utl\u00f8ser 15-sekunders Vite-bygging og 5-sekunders CDN-deploy. Forh\u00e5ndsvisnings-URLer for hver PR. Tilbakeruling med ett klikk. Null nedetid.',
      ua: 'Netlify auto-deploy з GitHub: push до main запускає 15-секундний Vite build та 5-секундний CDN deploy. Preview URL для кожного PR. Rollback одним кліком. Zero downtime.',
    },
    problem: {
      en: 'Frontend development loop: changes, commit, push, manual deploy, 5-minute wait, production testing. Each iteration takes 7-10 minutes. With 20 deploys per day, that\'s 3+ hours of "waiting." Users see the old version until you deploy.',
      no: 'Frontend-utviklingsl\u00f8kke: endringer, commit, push, manuell deploy, 5 minutters venting. Hver iterasjon tar 7-10 minutter. Med 20 deployer per dag er det 3+ timer "venting."',
      ua: 'Frontend development loop: зміни, commit, push, manual deploy, 5 хвилин очікування. Кожна ітерація — 7-10 хвилин. При 20 deploy на день — 3+ години "чекання."',
    },
    solution: {
      en: 'Netlify project connected to GitHub repo. Configuration: branch main, build command npm run build, publish directory dist/. Auto-deploy on push. Preview deploys for pull requests with unique URLs. Vite production build: tree-shaking, minification, code splitting. Output: static bundle ~500KB gzipped.',
      no: 'Netlify-prosjekt koblet til GitHub-repo. Auto-deploy ved push. Forh\u00e5ndsvisningsdeploy for pull requests. Vite produksjonsbygging: tree-shaking, minifisering. Output: ~500KB gzipped.',
      ua: 'Netlify підключено до GitHub repo. Auto-deploy on push. Preview deploys для PR. Vite production build: tree-shaking, minification, code splitting. Output: ~500KB gzipped.',
    },
    result: {
      en: 'Git push — 15-second build — 5-second deploy — production updated. Preview URL for every PR for testing without merging. Rollback with one click. Zero downtime.',
      no: 'Git push \u2014 15 sekunders bygging \u2014 5 sekunders deploy \u2014 produksjon oppdatert. Forh\u00e5ndsvisnings-URL for hver PR. Tilbakeruling med ett klikk. Null nedetid.',
      ua: 'Git push — 15 секунд build — 5 секунд deploy — production оновлено. Preview URL для кожного PR. Rollback одним кліком. Zero downtime.',
    },
    techStack: ['Netlify', 'Vite', 'React', 'GitHub integration', 'CDN'],
    hashtags: ['#Netlify', '#AutoDeploy', '#CICD', '#ZeroDowntime', '#StaticHosting', '#Frontend'],
  },

  {
    id: 'j42',
    projectId: 'jobbot',
    category: 'other',
    title: {
      en: 'Free AI — Gemini analyzes errors',
      no: 'Gratis AI — Gemini analyserer feil',
      ua: 'Безкоштовний AI — Gemini аналізує помилки',
    },
    shortDescription: {
      en: 'Google Gemini 2.5 Flash with its generous free tier (1500 RPD, 1M TPM) handles 200+ monthly skill guide generations at zero cost. Azure OpenAI is reserved for critical tasks only, cutting auxiliary AI costs to $0.',
      no: 'Google Gemini 2.5 Flash med sitt generose gratistilbud (1500 RPD, 1M TPM) h\u00e5ndterer 200+ m\u00e5nedlige skill guide-genereringer uten kostnad. Azure OpenAI reserveres kun for kritiske oppgaver.',
      ua: 'Google Gemini 2.5 Flash з щедрим безкоштовним tier (1500 RPD, 1M TPM) обробляє 200+ генерацій skill guides на місяць безкоштовно. Azure OpenAI лише для критичних задач — допоміжні AI-витрати $0.',
    },
    problem: {
      en: 'Azure OpenAI GPT-4 costs $2.50/1M input tokens. Generating skill guides after each Skyvern attempt adds 200+ AI calls per month. Small cost, but why pay for a task that a free AI can handle?',
      no: 'Azure OpenAI GPT-4 koster $2,50/1M input-tokens. Skill guide-generering etter hvert Skyvern-fors\u00f8k legger til 200+ AI-kall per m\u00e5ned. Hvorfor betale for det en gratis AI kan gj\u00f8re?',
      ua: 'Azure OpenAI GPT-4 коштує $2.50/1M input tokens. Генерація skill guides після кожної Skyvern спроби — 200+ додаткових AI-викликів на місяць. Навіщо платити, якщо є безкоштовний AI?',
    },
    solution: {
      en: 'generate_skill_from_memory() in auto_apply.py uses Gemini 2.5 Flash via REST API. Prompt: "You are a web automation expert. Analyze the form-filling attempt and generate a SKILL GUIDE for future attempts." Input: site domain, outcome, form fields (filled/failed), navigation flow, upload methods. Output: concise text guide (200-400 words). Stored in site_form_memory.skill_guide. Injected into navigation goals via build_memory_section().',
      no: 'generate_skill_from_memory() i auto_apply.py bruker Gemini 2.5 Flash via REST API. Input: nettstedsdomene, resultat, skjemafelt, navigasjonsflyt. Output: kortfattet tekstguide. Lagret i site_form_memory.skill_guide.',
      ua: 'generate_skill_from_memory() в auto_apply.py використовує Gemini 2.5 Flash через REST API. Input: домен, результат, form fields, navigation flow. Output: стислий текстовий guide. Зберігається в site_form_memory.skill_guide. Вставляється через build_memory_section().',
    },
    result: {
      en: '200+ AI calls per month — free. Skill guides improve success rate by 15-20%. Azure OpenAI is used only for critical tasks (job analysis, cover letter generation). Gemini handles auxiliary work.',
      no: '200+ AI-kall per m\u00e5ned \u2014 gratis. Skill guides forbedrer suksessraten med 15-20%. Azure OpenAI brukes kun for kritiske oppgaver. Gemini h\u00e5ndterer hjelpefunksjoner.',
      ua: '200+ AI-викликів на місяць — безкоштовно. Skill guides покращують success rate на 15-20%. Azure OpenAI тільки для критичних задач. Gemini — для допоміжних.',
    },
    techStack: ['Google Gemini 2.5 Flash', 'REST API', 'Python', 'Free tier AI'],
    hashtags: ['#Gemini', '#FreeTier', '#SkillGeneration', '#CostOptimization', '#AIAgent', '#GoogleAI'],
  },
];
