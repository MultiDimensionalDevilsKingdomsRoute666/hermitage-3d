import { expect, test } from '@playwright/test';

// r26 layout fixtures — design-i18n-notes.md §6 r26 + §9(h): en/ru × 360/768/1280 for both
// pages. Local-only (the "golden" project — the reference Mac's GPU, committed
// platform-suffixed baselines; CI runs --project=chromium and never sees this file).
// Refresh after an intentional visual change: pnpm e2e --project=golden --update-snapshots
// (this file is matched into the same project).
//
// The /notes fixtures pin the ledger face — no clipping at the three widths (risk R3: the
// RU column expands 20–35%). The main-page fixtures pin the settled-with-hint moment: the
// §9 hint branch (corner + stacked-above-caption) and the r26 right-aligned caption. The
// canvas hides on the main page — the dome dithers per frame, so a pixel gate over it would
// flake; the overlays (title, chrome, caption, hint, scrub) are the subject. No ?det=1
// here: det never shows the hint (§9), so these boots run the real tier probe.

const SETTLE_TIMEOUT_MS = 45_000;
const AT = 'at=2026-06-21T12:00:00Z'; // noon — the pinned epoch keeps the clock text fixed
const VIEWPORTS = [
  { name: '360', width: 360, height: 744 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 720 },
  // The ≥1600 px chrome step-up law (the overlay reads small on big displays) — pinned.
  { name: '1920', width: 1920, height: 1080 },
] as const;
const LANGS = ['en', 'ru'] as const;

const NOTES_TITLE = { en: 'How the south facade is built', ru: 'Как устроен южный фасад' } as const;

for (const viewport of VIEWPORTS) {
  test.describe(`main page ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const lang of LANGS) {
      test(`fixtures: main ${lang} ${viewport.name}`, async ({ page }) => {
        await page.goto(`/#/?${AT}&lang=${lang}`);
        await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
        // The hint shows at the arrival-settle beat (S0 boot); the caption sits under it.
        await expect(page.locator('#travel-hint')).toHaveAttribute('data-visible', 'true', {
          timeout: 10_000,
        });
        // Hide the canvas: visibility keeps layout, the dithering pixels leave the gate.
        await page.addStyleTag({ content: '#scene { visibility: hidden !important; }' });
        await page.waitForTimeout(300); // one settle margin: the fade transitions finish
        // Strict threshold: the overlays are deterministic DOM (the canvas is hidden), and a
        // loose ratio would swallow a whole layout change — text is <1% of the viewport.
        await expect(page).toHaveScreenshot(`fixtures-main-${viewport.name}-${lang}.png`, {
          maxDiffPixelRatio: 0,
          timeout: 60_000,
        });
      });
    }
  });

  test.describe(`/notes ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const lang of LANGS) {
      test(`fixtures: notes ${lang} ${viewport.name}`, async ({ page }) => {
        // The binding resolves the language from the hash query and re-renders behind the
        // dictionary activation — the title is the ready signal.
        await page.goto(`/notes.html#?lang=${lang}`);
        await expect(page.locator('h1')).toHaveText(NOTES_TITLE[lang], { timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);
        // Pure DOM, no canvas — deterministic, so the gate is pixel-strict (a loose ratio
        // would swallow a whole layout change).
        await expect(page).toHaveScreenshot(`fixtures-notes-${viewport.name}-${lang}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0,
          timeout: 60_000,
        });
      });
    }
  });
}
