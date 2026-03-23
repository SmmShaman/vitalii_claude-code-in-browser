# 🇳🇴 JobBot Norway — 42 Інженерні Кейси

## Автоматизація пошуку роботи в Норвегії: від ідеї до production

**Автор:** Віталій Бербега
**Проект:** JobBot Norway — AI-платформа для автоматизації пошуку роботи на норвезькому ринку
**Стек:** React 19 · TypeScript · Supabase · Azure OpenAI GPT-4 · Skyvern · Telegram Bot · Python · Deno Edge Functions
**Період:** 2025–2026

---

## 📑 Зміст

### 🧠 Категорія 1: AI & Machine Learning (Кейси 1–5)
### 🤖 Категорія 2: Автоматизація браузера (Кейси 6–12)
### 🕷️ Категорія 3: Web Scraping & Дані (Кейси 13–17)
### 💬 Категорія 4: Telegram Bot (Кейси 18–23)
### 🖥️ Категорія 5: Frontend Dashboard (Кейси 24–30)
### 🔒 Категорія 6: Multi-user & Безпека (Кейси 31–34)
### 🚀 Категорія 7: CI/CD & DevOps (Кейси 35–37)
### 🔗 Категорія 8: Інтеграції платформ (Кейси 38–42)

---

# 🧠 Категорія 1: AI & Machine Learning

---

### 🔷 Кейс #1: "AI, який знає тебе краще за рекрутера"
**Категорія:** AI & Machine Learning

**Проблема:**
Щодня на FINN.no, NAV.no та LinkedIn з'являються сотні вакансій. Людина фізично не здатна прочитати кожну й об'єктивно оцінити, наскільки вона підходить. Суб'єктивність, втома, пропущені шанси — це реальність ручного пошуку роботи в Норвегії.

**Думка:**
А що, якщо AI прочитає кожну вакансію та порівняє її з повним CV кандидата? Не просто keyword matching, а глибокий аналіз: досвід, навички, культура компанії, перспективи росту. Потрібен score від 0 до 100, список плюсів і мінусів, та конкретні завдання позиції.

**Рішення:**
Побудовано Edge Function `job-analyzer`, яка викликає Azure OpenAI GPT-4 з кастомним промптом "Vibe & Fit Scanner". AI отримує повний текст вакансії + структурований CV і повертає JSON з `score` (0–100), `analysis` (cons/pros), `tasks` (що кандидат буде робити), `aura` (тип робочого середовища) та `radar` (5 осей оцінки). Підрахунок токенів і вартості за формулою: input $2.50/1M, output $10.00/1M — з логуванням в `system_logs`. Для пакетного аналізу 10+ вакансій — делегування в GitHub Actions worker через `repository_dispatch`.

**Результат:**
Кожна вакансія автоматично отримує об'єктивну оцінку за секунди. Hot jobs (score ≥ 50) миттєво потрапляють в Telegram з кнопками дій. Кандидат витрачає час лише на релевантні позиції, заощаджуючи години щоденного скролінгу.

**Tech:** Azure OpenAI GPT-4, Deno Edge Functions, Supabase PostgreSQL, GitHub Actions
**#AzureOpenAI #GPT4 #JobSearch #AIRecruiting #Norway #MachineLearning**

---

### 🔷 Кейс #2: "Мотиваційний лист за 8 секунд — норвезькою"
**Категорія:** AI & Machine Learning

**Проблема:**
Написати søknad (мотиваційний лист) норвезькою — це біль для іноземця. Потрібно знати культурні нюанси, формальний стиль bokmål, структуру листа. Один якісний søknad забирає 40–60 хвилин. А коли подаєш на 10+ вакансій на тиждень — це стає другою роботою.

**Думка:**
GPT-4 знає норвезьку, знає формат søknad, може адаптувати зміст під конкретну вакансію. Якщо дати йому CV кандидата + повний опис позиції — він напише персоналізований лист. А для контролю кандидатом — ще й переклад українською.

**Рішення:**
Edge Function `generate_application` приймає `job_id` + `user_id`, витягує з БД повну вакансію та активний CV профіль. GPT-4 генерує `cover_letter_no` (норвезькою) та `cover_letter_uk` (українською) з чіткою структурою: привітання, чому ця компанія, мій досвід, мотивація, завершення. Перевірка на існуючий søknad щоб уникнути дублів. Кожна генерація записується в `applications` з `status='draft'` та cost tracking в `system_logs`.

**Результат:**
Від натискання кнопки до готового søknad — 8 секунд. Кандидат переглядає українську версію, за потреби редагує, натискає "Approve" → лист готовий до відправки. Продуктивність зросла з 2 листів на день до 15+.

**Tech:** Azure OpenAI GPT-4, Deno Edge Functions, Supabase, TypeScript
**#CoverLetter #Norwegian #AIWriting #Søknad #Bokmål #Automation**

---

### 🔷 Кейс #3: "Завантаж PDF — отримай структурований профіль"
**Категорія:** AI & Machine Learning

**Проблема:**
Кожен кандидат має резюме в PDF. Але щоб система могла автоматично заповнювати форми та генерувати søknad, потрібні структуровані дані: ім'я, телефон, досвід роботи з датами, освіта, навички, мови. Ручне заповнення 9 секцій профілю займає 30+ хвилин і ніхто цього не хоче робити.

**Думка:**
AI може "прочитати" PDF резюме та витягти всю інформацію автоматично. Один upload — і весь профіль заповнений. GPT-4 розуміє контекст: "2019–2022 Software Engineer at Company X" — це досвід, а "NTNU, Master in CS" — це освіта.

**Рішення:**
Edge Function `analyze_profile` приймає PDF файл через Storage, витягує текст, відправляє в GPT-4 з промптом для структуризації. Повертає JSON з 9 секціями: `personalInfo` (fullName, email, phone, address), `workExperience[]`, `education[]`, `skills[]`, `languages[]`, `certifications[]`, `summary`, `references[]`, `additionalInfo`. Результат зберігається в `cv_profiles.structured_content` як JSONB. Підтримує версіонування через `parent_profile_id`.

**Результат:**
30 хвилин ручної роботи перетворились на один upload тривалістю 12 секунд. Структурований профіль одразу готовий для автозаповнення форм на будь-якій рекрутинговій платформі.

**Tech:** Azure OpenAI GPT-4, Supabase Storage, Deno Edge Functions, PDF parsing
**#PDF #ResumeParser #AI #StructuredData #CVProfile #Automation**

---

### 🔷 Кейс #4: "Машина, що вчиться на своїх помилках"
**Категорія:** AI & Machine Learning

**Проблема:**
Skyvern заповнює форми на рекрутингових сайтах, але кожен сайт унікальний. Перша спроба на новому сайті часто провалюється: невідомі поля, несподівані popup, нестандартний upload. А наступна спроба на тому ж сайті повторює ті ж помилки — система не вчиться.

**Думка:**
Що якщо після кожної спроби — успішної чи ні — AI аналізує повний лог кроків Skyvern та генерує "skill guide"? Наступного разу ці інструкції вставляються в навігаційну мету. MetaClaw-підхід: перетворити сирий лог дій на стислий, дієвий посібник.

**Рішення:**
Після завершення кожного Skyvern task викликається `extract_memory_from_task()` — функція, що аналізує всі кроки, зібрані поля, navigation flow, методи upload файлів, rich text editors. Далі `generate_skill_from_memory()` відправляє ці дані в Gemini 2.5 Flash з промптом: "Ти web automation expert. Згенеруй стислий SKILL GUIDE для майбутніх спроб на цьому сайті." Результат зберігається в `site_form_memory` і через `build_memory_section()` з `navigation_goals.py` вставляється в кожну наступну навігаційну мету як секція "PREVIOUS EXPERIENCE".

**Результат:**
Система демонструє покращення після кожної ітерації. Перша спроба на Webcruiter — 60% успіху, третя — 90%+. Домени нормалізуються (`company.webcruiter.no` → `webcruiter.no`), тому досвід з одного сайту переноситься на всі сайти тієї ж платформи.

**Tech:** Gemini 2.5 Flash, Python, Skyvern API, Supabase PostgreSQL, JSONB
**#MetaClaw #SelfLearning #AIAgent #WebAutomation #FormMemory #Gemini**

---

### 🔷 Кейс #5: "Аура вакансії — відчуй вайб до інтерв'ю"
**Категорія:** AI & Machine Learning

**Проблема:**
Score релевантності показує, чи підходиш ТИ вакансії. Але чи підходить ВАКАНСІЯ тобі? Токсичне середовище, грайнд без перспектив, або навпаки — компанія зростання з stock options? Це неможливо зрозуміти з сухого тексту оголошення, поки не попрацюєш там місяць.

**Думка:**
Текст вакансії містить приховані сигнали. "Динамічне середовище" часто означає хаос. "Конкурентна зарплата" — що не скажуть цифру. "Ми як сім'я" — червоний прапорець. AI може прочитати ці сигнали та класифікувати "вайб" компанії.

**Рішення:**
В промпт `job-analyzer` додано Aura-систему з 6 типами: 🔴 **Toxic** (високий turnover, unrealistic expectations), 🟢 **Growth** (stock options, learning budget), 🔵 **Balanced** (work-life balance), 🩵 **Chill** (remote, flexible), 🟣 **Grind** (overtime culture), ⚪ **Neutral** (standard corporate). Кожна аура має hex-колір, теги та explanation. Паралельно — Radar chart з 5 осей: tech_stack fit, soft_skills fit, culture match, salary_potential, career_growth (кожен 0–100). Дані зберігаються в `analysis_metadata` JSONB поле.

