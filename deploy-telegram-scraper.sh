#!/bin/bash

# 🕷️  Deploy telegram-scraper Edge Function to Supabase

set -e  # Exit on error

echo "🕷️  Deploying telegram-scraper Edge Function..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  # or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/telegram-scraper" ]; then
    echo "❌ Error: telegram-scraper function not found"
    echo "Make sure you're in the project root directory"
    exit 1
fi

echo "✅ telegram-scraper function found"
echo ""

# Deploy the function
echo "📦 Deploying function..."
cd supabase
supabase functions deploy telegram-scraper

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Next steps:"
echo "  1. Check function in Dashboard: https://app.supabase.com/project/uchmopqiylywnemvjttl/functions"
echo "  2. Test it manually (click 'Invoke function' or use curl)"
echo "  3. Set up cron job (see TELEGRAM_SCRAPER_GUIDE.md)"
echo ""
echo "🎉 Done!"
