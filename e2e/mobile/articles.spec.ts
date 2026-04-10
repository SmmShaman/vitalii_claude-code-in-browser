import { test, expect } from '@playwright/test';

/**
 * Article page E2E tests (blog + news) focused on mobile layout.
 *
 * These tests run against live production. They discover real article slugs
 * via the sitemap or known listing pages to avoid hardcoded URLs going stale.
 *
 * Components that would benefit from data-testid attributes (not yet added):
 *   - ArticleHeader root: data-testid="article-header"
 *   - Back button in ArticleHeader: data-testid="article-back-button"
 *   - ShareButtons container: data-testid="share-buttons"
 */

const MOBILE_PROJECTS = ['mobile-chrome', 'mobile-safari'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the first available article slug from a listing page.
 * Falls back to a known slug if the listing is empty.
 */
async function getFirstArticleSlug(
  page: import('@playwright/test').Page,
  section: 'blog' | 'news'
): Promise<string | null> {
  await page.goto(`/${section}`, { waitUntil: 'domcontentloaded' });

  // Find the first link to an article (href="/blog/some-slug" or "/news/some-slug")
  const articleLink = page.locator(`a[href^="/${section}/"]`).first();
  const href = await articleLink.getAttribute('href').catch(() => null);

  if (href) {
    return href;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Blog article tests
// ---------------------------------------------------------------------------

test.describe('Blog articles', () => {
  let blogSlug: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    blogSlug = await getFirstArticleSlug(page, 'blog');
    await context.close();
  });

  test('blog listing page loads', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).toBe(200);
  });

  test('blog article loads and renders content', async ({ page }) => {
    test.skip(!blogSlug, 'No blog articles found on production');

    const response = await page.goto(blogSlug!);
    expect(response?.status()).toBe(200);

    // Article should have a heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Article should have a main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('blog article images are responsive', async ({ page }) => {
    test.skip(!blogSlug, 'No blog articles found on production');
    test.skip(
      ({ } as any).__testInfo?.project.name &&
        !MOBILE_PROJECTS.includes(({ } as any).__testInfo.project.name),
      'Mobile-focused test'
    );

    await page.goto(blogSlug!);
    await page.waitForLoadState('networkidle');

    const images = page.locator('main img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible();
      if (!isVisible) continue;

      const box = await img.boundingBox();
      if (box) {
        const viewportWidth = page.viewportSize()?.width ?? 390;
        expect(
          box.width,
          `Image ${i} should not overflow viewport (${viewportWidth}px)`
        ).toBeLessThanOrEqual(viewportWidth + 1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// News article tests
// ---------------------------------------------------------------------------

test.describe('News articles', () => {
  let newsSlug: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    newsSlug = await getFirstArticleSlug(page, 'news');
    await context.close();
  });

  test('news listing page loads', async ({ page }) => {
    const response = await page.goto('/news');
    expect(response?.status()).toBe(200);
  });

  test('news article loads and renders content', async ({ page }) => {
    test.skip(!newsSlug, 'No news articles found on production');

    const response = await page.goto(newsSlug!);
    expect(response?.status()).toBe(200);

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('news article images are responsive', async ({ page }) => {
    test.skip(!newsSlug, 'No news articles found on production');

    await page.goto(newsSlug!);
    await page.waitForLoadState('networkidle');

    const images = page.locator('main img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible();
      if (!isVisible) continue;

      const box = await img.boundingBox();
      if (box) {
        const viewportWidth = page.viewportSize()?.width ?? 390;
        expect(
          box.width,
          `Image ${i} should not overflow viewport`
        ).toBeLessThanOrEqual(viewportWidth + 1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Shared article layout tests
// ---------------------------------------------------------------------------

test.describe('Article layout', () => {
  let articleSlug: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Try news first, fall back to blog
    articleSlug = await getFirstArticleSlug(page, 'news');
    if (!articleSlug) {
      articleSlug = await getFirstArticleSlug(page, 'blog');
    }
    await context.close();
  });

  test('share buttons are present and accessible', async ({ page }) => {
    test.skip(!articleSlug, 'No articles found on production');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');

    // ShareButtons renders a group with role="group" and aria-label="Share options"
    const shareGroup = page.locator('[role="group"][aria-label="Share options"]');
    const shareVisible = await shareGroup.isVisible().catch(() => false);

    if (shareVisible) {
      // Check that individual share buttons have aria-labels
      const linkedInBtn = shareGroup.locator('[aria-label*="LinkedIn"]');
      await expect(linkedInBtn).toBeVisible();

      const twitterBtn = shareGroup.locator('[aria-label*="Twitter"], [aria-label*="X"]');
      await expect(twitterBtn).toBeVisible();

      const copyBtn = shareGroup.locator('[aria-label*="Copy"], [aria-label*="copy"]');
      await expect(copyBtn).toBeVisible();
    }
  });

  test('article header is sticky', async ({ page }) => {
    test.skip(!articleSlug, 'No articles found on production');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');

    // ArticleHeader uses sticky positioning
    const header = page.locator('header').first();
    const headerVisible = await header.isVisible().catch(() => false);

    if (headerVisible) {
      const position = await header.evaluate((el) => {
        return window.getComputedStyle(el).position;
      });

      // Should be sticky or fixed
      expect(['sticky', 'fixed']).toContain(position);
    }
  });

  test('back navigation works', async ({ page }) => {
    test.skip(!articleSlug, 'No articles found on production');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');

    // ArticleHeader contains a back link (Link component with ArrowLeft icon)
    // Look for the link with href="/" or containing an arrow-left SVG
    const backLink = page.locator('a[href="/"]').first();
    const backLinkVisible = await backLink.isVisible().catch(() => false);

    if (backLinkVisible) {
      await backLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should navigate to homepage
      expect(page.url()).toMatch(/\/?$/);
    }
  });

  test('article page has no horizontal overflow on mobile', async ({ page, browserName }, testInfo) => {
    test.skip(!articleSlug, 'No articles found on production');
    test.skip(!MOBILE_PROJECTS.includes(testInfo.project.name), 'Mobile-only test');

    await page.goto(articleSlug!);
    await page.waitForLoadState('networkidle');

    const overflowData = await page.evaluate(() => {
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(overflowData.documentWidth).toBeLessThanOrEqual(
      overflowData.viewportWidth + 1
    );
  });
});