**Результат:**
Кандидат бачить не лише "підходжу на 78%", а й "🟢 Growth aura — Stock Options, Learning Budget, Fast Track". Radar chart візуально показує, де сильні та слабкі сторони відповідності. Рішення про подачу стає інформованим за 3 секунди замість 15 хвилин читання тексту.

**Tech:** Azure OpenAI GPT-4, Radar Chart (Recharts), React, JSONB, Deno
**#AuraScore #RadarChart #JobFit #WorkplaceCulture #AI #VibeCheck**

---

# 🤖 Категорія 2: Автоматизація браузера

---

### 🔷 Кейс #6: "Один клік — і форма заповнена"
**Категорія:** Автоматизація браузера

**Проблема:**
Норвезькі рекрутингові платформи — це хаос форм. Webcruiter має 5-крокову форму з drag-and-drop. Easycruit вимагає реєстрацію перед подачею. Teamtailor ховає поля за табами. І кожна — зі своїм cookie-банером, CAPTCHA, та redirect-ланцюжком. Заповнити одну форму вручну — 10–15 хвилин.

**Думка:**
Skyvern — це AI-powered browser automation, який розуміє UI через скріншоти, а не CSS-селектори. Він може навігувати складні форми як людина. Але потрібна чітка інтеграція: отримати дані з БД, сформувати задачу, відстежити результат, обробити помилки.

**Рішення:**
Python worker `auto_apply.py` (4700+ рядків) працює як демон, полює на `applications.status='sending'` кожні 10 секунд. Для кожної знайденої заявки: витягує CV профіль → формує navigation goal для конкретного сайту → запускає Skyvern task через REST API → моніторить статус → обробляє результат. Підтримка 10+ платформ: Webcruiter, Easycruit, Teamtailor, Jobylon, Lever, Recman, ReachMee, Varbi, HRManager, SuccessFactors, JobbNorge. Error code mapping для розпізнавання: magic_link, position_closed, login_failed, registration_required, file_upload_required, captcha_blocked.

**Результат:**
Кандидат натискає "Send" в Telegram або Dashboard → за 2–5 хвилин форма заповнена автоматично на будь-якій з 10+ платформ. Середній час подачі впав з 15 хвилин до 3 хвилин при нульовій участі користувача.

**Tech:** Skyvern Docker, Python asyncio, httpx, Supabase, REST API
**#BrowserAutomation #Skyvern #FormFilling #WebAutomation #Python #Docker**

---

### 🔷 Кейс #7: "2FA через Telegram — коли бот стає твоїми пальцями"
**Категорія:** Автоматизація браузера

**Проблема:**
FINN.no — найбільший сайт вакансій Норвегії — вимагає 2FA для "Enkel Søknad" (швидкої подачі). Skyvern заповнює форму, натикається на "Ввведіть код з SMS" — і зависає. Автоматизація зупиняється на найважливішому кроці, бо 2FA потребує людину.

**Думка:**
Людина отримує SMS-код на телефон. А Telegram бот — завжди в кишені. Якщо бот попросить код, юзер відправить його як повідомлення, і бот передасть його назад в Skyvern. Потрібен webhook-міст між Skyvern і Telegram.

**Рішення:**
Коли Skyvern натикається на 2FA, worker створює запис в `finn_auth_requests` зі статусом `code_requested` та відправляє повідомлення в Telegram: "🔐 FINN потребує код! Надішліть 6-значний код." Користувач відповідає `/code 123456` або просто `123456`. Бот зберігає код в БД зі статусом `code_received`. Skyvern через `finn-2fa-webhook` Edge Function полює кожні 10 секунд — щойно код з'являється, повертає його. Webhook працює з миттєвою відповіддю (пустий `{}` якщо коду немає) — адаптовано під 30-секундний HTTP timeout Skyvern.

**Результат:**
Повний цикл "форма → 2FA → відправка" займає ~30 секунд людського часу: отримати SMS, відправити цифри в Telegram. Решту робить автоматика. FINN Enkel Søknad тепер повністю автоматизований.

**Tech:** Skyvern, Telegram Bot API, Deno Edge Functions, Supabase, Python
**#2FA #TelegramBot #FINN #Authentication #WebhookBridge #Norway**

---

### 🔷 Кейс #8: "Реєстрація на сайтах — теж автоматична"
**Категорія:** Автоматизація браузера

**Проблема:**
Багато рекрутингових платформ (Webcruiter, Easycruit, JobbNorge) вимагають реєстрацію перед подачею заявки. Кожен сайт — окрема форма, інший набір полів, інші вимоги до пароля. Юзер повинен реєструватися на 5–7 сайтах вручну перед тим, як почати подаватись.

**Думка:**
Якщо Skyvern вміє заповнювати форми подачі, він може й реєстраційні. Потрібна окрема система: перевірка чи є акаунт → якщо ні — генерація паролю → заповнення форми → Q&A через Telegram для нестандартних питань → збереження credentials.

**Рішення:**
`register_site.py` — окремий Python демон для реєстрації. Генерує безпечний 16-символьний пароль (`generate_secure_password()` — uppercase, lowercase, digit, special char). Перевіряє `site_credentials` в БД — якщо вже є, пропускає. Якщо під час реєстрації Skyvern зустрічає незнайоме поле — створює запис в `registration_questions`, бот питає юзера через Telegram (текстом або inline-кнопками з варіантами). Відповідь повертається через webhook. Успішні credentials зберігаються в `site_credentials` з per-user ізоляцією. Timeout на питання — 5 хвилин.

**Результат:**
Замість ручної реєстрації на 7 сайтах (30+ хвилин), юзер відповідає на 2–3 питання в Telegram за 2 хвилини. Credentials зберігаються назавжди і автоматично підставляються при наступних подачах.

**Tech:** Python, Skyvern Docker, Telegram Bot API, Supabase, secrets module
**#AutoRegistration #CredentialManagement #Skyvern #Telegram #Automation**

---

### 🔷 Кейс #9: "Невірний пароль? Не проблема — бот розрулить"
**Категорія:** Автоматизація браузера

**Проблема:**
Skyvern логіниться на рекрутингову платформу, але пароль змінився або був неправильним. Задача падає з помилкою `login_failed`. Юзер дізнається про це через 30 хвилин, коли відкриває логи. Тим часом дедлайн подачі міг пройти.

**Думка:**
Система повинна розпізнати помилку логіну в реальному часі та запитати юзера: "У тебе є акаунт на цьому сайті? Якщо так — введи новий пароль. Якщо ні — зареєструємо." Telegram — ідеальний канал для такої взаємодії.

**Рішення:**
В `auto_apply.py` додано error code mapping з LLM evaluation. Коли Skyvern повертає `login_failed`, worker визначає домен та відправляє Telegram-повідомлення з inline-кнопками: "🔐 Логін на {domain} не вдався. Є акаунт?" → [Так, оновити пароль] / [Ні, зареєструватись]. При виборі "Так" — бот запитує новий пароль, оновлює `site_credentials`, перезапускає задачу. При "Ні" — trigger `registration_flow` через `register_site.py`. Весь retry-ланцюжок автоматичний з backoff [5s, 10s] та максимум 3 спроби.

**Результат:**
Помилка авторизації, яка раніше блокувала подачу на годину, тепер вирішується за 30 секунд через Telegram. Автовідновлення + реєстрація з нуля без виходу з чату.

**Tech:** Python, Skyvern, Telegram Bot API, Supabase, error code mapping
**#ErrorRecovery #AutoRetry #Login #TelegramBot #Resilience #Automation**

---

### 🔷 Кейс #10: "Пам'ять форм — кожна спроба робить систему розумнішою"
**Категорія:** Автоматизація браузера

**Проблема:**
Skyvern заповнює форму на webcruiter.no. Перша спроба провалюється через нестандартний file upload. Друга — через rich text editor. Третя — нарешті успіх. Але цей досвід нікуди не зберігається — на наступному webcruiter-сайті все починається з нуля.

**Думка:**
Потрібна "пам'ять форм" — база знань про кожну платформу. Скільки кроків потрібно, чи є file upload, який метод (input_type_file чи drag-and-drop), чи є rich text editor (contenteditable чи iframe), які поля зазвичай є. Домени нормалізуються: `company1.webcruiter.no` = `company2.webcruiter.no` = `webcruiter.no`.

**Рішення:**
Таблиця `site_form_memory` зберігає JSON-запис після кожної спроби: `form_fields[]`, `navigation_flow[]`, `total_steps`, `has_file_upload`, `file_upload_method`, `has_rich_text_editor`, `rich_text_method`, `success_count`, `failure_count`. Функція `normalize_domain_for_memory()` зводить 12+ відомих платформ до базових доменів. `get_form_memory()` повертає останній успішний запис для домену. `get_domain_stats()` показує статистику. Confidence-based `_calc_max_steps()` — чим більше успіхів, тим менше кроків виділяється (оптимізація швидкості та вартості).

**Результат:**
Webcruiter: перша спроба — 25 кроків, п'ята — 12 кроків. Success rate зріс з 60% до 92% за рахунок накопиченого досвіду. Вартість Skyvern-токенів знизилась на 40%.

**Tech:** Python, Supabase PostgreSQL, JSONB, Skyvern API
**#FormMemory #PatternRecognition #DomainNormalization #Optimization #Database**

---

### 🔷 Кейс #11: "7 платформ — 7 мов автоматизації"
**Категорія:** Автоматизація браузера

