-- Sample data for News and Blog sections
-- Run this in Supabase SQL Editor to populate the database with test data

-- Insert sample news items
INSERT INTO news (
  title_en, title_no, title_ua,
  content_en, content_no, content_ua,
  description_en, description_no, description_ua,
  image_url, original_url, published_at, tags, is_published
) VALUES
(
  'AI Revolution in Web Development',
  'AI-revolusjon i webutvikling',
  'Революція AI у веб-розробці',

  $$Artificial Intelligence is transforming how we build web applications. Modern AI assistants can now generate complete components, suggest optimal architectures, and even debug complex issues automatically.

Tools like GitHub Copilot and ChatGPT have become essential parts of the modern developer's toolkit. They help with everything from writing boilerplate code to explaining complex algorithms.

However, it's important to remember that AI is a tool to augment human developers, not replace them. Understanding the fundamentals of programming remains crucial for writing maintainable, secure, and efficient code.$$,

  $$Kunstig intelligens transformerer hvordan vi bygger webapplikasjoner. Moderne AI-assistenter kan nå generere komplette komponenter, foreslå optimale arkitekturer og til og med feilsøke komplekse problemer automatisk.

Verktøy som GitHub Copilot og ChatGPT har blitt essensielle deler av den moderne utviklerens verktøykasse. De hjelper med alt fra å skrive standardkode til å forklare komplekse algoritmer.

Det er imidlertid viktig å huske at AI er et verktøy for å utvide menneskelige utviklere, ikke erstatte dem.$$,

  $$Штучний інтелект змінює те як ми створюємо веб-додатки. Сучасні AI-асистенти тепер можуть генерувати повні компоненти, пропонувати оптимальні архітектури і навіть автоматично виправляти складні проблеми.

Інструменти як GitHub Copilot та ChatGPT стали важливою частиною набору інструментів сучасного розробника. Вони допомагають у всьому від написання шаблонного коду до пояснення складних алгоритмів.

Однак важливо пам'ятати що AI це інструмент для розширення можливостей розробників а не для їх заміни.$$,

  'AI tools are revolutionizing development workflows. Modern AI can generate code, design interfaces, and optimize performance automatically.',
  'AI-verktøy revolusjonerer utviklingsflyter. Moderne AI kan generere kode, designe grensesnitt og optimalisere ytelsen automatisk.',
  'Інструменти AI революціонізують робочі процеси розробки. Сучасний AI може генерувати код, проектувати інтерфейси та автоматично оптимізувати продуктивність.',

  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
  'https://example.com/ai-revolution',
  NOW() - INTERVAL '2 hours',
  ARRAY['AI', 'technology', 'web development'],
  true
),
(
  'New React 19 Features Released',
  'Nye React 19-funksjoner utgitt',
  'Випущені нові функції React 19',

  $$React 19 has been officially released with several groundbreaking features that will change how we build React applications.

The new automatic batching feature improves performance by grouping multiple state updates into a single re-render. Server Components have been completely redesigned to provide better streaming and suspense support.

The React team has also introduced improved TypeScript support, better error messages, and enhanced development tools. These updates make React faster, more intuitive, and easier to debug.

Developers should note that while React 19 is backward compatible with most existing code, some deprecated features have been removed. Review the migration guide before upgrading production applications.$$,

  $$React 19 er offisielt utgitt med flere banebrytende funksjoner som vil endre hvordan vi bygger React-applikasjoner.

Den nye automatiske batchingfunksjonen forbedrer ytelsen ved å gruppere flere tilstandsoppdateringer til en enkelt gjengivelse. Serverkomponenter har blitt helt redesignet.

React-teamet har også introdusert forbedret TypeScript-støtte, bedre feilmeldinger og forbedrede utviklerverktøy. Disse oppdateringene gjør React raskere og mer intuitiv.

Utviklere bør merke seg at selv om React 19 er bakoverkompatibel, har noen utdaterte funksjoner blitt fjernet.$$,

  $$React 19 офіційно випущено з декількома революційними функціями які змінять те як ми створюємо React додатки.

Нова функція автоматичного групування покращує продуктивність шляхом об'єднання декількох оновлень стану в одне повторне відображення. Серверні компоненти були повністю перероблені.

Команда React також представила покращену підтримку TypeScript, кращі повідомлення про помилки та покращені інструменти розробки. Ці оновлення роблять React швидшим та більш інтуїтивним.

Розробники повинні зауважити що хоча React 19 зворотно сумісний деякі застарілі функції були видалені.$$,

  'React 19 brings groundbreaking features including automatic batching, improved server components, and enhanced performance optimizations.',
  'React 19 bringer banebrytende funksjoner inkludert automatisk gruppering, forbedrede serverkomponenter og forbedrede ytelsesoptimaliseringer.',
  'React 19 приносить революційні функції, включаючи автоматичне групування, покращені серверні компоненти та розширені оптимізації продуктивності.',

  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
  'https://react.dev',
  NOW() - INTERVAL '5 hours',
  ARRAY['React', 'JavaScript', 'frontend'],
  true
),
(
  'TypeScript 5.5 Improves Developer Experience',
  'TypeScript 5.5 forbedrer utvikleropplevelsen',
  'TypeScript 5.5 покращує досвід розробника',

  $$TypeScript 5.5 introduces significant improvements that enhance the developer experience across the board.

The compiler now provides much more helpful error messages that clearly explain what went wrong and how to fix it. Compilation times have been reduced by up to 30 percent in large codebases through better caching and optimization.

IDE support has been enhanced with smarter auto-completion, better refactoring tools, and more accurate type inference. The language server is now faster and uses less memory.

New type system features include better handling of template literal types, improved narrowing, and more precise type checking. These changes help catch more bugs at compile time.

The TypeScript team continues to focus on making the language more powerful while keeping it easy to use and understand.$$,

  $$TypeScript 5.5 introduserer betydelige forbedringer som forbedrer utvikleropplevelsen over hele linjen.

Kompilatoren gir nå mye mer nyttige feilmeldinger som tydelig forklarer hva som gikk galt. Kompileringstidene er redusert med opptil 30 prosent.

IDE-støtten er forbedret med smartere autofullføring, bedre refaktoreringsverktøy og mer nøyaktig typeslutning. Språkserveren er nå raskere.

Nye typesystemfunksjoner inkluderer bedre håndtering av malstrengtyper og mer presis typekontroll.

TypeScript-teamet fortsetter å fokusere på å gjøre språket kraftigere samtidig som det er lett å bruke.$$,

  $$TypeScript 5.5 представляє значні покращення які покращують досвід розробника.

Компілятор тепер надає набагато корисніші повідомлення про помилки які чітко пояснюють що пішло не так. Час компіляції скорочено до 30 відсотків.

Підтримка IDE покращена за допомогою розумнішого автозаповнення, кращих інструментів рефакторингу та точнішого виведення типів. Мовний сервер тепер швидший.

Нові функції системи типів включають краще обробку типів літералів шаблонів та точнішу перевірку типів.

Команда TypeScript продовжує зосереджуватися на тому щоб зробити мову потужнішою зберігаючи її простоту використання.$$,

  'TypeScript gets major upgrades with better error messages, faster compilation times, and improved IDE support.',
  'TypeScript får store oppgraderinger med bedre feilmeldinger, raskere kompileringstider og forbedret IDE-støtte.',
  'TypeScript отримує значні оновлення з кращими повідомленнями про помилки, швидшим часом компіляції та покращеною підтримкою IDE.',

  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
  'https://devblogs.microsoft.com/typescript',
  NOW() - INTERVAL '1 day',
  ARRAY['TypeScript', 'JavaScript', 'programming'],
  true
);

