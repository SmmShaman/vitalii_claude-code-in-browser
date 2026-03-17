#!/bin/bash
# Initialize Claude Code project structure
# Usage: bash init-claude-project.sh [project-path]
#
# Run this in any new project to set up CLAUDE.md + rules.
# Then open Claude Code and ask it to fill in project-specific details.

PROJECT_DIR="${1:-.}"

echo "🤖 Initializing Claude Code structure in: $PROJECT_DIR"

# 1. Create CLAUDE.md template
cat > "$PROJECT_DIR/CLAUDE.md" << 'CLAUDE_EOF'
# Project Name

## Tech Stack
<!-- Fill in: Framework, language, DB, deployment -->

## Quick Start
```bash
# npm install / pip install / etc
# npm run dev / python manage.py runserver / etc
```

## Key Commands
```bash
# Build:
# Test:
# Lint:
# Deploy:
```

## Project Structure
```
├── src/           # Main source code
├── tests/         # Tests
└── docs/          # Documentation
```

## Architecture
<!-- 3-5 sentences about how the project works -->

## Environment Variables
<!-- List required env vars (without values) -->

## Troubleshooting
<!-- Add common issues and solutions as they appear -->
CLAUDE_EOF

# 2. Create rules directory
mkdir -p "$PROJECT_DIR/.claude/rules"

# architecture.md
cat > "$PROJECT_DIR/.claude/rules/architecture.md" << 'RULES_EOF'
# Architecture

## Database Schema
<!-- Tables, relationships, key fields -->

## API Structure
<!-- Endpoints, auth, patterns -->

## Key Components
<!-- Main modules and their responsibilities -->
RULES_EOF

# coding-standards.md
cat > "$PROJECT_DIR/.claude/rules/coding-standards.md" << 'RULES_EOF'
# Coding Standards

## Naming
<!-- camelCase, PascalCase, snake_case conventions -->

## File Organization
<!-- How files should be organized -->

## Patterns
<!-- Common patterns used in the project -->

## Anti-patterns
<!-- Things to avoid -->
RULES_EOF

# deployment.md
cat > "$PROJECT_DIR/.claude/rules/deployment.md" << 'RULES_EOF'
# Deployment

## Environments
<!-- dev, staging, production -->

## CI/CD
<!-- GitHub Actions, Netlify, Vercel, etc -->

## Secrets
<!-- Where secrets are stored, how to manage -->

## Troubleshooting
<!-- Common deployment issues -->
RULES_EOF

# bugfix-patterns.md
cat > "$PROJECT_DIR/.claude/rules/bugfix-patterns.md" << 'RULES_EOF'
# Bug Fix Patterns

<!-- Add patterns as bugs are discovered and fixed -->
<!-- Format:
## Bug Name (Date)
**Problem:** What went wrong
**Fix:** How it was fixed
**Prevention:** How to avoid in future
-->
RULES_EOF

echo ""
echo "✅ Created:"
echo "   $PROJECT_DIR/CLAUDE.md"
echo "   $PROJECT_DIR/.claude/rules/architecture.md"
echo "   $PROJECT_DIR/.claude/rules/coding-standards.md"
echo "   $PROJECT_DIR/.claude/rules/deployment.md"
echo "   $PROJECT_DIR/.claude/rules/bugfix-patterns.md"
echo ""
echo "📝 Next steps:"
echo "   1. Open the project in Claude Code"
echo "   2. Ask: 'Проаналізуй проект і заповни CLAUDE.md та rules'"
echo "   3. Claude прочитає код і заповнить шаблони автоматично"
echo "   4. git add CLAUDE.md .claude/rules && git commit -m 'docs: Claude Code config'"
