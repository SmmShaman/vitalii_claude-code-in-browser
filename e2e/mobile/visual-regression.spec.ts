import { test, expect } from '@playwright/test';

/**
 * Visual regression tests.
 *
 * These capture full-page screenshots and compare them against stored baselines.
 * On the first run, baselines are created automatically in e2e/mobile/visual-regression.spec.ts-snapshots/.
 *
 * To update baselines after intentional visual changes:
 *   npx playwright test --update-snapshots
 *
 * NOTE: Visual comparison thresholds are set high (0.3) because the site
 * contains dynamic content (news, blog posts) that changes frequently.
 * The goal is to catch major layout regressions, not content differences.
 */

const MOBILE_PROJECTS = ['mobile-chrome', 'mobile-safari'];
const DESKTOP_PROJECTS = ['desktop-chrome'];

// Allow generous pixel differences for dynamic content
const SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.3,
  threshold: 0.3,
};

// ---------------------------------------------------------------------------
// Homepage visual regression
// ---------------------------------------------------------------------------

test.describe('Homepage visual regression', () => {
  test('homepage - mobile screenshot', async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.includes(testInfo.project.name), 'Mobile-only test');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for animations to settle
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot(
      `homepage-mobile-${testInfo.project.name}.png`,
      {
        fullPage: false,
        ...SCREENSHOT_OPTIONS,
      }
    );
  });

  test('homepage - desktop screenshot', async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.includes(testInfo.project.name), 'Desktop-only test');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: false,
      ...SCREENSHOT_OPTIONS,
    });
  });
});

// ---------------------------------------------------------------------------
// Article page visual regression
// ---------------------------------------------------------------------------

test.describe('Article page visual regression', () => {
  let articleSlug: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Find a real article slug from the news listing
    await page.goto('/news', { waitUntil: 'domcontentloaded' });
    const link = page.locator('a[href^="/news/"]').first();
    articleSlug = await link.getAttribute('href').catch(() => null);

    if (!articleSlug) {
      // Try blog as fallback
      await page.goto('/blog', { waitUntil: 'domcontentloaded' });
      const blogLink = page.locator('a[href^="/blog/"]').first();
      articleSlug = await blogLink.getAttribute('href').catch(() => null);
    }

    await context.close();
  });

  test('article - mobile screenshot', async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.includes(testInfo.project.name), 'Mobile-only test');
    test.skip(!articleSlug, 'No articles found on production');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot the above-the-fold content only (not full page)
    await expect(page).toHaveScreenshot(
      `article-mobile-${testInfo.project.name}.png`,
      {
        fullPage: false,
        ...SCREENSHOT_OPTIONS,
      }
    );
  });

  test('article - desktop screenshot', async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.includes(testInfo.project.name), 'Desktop-only test');
    test.skip(!articleSlug, 'No articles found on production');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('article-desktop.png', {
      fullPage: false,
      ...SCREENSHOT_OPTIONS,
    });
  });
});

// ---------------------------------------------------------------------------
// Listing pages visual regression
// ---------------------------------------------------------------------------

test.describe('Listing pages visual regression', () => {
  test('blog listing - mobile screenshot', async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.includes(testInfo.project.name), 'Mobile-only test');

    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot(
      `blog-listing-mobile-${testInfo.project.name}.png`,
      {
        fullPage: false,
        ...SCREENSHOT_OPTIONS,
      }
    );
  });

  test('news listing - mobile screenshot', async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.includes(testInfo.project.name), 'Mobile-only test');

    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot(
      `news-listing-mobile-${testInfo.project.name}.png`,
      {
        fullPage: false,
        ...SCREENSHOT_OPTIONS,
      }
    );
  });
});
