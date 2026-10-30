// Mobile-A tier cases (design-mobile-tier.md §3, §12): the auto-policy facts read from
// the debug HUD's data-* rows (hud=1 gates the binding — the fixture law). The boots are
// the real square boot (no det — these are the probe/policy surfaces themselves). One
// fresh page per boot (a differing hash from one page is a fragment navigation).
import { expect, type Page, test } from '@playwright/test';

const SETTLE_TIMEOUT_MS = 45_000;

/** The square's boot ledger is 0 forever (the smoke walk's boot law), so the settle gate
 * is DATA PRESENCE + hold 0, not a ≥1 ledger (the reply's regex would fail all cases). */
async function roomReady(page: Page): Promise<void> {
  const hud = page.locator('#hud[data-room]');
  await expect(hud).toBeAttached({ timeout: SETTLE_TIMEOUT_MS });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: SETTLE_TIMEOUT_MS });
  await page.waitForTimeout(300);
}

test('AUTO-COARSE selects the floor without probing', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    // baseURL is optional in the fixture bag's type (exactOptionalPropertyTypes), but the
    // chromium project's `use` always sets it — the fallback never fires in this project.
    baseURL: baseURL ?? 'http://127.0.0.1:4173',
    hasTouch: true,
    viewport: { width: 1280, height: 720 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/#/?hud=1');
    await roomReady(page);
    const hud = page.locator('#hud');
    await expect(hud).toHaveAttribute('data-tier', 'T0 · low');
    await expect(hud).toHaveAttribute('data-tier-source', /^(coarse|memory)$/);
    await expect(hud).toHaveAttribute('data-probe-count', '0');
  } finally {
    await context.close();
  }
});

test('FINE-PROBE uses the existing desktop probe', async ({ page }) => {
  await page.goto('/#/?hud=1');
  await roomReady(page);
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-tier-source', 'probe');
  // The count row proves the wiring, not the machine: on the starved reference device the
  // T2-posture sky can degrade to the classifier's OWN too-short path (minFrames missed →
  // the §11 default tier, sampleCount 0 — the R17-A day measured 283 ms frames), so the
  // count stays an integer ≥ 0 and the TIER settles to some valid tier label. The unit
  // suite pins the classifier; this case pins that the probe SURFACES reached the rows.
  await expect(hud).toHaveAttribute('data-probe-count', /^\d+$/);
  await expect(hud).toHaveAttribute(
    'data-tier',
    /^(T0 · low|T1 · default|T2 · discrete GPU)$/,
    { timeout: SETTLE_TIMEOUT_MS },
  );
});

test('OVERRIDE-PRECEDENCE applies and persists both explicit tiers', async ({ context }) => {
  for (const [id, label] of [
    ['t0', 'T0 · low'],
    ['t2', 'T2 · discrete GPU'],
  ] satisfies ReadonlyArray<readonly [string, string]>) {
    const page = await context.newPage();
    try {
      await page.goto(`/#/?q=${id}&hud=1`);
      await roomReady(page);
      const hud = page.locator('#hud');
      await expect(hud).toHaveAttribute('data-tier', label);
      await expect(hud).toHaveAttribute('data-tier-source', 'override');
      await expect(hud).toHaveAttribute('data-probe-count', '0');
      expect(await page.evaluate(() => localStorage.getItem('zimny:tier'))).toBe(id);
    } finally {
      await page.close();
    }
  }
});

test('PERSISTED-AND-AUTO clears storage and keeps the settled choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('zimny:tier', 't1'));
  await page.goto('/#/?hud=1');
  await roomReady(page);
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-tier', 'T1 · default');
  await expect(hud).toHaveAttribute('data-tier-source', 'stored');
  await expect(hud).toHaveAttribute('data-probe-count', '0');
  // A fragment navigation (the ?q lifecycle's surface): q=auto clears the override and
  // keeps the current choice without a re-probe; the source label stays the choice's
  // original ('stored').
  await page.evaluate(() => {
    location.hash = `${location.hash}&q=auto`;
  });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('zimny:tier')), {
      timeout: SETTLE_TIMEOUT_MS,
    })
    .toBeNull();
  await roomReady(page);
  await expect(hud).toHaveAttribute('data-tier', 'T1 · default');
  await expect(hud).toHaveAttribute('data-tier-source', 'stored');
  await expect(hud).toHaveAttribute('data-probe-count', '0');
});