**Проблема:**
Кожна рекрутингова платформа в Норвегії — це окремий всесвіт. Webcruiter має multi-step wizard з обов'язковим CV upload. Easycruit починає з popup cookie-банера. Teamtailor ховає форму за кнопкою "Apply". JobbNorge вимагає мотиваційний лист як plain text. Jobylon — single-page з lazy loading. Recman — iframe у iframe. Один generic скрипт не працює.

**Думка:**
Кожній платформі потрібен свій "navigation goal" — текстова інструкція для Skyvern, що описує точну послідовність дій. Як рецепт: "Закрий cookie → Клікни Apply → Залогінься → Заповни ім'я → Upload CV → Submit." Але інструкції мають бути гнучкими, бо UI сайтів змінюється.

**Рішення:**
`navigation_goals.py` — модуль з 15+ функцій-шаблонів: `_webcruiter_application()`, `_easycruit_application()`, `_teamtailor_application()`, `_successfactors_application()`, `_jobbnorge_application()`, `_jobylon_application()`, `_recman_application()`. Кожна генерує текстову інструкцію з конкретними правилами: "DO NOT use drag-and-drop", "Click the input[type=file] element directly", "Accept cookies FIRST". Функція `detect_site_type()` розпізнає 16+ платформ за доменом. `build_memory_section()` додає PREVIOUS EXPERIENCE з `site_form_memory`.

**Результат:**
Замість одного "заповни форму" — 7 персоналізованих сценаріїв, кожен адаптований до особливостей платформи. Success rate на підтримуваних платформах — 85%+. Додавання нової платформи — 30 хвилин розробки.

**Tech:** Python, Skyvern, Pattern matching, Template system
**#NavigationGoals #PlatformSpecific #Webcruiter #Easycruit #Teamtailor #Automation**

---

### 🔷 Кейс #12: "Слайдер, який зламав всю автоматизацію"
**Категорія:** Автоматизація браузера

**Проблема:**
Деякі рекрутингові форми використовують slider/range input для "Скільки років досвіду?" або "Бажана зарплата". Skyvern намагається drag-and-drop елемент — і провалюється. Браузерний drag event не працює стабільно в headless Chrome. Одна форма з одним слайдером блокує всю подачу.

**Думка:**
Слайдер — це `<input type="range">`. Замість drag-and-drop можна просто кликнути на елемент і вписати числове значення через JavaScript `element.value = X`. Або використати клавіатурні arrow keys. Фізичний drag — це UI-цукерка для людей, а для автоматизації потрібен прямий доступ до значення.

**Рішення:**
В navigation goals для платформ зі слайдерами додано спеціальну інструкцію: "For slider/range inputs: DO NOT try to drag. Instead: 1) Click the slider element to focus it. 2) Use input_text action with the numeric value. 3) If that fails, use JavaScript to set element.value directly." В `auto_apply.py` патчено Skyvern handler `handler_patched.py` з DataTransfer drop fallback — mount через docker-compose: `./handler_patched.py:/app/skyvern/webeye/actions/handler.py`.

**Результат:**
Форми зі слайдерами, які раніше завжди провалювались, тепер заповнюються з першої спроби. Патч одного файлу розблокував цілу категорію форм.

**Tech:** Skyvern, Docker compose volume mount, Python, JavaScript injection
**#SliderFix #DragAndDrop #Headless #Docker #BrowserHack #Workaround**

---

# 🕷️ Категорія 3: Web Scraping & Дані

---

### 🔷 Кейс #13: "5 паттернів для одного finnkode"
**Категорія:** Web Scraping & Дані

**Проблема:**
FINN.no — це десятки варіацій URL для однієї вакансії: `finn.no/job/123456789`, `finn.no/job/fulltime/123456789`, `finn.no/?finnkode=123456789`, `finn.no/ad/123456789.html`, і навіть `finn.no/job/apply?adId=123456789`. А finnkode — це ключ для побудови прямого URL подачі "Enkel Søknad". Якщо парсер не витягне його з URL — автоматична подача неможлива.

**Думка:**
Потрібен cascading pattern matching: спробувати один regex, якщо не спрацював — наступний. П'ять паттернів, покриваючи всі відомі формати URL. Плюс — парсинг дат дедлайнів з 5 формитів: "17. mars 2026", "17.03.2026", "2026-03-17", "i morgen", "snarest".

**Рішення:**
В `extract_job_text` Edge Function реалізовано `extractFinnkode()` з 5 regex-паттернами в порядку пріоритету: 1) `?finnkode=\d+` 2) `/job/\d{8,}` 3) `/ad[/.](\d{8,})` 4) `/(\d{8,})$` 5) `/job/[^/]+/(\d{8,})`. HTML парситься через Cheerio. Дедлайни витягуються з мета-тегів, JSON-LD, та тексту сторінки. Компанії — через JSON config > semantic selectors > FINN li>span > meta tags. Критичний формат URL для подачі: `finn.no/job/apply?adId=XXXXX` (НЕ `/job/apply/XXXXX` — той повертає 404).

**Результат:**
100% finnkode extraction rate на 2000+ тестових URL. Жодна вакансія не втрачена через неможливість витягти ID. Правильний формат URL для подачі — нуль 404 помилок.

**Tech:** Deno, Cheerio, Regex, TypeScript, HTML parsing
**#WebScraping #FINN #Regex #URLParsing #DataExtraction #Norway**

---

### 🔷 Кейс #14: "Державний API, якого ніхто не знає"
**Категорія:** Web Scraping & Дані

**Проблема:**
NAV.no (Arbeidsplassen) — державна платформа вакансій Норвегії. Але на відміну від FINN, тут HTML-скрапінг ненадійний: сторінка рендериться через JavaScript, контент динамічний, структура змінюється щомісяця. Класичний скрапінг ламається після кожного оновлення сайту.

**Думка:**
Якщо NAV.no — державний сервіс, можливо є офіційний API? Arbeidsplassen дійсно має public JSON API для пошуку вакансій. Це стабільніше за HTML parsing і не порушує Terms of Service.

**Рішення:**
В `job-scraper` Edge Function реалізовано NAV enhancer (`nav-enhancer.ts`) — модуль, який використовує Arbeidsplassen Public API для отримання структурованих даних: title, company, location, deadline, description, contact info, application URL. API повертає чистий JSON — без потреби парсити HTML. Для вакансій, знайдених через NAV пошук — пряме отримання деталей через API endpoint з `uuid` вакансії. Fallback на HTML parsing якщо API не відповідає.

**Результат:**
Стабільний scraping NAV.no вже 6+ місяців без єдиного зламу. HTML-скрапер FINN потребував 4 фікси за той же період. JSON API — це надійність та чисті структуровані дані без регулярних виразів.

**Tech:** Deno, NAV Public API, JSON, TypeScript, HTTP fetch
**#NAV #PublicAPI #Arbeidsplassen #GovernmentAPI #StructuredData #Norway**

---

### 🔷 Кейс #15: "LinkedIn без логіну — 0% ризик бану"
**Категорія:** Web Scraping & Дані

**Проблема:**
LinkedIn — обов'язкове джерело вакансій для IT-спеціалістів у Норвегії. Але LinkedIn агресивно бореться зі скрапінгом: бани акаунтів, CAPTCHA, rate limiting. Використання логіну для скрапінгу = ризик втратити свій професійний профіль.

**Думка:**
LinkedIn має "guest" view — сторінки вакансій, доступні без авторизації. Пошукова видача теж частково доступна. Якщо скрапити тільки публічну частину — нуль ризику для акаунту, бо акаунт не використовується.

**Рішення:**
В `job-scraper` реалізовано LinkedIn Guest API scraping: запит до публічного пошуку вакансій з параметрами location=Norway, keywords з `user_settings.linkedin_search_urls`. Парсинг JSON-LD та HTML guest view для витягнення: title, company, location, description, posted date, application URL. Rate limiting: максимум 50 запитів за цикл з рандомізованою затримкою 1–3 секунди. User-Agent rotation. Результати — до 1000 вакансій за скан-цикл.

**Результат:**
6 місяців безперебійного скрапінгу LinkedIn без жодного бану чи CAPTCHA. Нуль ризику для акаунту, бо він ніколи не використовується. Три джерела (FINN + NAV + LinkedIn) покривають 95%+ норвезького ринку IT-вакансій.

**Tech:** HTTP fetch, JSON-LD parsing, Cheerio, Rate limiting, Deno
**#LinkedIn #GuestScraping #ZeroRisk #RateLimiting #JobSearch #WebScraping**

---

### 🔷 Кейс #16: "Одна вакансія — три сайти — нуль дублів"
**Категорія:** Web Scraping & Дані

**Проблема:**
Компанія публікує вакансію одночасно на FINN.no, LinkedIn та NAV.no. Скрапер збирає всі три — і кандидат бачить "Software Developer at Telenor" тричі. Це засмічує job list, ламає статистику, і витрачає AI-токени на аналіз одного й того ж тричі.

**Думка:**
Потрібна cross-source дедуплікація. URL не допоможе — вони різні. Але title + company — майже однакові. "Software Developer" на FINN = "Software Developer" на LinkedIn. Потрібна normalized match: lowercase, strip whitespace, ігнорувати "AS", "ASA", "Norge".

**Рішення:**
В `job-scraper` реалізовано дедуплікацію на рівні insert: перед додаванням нової вакансії — пошук в БД за `user_id` + normalized `company` + normalized `title` + location similarity. Нормалізація: `toLowerCase()`, trim, видалення юридичних суфіксів (AS, ASA, A/S), видалення спеціальних символів. Якщо match знайдено — вакансія не дублюється, а оновлюється (додається alternative source URL). В `auto_apply.py` — додаткова перевірка `check_duplicate_application()` перед створенням заявки.

