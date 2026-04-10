#!/usr/bin/env node

/**
 * Seed portfolio_features table from data/portfolioFeatures.ts
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-portfolio-features.js
 *
 * Or with .env file:
 *   node -e "require('dotenv').config()" scripts/seed-portfolio-features.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Try to load env from .env.local
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') }); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Portfolio features data (extracted from data/portfolioFeatures.ts)
// We dynamically import or require the compiled version
async function loadFeatures() {
  // Try requiring the TS file via tsx or ts-node, or read raw and parse
  try {
    // Attempt direct require with tsx
    const mod = require('../data/portfolioFeatures');
    return mod.portfolioFeatures;
  } catch {
    // Fallback: read the file and extract data manually
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'data', 'portfolioFeatures.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // Use a simple eval approach (safe since it's our own file)
    const cleaned = content
      .replace(/^import.*$/gm, '')
      .replace(/^export\s+/gm, '')
      .replace(/: Feature\[\]/g, '')
      .replace(/: FeatureCategory/g, '');

    const fn = new Function(`
      ${cleaned}
      return portfolioFeatures;
    `);
    return fn();
  }
}

async function seed() {
  console.log('🌱 Seeding portfolio_features table...');

  const features = await loadFeatures();
  console.log(`   Found ${features.length} features`);

  const rows = features.map(f => ({
    feature_key: f.id,
    project_id: f.projectId || 'portfolio',
    category: f.category,
    title_en: f.title?.en || null,
    title_no: f.title?.no || null,
    title_ua: f.title?.ua || null,
    short_description_en: f.shortDescription?.en || null,
    short_description_no: f.shortDescription?.no || null,
    short_description_ua: f.shortDescription?.ua || null,
    problem_en: f.problem?.en || null,
    problem_no: f.problem?.no || null,
    problem_ua: f.problem?.ua || null,
    solution_en: f.solution?.en || null,
    solution_no: f.solution?.no || null,
    solution_ua: f.solution?.ua || null,
    result_en: f.result?.en || null,
    result_no: f.result?.no || null,
    result_ua: f.result?.ua || null,
    tech_stack: f.techStack || [],
    hashtags: f.hashtags || [],
    is_active: true,
  }));

  // Upsert in batches of 20
  const batchSize = 20;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('portfolio_features')
      .upsert(batch, { onConflict: 'feature_key' })
      .select('feature_key');

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      continue;
    }

    inserted += (data?.length || 0);
    console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} rows upserted`);
  }

  console.log(`\n🎉 Done! ${inserted} features seeded to portfolio_features table`);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
