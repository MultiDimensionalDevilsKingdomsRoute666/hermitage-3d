import { expect, type Page, test } from '@playwright/test';

// Local-only project "golden" (CI selects --project=chromium and never runs this file).
// Baselines are rendered on the reference Mac's GPU and are platform-specific by design; Playwright
// suffixes them with project + platform under tests/e2e/golden.spec.ts-snapshots/.
// Refresh after an intentional visual change: pnpm e2e --project=golden --update-snapshots
const SETTLE_TIMEOUT_MS = 45_000;

// One small margin after "settled": ~18 presented frames at 60 Hz, still ~3 at a 10 Hz worst case,
// so the compositor has shown at least a couple of post-settle canvas frames before
// toHaveScreenshot starts its own stability loop. Not a tuning knob.
const SETTLE_MARGIN_MS = 300;

// Must equal the config viewport: 1280 × 720 at DPR 1 gives pixelRatio exactly 1.0 on T1.
const VIEWPORT = { width: 1280, height: 720 };

// An element screenshot is a clip of the composited page, so overlapping DOM overlays would land
// in the baseline. Hide them (visibility keeps layout, so nothing reflows).
const HIDE_OVERLAYS_CSS = '#title, #scrub, #notes-link, #hud { visibility: hidden !important; }';

const MAX_DIFF_PIXEL_RATIO = 0.01;

async function settledPage(page: Page, query: string): Promise<void> {
  await page.goto(`/#/?${query}`);
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  // Guard: the canvas must fill the viewport exactly at DPR 1 — a smaller canvas would silently
  // turn into a cropped page capture, a larger one would change the pixelRatio inputs.
  expect(await page.locator('#scene').boundingBox(), '#scene fills the viewport exactly').toEqual({
    x: 0,
    y: 0,
    ...VIEWPORT,
  });
}

test('golden: noon', async ({ page }) => {
  await settledPage(page, 'at=2026-06-21T12:00:00Z&det=1');
  // Page-level capture with a viewport clip — NOT locator('#scene'). The locator path runs a
  // scroll-into-view "element stability" wait that never settles on a continuously rAF-driven
  // WebGL canvas (watched twice on the reference Mac); the page path takes the frame as composited
  // and needs no element scroll. With the overlays hidden above this clips the same pixels.
  // timeout: raw captures measure 2–6 s each on the reference machine (diagnostic probe,
  // gitignored), and the internal two-capture stability loop must fit inside this assertion
  // timeout — the 5 s default provably trips first.
  await expect(page).toHaveScreenshot('golden-noon.png', {
    clip: { x: 0, y: 0, width: 1280, height: 720 },
    maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
    timeout: 60_000,
  });
});

test('golden: white night (devlog-0000 hero)', async ({ page }) => {
  await settledPage(page, 'at=2026-06-20T21:45:00Z&det=1');
  await expect(page).toHaveScreenshot('golden-white-night.png', {
    clip: { x: 0, y: 0, width: 1280, height: 720 },
    maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
    timeout: 60_000,
  });
});
