# E2E Tests (Playwright)

## Setup

```bash
# Install Playwright as a dev dependency
npm install -D @playwright/test

# Install browser binaries (Chromium + WebKit)
npx playwright install --with-deps chromium webkit
```

## Running tests

```bash
# Run all tests against production
npx playwright test

# Run against local dev server
BASE_URL=http://localhost:3000 npx playwright test

# Run only mobile tests
npx playwright test e2e/mobile/

# Run a specific test file
npx playwright test e2e/mobile/homepage.spec.ts

# Run only on a specific project/viewport
npx playwright test --project=mobile-chrome
npx playwright test --project=desktop-chrome

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see the browser)
npx playwright test --headed
```

## Visual regression

On the first run, baseline screenshots are created automatically. To update
baselines after intentional visual changes:

```bash
npx playwright test --update-snapshots
```

Snapshots are stored alongside test files in `*-snapshots/` directories.
These should be committed to git so CI can compare against them.

## Reports

After a test run, open the HTML report:

```bash
npx playwright show-report
```

## Viewports

| Project | Device | Viewport |
|---------|--------|----------|
| desktop-chrome | Desktop Chrome | 1280x720 |
| mobile-chrome | Pixel 5 | 390x844 |
| mobile-safari | iPhone 14 (WebKit) | 390x844 |
| tablet | iPad (gen 7) | 820x1180 |

## CI

Tests run automatically on PRs to main via `.github/workflows/e2e-tests.yml`.
They can also be triggered manually from the Actions tab.

Artifacts uploaded:
- `playwright-report` - Full HTML report
- `playwright-test-results` - Screenshots on failure, traces on retry
- `playwright-snapshots` - Visual regression baselines

## Components that would benefit from data-testid

The following components are tested via CSS class selectors. Adding
`data-testid` attributes would make tests more resilient to styling changes:

| Component | Suggested data-testid | File |
|-----------|----------------------|------|
| BottomNavigation root | `bottom-navigation` | `components/layout/BottomNavigation.tsx` |
| Each nav button | `nav-{sectionId}` | `components/layout/BottomNavigation.tsx` |
| Mobile layout wrapper | `mobile-layout` | `app/page.tsx` |
| Desktop layout wrapper | `desktop-layout` | `app/page.tsx` |
| ArticleHeader | `article-header` | `components/layout/ArticleHeader.tsx` |
| Back button | `article-back-button` | `components/layout/ArticleHeader.tsx` |
| ShareButtons | `share-buttons` | `components/ui/ShareButtons.tsx` |
