import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSourcesStructure() {
  console.log('🔍 Перевіряю структуру news_sources...\n');

  const { data: sources, error } = await supabase
    .from('news_sources')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Помилка:', error);
    return;
  }

  if (sources && sources.length > 0) {
    console.log('📊 Поля в таблиці news_sources:\n');
    const fields = Object.keys(sources[0]);
    fields.forEach(field => {
      console.log(`  • ${field}: ${typeof sources[0][field]} = ${sources[0][field]}`);
    });

    console.log('\n🔍 Перевіряю чи є поля для індивідуального графіку:\n');
    const hasInterval = fields.includes('fetch_interval') || fields.includes('scraping_interval');
    const hasNextFetch = fields.includes('next_fetch_at');
    const hasLastFetch = fields.includes('last_fetched_at');

    console.log(`  fetch_interval/scraping_interval: ${hasInterval ? '✅' : '❌'}`);
    console.log(`  next_fetch_at: ${hasNextFetch ? '✅' : '❌'}`);
    console.log(`  last_fetched_at: ${hasLastFetch ? '✅' : '❌'}`);
  }

  // Перевірити всі джерела з їх графіками
  console.log('\n📋 Всі джерела та їх графіки:\n');

  const { data: allSources } = await supabase
    .from('news_sources')
    .select('id, name, source_type, is_active, last_fetched_at')
    .eq('is_active', true)
    .order('name');

  if (allSources) {
    allSources.forEach(s => {
      console.log(`\n📌 ${s.name} (${s.source_type})`);
      console.log(`   Active: ${s.is_active}`);
      console.log(`   Last fetch: ${s.last_fetched_at || 'Ніколи'}`);

      // Перевірити всі можливі поля для графіку
      const allFields = Object.keys(s);
      const scheduleFields = allFields.filter(f =>
        f.includes('interval') ||
        f.includes('schedule') ||
        f.includes('cron') ||
        f.includes('next')
      );

      if (scheduleFields.length > 0) {
        scheduleFields.forEach(field => {
          console.log(`   ${field}: ${s[field]}`);
        });
      }
    });
  }
}

checkSourcesStructure().catch(console.error);