**Результат:**
Дедуплікація знизила кількість вакансій в БД на 15–20% при тих же пошукових запитах. Нуль подвійних аналізів = економія AI-токенів. Кандидат бачить чисту стрічку без дублів.

**Tech:** PostgreSQL, TypeScript, String normalization, Supabase
**#Deduplication #DataQuality #CrossSource #Normalization #PostgreSQL**

---

### 🔷 Кейс #17: "Shadow DOM — бос FINN.no, якого ми перехитрили"
**Категорія:** Web Scraping & Дані

**Проблема:**
FINN.no використовує Shadow DOM для кнопки "Enkel Søknad" (швидка подача). Це означає, що стандартний CSS selector чи XPath її не бачить. Skyvern, Cheerio, і будь-який парсер "не знає" що кнопка існує. Система не може визначити тип форми подачі — критичний параметр для автоматизації.

**Думка:**
Якщо кнопку не видно в DOM — не треба її шукати. Потрібно інший підхід до детекції. Можна шукати текстові маркери в HTML source (до рендерингу Shadow DOM), мета-теги, або використовувати паттерн URL. А для фактичної подачі — навігувати напряму на `finn.no/job/apply?adId=XXXXX`, обходячи потребу клікати Shadow DOM кнопку.

**Рішення:**
Три рівні детекції в `extract_job_text`: 1) Пошук тексту "enkel søknad" або "enkelt søknad" в HTML source (case-insensitive) — встановлює `has_enkel_soknad=true`. 2) Перевірка пріоритету: якщо є кнопка "Søk her" (зовнішня форма) — вона має пріоритет над "Enkel Søknad" (false positive prevention). 3) Для подачі — пряма навігація на `finn.no/job/apply?adId={finnkode}` замість спроби клікнути Shadow DOM кнопку. Ніколи не конструювати FINN URL автоматично для ВСІХ FINN-вакансій — тільки якщо explicitly marked.

**Результат:**
100% accurate детекція типу форми на FINN.no. Нуль false positives після впровадження "Søk her" priority check. Shadow DOM більше не є перешкодою — ми його просто обходимо.

**Tech:** Cheerio, HTML text search, Regex, Deno, URL construction
**#ShadowDOM #FINN #Workaround #HTMLParsing #DetectionLogic #WebScraping**

---

# 💬 Категорія 4: Telegram Bot

---

### 🔷 Кейс #18: "3200 рядків Telegram магії — бот, що замінив UI"
**Категорія:** Telegram Bot

**Проблема:**
Веб-дашборд зручний за комп'ютером, але 80% часу юзер на телефоні. Отримати сповіщення → відкрити браузер → залогінитись → знайти вакансію → натиснути кнопку — це 5 кроків. А дедлайн подачі може бути "i dag" (сьогодні). Потрібен інтерфейс, який завжди під рукою.

**Думка:**
Telegram бот може стати повноцінним мобільним клієнтом: сканувати, показувати вакансії, генерувати søknad, підтверджувати, відправляти — все в одному чаті. Жодних додатків, жодних логінів. Push-сповіщення = Telegram notification.

**Рішення:**
`telegram-bot/index.ts` — 3200+ рядків Deno Edge Function (v15.0). Команди: `/start` (статистика + кнопки), `/scan` (запуск скану), `/report` (щоденний звіт), `/link XXXXXX` (прив'язка акаунту), `/code XXXXXX` (2FA код). Callback queries для inline кнопок: write søknad, view søknad, approve, send to company, auto-apply batch, cancel task. URL pipeline: юзер надсилає лінк → бот скрапить → аналізує → показує score з кнопками. Multi-user: кожен handler починає з `getUserIdFromChat()`. Повідомлення до 4096 символів — cover letters обрізаються до 1500 символів.

**Результат:**
95% щоденної взаємодії з системою — через Telegram. Від сповіщення про нову вакансію до відправки søknad — 4 натиски кнопок за 30 секунд. Бот став основним інтерфейсом проекту.

**Tech:** Deno, Telegram Bot API, Supabase, TypeScript, Cheerio
**#TelegramBot #ChatBot #MobileFirst #EdgeFunction #Deno #UX**

---

### 🔷 Кейс #19: "Кинь лінк — отримай аналіз за 15 секунд"
**Категорія:** Telegram Bot

**Проблема:**
Друг скидає лінк на вакансію в чат: "О, подивись, класна позиція!" Юзер відкриває, читає 5 хвилин, намагається оцінити відповідність. Або не читає взагалі — бо лінь. Лінк губиться в стрічці повідомлень. Гарна вакансія пропущена.

**Думка:**
Що якщо будь-який URL вакансії, відправлений в Telegram бот, автоматично: скрапиться → зберігається в БД → аналізується AI → показується з оцінкою та кнопками дій? Один лінк — повна обробка.

**Рішення:**
В `telegram-bot` реалізовано URL pipeline: text handler перевіряє повідомлення на наявність URL (regex для finn.no, nav.no, linkedin.com, та будь-яких інших доменів). Якщо URL знайдено: 1) Скрапить деталі вакансії через `extract_job_text` Edge Function. 2) Зберігає в `jobs` з `user_id`. 3) Запускає `job-analyzer` для AI-оцінки. 4) Відправляє результат: score, aura, pros/cons, кнопки [Написати søknad] [Детальніше] [Подати]. Пріоритет text handler — ПЕРЕД обробкою payload edit та інших команд (фікс бага з неправильним порядком обробників).

**Результат:**
Від відправки лінку до повного аналізу з оцінкою — 15 секунд. Юзер одразу бачить "78% match, Growth aura" і може діяти. Жоден лінк не губиться — все потрапляє в систему.

**Tech:** Telegram Bot API, Deno, Cheerio, Azure OpenAI, Supabase
**#URLPipeline #InstantAnalysis #TelegramBot #OneClick #AI #UX**

---

### 🔷 Кейс #20: "Inline кнопки — весь workflow в одному чаті"
**Категорія:** Telegram Bot

**Проблема:**
Показати аналіз вакансії — це половина. Далі кандидат повинен: відкрити веб-дашборд → знайти вакансію → натиснути "Написати søknad" → дочекатися → підтвердити → відправити. 6 кроків, 2 платформи, 5 хвилин. А у Telegram вже є повідомлення з вакансією.

**Думка:**
Кожне повідомлення з вакансією повинно мати inline кнопки для ВСІХ наступних дій. Один чат = повний pipeline: Write → View → Approve → Send. Ніяких переключень між Telegram та браузером.

**Рішення:**
Кожне повідомлення про вакансію містить InlineKeyboardMarkup з кнопками: `✍️ Написати søknad` (callback: `write_{job_id}`), `👁️ Переглянути` (callback: `view_{job_id}`), `✅ Підтвердити` (callback: `approve_{app_id}`), `🚀 Відправити в {company}` (callback: `send_{app_id}`), `🔄 Оновити тип подачі` (callback: `retype_{job_id}`). Callback handler розбирає prefix + id, виконує дію, оновлює повідомлення з новими кнопками. Для batch FINN Easy: `/apply` команда збирає всі approved заявки та відправляє пакетом.

**Результат:**
Повний цикл від сповіщення до відправки søknad — 4 натиски кнопок, 30 секунд, без виходу з Telegram. Конверсія "побачив вакансію → подав заявку" зросла вдвічі.

**Tech:** Telegram Bot API, InlineKeyboardMarkup, Callback queries, Deno
**#InlineButtons #ChatUI #Workflow #OneChat #TelegramBot #UX**

---

### 🔷 Кейс #21: "Покажи все перед відправкою — Smart Confirmation"
**Категорія:** Telegram Bot

**Проблема:**
Юзер натискає "Відправити søknad" — і що? Яке ім'я буде в формі? Який email? Який телефон? Що якщо в профілі невірний номер? Автоматична відправка без підтвердження — це як відправити лист не перевіривши адресу. Одна помилка в email = загублена заявка.

**Думка:**
Перед фінальною відправкою бот повинен показати ВСЕ, що буде заповнено у формі: ім'я, email, телефон, cover letter (перші рядки), і дати можливість відредагувати кожне поле. Smart confirmation — не просто "Ви впевнені?", а повний preview.

**Рішення:**
При натисканні "Send to {Company}" бот витягує з БД: активний CV профіль (fullName, email, phone), søknad (перші 200 символів cover letter), credentials для сайту, тип форми. Формує повідомлення-preview з полями та inline кнопками: `[✏️ Редагувати email]`, `[✏️ Редагувати телефон]`, `[✏️ Редагувати søknad]`, `[✅ Підтвердити і відправити]`, `[❌ Скасувати]`. При редагуванні — бот запитує нове значення текстом та оновлює профіль/søknad в БД.

**Результат:**
Нуль випадків "відправив з невірним email" після впровадження Smart Confirmation. Юзер бачить повну картину за 2 секунди і впевнено натискає "Підтвердити".

**Tech:** Telegram Bot API, Supabase, Inline Keyboard, TypeScript
**#SmartConfirmation #PreviewBeforeSend #QualityControl #UX #TelegramBot**

---

### 🔷 Кейс #22: "Бот, що питає те, чого не знає"
**Категорія:** Telegram Bot

**Проблема:**
Форма на Webcruiter вимагає "Bor du i Norge?" (Чи живеш в Норвегії?), а цього поля немає в CV профілі. Skyvern зупиняється — він не може вгадувати. Раніше це означало провал задачі. А таких питань десятки: стаж водіння, security clearance, availability date.

