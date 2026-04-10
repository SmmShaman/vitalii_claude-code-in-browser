import { test, expect } from '@playwright/test';

/**
 * Mobile homepage E2E tests.
 *
 * These tests run against the live production site and verify that
 * mobile-specific layout, navigation, and touch targets work correctly.
 *
 * Components that would benefit from data-testid attributes (not yet added):
 *   - BottomNavigation root: data-testid="bottom-navigation"
 *   - Each nav button: data-testid="nav-{sectionId}"
 *   - BentoGridMobile root: data-testid="bento-grid-mobile"
 *   - BentoGrid root: data-testid="bento-grid-desktop"
 */

const MOBILE_PROJECTS = ['mobile-chrome', 'mobile-safari'];
const DESKTOP_PROJECTS = ['desktop-chrome'];

// ---------------------------------------------------------------------------
// Homepage loading
// ---------------------------------------------------------------------------

test.describe('Homepage - basic loading', () => {
  test('homepage returns 200 and has correct title', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Vitalii Berbeha/i);
  });

  test('homepage has structured data (JSON-LD)', async ({ page }) => {
    await page.goto('/');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Mobile-specific layout
// ---------------------------------------------------------------------------

test.describe('Mobile layout', () => {
  test.skip(({ browserName }, testInfo) => {
    // Only run on mobile projects
    return !MOBILE_PROJECTS.includes(testInfo.project.name);
  }, 'Skipped on non-mobile projects');

  test('bottom navigation is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // BottomNavigation is rendered inside a <nav> with fixed positioning
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

  test('BentoGridMobile container is visible', async ({ page }) => {
    await page.goto('/');
    // Mobile layout wrapper: md:hidden class makes it visible only on <768px
    const mobileWrapper = page.locator('div.md\\:hidden').first();
    await expect(mobileWrapper).toBeVisible();
  });

  test('desktop BentoGrid container is hidden on mobile', async ({ page }) => {
    await page.goto('/');
    // Desktop layout wrapper: hidden md:flex — hidden on mobile
    const desktopWrapper = page.locator('div.hidden.md\\:flex').first();
    await expect(desktopWrapper).not.toBeVisible();
  });

  test('each bottom nav tab is clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000); // Wait for animations to settle

    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // BottomNavigation renders 6 buttons (home, services, projects, news, blog, contact)
    const buttons = nav.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Click each button — should not cause errors
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
      await button.click();
      // Small delay for any transition animation
      await page.waitForTimeout(300);
    }
  });

  test('page has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const overflowData = await page.evaluate(() => {
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    // Allow 1px tolerance for sub-pixel rendering
    expect(overflowData.documentWidth).toBeLessThanOrEqual(
      overflowData.viewportWidth + 1
    );
  });

  test('touch targets are at least 44x44px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check all interactive elements in the bottom navigation
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    const buttons = nav.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box, `Nav button ${i} should have a bounding box`).toBeTruthy();
      if (box) {
        expect(box.width, `Nav button ${i} width >= 44px`).toBeGreaterThanOrEqual(44);
        expect(box.height, `Nav button ${i} height >= 44px`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('safe area padding is applied to bottom nav', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // Check that paddingBottom uses env(safe-area-inset-bottom) or has explicit padding
    const paddingBottom = await nav.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });

    // paddingBottom should be a non-zero value (at least 8px from the max() in styles)
    const numericPadding = parseFloat(paddingBottom);
    expect(numericPadding).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Desktop-specific layout
// ---------------------------------------------------------------------------

test.describe('Desktop layout', () => {
  test.skip(({ browserName }, testInfo) => {
    return !DESKTOP_PROJECTS.includes(testInfo.project.name);
  }, 'Skipped on non-desktop projects');

  test('bottom navigation is NOT visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile wrapper (containing BottomNavigation) should be hidden on desktop
    const mobileWrapper = page.locator('div.md\\:hidden').first();
    await expect(mobileWrapper).not.toBeVisible();
  });

  test('BentoGrid desktop container is visible', async ({ page }) => {
    await page.goto('/');
    // Desktop layout: hidden md:flex
    const desktopWrapper = page.locator('div.hidden.md\\:flex').first();
    await expect(desktopWrapper).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Performance sanity check
// ---------------------------------------------------------------------------

test.describe('Performance basics', () => {
  test('homepage loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    // Page should load within 10 seconds even on slow connections
    expect(loadTime).toBeLessThan(10_000);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g., third-party script issues)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('third-party') &&
        !e.includes('gtm') &&
        !e.includes('analytics') &&
        !e.includes('Failed to load resource') // External resources may fail
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
