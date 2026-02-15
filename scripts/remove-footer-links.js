/**
 * Remove footer "Related articles" sections from all published articles.
 * These sections were appended by the enrich-article-links function.
 *
 * Pattern to remove (from each content_en/no/ua):
 *   \n\n---\n\n**Related articles:** ...
 *   \n\n---\n\n**Relaterte artikler:** ...
 *   \n\n---\n\n**Пов'язані статті:** ...
 *
 * Usage: node scripts/remove-footer-links.js
 */

const fs = require('fs');
const path = require('path');

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

// Regex patterns to match the footer sections
const FOOTER_PATTERNS = [
  /\n\n---\n\n\*\*Related articles:\*\*[^\n]*/g,
  /\n\n---\n\n\*\*Relaterte artikler:\*\*[^\n]*/g,
  /\n\n---\n\n\*\*Пов'язані статті:\*\*[^\n]*/g,
];

function removeFooterLinks(content) {
  if (!content) return { content, changed: false };
  let result = content;
  for (const pattern of FOOTER_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return { content: result, changed: result !== content };
}

async function fetchArticles(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id,content_en,content_no,content_ua&is_published=eq.true&order=published_at.desc`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`);
  return res.json();
}

async function updateArticle(table, id, updateData) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error(`Failed to update ${table}/${id}: ${res.status}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processTable(table) {
  console.log(`\n📰 Processing ${table}...`);
  const articles = await fetchArticles(table);
  console.log(`   Found ${articles.length} published articles`);

  let cleaned = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const en = removeFooterLinks(article.content_en);
    const no = removeFooterLinks(article.content_no);
    const ua = removeFooterLinks(article.content_ua);

    if (en.changed || no.changed || ua.changed) {
      const updateData = {};
      if (en.changed) updateData.content_en = en.content;
      if (no.changed) updateData.content_no = no.content;
      if (ua.changed) updateData.content_ua = ua.content;

      try {
        await updateArticle(table, article.id, updateData);
        process.stdout.write(`[${i + 1}/${articles.length}] ${article.id.substring(0, 8)}... ✅ cleaned\n`);
        cleaned++;
      } catch (e) {
        process.stdout.write(`[${i + 1}/${articles.length}] ${article.id.substring(0, 8)}... ❌ ${e.message}\n`);
      }
      await sleep(50);
    } else {
      skipped++;
    }
  }

  console.log(`   ✅ Cleaned: ${cleaned}, ⏭️ No footer: ${skipped}`);
  return { cleaned, skipped };
}

async function main() {
  console.log('🧹 Remove Footer Links Script');

  const newsResult = await processTable('news');
  const blogResult = await processTable('blog_posts');

  console.log('\n📊 Total:');
  console.log(`   ✅ Cleaned: ${newsResult.cleaned + blogResult.cleaned}`);
  console.log(`   ⏭️ Skipped: ${newsResult.skipped + blogResult.skipped}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