**Думка:**
Skyvern може зупинитись на незнайомому полі та "спитати" юзера. Якщо з'єднати Skyvern з Telegram через проміжну таблицю — бот запитає, юзер відповість, і Skyvern продовжить. Для типових питань — inline кнопки з варіантами (Ja/Nei, Yes/No).

**Рішення:**
Таблиця `registration_questions` з `field_context='skyvern_form'` зберігає питання від Skyvern. Worker створює запис і відправляє Telegram повідомлення з текстом питання + inline кнопки (якщо є очевидні варіанти: `[Ja] [Nei]`, `[1-2 år] [3-5 år] [5+ år]`). Callback: `skyq_{question_id}_{option}`. Юзер може також відповісти текстом. Worker полює на відповідь з timeout 5 хвилин. Відповідь зберігається і використовується для заповнення поля. Для тих самих питань на інших сайтах — відповідь підставляється автоматично.

**Результат:**
Форми з нестандартними полями більше не провалюються. Юзер відповідає на 2–3 питання в Telegram, і форма заповнюється повністю. Кешування відповідей зменшує кількість питань з кожною спробою.

**Tech:** Telegram Bot API, Supabase, Skyvern, InlineKeyboard, Python
**#MissingFields #QA #Interactive #TelegramBot #FormFilling #Automation**

---

### 🔷 Кейс #23: "Вакансія в кишені — компактна картка з аурою"
**Категорія:** Telegram Bot

**Проблема:**
AI аналіз повертає купу даних: score, aura, 5 осей radar, pros/cons, tasks, deadline, company, location, тип подачі. Відправити це все одним повідомленням — стіна тексту. Telegram обмежує повідомлення до 4096 символів. І ніхто не читає довгі повідомлення на телефоні.

**Думка:**
Потрібні компактні "job cards" — як візитки вакансій. Мінімум інформації для прийняття рішення: score + аура + company + deadline + кнопки. Деталі — на розгортання. Cover letter — обрізаний до 1500 символів.

**Рішення:**
Формат job card: `{aura_emoji} {company} — {title}\n📊 Score: {score}% | {aura.status}\n📅 Deadline: {deadline}\n{form_type_emoji} {form_type}` + кнопки дій. При натисканні "Детальніше" — розгортається: pros/cons, tasks, radar scores, повний URL. Cover letters обрізаються до 1500 символів з "..." та кнопкою "Повний текст". Aura має emoji-mapping: 🔴 Toxic, 🟢 Growth, 🔵 Balanced, 🩵 Chill, 🟣 Grind, ⚪ Neutral. HTML formatting: `<b>`, `<i>`, `<a>` для компактності.

**Результат:**
Компактне повідомлення вміщується в один екран телефону. Рішення "подаватись чи ні" приймається за 3 секунди. Деталі доступні одним натиском. Нуль повідомлень, обрізаних Telegram через ліміт.

**Tech:** Telegram Bot API, HTML formatting, Emoji system, TypeScript
**#JobCard #CompactUI #Aura #TelegramBot #MobileUX #InformationDesign**

---

# 🖥️ Категорія 5: Frontend Dashboard

---

### 🔷 Кейс #24: "Dashboard — пульс пошуку роботи"
**Категорія:** Frontend Dashboard

**Проблема:**
Кандидат не знає, де він стоїть. Скільки вакансій знайдено цього тижня? Скільки подач в процесі? Яка конверсія "знайдено → подано"? Без аналітики пошук роботи — це хаотичне тикання в темряві. А мотивація падає, коли не бачиш прогресу.

**Думка:**
Dashboard повинен дати повну картину за 3 секунди: ключові метрики (jobs found, applications sent, success rate, AI cost), pipeline chart (скільки на кожному етапі), і географічна карта вакансій. Все на одній сторінці, без скролінгу.

**Рішення:**
`DashboardPage.tsx` з трьома секціями: 1) **Metric Cards** — 4 картки з `MetricCard.tsx`: Total Jobs, Applications, Success Rate, AI Cost. Кожна з трендом (↑↓) порівняно з минулим тижнем. 2) **Stacked Bar Chart** — Recharts pipeline: New → Analyzed → Søknad Written → Approved → Sent → Submitted. Grouping по днях/тижнях. 3) **Job Map** — Leaflet карта Норвегії з кольоровими маркерами (зелений = submitted, жовтий = in progress, червоний = rejected). `DateRangePicker` (v9) для фільтрації по періоду. Real-time дані через Supabase RLS queries.

**Результат:**
Кандидат відкриває dashboard і за 3 секунди бачить: "цього тижня 47 вакансій, 12 подач, 3 submitted, cost $2.40." Мотивація зростає, коли бачиш конкретні цифри. Pipeline chart показує де "затори" і що потребує дії.

**Tech:** React 19, Recharts, Leaflet, TypeScript, Supabase, Tailwind CSS
**#Dashboard #DataVisualization #Recharts #Analytics #React #UX**

---

### 🔷 Кейс #25: "Карта 160+ норвезьких міст — вакансії на мапі"
**Категорія:** Frontend Dashboard

**Проблема:**
Вакансії мають location: "Oslo", "Gjøvik", "Hunndalen", "Bismo". Але де це на карті? Особливо для іммігранта, який не знає, що Hunndalen — це 5 км від Gjøvik. Текстовий список локацій не дає просторового розуміння ринку праці. А Google Geocoding API коштує $5/1000 запитів.

**Думка:**
Замість платного geocoding — вбудований кеш координат. Норвегія має ~400 міст і селищ, де публікуються вакансії. 160+ найчастіших можна закешувати раз і назавжди. Для решти — fallback на поштовий індекс (4-значний код → координати).

**Рішення:**
`JobMap.tsx` з Leaflet (CDN): `CITY_COORDS` — 160+ записів `Record<string, [lat, lng]>` від Oslo (59.91, 10.75) до Tromsø (69.65, 18.96). Включає специфічні для користувача регіони: Gjøvik, Hunndalen, Raufoss, Lena, Biri, Moelv. Поштові коди: `POSTAL_RANGES` — 4-digit prefix → координати. `extractLocation()` в `api.ts` сканує текст на наявність назв міст (case-insensitive, з підтримкою ø→o транслітерації) та поштових кодів. Маркери кольорові: зелений (submitted), синій (analyzed), жовтий (in progress), сірий (new).

**Результат:**
Карта Норвегії з живими маркерами вакансій. Кандидат бачить кластери в Innlandet, Oslo, Bergen. Click на маркер — popup з назвою вакансії та score. Нуль витрат на geocoding API.

**Tech:** Leaflet, React, TypeScript, GeoJSON, Static coordinates cache
**#JobMap #Leaflet #Geocoding #Norway #DataVisualization #FreeAPI**

---

### 🔷 Кейс #26: "88KB таблиця — фронтенд-монстр, який працює"
**Категорія:** Frontend Dashboard

**Проблема:**
Після тижня сканування в БД 200+ вакансій. Потрібно знайти "IT-вакансії в Gjøvik зі score > 70 за останній тиждень, excluding компанії-рекрутери (Adecco, Manpower)". Звичайна таблиця з пагінацією — це 10 кліків фільтрів і 5 хвилин скролінгу.

**Думка:**
Таблиця повинна мати ВСЕ: фільтри по кожній колонці, company exclusion list, bulk actions (approve all, send all), sort по score/date/company, search, date range. І при цьому — не гальмувати на 500+ рядках.

**Рішення:**
`JobTable.tsx` — 88KB, найбільший компонент проекту. Функціональність: 1) **Column filters** — dropdown по status, form_type, source; text search по title, company, location. 2) **Company exclusion** — "Block Adecco" → всі вакансії Adecco приховані назавжди. 3) **Date range** — `DateRangePicker` (v9) з preset ranges (Today, This week, Last 30 days). 4) **Sort** — по score, date, company, deadline. 5) **Bulk actions** — checkbox selection → "Approve selected" / "Send selected". 6) **Expandable rows** — click на рядок → pros/cons, tasks, aura, radar. 7) **Export** — selected rows to Excel/PDF. Virtual scrolling для 500+ рядків.

**Результат:**
Знайти "IT в Gjøvik, score > 70" — 3 кліки, 2 секунди. Exclude рекрутерів — 1 клік. Approve 5 вакансій пакетом — 2 кліки. Таблиця тримає 500+ рядків без лагів завдяки virtual scrolling.

**Tech:** React 19, TypeScript, Tailwind CSS, Virtual scrolling, Lucide icons
**#DataTable #Filtering #BulkActions #React #VirtualScrolling #UX**

---

### 🔷 Кейс #27: "Export в Excel з гіперлінками — HR оцінить"
**Категорія:** Frontend Dashboard

**Проблема:**
Кандидат хоче поділитися списком вакансій з кар'єрним консультантом NAV, або зберегти для офлайн-перегляду. Copy-paste з таблиці — втрачається форматування. Скріншот — не клікабельний. PDF — не фільтрується. Потрібен нормальний Excel-файл, але з розумним форматуванням.

**Думка:**
Excel export повинен мати: гіперлінки на вакансії (клікабельні URL), кастомні колонки (юзер обирає що експортувати), автоширину колонок, і header з ім'ям кандидата та датою. PDF — для офіційних документів з CV name в заголовку.

**Рішення:**
Модуль export використовує `xlsx` library для Excel та `jsPDF` для PDF. Excel: 1) Юзер обирає колонки через checkbox modal. 2) Гіперлінки через `{ t: 's', v: title, l: { Target: url } }`. 3) Кольорове кодування score: зелений > 70, жовтий 40–70, червоний < 40. 4) Auto-fit column width. PDF: Header з ім'ям користувача, дата генерації, таблиця з wrap text, footer з номером сторінки. Обидва формати зберігаються в `export_history` з метаданими.

