#!/bin/bash

# Deployment script for Supabase Edge Functions
# This script will deploy all three functions

echo "🚀 Starting deployment of Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed!"
    echo "Please install it first:"
    echo ""
    echo "macOS:   brew install supabase/tap/supabase"
    echo "Linux:   npm install -g supabase"
    echo "Windows: scoop install supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Deploy monitor-news function
echo "📡 Deploying monitor-news function..."
supabase functions deploy monitor-news --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ monitor-news deployed successfully"
else
    echo "❌ Failed to deploy monitor-news"
    exit 1
fi
echo ""

# Deploy telegram-webhook function
echo "📱 Deploying telegram-webhook function..."
supabase functions deploy telegram-webhook --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ telegram-webhook deployed successfully"
else
    echo "❌ Failed to deploy telegram-webhook"
    exit 1
fi
echo ""

# Deploy process-news function
echo "🤖 Deploying process-news function..."
supabase functions deploy process-news --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ process-news deployed successfully"
else
    echo "❌ Failed to deploy process-news"
    exit 1
fi
echo ""

echo "🎉 All functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Supabase Dashboard"
echo "2. Configure Telegram webhook"
echo "3. Set up CRON job for monitoring"
echo ""
echo "See TELEGRAM_BOT_SETUP.md for detailed instructions"