-- Insert sample blog posts
INSERT INTO blog_posts (
  title_en, title_no, title_ua,
  content_en, content_no, content_ua,
  description_en, description_no, description_ua,
  slug_en, image_url, category, published_at, tags, is_published
) VALUES
(
  'Building Modern Web Applications',
  'Bygge moderne webapplikasjoner',
  'Створення сучасних веб-додатків',

  $$A comprehensive guide to building modern web applications using React and TypeScript.

In this guide, I will walk you through the process of building a modern web application. We will cover everything from project setup to deployment, including best practices for component architecture, state management, and testing.

React has become the go-to library for building user interfaces, and TypeScript adds type safety that catches bugs before they reach production. Together, they create a powerful development experience.

Component architecture is crucial for maintainable applications. I recommend following the atomic design principles to organize your code effectively.

For state management, explore both local state with useState and global state management with Context API. Testing is essential - cover unit testing, integration testing, and end-to-end testing.

Finally, deploy your application to Netlify with automatic CI/CD for seamless updates.$$,

  $$En omfattende guide til å bygge moderne webapplikasjoner ved hjelp av React og TypeScript.

I denne guiden vil jeg lede deg gjennom prosessen. Vi vil dekke alt fra prosjektoppsett til distribusjon, inkludert beste praksis for komponentarkitektur, tilstandshåndtering og testing.

React har blitt det foretrukne biblioteket for brukergrensesnitt, og TypeScript legger til typesikkerhet. Sammen skaper de en kraftig utvikleropplevelse.

Komponentarkitektur er avgjørende for vedlikeholdbare applikasjoner. Jeg anbefaler å følge atomiske designprinsipper.

For tilstandshåndtering, utforsk både lokal tilstand og global tilstandshåndtering. Testing er essensielt.

Til slutt, distribuer applikasjonen til Netlify med automatisk CI/CD.$$,

  $$Всеосяжний посібник зі створення сучасних веб-додатків за допомогою React та TypeScript.

У цьому посібнику я проведу вас через процес створення сучасного веб-додатку. Ми розглянемо все від налаштування проекту до розгортання, включаючи найкращі практики.

React став основною бібліотекою для створення користувацьких інтерфейсів, а TypeScript додає безпеку типів. Разом вони створюють потужний досвід розробки.

Архітектура компонентів є критично важливою для підтримуваних додатків. Я рекомендую дотримуватись принципів атомарного дизайну.

Для керування станом дослідіть як локальний стан так і глобальне керування станом. Тестування є обов'язковим.

Нарешті, розгорніть ваш додаток на Netlify з автоматичним CI/CD.$$,

  'A comprehensive guide to building modern web applications with React, TypeScript, and best practices.',
  'En omfattende guide til å bygge moderne webapplikasjoner med React, TypeScript og beste praksis.',
  'Всеосяжний посібник зі створення сучасних веб-додатків з React, TypeScript та найкращими практиками.',

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

  $$When I started my career as a developer, I had no idea how vast the world of web development would turn out to be. I began with simple HTML and CSS, creating static websites.

The turning point came when I discovered JavaScript. Suddenly, I could make websites interactive and dynamic. This opened up a whole new world of possibilities.

As I grew more comfortable with frontend development, I became curious about what happens behind the scenes. Learning Node.js was a natural progression since I already knew JavaScript.

Database design was another challenge. Understanding the differences between SQL and NoSQL databases took time and practice.

Today, I work with modern frameworks like React and Next.js on the frontend, Node.js and Python on the backend. The learning never stops in this field.

My advice to aspiring developers: Do not try to learn everything at once. Master one thing at a time, build real projects, and do not be afraid to make mistakes.$$,

  $$Da jeg startet karrieren min som utvikler, hadde jeg ingen anelse om hvor omfattende webutviklingsverdenen ville være. Jeg begynte med enkel HTML og CSS.

Vendepunktet kom da jeg oppdaget JavaScript. Plutselig kunne jeg gjøre nettsider interaktive og dynamiske.

Etter hvert ble jeg nysgjerrig på hva som skjer bak kulissene. Å lære Node.js var en naturlig progresjon.

Databasedesign var en annen utfordring. Å forstå forskjellene mellom SQL og NoSQL tok tid.

I dag jobber jeg med moderne rammeverk som React og Next.js. Læringen stopper aldri.

Mitt råd: Ikke prøv å lære alt på en gang. Bygg virkelige prosjekter.$$,

  $$Коли я почав свою кар'єру як розробник, я не уявляв наскільки величезним виявиться світ веб-розробки. Я почав з простого HTML та CSS.

Переломний момент настав коли я відкрив для себе JavaScript. Раптом я міг зробити веб-сайти інтерактивними.

По мірі того як я ставав більш впевненим у фронтенд-розробці мені стало цікаво що відбувається за лаштунками. Вивчення Node.js було природним продовженням.

Дизайн бази даних був ще одним викликом. Розуміння відмінностей між SQL та NoSQL зайняло час.

Сьогодні я працюю з сучасними фреймворками як React та Next.js. Навчання ніколи не припиняється.

Моя порада: не намагайтеся вивчити все відразу. Створюйте реальні проекти.$$,

  'My personal journey and lessons learned transitioning from frontend to full-stack development.',
  'Min personlige reise og leksjoner lært ved overgangen fra frontend til full-stack-utvikling.',
  'Моя особиста подорож та уроки отримані при переході від фронтенду до повного стеку.',

  'my-journey-fullstack-development',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  'Career',
  NOW() - INTERVAL '1 week',
  ARRAY['career', 'learning', 'personal'],
  true
),
(
  '10 Tips for Writing Clean Code',
  '10 tips for å skrive ren kode',
  '10 порад для написання чистого коду',

  $$Writing code is easy. Writing code that others can understand and maintain is hard. Here are my top tips:

1. Use meaningful names - Variables and functions should clearly communicate their purpose.

2. Keep functions small - A function should do one thing and do it well.

3. Write comments that explain why, not what - Your code should be self-explanatory.

4. Follow consistent formatting - Use a formatter like Prettier.

5. Write tests - Tests are documentation that never goes out of date.

6. Handle errors properly - Do not just catch and ignore errors.

7. Avoid premature optimization - Make it work first, then make it fast.

8. Use version control effectively - Write meaningful commit messages.

9. Review your own code - You will often spot issues you missed.

10. Keep learning - Technologies change, best practices evolve.

Remember, code is read far more often than it is written.$$,

  $$Å skrive kode er enkelt. Å skrive kode som andre kan forstå er vanskelig. Her er mine tips:

1. Bruk meningsfulle navn
2. Hold funksjoner små
3. Skriv kommentarer som forklarer hvorfor
4. Følg konsekvent formatering
5. Skriv tester
6. Håndter feil riktig
7. Unngå for tidlig optimalisering
8. Bruk versjonskontroll effektivt
9. Se gjennom din egen kode
10. Fortsett å lære

Husk, kode leses langt oftere enn den skrives.$$,

  $$Написання коду легко. Написання коду який інші можуть зрозуміти важко. Ось мої поради:

1. Використовуйте значущі назви
2. Тримайте функції маленькими
3. Пишіть коментарі які пояснюють чому
4. Дотримуйтесь послідовного форматування
5. Пишіть тести
6. Правильно обробляйте помилки
7. Уникайте передчасної оптимізації
8. Ефективно використовуйте контроль версій
9. Переглядайте свій власний код
10. Продовжуйте навчатися

Пам'ятайте код читається набагато частіше ніж пишеться.$$,

  'Essential principles and practices for writing code that is easy to read, understand, and maintain.',
  'Essensielle prinsipper og praksis for å skrive kode som er lett å lese, forstå og vedlikeholde.',
  'Основні принципи та практики для написання коду який легко читати розуміти та підтримувати.',

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