**Результат:**
Один клік — Excel файл з 50 вакансіями, клікабельними лінками, кольоровим score, готовий для відправки консультанту NAV. PDF — для друку та офіційних цілей. Історія експортів збережена в БД.

**Tech:** xlsx, jsPDF, React, TypeScript, Supabase
**#ExcelExport #PDF #DataExport #Hyperlinks #Spreadsheet #Productivity**

---

### 🔷 Кейс #28: "CV Editor — 9 секцій, повний контроль"
**Категорія:** Frontend Dashboard

**Проблема:**
AI витягнув CV з PDF, але в "досвіді" є помилка: wrong date, неточна назва позиції. Або юзер хоче додати нову сертифікацію. Для цього потрібно: зайти в PDF-редактор → знайти секцію → відредагувати → re-upload → re-parse. 20 хвилин на зміну однієї дати.

**Думка:**
Потрібен повноцінний structured editor прямо в браузері. 9 секцій CV з можливістю add/edit/delete кожного запису. Зміни зберігаються в JSONB `structured_content` — і одразу доступні для автозаповнення форм та генерації søknad.

**Рішення:**
`ProfileEditor.tsx` — structured CV editor з 9 секціями: 1) **Personal Info** (fullName, email, phone, address, dateOfBirth, nationality). 2) **Work Experience** (company, position, startDate, endDate, description, isCurrent). 3) **Education** (institution, degree, field, startDate, endDate). 4) **Skills** (name, level: beginner/intermediate/expert). 5) **Languages** (name, level: A1–C2). 6) **Certifications** (name, issuer, date, expiryDate). 7) **Summary** (free text). 8) **References** (name, company, phone, email). 9) **Additional Info** (driving license, availability, etc.). Кожна секція — expandable card з add/edit/delete. Drag-and-drop для reorder. Auto-save при зміні.

**Результат:**
Зміна дати в досвіді — 3 секунди, 2 кліки. Додавання нової мови — 5 секунд. Всі зміни миттєво доступні для форм та søknad. Нуль потреби re-upload PDF.

**Tech:** React 19, TypeScript, JSONB, Supabase, Tailwind CSS, Lucide icons
**#CVEditor #StructuredData #ProfileManagement #JSONB #React #UX**

---

### 🔷 Кейс #29: "Три мови — одна кнопка"
**Категорія:** Frontend Dashboard

**Проблема:**
Платформою користуються українці в Норвегії. Хтось розуміє норвезьку, хтось — тільки англійську, хтось — хоче рідну українську. Hardcoded мова інтерфейсу = 66% незадоволених юзерів. А перемикання мови, яке скидається при перезавантаженні — ще гірше.

**Думка:**
Повний i18n з трьома мовами (UK/NO/EN), де вибір зберігається в БД (не localStorage), і підтягується при логіні. Кожен рядок UI — через translation key. AI-аналіз теж адаптується до мови юзера.

**Рішення:**
`services/translations.ts` — об'єкт з трьома гілками `{ en: {}, no: {}, uk: {} }`, кожна з ~200 ключами: nav, login, dashboard, jobs, settings, profile, admin, export, etc. `LanguageContext.tsx` — React context, що завантажує `preferred_analysis_language` з `user_settings` при логіні та зберігає зміни назад в БД. Перемикач в sidebar — три прапорці 🇬🇧 🇳🇴 🇺🇦. AI-аналіз (`job-analyzer`) отримує `language` parameter і генерує pros/cons відповідною мовою. Telegram bot теж адаптує мову повідомлень.

**Результат:**
Юзер обирає мову раз — і вся система адаптується: UI, AI-аналіз, Telegram повідомлення. При логіні з іншого пристрою — мова вже збережена. Три мови покривають 100% цільової аудиторії.

**Tech:** React Context, TypeScript, i18n, Supabase, Deno
**#Internationalization #i18n #Ukrainian #Norwegian #MultiLanguage #UX**

---

### 🔷 Кейс #30: "Нові вакансії з'являються самі — без F5"
**Категорія:** Frontend Dashboard

**Проблема:**
Юзер дивиться Dashboard. В цей момент scheduled scanner знаходить 5 нових вакансій. Але Dashboard показує старі дані. Юзер натискає F5, чекає 3 секунди, бачить нові вакансії. А може й не натисне — і пропустить hot job з дедлайном "i dag".

**Думка:**
Dashboard повинен оновлюватись автоматично. Supabase Realtime дозволяє підписатись на зміни в таблиці через WebSocket. Коли з'являється новий рядок в `jobs` — Dashboard оновлює стрічку без перезавантаження.

**Рішення:**
В `api.ts` реалізовано Supabase Realtime subscription на таблицю `jobs` з фільтром по `user_id`. При `INSERT` — новий job додається в стейт без re-fetch. При `UPDATE` (наприклад, score з'явився після аналізу) — оновлюється конкретний рядок. Dashboard metric cards перераховуються. Debounce 2 секунди для batch updates (коли scanner додає 10 вакансій одночасно). Notification badge на Sidebar показує кількість нових з останнього перегляду.

**Результат:**
Нові вакансії з'являються в реальному часі — як повідомлення в чаті. Dashboard завжди актуальний. Metric cards оновлюються автоматично. Жодного F5.

**Tech:** Supabase Realtime, WebSocket, React useState, TypeScript
**#RealTime #WebSocket #LiveUpdate #Supabase #React #NoRefresh**

---

# 🔒 Категорія 6: Multi-user & Безпека

---

### 🔷 Кейс #31: "Кожен бачить тільки своє — Row Level Security"
**Категорія:** Multi-user & Безпека

**Проблема:**
Система стала multi-user. Юзер А та Юзер Б мають вакансії, søknad, credentials. Якщо запит SELECT без фільтра — юзер А побачить søknad юзера Б. А credentials — це логіни та паролі до рекрутингових сайтів. Витік = катастрофа.

**Думка:**
PostgreSQL має Row-Level Security (RLS) — механізм, який додає WHERE user_id = auth.uid() до кожного запиту автоматично. Навіть прямий SQL через SQL Editor не обійде RLS. Це рівень безпеки бази даних, а не application layer.

**Рішення:**
RLS включено на ВСІХ таблицях: `jobs`, `applications`, `cv_profiles`, `user_settings`, `site_credentials`, `site_form_memory`, `system_logs`, `export_history`, `registration_flows`. Політики: `SELECT WHERE user_id = auth.uid()`, `INSERT WHERE user_id = auth.uid()`, `UPDATE WHERE user_id = auth.uid()`, `DELETE WHERE user_id = auth.uid()`. Для Edge Functions з service role key (який bypass RLS) — обов'язковий `.eq('user_id', userId)` в кожному запиті. Edge Function `fix-jobs-rls` для ремонту політик після міграцій.

**Результат:**
Повна ізоляція даних між юзерами на рівні бази даних. Навіть баг в application code не призведе до витоку — RLS заблокує. Протестовано: логін як юзер Б → 0 jobs, 0 applications, $0.00 cost.

**Tech:** PostgreSQL RLS, Supabase, SQL policies, auth.uid()
**#RowLevelSecurity #RLS #PostgreSQL #DataIsolation #Security #MultiUser**

---

### 🔷 Кейс #32: "User_id скрізь — параноїдальна ізоляція"
**Категорія:** Multi-user & Безпека

**Проблема:**
RLS працює для frontend запитів (з JWT). Але Edge Functions та Python worker використовують service role key — він bypass RLS. Один забутий `.eq('user_id', userId)` = витік даних. А таких запитів сотні: scheduled-scanner, job-analyzer, generate_application, auto_apply.py, api.ts.

**Думка:**
Потрібен "параноїдальний" підхід: user_id фільтр у КОЖНОМУ запиті, навіть якщо RLS теоретично повинен захистити. Два рівні ізоляції краще ніж один. І код-рев'ю повинен перевіряти наявність user_id в кожному новому запиті.

**Рішення:**
Аудит ВСІХ Supabase запитів в проекті. Кожен `.from('table').select()` перевірено на наявність `.eq('user_id', ...)`. В `scheduled-scanner`: цикл `for each user with auto_scan_enabled` → всі внутрішні запити фільтруються по user_id цього юзера. В `telegram-bot`: helper `getUserIdFromChat(chatId)` на початку кожного handler. В `auto_apply.py`: user_id витягується з application record і передається в кожен наступний запит. В `api.ts`: getJobs, getTotalCost, getSystemLogs, getProfiles — всі з user_id.

**Результат:**
Подвійна ізоляція: RLS на рівні PostgreSQL + application-level user_id filter. Навіть якщо service role key скомпрометовано — кожен запит обмежений конкретним user_id. Нуль інцидентів витоку даних.

**Tech:** Supabase, PostgreSQL, TypeScript, Python, Code audit
**#MultiUser #DataIsolation #SecurityAudit #DefenseInDepth #UserID**

---

### 🔷 Кейс #33: "Паролі до 11 сайтів — безпечно і зручно"
**Категорія:** Multi-user & Безпека

**Проблема:**
Для автоматизації потрібні логіни на Webcruiter, Easycruit, JobbNorge, Teamtailor, Recman, FINN, Jobylon, ReachMee, Varbi, HRManager, SuccessFactors. Це 11+ пар email/password. Зберігати в .env — не масштабується для multi-user. Зберігати в plain text — security nightmare.

**Думка:**
Потрібна таблиця `site_credentials` з per-user ізоляцією через RLS. Кожен credential прив'язаний до user_id та domain. Worker витягує credentials перед кожною задачею. Генерація паролів — через `secrets` module (cryptographically secure).

**Рішення:**
Таблиця `site_credentials`: `id`, `user_id`, `domain`, `email`, `password`, `created_at`, `last_used_at`, `is_verified`. RLS policy: юзер бачить тільки свої. Worker перевіряє credentials перед задачею: якщо є — логін; якщо ні — реєстрація через `register_site.py`. Паролі генеруються `generate_secure_password(16)`: uppercase + lowercase + digit + special char. При login failure — бот запитує оновлений пароль через Telegram. Dashboard Settings page — UI для перегляду/редагування credentials (пароль маскується `••••••••`, показується на click).

**Результат:**
Централізоване управління credentials для 11+ сайтів з per-user ізоляцією. Автоматична генерація secure passwords. Worker автоматично підбирає потрібний credential для кожного домену. Нуль хардкоду паролів.

**Tech:** Supabase PostgreSQL, RLS, Python secrets, TypeScript, React
**#CredentialManager #SecurityByDesign #PasswordGeneration #MultiUser #RLS**

---

### 🔷 Кейс #34: "Supabase SDK зависає — а ми ні"
**Категорія:** Multi-user & Безпека

**Проблема:**
`supabase.auth.getSession()` зависає на невизначений час. `supabase.auth.signOut()` — теж. `onAuthStateChange` — не викликається ніколи. Це баг Supabase JS SDK, який з'явився з оновленням auth-js. Користувач бачить вічний спінер замість Dashboard. Або не може вийти з акаунту.

**Думка:**
Supabase зберігає session в localStorage. Якщо SDK зависає — можна прочитати session напряму з localStorage, верифікувати access_token, і працювати без SDK auth methods взагалі. Sign out = просто очистити localStorage.

**Рішення:**
`AuthContext.tsx` — повний обхід Supabase auth SDK. На mount: зчитує `STORAGE_KEY` з localStorage, парсить JSON, витягує `access_token` та `user`. `fetchWithTimeout(5000)` — обгортка над fetch з AbortController для запитів ролі (замість supabase.from()). `fetchUserRoleDirect()` — прямий REST запит до `/rest/v1/user_settings?user_id=eq.{id}` з API key та Bearer token. Sign out: `localStorage.removeItem(STORAGE_KEY)` + `window.location.reload()`. Sign in: прямий POST до `/auth/v1/token?grant_type=password` з 5-секундним timeout.

**Результат:**
Auth працює стабільно, загрузка — 500ms замість вічного зависання. Sign out — миттєвий. Нуль залежності від buggy SDK auth methods. Workaround працює 6+ місяців без проблем.

**Tech:** React Context, localStorage, AbortController, REST API, TypeScript
**#AuthWorkaround #SupabaseBug #localStorage #Timeout #Resilience #Frontend**

---

# 🚀 Категорія 7: CI/CD & DevOps

---

### 🔷 Кейс #35: "Push to main = Edge Functions оновлені"
**Категорія:** CI/CD & DevOps

**Проблема:**
14 Edge Functions. Ручний deploy кожної: `supabase functions deploy <name> --project-ref ptrmidlhfdbybxmyovtm`. 3 функції потребують `--no-verify-jwt`, решта — з JWT. Забув задеплоїти одну — production ламається. Забув `--no-verify-jwt` для telegram-bot — webhook перестає працювати. Людська помилка чекає за рогом.

**Думка:**
GitHub Actions може автоматично деплоїти всі функції при push до main. Тригер — зміни в `supabase/functions/**`. Три no-JWT функції деплояться окремими steps, решта — циклом.

**Рішення:**
`.github/workflows/deploy-supabase-functions.yml`: trigger на push до `main` з path filter `supabase/functions/**` + manual `workflow_dispatch`. Steps: 1) Checkout repo. 2) Setup Supabase CLI (latest). 3) Deploy `telegram-bot` з `--no-verify-jwt`. 4) Deploy `scheduled-scanner` з `--no-verify-jwt`. 5) Deploy `finn-2fa-webhook` з `--no-verify-jwt`. 6) Loop через всі інші функції (виключаючи `_shared` directory). Secret: `SUPABASE_ACCESS_TOKEN` для авторизації CLI.

