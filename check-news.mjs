import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNews() {
  console.log('\n📰 Checking published news...\n');

  const { data: news, error } = await supabase
    .from('news')
    .select('id, title_en, image_url, is_published, is_rewritten, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching news:', error);
    return;
  }

  console.log(`✅ Found ${news.length} published news items:\n`);

  news.forEach((item, index) => {
    console.log(`${index + 1}. ${item.title_en}`);
    console.log(`   ID: ${item.id}`);
    console.log(`   Image URL: ${item.image_url || '❌ NO IMAGE'}`);
    console.log(`   Published: ${item.is_published}`);
    console.log(`   Rewritten: ${item.is_rewritten}`);
    console.log(`   Created: ${item.created_at}`);
    console.log('');
  });
}

async function checkStorage() {
  console.log('\n💾 Checking Storage buckets...\n');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Error fetching buckets:', error);
    return;
  }

  console.log(`✅ Found ${buckets.length} storage buckets:\n`);

  buckets.forEach((bucket, index) => {
    console.log(`${index + 1}. ${bucket.name}`);
    console.log(`   ID: ${bucket.id}`);
    console.log(`   Public: ${bucket.public}`);
    console.log('');
  });

  // Check files in news-images bucket if it exists
  const newsImagesBucket = buckets.find(b => b.name === 'news-images');
  if (newsImagesBucket) {
    console.log('\n📁 Checking files in news-images bucket...\n');

    const { data: files, error: filesError } = await supabase.storage
      .from('news-images')
      .list('', { limit: 10 });

    if (filesError) {
      console.error('❌ Error fetching files:', filesError);
    } else {
      console.log(`✅ Found ${files.length} files:\n`);
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   Size: ${file.metadata?.size || 'unknown'} bytes`);
        console.log(`   Created: ${file.created_at}`);
        console.log('');
      });
    }
  }
}

async function main() {
  await checkNews();
  await checkStorage();
}

main().catch(console.error);
