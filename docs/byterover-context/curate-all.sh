#!/usr/bin/env bash
#
# curate-all.sh - Curate всю історію проекту до ByteRover
#
# Usage: ./curate-all.sh
#
# Цей скрипт curate всі 42 markdown файли до ByteRover context service
# Це займе ~5-10 хвилин залежно від швидкості ByteRover API
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ByteRover Context Curation - Повна історія проекту       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if brv command exists
if ! command -v brv &> /dev/null; then
    echo -e "${RED}✗ Error: brv command not found${NC}"
    echo "Please install ByteRover CLI: https://byterover.dev"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "integrations" ] || [ ! -d "features" ]; then
    echo -e "${RED}✗ Error: Wrong directory${NC}"
    echo "Please run from docs/byterover-context/ directory"
    exit 1
fi

TOTAL_FILES=42
CURRENT=0

curate_file() {
    local file=$1
    local code_files=$2
    CURRENT=$((CURRENT + 1))

    echo -e "${YELLOW}[$CURRENT/$TOTAL_FILES]${NC} Curating: ${GREEN}$file${NC}"

    if [ -n "$code_files" ]; then
        brv curate "$(cat $file)" --files "$code_files" || {
            echo -e "${RED}✗ Failed to curate $file${NC}"
            return 1
        }
    else
        brv curate "$(cat $file)" || {
            echo -e "${RED}✗ Failed to curate $file${NC}"
            return 1
        }
    fi
}

echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  1/5 Integrations (6 файлів)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

curate_file "integrations/linkedin-integration.md" "supabase/functions/post-to-linkedin/index.ts"
curate_file "integrations/instagram-integration.md" "supabase/functions/post-to-instagram/index.ts"
curate_file "integrations/instagram-video-reels.md" "scripts/instagram-video/index.js"
curate_file "integrations/video-processing.md" "supabase/functions/telegram-scraper/index.ts"
curate_file "integrations/video-processing-github.md" "scripts/video-processor/index.js"
curate_file "integrations/ai-social-teasers.md" "supabase/functions/generate-social-teasers/index.ts"

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  2/5 Features (11 файлів)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

curate_file "features/ai-image-generation.md" "supabase/functions/generate-image-prompt/index.ts"
curate_file "features/professional-image-prompts.md" "supabase/functions/generate-image-prompt/index.ts"
curate_file "features/seo-optimization.md" "utils/seo.ts"
curate_file "features/telegram-bot-workflow.md" "supabase/functions/telegram-scraper/index.ts"
curate_file "features/analytics-gtm.md" "utils/gtm.ts"
curate_file "features/translation-system.md" "contexts/TranslationContext.tsx"
curate_file "features/admin-panel.md" "app/admin/dashboard/page.tsx"
curate_file "features/admin-panel-components.md" "components/admin/"
curate_file "features/mobile-layout-system.md" "components/sections/BentoGridMobile.tsx"
curate_file "features/contact-form-email.md" "supabase/functions/send-contact-email/index.ts"
curate_file "features/debug-mode.md" "utils/debug.ts"
curate_file "features/gemini-image-processing.md" "supabase/functions/process-image/index.ts"

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  3/5 Bugfixes (6 файлів) - Історія багів${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

curate_file "bugfixes/2024-12-session2-fixes.md" "supabase/functions/pre-moderate-news/index.ts"
curate_file "bugfixes/2024-12-ai-prompts-fix.md" "supabase/functions/process-blog-post/index.ts"
curate_file "bugfixes/2024-12-mobile-responsiveness.md" "app/globals.css"
curate_file "bugfixes/2024-12-news-article-page.md" "app/news/[slug]/NewsArticle.tsx"
curate_file "bugfixes/2025-01-social-media-duplicates.md" "supabase/functions/_shared/social-media-helpers.ts"
curate_file "bugfixes/2024-12-supabase-integration-fix.md" "integrations/supabase/client.ts"

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  4/5 Architecture (7 файлів)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

curate_file "architecture/database-schema.md" "supabase/migrations/"
curate_file "architecture/new-database-tables.md" "supabase/migrations/"
curate_file "architecture/edge-functions.md" "supabase/functions/"
curate_file "architecture/component-architecture.md" "components/"
curate_file "architecture/animation-libraries.md" "components/ui/"
curate_file "architecture/ci-cd-pipelines.md" ".github/workflows/"
curate_file "architecture/content-management.md" ""

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  5/5 Implementation (12 файлів)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

curate_file "implementation/background-hero-animation.md" "components/layout/Header.tsx"
curate_file "implementation/projects-hover-explosion.md" "components/ui/ProjectsCarousel.tsx"
curate_file "implementation/skills-management.md" "components/admin/SkillsManager.tsx"
curate_file "implementation/article-layout-system.md" "components/ArticleLayout.tsx"
curate_file "implementation/toast-system.md" "components/ui/Toast.tsx"
curate_file "implementation/share-buttons.md" "components/ui/ShareButtons.tsx"
curate_file "implementation/skeleton-components.md" "components/ui/Skeleton.tsx"
curate_file "implementation/scroll-reveal.md" "components/ui/ScrollReveal.tsx"
curate_file "implementation/skill-logos.md" "utils/skillLogos.ts"
curate_file "implementation/mobile-detection-hooks.md" "hooks/useIsMobile.ts"
curate_file "implementation/utility-functions.md" "lib/utils.ts"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Curation Complete!                                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Successfully curated $TOTAL_FILES files to ByteRover${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Test queries: ${YELLOW}brv query \"How does LinkedIn integration work?\"${NC}"
echo "  2. Check status: ${YELLOW}brv status${NC}"
echo "  3. View context tree structure in ByteRover UI"
echo ""
echo -e "${BLUE}Example queries:${NC}"
echo "  ${YELLOW}brv query \"How to fix Instagram Error #10?\"${NC}"
echo "  ${YELLOW}brv query \"Why was YouTube chosen over Bunny.net?\"${NC}"
echo "  ${YELLOW}brv query \"What bugs were fixed in December 2024?\"${NC}"
echo ""