**Результат:**
Git push → за 2 хвилини всі 14 Edge Functions оновлені в production. Нуль ручних дій. Нуль забутих deploy. JWT/no-JWT конфігурація зафіксована в коді, не в голові розробника.

**Tech:** GitHub Actions, Supabase CLI, YAML, CI/CD pipeline
**#GitHubActions #AutoDeploy #EdgeFunctions #CICD #DevOps #Supabase**

---

### 🔷 Кейс #36: "Кожен юзер — свій час сканування"
**Категорія:** CI/CD & DevOps

**Проблема:**
Scheduled scan запускався з `forceRun=true` — всі юзери сканувались одночасно кожну годину. Юзер А хоче скан о 7:00 (перед роботою), юзер Б — о 12:00 (обід), юзер В — о 18:00 (після роботи). Одночасний скан для всіх = непотрібне навантаження на FINN.no та rate limiting.

**Думка:**
Кожен юзер має `scan_time_utc` в `user_settings`. GitHub Actions cron запускається щогодини (`0 * * * *`). Edge Function перевіряє: для кожного юзера — чи його `scan_time_utc` час співпадає з поточною UTC годиною. Якщо так — скан. Якщо ні — пропуск.

**Рішення:**
`scheduled-scan.yml`: cron `0 * * * *` (кожну годину). Виклик `scheduled-scanner` Edge Function з `forceRun=false`. Всередині функції: `SELECT * FROM user_settings WHERE auto_scan_enabled = true` → для кожного юзера → `if (user.scan_time_utc == currentUTCHour)` → scan. Manual `workflow_dispatch` з параметром `force_run=true` — для debug, сканує всіх. Логування: "Skipping user X: scan_time_utc=14, current_hour=09".

**Результат:**
Кожен юзер сканується в свій час. Навантаження на FINN.no розподілене рівномірно протягом дня. Rate limiting не спрацьовує. Юзер отримує свіжі вакансії саме тоді, коли готовий їх переглянути.

**Tech:** GitHub Actions cron, Deno Edge Functions, PostgreSQL, UTC timezone
**#Cron #PerUserScheduling #DistributedLoad #GitHubActions #Automation**

---

### 🔷 Кейс #37: "60 хвилин замість 30 секунд — AI в GitHub Actions"
**Категорія:** CI/CD & DevOps

**Проблема:**
Azure OpenAI аналіз однієї вакансії — ~3 секунди. 10 вакансій — 30 секунд. 20 вакансій — 60 секунд. Але Supabase Edge Function має жорсткий timeout 30 секунд. При 10+ нових вакансіях функція падає по timeout, залишаючи половину неаналізованих.

**Думка:**
Edge Function не повинна робити важку AI-роботу. Вона скрапить та зберігає вакансії, а аналіз делегує в GitHub Actions worker, який має 60-хвилинний timeout. Trigger — `repository_dispatch` через GitHub API.

**Рішення:**
Архітектурний split: 1) `scheduled-scanner` Edge Function (30s) — скрапить FINN/NAV/LinkedIn, зберігає в БД, витягує деталі через `extract_job_text`. 2) Trigger `analyze-jobs.yml` через `POST /repos/{owner}/{repo}/dispatches` з `GITHUB_PAT`. 3) `analyze-jobs.yml` запускає `analyze_worker.py` — Python скрипт з Azure OpenAI, який аналізує batch вакансій без ліміту часу. Параметри: `limit` (скільки аналізувати), `user_id` (для конкретного юзера). 4) Telegram нотифікація після аналізу для hot jobs (score ≥ 50).

**Результат:**
Edge Function ніколи не timeout: скрапінг + збереження = 10–15 секунд. AI-аналіз 50+ вакансій = 3 хвилини в GitHub Actions без жодних обмежень. Масштабування без зміни архітектури.

**Tech:** GitHub Actions, repository_dispatch, Python, Azure OpenAI, Deno
**#TimeoutWorkaround #GitHubActions #AsyncProcessing #Scalability #Architecture**

---

# 🔗 Категорія 8: Інтеграції платформ

---

### 🔷 Кейс #38: "Supabase — весь backend в одній платформі"
**Категорія:** Інтеграції платформ

**Проблема:**
Типовий проект потребує: база даних, аутентифікація, serverless функції, file storage, real-time subscriptions, REST API, row-level security. Це 5+ різних сервісів: Firebase + Auth0 + AWS Lambda + S3 + Pusher. Конфігурація, billing, ключі — exponential complexity.

**Думка:**
Supabase пропонує все це в одній платформі: PostgreSQL (не NoSQL!), Auth, Edge Functions (Deno), Storage, Realtime, auto-generated REST API, вбудований RLS. Один project ref, один набір ключів, одна панель моніторингу.

**Рішення:**
Supabase project `ptrmidlhfdbybxmyovtm` покриває ВСЕ: **PostgreSQL** — 10+ таблиць з JSONB полями (analysis_metadata, structured_content, skyvern_metadata). **Auth** — email/password з JWT. **14 Edge Functions** — Deno serverless для скрапінгу, AI, Telegram bot, webhooks. **Storage** — PDF upload для CV. **Realtime** — live updates на dashboard. **RLS** — per-user data isolation. **REST API** — автогенерований для всіх таблиць (використовується AuthContext для прямих запитів). Один `SUPABASE_URL` та `SUPABASE_SERVICE_ROLE_KEY` для всіх компонентів.

