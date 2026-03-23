import { Feature } from './features';

export const portfolioFeatures: Feature[] = [
  // ─── CATEGORY 1: AI & Content Automation ───────────────────────────────────

  {
    id: 'p01',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'AI Pre-Moderation — killing spam before it reaches my eyes',
      no: 'AI-forhåndsmoderering — dreper spam før det når øynene mine',
      ua: 'AI-премодерація — вбиває спам ще до того, як я його побачу',
    },
    shortDescription: {
      en: '6 Telegram channels + RSS feeds pump 50-80 articles per day. 70% is spam. AI filters the noise so I only review what matters.',
      no: '6 Telegram-kanaler + RSS-feeder pumper 50-80 artikler daglig. 70% er spam. AI filtrerer støyen slik at jeg bare ser det som betyr noe.',
      ua: '6 Telegram-каналів + RSS-стрічки качають 50-80 статей на день. 70% — спам. AI фільтрує шум, і я бачу лише те, що варте уваги.',
    },
    problem: {
      en: '6 Telegram channels + RSS feeds pump 50-80 articles per day. 70% is spam, ads, or irrelevant noise. Manual review was eating 2+ hours daily.',
      no: '6 Telegram-kanaler + RSS-feeder pumper 50-80 artikler per dag. 70% er spam, annonser eller irrelevant støy. Manuell gjennomgang tok over 2 timer daglig.',
      ua: '6 Telegram-каналів + RSS-стрічки качають 50-80 статей на день. 70% — спам, реклама або нерелевантний шум. Ручний перегляд забирав 2+ години щодня.',
    },
    solution: {
      en: 'Every scraped article hits an Azure OpenAI function (Jobbot-gpt-4.1-mini) with a custom prompt from the database. The prompt is editable through the admin panel — no redeploy needed. AI returns: approve, reject, or flag for review. Rejected articles never reach the Telegram bot.',
      no: 'Hver skrapet artikkel treffer en Azure OpenAI-funksjon (Jobbot-gpt-4.1-mini) med en tilpasset prompt fra databasen. Prompten kan redigeres via adminpanelet — ingen ny deploy nødvendig. AI returnerer: godkjenn, avvis eller flagg for gjennomgang. Avviste artikler når aldri Telegram-boten.',
      ua: 'Кожна зіскрейпена стаття потрапляє в Azure OpenAI функцію (Jobbot-gpt-4.1-mini) з кастомним промптом із бази даних. Промпт редагується через адмінку — без редеплою. AI повертає: схвалити, відхилити або позначити для перегляду. Відхилені статті ніколи не потрапляють до Telegram-бота.',
    },
    result: {
      en: 'Review time dropped from 2 hours to 15 minutes. 1,234 commits later, the pre-moderation prompt has been refined 12+ times through the admin panel — each iteration learned from false positives.',
      no: 'Gjennomgangstid falt fra 2 timer til 15 minutter. 1234 commits senere er forhåndsmodereringsprompten finjustert 12+ ganger via adminpanelet — hver iterasjon lærte av falske positiver.',
      ua: 'Час перегляду впав із 2 годин до 15 хвилин. Через 1234 комміти промпт премодерації був вдосконалений 12+ разів через адмінку — кожна ітерація вчилася на хибних спрацюваннях.',
    },
    techStack: ['Azure OpenAI', 'Supabase', 'Deno', 'Telegram Bot API'],
    hashtags: ['#AI', '#ContentModeration', '#Automation', '#AzureOpenAI', '#Supabase'],
  },

  {
    id: 'p02',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'AI Content Rewriting — one article, three languages, zero translators',
      no: 'AI-innholdsomskriving — én artikkel, tre språk, null oversettere',
      ua: 'AI-рерайт контенту — одна стаття, три мови, нуль перекладачів',
    },
    shortDescription: {
      en: 'Norway-based portfolio targeting three audiences. Every article needs EN, NO, and UA versions. AI rewrites — not just translates — adapting tone for each audience.',
      no: 'Norgesbasert portefølje rettet mot tre målgrupper. Hver artikkel trenger EN-, NO- og UA-versjoner. AI omskriver — ikke bare oversetter — og tilpasser tonen for hvert publikum.',
      ua: 'Портфоліо з Норвегії для трьох аудиторій. Кожна стаття потребує версії EN, NO та UA. AI переписує — а не просто перекладає — адаптуючи тон для кожної аудиторії.',
    },
    problem: {
      en: 'Norway-based portfolio targeting three audiences: Norwegian locals, Ukrainian diaspora, international tech community. Every article needs to exist in EN, NO, and UA. Hiring translators for 5-10 articles per day? Unrealistic.',
      no: 'Norgesbasert portefølje rettet mot tre målgrupper: norske lokale, ukrainsk diaspora, internasjonalt teknologisamfunn. Hver artikkel må eksistere på EN, NO og UA. Å ansette oversettere for 5-10 artikler daglig? Urealistisk.',
      ua: 'Портфоліо з Норвегії для трьох аудиторій: норвежці, українська діаспора, міжнародна техспільнота. Кожна стаття має існувати EN, NO та UA. Наймати перекладачів для 5-10 статей на день? Нереально.',
    },
    solution: {
      en: 'The process-news Edge Function takes the original article and rewrites it three times using Azure OpenAI. Each language has its own prompt template (editable via admin panel). The AI preserves facts but adjusts style: formal for NO, conversational for UA, SEO-friendly for EN. All three versions share the same slug structure for cross-language linking.',
      no: 'Edge Function process-news tar den originale artikkelen og omskriver den tre ganger med Azure OpenAI. Hvert språk har sin egen promptmal (redigerbar via adminpanelet). AI bevarer fakta men tilpasser stil: formell for NO, uformell for UA, SEO-vennlig for EN. Alle tre versjoner deler samme slug-struktur for kryssspråklig lenking.',
      ua: 'Edge Function process-news бере оригінальну статтю і переписує її тричі через Azure OpenAI. Кожна мова має власний шаблон промпту (редагується через адмінку). AI зберігає факти, але адаптує стиль: формальний для NO, розмовний для UA, SEO-оптимізований для EN. Усі три версії мають спільну slug-структуру для міжмовної навігації.',
    },
    result: {
      en: '3x content output with zero translation cost. The Ukrainian audience gets articles that feel native, not machine-translated. SEO benefits from unique content per language (not just translated meta tags).',
      no: '3x innholdsproduksjon uten oversettelseskostnader. Det ukrainske publikummet får artikler som føles naturlige, ikke maskinoversatte. SEO drar nytte av unikt innhold per språk (ikke bare oversatte meta-tagger).',
      ua: '3x контенту без витрат на переклад. Українська аудиторія отримує статті, що звучать природно, а не машинно. SEO виграє від унікального контенту на кожній мові (а не просто перекладених мета-тегів).',
    },
    techStack: ['Azure OpenAI', 'Supabase Edge Functions', 'Deno', 'Next.js'],
    hashtags: ['#AI', '#Translation', '#Multilingual', '#ContentPipeline', '#NLP'],
  },

  {
    id: 'p03',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'Two-Stage AI Image Prompt System — because "generate an image for this article" never works',
      no: 'To-trinns AI-bildepromptsystem — fordi "generer et bilde for denne artikkelen" aldri fungerer',
      ua: 'Двоетапна AI-система промптів для зображень — бо "згенеруй картинку для цієї статті" ніколи не працює',
    },
    shortDescription: {
      en: 'Generic AI image prompts produce unusable results. A two-stage classifier + template system extracts structured data first, then fills proven visual templates.',
      no: 'Generiske AI-bildeprompter gir ubrukelige resultater. Et to-trinns klassifiserings- og malsystem trekker ut strukturerte data først, og fyller deretter utprøvde visuelle maler.',
      ua: 'Загальні AI-промпти для зображень дають непридатні результати. Двоетапна система класифікатор + шаблон спочатку витягує структуровані дані, а потім заповнює перевірені візуальні шаблони.',
    },
    problem: {
      en: 'Giving an AI a full article and saying "make an image" produces generic, unusable results. Every image looked like a stock photo from 2015.',
      no: 'Å gi en AI en hel artikkel og si "lag et bilde" gir generiske, ubrukelige resultater. Hvert bilde så ut som et arkivfoto fra 2015.',
      ua: 'Давати AI повну статтю і казати "зроби картинку" дає загальні, непридатні результати. Кожне зображення виглядало як стокове фото з 2015 року.',
    },
    solution: {
      en: 'Stage 1 (Classifier) uses Azure OpenAI to extract JSON: {company, category, visual_concept, color_scheme}. Seven categories: tech_product, marketing_campaign, ai_research, business_news, science, lifestyle, general. Stage 2 selects a template by category and fills {placeholder} values. Both prompts live in the ai_prompts table — editable without code changes.',
      no: 'Trinn 1 (Klassifiserer) bruker Azure OpenAI for å trekke ut JSON: {company, category, visual_concept, color_scheme}. Syv kategorier: tech_product, marketing_campaign, ai_research, business_news, science, lifestyle, general. Trinn 2 velger en mal etter kategori og fyller {placeholder}-verdier. Begge promptene ligger i ai_prompts-tabellen — redigerbare uten kodeendringer.',
      ua: 'Етап 1 (Класифікатор) використовує Azure OpenAI для витягування JSON: {company, category, visual_concept, color_scheme}. Сім категорій: tech_product, marketing_campaign, ai_research, business_news, science, lifestyle, general. Етап 2 обирає шаблон за категорією і заповнює значення {placeholder}. Обидва промпти живуть у таблиці ai_prompts — редагуються без змін коду.',
    },
    result: {
      en: 'Image relevance jumped from ~30% to ~85%. The two-stage approach means I can improve classification and aesthetics independently. When a new visual trend emerges, I update one template — all future images follow.',
      no: 'Bilderelevans økte fra ~30% til ~85%. To-trinns-tilnærmingen gjør at jeg kan forbedre klassifisering og estetikk uavhengig. Når en ny visuell trend dukker opp, oppdaterer jeg én mal — alle fremtidige bilder følger etter.',
      ua: 'Релевантність зображень зросла з ~30% до ~85%. Двоетапний підхід дозволяє покращувати класифікацію та естетику незалежно. Коли з\'являється новий візуальний тренд, я оновлюю один шаблон — усі майбутні зображення слідують за ним.',
    },
    techStack: ['Azure OpenAI', 'Supabase', 'Deno'],
    hashtags: ['#AI', '#ImageGeneration', '#PromptEngineering', '#TwoStage', '#Classification'],
  },

  {
    id: 'p04',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'AI Social Teasers — every platform speaks its own language',
      no: 'AI-sosiale teasere — hver plattform snakker sitt eget språk',
      ua: 'AI-тизери для соцмереж — кожна платформа говорить своєю мовою',
    },
    shortDescription: {
      en: 'Posting the same text on LinkedIn, Instagram, and Facebook kills engagement. AI generates 9 platform-specific teasers (3 platforms x 3 languages) per article.',
      no: 'Å poste samme tekst på LinkedIn, Instagram og Facebook dreper engasjement. AI genererer 9 plattformspesifikke teasere (3 plattformer x 3 språk) per artikkel.',
      ua: 'Постити однаковий текст у LinkedIn, Instagram і Facebook вбиває залученість. AI генерує 9 платформо-специфічних тизерів (3 платформи x 3 мови) на статтю.',
    },
    problem: {
      en: 'Posting the same text on LinkedIn, Instagram, and Facebook is a recipe for low engagement. LinkedIn wants professional insights. Instagram wants short hooks. Facebook wants conversation starters. Writing 3 versions manually for each article in 3 languages = 9 texts per article.',
      no: 'Å poste samme tekst på LinkedIn, Instagram og Facebook gir lavt engasjement. LinkedIn ønsker profesjonelle innsikter. Instagram ønsker korte kroker. Facebook ønsker samtalestartere. Å skrive 3 versjoner manuelt for hver artikkel på 3 språk = 9 tekster per artikkel.',
      ua: 'Постити однаковий текст у LinkedIn, Instagram і Facebook — рецепт низької залученості. LinkedIn хоче професійні інсайти. Instagram хоче короткі хуки. Facebook хоче стартери для дискусій. Писати 3 версії вручну для кожної статті на 3 мовах = 9 текстів на статтю.',
    },
    solution: {
      en: 'Edge Function generate-social-teasers creates 9 variants (3 platforms x 3 languages) per article. Results are cached in the database (social_teaser_{platform}_{lang}). First click generates, subsequent clicks use cache. Each platform\'s prompt is independently editable.',
      no: 'Edge Function generate-social-teasers lager 9 varianter (3 plattformer x 3 språk) per artikkel. Resultatene caches i databasen (social_teaser_{platform}_{lang}). Første klikk genererer, påfølgende klikk bruker cache. Hver plattforms prompt kan redigeres uavhengig.',
      ua: 'Edge Function generate-social-teasers створює 9 варіантів (3 платформи x 3 мови) на статтю. Результати кешуються в базі даних (social_teaser_{platform}_{lang}). Перший клік генерує, наступні використовують кеш. Промпт кожної платформи редагується незалежно.',
    },
    result: {
      en: 'Engagement increased noticeably after switching from copy-paste to tailored teasers. The cache means generation happens once — no API costs on repeated views.',
      no: 'Engasjement økte merkbart etter overgang fra kopier-lim til skreddersydde teasere. Caching betyr at generering skjer én gang — ingen API-kostnader ved gjentatte visninger.',
      ua: 'Залученість помітно зросла після переходу від копіпасти до адаптованих тизерів. Кешування означає, що генерація відбувається один раз — жодних витрат на API при повторних переглядах.',
    },
    techStack: ['Azure OpenAI', 'Supabase Edge Functions', 'Deno'],
    hashtags: ['#AI', '#SocialMedia', '#ContentGeneration', '#Engagement', '#Multilingual'],
  },

  {
    id: 'p05',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'AI Comment Replies — sentiment-aware, never robotic',
      no: 'AI-kommentarsvar — stemningsbevisste, aldri robotaktige',
      ua: 'AI-відповіді на коментарі — з розумінням тональності, ніколи не роботизовані',
    },
    shortDescription: {
      en: 'Social media comments need timely responses. AI generates suggested replies based on article context and comment sentiment, but human always reviews before sending.',
      no: 'Kommentarer på sosiale medier trenger raske svar. AI genererer foreslåtte svar basert på artikkelkontekst og kommentarstemning, men mennesket gjennomgår alltid før sending.',
      ua: 'Коментарі в соцмережах потребують швидких відповідей. AI генерує пропоновані відповіді на основі контексту статті та тональності коментаря, але людина завжди перевіряє перед відправкою.',
    },
    problem: {
      en: 'Social media comments need timely responses. But writing thoughtful replies to 20+ comments across 3 platforms daily is a time sink. Ignoring comments kills algorithm reach.',
      no: 'Kommentarer på sosiale medier trenger rettidige svar. Men å skrive gjennomtenkte svar på 20+ kommentarer på tvers av 3 plattformer daglig er tidkrevende. Å ignorere kommentarer dreper algoritmerekkevidden.',
      ua: 'Коментарі в соцмережах потребують своєчасних відповідей. Але писати вдумливі відповіді на 20+ коментарів на 3 платформах щодня — це поглинач часу. Ігнорування коментарів вбиває охоплення алгоритмів.',
    },
    solution: {
      en: 'sync-comments fetches new comments from Facebook and Instagram every 30 minutes. Each comment gets sentiment analysis (-1 to +1 score). generate-comment-reply creates a contextual reply suggestion. The comments bot sends it to Telegram with buttons: Reply, Edit, Ignore. One tap to send, or edit first.',
      no: 'sync-comments henter nye kommentarer fra Facebook og Instagram hvert 30. minutt. Hver kommentar får sentimentanalyse (-1 til +1). generate-comment-reply lager et kontekstuelt svarforslag. Kommentarboten sender det til Telegram med knapper: Svar, Rediger, Ignorer. Ett trykk for å sende, eller rediger først.',
      ua: 'sync-comments забирає нові коментарі з Facebook та Instagram кожні 30 хвилин. Кожен коментар отримує аналіз тональності (-1 до +1). generate-comment-reply створює контекстну пропозицію відповіді. Бот коментарів надсилає її в Telegram з кнопками: Відповісти, Редагувати, Ігнорувати. Один тап для відправки або спочатку редагування.',
    },
    result: {
      en: 'Response time dropped from hours to minutes. Spam gets auto-flagged. Questions get thoughtful AI drafts. The human stays in the loop, but the heavy lifting is done.',
      no: 'Responstid falt fra timer til minutter. Spam flagges automatisk. Spørsmål får gjennomtenkte AI-utkast. Mennesket forblir i loopen, men det tunge arbeidet er gjort.',
      ua: 'Час відповіді впав з годин до хвилин. Спам автоматично позначається. Запитання отримують продумані AI-чернетки. Людина залишається в процесі, але важка робота вже зроблена.',
    },
    techStack: ['Azure OpenAI', 'Facebook Graph API', 'Instagram API', 'Supabase', 'Telegram Bot API'],
    hashtags: ['#AI', '#SentimentAnalysis', '#SocialMedia', '#Comments', '#Automation'],
  },

  {
    id: 'p06',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'AI Duplicate Detection — when six channels post the same story',
      no: 'AI-duplikatdeteksjon — når seks kanaler publiserer samme nyhet',
      ua: 'AI-виявлення дублікатів — коли шість каналів постять ту саму новину',
    },
    shortDescription: {
      en: 'Breaking news hits all 6 Telegram channels within minutes. Two-layer detection (title similarity + AI semantic comparison) catches duplicates before they flood the queue.',
      no: 'Siste nytt treffer alle 6 Telegram-kanaler innen minutter. To-lags deteksjon (tittellikhet + AI-semantisk sammenligning) fanger duplikater før de flommer inn i køen.',
      ua: 'Гарячі новини потрапляють у всі 6 Telegram-каналів за лічені хвилини. Дворівневе виявлення (схожість заголовків + AI-семантичне порівняння) ловить дублікати до того, як вони заповнять чергу.',
    },
    problem: {
      en: 'Breaking news hits all 6 Telegram channels within minutes. Without detection, the same story gets scraped 6 times, creating 6 identical articles in the moderation queue. Reviewing duplicates wastes time and creates confusion.',
      no: 'Siste nytt treffer alle 6 Telegram-kanaler innen minutter. Uten deteksjon blir samme nyhet skrapet 6 ganger, noe som skaper 6 identiske artikler i modereringskøen. Å gjennomgå duplikater sløser tid og skaper forvirring.',
      ua: 'Гарячі новини потрапляють у всі 6 Telegram-каналів за хвилини. Без детекції та сама новина скрейпиться 6 разів, створюючи 6 однакових статей у черзі модерації. Перегляд дублікатів — марна трата часу та плутанина.',
    },
    solution: {
      en: 'The scraper checks incoming titles against a 48-hour cache of recent titles. Exact or near-exact matches are auto-rejected. For uncertain cases, Azure OpenAI compares the full content semantically. Both layers run inside pre-moderate-news before the article enters the queue.',
      no: 'Skraperen sjekker innkommende titler mot en 48-timers cache av nylige titler. Eksakte eller nesten-eksakte treff avvises automatisk. For usikre tilfeller sammenligner Azure OpenAI hele innholdet semantisk. Begge lag kjører i pre-moderate-news før artikkelen går inn i køen.',
      ua: 'Скрейпер перевіряє вхідні заголовки проти 48-годинного кешу нещодавніх заголовків. Точні або майже точні збіги автоматично відхиляються. Для невизначених випадків Azure OpenAI порівнює повний контент семантично. Обидва шари працюють у pre-moderate-news до потрапляння статті в чергу.',
    },
    result: {
      en: 'Duplicate rate in moderation queue dropped from ~40% to under 3%. The two-layer approach keeps API costs low — most duplicates are caught by the free title comparison.',
      no: 'Duplikatraten i modereringskøen falt fra ~40% til under 3%. To-lags-tilnærmingen holder API-kostnadene lave — de fleste duplikater fanges av den gratis tittelsammenligningen.',
      ua: 'Відсоток дублікатів у черзі модерації впав з ~40% до менш ніж 3%. Дворівневий підхід тримає витрати на API низькими — більшість дублікатів ловиться безкоштовним порівнянням заголовків.',
    },
    techStack: ['Azure OpenAI', 'Supabase', 'Deno'],
    hashtags: ['#AI', '#DuplicateDetection', '#NLP', '#ContentPipeline', '#SemanticSearch'],
  },

  {
    id: 'p07',
    projectId: 'portfolio',
    category: 'ai_automation',
    title: {
      en: 'Multi-LLM Provider Support — never depend on one AI vendor',
      no: 'Støtte for flere LLM-leverandører — aldri avhengig av én AI-leverandør',
      ua: 'Підтримка кількох LLM-провайдерів — ніколи не залежати від одного AI-вендора',
    },
    shortDescription: {
      en: 'Azure OpenAI had a 4-hour outage. The entire content pipeline was dead. Now the system supports Azure, Gemini, Grok, and Groq with automatic fallback.',
      no: 'Azure OpenAI hadde et 4-timers strømbrudd. Hele innholdspipelinen var nede. Nå støtter systemet Azure, Gemini, Grok og Groq med automatisk fallback.',
      ua: 'Azure OpenAI мав 4-годинний збій. Весь контент-пайплайн був мертвий. Тепер система підтримує Azure, Gemini, Grok і Groq з автоматичним фолбеком.',
    },
    problem: {
      en: 'Azure OpenAI had a 4-hour outage in January. During that time, the entire content pipeline was dead. No pre-moderation, no rewrites, no image prompts. A single point of failure.',
      no: 'Azure OpenAI hadde et 4-timers strømbrudd i januar. I denne perioden var hele innholdspipelinen nede. Ingen forhåndsmoderering, ingen omskrivinger, ingen bildeprompter. Et enkelt feilpunkt.',
      ua: 'Azure OpenAI мав 4-годинний збій у січні. Весь цей час контент-пайплайн був мертвий. Жодної премодерації, жодних рерайтів, жодних промптів для зображень. Єдина точка відмови.',
    },
    solution: {
      en: 'The system supports Azure OpenAI, Google Gemini, Grok (XAI), and Groq. Image generation uses cascading fallback: Grok -> Gemini. Translation experimented with multi-LLM quality comparison via regenerate-translations. Each provider\'s key is stored in api_settings — switchable from the admin panel.',
      no: 'Systemet støtter Azure OpenAI, Google Gemini, Grok (XAI) og Groq. Bildegenerering bruker kaskaderende fallback: Grok -> Gemini. Oversettelse eksperimenterte med multi-LLM kvalitetssammenligning via regenerate-translations. Hver leverandørs nøkkel lagres i api_settings — kan byttes fra adminpanelet.',
      ua: 'Система підтримує Azure OpenAI, Google Gemini, Grok (XAI) та Groq. Генерація зображень використовує каскадний фолбек: Grok -> Gemini. Переклад експериментував із мульти-LLM порівнянням якості через regenerate-translations. Ключ кожного провайдера зберігається в api_settings — перемикається з адмінки.',
    },
    result: {
      en: 'Zero downtime during subsequent provider outages. The cascading approach also improved image quality — Grok produces better creative images, Gemini handles technical illustrations. Best of both worlds.',
      no: 'Null nedetid under påfølgende leverandøravbrudd. Den kaskaderende tilnærmingen forbedret også bildekvaliteten — Grok produserer bedre kreative bilder, Gemini håndterer tekniske illustrasjoner. Det beste fra begge verdener.',
      ua: 'Нуль простоїв під час наступних збоїв провайдерів. Каскадний підхід також покращив якість зображень — Grok створює кращі креативні зображення, Gemini обробляє технічні ілюстрації. Найкраще з обох світів.',
    },
    techStack: ['Azure OpenAI', 'Google Gemini', 'Grok', 'Groq', 'Supabase'],
    hashtags: ['#AI', '#MultiLLM', '#Resilience', '#Fallback', '#CloudArchitecture'],
  },

  // ─── CATEGORY 2: Video Production Pipeline ─────────────────────────────────

  {
    id: 'p08',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Remotion Video Rendering — turning text articles into broadcast-ready video',
      no: 'Remotion-videorendering — gjør tekstartikler om til kringkastingsklare videoer',
      ua: 'Remotion-рендеринг відео — перетворення текстових статей у відео, готове до ефіру',
    },
    shortDescription: {
      en: 'Video content gets 5-10x more reach. Manual production takes 30-60 minutes per video. Remotion makes the entire pipeline — script, voiceover, subtitles, rendering — fully programmatic.',
      no: 'Videoinnhold får 5-10x mer rekkevidde. Manuell produksjon tar 30-60 minutter per video. Remotion gjør hele pipelinen — manus, voiceover, undertekster, rendering — fullstendig programmatisk.',
      ua: 'Відеоконтент отримує в 5-10 разів більше охоплення. Ручне виробництво займає 30-60 хвилин на відео. Remotion робить весь пайплайн — скрипт, озвучка, субтитри, рендеринг — повністю програмним.',
    },
    problem: {
      en: 'Video content gets 5-10x more reach on social media than text. But producing even a simple news video manually takes 30-60 minutes: script, voiceover, editing, subtitles, export. With 5-10 articles per day, manual video production is impossible.',
      no: 'Videoinnhold får 5-10x mer rekkevidde på sosiale medier enn tekst. Men å produsere selv en enkel nyhetsvideo manuelt tar 30-60 minutter: manus, voiceover, redigering, undertekster, eksport. Med 5-10 artikler daglig er manuell videoproduksjon umulig.',
      ua: 'Відеоконтент отримує в 5-10 разів більше охоплення в соцмережах, ніж текст. Але ручне виробництво навіть простого новинного відео займає 30-60 хвилин: скрипт, озвучка, монтаж, субтитри, експорт. При 5-10 статтях на день ручне виробництво відео неможливе.',
    },
    solution: {
      en: 'Article text -> Azure OpenAI generates a broadcast script -> Zvukogram Neural TTS creates voiceover with word-level timestamps -> Remotion renders the final video with animated subtitles, blurred background, and progress bar. Two templates: Vertical (1080x1920 for Reels) and Horizontal (1920x1080 for YouTube). If any step fails, the system gracefully falls back to raw video upload.',
      no: 'Artikkeltekst -> Azure OpenAI genererer et kringkastingsmanus -> Zvukogram Neural TTS lager voiceover med tidsstempler på ordnivå -> Remotion rendrer den ferdige videoen med animerte undertekster, uskarp bakgrunn og fremdriftslinje. To maler: Vertikal (1080x1920 for Reels) og Horisontal (1920x1080 for YouTube). Hvis noe trinn feiler, faller systemet tilbake til rå videoopplasting.',
      ua: 'Текст статті -> Azure OpenAI генерує скрипт для ефіру -> Zvukogram Neural TTS створює озвучку з таймстемпами на рівні слів -> Remotion рендерить фінальне відео з анімованими субтитрами, розмитим фоном та прогрес-баром. Два шаблони: Вертикальний (1080x1920 для Reels) і Горизонтальний (1920x1080 для YouTube). Якщо будь-який крок зазнає невдачі, система gracefully повертається до завантаження сирого відео.',
    },
    result: {
      en: 'Video production time: from 45 minutes to 3 minutes (mostly approval time). Output: broadcast-quality videos with synced subtitles, professional voiceover, and consistent branding. Toggle SKIP_REMOTION=true when raw video is preferred.',
      no: 'Videoproduksjonstid: fra 45 minutter til 3 minutter (hovedsakelig godkjenningstid). Resultat: kringkastingskvalitets videoer med synkroniserte undertekster, profesjonell voiceover og konsistent merkevarebygging. Bryter SKIP_REMOTION=true når rå video foretrekkes.',
      ua: 'Час виробництва відео: з 45 хвилин до 3 хвилин (переважно час на затвердження). Результат: відео ефірної якості з синхронізованими субтитрами, професійною озвучкою та консистентним брендингом. Перемикач SKIP_REMOTION=true, коли бажано сире відео.',
    },
    techStack: ['Remotion', 'Azure OpenAI', 'Zvukogram TTS', 'React', 'GitHub Actions'],
    hashtags: ['#Remotion', '#VideoAutomation', '#TTS', '#AI', '#MediaProduction'],
  },

  {
    id: 'p09',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Visual Director — AI decides what you see, frame by frame',
      no: 'Visuell regissør — AI bestemmer hva du ser, bilde for bilde',
      ua: 'Візуальний режисер — AI вирішує, що ви бачите, кадр за кадром',
    },
    shortDescription: {
      en: 'Auto-generated videos looked monotonous. Visual Director analyzes each phrase and assigns visual effects based on meaning — particles, glitch, globe, data dashboards.',
      no: 'Autogenererte videoer så monotone ut. Visuell regissør analyserer hver frase og tildeler visuelle effekter basert på mening — partikler, glitch, jordklode, datadashbord.',
      ua: 'Автогенеровані відео виглядали монотонно. Візуальний режисер аналізує кожну фразу і призначає візуальні ефекти на основі змісту — частинки, глітч, глобус, дата-дашборди.',
    },
    problem: {
      en: 'Auto-generated videos looked monotonous. Same background, same text animation, same feel for every article. A story about a tech product launch shouldn\'t look the same as a geopolitical analysis.',
      no: 'Autogenererte videoer så monotone ut. Samme bakgrunn, samme tekstanimasjon, samme følelse for hver artikkel. En historie om en teknologiproduktlansering bør ikke se ut som en geopolitisk analyse.',
      ua: 'Автогенеровані відео виглядали монотонно. Той самий фон, та сама текстова анімація, те саме відчуття для кожної статті. Історія про запуск техпродукту не повинна виглядати так само, як геополітичний аналіз.',
    },
    solution: {
      en: 'The script is split into phrases. For each phrase, the Visual Director runs keyword analysis and assigns one of 8 effect types: blur-text, particles, glitch, globe (Three.js), data-dashboard, perlin-waves, photo-native, or infographic. Each effect has its own Remotion component. The system also searches Pexels/Google for contextual images per phrase.',
      no: 'Manuset deles inn i fraser. For hver frase kjører Visuell regissør nøkkelordanalyse og tildeler én av 8 effekttyper: blur-text, particles, glitch, globe (Three.js), data-dashboard, perlin-waves, photo-native eller infographic. Hver effekt har sin egen Remotion-komponent. Systemet søker også Pexels/Google etter kontekstuelle bilder per frase.',
      ua: 'Скрипт розбивається на фрази. Для кожної фрази Візуальний режисер виконує аналіз ключових слів і призначає один із 8 типів ефектів: blur-text, particles, glitch, globe (Three.js), data-dashboard, perlin-waves, photo-native або infographic. Кожен ефект має власний Remotion-компонент. Система також шукає контекстні зображення на Pexels/Google для кожної фрази.',
    },
    result: {
      en: 'Every video feels unique. The Visual Director turns a script about Nordic energy policy into a visually different experience than a script about Silicon Valley AI startups. Same pipeline, different soul.',
      no: 'Hver video føles unik. Visuell regissør gjør et manus om nordisk energipolitikk til en visuelt annerledes opplevelse enn et manus om AI-startups i Silicon Valley. Samme pipeline, forskjellig sjel.',
      ua: 'Кожне відео відчувається унікальним. Візуальний режисер перетворює скрипт про нордичну енергетичну політику у візуально інший досвід, ніж скрипт про AI-стартапи Кремнієвої долини. Той самий пайплайн, інша душа.',
    },
    techStack: ['Remotion', 'Three.js', 'Pexels API', 'Azure OpenAI', 'GSAP'],
    hashtags: ['#VisualDirector', '#AI', '#VideoEffects', '#Remotion', '#ThreeJS'],
  },

  {
    id: 'p10',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Daily News Video Digest — the morning show that makes itself',
      no: 'Daglig nyhetsvideoresymé — morgensendingen som lager seg selv',
      ua: 'Щоденний відеодайджест новин — ранкове шоу, яке робить себе само',
    },
    shortDescription: {
      en: 'A daily video compilation of top stories is the gold standard. AI ranks articles, generates per-segment scripts and voiceovers, Remotion stitches everything into one broadcast.',
      no: 'En daglig videokompilasjon av toppnyheter er gullstandarden. AI rangerer artikler, genererer manus og voiceover per segment, Remotion syr alt sammen til én sending.',
      ua: 'Щоденна відеокомпіляція топових новин — золотий стандарт. AI ранжує статті, генерує скрипти та озвучку по сегментах, Remotion зшиває все в один ефір.',
    },
    problem: {
      en: 'A daily video compilation of top stories is the gold standard of news channels. But curating, scripting, and producing a multi-segment video daily is a full-time job for a team of 3-5 people.',
      no: 'En daglig videokompilasjon av toppnyheter er gullstandarden for nyhetskanaler. Men å kuratere, skripte og produsere en flersegments video daglig er en fulltidsjobb for et team på 3-5 personer.',
      ua: 'Щоденна відеокомпіляція топових новин — золотий стандарт новинних каналів. Але курування, написання скриптів і виробництво мультисегментного відео щодня — це повна зайнятість для команди з 3-5 людей.',
    },
    solution: {
      en: 'daily-video-bot Edge Function triggers daily. LLM ranks articles by relevance/importance. generate-script.js creates per-segment scripts. generate-voiceover.js records per-segment TTS. daily-compilation.js stitches everything with Remotion: Headlines Roundup cold open, segment transitions, end card. Max 10 segments, respecting YouTube attention spans.',
      no: 'daily-video-bot Edge Function utløses daglig. LLM rangerer artikler etter relevans/viktighet. generate-script.js lager manus per segment. generate-voiceover.js tar opp TTS per segment. daily-compilation.js syr alt sammen med Remotion: Headlines Roundup cold open, segmentoverganger, sluttskjerm. Maks 10 segmenter, tilpasset YouTubes oppmerksomhetsspenn.',
      ua: 'daily-video-bot Edge Function запускається щодня. LLM ранжує статті за релевантністю/важливістю. generate-script.js створює скрипти по сегментах. generate-voiceover.js записує TTS по сегментах. daily-compilation.js зшиває все через Remotion: Headlines Roundup cold open, переходи між сегментами, фінальна карточка. Максимум 10 сегментів, з урахуванням тривалості уваги на YouTube.',
    },
    result: {
      en: 'A daily news show produced in under 10 minutes of compute time. Telegram bot sends it for approval. One click to publish on YouTube. Consistent quality, consistent schedule, zero burnout.',
      no: 'En daglig nyhetssending produsert på under 10 minutter beregningstid. Telegram-bot sender den til godkjenning. Ett klikk for å publisere på YouTube. Konsistent kvalitet, konsistent timeplan, null utbrenthet.',
      ua: 'Щоденне новинне шоу за менш ніж 10 хвилин обчислювального часу. Telegram-бот надсилає на затвердження. Один клік для публікації на YouTube. Стабільна якість, стабільний розклад, нуль вигорання.',
    },
    techStack: ['Remotion', 'Azure OpenAI', 'Zvukogram TTS', 'GitHub Actions', 'YouTube API'],
    hashtags: ['#VideoDigest', '#AI', '#NewsAutomation', '#Remotion', '#YouTube'],
  },

  {
    id: 'p11',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'AI Thumbnail Generation — 4 options, one click',
      no: 'AI-miniatyrbildegenerering — 4 alternativer, ett klikk',
      ua: 'AI-генерація мініатюр — 4 варіанти, один клік',
    },
    shortDescription: {
      en: 'YouTube thumbnails make or break CTR. AI generates 4 distinct thumbnail variants and sends them to Telegram for instant selection by the moderator.',
      no: 'YouTube-miniatyrbilder avgjør klikkfrekvensen. AI genererer 4 distinkte miniatyrvarianter og sender dem til Telegram for umiddelbar velging av moderatoren.',
      ua: 'Мініатюри YouTube визначають CTR. AI генерує 4 різні варіанти мініатюр і надсилає їх у Telegram для миттєвого вибору модератором.',
    },
    problem: {
      en: 'YouTube thumbnails make or break click-through rates. But designing unique thumbnails per video is a creative bottleneck. Generic auto-thumbnails from video frames perform poorly.',
      no: 'YouTube-miniatyrbilder avgjør klikkfrekvensen. Men å designe unike miniatyrbilder per video er en kreativ flaskehals. Generiske automatiske miniatyrbilder fra videorammer presterer dårlig.',
      ua: 'Мініатюри YouTube визначають клікабельність. Але дизайн унікальних мініатюр для кожного відео — це креативне вузьке місце. Загальні автоматичні мініатюри з кадрів відео працюють погано.',
    },
    solution: {
      en: 'generate-ai-thumbnail.js sends article context to Gemini to create 4 stylistically different thumbnail concepts. Each emphasizes different hooks: data point, emotional face, contrast, question. Telegram bot displays all 4 as inline images. Moderator taps one. Background music auto-ducks during voiceover sections.',
      no: 'generate-ai-thumbnail.js sender artikkelkontekst til Gemini for å lage 4 stilistisk forskjellige miniatyrbildekonsepter. Hvert fremhever forskjellige kroker: datapunkt, emosjonelt ansikt, kontrast, spørsmål. Telegram-bot viser alle 4 som innebygde bilder. Moderator trykker på ett. Bakgrunnsmusikk dempes automatisk under voiceover-seksjoner.',
      ua: 'generate-ai-thumbnail.js надсилає контекст статті до Gemini для створення 4 стилістично різних концептів мініатюр. Кожен акцентує різні хуки: дані, емоційне обличчя, контраст, запитання. Telegram-бот показує всі 4 як інлайн-зображення. Модератор тапає на одне. Фонова музика автоматично приглушується під час озвучки.',
    },
    result: {
      en: 'Thumbnail selection takes 5 seconds instead of 15 minutes of design work. A/B testing through variety — the 4-option approach naturally surfaces what works for different content types.',
      no: 'Miniatyrvalg tar 5 sekunder i stedet for 15 minutters designarbeid. A/B-testing gjennom variasjon — 4-alternativs-tilnærmingen avdekker naturlig hva som fungerer for forskjellige innholdstyper.',
      ua: 'Вибір мініатюри займає 5 секунд замість 15 хвилин дизайнерської роботи. A/B-тестування через різноманітність — підхід із 4 варіантами природно виявляє, що працює для різних типів контенту.',
    },
    techStack: ['Google Gemini', 'Telegram Bot API', 'Remotion', 'Node.js'],
    hashtags: ['#AI', '#Thumbnails', '#YouTube', '#Gemini', '#ContentCreation'],
  },

  {
    id: 'p12',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Neural TTS — the voice that doesn\'t sound like a robot',
      no: 'Nevral TTS — stemmen som ikke høres ut som en robot',
      ua: 'Нейронний TTS — голос, який не звучить як робот',
    },
    shortDescription: {
      en: 'Standard TTS sounds robotic. Professional voiceover costs $50-200 per video. Zvukogram Neural TTS delivers human-quality voice with word-level timestamp alignment for perfect subtitle sync.',
      no: 'Standard TTS høres robotaktig ut. Profesjonell voiceover koster $50-200 per video. Zvukogram Neural TTS leverer menneskelig kvalitet med tidsstempler på ordnivå for perfekt undertekstsynkronisering.',
      ua: 'Стандартний TTS звучить роботизовано. Професійна озвучка коштує $50-200 за відео. Zvukogram Neural TTS дає голос людської якості з таймстемпами на рівні слів для ідеальної синхронізації субтитрів.',
    },
    problem: {
      en: 'Standard TTS (Google, AWS Polly) sounds robotic. Professional voiceover artists cost $50-200 per video. For 5-10 videos daily, that\'s $250-2000/day. Unsustainable.',
      no: 'Standard TTS (Google, AWS Polly) høres robotaktig ut. Profesjonelle voiceover-artister koster $50-200 per video. For 5-10 videoer daglig er det $250-2000/dag. Uholdbart.',
      ua: 'Стандартний TTS (Google, AWS Polly) звучить роботизовано. Професійні диктори коштують $50-200 за відео. При 5-10 відео на день це $250-2000/день. Нестійко.',
    },
    solution: {
      en: 'The script goes to Zvukogram API (replaced earlier OpenAI TTS for better quality). Returns audio file + JSON with per-word start/end timestamps. Remotion\'s AnimatedSubtitles component uses these timestamps for pixel-perfect subtitle synchronization. Each word highlights exactly when spoken.',
      no: 'Manuset sendes til Zvukogram API (erstattet tidligere OpenAI TTS for bedre kvalitet). Returnerer lydfil + JSON med start-/sluttidsstempler per ord. Remotions AnimatedSubtitles-komponent bruker disse tidsstemplene for pikselperfekt undertekstsynkronisering. Hvert ord utheves nøyaktig når det uttales.',
      ua: 'Скрипт відправляється до Zvukogram API (замінив раніше OpenAI TTS для кращої якості). Повертає аудіофайл + JSON з таймстемпами початку/кінця для кожного слова. Компонент AnimatedSubtitles у Remotion використовує ці таймстемпи для піксельно-точної синхронізації субтитрів. Кожне слово підсвічується саме тоді, коли воно вимовляється.',
    },
    result: {
      en: 'Voiceover quality indistinguishable from human at scale. Word-level sync means subtitles feel like professional captioning, not auto-generated afterthought. Cost: fraction of human voiceover.',
      no: 'Voiceover-kvalitet som ikke kan skilles fra menneske i skala. Synkronisering på ordnivå betyr at undertekster føles som profesjonell teksting, ikke autogenerert ettertanke. Kostnad: brøkdel av menneskelig voiceover.',
      ua: 'Якість озвучки, нерозрізнювана від людської у масштабі. Синхронізація на рівні слів означає, що субтитри відчуваються як професійне титрування, а не автогенерована думка наостанок. Вартість: частка від людської озвучки.',
    },
    techStack: ['Zvukogram TTS', 'Remotion', 'React', 'Node.js'],
    hashtags: ['#TTS', '#NeuralVoice', '#Subtitles', '#Remotion', '#MediaProduction'],
  },

  {
    id: 'p13',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Cross-Platform Video Distribution — one render, four platforms',
      no: 'Kryssplattform videodistribusjon — én rendering, fire plattformer',
      ua: 'Кросплатформна дистрибуція відео — один рендер, чотири платформи',
    },
    shortDescription: {
      en: 'YouTube wants 16:9, Instagram Reels wants 9:16, LinkedIn wants MP4 under 200MB. Remotion renders both formats, GitHub Actions uploads natively to each platform.',
      no: 'YouTube vil ha 16:9, Instagram Reels vil ha 9:16, LinkedIn vil ha MP4 under 200MB. Remotion rendrer begge formater, GitHub Actions laster opp nativt til hver plattform.',
      ua: 'YouTube хоче 16:9, Instagram Reels хоче 9:16, LinkedIn хоче MP4 до 200MB. Remotion рендерить обидва формати, GitHub Actions завантажує нативно на кожну платформу.',
    },
    problem: {
      en: 'YouTube wants 16:9. Instagram Reels wants 9:16. LinkedIn wants MP4 under 200MB. Facebook wants its own upload. Each platform has different format requirements, aspect ratios, and upload APIs.',
      no: 'YouTube vil ha 16:9. Instagram Reels vil ha 9:16. LinkedIn vil ha MP4 under 200MB. Facebook vil ha sin egen opplasting. Hver plattform har forskjellige formatkrav, aspektforhold og opplastings-API-er.',
      ua: 'YouTube хоче 16:9. Instagram Reels хоче 9:16. LinkedIn хоче MP4 до 200MB. Facebook хоче своє власне завантаження. Кожна платформа має різні вимоги до формату, співвідношення сторін і API завантаження.',
    },
    solution: {
      en: 'Remotion renders two versions: NewsVideo (1080x1920) and NewsVideo (1920x1080). GitHub Actions workflows handle the heavy lifting: process-video.yml (YouTube), linkedin-video.yml (LinkedIn native), instagram-video.yml (Reels), facebook-video.yml (Facebook). MTKruto downloads source videos from Telegram (up to 2GB, bypassing Bot API\'s 20MB limit). Fallback: if any upload fails, Telegram embed is used.',
      no: 'Remotion rendrer to versjoner: NewsVideo (1080x1920) og NewsVideo (1920x1080). GitHub Actions-arbeidsflyter håndterer tungt arbeid: process-video.yml (YouTube), linkedin-video.yml (LinkedIn nativt), instagram-video.yml (Reels), facebook-video.yml (Facebook). MTKruto laster ned kildevideoer fra Telegram (opptil 2GB, omgår Bot APIs 20MB-grense). Fallback: hvis opplasting feiler, brukes Telegram-embed.',
      ua: 'Remotion рендерить дві версії: NewsVideo (1080x1920) та NewsVideo (1920x1080). Воркфлоу GitHub Actions виконують важку роботу: process-video.yml (YouTube), linkedin-video.yml (LinkedIn native), instagram-video.yml (Reels), facebook-video.yml (Facebook). MTKruto завантажує вихідні відео з Telegram (до 2GB, обходячи ліміт Bot API у 20MB). Фолбек: якщо завантаження зазнає невдачі, використовується Telegram embed.',
    },
    result: {
      en: 'One article -> one video -> four platforms -> maximum reach. Fully automated. The GitHub Actions approach avoids Edge Function /tmp limits (256MB free, 512MB pro) for large video files.',
      no: 'Én artikkel -> én video -> fire plattformer -> maksimal rekkevidde. Fullstendig automatisert. GitHub Actions-tilnærmingen unngår Edge Function /tmp-begrensninger (256MB gratis, 512MB pro) for store videofiler.',
      ua: 'Одна стаття -> одне відео -> чотири платформи -> максимальне охоплення. Повністю автоматизовано. Підхід GitHub Actions обходить обмеження Edge Function /tmp (256MB free, 512MB pro) для великих відеофайлів.',
    },
    techStack: ['Remotion', 'GitHub Actions', 'MTKruto', 'YouTube API', 'LinkedIn API', 'Instagram API', 'Facebook API'],
    hashtags: ['#VideoDistribution', '#CrossPlatform', '#Automation', '#Remotion', '#GitHubActions'],
  },

  // ─── CATEGORY 3: Social Media Integration ──────────────────────────────────

  {
    id: 'p14',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'LinkedIn Native Image Upload — because link previews don\'t cut it',
      no: 'LinkedIn nativ bildeopplasting — fordi lenkforhåndsvisninger ikke holder mål',
      ua: 'LinkedIn нативне завантаження зображень — бо прев\'ю посилань не вистачає',
    },
    shortDescription: {
      en: 'LinkedIn auto-generated link previews are small and blurry. Native image uploads get 2-3x more impressions. Full upload flow with race condition-proof duplicate prevention.',
      no: 'LinkedIns autogenererte lenkforhåndsvisninger er små og uskarpe. Native bildeopplastinger får 2-3x flere visninger. Full opplastingsflyt med duplikatforebygging mot race conditions.',
      ua: 'Автогенеровані прев\'ю посилань LinkedIn маленькі та розмиті. Нативне завантаження зображень дає в 2-3 рази більше показів. Повний флоу завантаження з захистом від race condition при запобіганні дублікатів.',
    },
    problem: {
      en: 'LinkedIn\'s auto-generated link previews are small, blurry, and uncontrollable. Posts with native images get 2-3x more impressions than link posts. But the LinkedIn API\'s native upload process is complex: register asset, get upload URL, upload binary, get asset URN, then create post.',
      no: 'LinkedIns autogenererte lenkforhåndsvisninger er små, uskarpe og ukontrollerbare. Innlegg med native bilder får 2-3x flere visninger enn lenkeinnlegg. Men LinkedIns APIs native opplastingsprosess er kompleks: registrer eiendel, hent opplastings-URL, last opp binærfil, hent eiendels-URN, deretter opprett innlegg.',
      ua: 'Автогенеровані прев\'ю посилань LinkedIn маленькі, розмиті та неконтрольовані. Пости з нативними зображеннями отримують в 2-3 рази більше показів, ніж пости з посиланнями. Але процес нативного завантаження через LinkedIn API складний: зареєструвати ассет, отримати URL завантаження, завантажити бінарник, отримати URN ассету, потім створити пост.',
    },
    solution: {
      en: 'post-to-linkedin Edge Function: 1) Check duplicates via wasAlreadyPosted() (checks both \'posted\' AND \'pending\' — race condition fix). 2) Create \'pending\' record. 3) Register upload with Assets API. 4) Download source image. 5) Upload binary to LinkedIn. 6) Create UGC post with asset URN. 7) Update status to \'posted\'. Fallback: if image upload fails, falls back to ARTICLE type (link preview).',
      no: 'post-to-linkedin Edge Function: 1) Sjekk duplikater via wasAlreadyPosted() (sjekker både \'posted\' OG \'pending\' — race condition-fiks). 2) Opprett \'pending\'-post. 3) Registrer opplasting med Assets API. 4) Last ned kildebilde. 5) Last opp binærfil til LinkedIn. 6) Opprett UGC-innlegg med eiendels-URN. 7) Oppdater status til \'posted\'. Fallback: hvis bildeopplasting feiler, faller tilbake til ARTICLE-type (lenkforhåndsvisning).',
      ua: 'post-to-linkedin Edge Function: 1) Перевірка дублікатів через wasAlreadyPosted() (перевіряє і \'posted\', і \'pending\' — фікс race condition). 2) Створення \'pending\' запису. 3) Реєстрація завантаження через Assets API. 4) Завантаження вихідного зображення. 5) Завантаження бінарника в LinkedIn. 6) Створення UGC поста з URN ассету. 7) Оновлення статусу на \'posted\'. Фолбек: якщо завантаження зображення зазнає невдачі, повертається до типу ARTICLE (прев\'ю посилання).',
    },
    result: {
      en: 'Average impressions per post increased after switching to native uploads. The duplicate prevention system (checking both statuses) eliminated the double-posting bug that plagued the first version.',
      no: 'Gjennomsnittlige visninger per innlegg økte etter overgang til native opplastinger. Duplikatforebyggingssystemet (sjekking av begge statuser) eliminerte dobbeltpostingsfeilen som plaget den første versjonen.',
      ua: 'Середня кількість показів на пост зросла після переходу на нативне завантаження. Система запобігання дублікатів (перевірка обох статусів) усунула баг подвійного постингу, що мучив першу версію.',
    },
    techStack: ['LinkedIn UGC API', 'LinkedIn Assets API', 'Supabase Edge Functions', 'Deno'],
    hashtags: ['#LinkedIn', '#NativeUpload', '#SocialMedia', '#API', '#RaceCondition'],
  },

  {
    id: 'p15',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Instagram Publishing — the platform that hates developers',
      no: 'Instagram-publisering — plattformen som hater utviklere',
      ua: 'Публікація в Instagram — платформа, яка ненавидить розробників',
    },
    shortDescription: {
      en: 'Instagram API is notoriously restrictive. Pre-validation of aspect ratios, comprehensive error handling, and polling-based Reels publishing brought failure rate from 40% to under 5%.',
      no: 'Instagram API er notorisk restriktivt. Forhåndsvalidering av aspektforhold, omfattende feilhåndtering og pollingsbasert Reels-publisering reduserte feilraten fra 40% til under 5%.',
      ua: 'API Instagram сумнозвісно обмежувальний. Попередня валідація співвідношення сторін, комплексна обробка помилок та публікація Reels на основі полінгу знизили відсоток помилок з 40% до менш ніж 5%.',
    },
    problem: {
      en: 'Instagram\'s API is notoriously restrictive. No clickable links in captions. Business account required. Aspect ratio must be between 4:5 and 1.91:1 (or post gets rejected). Reels require a multi-step container creation -> polling -> publish flow. Error messages are cryptic (#10, #24, #100, #190).',
      no: 'Instagrams API er notorisk restriktivt. Ingen klikkbare lenker i bildetekster. Bedriftskonto kreves. Aspektforhold må være mellom 4:5 og 1.91:1 (ellers avvises innlegget). Reels krever en flerstegs opprettelse av container -> polling -> publiseringsflyt. Feilmeldinger er kryptiske (#10, #24, #100, #190).',
      ua: 'API Instagram сумнозвісно обмежувальний. Жодних клікабельних посилань у підписах. Потрібен бізнес-акаунт. Співвідношення сторін має бути між 4:5 та 1.91:1 (або пост відхиляється). Reels вимагають багатокрокового створення контейнера -> полінг -> публікація. Повідомлення про помилки криптичні (#10, #24, #100, #190).',
    },
    solution: {
      en: 'post-to-instagram creates a media container, polls status every 10 seconds (max 30 attempts), then publishes. Aspect ratio pre-validation via binary header parsing catches bad images before they hit the API. Instagram errors get mapped to fix instructions (Error #10 -> "regenerate token with instagram_content_publish scope"). Caption formatter respects the 2,200 char limit.',
      no: 'post-to-instagram oppretter en mediecontainer, poller status hvert 10. sekund (maks 30 forsøk), og publiserer deretter. Forhåndsvalidering av aspektforhold via binær header-parsing fanger dårlige bilder før de treffer API-et. Instagram-feil mappes til retteinstruksjoner (Error #10 -> "regenerer token med instagram_content_publish scope"). Bildetekstformaterer respekterer grensen på 2200 tegn.',
      ua: 'post-to-instagram створює медіа-контейнер, полить статус кожні 10 секунд (максимум 30 спроб), потім публікує. Попередня валідація співвідношення сторін через парсинг бінарного заголовку ловить погані зображення до потрапляння в API. Помилки Instagram мапляться на інструкції виправлення (Error #10 -> "перегенеруйте токен зі скоупом instagram_content_publish"). Форматер підписів дотримується ліміту в 2200 символів.',
    },
    result: {
      en: 'Instagram publishing went from a 40% failure rate (API rejections) to under 5%. The error-to-fix mapping means every failure is self-diagnosable — no more digging through Facebook\'s documentation.',
      no: 'Instagram-publisering gikk fra 40% feilrate (API-avvisninger) til under 5%. Feil-til-fiks-mappingen betyr at hver feil er selvdiagnostiserbar — ikke mer graving i Facebooks dokumentasjon.',
      ua: 'Публікація в Instagram перейшла від 40% відмов (відхилення API) до менш ніж 5%. Маппінг помилок до виправлень означає, що кожна помилка самодіагностується — більше не потрібно копатися в документації Facebook.',
    },
    techStack: ['Facebook Graph API', 'Instagram API', 'Supabase Edge Functions', 'Deno'],
    hashtags: ['#Instagram', '#API', '#SocialMedia', '#ErrorHandling', '#Reels'],
  },

  {
    id: 'p16',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Social Analytics Dashboard — building my own Shield App',
      no: 'Sosial analyse-dashboard — bygger min egen Shield App',
      ua: 'Дашборд аналітики соцмереж — будую свій власний Shield App',
    },
    shortDescription: {
      en: 'Shield App charges $25/month for LinkedIn analytics. Built a full analytics dashboard inside the admin panel using data already flowing through the system — at zero recurring cost.',
      no: 'Shield App tar $25/mnd for LinkedIn-analyse. Bygget et fullverdig analysedashboard i adminpanelet med data som allerede flyter gjennom systemet — til null løpende kostnad.',
      ua: 'Shield App бере $25/місяць за аналітику LinkedIn. Побудував повний дашборд аналітики в адмінці, використовуючи дані, що вже проходять через систему — з нульовими щомісячними витратами.',
    },
    problem: {
      en: 'Shield App charges $25/month/profile for LinkedIn analytics. I already have all the data flowing through my system — posts, engagement, timestamps. I just wasn\'t collecting metrics from the platforms.',
      no: 'Shield App tar $25/mnd/profil for LinkedIn-analyse. Jeg har allerede alle dataene som flyter gjennom systemet mitt — innlegg, engasjement, tidsstempler. Jeg samlet bare ikke inn metrikker fra plattformene.',
      ua: 'Shield App бере $25/місяць/профіль за аналітику LinkedIn. Усі дані вже проходять через мою систему — пости, залученість, таймстемпи. Я просто не збирав метрики з платформ.',
    },
    solution: {
      en: 'New Edge Function sync-social-metrics runs every 6 hours. Fetches post insights from Facebook Graph API and Instagram Media API. Tracks follower counts in follower_history table. Aggregates daily snapshots. Dashboard shows: summary cards with % changes, engagement-over-time charts, top posts ranking, platform comparison, follower growth, posting frequency. CSV export for reporting.',
      no: 'Ny Edge Function sync-social-metrics kjører hver 6. time. Henter innleggsinnsikt fra Facebook Graph API og Instagram Media API. Sporer følgertall i follower_history-tabellen. Aggregerer daglige øyeblikksbilder. Dashboard viser: sammendragskort med %-endringer, engasjement-over-tid-diagrammer, topp innlegg-rangering, plattformsammenligning, følgervekst, publiseringsfrekvens. CSV-eksport for rapportering.',
      ua: 'Нова Edge Function sync-social-metrics запускається кожні 6 годин. Забирає інсайти постів з Facebook Graph API та Instagram Media API. Відстежує кількість підписників у таблиці follower_history. Агрегує щоденні знімки. Дашборд показує: карточки з % змінами, графіки залученості в часі, рейтинг топ-постів, порівняння платформ, зростання підписників, частоту публікацій. CSV-експорт для звітності.',
    },
    result: {
      en: 'Full analytics dashboard at zero recurring cost. Real-time engagement tracking for Facebook and Instagram. LinkedIn pending API approval — when it arrives, it\'s just filling in one function stub.',
      no: 'Fullverdig analysedashboard til null løpende kostnad. Sanntids engasjementssporing for Facebook og Instagram. LinkedIn venter på API-godkjenning — når den kommer, er det bare å fylle inn én funksjonsstubb.',
      ua: 'Повний дашборд аналітики з нульовими щомісячними витратами. Відстеження залученості в реальному часі для Facebook та Instagram. LinkedIn очікує на затвердження API — коли воно прийде, потрібно лише заповнити один стаб функції.',
    },
    techStack: ['Facebook Graph API', 'Instagram API', 'Recharts', 'Supabase', 'Deno'],
    hashtags: ['#Analytics', '#Dashboard', '#SocialMedia', '#Recharts', '#ZeroCost'],
  },

  {
    id: 'p17',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Race Condition-Proof Duplicate Prevention — the bug that posted everything twice',
      no: 'Race condition-sikker duplikatforebygging — feilen som postet alt to ganger',
      ua: 'Захист від race condition при дублікатах — баг, який постив все двічі',
    },
    shortDescription: {
      en: 'Articles were posted twice to LinkedIn due to a classic race condition. Fixed with a UNIQUE constraint + pending status check before the actual API call.',
      no: 'Artikler ble postet to ganger til LinkedIn på grunn av en klassisk race condition. Fikset med en UNIQUE-begrensning + pending-statussjekk før selve API-kallet.',
      ua: 'Статті постилися двічі в LinkedIn через класичний race condition. Виправлено через UNIQUE constraint + перевірку статусу pending перед самим API-викликом.',
    },
    problem: {
      en: 'In January 2025, articles were being posted twice to LinkedIn. The duplicate check (wasAlreadyPosted()) only looked for status=\'posted\'. But between the check and the actual posting, there\'s a ~3 second window where another request could also pass the check and start posting.',
      no: 'I januar 2025 ble artikler postet to ganger til LinkedIn. Duplikatsjekken (wasAlreadyPosted()) sjekket bare status=\'posted\'. Men mellom sjekken og selve postingen er det et ~3 sekunders vindu der en annen forespørsel også kunne passere sjekken og begynne å poste.',
      ua: 'У січні 2025 статті постилися двічі в LinkedIn. Перевірка дублікатів (wasAlreadyPosted()) шукала лише status=\'posted\'. Але між перевіркою та фактичним постингом є вікно ~3 секунди, де інший запит теж міг пройти перевірку та почати постити.',
    },
    solution: {
      en: 'createSocialPost() inserts a pending record with UNIQUE(content_id, platform, language). If the insert fails with error code 23505, it means another process already started posting. The function returns {isNew: false, raceCondition: true} and the caller aborts. After successful posting, status updates to \'posted\'.',
      no: 'createSocialPost() setter inn en pending-post med UNIQUE(content_id, platform, language). Hvis innsettingen feiler med feilkode 23505, betyr det at en annen prosess allerede har begynt å poste. Funksjonen returnerer {isNew: false, raceCondition: true} og kalleren avbryter. Etter vellykket posting oppdateres status til \'posted\'.',
      ua: 'createSocialPost() вставляє pending запис із UNIQUE(content_id, platform, language). Якщо вставка зазнає невдачі з кодом помилки 23505, це означає, що інший процес вже почав постити. Функція повертає {isNew: false, raceCondition: true} і викликач скасовує. Після успішного постингу статус оновлюється на \'posted\'.',
    },
    result: {
      en: 'Zero duplicate posts since the fix. The pattern is now used across all three social platforms. A 3-line database constraint replaced what would have been complex distributed locking.',
      no: 'Null duplikatinnlegg siden fiksen. Mønsteret brukes nå på tvers av alle tre sosiale plattformer. En 3-linjers databasebegrensning erstattet det som ville vært kompleks distribuert låsing.',
      ua: 'Нуль дублікатів постів після фіксу. Патерн тепер використовується на всіх трьох соціальних платформах. 3-рядковий database constraint замінив те, що було б складним розподіленим блокуванням.',
    },
    techStack: ['PostgreSQL', 'Supabase', 'Deno'],
    hashtags: ['#RaceCondition', '#PostgreSQL', '#DuplicatePrevention', '#BugFix', '#Database'],
  },

  // ─── CATEGORY 4: Telegram Bot Ecosystem ────────────────────────────────────

  {
    id: 'p18',
    projectId: 'portfolio',
    category: 'bot_scraping',
    title: {
      en: '9-Step Moderation Workflow — from raw scrape to published article in 4 taps',
      no: '9-trinns modereringsarbeidsflyt — fra rå skraping til publisert artikkel på 4 trykk',
      ua: '9-кроковий воркфлоу модерації — від сирого скрейпу до опублікованої статті за 4 тапи',
    },
    shortDescription: {
      en: 'Content moderation via Telegram with complex branching: image selection, language choice, platform selection. Handles 50+ articles/day with average moderation time of 8 seconds per article.',
      no: 'Innholdsmoderering via Telegram med kompleks forgrening: bildevalg, språkvalg, plattformvalg. Håndterer 50+ artikler/dag med gjennomsnittlig modereringstid på 8 sekunder per artikkel.',
      ua: 'Модерація контенту через Telegram зі складним розгалуженням: вибір зображення, мови, платформи. Обробляє 50+ статей/день з середнім часом модерації 8 секунд на статтю.',
    },
    problem: {
      en: 'Content moderation needed a workflow that\'s fast on mobile (Telegram), supports complex branching (image selection, language choice, platform selection), and handles 50+ articles per day without overwhelming the moderator.',
      no: 'Innholdsmoderering trengte en arbeidsflyt som er rask på mobil (Telegram), støtter kompleks forgrening (bildevalg, språkvalg, plattformvalg), og håndterer 50+ artikler daglig uten å overbelaste moderatoren.',
      ua: 'Модерація контенту потребувала воркфлоу, який швидкий на мобільному (Telegram), підтримує складне розгалуження (вибір зображення, мови, платформи) та обробляє 50+ статей на день без перевантаження модератора.',
    },
    solution: {
      en: 'telegram-webhook Edge Function handles all inline button callbacks. Pattern: action_prefix_${newsId}. The bot edits the same message at each step (no message spam). Image priority: processed_image_url > image_url > null. For video posts, the workflow detects videoUrl && videoType and jumps straight to publish buttons.',
      no: 'telegram-webhook Edge Function håndterer alle inline-knappkallbacker. Mønster: action_prefix_${newsId}. Boten redigerer samme melding ved hvert trinn (ingen meldingsspam). Bildeprioritet: processed_image_url > image_url > null. For videoinnlegg oppdager arbeidsflyten videoUrl && videoType og hopper rett til publiseringsknapper.',
      ua: 'telegram-webhook Edge Function обробляє всі колбеки інлайн-кнопок. Патерн: action_prefix_${newsId}. Бот редагує те саме повідомлення на кожному кроці (без спаму повідомленнями). Пріоритет зображень: processed_image_url > image_url > null. Для відеопостів воркфлоу визначає videoUrl && videoType і переходить прямо до кнопок публікації.',
    },
    result: {
      en: 'Average moderation time per article: 8 seconds (4 taps). The 64-byte callback constraint forced elegant prefix design. Message editing (vs sending new messages) keeps the chat clean even with 50+ articles per day.',
      no: 'Gjennomsnittlig modereringstid per artikkel: 8 sekunder (4 trykk). 64-byte callback-begrensningen tvang frem elegant prefiksdesign. Meldingsredigering (vs sending av nye meldinger) holder chatten ren selv med 50+ artikler daglig.',
      ua: 'Середній час модерації на статтю: 8 секунд (4 тапи). Обмеження колбеку в 64 байти змусило створити елегантний дизайн префіксів. Редагування повідомлень (замість відправки нових) тримає чат чистим навіть при 50+ статтях на день.',
    },
    techStack: ['Telegram Bot API', 'Supabase Edge Functions', 'Deno'],
    hashtags: ['#TelegramBot', '#Moderation', '#Workflow', '#ContentPipeline', '#UX'],
  },

  {
    id: 'p19',
    projectId: 'portfolio',
    category: 'bot_scraping',
    title: {
      en: 'Creative Builder — Telegram as an image prompt IDE',
      no: 'Creative Builder — Telegram som et bildepromt-IDE',
      ua: 'Creative Builder — Telegram як IDE для промптів зображень',
    },
    shortDescription: {
      en: 'AI-generated images need creative direction. An interactive prompt constructor inside Telegram with 7 categories x 6 options lets non-technical moderators influence visual output through tapping.',
      no: 'AI-genererte bilder trenger kreativ retning. En interaktiv promptkonstruktør inne i Telegram med 7 kategorier x 6 alternativer lar ikke-tekniske moderatorer påvirke visuelt resultat gjennom trykking.',
      ua: 'AI-генеровані зображення потребують креативного напрямку. Інтерактивний конструктор промптів у Telegram із 7 категоріями x 6 опцій дозволяє нетехнічним модераторам впливати на візуальний результат через тапи.',
    },
    problem: {
      en: 'AI-generated images sometimes need creative direction. "Make it more corporate" or "use warmer colors" doesn\'t translate well to structured prompts. The moderator needs to influence the visual output without writing complex prompts.',
      no: 'AI-genererte bilder trenger noen ganger kreativ retning. "Gjør det mer bedriftsmessig" eller "bruk varmere farger" oversettes ikke godt til strukturerte prompter. Moderatoren trenger å påvirke det visuelle resultatet uten å skrive komplekse prompter.',
      ua: 'AI-генеровані зображення іноді потребують креативного напрямку. "Зроби більш корпоративним" або "використай теплі кольори" погано перекладається в структуровані промпти. Модератор повинен впливати на візуальний результат без написання складних промптів.',
    },
    solution: {
      en: 'cb_hub_${uuid} shows the 7 categories. cb_c_XX_${uuid} selects a category. cb_s_XX_N_${uuid} selects an option within it. cb_gen_${uuid} triggers generation with all selected elements. cb_rst_${uuid} resets all choices. Creative elements stored in creative_elements table (6 categories x 6 options). The final prompt combines selections with the article\'s AI-extracted metadata.',
      no: 'cb_hub_${uuid} viser de 7 kategoriene. cb_c_XX_${uuid} velger en kategori. cb_s_XX_N_${uuid} velger et alternativ innenfor den. cb_gen_${uuid} utløser generering med alle valgte elementer. cb_rst_${uuid} tilbakestiller alle valg. Kreative elementer lagret i creative_elements-tabellen (6 kategorier x 6 alternativer). Den endelige prompten kombinerer valg med artikkelens AI-uttrukne metadata.',
      ua: 'cb_hub_${uuid} показує 7 категорій. cb_c_XX_${uuid} обирає категорію. cb_s_XX_N_${uuid} обирає опцію всередині неї. cb_gen_${uuid} запускає генерацію з усіма обраними елементами. cb_rst_${uuid} скидає всі вибори. Креативні елементи зберігаються в таблиці creative_elements (6 категорій x 6 опцій). Фінальний промпт комбінує вибори з AI-витягнутими метаданими статті.',
    },
    result: {
      en: 'Non-technical content moderators can influence image generation through an intuitive tap-based interface. No prompt engineering knowledge needed. The constraint of 6x6 options prevents choice paralysis while covering the most common creative directions.',
      no: 'Ikke-tekniske innholdsmoderatorer kan påvirke bildegenerering gjennom et intuitivt trykkbasert grensesnitt. Ingen kunnskap om prompt engineering nødvendig. Begrensningen på 6x6 alternativer forhindrer valgparalyse mens de vanligste kreative retningene dekkes.',
      ua: 'Нетехнічні модератори контенту можуть впливати на генерацію зображень через інтуїтивний інтерфейс на основі тапів. Не потрібні знання prompt engineering. Обмеження 6x6 опцій запобігає паралічу вибору, покриваючи найпоширеніші креативні напрямки.',
    },
    techStack: ['Telegram Bot API', 'Supabase', 'Azure OpenAI', 'Deno'],
    hashtags: ['#CreativeBuilder', '#TelegramBot', '#ImageGeneration', '#UX', '#PromptEngineering'],
  },

  {
    id: 'p20',
    projectId: 'portfolio',
    category: 'bot_scraping',
    title: {
      en: 'Auto-Publish Pipeline — the system that runs itself',
      no: 'Auto-publiseringspipeline — systemet som kjører seg selv',
      ua: 'Пайплайн автопублікації — система, яка працює сама',
    },
    shortDescription: {
      en: 'Even with Telegram moderation, manual steps add up. Fully autonomous mode: AI generates images, rewrites in 3 languages, publishes to website, and posts to all social platforms automatically.',
      no: 'Selv med Telegram-moderering legger manuelle trinn seg opp. Fullstendig autonom modus: AI genererer bilder, omskriver på 3 språk, publiserer på nettstedet og poster på alle sosiale plattformer automatisk.',
      ua: 'Навіть із Telegram-модерацією ручні кроки накопичуються. Повністю автономний режим: AI генерує зображення, переписує на 3 мовах, публікує на сайті та постить у всі соцмережі автоматично.',
    },
    problem: {
      en: 'Even with Telegram moderation, the pipeline had manual steps: tap to generate image, tap to rewrite, tap to publish, tap to post socially. For high-volume periods (10+ articles), these taps add up.',
      no: 'Selv med Telegram-moderering hadde pipelinen manuelle trinn: trykk for å generere bilde, trykk for å omskrive, trykk for å publisere, trykk for å poste sosialt. For perioder med høyt volum (10+ artikler) legger disse trykkene seg opp.',
      ua: 'Навіть із Telegram-модерацією пайплайн мав ручні кроки: тап для генерації зображення, тап для рерайту, тап для публікації, тап для постингу в соцмережі. При великих обсягах (10+ статей) ці тапи накопичуються.',
    },
    solution: {
      en: 'auto-publish-news Edge Function orchestrates the entire pipeline. Telegram messages reduced to 4 in auto mode (from 8+ in manual). Per-source toggle: some sources get full auto, others stay manual. Auto-advance with configurable delays between steps. schedule-publisher manages timing windows and rate limiting.',
      no: 'auto-publish-news Edge Function orkestrerer hele pipelinen. Telegram-meldinger redusert til 4 i automodus (fra 8+ i manuell). Per-kilde-bryter: noen kilder får full auto, andre forblir manuelle. Auto-avansering med konfigurerbare forsinkelser mellom trinn. schedule-publisher styrer tidsvinduer og frekvensbegrensning.',
      ua: 'auto-publish-news Edge Function оркеструє весь пайплайн. Telegram-повідомлення скорочені до 4 в автоматичному режимі (з 8+ у ручному). Перемикач по джерелу: деякі джерела отримують повний авто, інші залишаються ручними. Автопросування з налаштовуваними затримками між кроками. schedule-publisher керує часовими вікнами та rate limiting.',
    },
    result: {
      en: 'Publication latency dropped from 15 minutes (manual) to 2 minutes (auto). The moderator\'s role shifted from "process every article" to "review exceptions." Output capacity: unlimited, constrained only by API rate limits.',
      no: 'Publiseringsforsinkelse falt fra 15 minutter (manuell) til 2 minutter (auto). Moderatorens rolle endret seg fra "behandle hver artikkel" til "gjennomgå unntak." Utgangskapasitet: ubegrenset, begrenset kun av API-frekvensbegrensninger.',
      ua: 'Затримка публікації впала з 15 хвилин (ручна) до 2 хвилин (авто). Роль модератора змінилася з "обробляти кожну статтю" на "переглядати виключення." Потужність: необмежена, обмежена лише rate limits API.',
    },
    techStack: ['Supabase Edge Functions', 'Deno', 'Telegram Bot API', 'GitHub Actions'],
    hashtags: ['#AutoPublish', '#Automation', '#ContentPipeline', '#TelegramBot', '#Serverless'],
  },

  {
    id: 'p21',
    projectId: 'portfolio',
    category: 'bot_scraping',
    title: {
      en: 'MTKruto — downloading 2GB videos through Telegram\'s back door',
      no: 'MTKruto — nedlasting av 2GB videoer gjennom Telegrams bakdør',
      ua: 'MTKruto — завантаження 2GB відео через чорний хід Telegram',
    },
    shortDescription: {
      en: 'Telegram Bot API has a 20MB download limit. MTKruto uses MTProto protocol (same as official apps) to download files up to 2GB — no size restrictions.',
      no: 'Telegram Bot API har en nedlastingsgrense på 20MB. MTKruto bruker MTProto-protokollen (samme som offisielle apper) for å laste ned filer opptil 2GB — ingen størrelsesbegrensninger.',
      ua: 'Telegram Bot API має ліміт завантаження 20MB. MTKruto використовує протокол MTProto (той самий, що в офіційних додатках) для завантаження файлів до 2GB — без обмежень розміру.',
    },
    problem: {
      en: 'Telegram Bot API has a strict 20MB file download limit. News videos from Telegram channels are often 50-200MB. Some investigative reports are 500MB+. The Bot API simply can\'t handle them.',
      no: 'Telegram Bot API har en streng grense på 20MB for filnedlasting. Nyhetsvideoer fra Telegram-kanaler er ofte 50-200MB. Noen undersøkende reportasjer er 500MB+. Bot API kan rett og slett ikke håndtere dem.',
      ua: 'Telegram Bot API має суворий ліміт завантаження файлів у 20MB. Новинні відео з Telegram-каналів часто 50-200MB. Деякі розслідувальні репортажі — 500MB+. Bot API просто не може їх обробити.',
    },
    solution: {
      en: 'MTKruto connects as a Telegram client (not a bot). Downloads happen via MTProto protocol, supporting files up to 2GB. The downloaded file is then uploaded to YouTube (unlisted) for web embedding, or directly to LinkedIn/Instagram/Facebook via their respective APIs. GitHub Actions handle the heavy lifting (Edge Functions have /tmp size limits: 256MB free, 512MB pro).',
      no: 'MTKruto kobler til som en Telegram-klient (ikke en bot). Nedlastinger skjer via MTProto-protokollen, og støtter filer opptil 2GB. Den nedlastede filen lastes deretter opp til YouTube (uoppført) for nettinnbygging, eller direkte til LinkedIn/Instagram/Facebook via deres respektive API-er. GitHub Actions håndterer det tunge arbeidet (Edge Functions har /tmp-størrelsesbegrensninger: 256MB gratis, 512MB pro).',
      ua: 'MTKruto підключається як Telegram-клієнт (не бот). Завантаження відбувається через протокол MTProto, підтримуючи файли до 2GB. Завантажений файл потім завантажується на YouTube (unlisted) для вбудовування на сайт, або безпосередньо в LinkedIn/Instagram/Facebook через їхні API. GitHub Actions виконують важку роботу (Edge Functions мають обмеження /tmp: 256MB free, 512MB pro).',
    },
    result: {
      en: 'No more "video too large" failures. Even hour-long documentary clips get processed. The MTProto approach also gives access to channel metadata and message history that Bot API can\'t reach.',
      no: 'Ingen flere "video for stor"-feil. Selv timevis lange dokumentarklipp blir behandlet. MTProto-tilnærmingen gir også tilgang til kanalmetadata og meldingshistorikk som Bot API ikke kan nå.',
      ua: 'Більше жодних помилок "відео завелике". Навіть годинні документальні кліпи обробляються. Підхід MTProto також дає доступ до метаданих каналу та історії повідомлень, недоступних через Bot API.',
    },
    techStack: ['MTKruto', 'MTProto', 'GitHub Actions', 'YouTube API', 'Deno'],
    hashtags: ['#MTKruto', '#Telegram', '#MTProto', '#VideoProcessing', '#Workaround'],
  },

  {
    id: 'p22',
    projectId: 'portfolio',
    category: 'bot_scraping',
    title: {
      en: 'RSS-to-Telegram Bridge — 32 sources, one moderation queue',
      no: 'RSS-til-Telegram-bro — 32 kilder, én modereringskø',
      ua: 'RSS-to-Telegram міст — 32 джерела, одна черга модерації',
    },
    shortDescription: {
      en: 'Content from 6 Telegram channels and 26 RSS feeds is normalized into one format and funneled through a single Telegram-based moderation queue.',
      no: 'Innhold fra 6 Telegram-kanaler og 26 RSS-feeder normaliseres til ett format og sendes gjennom én enkelt Telegram-basert modereringskø.',
      ua: 'Контент із 6 Telegram-каналів та 26 RSS-стрічок нормалізується в один формат і проходить через єдину чергу модерації на базі Telegram.',
    },
    problem: {
      en: 'Content comes from diverse sources: 6 Telegram channels, 26 RSS feeds. Each has different formats, update frequencies, and quality levels. The moderator needs a single, unified queue — not 32 separate inboxes.',
      no: 'Innhold kommer fra forskjellige kilder: 6 Telegram-kanaler, 26 RSS-feeder. Hver har forskjellige formater, oppdateringsfrekvenser og kvalitetsnivåer. Moderatoren trenger én enkelt, samlet kø — ikke 32 separate innbokser.',
      ua: 'Контент приходить із різних джерел: 6 Telegram-каналів, 26 RSS-стрічок. Кожне має різні формати, частоту оновлень та рівні якості. Модератор потребує єдину уніфіковану чергу — а не 32 окремі інбокси.',
    },
    solution: {
      en: 'realtime-scraper.yml runs every 10 minutes for Telegram channels (round-robin to avoid rate limits). rss-monitor-v2.yml runs every 30 minutes for RSS feeds (batched: 8 sources per batch, 4 batches). Both routes funnel articles through pre-moderate-news (AI filtering), then into the Telegram bot queue. The news_sources table tracks each source\'s type, fetch interval, and last fetch time.',
      no: 'realtime-scraper.yml kjører hvert 10. minutt for Telegram-kanaler (round-robin for å unngå frekvensbegrensninger). rss-monitor-v2.yml kjører hvert 30. minutt for RSS-feeder (batched: 8 kilder per batch, 4 batcher). Begge ruter sender artikler gjennom pre-moderate-news (AI-filtrering), deretter inn i Telegram-botkøen. news_sources-tabellen sporer hver kildes type, henteintervall og siste hentetidspunkt.',
      ua: 'realtime-scraper.yml запускається кожні 10 хвилин для Telegram-каналів (round-robin для уникнення rate limits). rss-monitor-v2.yml запускається кожні 30 хвилин для RSS-стрічок (пакетно: 8 джерел на пакет, 4 пакети). Обидва маршрути проводять статті через pre-moderate-news (AI-фільтрація), потім у чергу Telegram-бота. Таблиця news_sources відстежує тип кожного джерела, інтервал отримання та час останнього отримання.',
    },
    result: {
      en: '32 sources, 1 moderation queue, 1 workflow. The round-robin approach prevents hitting Telegram\'s rate limits. Batch processing for RSS keeps GitHub Actions runtime under 10 minutes. Source management is fully configurable from the admin panel.',
      no: '32 kilder, 1 modereringskø, 1 arbeidsflyt. Round-robin-tilnærmingen forhindrer treff på Telegrams frekvensbegrensninger. Batchbehandling for RSS holder GitHub Actions-kjøretid under 10 minutter. Kildestyring er fullt konfigurerbar fra adminpanelet.',
      ua: '32 джерела, 1 черга модерації, 1 воркфлоу. Підхід round-robin запобігає потраплянню на rate limits Telegram. Пакетна обробка RSS тримає час виконання GitHub Actions під 10 хвилин. Керування джерелами повністю налаштовується з адмінки.',
    },
    techStack: ['GitHub Actions', 'Supabase Edge Functions', 'Telegram Bot API', 'RSS', 'Deno'],
    hashtags: ['#RSS', '#TelegramBot', '#ContentScraping', '#Automation', '#RoundRobin'],
  },

  // ─── CATEGORY 5: Content Management ────────────────────────────────────────

  {
    id: 'p23',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: '43 Edge Functions — a serverless backend that scales to zero',
      no: '43 Edge Functions — en serverløs backend som skalerer til null',
      ua: '43 Edge Functions — серверлес бекенд, що масштабується до нуля',
    },
    shortDescription: {
      en: 'Traditional backend servers cost money 24/7. 43 Deno Edge Functions on Supabase scale to zero when idle and deploy independently in ~10 seconds each.',
      no: 'Tradisjonelle backend-servere koster penger 24/7. 43 Deno Edge Functions på Supabase skalerer til null ved inaktivitet og deployes uavhengig på ~10 sekunder hver.',
      ua: 'Традиційні бекенд-сервери коштують грошей 24/7. 43 Deno Edge Functions на Supabase масштабуються до нуля при простої та деплояться незалежно за ~10 секунд кожна.',
    },
    problem: {
      en: 'Traditional backend servers cost money 24/7 whether you use them or not. For a portfolio/news site with variable traffic, paying for always-on infrastructure is wasteful. But the backend logic is complex: 43 distinct operations from scraping to AI processing to social posting.',
      no: 'Tradisjonelle backend-servere koster penger 24/7 uansett om du bruker dem eller ikke. For en portefølje-/nyhetsside med variabel trafikk er det sløsing å betale for alltid-på infrastruktur. Men backend-logikken er kompleks: 43 distinkte operasjoner fra skraping til AI-behandling til sosial posting.',
      ua: 'Традиційні бекенд-сервери коштують грошей 24/7, незалежно від використання. Для портфоліо/новинного сайту зі змінним трафіком платити за постійно ввімкнену інфраструктуру — марнотратство. Але бекенд-логіка складна: 43 окремі операції від скрейпінгу до AI-обробки до постингу в соцмережі.',
    },
    solution: {
      en: '43 functions in supabase/functions/, each with its own index.ts. Shared helpers in _shared/ (10 files: YouTube, GitHub Actions, Facebook, social media, slugs, duplicates, Telegram formatting, etc.). Deploy: supabase functions deploy <name> --no-verify-jwt. Each function has version logging for deployment verification.',
      no: '43 funksjoner i supabase/functions/, hver med sin egen index.ts. Delte hjelpere i _shared/ (10 filer: YouTube, GitHub Actions, Facebook, sosiale medier, slugs, duplikater, Telegram-formatering osv.). Deploy: supabase functions deploy <name> --no-verify-jwt. Hver funksjon har versjonslogging for deployverifisering.',
      ua: '43 функції в supabase/functions/, кожна зі своїм index.ts. Спільні хелпери в _shared/ (10 файлів: YouTube, GitHub Actions, Facebook, соцмережі, slugs, дублікати, Telegram-форматування тощо). Деплой: supabase functions deploy <name> --no-verify-jwt. Кожна функція має логування версій для верифікації деплою.',
    },
    result: {
      en: 'Backend cost: $0/month on Supabase free tier (upgrading to pro only for /tmp storage on video processing). Cold start: <500ms. Deployment: individual function redeploy in ~10 seconds. The serverless approach means I never pay for idle time — which is 95% of the day.',
      no: 'Backend-kostnad: $0/mnd på Supabase gratis-nivå (oppgradering til pro kun for /tmp-lagring ved videobehandling). Kaldstart: <500ms. Deployment: individuell funksjonsredeploy på ~10 sekunder. Den serverløse tilnærmingen betyr at jeg aldri betaler for inaktiv tid — som utgjør 95% av dagen.',
      ua: 'Вартість бекенду: $0/місяць на безкоштовному плані Supabase (апгрейд до pro лише для /tmp сховища при обробці відео). Холодний старт: <500ms. Деплой: перезапуск окремої функції за ~10 секунд. Серверлес підхід означає, що я ніколи не плачу за простій — а це 95% дня.',
    },
    techStack: ['Supabase Edge Functions', 'Deno', 'PostgreSQL', 'TypeScript'],
    hashtags: ['#Serverless', '#EdgeFunctions', '#Supabase', '#Deno', '#ZeroCost'],
  },

  {
    id: 'p24',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Cascading Image Providers — when Plan A fails, there\'s always Plan E',
      no: 'Kaskaderende bildeleverandører — når Plan A feiler, finnes alltid Plan E',
      ua: 'Каскадні провайдери зображень — коли План A зазнає невдачі, завжди є План E',
    },
    shortDescription: {
      en: 'AI image generation is unreliable with a single provider. Cascading fallback chain (Grok -> Gemini) with per-provider analytics brought success rate from ~75% to 98%+.',
      no: 'AI-bildegenerering er upålitelig med én enkelt leverandør. Kaskaderende fallback-kjede (Grok -> Gemini) med analyse per leverandør økte suksessraten fra ~75% til 98%+.',
      ua: 'AI-генерація зображень ненадійна з одним провайдером. Каскадний ланцюг фолбеку (Grok -> Gemini) з аналітикою по провайдерах підняв успішність з ~75% до 98%+.',
    },
    problem: {
      en: 'AI image generation is unreliable. Grok has rate limits. Gemini sometimes returns inappropriate content. Together AI has quality inconsistencies. Depending on a single provider means accepting their failure rate.',
      no: 'AI-bildegenerering er upålitelig. Grok har frekvensbegrensninger. Gemini returnerer noen ganger upassende innhold. Together AI har kvalitetsinkonsistens. Å avhenge av én enkelt leverandør betyr å akseptere deres feilrate.',
      ua: 'AI-генерація зображень ненадійна. Grok має rate limits. Gemini іноді повертає неприйнятний контент. Together AI має непослідовність якості. Залежність від одного провайдера означає прийняття їхнього відсотка збоїв.',
    },
    solution: {
      en: 'Cascading order: Grok (XAI) -> Gemini (Google). Previous extended chain also included: Cloudflare FLUX -> Together AI -> Pollinations -> HuggingFace. Each provider has a 40-second timeout. image_provider_usage table tracks success/failure rates per provider per day. The admin panel shows provider statistics and allows reordering.',
      no: 'Kaskaderende rekkefølge: Grok (XAI) -> Gemini (Google). Tidligere utvidet kjede inkluderte også: Cloudflare FLUX -> Together AI -> Pollinations -> HuggingFace. Hver leverandør har 40 sekunders tidsavbrudd. image_provider_usage-tabellen sporer suksess-/feilrater per leverandør per dag. Adminpanelet viser leverandørstatistikk og tillater omorganisering.',
      ua: 'Каскадний порядок: Grok (XAI) -> Gemini (Google). Попередній розширений ланцюг також включав: Cloudflare FLUX -> Together AI -> Pollinations -> HuggingFace. Кожен провайдер має тайм-аут 40 секунд. Таблиця image_provider_usage відстежує показники успіху/невдач по провайдерах за день. Адмінка показує статистику провайдерів та дозволяє змінювати порядок.',
    },
    result: {
      en: 'Image generation success rate: 98%+ (up from ~75% with a single provider). Provider selection is data-driven — the admin panel shows which providers are performing best, enabling informed decisions about the cascade order.',
      no: 'Suksessrate for bildegenerering: 98%+ (opp fra ~75% med én leverandør). Leverandørvalg er datadrevet — adminpanelet viser hvilke leverandører som presterer best, noe som muliggjør informerte beslutninger om kaskaderekkefølgen.',
      ua: 'Успішність генерації зображень: 98%+ (з ~75% при одному провайдері). Вибір провайдерів — data-driven: адмінка показує, які провайдери працюють найкраще, дозволяючи приймати інформовані рішення щодо порядку каскаду.',
    },
    techStack: ['Grok', 'Google Gemini', 'Cloudflare AI', 'Together AI', 'HuggingFace', 'Supabase'],
    hashtags: ['#CascadingFallback', '#ImageGeneration', '#AI', '#Resilience', '#MultiProvider'],
  },

  {
    id: 'p25',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: 'Scheduled Publishing — the art of not flooding your audience',
      no: 'Planlagt publisering — kunsten å ikke oversvømme publikummet ditt',
      ua: 'Планована публікація — мистецтво не заливати свою аудиторію',
    },
    shortDescription: {
      en: 'Auto-publishing 10 articles at once floods followers. A scheduling engine with configurable windows, rate limiting, and content weight classification ensures optimal posting rhythm.',
      no: 'Å autopublisere 10 artikler på én gang oversvømmer følgere. En planleggingsmotor med konfigurerbare vinduer, frekvensbegrensning og innholdsvektklassifisering sikrer optimal publiseringsrytme.',
      ua: 'Автопублікація 10 статей одночасно заливає підписників. Планувальник із налаштовуваними вікнами, rate limiting та класифікацією ваги контенту забезпечує оптимальний ритм постингу.',
    },
    problem: {
      en: 'Auto-publishing 10 articles at once creates a wall of content that followers can\'t digest. Social media algorithms penalize rapid-fire posting. But holding articles for manual scheduling defeats the purpose of automation.',
      no: 'Å autopublisere 10 artikler på én gang skaper en vegg av innhold som følgere ikke kan fordøye. Sosiale medier-algoritmer straffer hurtigpublisering. Men å holde tilbake artikler for manuell planlegging motvirker formålet med automatisering.',
      ua: 'Автопублікація 10 статей одночасно створює стіну контенту, який підписники не можуть перетравити. Алгоритми соцмереж карають за швидкострільний постинг. Але затримання статей для ручного планування зводить нанівець мету автоматизації.',
    },
    solution: {
      en: 'schedule-publisher runs every 5 minutes via GitHub Actions. It checks for queued content, respects minimum 1-minute gaps between posts, and classifies content weight. Publishing windows prevent late-night posts. Sequential publish queue ensures LinkedIn, Instagram, and Facebook get their posts with proper spacing.',
      no: 'schedule-publisher kjører hvert 5. minutt via GitHub Actions. Den sjekker for innhold i kø, respekterer minimum 1 minutts mellomrom mellom innlegg, og klassifiserer innholdsvekt. Publiseringsvinduer forhindrer innlegg sent på natten. Sekvensiell publiseringskø sikrer at LinkedIn, Instagram og Facebook får sine innlegg med riktig mellomrom.',
      ua: 'schedule-publisher запускається кожні 5 хвилин через GitHub Actions. Перевіряє вміст у черзі, дотримується мінімальних 1-хвилинних інтервалів між постами та класифікує вагу контенту. Вікна публікації запобігають нічним постам. Послідовна черга публікацій забезпечує LinkedIn, Instagram та Facebook правильні інтервали між постами.',
    },
    result: {
      en: 'Consistent posting rhythm without manual intervention. Followers see content at digestible intervals. Algorithm-friendly posting patterns. The weight classification ensures breaking news doesn\'t wait behind a listicle.',
      no: 'Konsistent publiseringsrytme uten manuell intervensjon. Følgere ser innhold med fordøyelige mellomrom. Algoritmevennlige publiseringsmønstre. Vektklassifiseringen sikrer at siste nytt ikke venter bak en listicle.',
      ua: 'Стабільний ритм публікацій без ручного втручання. Підписники бачать контент через зручні інтервали. Алгоритмо-дружні патерни постингу. Класифікація ваги забезпечує, що breaking news не чекає за лістиклом.',
    },
    techStack: ['GitHub Actions', 'Supabase Edge Functions', 'Deno'],
    hashtags: ['#Scheduling', '#ContentManagement', '#Automation', '#SocialMedia', '#Algorithm'],
  },

  {
    id: 'p26',
    projectId: 'portfolio',
    category: 'media_production',
    title: {
      en: '3-Tier Spam Protection — because contact forms attract bots like honey',
      no: '3-lags spambeskyttelse — fordi kontaktskjemaer tiltrekker boter som honning',
      ua: '3-рівневий захист від спаму — бо контактні форми притягують ботів як мед',
    },
    shortDescription: {
      en: 'Contact form received 50+ spam submissions per day. Three invisible layers (honeypot, timestamp check, IP rate limiting) eliminated spam without CAPTCHA friction for real users.',
      no: 'Kontaktskjemaet mottok 50+ spam-innsendinger daglig. Tre usynlige lag (honeypot, tidsstempelsjekk, IP-frekvensbegrensning) eliminerte spam uten CAPTCHA-friksjon for ekte brukere.',
      ua: 'Контактна форма отримувала 50+ спам-заявок на день. Три невидимі шари (honeypot, перевірка таймстемпу, rate limiting за IP) усунули спам без CAPTCHA-тертя для реальних користувачів.',
    },
    problem: {
      en: 'The contact form on vitalii.no received 50+ spam submissions per day within the first week. Classic spam: SEO offers, casino links, crypto scams. CAPTCHA adds friction for real users.',
      no: 'Kontaktskjemaet på vitalii.no mottok 50+ spam-innsendinger per dag i løpet av den første uken. Klassisk spam: SEO-tilbud, kasinolenker, kryptosvindel. CAPTCHA legger til friksjon for ekte brukere.',
      ua: 'Контактна форма на vitalii.no отримувала 50+ спам-заявок на день протягом першого тижня. Класичний спам: SEO-пропозиції, казино-посилання, крипто-скам. CAPTCHA додає тертя для реальних користувачів.',
    },
    solution: {
      en: 'send-contact-email Edge Function checks all three layers before processing. Honeypot: a hidden field named something attractive to bots. If filled = rejected. Timestamp: form render time is stored, submission time is compared. <3 seconds between render and submit = rejected. Rate limit: IP tracked in-memory with 10-minute window.',
      no: 'send-contact-email Edge Function sjekker alle tre lag før behandling. Honeypot: et skjult felt med et botvennlig navn. Hvis utfylt = avvist. Tidsstempel: skjemaets rendretid lagres, innsendingstid sammenlignes. <3 sekunder mellom render og innsending = avvist. Frekvensbegrensning: IP sporet i minnet med 10-minutters vindu.',
      ua: 'send-contact-email Edge Function перевіряє всі три шари перед обробкою. Honeypot: приховане поле з привабливою для ботів назвою. Якщо заповнене = відхилено. Таймстемп: час рендеру форми зберігається, час відправки порівнюється. <3 секунди між рендером і відправкою = відхилено. Rate limit: IP відстежується в пам\'яті з 10-хвилинним вікном.',
    },
    result: {
      en: 'Spam dropped from 50+/day to 0-1/day. Zero false positives reported. Real users never see a CAPTCHA. The three layers catch different bot types: simple scrapers (honeypot), form-filling tools (timestamp), and persistent attackers (rate limit).',
      no: 'Spam falt fra 50+/dag til 0-1/dag. Null falske positiver rapportert. Ekte brukere ser aldri en CAPTCHA. De tre lagene fanger forskjellige bottyper: enkle skrapere (honeypot), skjemautfyllingsverktøy (tidsstempel) og vedvarende angripere (frekvensbegrensning).',
      ua: 'Спам впав з 50+/день до 0-1/день. Нуль хибних спрацювань. Реальні користувачі ніколи не бачать CAPTCHA. Три шари ловлять різні типи ботів: прості скрейпери (honeypot), інструменти заповнення форм (таймстемп) та наполегливих атакуючих (rate limit).',
    },
    techStack: ['Supabase Edge Functions', 'Deno', 'Resend API'],
    hashtags: ['#SpamProtection', '#Security', '#Honeypot', '#RateLimiting', '#ContactForm'],
  },

  // ─── CATEGORY 6: Frontend UI/UX ───────────────────────────────────────────

  {
    id: 'p27',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'BentoGrid Layout — six windows into one portfolio',
      no: 'BentoGrid-oppsett — seks vinduer inn i én portefølje',
      ua: 'BentoGrid-макет — шість вікон в одне портфоліо',
    },
    shortDescription: {
      en: 'Traditional portfolios are linear scrolls. A 6-section interactive grid where every section is a portal with unique color pairs, animations, and hover interactions.',
      no: 'Tradisjonelle porteføljer er lineære skroller. Et 6-seksjoners interaktivt rutenett der hver seksjon er en portal med unike fargepar, animasjoner og hover-interaksjoner.',
      ua: 'Традиційні портфоліо — це лінійні скроли. 6-секційна інтерактивна сітка, де кожна секція — портал з унікальними парами кольорів, анімаціями та hover-інтеракціями.',
    },
    problem: {
      en: 'Traditional portfolio websites are linear scrolls. Visitors see sections in the developer\'s order, not their own order of interest. A recruiter wants to see projects first. A designer wants to see skills. A potential client wants services.',
      no: 'Tradisjonelle porteføljesider er lineære skroller. Besøkende ser seksjoner i utviklerens rekkefølge, ikke sin egen interesserekkefølge. En rekrutterer vil se prosjekter først. En designer vil se ferdigheter. En potensiell kunde vil se tjenester.',
      ua: 'Традиційні портфоліо-сайти — це лінійні скроли. Відвідувачі бачать секції в порядку розробника, а не в порядку власних інтересів. Рекрутер хоче бачити проєкти першими. Дизайнер хоче бачити навички. Потенційний клієнт хоче бачити послуги.',
    },
    solution: {
      en: '6 sections (About, Services, Projects, Skills, News, Blog) in a CSS Grid. Each section has a unique color pair: background (40% opacity, 700ms transition) and hero text contrast. Hover triggers: HeroTextAnimation with liquid wave fill effect, section-specific child animations. 3+ second hover on Projects triggers an explosion grid. Touch-friendly on mobile via BentoGridMobile with bottom navigation.',
      no: '6 seksjoner (About, Services, Projects, Skills, News, Blog) i et CSS Grid. Hver seksjon har et unikt fargepar: bakgrunn (40% opasitet, 700ms overgang) og heltetekstkontrast. Hover utløser: HeroTextAnimation med flytende bølgefylleffekt, seksjonsspesifikke barneanimasjoner. 3+ sekunders hover på Projects utløser et eksplosjonsgitter. Berøringsvennlig på mobil via BentoGridMobile med bunnnavigasjon.',
      ua: '6 секцій (About, Services, Projects, Skills, News, Blog) у CSS Grid. Кожна секція має унікальну пару кольорів: фон (40% непрозорості, 700ms перехід) і контраст тексту hero. Hover запускає: HeroTextAnimation з ефектом рідкого хвильового заповнення, секційно-специфічні дочірні анімації. 3+ секунди hover на Projects запускає сітку вибуху. Touch-friendly на мобільному через BentoGridMobile з нижньою навігацією.',
    },
    result: {
      en: 'Average session duration is significantly higher than typical portfolio sites. The non-linear exploration keeps visitors engaged. The color system creates visual identity — each section has its own personality while maintaining cohesion.',
      no: 'Gjennomsnittlig sesjonsvarighet er betydelig høyere enn typiske porteføljesider. Den ikke-lineære utforskningen holder besøkende engasjerte. Fargesystemet skaper visuell identitet — hver seksjon har sin egen personlighet mens sammenhengen opprettholdes.',
      ua: 'Середня тривалість сесії значно вища, ніж у типових портфоліо-сайтів. Нелінійне дослідження тримає відвідувачів залученими. Кольорова система створює візуальну ідентичність — кожна секція має власну особистість, зберігаючи цілісність.',
    },
    techStack: ['Next.js', 'React', 'CSS Grid', 'GSAP', 'Framer Motion'],
    hashtags: ['#BentoGrid', '#Portfolio', '#CSS', '#Animation', '#UX'],
  },

  {
    id: 'p28',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Liquid Fill Animation — text that flows like water',
      no: 'Flytende fyllanimasjon — tekst som flyter som vann',
      ua: 'Анімація рідкого заповнення — текст, що тече як вода',
    },
    shortDescription: {
      en: 'Standard text animations are everywhere. A wave animation fills text like a glass of water, using SVG polygon clip-path with sinusoidal wave for an organic, fluid feel.',
      no: 'Standard tekstanimasjoner er overalt. En bølgeanimasjon fyller tekst som et glass vann, med SVG polygon clip-path med sinusbølge for en organisk, flytende følelse.',
      ua: 'Стандартні текстові анімації всюди. Хвильова анімація заповнює текст як склянку води, використовуючи SVG polygon clip-path з синусоїдальною хвилею для органічного, плавного відчуття.',
    },
    problem: {
      en: 'Standard text animations (fade in, slide up) are everywhere. They don\'t create memorable first impressions. The hero text needs to feel alive, not just appear.',
      no: 'Standard tekstanimasjoner (fade in, slide up) er overalt. De skaper ikke minneverdige førsteinntrykk. Helteteksten må føles levende, ikke bare dukke opp.',
      ua: 'Стандартні текстові анімації (fade in, slide up) всюди. Вони не створюють пам\'ятних перших вражень. Текст hero повинен відчуватися живим, а не просто з\'являтися.',
    },
    solution: {
      en: 'SVG polygon clip-path with dynamically calculated sinusoidal wave. requestAnimationFrame drives smooth 60fps animation. The wave offset creates the illusion of liquid surface. Fill speed: 8% per frame with easing. Glass baseline: transparent text with 0.5px stroke. Once filled: solid color with 400ms transition. Debounced: 150ms for subtitle (RTL), 300ms for description (LTR).',
      no: 'SVG polygon clip-path med dynamisk beregnet sinusbølge. requestAnimationFrame driver jevn 60fps-animasjon. Bølgeforskyvningen skaper illusjonen av en flytende overflate. Fyllhastighet: 8% per bilde med easing. Glass baseline: gjennomsiktig tekst med 0.5px strek. Når fylt: solid farge med 400ms overgang. Debounced: 150ms for undertittel (RTL), 300ms for beskrivelse (LTR).',
      ua: 'SVG polygon clip-path із динамічно обчислюваною синусоїдальною хвилею. requestAnimationFrame забезпечує плавну анімацію 60fps. Зміщення хвилі створює ілюзію рідкої поверхні. Швидкість заповнення: 8% на кадр з easing. Glass baseline: прозорий текст з 0.5px обводкою. Після заповнення: суцільний колір з 400ms переходом. Debounced: 150ms для підзаголовка (RTL), 300ms для опису (LTR).',
    },
    result: {
      en: 'Every first-time visitor notices it. The animation is subtle enough for professional context but distinctive enough to be memorable. The debounced timing means it responds to hover without flickering during quick mouse movements.',
      no: 'Hver førstegangsbesøkende legger merke til det. Animasjonen er subtil nok for profesjonell kontekst, men distinkt nok til å være minneverdig. Den debouncede timingen betyr at den reagerer på hover uten flimring under raske musebevegelser.',
      ua: 'Кожен відвідувач, який бачить це вперше, помічає. Анімація достатньо тонка для професійного контексту, але достатньо виразна, щоб запам\'ятатися. Debounced тайминг означає, що вона реагує на hover без мерехтіння при швидких рухах миші.',
    },
    techStack: ['SVG', 'CSS', 'requestAnimationFrame', 'TypeScript'],
    hashtags: ['#Animation', '#SVG', '#LiquidFill', '#CSS', '#FrontendMagic'],
  },

  {
    id: 'p29',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Projects Explosion Grid — hover for 3 seconds and everything changes',
      no: 'Prosjekter-eksplosjonsgitter — hold musepekeren i 3 sekunder og alt endres',
      ua: 'Сітка вибуху проєктів — наведи на 3 секунди і все зміниться',
    },
    shortDescription: {
      en: 'A project carousel shows one project at a time. After 3-second hover, the section explodes into a grid showing all projects simultaneously with staggered GSAP animations.',
      no: 'En prosjektkarusell viser ett prosjekt om gangen. Etter 3 sekunders hover eksploderer seksjonen inn i et rutenett som viser alle prosjekter samtidig med forskjøvede GSAP-animasjoner.',
      ua: 'Карусель проєктів показує один проєкт за раз. Після 3-секундного hover секція вибухає в сітку, показуючи всі проєкти одночасно з поетапними GSAP-анімаціями.',
    },
    problem: {
      en: 'A project carousel shows one project at a time. Visitors have to click through to discover all projects. Most won\'t click more than 2-3 times. The full portfolio remains hidden.',
      no: 'En prosjektkarusell viser ett prosjekt om gangen. Besøkende må klikke seg gjennom for å oppdage alle prosjekter. De fleste klikker ikke mer enn 2-3 ganger. Hele porteføljen forblir skjult.',
      ua: 'Карусель проєктів показує один проєкт за раз. Відвідувачам потрібно перегортати, щоб знайти всі проєкти. Більшість не кликнуть більше 2-3 разів. Повне портфоліо залишається прихованим.',
    },
    solution: {
      en: '3-second hover threshold tracked with timer. When triggered: GSAP timeline animates cards from center outward. Grid sizes adapt: 2x2 for 4 projects, 3x3 for 9, up to 4x4. Each card staggers by index * 0.05 seconds with backOut easing (slight bounce). Neon gradient backgrounds per card (5 color schemes). Progress bar shows carousel position before explosion.',
      no: '3 sekunders hover-terskel sporet med timer. Når utløst: GSAP-tidslinje animerer kort fra midten og utover. Gitterstørrelser tilpasses: 2x2 for 4 prosjekter, 3x3 for 9, opptil 4x4. Hvert kort forskyves med index * 0.05 sekunder med backOut easing (lett sprett). Neon-gradientbakgrunner per kort (5 fargetemaer). Fremdriftslinje viser karusellposisjon før eksplosjon.',
      ua: '3-секундний поріг hover відстежується таймером. Коли спрацьовує: GSAP timeline анімує карточки від центру назовні. Розміри сітки адаптуються: 2x2 для 4 проєктів, 3x3 для 9, до 4x4. Кожна карточка з\'являється з затримкою index * 0.05 секунд з easing backOut (легкий стрибок). Неонові градієнтні фони для кожної карточки (5 кольорових схем). Прогрес-бар показує позицію каруселі перед вибухом.',
    },
    result: {
      en: 'Visitors who discover the explosion effect spend more time exploring projects. The 3-second threshold prevents accidental triggers while rewarding genuine interest. The bounce easing gives a playful, premium feel.',
      no: 'Besøkende som oppdager eksplosjonseffekten bruker mer tid på å utforske prosjekter. 3-sekunders terskelen forhindrer utilsiktede utløsninger mens den belønner genuin interesse. Sprett-easingen gir en leken, premium følelse.',
      ua: 'Відвідувачі, які відкривають ефект вибуху, проводять більше часу за дослідженням проєктів. 3-секундний поріг запобігає випадковим спрацюванням, нагороджуючи справжній інтерес. Easing зі стрибком дає грайливе, преміум-відчуття.',
    },
    techStack: ['GSAP', 'React', 'CSS Grid', 'TypeScript'],
    hashtags: ['#GSAP', '#Animation', '#InteractiveUI', '#Portfolio', '#HoverEffect'],
  },

  {
    id: 'p30',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Three.js Particle Background — 200 particles, zero performance cost',
      no: 'Three.js partikkelbakgrunn — 200 partikler, null ytelseskostnad',
      ua: 'Three.js частинковий фон — 200 частинок, нуль витрат на продуктивність',
    },
    shortDescription: {
      en: 'Animated backgrounds often kill mobile performance. 200 particles with aggressive optimization (capped pixel ratio, low-power GPU, mouse tracking) maintain 60fps even on old phones.',
      no: 'Animerte bakgrunner dreper ofte mobilytelse. 200 partikler med aggressiv optimalisering (begrenset pikselforhold, laveffekts GPU, musesporing) opprettholder 60fps selv på gamle telefoner.',
      ua: 'Анімовані фони часто вбивають продуктивність на мобільних. 200 частинок з агресивною оптимізацією (обмежений pixel ratio, low-power GPU, відстеження миші) тримають 60fps навіть на старих телефонах.',
    },
    problem: {
      en: 'Static backgrounds feel dead. But animated backgrounds often kill performance — especially on mobile. Previous attempts with full particle systems (1000+ particles) caused frame drops on mid-range phones.',
      no: 'Statiske bakgrunner føles døde. Men animerte bakgrunner dreper ofte ytelsen — spesielt på mobil. Tidligere forsøk med fulle partikkelsystemer (1000+ partikler) forårsaket bildetap på mellomklassetelefoner.',
      ua: 'Статичні фони відчуваються мертвими. Але анімовані фони часто вбивають продуктивність — особливо на мобільних. Попередні спроби з повними системами частинок (1000+ частинок) викликали просідання кадрів на бюджетних телефонах.',
    },
    solution: {
      en: 'Three.js with powerPreference: \'low-power\', antialias: true, alpha: true. 200 particles (tested as the sweet spot between visual density and performance). devicePixelRatio capped at Math.min(window.devicePixelRatio, 1.5). Mouse position tracked for interactive parallax effect. prefers-reduced-motion media query disables the effect entirely for accessibility.',
      no: 'Three.js med powerPreference: \'low-power\', antialias: true, alpha: true. 200 partikler (testet som det optimale punktet mellom visuell tetthet og ytelse). devicePixelRatio begrenset til Math.min(window.devicePixelRatio, 1.5). Museposisjon sporet for interaktiv parallakseeffekt. prefers-reduced-motion medieforespørsel deaktiverer effekten helt for tilgjengelighet.',
      ua: 'Three.js з powerPreference: \'low-power\', antialias: true, alpha: true. 200 частинок (протестовано як оптимальний баланс між візуальною щільністю та продуктивністю). devicePixelRatio обмежений до Math.min(window.devicePixelRatio, 1.5). Позиція миші відстежується для інтерактивного паралакс-ефекту. Медіа-запит prefers-reduced-motion повністю вимикає ефект для доступності.',
    },
    result: {
      en: 'Consistent 60fps on all tested devices (including 5-year-old Android phones). The 200-particle count creates enough visual texture without computational waste. Mouse interaction adds a "living" quality that visitors notice subconsciously.',
      no: 'Konsistent 60fps på alle testede enheter (inkludert 5 år gamle Android-telefoner). 200-partikkeltallet skaper nok visuell tekstur uten beregningssløsing. Museinteraksjon legger til en "levende" kvalitet som besøkende legger merke til ubevisst.',
      ua: 'Стабільні 60fps на всіх протестованих пристроях (включаючи 5-річні Android-телефони). 200 частинок створюють достатню візуальну текстуру без обчислювального марнотратства. Інтеракція з мишею додає "живу" якість, яку відвідувачі помічають підсвідомо.',
    },
    techStack: ['Three.js', 'WebGL', 'React', 'TypeScript'],
    hashtags: ['#ThreeJS', '#WebGL', '#Particles', '#Performance', '#Accessibility'],
  },

  {
    id: 'p31',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Mobile App-Style Layout — a website that feels like an app',
      no: 'Mobilapp-stil oppsett — en nettside som føles som en app',
      ua: 'Мобільний макет у стилі додатку — сайт, що відчувається як додаток',
    },
    shortDescription: {
      en: 'Mobile portfolios typically shrink the desktop layout. A completely different React component with bottom navigation, swipe gestures, and safe area insets creates a native app feel.',
      no: 'Mobile porteføljer krymper vanligvis desktop-oppsettet. En helt annen React-komponent med bunnnavigasjon, sveipebevegelser og safe area-innsnitt skaper en nativ app-følelse.',
      ua: 'Мобільні портфоліо зазвичай стискають десктопний макет. Повністю інший React-компонент із нижньою навігацією, жестами свайпу та safe area insets створює відчуття нативного додатку.',
    },
    problem: {
      en: 'Mobile portfolio websites typically shrink the desktop layout. This creates tiny text, cramped sections, and frustrating navigation. The BentoGrid approach doesn\'t work on a 375px screen.',
      no: 'Mobile porteføljesider krymper vanligvis desktop-oppsettet. Dette skaper liten tekst, trange seksjoner og frustrerende navigasjon. BentoGrid-tilnærmingen fungerer ikke på en 375px-skjerm.',
      ua: 'Мобільні портфоліо-сайти зазвичай стискають десктопний макет. Це створює крихітний текст, стиснуті секції та фрустроваційну навігацію. Підхід BentoGrid не працює на 375px екрані.',
    },
    solution: {
      en: 'BentoGridMobile component with 7 screens: Home (typewriter), About (word explosion), Services (rotating icons), Projects (swipe carousel, 50px threshold), Skills (category filter + grid), News (horizontal scroll), Blog (horizontal scroll). Glassmorphism bottom nav: backdrop-filter: blur(10px), semi-transparent. env(safe-area-inset-bottom) for iPhone notch. useIsMobile() hook (SSR-safe: initial false, update on mount).',
      no: 'BentoGridMobile-komponent med 7 skjermer: Home (skrivemaskin), About (ordeksplosjon), Services (roterende ikoner), Projects (sveipekarusell, 50px terskel), Skills (kategorifilter + rutenett), News (horisontal skrolling), Blog (horisontal skrolling). Glassmorfisme bunnnavigasjon: backdrop-filter: blur(10px), halvgjennomsiktig. env(safe-area-inset-bottom) for iPhone-hakk. useIsMobile() hook (SSR-trygt: initialt false, oppdaterer ved montering).',
      ua: 'Компонент BentoGridMobile із 7 екранами: Home (друкарська машинка), About (вибух слів), Services (обертові іконки), Projects (свайп-карусель, поріг 50px), Skills (фільтр категорій + сітка), News (горизонтальний скрол), Blog (горизонтальний скрол). Glassmorphism нижня навігація: backdrop-filter: blur(10px), напівпрозора. env(safe-area-inset-bottom) для виїмки iPhone. Хук useIsMobile() (SSR-безпечний: початково false, оновлюється при монтуванні).',
    },
    result: {
      en: 'Mobile experience feels native, not adapted. Swipe gestures feel natural. Bottom navigation provides instant access to any section. Safe area handling means no content hidden behind notches or home indicators.',
      no: 'Mobilopplevelsen føles nativ, ikke tilpasset. Sveipebevegelser føles naturlige. Bunnnavigasjon gir umiddelbar tilgang til enhver seksjon. Safe area-håndtering betyr at ingen innhold skjules bak hakk eller hjemindikatorer.',
      ua: 'Мобільний досвід відчувається нативним, а не адаптованим. Жести свайпу відчуваються природно. Нижня навігація забезпечує миттєвий доступ до будь-якої секції. Обробка safe area означає, що контент не ховається за виїмками чи home-індикаторами.',
    },
    techStack: ['React', 'Next.js', 'Framer Motion', 'Tailwind CSS', 'TypeScript'],
    hashtags: ['#MobileFirst', '#PWA', '#Glassmorphism', '#SwipeGestures', '#ResponsiveDesign'],
  },

  {
    id: 'p32',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Next.js Parallel Routes Modal — seamless article browsing',
      no: 'Next.js parallellruter modal — sømløs artikkelbla',
      ua: 'Модалка на паралельних маршрутах Next.js — безшовний перегляд статей',
    },
    shortDescription: {
      en: 'Clicking a news article should show it without leaving the homepage, but the article also needs its own URL for SEO. Next.js parallel routes solve both with one component.',
      no: 'Å klikke på en nyhetsartikkel bør vise den uten å forlate hjemmesiden, men artikkelen trenger også sin egen URL for SEO. Next.js parallellruter løser begge med én komponent.',
      ua: 'Клік на новину повинен показувати її без покидання головної, але стаття також потребує власний URL для SEO. Паралельні маршрути Next.js вирішують обидві задачі одним компонентом.',
    },
    problem: {
      en: 'Clicking a news article on the homepage should show the article without leaving the page. But the article also needs its own URL for sharing and SEO. These are conflicting requirements: modal behavior (stay on page) vs page behavior (own URL).',
      no: 'Å klikke på en nyhetsartikkel på hjemmesiden bør vise artikkelen uten å forlate siden. Men artikkelen trenger også sin egen URL for deling og SEO. Dette er motstridende krav: modalatferd (bli på siden) vs sideatferd (egen URL).',
      ua: 'Клік на новину на головній повинен показувати статтю без покидання сторінки. Але стаття також потребує власний URL для шерингу та SEO. Це суперечливі вимоги: поведінка модалки (залишатися на сторінці) проти поведінки сторінки (власний URL).',
    },
    solution: {
      en: 'app/@modal/(.)news/[slug]/page.tsx intercepts the route with (.) prefix. When the homepage is the previous route, the article renders as an overlay modal with dark backdrop, close button, and scroll prevention. When navigated directly (pasted URL, search engine), the regular app/news/[slug]/page.tsx renders a full page. The article component is shared between both.',
      no: 'app/@modal/(.)news/[slug]/page.tsx fanger ruten med (.)-prefiks. Når hjemmesiden er den forrige ruten, rendres artikkelen som en overleggsmodal med mørk bakgrunn, lukkeknapp og skrollforebygging. Ved direkte navigasjon (limt URL, søkemotor) rendres vanlig app/news/[slug]/page.tsx som full side. Artikkelkomponenten deles mellom begge.',
      ua: 'app/@modal/(.)news/[slug]/page.tsx перехоплює маршрут з префіксом (.). Коли головна — попередній маршрут, стаття рендериться як оверлей-модалка з темним фоном, кнопкою закриття та блокуванням скролу. При прямій навігації (вставлений URL, пошуковик) звичайний app/news/[slug]/page.tsx рендериться як повна сторінка. Компонент статті спільний для обох.',
    },
    result: {
      en: 'Visitors browse articles without losing their place on the homepage. Shared URLs work as full pages. SEO crawlers see full pages with proper metadata. The best of both worlds — no JavaScript routing hacks, just framework-native behavior.',
      no: 'Besøkende blar gjennom artikler uten å miste sin posisjon på hjemmesiden. Delte URL-er fungerer som fulle sider. SEO-crawlere ser fulle sider med riktig metadata. Det beste fra begge verdener — ingen JavaScript-rutinghacks, bare rammeverknativ atferd.',
      ua: 'Відвідувачі переглядають статті без втрати місця на головній. Зашарені URL працюють як повні сторінки. SEO-краулери бачать повні сторінки з правильними метаданими. Найкраще з обох світів — жодних JavaScript хаків маршрутизації, лише нативна поведінка фреймворку.',
    },
    techStack: ['Next.js 15', 'React', 'App Router', 'TypeScript'],
    hashtags: ['#NextJS', '#ParallelRoutes', '#Modal', '#SEO', '#AppRouter'],
  },

  {
    id: 'p33',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Advanced Search — masonry grid with intelligent filtering',
      no: 'Avansert søk — masonry-gitter med intelligent filtrering',
      ua: 'Розширений пошук — masonry-сітка з інтелектуальною фільтрацією',
    },
    shortDescription: {
      en: 'As content grew to 200+ articles, basic text search wasn\'t enough. Full-text search with multi-filter, masonry grid, YouTube detection, and tag cloud for content discovery.',
      no: 'Etter hvert som innholdet vokste til 200+ artikler, var grunnleggende tekstsøk ikke nok. Fulltekstsøk med multifilter, masonry-gitter, YouTube-deteksjon og tag-sky for innholdsoppdagelse.',
      ua: 'Коли контент виріс до 200+ статей, базового текстового пошуку стало недостатньо. Повнотекстовий пошук із мультифільтром, masonry-сіткою, детекцією YouTube та хмарою тегів для відкриття контенту.',
    },
    problem: {
      en: 'As the content library grew to 200+ articles, finding specific content became painful. Simple text search wasn\'t enough — users needed to filter by tags, date ranges, and content types simultaneously.',
      no: 'Etter hvert som innholdsbiblioteket vokste til 200+ artikler, ble det smertefullt å finne spesifikt innhold. Enkelt tekstsøk var ikke nok — brukerne trengte å filtrere etter tagger, datoperioder og innholdstyper samtidig.',
      ua: 'Коли бібліотека контенту виросла до 200+ статей, знаходження конкретного контенту стало болісним. Простого текстового пошуку було недостатньо — користувачам потрібно було фільтрувати за тегами, діапазонами дат та типами контенту одночасно.',
    },
    solution: {
      en: 'Full-text search with 300ms debounce. Multi-filter: query + tags (multi-select) + date range + content type. Masonry grid layout with natural image dimensions. YouTube detection: getYouTubeVideoId() parses multiple URL formats, getYouTubeThumbnail() fetches hqdefault quality with play overlay. Tag cloud sized by frequency. Header search icon expands right-to-left, overlaying language buttons.',
      no: 'Fulltekstsøk med 300ms debounce. Multifilter: søk + tagger (flervalg) + datoperiode + innholdstype. Masonry-gitter med naturlige bildedimensjoner. YouTube-deteksjon: getYouTubeVideoId() parser flere URL-formater, getYouTubeThumbnail() henter hqdefault-kvalitet med avspillingsoverlegg. Tag-sky dimensjonert etter frekvens. Søkeikon i header ekspanderer høyre-til-venstre, overlegger språkknapper.',
      ua: 'Повнотекстовий пошук з 300ms debounce. Мультифільтр: запит + теги (множинний вибір) + діапазон дат + тип контенту. Masonry-сітка з природними розмірами зображень. Детекція YouTube: getYouTubeVideoId() парсить кілька форматів URL, getYouTubeThumbnail() отримує hqdefault якість з оверлеєм відтворення. Хмара тегів за частотою. Іконка пошуку в хедері розгортається справа наліво, перекриваючи кнопки мов.',
    },
    result: {
      en: 'Search page became a content discovery surface. Tag cloud reveals content patterns. Masonry grid makes browsing visually engaging. The expandable header search saves screen real estate while staying accessible.',
      no: 'Søkesiden ble en innholdsoppdagelsesflate. Tag-sky avslører innholdsmønstre. Masonry-gitteret gjør blaing visuelt engasjerende. Det utvidbare header-søket sparer skjermplass mens det forblir tilgjengelig.',
      ua: 'Сторінка пошуку стала поверхнею відкриття контенту. Хмара тегів розкриває патерни контенту. Masonry-сітка робить перегляд візуально залучаючим. Розгортаний пошук у хедері зберігає екранний простір, залишаючись доступним.',
    },
    techStack: ['Next.js', 'React', 'Supabase', 'Tailwind CSS', 'TypeScript'],
    hashtags: ['#Search', '#MasonryGrid', '#Filtering', '#TagCloud', '#ContentDiscovery'],
  },

  {
    id: 'p34',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Glassmorphism Design System — consistency through transparency',
      no: 'Glassmorfisme designsystem — konsistens gjennom gjennomsiktighet',
      ua: 'Дизайн-система Glassmorphism — консистентність через прозорість',
    },
    shortDescription: {
      en: 'Admin panel components grew organically with inconsistent styles. A glassmorphism design language applied everywhere ensures 17 components look cohesive with zero custom CSS.',
      no: 'Adminpanelkomponenter vokste organisk med inkonsistente stiler. Et glassmorfisme-designspråk brukt overalt sikrer at 17 komponenter ser sammenhengende ut med null tilpasset CSS.',
      ua: 'Компоненти адмінки зростали органічно з непослідовними стилями. Дизайн-мова glassmorphism, застосована скрізь, забезпечує цілісний вигляд 17 компонентів з нульовим кастомним CSS.',
    },
    problem: {
      en: 'Admin panel components were growing organically. Each developer (me, at different times) used slightly different card styles, shadows, and opacities. The result looked inconsistent.',
      no: 'Adminpanelkomponenter vokste organisk. Hver utvikler (meg, på forskjellige tidspunkter) brukte litt forskjellige kortstiler, skygger og opasiteter. Resultatet så inkonsistent ut.',
      ua: 'Компоненти адмінки зростали органічно. Кожен розробник (я, у різний час) використовував трохи різні стилі карточок, тіні та непрозорості. Результат виглядав непослідовно.',
    },
    solution: {
      en: 'Every admin component follows the established pattern. Cards: bg-white/10 backdrop-blur-lg rounded-xl border border-white/20. Buttons: motion.button with whileHover={{ scale: 1.05 }}. Platform colors: #0A66C2 LinkedIn, #1877F2 Facebook, #E4405F Instagram. Loading: Loader2 animate-spin. Error: bg-red-500/10 border-red-500/30. All via Tailwind utility classes — no custom CSS files.',
      no: 'Hver adminkomponent følger det etablerte mønsteret. Kort: bg-white/10 backdrop-blur-lg rounded-xl border border-white/20. Knapper: motion.button med whileHover={{ scale: 1.05 }}. Plattformfarger: #0A66C2 LinkedIn, #1877F2 Facebook, #E4405F Instagram. Lasting: Loader2 animate-spin. Feil: bg-red-500/10 border-red-500/30. Alt via Tailwind-verktøyklasser — ingen tilpassede CSS-filer.',
      ua: 'Кожен компонент адмінки слідує встановленому патерну. Карточки: bg-white/10 backdrop-blur-lg rounded-xl border border-white/20. Кнопки: motion.button з whileHover={{ scale: 1.05 }}. Кольори платформ: #0A66C2 LinkedIn, #1877F2 Facebook, #E4405F Instagram. Завантаження: Loader2 animate-spin. Помилка: bg-red-500/10 border-red-500/30. Все через Tailwind utility класи — жодних кастомних CSS-файлів.',
    },
    result: {
      en: '17 admin components with zero visual inconsistency. New components copy-paste the pattern and look native immediately. The glassmorphism aesthetic is distinctive yet professional — dark backgrounds with translucent cards create depth without distraction.',
      no: '17 adminkomponenter med null visuell inkonsistens. Nye komponenter kopierer mønsteret og ser native ut umiddelbart. Glassmorfisme-estetikken er distinkt, men profesjonell — mørke bakgrunner med gjennomskinnelige kort skaper dybde uten distraksjon.',
      ua: '17 компонентів адмінки з нульовою візуальною непослідовністю. Нові компоненти копіюють патерн і виглядають нативно одразу. Естетика glassmorphism виразна, але професійна — темні фони з напівпрозорими карточками створюють глибину без відволікання.',
    },
    techStack: ['Tailwind CSS', 'Framer Motion', 'React', 'TypeScript'],
    hashtags: ['#Glassmorphism', '#DesignSystem', '#TailwindCSS', '#AdminPanel', '#UI'],
  },

  // ─── CATEGORY 7: SEO & Analytics ───────────────────────────────────────────

  {
    id: 'p35',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Multilingual SEO — one site, three search engines',
      no: 'Flerspråklig SEO — én side, tre søkemotorer',
      ua: 'Мультимовний SEO — один сайт, три пошукові системи',
    },
    shortDescription: {
      en: 'Content in 3 languages needs explicit signals for search engines. Full hreflang implementation, multilingual sitemap, and language-specific JSON-LD schemas ensure correct indexing.',
      no: 'Innhold på 3 språk trenger eksplisitte signaler for søkemotorer. Full hreflang-implementering, flerspråklig sitemap og språkspesifikke JSON-LD-skjemaer sikrer korrekt indeksering.',
      ua: 'Контент 3 мовами потребує явних сигналів для пошукових систем. Повна реалізація hreflang, мультимовний sitemap та мовно-специфічні JSON-LD схеми забезпечують правильну індексацію.',
    },
    problem: {
      en: 'Content exists in 3 languages but search engines need explicit signals about language relationships. Without proper hreflang tags and language-specific sitemaps, Google might index the Norwegian version for English queries, or miss the Ukrainian version entirely.',
      no: 'Innhold eksisterer på 3 språk, men søkemotorer trenger eksplisitte signaler om språkrelasjoner. Uten riktige hreflang-tagger og språkspesifikke sitemaps kan Google indeksere den norske versjonen for engelske søk, eller overse den ukrainske versjonen helt.',
      ua: 'Контент існує 3 мовами, але пошукові системи потребують явних сигналів про мовні зв\'язки. Без правильних hreflang тегів та мовно-специфічних sitemap Google може індексувати норвезьку версію для англійських запитів або повністю пропустити українську версію.',
    },
    solution: {
      en: 'app/sitemap.ts generates dynamic sitemap with hreflang alternates for every article in 3 languages. Each article page has <link rel="alternate" hreflang="en|no|uk"> tags. Canonical URLs prevent duplicate content penalties. JSON-LD schemas (BlogPosting, NewsArticle) include inLanguage property. Open Graph og:locale set per language version.',
      no: 'app/sitemap.ts genererer dynamisk sitemap med hreflang-alternater for hver artikkel på 3 språk. Hver artikkelside har <link rel="alternate" hreflang="en|no|uk">-tagger. Kanoniske URL-er forhindrer duplikatinnholdsstraff. JSON-LD-skjemaer (BlogPosting, NewsArticle) inkluderer inLanguage-egenskap. Open Graph og:locale satt per språkversjon.',
      ua: 'app/sitemap.ts генерує динамічний sitemap з hreflang alternатами для кожної статті 3 мовами. Кожна сторінка статті має теги <link rel="alternate" hreflang="en|no|uk">. Канонічні URL запобігають штрафам за дублюючий контент. JSON-LD схеми (BlogPosting, NewsArticle) включають властивість inLanguage. Open Graph og:locale встановлюється для кожної мовної версії.',
    },
    result: {
      en: 'Search engines correctly index and serve language-appropriate versions. Norwegian articles appear in Norwegian Google results. Ukrainian articles surface in Ukrainian searches. No duplicate content penalties despite 3x content volume.',
      no: 'Søkemotorer indekserer og viser språkpassende versjoner korrekt. Norske artikler vises i norske Google-resultater. Ukrainske artikler dukker opp i ukrainske søk. Ingen duplikatinnholdsstraff til tross for 3x innholdsvolum.',
      ua: 'Пошукові системи правильно індексують і показують мовно-відповідні версії. Норвезькі статті з\'являються в норвезьких результатах Google. Українські статті виходять в українських пошуках. Жодних штрафів за дублюючий контент попри 3x обсяг контенту.',
    },
    techStack: ['Next.js', 'JSON-LD', 'Open Graph', 'Sitemap', 'TypeScript'],
    hashtags: ['#SEO', '#Multilingual', '#Hreflang', '#JSONLD', '#NextJS'],
  },

  {
    id: 'p36',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Dynamic OG Images — every share looks professional',
      no: 'Dynamiske OG-bilder — hver deling ser profesjonell ut',
      ua: 'Динамічні OG-зображення — кожен шер виглядає професійно',
    },
    shortDescription: {
      en: 'Shared links default to generic images. Server-side OG image generation with Next.js Satori creates branded 16:9 images per article — zero manual design work.',
      no: 'Delte lenker viser generiske bilder som standard. Serverside OG-bildegenerering med Next.js Satori lager merkevarebyggende 16:9-bilder per artikkel — null manuelt designarbeid.',
      ua: 'Зашарені посилання за замовчуванням мають загальні зображення. Серверна генерація OG-зображень з Next.js Satori створює брендовані 16:9 зображення для кожної статті — нуль ручної дизайнерської роботи.',
    },
    problem: {
      en: 'Shared links on social media default to a generic site image or no image at all. Custom OG images per article dramatically improve click-through rates, but manually creating them is unfeasible for 5-10 articles daily.',
      no: 'Delte lenker på sosiale medier viser et generisk nettstedsbilde eller ingen bilde i det hele tatt som standard. Tilpassede OG-bilder per artikkel forbedrer klikkfrekvensen dramatisk, men å manuelt opprette dem er umulig for 5-10 artikler daglig.',
      ua: 'Зашарені посилання в соцмережах за замовчуванням мають загальне зображення сайту або взагалі жодного. Кастомні OG-зображення для кожної статті різко покращують клікабельність, але ручне створення нереальне для 5-10 статей щодня.',
    },
    solution: {
      en: 'app/opengraph-image.tsx uses Next.js OG Image generation (built on Satori). Each article gets a dynamically rendered image with: article title (truncated to 2 lines), category badge, vitalii.no branding, and gradient background matching the section color. Images are cached after first generation.',
      no: 'app/opengraph-image.tsx bruker Next.js OG Image-generering (bygget på Satori). Hver artikkel får et dynamisk rendret bilde med: artikkeltittel (avkortet til 2 linjer), kategoribadge, vitalii.no-merkevarebygging og gradientbakgrunn som matcher seksjonens farge. Bilder caches etter første generering.',
      ua: 'app/opengraph-image.tsx використовує генерацію OG Image Next.js (побудовану на Satori). Кожна стаття отримує динамічно зрендерене зображення з: заголовком статті (обрізаним до 2 рядків), бейджем категорії, брендингом vitalii.no та градієнтним фоном, що відповідає кольору секції. Зображення кешуються після першої генерації.',
    },
    result: {
      en: 'Every shared link has a professional, branded image. Social media engagement on shared articles increased. Zero manual effort — the image exists the moment the article is published.',
      no: 'Hver delt lenke har et profesjonelt, merkevarebygd bilde. Engasjement i sosiale medier på delte artikler økte. Null manuell innsats — bildet eksisterer i det øyeblikket artikkelen publiseres.',
      ua: 'Кожне зашарене посилання має професійне, брендоване зображення. Залученість у соцмережах для зашарених статей зросла. Нуль ручних зусиль — зображення існує в момент публікації статті.',
    },
    techStack: ['Next.js', 'Satori', 'Open Graph', 'React', 'TypeScript'],
    hashtags: ['#OGImage', '#SEO', '#SocialMedia', '#NextJS', '#Satori'],
  },

  {
    id: 'p37',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'GTM Integration Hub — one tag, all analytics',
      no: 'GTM-integrasjonshub — én tag, all analyse',
      ua: 'GTM-хаб інтеграцій — один тег, вся аналітика',
    },
    shortDescription: {
      en: 'Four analytics platforms needed. Google Tag Manager loads once and manages GA4, Meta Pixel, LinkedIn Insight Tag, and custom events through a centralized dataLayer.',
      no: 'Fire analyseplattformer trengs. Google Tag Manager laster én gang og styrer GA4, Meta Pixel, LinkedIn Insight Tag og tilpassede hendelser gjennom en sentralisert dataLayer.',
      ua: 'Потрібні чотири аналітичні платформи. Google Tag Manager завантажується один раз і керує GA4, Meta Pixel, LinkedIn Insight Tag та кастомними подіями через централізований dataLayer.',
    },
    problem: {
      en: 'Four analytics platforms needed: GA4 (traffic), Meta Pixel (Facebook/Instagram ads), LinkedIn Insight Tag (audience insights), and custom event tracking. Installing each separately creates a maintenance nightmare and slows page load.',
      no: 'Fire analyseplattformer trengs: GA4 (trafikk), Meta Pixel (Facebook-/Instagram-annonser), LinkedIn Insight Tag (publikumsinnsikt) og tilpasset hendelsessporing. Å installere hver separat skaper et vedlikeholdsmarerritt og senker sidelastingen.',
      ua: 'Потрібні чотири аналітичні платформи: GA4 (трафік), Meta Pixel (реклама Facebook/Instagram), LinkedIn Insight Tag (інсайти аудиторії) та кастомне відстеження подій. Встановлення кожної окремо створює кошмар підтримки та сповільнює завантаження сторінки.',
    },
    solution: {
      en: '@next/third-parties GoogleTagManager component (ID: GTM-5XBL8L8S). TrackingContext provides hooks: trackPageView (automatic on route change), trackArticleView, trackShare, trackLanguageChange, trackSectionClick. Events pushed to (window as any).dataLayer to avoid Next.js type conflicts. Cookie consent gates analytics activation.',
      no: '@next/third-parties GoogleTagManager-komponent (ID: GTM-5XBL8L8S). TrackingContext tilbyr hooks: trackPageView (automatisk ved rutendring), trackArticleView, trackShare, trackLanguageChange, trackSectionClick. Hendelser pushes til (window as any).dataLayer for å unngå Next.js-typekonflikter. Cookie-samtykke styrer analyseaktivering.',
      ua: 'Компонент @next/third-parties GoogleTagManager (ID: GTM-5XBL8L8S). TrackingContext надає хуки: trackPageView (автоматичний при зміні маршруту), trackArticleView, trackShare, trackLanguageChange, trackSectionClick. Події пушаться в (window as any).dataLayer для уникнення конфліктів типів Next.js. Cookie consent контролює активацію аналітики.',
    },
    result: {
      en: 'Single script load for 4 analytics platforms. Event tracking is centralized — add one dataLayer.push() call and all platforms receive the data. GTM\'s console allows real-time debugging without code changes.',
      no: 'Én skriptlasting for 4 analyseplattformer. Hendelsessporing er sentralisert — legg til én dataLayer.push()-kall og alle plattformer mottar dataene. GTMs konsoll tillater sanntidsfeilsøking uten kodeendringer.',
      ua: 'Одне завантаження скрипта для 4 аналітичних платформ. Відстеження подій централізоване — додай один виклик dataLayer.push() і всі платформи отримують дані. Консоль GTM дозволяє дебаг у реальному часі без змін коду.',
    },
    techStack: ['Google Tag Manager', 'GA4', 'Meta Pixel', 'LinkedIn Insight Tag', 'Next.js'],
    hashtags: ['#GTM', '#Analytics', '#GA4', '#MetaPixel', '#Tracking'],
  },

  {
    id: 'p38',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Cookie Consent — Norwegian law, zero friction',
      no: 'Informasjonskapselsamtykke — norsk lov, null friksjon',
      ua: 'Cookie Consent — норвезький закон, нуль тертя',
    },
    shortDescription: {
      en: 'Norwegian ekomloven requires explicit consent for analytics cookies. A minimal, honest consent UI with no dark patterns — analytics only activate after explicit opt-in.',
      no: 'Norsk ekomlov krever eksplisitt samtykke for analyseinformasjonskapsler. Et minimalt, ærlig samtykke-UI uten mørke mønstre — analyse aktiveres kun etter eksplisitt opt-in.',
      ua: 'Норвезький ekomloven вимагає явної згоди на аналітичні cookie. Мінімальний, чесний UI згоди без dark patterns — аналітика активується лише після явного opt-in.',
    },
    problem: {
      en: 'Norwegian ekomloven requires explicit consent for analytics cookies. GDPR adds complexity. But aggressive cookie banners destroy user experience. Most visitors click "accept all" without reading — the consent is meaningless but legally required.',
      no: 'Norsk ekomlov krever eksplisitt samtykke for analyseinformasjonskapsler. GDPR legger til kompleksitet. Men aggressive informasjonskapsel-bannere ødelegger brukeropplevelsen. De fleste besøkende klikker "godta alle" uten å lese — samtykket er meningsløst, men lovpålagt.',
      ua: 'Норвезький ekomloven вимагає явної згоди на аналітичні cookie. GDPR додає складності. Але агресивні cookie-банери руйнують користувацький досвід. Більшість відвідувачів клікають "прийняти все" без читання — згода безглузда, але юридично обов\'язкова.',
    },
    solution: {
      en: 'CookieConsentContext manages state. Banner appears on first visit. Choice persisted in localStorage. Analytics (TrackingContext) checks consent before any tracking call. /informasjonskapsler page provides full cookie policy in Norwegian. GTM only fires tags when consent is granted.',
      no: 'CookieConsentContext styrer tilstand. Banner vises ved første besøk. Valg lagret i localStorage. Analyse (TrackingContext) sjekker samtykke før enhver sporingskall. /informasjonskapsler-siden gir full informasjonskapselpolicy på norsk. GTM utløser bare tagger når samtykke er gitt.',
      ua: 'CookieConsentContext керує станом. Банер з\'являється при першому відвідуванні. Вибір зберігається в localStorage. Аналітика (TrackingContext) перевіряє згоду перед будь-яким трекінговим викликом. Сторінка /informasjonskapsler надає повну політику cookie норвезькою. GTM запускає теги лише при наданні згоди.',
    },
    result: {
      en: 'Legal compliance with minimal UX impact. Banner shown once, never again after choice. Visitors who reject cookies get the full site experience minus analytics. The Norwegian-language policy page shows respect for the local audience.',
      no: 'Lovlig samsvar med minimal UX-påvirkning. Banner vist én gang, aldri igjen etter valg. Besøkende som avviser informasjonskapsler får full nettstedsopplevelse minus analyse. Den norskspråklige policysiden viser respekt for det lokale publikummet.',
      ua: 'Юридична відповідність із мінімальним впливом на UX. Банер показується один раз, ніколи більше після вибору. Відвідувачі, що відхиляють cookie, отримують повний досвід сайту мінус аналітика. Сторінка політики норвезькою мовою показує повагу до місцевої аудиторії.',
    },
    techStack: ['React', 'Next.js', 'Google Tag Manager', 'localStorage', 'TypeScript'],
    hashtags: ['#GDPR', '#CookieConsent', '#Privacy', '#Norwegian', '#Compliance'],
  },

  // ─── CATEGORY 8: DevOps & CI/CD ───────────────────────────────────────────

  {
    id: 'p39',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: '20 GitHub Actions Workflows — the invisible workforce',
      no: '20 GitHub Actions-arbeidsflyter — den usynlige arbeidsstyrken',
      ua: '20 воркфлоу GitHub Actions — невидима робоча сила',
    },
    shortDescription: {
      en: '43 Edge Functions, scheduled scraping, video processing, and social posting — all automated through 20 GitHub Actions workflows with retry logic and concurrency control.',
      no: '43 Edge Functions, planlagt skraping, videobehandling og sosial posting — alt automatisert gjennom 20 GitHub Actions-arbeidsflyter med gjenprøvingslogikk og samtidighetskontroll.',
      ua: '43 Edge Functions, заплановий скрейпінг, обробка відео та постинг у соцмережі — все автоматизовано через 20 воркфлоу GitHub Actions із retry-логікою та контролем конкуренції.',
    },
    problem: {
      en: 'The project has 43 Edge Functions, scheduled scraping every 10 minutes, video processing that takes 5+ minutes per video, and social media posting that needs retry logic. Manual deployment and triggering is unsustainable.',
      no: 'Prosjektet har 43 Edge Functions, planlagt skraping hvert 10. minutt, videobehandling som tar 5+ minutter per video, og sosial medieposting som trenger gjenprøvingslogikk. Manuell deployment og utløsning er uholdbart.',
      ua: 'Проєкт має 43 Edge Functions, запланований скрейпінг кожні 10 хвилин, обробку відео, що займає 5+ хвилин на відео, та постинг у соцмережі, що потребує retry-логіки. Ручний деплой та запуск нестійкі.',
    },
    solution: {
      en: '20 workflows covering: deployment (2), content scraping (4), video processing (3), social media video (4), content management (5), utilities (2). Patterns: MAX_RETRIES=3, RETRY_DELAY=15, only retry on 5xx errors. Concurrency groups prevent parallel runs of the same scraper. Round-robin selection for channel scraping. Batch processing for RSS (8 sources per batch).',
      no: '20 arbeidsflyter som dekker: deployment (2), innholdsskraping (4), videobehandling (3), video for sosiale medier (4), innholdsbehandling (5), verktøy (2). Mønstre: MAX_RETRIES=3, RETRY_DELAY=15, gjenprøving kun på 5xx-feil. Samtidighetsgrupper forhindrer parallelle kjøringer av samme skraper. Round-robin-utvalg for kanalskraping. Batchbehandling for RSS (8 kilder per batch).',
      ua: '20 воркфлоу, що покривають: деплой (2), скрейпінг контенту (4), обробка відео (3), відео для соцмереж (4), управління контентом (5), утиліти (2). Патерни: MAX_RETRIES=3, RETRY_DELAY=15, retry лише для 5xx помилок. Групи конкуренції запобігають паралельним запускам одного скрейпера. Round-robin вибір для скрейпінгу каналів. Пакетна обробка для RSS (8 джерел на пакет).',
    },
    result: {
      en: 'The system operates 24/7 without human intervention. Telegram channels are checked every 10 minutes. RSS feeds every 30 minutes. Videos process every 30 minutes. Social comments sync every 30 minutes. Metrics sync every 6 hours. One developer, zero ops team.',
      no: 'Systemet opererer 24/7 uten menneskelig inngripen. Telegram-kanaler sjekkes hvert 10. minutt. RSS-feeder hvert 30. minutt. Videoer behandles hvert 30. minutt. Sosiale kommentarer synkroniseres hvert 30. minutt. Metrikker synkroniseres hver 6. time. Én utvikler, null ops-team.',
      ua: 'Система працює 24/7 без людського втручання. Telegram-канали перевіряються кожні 10 хвилин. RSS-стрічки кожні 30 хвилин. Відео обробляються кожні 30 хвилин. Коментарі в соцмережах синхронізуються кожні 30 хвилин. Метрики синхронізуються кожні 6 годин. Один розробник, нуль ops-команди.',
    },
    techStack: ['GitHub Actions', 'Supabase', 'curl', 'jq', 'Bash'],
    hashtags: ['#GitHubActions', '#CICD', '#Automation', '#DevOps', '#Serverless'],
  },

  {
    id: 'p40',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Netlify via Actions Only — why auto-build is disabled',
      no: 'Netlify kun via Actions — hvorfor auto-build er deaktivert',
      ua: 'Netlify лише через Actions — чому auto-build вимкнений',
    },
    shortDescription: {
      en: 'Netlify auto-builds triggered on every push, even for Edge Function changes. Disabled auto-build and deploy exclusively through GitHub Actions for consistent environments.',
      no: 'Netlify auto-builds utløstes ved hver push, selv for Edge Function-endringer. Deaktiverte auto-build og deployer utelukkende gjennom GitHub Actions for konsistente miljøer.',
      ua: 'Netlify auto-builds спрацьовували при кожному push, навіть для змін Edge Functions. Вимкнув auto-build і деплою виключно через GitHub Actions для консистентних середовищ.',
    },
    problem: {
      en: 'Netlify\'s auto-build triggers on every push to main. But environment variables in Netlify\'s build environment sometimes differed from local, causing subtle bugs. A push to fix an Edge Function would trigger an unnecessary Netlify rebuild.',
      no: 'Netlifys auto-build utløses ved hver push til main. Men miljøvariabler i Netlifys byggemiljø var noen ganger forskjellige fra lokale, noe som forårsaket subtile feil. En push for å fikse en Edge Function ville utløse en unødvendig Netlify-ombygging.',
      ua: 'Netlify auto-build спрацьовував при кожному push до main. Але змінні середовища в build-середовищі Netlify іноді відрізнялися від локальних, що спричиняло тонкі баги. Push для фіксу Edge Function запускав непотрібний ребілд Netlify.',
    },
    solution: {
      en: 'deploy.yml runs on push to main. It builds Next.js, then deploys to Netlify using NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID. deploy-supabase.yml runs only when files in supabase/** change — it handles Edge Function deployment and migrations. The two workflows are independent.',
      no: 'deploy.yml kjører ved push til main. Den bygger Next.js, deretter deployer til Netlify med NETLIFY_AUTH_TOKEN og NETLIFY_SITE_ID. deploy-supabase.yml kjører kun når filer i supabase/** endres — den håndterer Edge Function-deployment og migrasjoner. De to arbeidsflyterene er uavhengige.',
      ua: 'deploy.yml запускається при push до main. Білдить Next.js, потім деплоїть на Netlify через NETLIFY_AUTH_TOKEN та NETLIFY_SITE_ID. deploy-supabase.yml запускається лише коли змінюються файли в supabase/** — обробляє деплой Edge Functions та міграції. Два воркфлоу незалежні.',
    },
    result: {
      en: 'No more phantom builds from Edge Function changes. Environment variables are consistent (GitHub Actions is the single source of truth). Build time saved on non-frontend changes. Deployment is predictable and debuggable.',
      no: 'Ingen flere fantombygg fra Edge Function-endringer. Miljøvariabler er konsistente (GitHub Actions er den eneste sannhetskilden). Byggetid spart på ikke-frontend-endringer. Deployment er forutsigbar og feilsøkbar.',
      ua: 'Більше жодних фантомних білдів від змін Edge Functions. Змінні середовища консистентні (GitHub Actions — єдине джерело істини). Час білду зекономлений на не-фронтенд змінах. Деплой передбачуваний і дебажний.',
    },
    techStack: ['Netlify', 'GitHub Actions', 'Next.js', 'Supabase CLI'],
    hashtags: ['#Netlify', '#GitHubActions', '#CICD', '#Deployment', '#DevOps'],
  },

  {
    id: 'p41',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Round-Robin Scraping — 6 channels, 10 minutes, zero rate limits',
      no: 'Round-robin skraping — 6 kanaler, 10 minutter, null frekvensbegrensninger',
      ua: 'Round-robin скрейпінг — 6 каналів, 10 хвилин, нуль rate limits',
    },
    shortDescription: {
      en: 'Scraping all 6 Telegram channels at once risks rate limits and timeouts. Round-robin rotates one channel per run, checking each every ~60 minutes with zero rate limit hits.',
      no: 'Å skrape alle 6 Telegram-kanaler på én gang risikerer frekvensbegrensninger og tidsavbrudd. Round-robin roterer én kanal per kjøring, sjekker hver ~60 minutter uten frekvensbegrensningstreff.',
      ua: 'Скрейпінг усіх 6 Telegram-каналів одночасно ризикує rate limits та таймаутами. Round-robin ротує один канал за запуск, перевіряючи кожен ~60 хвилин з нульовими rate limit хітами.',
    },
    problem: {
      en: 'Scraping all 6 Telegram channels every 10 minutes could trigger Telegram\'s rate limits. Batch scraping (all at once) also risks timeout — each channel might have 10+ new posts to process.',
      no: 'Å skrape alle 6 Telegram-kanaler hvert 10. minutt kan utløse Telegrams frekvensbegrensninger. Batchskraping (alle på én gang) risikerer også tidsavbrudd — hver kanal kan ha 10+ nye innlegg å behandle.',
      ua: 'Скрейпінг усіх 6 Telegram-каналів кожні 10 хвилин може спрацювати rate limits Telegram. Пакетний скрейпінг (всі одночасно) також ризикує таймаутом — кожен канал може мати 10+ нових постів для обробки.',
    },
    solution: {
      en: 'realtime-scraper.yml calculates the source index: INDEX = (minute / 10) % sourceCount. Concurrency group telegram-scraper with cancel-in-progress: false ensures only one run at a time — the next waits for the current to finish. Each run processes only one source, keeping execution time under 2 minutes.',
      no: 'realtime-scraper.yml beregner kildeindeksen: INDEX = (minutt / 10) % sourceCount. Samtidighetsgruppe telegram-scraper med cancel-in-progress: false sikrer kun én kjøring om gangen — neste venter på at den gjeldende fullføres. Hver kjøring behandler kun én kilde, og holder kjøretiden under 2 minutter.',
      ua: 'realtime-scraper.yml обчислює індекс джерела: INDEX = (хвилина / 10) % sourceCount. Група конкуренції telegram-scraper з cancel-in-progress: false забезпечує лише один запуск одночасно — наступний чекає завершення поточного. Кожен запуск обробляє лише одне джерело, тримаючи час виконання під 2 хвилини.',
    },
    result: {
      en: 'Zero rate limit hits from Telegram. Each channel is checked every ~60 minutes (with 6 channels). Execution time is predictable and short. The concurrency guard prevents overlapping runs during slow network conditions.',
      no: 'Null frekvensbegrensningstreff fra Telegram. Hver kanal sjekkes hver ~60 minutter (med 6 kanaler). Kjøretid er forutsigbar og kort. Samtidighetsvakten forhindrer overlappende kjøringer under trege nettverksforhold.',
      ua: 'Нуль хітів rate limit від Telegram. Кожен канал перевіряється кожні ~60 хвилин (при 6 каналах). Час виконання передбачуваний і короткий. Захист конкуренції запобігає перетинанню запусків при повільних мережевих умовах.',
    },
    techStack: ['GitHub Actions', 'Telegram Bot API', 'MTKruto', 'Bash'],
    hashtags: ['#RoundRobin', '#Scraping', '#RateLimiting', '#GitHubActions', '#Telegram'],
  },

  {
    id: 'p42',
    projectId: 'portfolio',
    category: 'devops_infra',
    title: {
      en: 'Retry Logic Pattern — because APIs fail on Tuesdays',
      no: 'Gjenprøvingslogikkmønster — fordi API-er feiler på tirsdager',
      ua: 'Патерн retry-логіки — бо API падають по вівторках',
    },
    shortDescription: {
      en: 'External APIs occasionally return 5xx errors. Standardized retry pattern across all workflows: 3 attempts, 15-second delay, only on 5xx (not 4xx client errors).',
      no: 'Eksterne API-er returnerer av og til 5xx-feil. Standardisert gjenprøvingsmønster på tvers av alle arbeidsflyter: 3 forsøk, 15 sekunders forsinkelse, kun ved 5xx (ikke 4xx klientfeil).',
      ua: 'Зовнішні API іноді повертають 5xx помилки. Стандартизований патерн retry у всіх воркфлоу: 3 спроби, 15-секундна затримка, лише для 5xx (не 4xx клієнтських помилок).',
    },
    problem: {
      en: 'External APIs (Supabase Edge Functions, social media APIs, AI providers) occasionally return 5xx errors. A single failure shouldn\'t break the entire pipeline.',
      no: 'Eksterne API-er (Supabase Edge Functions, sosiale medie-API-er, AI-leverandører) returnerer av og til 5xx-feil. En enkelt feil bør ikke bryte hele pipelinen.',
      ua: 'Зовнішні API (Supabase Edge Functions, API соцмереж, AI-провайдери) іноді повертають 5xx помилки. Одна помилка не повинна ламати весь пайплайн.',
    },
    solution: {
      en: 'Standardized across all workflows: 3 attempts maximum, 15-second delay between retries, only retry on 5xx errors (4xx are client errors — retrying won\'t help). curl -w "\\n%{http_code}" captures both body and status code. Response parsed with jq for structured error reporting.',
      no: 'Standardisert på tvers av alle arbeidsflyter: maks 3 forsøk, 15 sekunders forsinkelse mellom gjenprøvinger, gjenprøving kun ved 5xx-feil (4xx er klientfeil — gjenprøving hjelper ikke). curl -w "\\n%{http_code}" fanger både kropp og statuskode. Respons parset med jq for strukturert feilrapportering.',
      ua: 'Стандартизовано у всіх воркфлоу: максимум 3 спроби, 15-секундна затримка між retry, retry лише для 5xx помилок (4xx — клієнтські помилки, retry не допоможе). curl -w "\\n%{http_code}" захоплює і тіло, і статус-код. Відповідь парситься jq для структурованого звітування про помилки.',
    },
    result: {
      en: 'Transient API failures are handled automatically. The 5xx-only retry policy prevents infinite loops on permanent errors. 15-second delay gives the remote service time to recover. 95%+ of retried requests succeed on the second attempt.',
      no: 'Forbigående API-feil håndteres automatisk. 5xx-kun gjenprøvingspolicyen forhindrer uendelige løkker ved permanente feil. 15 sekunders forsinkelse gir den eksterne tjenesten tid til å gjenopprette. 95%+ av gjenprøvde forespørsler lykkes på andre forsøk.',
      ua: 'Тимчасові збої API обробляються автоматично. Retry-політика лише для 5xx запобігає нескінченним циклам при постійних помилках. 15-секундна затримка дає віддаленому сервісу час на відновлення. 95%+ повторених запитів успішні з другої спроби.',
    },
    techStack: ['GitHub Actions', 'curl', 'jq', 'Bash'],
    hashtags: ['#RetryLogic', '#ErrorHandling', '#DevOps', '#Resilience', '#CICD'],
  },

  // ─── CATEGORY 9: Admin Panel ───────────────────────────────────────────────

  {
    id: 'p43',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: '10-Tab Dashboard — command center for one-person media operations',
      no: '10-faners dashboard — kommandosenter for én-persons medieoperasjoner',
      ua: '10-вкладковий дашборд — командний центр для медіаоперацій однієї людини',
    },
    shortDescription: {
      en: 'Managing multi-platform content operations requires jumping between Telegram, Supabase, GitHub, and social apps. One dashboard with 10 tabs replaces them all.',
      no: 'Å administrere flerplattforms innholdsoperasjoner krever hopping mellom Telegram, Supabase, GitHub og sosiale apper. Ett dashboard med 10 faner erstatter dem alle.',
      ua: 'Керування мультиплатформними контент-операціями вимагає перемикання між Telegram, Supabase, GitHub та соціальними додатками. Один дашборд з 10 вкладками замінює їх усі.',
    },
    problem: {
      en: 'Managing a multi-platform content operation requires jumping between: Telegram (moderation), Supabase (database), GitHub (deployments), LinkedIn/Facebook/Instagram (social), and multiple AI services. Context switching kills productivity.',
      no: 'Å administrere en flerplattforms innholdsoperasjon krever hopping mellom: Telegram (moderering), Supabase (database), GitHub (deployments), LinkedIn/Facebook/Instagram (sosiale), og flere AI-tjenester. Kontekstbytte dreper produktivitet.',
      ua: 'Керування мультиплатформними контент-операціями вимагає перемикання між: Telegram (модерація), Supabase (база даних), GitHub (деплої), LinkedIn/Facebook/Instagram (соцмережі) та кількома AI-сервісами. Переключення контексту вбиває продуктивність.',
    },
    solution: {
      en: '10 tabs: Overview (stats + monitoring), Queue (pending moderation), News (CRUD), Blog (CRUD), Monitor (4-tier RSS), Social (post tracking), Analytics (engagement metrics), Comments (cross-platform), Skills (drag & drop), Settings (9 sub-tabs for sources, prompts, images, API keys, accounts, scheduling, automation, tags, debug).',
      no: '10 faner: Oversikt (statistikk + overvåking), Kø (ventende moderering), Nyheter (CRUD), Blogg (CRUD), Monitor (4-nivås RSS), Sosialt (innleggssporing), Analyse (engasjementsmetrikker), Kommentarer (kryssplattform), Ferdigheter (dra og slipp), Innstillinger (9 underfaner for kilder, prompter, bilder, API-nøkler, kontoer, planlegging, automatisering, tagger, feilsøking).',
      ua: '10 вкладок: Огляд (статистика + моніторинг), Черга (очікуючі на модерацію), Новини (CRUD), Блог (CRUD), Монітор (4-рівневий RSS), Соціальне (відстеження постів), Аналітика (метрики залученості), Коментарі (крос-платформні), Навички (drag & drop), Налаштування (9 підвкладок для джерел, промптів, зображень, API-ключів, акаунтів, планування, автоматизації, тегів, дебагу).',
    },
    result: {
      en: 'All daily operations happen in one browser tab. Morning routine: check Overview for overnight activity, scan Queue for pending articles, glance at Analytics for engagement trends. The collapsible sidebar maximizes screen real estate. Each tab loads independently — no monolithic data fetch.',
      no: 'Alle daglige operasjoner skjer i én nettleserfane. Morgenrutine: sjekk Oversikt for nattlig aktivitet, skann Kø for ventende artikler, se på Analyse for engasjementstrender. Den sammenleggbare sidefeltet maksimerer skjermplassen. Hver fane laster uavhengig — ingen monolittisk datahenting.',
      ua: 'Усі щоденні операції відбуваються в одній вкладці браузера. Ранкова рутина: перевірити Огляд на нічну активність, переглянути Чергу на очікуючі статті, глянути Аналітику на тренди залученості. Складана бокова панель максимізує екранний простір. Кожна вкладка завантажується незалежно — без монолітного отримання даних.',
    },
    techStack: ['React', 'Next.js', 'Supabase', 'Tailwind CSS', 'Framer Motion'],
    hashtags: ['#AdminPanel', '#Dashboard', '#ContentManagement', '#React', '#UX'],
  },

  {
    id: 'p44',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: '4-Tier RSS Monitor — not all sources are created equal',
      no: '4-nivås RSS-monitor — ikke alle kilder er skapt like',
      ua: '4-рівневий RSS-монітор — не всі джерела створені рівними',
    },
    shortDescription: {
      en: '26+ RSS feeds have wildly different quality. A tier system (Critical, High, Medium, Low) with drag-and-drop management and per-tier processing priority keeps high-value content surfacing first.',
      no: '26+ RSS-feeder har vilt forskjellig kvalitet. Et nivåsystem (Kritisk, Høy, Medium, Lav) med dra-og-slipp-administrasjon og prioritet per nivå holder høyverdi-innhold synlig først.',
      ua: '26+ RSS-стрічок мають дуже різну якість. Система рівнів (Критичний, Високий, Середній, Низький) із drag-and-drop керуванням та пріоритетом обробки по рівнях тримає якісний контент на поверхні.',
    },
    problem: {
      en: '26+ RSS feeds have wildly different qualities and publication frequencies. Treating them equally means high-value sources (Reuters, TechCrunch) compete for attention with low-quality content mills.',
      no: '26+ RSS-feeder har vilt forskjellige kvaliteter og publiseringsfrekvenser. Å behandle dem likt betyr at høykvalitetskilder (Reuters, TechCrunch) konkurrerer om oppmerksomhet med lavkvalitets innholdsfabrikker.',
      ua: '26+ RSS-стрічок мають дуже різну якість та частоту публікацій. Рівне ставлення означає, що джерела високої якості (Reuters, TechCrunch) конкурують за увагу з контент-фабриками низької якості.',
    },
    solution: {
      en: 'NewsMonitorManager component with 4 color-coded tier columns (Red, Orange, Yellow, Gray). Drag-and-drop sources between tiers. monitor-rss-sources Edge Function processes tiers with different batch sizes and priorities. Tier 1 sources are always in the first batch. Admin can toggle pre-moderation per source. Real-time article previews within each tier column.',
      no: 'NewsMonitorManager-komponent med 4 fargekodede nivåkolonner (Rød, Oransje, Gul, Grå). Dra og slipp kilder mellom nivåer. monitor-rss-sources Edge Function behandler nivåer med forskjellige batchstørrelser og prioriteter. Nivå 1-kilder er alltid i den første batchen. Admin kan toggle forhåndsmoderering per kilde. Sanntids artikkelforhåndsvisninger innenfor hver nivåkolonne.',
      ua: 'Компонент NewsMonitorManager із 4 кольорово-кодованими колонками рівнів (Червоний, Помаранчевий, Жовтий, Сірий). Drag-and-drop джерел між рівнями. Edge Function monitor-rss-sources обробляє рівні з різними розмірами пакетів та пріоритетами. Джерела Рівня 1 завжди в першому пакеті. Адмін може перемикати премодерацію для кожного джерела. Прев\'ю статей у реальному часі в кожній колонці рівня.',
    },
    result: {
      en: 'High-value content surfaces immediately. Low-priority sources don\'t create noise. The drag-and-drop interface makes tier management intuitive. New sources start at Tier 4 and graduate upward based on content quality.',
      no: 'Høyverdi-innhold dukker opp umiddelbart. Lavprioritetskilder skaper ikke støy. Dra-og-slipp-grensesnittet gjør nivåadministrasjon intuitiv. Nye kilder starter på Nivå 4 og rykker opp basert på innholdskvalitet.',
      ua: 'Якісний контент з\'являється негайно. Низькопріоритетні джерела не створюють шуму. Інтерфейс drag-and-drop робить керування рівнями інтуїтивним. Нові джерела починають на Рівні 4 і просуваються вгору на основі якості контенту.',
    },
    techStack: ['React', 'Supabase', 'Framer Motion', 'Tailwind CSS', 'TypeScript'],
    hashtags: ['#RSS', '#ContentCuration', '#TierSystem', '#AdminPanel', '#DragAndDrop'],
  },

  {
    id: 'p45',
    projectId: 'portfolio',
    category: 'frontend_ux',
    title: {
      en: 'Skills Manager — your tech stack, your order',
      no: 'Ferdighetsbehandler — din tech stack, din rekkefølge',
      ua: 'Менеджер навичок — твій tech stack, твій порядок',
    },
    shortDescription: {
      en: 'Portfolio skills need to be easily reorderable for different contexts. Drag-and-drop with Framer Motion, SimpleIcons CDN logos, category colors, and localStorage persistence.',
      no: 'Porteføljeferdigheter må enkelt kunne omorganiseres for ulike kontekster. Dra-og-slipp med Framer Motion, SimpleIcons CDN-logoer, kategorifargeri og localStorage-persistens.',
      ua: 'Навички портфоліо мають легко переупорядковуватися для різних контекстів. Drag-and-drop з Framer Motion, логотипи SimpleIcons CDN, кольори категорій та збереження в localStorage.',
    },
    problem: {
      en: 'Portfolio skills section needs to be easily reorderable. Different contexts call for different skill ordering — when applying for a React job, React should be first. For a DevOps role, cloud skills should lead.',
      no: 'Porteføljens ferdighetsseksjon må enkelt kunne omorganiseres. Ulike kontekster krever ulik ferdighetsrekkefølge — når du søker en React-jobb, bør React være først. For en DevOps-rolle bør skybaserte ferdigheter lede.',
      ua: 'Секція навичок портфоліо повинна легко переупорядковуватися. Різні контексти вимагають різного порядку навичок — при подачі на React-позицію, React має бути першим. Для DevOps-ролі хмарні навички мають лідирувати.',
    },
    solution: {
      en: 'Framer Motion Reorder component for smooth drag animations. 6 category colors: development (green), UI (purple), automation (blue), AI (orange), marketing (pink), integration (cyan). SimpleIcons CDN for tech logos (cdn.simpleicons.org/[name]). localStorage key: vitalii_skills_list. No authentication needed — it\'s the visitor\'s own portfolio view customization.',
      no: 'Framer Motion Reorder-komponent for jevne dra-animasjoner. 6 kategorifargeri: utvikling (grønn), UI (lilla), automatisering (blå), AI (oransje), markedsføring (rosa), integrasjon (cyan). SimpleIcons CDN for teknologilogoer (cdn.simpleicons.org/[name]). localStorage-nøkkel: vitalii_skills_list. Ingen autentisering nødvendig — det er besøkendes egen porteføljevisnings-tilpasning.',
      ua: 'Компонент Framer Motion Reorder для плавних drag-анімацій. 6 кольорів категорій: розробка (зелений), UI (фіолетовий), автоматизація (синій), AI (помаранчевий), маркетинг (рожевий), інтеграція (бірюзовий). SimpleIcons CDN для технологічних логотипів (cdn.simpleicons.org/[name]). Ключ localStorage: vitalii_skills_list. Автентифікація не потрібна — це кастомізація перегляду портфоліо самого відвідувача.',
    },
    result: {
      en: 'Skill reordering takes 2 seconds of dragging. Icons provide instant recognition. Category colors group related skills visually. The localStorage approach means zero API calls for this purely presentational feature.',
      no: 'Ferdighetsomorganisering tar 2 sekunder med dra. Ikoner gir umiddelbar gjenkjennelse. Kategorifargeri grupperer relaterte ferdigheter visuelt. localStorage-tilnærmingen betyr null API-kall for denne rent presentasjonsmessige funksjonen.',
      ua: 'Переупорядкування навичок займає 2 секунди перетягування. Іконки дають миттєве розпізнавання. Кольори категорій візуально групують пов\'язані навички. Підхід localStorage означає нуль API-викликів для цієї чисто презентаційної функції.',
    },
    techStack: ['Framer Motion', 'React', 'SimpleIcons', 'localStorage', 'TypeScript'],
    hashtags: ['#DragAndDrop', '#FramerMotion', '#Skills', '#Portfolio', '#localStorage'],
  },

  // ─── CATEGORY 10: Internationalization ─────────────────────────────────────

  {
    id: 'p46',
    projectId: 'portfolio',
    category: 'other',
    title: {
      en: '3-Language Content Pipeline — one article enters, three emerge',
      no: '3-språks innholdspipeline — én artikkel inn, tre ut',
      ua: '3-мовний контент-пайплайн — одна стаття входить, три виходять',
    },
    shortDescription: {
      en: 'Three audiences expect native-quality content. AI rewrites (not translates) each article with language-specific prompts for tone, style, and cultural context.',
      no: 'Tre målgrupper forventer innhold av morsmålskvalitet. AI omskriver (ikke oversetter) hver artikkel med språkspesifikke prompter for tone, stil og kulturell kontekst.',
      ua: 'Три аудиторії очікують контент рідної якості. AI переписує (а не перекладає) кожну статтю з мовно-специфічними промптами для тону, стилю та культурного контексту.',
    },
    problem: {
      en: 'The portfolio serves three distinct audiences: international tech community (English), Norwegian professionals (Norwegian), and Ukrainian diaspora (Ukrainian). Each audience expects native-quality content, not machine translations.',
      no: 'Porteføljen betjener tre distinkte målgrupper: internasjonalt teknologisamfunn (engelsk), norske fagfolk (norsk) og ukrainsk diaspora (ukrainsk). Hver målgruppe forventer innhold av morsmålskvalitet, ikke maskinoversettelser.',
      ua: 'Портфоліо обслуговує три різні аудиторії: міжнародну техспільноту (англійська), норвезьких професіоналів (норвезька) та українську діаспору (українська). Кожна аудиторія очікує контент рідної якості, а не машинні переклади.',
    },
    solution: {
      en: 'Database stores separate fields per language: title_en/no/ua, content_en/no/ua, description_en/no/ua, slug_en/no/ua. process-news Edge Function rewrites the original article using language-specific prompts from ai_prompts table. TranslationContext on the frontend manages language state with 143+ translation keys. Hreflang tags connect all three versions for SEO. Language selector in header with flag indicators.',
      no: 'Database lagrer separate felt per språk: title_en/no/ua, content_en/no/ua, description_en/no/ua, slug_en/no/ua. process-news Edge Function omskriver den originale artikkelen ved bruk av språkspesifikke prompter fra ai_prompts-tabellen. TranslationContext på frontend styrer språktilstand med 143+ oversettelsesnøkler. Hreflang-tagger kobler alle tre versjoner for SEO. Språkvelger i header med flaggindikatorer.',
      ua: 'База даних зберігає окремі поля для кожної мови: title_en/no/ua, content_en/no/ua, description_en/no/ua, slug_en/no/ua. Edge Function process-news переписує оригінальну статтю, використовуючи мовно-специфічні промпти з таблиці ai_prompts. TranslationContext на фронтенді керує мовним станом із 143+ ключами перекладу. Теги hreflang з\'єднують усі три версії для SEO. Селектор мови в хедері з індикаторами прапорців.',
    },
    result: {
      en: 'Three complete content ecosystems from one editorial effort. Each language version reads naturally — not like a translated document. The shared slug structure (slug_en, slug_no, slug_ua) enables cross-language navigation without URL hacks.',
      no: 'Tre komplette innholdsøkosystemer fra én redaksjonell innsats. Hver språkversjon leses naturlig — ikke som et oversatt dokument. Den delte slug-strukturen (slug_en, slug_no, slug_ua) muliggjør kryssspråklig navigasjon uten URL-hacks.',
      ua: 'Три повних контентних екосистеми з одного редакційного зусилля. Кожна мовна версія читається природно — а не як перекладений документ. Спільна slug-структура (slug_en, slug_no, slug_ua) забезпечує міжмовну навігацію без URL-хаків.',
    },
    techStack: ['Supabase', 'Azure OpenAI', 'Next.js', 'React', 'TypeScript'],
    hashtags: ['#Internationalization', '#i18n', '#Multilingual', '#ContentPipeline', '#AI'],
  },

  {
    id: 'p47',
    projectId: 'portfolio',
    category: 'other',
    title: {
      en: 'Auto Norway Detection — the algorithm that knows what Norwegians want',
      no: 'Auto Norge-deteksjon — algoritmen som vet hva nordmenn vil ha',
      ua: 'Автовизначення Норвегії — алгоритм, який знає, чого хочуть норвежці',
    },
    shortDescription: {
      en: 'Some RSS articles are Norway-focused but manually detecting this adds another decision. AI detects Norwegian companies, cities, and cultural markers to auto-suggest Norwegian-first publication.',
      no: 'Noen RSS-artikler er Norges-fokuserte, men manuell deteksjon legger til en ekstra beslutning. AI oppdager norske selskaper, byer og kulturelle markører for å auto-foreslå norskførst-publisering.',
      ua: 'Деякі RSS-статті фокусуються на Норвегії, але ручне визначення цього додає ще одне рішення. AI визначає норвезькі компанії, міста та культурні маркери для автопропозиції публікації норвезькою першою.',
    },
    problem: {
      en: 'Some RSS sources publish Norwegian-focused articles (Equinor news, Oslo tech scene, Nordics policy). These should be published in Norwegian first, not English. But manually detecting which articles are "Norwegian relevant" adds another decision to the moderation pipeline.',
      no: 'Noen RSS-kilder publiserer Norge-fokuserte artikler (Equinor-nyheter, Oslo-teknologiscenen, nordisk politikk). Disse bør publiseres på norsk først, ikke engelsk. Men å manuelt oppdage hvilke artikler som er "Norges-relevante" legger til en ekstra beslutning i modereringspipelinen.',
      ua: 'Деякі RSS-джерела публікують статті, орієнтовані на Норвегію (новини Equinor, техсцена Осло, політика Нордиків). Вони мають публікуватися норвезькою першою, а не англійською. Але ручне визначення, які статті "релевантні для Норвегії", додає ще одне рішення до пайплайну модерації.',
    },
    solution: {
      en: 'During pre-moderation, the AI checks for Norway-relevant signals: company names (Equinor, Telenor, DNB), locations (Oslo, Bergen, Stavanger, Tromsoe), policy references (Stortinget, NAV, arbeidsmiljoloven), and cultural markers. When detected, the article is pre-flagged as language_suggestion: \'no\'. Telegram bot shows "Norwegian detected" badge and pre-selects NO language for publishing.',
      no: 'Under forhåndsmoderering sjekker AI for Norge-relevante signaler: selskapsnavn (Equinor, Telenor, DNB), steder (Oslo, Bergen, Stavanger, Tromsø), policyreferanser (Stortinget, NAV, arbeidsmiljøloven) og kulturelle markører. Når oppdaget, forhåndsflagges artikkelen som language_suggestion: \'no\'. Telegram-bot viser "Norsk oppdaget"-merke og forhåndsvelger NO-språk for publisering.',
      ua: 'Під час премодерації AI перевіряє сигнали, релевантні для Норвегії: назви компаній (Equinor, Telenor, DNB), локації (Oslo, Bergen, Stavanger, Tromsoe), посилання на політику (Stortinget, NAV, arbeidsmiljoloven) та культурні маркери. Коли виявлено, стаття попередньо позначається як language_suggestion: \'no\'. Telegram-бот показує бейдж "Виявлено норвезьку" та попередньо обирає мову NO для публікації.',
    },
    result: {
      en: 'Norwegian-relevant content is identified and published in the right language automatically. The Norwegian audience sees relevant content faster. The AI detection catches subtle Norway connections that keyword matching would miss.',
      no: 'Norges-relevant innhold identifiseres og publiseres på riktig språk automatisk. Det norske publikummet ser relevant innhold raskere. AI-deteksjonen fanger opp subtile Norge-koblinger som nøkkelordmatching ville ha oversett.',
      ua: 'Контент, релевантний для Норвегії, ідентифікується та публікується правильною мовою автоматично. Норвезька аудиторія бачить релевантний контент швидше. AI-детекція ловить тонкі зв\'язки з Норвегією, які пошук за ключовими словами пропустив би.',
    },
    techStack: ['Azure OpenAI', 'Supabase Edge Functions', 'Telegram Bot API', 'Deno'],
    hashtags: ['#AI', '#LanguageDetection', '#Norway', '#ContentPipeline', '#Localization'],
  },

  {
    id: 'p48',
    projectId: 'portfolio',
    category: 'other',
    title: {
      en: 'Social Analytics Dashboard — Shield App for free',
      no: 'Sosial analysedashboard — Shield App gratis',
      ua: 'Дашборд аналітики соцмереж — Shield App безкоштовно',
    },
    shortDescription: {
      en: 'Shield App costs $25/month for LinkedIn analytics. Built the same dashboard inside the admin panel using existing data infrastructure — with period comparison, CSV export, and multi-platform support.',
      no: 'Shield App koster $25/mnd for LinkedIn-analyse. Bygget det samme dashboardet inne i adminpanelet ved bruk av eksisterende datainfrastruktur — med periodesammenligning, CSV-eksport og flerplattformstøtte.',
      ua: 'Shield App коштує $25/місяць за аналітику LinkedIn. Побудував той самий дашборд в адмінці, використовуючи існуючу інфраструктуру даних — із порівнянням періодів, CSV-експортом та мультиплатформною підтримкою.',
    },
    problem: {
      en: 'Shield App ($25/month) tracks LinkedIn analytics: impressions, engagement rates, follower growth, content performance. I already have all the posting data flowing through my system. Paying $25/month for charts on data I already own feels wrong.',
      no: 'Shield App ($25/mnd) sporer LinkedIn-analyse: visninger, engasjementsrater, følgervekst, innholdsytelse. Jeg har allerede alle postingdata som flyter gjennom systemet mitt. Å betale $25/mnd for diagrammer over data jeg allerede eier føles feil.',
      ua: 'Shield App ($25/місяць) відстежує аналітику LinkedIn: покази, рівні залученості, зростання підписників, ефективність контенту. Усі дані постингу вже проходять через мою систему. Платити $25/місяць за графіки даних, які я вже маю, відчувається неправильно.',
    },
    solution: {
      en: 'sync-social-metrics Edge Function fetches post insights from Facebook Graph API (/{post_id}/insights) and Instagram Media API (/{media_id}/insights). Metrics: impressions, reach, likes, comments, shares, saves. follower_history table tracks daily follower counts. analytics_snapshots table aggregates daily metrics. Dashboard: 6 summary cards with % changes, engagement-over-time line chart, top posts ranking (sortable), platform comparison bars, follower growth chart, posting frequency bars, CSV export.',
      no: 'sync-social-metrics Edge Function henter innleggsinnsikt fra Facebook Graph API (/{post_id}/insights) og Instagram Media API (/{media_id}/insights). Metrikker: visninger, rekkevidde, likes, kommentarer, delinger, lagringer. follower_history-tabellen sporer daglige følgertall. analytics_snapshots-tabellen aggregerer daglige metrikker. Dashboard: 6 sammendragskort med %-endringer, engasjement-over-tid linjediagram, topp-innlegg-rangering (sorterbar), plattformsammenligningssøyler, følgervekstdiagram, publiseringsfrekvensssøyler, CSV-eksport.',
      ua: 'Edge Function sync-social-metrics забирає інсайти постів із Facebook Graph API (/{post_id}/insights) та Instagram Media API (/{media_id}/insights). Метрики: покази, охоплення, лайки, коментарі, шери, збереження. Таблиця follower_history відстежує щоденну кількість підписників. Таблиця analytics_snapshots агрегує щоденні метрики. Дашборд: 6 карточок зведення з % змінами, лінійний графік залученості в часі, рейтинг топ-постів (сортований), стовпчики порівняння платформ, графік зростання підписників, стовпчики частоти публікацій, CSV-експорт.',
    },
    result: {
      en: 'Full analytics dashboard at $0/month. Currently tracking Facebook and Instagram with real data. LinkedIn stubbed for when Community Management API access arrives. Period comparison (7D/30D/90D/YTD) shows trends. CSV export provides data for external reporting.',
      no: 'Fullverdig analysedashboard til $0/mnd. Sporer for tiden Facebook og Instagram med ekte data. LinkedIn stubbet for når Community Management API-tilgang kommer. Periodesammenligning (7D/30D/90D/YTD) viser trender. CSV-eksport gir data for ekstern rapportering.',
      ua: 'Повний дашборд аналітики за $0/місяць. Наразі відстежує Facebook та Instagram із реальними даними. LinkedIn заглушений до отримання доступу до Community Management API. Порівняння періодів (7D/30D/90D/YTD) показує тренди. CSV-експорт надає дані для зовнішньої звітності.',
    },
    techStack: ['Facebook Graph API', 'Instagram API', 'Recharts', 'Supabase', 'React'],
    hashtags: ['#Analytics', '#Dashboard', '#ShieldApp', '#ZeroCost', '#SocialMedia'],
  },
];
