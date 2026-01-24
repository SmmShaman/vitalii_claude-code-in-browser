# Supabase Workflow for Claude Agent

## Overview

This document provides instructions for Claude agent on how to work with Supabase:
- Project connection and authentication
- Database migrations management
- Handling migration sync issues
- Direct database access
- Edge Functions deployment

**Project Reference:** `uchmopqiylywnemvjttl`
**Production URL:** `https://uchmopqiylywnemvjttl.supabase.co`

---

## 1. Project Connection

### Get Access Token

Ask the user to provide Supabase access token. User can generate it at:
https://supabase.com/dashboard/account/tokens

### Connect to Project

```bash
# Set access token (get from user)
export SUPABASE_ACCESS_TOKEN=sbp_xxxxx

# Link to project
supabase link --project-ref uchmopqiylywnemvjttl
```

**Note:** If `supabase` CLI is not installed:
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

---

## 2. Database Migrations

### Migration Files Location

All migrations are stored in: `supabase/migrations/`

Naming convention: `YYYYMMDDHHMMSS_description.sql`

Example: `20250124120000_add_user_preferences.sql`

### Check Migration Status

```bash
# View all migrations and their status
supabase migration list
```

### Create New Migration

```bash
# Option 1: Manual creation
# Create file: supabase/migrations/YYYYMMDDHHMMSS_description.sql

# Option 2: Generate from diff (if local DB running)
supabase db diff -f migration_name
```

### Apply Migrations

```bash
# Push migrations to remote database
supabase db push
```

### Common Scenarios

**"Remote database is up to date" but migration not applied:**
```bash
supabase db push --include-all
```

**Force re-apply specific migration:**
```bash
supabase migration repair --status reverted <version>
supabase db push
```

---

## 3. Fixing Migration Sync Issues

### Error: "Remote migration versions not found in local"

This happens when remote database has migrations that don't exist locally.

**Solution:**
```bash
# Mark remote-only migrations as reverted
supabase migration repair --status reverted <version1> <version2> ...

# Then push local migrations
supabase db push
```

### Error: "Migration has already been applied"

```bash
# Mark local migration as already applied
supabase migration repair --status applied <version>
```

### Complete Resync (Last Resort)

```bash
# Pull current schema from remote
supabase db pull

# This creates a new migration with current state
# Review and adjust as needed
```

---

## 4. Direct Database Access (Bypass Migrations)

Sometimes you need to execute SQL directly without creating a migration file.

### Get Service Role Key

```bash
# List all API keys for project
supabase projects api-keys --project-ref uchmopqiylywnemvjttl
```

### Direct REST API Access

```bash
# Insert/Update data
curl -X POST "https://uchmopqiylywnemvjttl.supabase.co/rest/v1/TABLE_NAME" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"column": "value"}'

# Select data
curl "https://uchmopqiylywnemvjttl.supabase.co/rest/v1/TABLE_NAME?select=*" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Delete data
curl -X DELETE "https://uchmopqiylywnemvjttl.supabase.co/rest/v1/TABLE_NAME?id=eq.123" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### Direct SQL Execution

```bash
# Execute raw SQL (requires psql connection)
supabase db execute --project-ref uchmopqiylywnemvjttl -f script.sql
```

---

## 5. Edge Functions

### Deploy Single Function

```bash
cd supabase
supabase functions deploy FUNCTION_NAME --no-verify-jwt
```

### Deploy All Functions

```bash
cd supabase
for dir in functions/*/; do
  if [ -d "$dir" ] && [ "$(basename $dir)" != "_shared" ]; then
    supabase functions deploy $(basename $dir) --no-verify-jwt
  fi
done
```

### Manage Secrets

```bash
# Set secret
supabase secrets set KEY="value"

# Set multiple secrets
supabase secrets set KEY1="value1" KEY2="value2"

# List secrets
supabase secrets list

# Unset secret
supabase secrets unset KEY
```

### View Function Logs

```bash
supabase functions logs FUNCTION_NAME
```

### Test Function Locally

```bash
supabase functions serve FUNCTION_NAME
```

---

## 6. Common Commands Reference

| Task | Command |
|------|---------|
| Link project | `supabase link --project-ref uchmopqiylywnemvjttl` |
| Check status | `supabase migration list` |
| Push migrations | `supabase db push` |
| Force push all | `supabase db push --include-all` |
| Repair migration | `supabase migration repair --status reverted <ver>` |
| Get API keys | `supabase projects api-keys --project-ref uchmopqiylywnemvjttl` |
| Deploy function | `supabase functions deploy NAME --no-verify-jwt` |
| Set secret | `supabase secrets set KEY="value"` |
| View logs | `supabase functions logs NAME` |

---

## 7. Environment Variables

These are already configured in the project:

```env
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://uchmopqiylywnemvjttl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (never expose to client!)
```

**Access token (for CLI operations) must be set separately:**
```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxxxx
```

---

## 8. Troubleshooting

### "Not logged in" Error
```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxxxx
# or
supabase login
```

### "Project not linked" Error
```bash
supabase link --project-ref uchmopqiylywnemvjttl
```

### Function Not Updating After Deploy
- Add version log to function to verify deployment
- Check GitHub Actions if deploying via CI
- Manual deploy: `supabase functions deploy NAME --no-verify-jwt`

### Migration Conflicts
1. Check remote status: `supabase migration list`
2. Repair if needed: `supabase migration repair --status reverted <ver>`
3. Push again: `supabase db push`

---

**Last Updated:** January 24, 2025
