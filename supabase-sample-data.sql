-- Sample data for News and Blog sections
-- Run this in Supabase SQL Editor to populate the database with test data

-- Insert sample news items
INSERT INTO news (
  title_en, title_no, title_ua,
  content_en, content_no, content_ua,
  summary_en, summary_no, summary_ua,
  image_url, source_url, published_at, tags
) VALUES
(
  'AI Revolution in Web Development',
  'AI-revolusjon i webutvikling',
  'Революція AI у веб-розробці',

  'Artificial Intelligence is transforming how we build websites and applications. Modern AI tools can now generate code, design interfaces, and even optimize performance automatically. This breakthrough is making development faster and more accessible to everyone.',

  'Kunstig intelligens transformerer måten vi bygger nettsider og applikasjoner på. Moderne AI-verktøy kan nå generere kode, designe grensesnitt og til og med optimalisere ytelsen automatisk. Dette gjennombruddet gjør utvikling raskere og mer tilgjengelig for alle.',

  'Штучний інтелект змінює те, як ми створюємо веб-сайти та додатки. Сучасні інструменти AI тепер можуть генерувати код, проектувати інтерфейси і навіть автоматично оптимізувати продуктивність. Цей прорив робить розробку швидшою та доступнішою для всіх.',

  'AI tools are revolutionizing development workflows',
  'AI-verktøy revolusjonerer utviklingsflyter',
  'Інструменти AI революціонізують робочі процеси розробки',

  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
  'https://example.com/ai-revolution',
  NOW() - INTERVAL '2 hours',
  ARRAY['AI', 'technology', 'web development']
),
(
  'New React 19 Features Released',
  'Nye React 19-funksjoner utgitt',
  'Випущені нові функції React 19',

  'React 19 brings groundbreaking features including automatic batching, improved server components, and enhanced performance optimizations. The new compiler makes React apps faster than ever before, while the improved developer tools make debugging a breeze.',

  'React 19 bringer banebrytende funksjoner inkludert automatisk gruppering, forbedrede serverkomponenter og forbedrede ytelsesoptimaliseringer. Den nye kompilatoren gjør React-apper raskere enn noen gang før, mens de forbedrede utviklerverktøyene gjør feilsøking til en lek.',

  'React 19 приносить революційні функції, включаючи автоматичне групування, покращені серверні компоненти та розширені оптимізації продуктивності. Новий компілятор робить додатки React швидшими, ніж будь-коли, а покращені інструменти розробника роблять налагодження легкою.',

  'Explore the latest React 19 features and improvements',
  'Utforsk de nyeste React 19-funksjonene og forbedringene',
  'Дослідіть останні функції та покращення React 19',

  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
  'https://react.dev',
  NOW() - INTERVAL '5 hours',
  ARRAY['React', 'JavaScript', 'frontend']
),
(
  'TypeScript 5.5 Improves Developer Experience',
  'TypeScript 5.5 forbedrer utvikleropplevelsen',
  'TypeScript 5.5 покращує досвід розробника',

  'The latest TypeScript release focuses on developer experience with better error messages, faster compilation times, and improved IDE support. The new inference engine is smarter and catches more bugs at compile time.',

  'Den nyeste TypeScript-utgivelsen fokuserer på utvikleropplevelse med bedre feilmeldinger, raskere kompileringstider og forbedret IDE-støtte. Den nye inferensmotoren er smartere og fanger flere feil ved kompileringstid.',

  'Останній реліз TypeScript зосереджується на досвіді розробника з кращими повідомленнями про помилки, швидшим часом компіляції та покращеною підтримкою IDE. Новий механізм виведення типів розумніший і виявляє більше помилок під час компіляції.',

  'TypeScript gets major upgrades for better coding',
  'TypeScript får store oppgraderinger for bedre koding',
  'TypeScript отримує значні оновлення для кращого кодування',

  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
  'https://devblogs.microsoft.com/typescript',
  NOW() - INTERVAL '1 day',
  ARRAY['TypeScript', 'JavaScript', 'programming']
);

