/**
 * trigger-thumbnails.js
 *
 * Triggers 4-variant thumbnail generation for existing daily videos
 * via the daily-video-bot Edge Function.
 *
 * Usage:
 *   node trigger-thumbnails.js [YYYY-MM-DD] [YYYY-MM-DD] ...
 *   node trigger-thumbnails.js              # defaults to 2026-03-06, 2026-03-07
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DEFAULT_DATES = ['2026-03-06', '2026-03-07'];

async function triggerThumbnails(targetDate) {
  console.log(`\n🖼️ Triggering thumbnail generation for ${targetDate}...`);

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/daily-video-bot?action=generate_thumbnails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_date: targetDate }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`❌ Failed for ${targetDate}: ${resp.status} ${errText.substring(0, 300)}`);
    return false;
  }

  const data = await resp.json();
  console.log(`✅ ${targetDate}: ${data.variants || 0} variants sent to Telegram`);
  return true;
}

async function main() {
  const dates = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_DATES;

  console.log('🚀 Thumbnail Generation Trigger');
  console.log(`📅 Dates: ${dates.join(', ')}\n`);

  for (const date of dates) {
    try {
      await triggerThumbnails(date);
    } catch (e) {
      console.error(`❌ ${date}: ${e.message}`);
    }
    // Small delay between dates to avoid Gemini rate limits
    if (dates.indexOf(date) < dates.length - 1) {
      console.log('⏳ Waiting 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n✅ Done! Check Telegram for thumbnail variants.');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
