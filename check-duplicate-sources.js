// Check for duplicate news sources
const SUPABASE_URL = 'https://uchmopqiylywnemvjttl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaG1vcHFpeWx5d25lbXZqdHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ5ODkyMywiZXhwIjoyMDc3MDc0OTIzfQ.n1WYq8F_Bcq0bW_gYI9b6GhIARBVvs0p00nxvr3aeCY';

async function checkSources() {
  console.log('🔍 Checking for duplicate sources...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/news_sources?select=id,name,source_type,url,rss_url,is_active&order=name,source_type`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const sources = await response.json();

  // Group by name
  const grouped = {};
  sources.forEach(source => {
    if (!grouped[source.name]) {
      grouped[source.name] = [];
    }
    grouped[source.name].push(source);
  });

  // Find duplicates
  console.log('📊 All sources grouped by name:\n');
  Object.keys(grouped).sort().forEach(name => {
    const items = grouped[name];
    if (items.length > 1) {
      console.log(`⚠️  DUPLICATE: ${name} (${items.length} entries)`);
    } else {
      console.log(`✅ ${name} (1 entry)`);
    }
    items.forEach(item => {
      console.log(`   - ID: ${item.id}`);
      console.log(`     Type: ${item.source_type}`);
      console.log(`     URL: ${item.url || 'null'}`);
      console.log(`     RSS URL: ${item.rss_url || 'null'}`);
      console.log(`     Active: ${item.is_active}`);
      console.log('');
    });
  });

  // Highlight problematic ones
  console.log('\n🚨 PROBLEMS FOUND:\n');
  Object.keys(grouped).forEach(name => {
    const items = grouped[name];
    if (items.length > 1) {
      console.log(`❌ ${name}: ${items.length} duplicate entries need cleanup`);
      items.forEach(item => {
        if (item.source_type === 'rss' && !item.rss_url) {
          console.log(`   → ID ${item.id}: RSS type but no RSS URL - SHOULD BE DELETED`);
        }
      });
    }
  });
}

checkSources().catch(console.error);
