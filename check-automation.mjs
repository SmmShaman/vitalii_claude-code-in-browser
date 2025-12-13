import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAutomation() {
  console.log('🔍 Перевірка автоматичної публікації новин\n');

  // 1. Перевірити news_sources
  console.log('📡 1. Джерела новин (news_sources):\n');

  const { data: sources, error: sourcesError } = await supabase
    .from('news_sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (sourcesError) {
    console.error('❌ Помилка:', sourcesError.message);
  } else if (sources.length === 0) {
    console.log('❌ ПРОБЛЕМА: Немає жодного джерела новин!');
    console.log('   Потрібно додати джерела в таблицю news_sources\n');
  } else {
    console.log(`✅ Знайдено ${sources.length} джерел:\n`);
    sources.forEach((source, i) => {
      console.log(`${i + 1}. ${source.name}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   RSS: ${source.rss_url || 'немає'}`);
      console.log(`   Тип: ${source.source_type}`);
      console.log(`   Активний: ${source.is_active ? '✅ ТАК' : '❌ НІ'}`);
      console.log(`   Інтервал фетчу: ${source.fetch_interval} хвилин`);
      console.log(`   Останній fetch: ${source.last_fetched_at || 'ніколи'}`);
      console.log('');
    });

    // Перевірити активні джерела
    const activeSources = sources.filter(s => s.is_active);
    if (activeSources.length === 0) {
      console.log('❌ ПРОБЛЕМА: Всі джерела деактивовані (is_active = false)!\n');
    }

    // Перевірити RSS URLs
    const sourceWithoutRSS = sources.filter(s => s.source_type === 'rss' && !s.rss_url);
    if (sourceWithoutRSS.length > 0) {
      console.log(`⚠️  УВАГА: ${sourceWithoutRSS.length} RSS джерел без rss_url!\n`);
    }
  }

  // 2. Перевірити чи є нові новини за останню добу
  console.log('\n📰 2. Нові новини за останні 24 години:\n');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentNews, error: newsError } = await supabase
    .from('news')
    .select('id, title_en, created_at, is_published')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });

  if (newsError) {
    console.error('❌ Помилка:', newsError.message);
  } else {
    console.log(`Знайдено ${recentNews.length} новин:\n`);
    if (recentNews.length === 0) {
      console.log('❌ ПРОБЛЕМА: Жодної нової новини за 24 години!');
      console.log('   Автоматичний fetch НЕ працює!\n');
    } else {
      recentNews.forEach((news, i) => {
        console.log(`${i + 1}. ${news.title_en || 'Без назви'}`);
        console.log(`   Створено: ${news.created_at}`);
        console.log(`   Опубліковано: ${news.is_published ? '✅' : '❌'}`);
        console.log('');
      });
    }
  }

  // 3. Перевірити чи є Edge Function fetch-news
  console.log('\n🔧 3. Рекомендації для налаштування:\n');
  console.log('Автоматичний fetch новин потребує:');
  console.log('');
  console.log('✅ 1. Supabase pg_cron extension:');
  console.log('   - Dashboard → Database → Extensions → Enable pg_cron');
  console.log('');
  console.log('✅ 2. Cron job для виклику Edge Function:');
  console.log('   SQL для створення cron job:');
  console.log('');
  console.log("   SELECT cron.schedule(");
  console.log("     'fetch-news-hourly',");
  console.log("     '0 * * * *',  -- Кожну годину");
  console.log("     $$");
  console.log("     SELECT net.http_post(");
  console.log("       url := 'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news',");
  console.log("       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))");
  console.log("     );");
  console.log("     $$");
  console.log("   );");
  console.log('');
  console.log('✅ 3. Edge Function fetch-news має існувати');
  console.log('   - Dashboard → Edge Functions → fetch-news');
  console.log('');
  console.log('✅ 4. Активні джерела в news_sources');
  console.log('   - is_active = true');
  console.log('   - rss_url заповнений для RSS джерел');
  console.log('');
}

checkAutomation().catch(console.error);
