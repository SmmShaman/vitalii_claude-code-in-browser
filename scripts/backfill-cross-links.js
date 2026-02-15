/**
 * Backfill cross-links for existing published articles.
 * Calls enrich-article-links edge function for each article that has tags.
 *
 * Usage: node scripts/backfill-cross-links.js
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const fs = require('fs');
const path = require('path');

// Load env from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or ANON_KEY in .env.local');
  process.exit(1);
}

async function fetchArticles(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id,tags&is_published=eq.true&tags=not.is.null&order=published_at.desc`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function enrichArticle(articleId, type) {
  const url = `${SUPABASE_URL}/functions/v1/enrich-article-links`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId, type })
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `${res.status}: ${text}` };
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔗 Backfill Cross-Links Script');
  console.log(`📡 Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Fetch all published articles with tags
  console.log('📰 Fetching published news with tags...');
  const news = await fetchArticles('news');
  const newsWithTags = news.filter(n => n.tags && n.tags.length > 0);
  console.log(`   Found ${news.length} published news, ${newsWithTags.length} with tags`);

  console.log('📖 Fetching published blog posts with tags...');
  const blogs = await fetchArticles('blog_posts');
  const blogsWithTags = blogs.filter(b => b.tags && b.tags.length > 0);
  console.log(`   Found ${blogs.length} published blog posts, ${blogsWithTags.length} with tags`);

  const total = newsWithTags.length + blogsWithTags.length;
  console.log(`\n🚀 Processing ${total} articles...\n`);

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  // Process news
  for (let i = 0; i < newsWithTags.length; i++) {
    const article = newsWithTags[i];
    process.stdout.write(`[${i + 1}/${total}] News ${article.id.substring(0, 8)}... `);

    try {
      const result = await enrichArticle(article.id, 'news');
      if (result.success && result.linksAdded > 0) {
        console.log(`✅ +${result.linksAdded} links`);
        enriched++;
      } else if (result.success) {
        console.log(`⏭️  skipped (${result.reason || 'no matches'})`);
        skipped++;
      } else {
        console.log(`❌ ${result.error}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
    }

    // Rate limit: 200ms between calls
    await sleep(200);
  }

  // Process blog posts
  for (let i = 0; i < blogsWithTags.length; i++) {
    const article = blogsWithTags[i];
    const idx = newsWithTags.length + i + 1;
    process.stdout.write(`[${idx}/${total}] Blog ${article.id.substring(0, 8)}... `);

    try {
      const result = await enrichArticle(article.id, 'blog');
      if (result.success && result.linksAdded > 0) {
        console.log(`✅ +${result.linksAdded} links`);
        enriched++;
      } else if (result.success) {
        console.log(`⏭️  skipped (${result.reason || 'no matches'})`);
        skipped++;
      } else {
        console.log(`❌ ${result.error}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
    }

    await sleep(200);
  }

  console.log('\n📊 Results:');
  console.log(`   ✅ Enriched: ${enriched}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   📄 Total:    ${total}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