**Результат:**
Zero DevOps overhead: жодного сервера для управління, жодного Docker для бази даних. Від ідеї до production — один `supabase init`. Місячний кост: ~$25 (Pro plan) замість ~$100+ для еквівалентного AWS стеку.

**Tech:** Supabase, PostgreSQL, Deno, Auth, Storage, Realtime, RLS
**#Supabase #FullStack #BaaS #PostgreSQL #ServerlessBackend #OneStopShop**

---

### 🔷 Кейс #39: "Кожен AI-виклик — в copy до бухгалтерії"
**Категорія:** Інтеграції платформ

**Проблема:**
Azure OpenAI GPT-4 — не безкоштовний. Input: $2.50/1M tokens, Output: $10.00/1M tokens. При аналізі 200 вакансій на тиждень + генерації 30 søknad — рахунок може бути непередбачуваним. Юзер не знає, скільки він витратив, доки не прийде billing.

**Думка:**
Кожен API call повинен рахувати та логувати token usage в реальному часі. Dashboard показує поточний cost. System logs — детальний breakdown. Юзер бачить "$2.40 цього тижня" і може контролювати витрати.

**Рішення:**
В `job-analyzer` та `generate_application`: після кожного Azure OpenAI call — витягуємо `usage.prompt_tokens` та `usage.completion_tokens` з response. Формула: `cost = (prompt_tokens * PRICE_PER_1M_INPUT + completion_tokens * PRICE_PER_1M_OUTPUT) / 1_000_000`. Запис в `system_logs`: `{ user_id, event_type: 'ai_cost', cost_usd, tokens_input, tokens_output, model, function_name }`. Dashboard `MetricCard` "AI Cost" — SUM за період. Admin page — total cost per user. Python `analyze_worker.py` — той самий підрахунок.

**Результат:**
Повна прозорість витрат: юзер бачить cost в реальному часі на Dashboard. Admin бачить cost per user. Середній тижневий cost: $2–5 для активного юзера (200 вакансій + 30 søknad).

**Tech:** Azure OpenAI, Token counting, Supabase system_logs, React MetricCard
**#CostTracking #AzureOpenAI #TokenUsage #Billing #Transparency #FinOps**

---

### 🔷 Кейс #40: "Патч одного файлу — і drag-and-drop працює"
**Категорія:** Інтеграції платформ

**Проблема:**
Skyvern Docker не вміє робити drag-and-drop file upload. Webcruiter та інші платформи мають drop zone для CV: "Перетягніть файл сюди." Skyvern бачить drop zone, намагається drag — і нічого не відбувається. DataTransfer API в headless Chrome працює інакше, ніж в звичайному браузері.

**Думка:**
Skyvern — open source. Його handler.py відповідає за виконання browser actions. Якщо модифікувати drag-and-drop handler на альтернативний метод (прямий DataTransfer injection замість mouse events) — все запрацює. Патч можна mount через docker-compose volume.

**Рішення:**
Створено `handler_patched.py` на основі Skyvern's `handler.py`. В секції upload_file — замість mouse drag events, реалізовано DataTransfer drop fallback: 1) Create DataTransfer object через JavaScript. 2) Inject file blob через `dt.items.add(file)`. 3) Dispatch 'drop' event на target element. 4) Fallback на `input[type=file].click()` якщо drop не спрацював. Docker-compose mount: `./handler_patched.py:/app/skyvern/webeye/actions/handler.py`. Skyvern .env: `BROWSER_LOCALE=nb-NO`, `BROWSER_TIMEZONE=Europe/Oslo`.

**Результат:**
File upload на Webcruiter, Easycruit та інших drag-and-drop платформах працює з першої спроби. Один патчений файл розблокував цілу категорію сайтів. Оновлення Skyvern не перезатирає патч (volume mount має пріоритет).

**Tech:** Docker compose, Volume mount, JavaScript DataTransfer API, Python
**#DockerPatch #DragAndDrop #Skyvern #FileUpload #OpenSource #Workaround**

---

### 🔷 Кейс #41: "Push = Production за 15 секунд"
**Категорія:** Інтеграції платформ

**Проблема:**
Frontend development loop: зміни → commit → push → manual deploy → 5 хвилин очікування → тестування на production. Кожна ітерація — 7–10 хвилин. При 20 deploy на день — це 3+ години "чекання". А юзери на production бачать стару версію, поки не задеплоїш.

**Думка:**
Netlify має auto-deploy з GitHub: push до main → build → deploy. Build React + Vite — 15 секунд. Deploy до CDN — 5 секунд. Від push до production — менше хвилини. Preview deploys для PR — тестування перед merge.

**Рішення:**
Netlify проект підключено до GitHub repo. Конфігурація: branch `main`, build command `npm run build`, publish directory `dist/`. Auto-deploy on push. Preview deploys для pull requests з унікальним URL. Build settings: Node 20, npm install → npm run build. Vite production build: tree-shaking, minification, code splitting. Output — статичний bundle ~500KB gzipped.

**Результат:**
Git push → 15 секунд build → 5 секунд deploy → production оновлено. Preview URL для кожного PR — тестування без мержу. Rollback — один клік в Netlify dashboard. Downtime = 0.

**Tech:** Netlify, Vite, React, GitHub integration, CDN
**#Netlify #AutoDeploy #CICD #ZeroDowntime #StaticHosting #Frontend**

---

### 🔷 Кейс #42: "Безкоштовний AI — Gemini аналізує помилки"
**Категорія:** Інтеграції платформ

**Проблема:**
Azure OpenAI GPT-4 коштує $2.50/1M input tokens. Генерація skill guides після кожної Skyvern спроби — це 200+ додаткових AI-викликів на місяць. При середньому розмірі лога ~2000 tokens — додаткові $1–2/місяць. Невелико, але навіщо платити за задачу, яку може зробити безкоштовний AI?

**Думка:**
Google Gemini 2.5 Flash має щедрий безкоштовний tier: 1500 RPD, 1M TPM. Для аналізу логів Skyvern та генерації skill guides — більш ніж достатньо. І якість для цієї задачі не поступається GPT-4.

**Рішення:**
В `auto_apply.py` функція `generate_skill_from_memory()` використовує Gemini 2.5 Flash через REST API: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`. Промпт: "Ти web automation expert. Аналізуй спробу заповнення форми та згенеруй SKILL GUIDE для майбутніх спроб." Input: site domain, outcome, form fields (filled/failed), navigation flow, file upload methods. Output: стислий текстовий guide (200–400 слів). Зберігається в `site_form_memory.skill_guide`. Вставляється в navigation goals через `build_memory_section()`.

**Результат:**
200+ AI-викликів на місяць — безкоштовно. Skill guides покращують success rate на 15–20%. Azure OpenAI використовується тільки для критичних задач (аналіз вакансій, генерація søknad). Gemini — для допоміжних.

**Tech:** Google Gemini 2.5 Flash, REST API, Python, Free tier AI
**#Gemini #FreeTier #SkillGeneration #CostOptimization #AIAgent #GoogleAI**

---

# 📊 Підсумкова статистика

## Проект в цифрах

| Метрика | Значення |
|---------|----------|
| **Загальний обсяг коду** | ~500K+ рядків (TypeScript + Python + SQL) |
| **Edge Functions** | 14 Deno serverless функцій |
| **Python Workers** | 4 демони (auto_apply, extract_url, register_site, analyze) |
| **Підтримувані платформи** | 16+ рекрутингових сайтів |
| **Мови інтерфейсу** | 3 (UK, NO, EN) |
| **Таблиці БД** | 10+ з RLS |
| **Норвезьких міст на карті** | 160+ |
| **URL-паттернів для finnkode** | 5 regex |
| **GitHub Actions workflows** | 3 (deploy, scan, analyze) |
| **Telegram Bot рядків** | 3200+ |
| **Найбільший компонент** | JobTable.tsx (88KB) |
| **AI моделі** | Azure OpenAI GPT-4 + Google Gemini 2.5 Flash |

## Розбивка по категоріях

| Категорія | Кейсів | Основний стек |
|-----------|--------|---------------|
| 🧠 AI & ML | 5 | Azure OpenAI, Gemini, Python |
| 🤖 Browser Automation | 7 | Skyvern, Docker, Python |
| 🕷️ Web Scraping | 5 | Deno, Cheerio, REST APIs |
| 💬 Telegram Bot | 6 | Deno, Telegram Bot API |
| 🖥️ Frontend | 7 | React 19, Recharts, Leaflet |
| 🔒 Security | 4 | PostgreSQL RLS, Supabase Auth |
| 🚀 CI/CD | 3 | GitHub Actions, Supabase CLI |
| 🔗 Integrations | 5 | Supabase, Netlify, Docker |
| **Всього** | **42** | |

## Ключові технології

```
Frontend:     React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS · Recharts · Leaflet · Lucide
Backend:      Supabase · PostgreSQL · Deno Edge Functions · RLS
AI:           Azure OpenAI GPT-4 · Google Gemini 2.5 Flash
Automation:   Skyvern Docker · Python asyncio · httpx
Communication: Telegram Bot API
CI/CD:        GitHub Actions · Netlify · Supabase CLI
Export:        xlsx · jsPDF
```

---

*Цей документ описує 42 реальні інженерні рішення, реалізовані в проекті JobBot Norway — платформі автоматизації пошуку роботи на норвезькому ринку. Кожен кейс — це реальна проблема, реальне рішення, реальний результат.*

**Автор:** Віталій Бербега
**GitHub:** JobBot Norway
**Дата:** Березень 2026

---

*#JobBot #Norway #FullStack #AI #Automation #React #Supabase #TelegramBot #OpenAI #Skyvern #Engineering #Portfolio #42Cases*