-- Insert sample blog posts
INSERT INTO blog_posts (
  title_en, title_no, title_ua,
  content_en, content_no, content_ua,
  excerpt_en, excerpt_no, excerpt_ua,
  slug, featured_image, category, published_at, tags, is_published
) VALUES
(
  'Building Modern Web Applications with React and TypeScript',
  'Bygge moderne webapplikasjoner med React og TypeScript',
  'Створення сучасних веб-додатків з React та TypeScript',

  'In this comprehensive guide, I will walk you through the process of building a modern web application using React and TypeScript. We will cover everything from project setup to deployment, including best practices for component architecture, state management, and testing.

React has become the go-to library for building user interfaces, and TypeScript adds type safety that catches bugs before they reach production. Together, they create a powerful development experience.

First, let us set up our development environment. We will use Vite as our build tool because it offers incredibly fast hot module replacement and optimized production builds. The setup is straightforward and gets you coding in minutes.

Component architecture is crucial for maintainable applications. I recommend following the atomic design principles: atoms, molecules, organisms, templates, and pages. This hierarchy helps organize your code and makes it easier to reason about component relationships.

For state management, we will explore both local state with useState and useReducer, as well as global state management with Context API and libraries like Zustand. Choose the right tool for your specific needs rather than over-engineering with complex solutions.

Testing is not optional in modern development. We will cover unit testing with Vitest, integration testing with React Testing Library, and end-to-end testing with Playwright. A good test suite gives you confidence when refactoring and deploying.

Finally, we will deploy our application to Netlify with automatic CI/CD. Every push to your main branch will trigger a new deployment, making it easy to share your work with the world.',

  'I denne omfattende guiden vil jeg lede deg gjennom prosessen med å bygge en moderne webapplikasjon ved hjelp av React og TypeScript. Vi vil dekke alt fra prosjektoppsett til distribusjon, inkludert beste praksis for komponentarkitektur, tilstandshåndtering og testing.

React har blitt det foretrukne biblioteket for å bygge brukergrensesnitt, og TypeScript legger til typesikkerhet som fanger feil før de når produksjon. Sammen skaper de en kraftig utvikleropplevelse.

Først, la oss sette opp utviklingsmiljøet vårt. Vi vil bruke Vite som byggeverktøy fordi det tilbyr utrolig rask hot module replacement og optimaliserte produksjonsbygg. Oppsettet er enkelt og får deg til å kode på få minutter.

Komponentarkitektur er avgjørende for vedlikeholdbare applikasjoner. Jeg anbefaler å følge de atomiske designprinsippene: atomer, molekyler, organismer, maler og sider. Dette hierarkiet hjelper med å organisere koden din og gjør det enklere å resonnere om komponentforhold.

For tilstandshåndtering vil vi utforske både lokal tilstand med useState og useReducer, samt global tilstandshåndtering med Context API og biblioteker som Zustand. Velg riktig verktøy for dine spesifikke behov i stedet for å over-engineering med komplekse løsninger.

Testing er ikke valgfritt i moderne utvikling. Vi vil dekke enhetstesting med Vitest, integrasjonstesting med React Testing Library, og ende-til-ende-testing med Playwright. En god testpakke gir deg selvtillit når du refaktorerer og distribuerer.

Til slutt vil vi distribuere applikasjonen vår til Netlify med automatisk CI/CD. Hver push til hovedgrenen din vil utløse en ny distribusjon, noe som gjør det enkelt å dele arbeidet ditt med verden.',

  'У цьому всеосяжному посібнику я проведу вас через процес створення сучасного веб-додатку за допомогою React та TypeScript. Ми розглянемо все від налаштування проекту до розгортання, включаючи найкращі практики для архітектури компонентів, керування станом та тестування.

React став основною бібліотекою для створення користувацьких інтерфейсів, а TypeScript додає безпеку типів, яка виявляє помилки до того, як вони потраплять у продакшн. Разом вони створюють потужний досвід розробки.

Спочатку налаштуємо наше середовище розробки. Ми використаємо Vite як інструмент збірки, оскільки він пропонує неймовірно швидку гарячу заміну модулів та оптимізовані продакшн-збірки. Налаштування просте і дозволяє почати кодувати за лічені хвилини.

Архітектура компонентів є критично важливою для підтримуваних додатків. Я рекомендую дотримуватись принципів атомарного дизайну: атоми, молекули, організми, шаблони та сторінки. Ця ієрархія допомагає організувати ваш код і полегшує розуміння взаємозв\'язків компонентів.

Для керування станом ми дослідимо як локальний стан з useState та useReducer, так і глобальне керування станом з Context API та бібліотеками як Zustand. Обирайте правильний інструмент для ваших конкретних потреб замість надмірного ускладнення складними рішеннями.

Тестування не є опціональним у сучасній розробці. Ми розглянемо юніт-тестування з Vitest, інтеграційне тестування з React Testing Library та наскрізне тестування з Playwright. Хороший набір тестів дає вам впевненість при рефакторингу та розгортанні.

Нарешті, ми розгорнемо наш додаток на Netlify з автоматичним CI/CD. Кожен пуш до вашої основної гілки запустить нове розгортання, що полегшить поширення вашої роботи у світі.',

  'A comprehensive guide to building modern web applications with React, TypeScript, and best practices for 2024.',

  'En omfattende guide til å bygge moderne webapplikasjoner med React, TypeScript og beste praksis for 2024.',

  'Всеосяжний посібник зі створення сучасних веб-додатків з React, TypeScript та найкращими практиками для 2024.',

  'building-modern-web-apps-react-typescript',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
  'Web Development',
  NOW() - INTERVAL '3 days',
  ARRAY['React', 'TypeScript', 'tutorial', 'web development'],
  true
),
(
  'My Journey into Full-Stack Development',
  'Min reise inn i full-stack-utvikling',
  'Моя подорож у повний стек розробки',

  'When I started my career as a developer, I had no idea how vast the world of web development would turn out to be. I began with simple HTML and CSS, creating static websites that, looking back now, were quite basic. But everyone has to start somewhere, right?

The turning point came when I discovered JavaScript. Suddenly, I could make websites interactive and dynamic. It felt like magic at first – clicking a button and seeing something happen on the screen without refreshing the page. This opened up a whole new world of possibilities.

As I grew more comfortable with frontend development, I became curious about what happens behind the scenes. How do websites store data? How do they handle user authentication? These questions led me down the path of backend development.

Learning Node.js was a natural progression since I already knew JavaScript. Being able to use the same language on both the frontend and backend made the transition smoother. I started with Express.js, building simple REST APIs and gradually working my way up to more complex architectures.

Database design was another challenge. Understanding the differences between SQL and NoSQL databases, knowing when to use which, and learning how to optimize queries for performance – all of this took time and practice. I made plenty of mistakes along the way, but each one taught me something valuable.

Today, I work with modern frameworks like React and Next.js on the frontend, Node.js and Python on the backend, and databases ranging from PostgreSQL to MongoDB. The learning never stops in this field, and that is what makes it exciting.

My advice to aspiring developers: Do not try to learn everything at once. Master one thing at a time, build real projects, and do not be afraid to make mistakes. The best way to learn is by doing.',

  'Da jeg startet karrieren min som utvikler, hadde jeg ingen anelse om hvor omfattende webutviklingsverdenen ville vise seg å være. Jeg begynte med enkel HTML og CSS, og laget statiske nettsider som, når jeg ser tilbake nå, var ganske grunnleggende. Men alle må starte et sted, ikke sant?

Vendepunktet kom da jeg oppdaget JavaScript. Plutselig kunne jeg gjøre nettsider interaktive og dynamiske. Det føltes som magi i begynnelsen – å klikke på en knapp og se noe skje på skjermen uten å oppdatere siden. Dette åpnet opp en helt ny verden av muligheter.

Etter hvert som jeg ble mer komfortabel med frontend-utvikling, ble jeg nysgjerrig på hva som skjer bak kulissene. Hvordan lagrer nettsider data? Hvordan håndterer de brukerautentisering? Disse spørsmålene ledet meg ned stien til backend-utvikling.

Å lære Node.js var en naturlig progresjon siden jeg allerede kunne JavaScript. Å kunne bruke samme språk både på frontend og backend gjorde overgangen jevnere. Jeg startet med Express.js, bygget enkle REST APIer og jobbet meg gradvis opp til mer komplekse arkitekturer.

Databasedesign var en annen utfordring. Å forstå forskjellene mellom SQL og NoSQL-databaser, vite når man skal bruke hvilken, og lære hvordan man optimaliserer spørringer for ytelse – alt dette tok tid og praksis. Jeg gjorde mange feil underveis, men hver enkelt lærte meg noe verdifullt.

I dag jobber jeg med moderne rammeverk som React og Next.js på frontend, Node.js og Python på backend, og databaser som varierer fra PostgreSQL til MongoDB. Læringen stopper aldri i dette feltet, og det er det som gjør det spennende.

Mitt råd til aspirerende utviklere: Ikke prøv å lære alt på en gang. Mestre én ting om gangen, bygg virkelige prosjekter, og ikke vær redd for å gjøre feil. Den beste måten å lære på er ved å gjøre.',

  'Коли я почав свою кар\'єру як розробник, я не уявляв, наскільки величезним виявиться світ веб-розробки. Я почав з простого HTML та CSS, створюючи статичні веб-сайти, які, оглядаючись назад, були досить базовими. Але всі повинні десь починати, чи не так?

Переломний момент настав, коли я відкрив для себе JavaScript. Раптом я міг зробити веб-сайти інтерактивними та динамічними. Спочатку це здавалося магією – натискання кнопки і перегляд чогось на екрані без оновлення сторінки. Це відкрило цілий новий світ можливостей.

По мірі того, як я ставав більш впевненим у фронтенд-розробці, мені стало цікаво, що відбувається за лаштунками. Як веб-сайти зберігають дані? Як вони обробляють автентифікацію користувачів? Ці питання привели мене на шлях бекенд-розробки.

Вивчення Node.js було природним продовженням, оскільки я вже знав JavaScript. Можливість використовувати ту саму мову як на фронтенді, так і на бекенді зробила перехід більш плавним. Я почав з Express.js, створюючи прості REST API і поступово просуваючись до більш складних архітектур.

Дизайн бази даних був ще одним викликом. Розуміння відмінностей між SQL та NoSQL базами даних, знання, коли використовувати яку, і навчання оптимізації запитів для продуктивності – все це зайняло час і практику. Я зробив багато помилок по дорозі, але кожна з них навчила мене чомусь цінному.

Сьогодні я працюю з сучасними фреймворками як React та Next.js на фронтенді, Node.js та Python на бекенді, і базами даних від PostgreSQL до MongoDB. Навчання ніколи не припиняється в цій сфері, і це те, що робить її захоплюючою.

Моя порада майбутнім розробникам: не намагайтеся вивчити все відразу. Опановуйте одну річ за раз, створюйте реальні проекти і не бійтеся робити помилки. Найкращий спосіб навчитися – це робити.',

  'My personal journey and lessons learned transitioning from frontend to full-stack development.',

  'Min personlige reise og leksjoner lært ved overgangen fra frontend til full-stack-utvikling.',

  'Моя особиста подорож та уроки, отримані при переході від фронтенду до повного стеку.',

  'my-journey-fullstack-development',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  'Career',
  NOW() - INTERVAL '1 week',
  ARRAY['career', 'learning', 'personal'],
  true
),
(
  '10 Tips for Writing Clean, Maintainable Code',
  '10 tips for å skrive ren, vedlikeholdbar kode',
  '10 порад для написання чистого, підтримуваного коду',

  'Writing code is easy. Writing code that others (including your future self) can understand and maintain is hard. Over the years, I have learned some principles that help create cleaner, more maintainable codebases.

1. Use meaningful names: Variables, functions, and classes should clearly communicate their purpose. Avoid abbreviations and single-letter names except in very limited contexts like loop counters.

2. Keep functions small: A function should do one thing and do it well. If you find yourself scrolling to see the entire function, it is probably too long.

3. Write comments that explain why, not what: Your code should be self-explanatory about what it does. Comments should explain why you made certain decisions.

4. Follow consistent formatting: Use a formatter like Prettier. Arguing about code style is a waste of time when tools can enforce it automatically.

5. Write tests: Tests are documentation that never goes out of date. They also give you confidence when refactoring.

6. Handle errors properly: Do not just catch and ignore errors. Log them, handle them gracefully, and inform the user when something goes wrong.

7. Avoid premature optimization: Make it work first, then make it fast if needed. Most of the time, clean code is fast enough.

8. Use version control effectively: Write meaningful commit messages. Make small, focused commits. Use branches for new features.

9. Review your own code: Before submitting a pull request, review your own changes. You will often spot issues you missed while writing.

10. Keep learning: Technologies change, best practices evolve. Stay curious and keep improving your craft.

Remember, code is read far more often than it is written. Invest time in making it readable.',

  'Å skrive kode er enkelt. Å skrive kode som andre (inkludert ditt fremtidige jeg) kan forstå og vedlikeholde er vanskelig. Gjennom årene har jeg lært noen prinsipper som hjelper med å lage renere, mer vedlikeholdbare kodebaser.

1. Bruk meningsfulle navn: Variabler, funksjoner og klasser bør tydelig kommunisere sitt formål. Unngå forkortelser og enkelttegnnavn bortsett fra i svært begrensede kontekster som løkketellere.

2. Hold funksjoner små: En funksjon skal gjøre én ting og gjøre den godt. Hvis du må scrolle for å se hele funksjonen, er den sannsynligvis for lang.

3. Skriv kommentarer som forklarer hvorfor, ikke hva: Koden din bør være selvforklarende om hva den gjør. Kommentarer bør forklare hvorfor du tok visse beslutninger.

4. Følg konsekvent formatering: Bruk en formatter som Prettier. Å diskutere kodestil er bortkastet tid når verktøy kan håndheve det automatisk.

5. Skriv tester: Tester er dokumentasjon som aldri blir utdatert. De gir deg også selvtillit når du refaktorerer.

6. Håndter feil riktig: Ikke bare fang og ignorer feil. Logg dem, håndter dem elegant, og informer brukeren når noe går galt.

7. Unngå for tidlig optimalisering: Få det til å fungere først, deretter gjør det raskt om nødvendig. Mesteparten av tiden er ren kode rask nok.

8. Bruk versjonskontroll effektivt: Skriv meningsfulle commit-meldinger. Gjør små, fokuserte commits. Bruk branches for nye funksjoner.

9. Se gjennom din egen kode: Før du sender inn en pull request, se gjennom dine egne endringer. Du vil ofte oppdage problemer du gikk glipp av mens du skrev.

10. Fortsett å lære: Teknologier endrer seg, beste praksis utvikler seg. Hold deg nysgjerrig og fortsett å forbedre håndverket ditt.

Husk, kode leses langt oftere enn den skrives. Invester tid i å gjøre den lesbar.',

  'Написання коду – це легко. Написання коду, який інші (включаючи ваше майбутнє я) можуть зрозуміти та підтримувати – це важко. Протягом років я навчився деяким принципам, які допомагають створювати чистіші, більш підтримувані кодові бази.

1. Використовуйте значущі назви: Змінні, функції та класи повинні чітко передавати свою мету. Уникайте абревіатур та однолітерних назв, за винятком дуже обмежених контекстів, як-от лічильники циклів.

2. Тримайте функції маленькими: Функція повинна робити одну річ і робити її добре. Якщо вам доводиться прокручувати, щоб побачити всю функцію, вона, ймовірно, занадто довга.

3. Пишіть коментарі, які пояснюють чому, а не що: Ваш код повинен бути самопояснюючим щодо того, що він робить. Коментарі повинні пояснювати, чому ви прийняли певні рішення.

4. Дотримуйтесь послідовного форматування: Використовуйте форматер як Prettier. Суперечки про стиль коду – це марна трата часу, коли інструменти можуть застосовувати його автоматично.

5. Пишіть тести: Тести – це документація, яка ніколи не застаріває. Вони також дають вам впевненість при рефакторингу.

6. Правильно обробляйте помилки: Не просто ловіть і ігноруйте помилки. Логуйте їх, обробляйте їх витончено і інформуйте користувача, коли щось йде не так.

7. Уникайте передчасної оптимізації: Спочатку зробіть так, щоб воно працювало, потім зробіть швидким, якщо потрібно. Більшість часу чистий код достатньо швидкий.

8. Ефективно використовуйте контроль версій: Пишіть значущі повідомлення комітів. Робіть невеликі, сфокусовані коміти. Використовуйте гілки для нових функцій.

9. Переглядайте свій власний код: Перед відправкою pull request переглянете свої власні зміни. Ви часто помітите проблеми, які пропустили під час написання.

10. Продовжуйте навчатися: Технології змінюються, найкращі практики еволюціонують. Залишайтеся допитливими і продовжуйте вдосконалювати свою майстерність.

Пам\'ятайте, код читається набагато частіше, ніж пишеться. Інвестуйте час у те, щоб зробити його читабельним.',

  'Essential principles and practices for writing code that is easy to read, understand, and maintain.',

  'Essensielle prinsipper og praksis for å skrive kode som er lett å lese, forstå og vedlikeholde.',

  'Основні принципи та практики для написання коду, який легко читати, розуміти та підтримувати.',

  'clean-maintainable-code-tips',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
  'Best Practices',
  NOW() - INTERVAL '2 weeks',
  ARRAY['clean code', 'best practices', 'programming'],
  true
);

-- Verify the data was inserted
SELECT 'News items inserted:' as message, COUNT(*) as count FROM news;
SELECT 'Blog posts inserted:' as message, COUNT(*) as count FROM blog_posts;
