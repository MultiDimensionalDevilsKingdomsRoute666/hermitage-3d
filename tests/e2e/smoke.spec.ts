import { test as base, expect, type Locator, type Page } from '@playwright/test';

// Budgets are CI-enforced contracts (docs/architecture.md, Tiers/budget table):
// "Draw calls, any frame | ≤ 250 | HUD + Playwright assertion"
// "Triangles in frustum (T1) | ≤ 1.0 M | same"
// Fixed by art/tier, never by loosening these numbers.
const MAX_DRAW_CALLS = 250;
const MAX_TRIANGLES = 1_000_000;

// Hang detectors for software GL, NOT the ≤ 3 s first-frame device budget (that one is gated on
// the reference Mac per phase; no CI run on SwiftShader can honestly measure it).
const FIRST_FRAME_TIMEOUT_MS = 15_000;
const SETTLE_TIMEOUT_MS = 45_000;

// Host binds the HUD at most every 500 ms after the whole-frame render; one positive rAF delta is
// enough for data-frame-ms to leave "0".
const HUD_BIND_TIMEOUT_MS = 10_000;

// data-frame-ms is "0" until a positive delta exists, then a wall-clock value with two decimals.
// Only the non-zero gate is asserted; the value itself is never compared.
const POSITIVE_FRAME_MS = /^(?!0(?:\.0+)?$)\d+(?:\.\d+)?$/;
const PLAIN_INTEGER = /^\d+$/;

const AT = 'at=2026-06-21T12:00:00Z';

// Devlog contract: clean console. pageerror and console.error fail the test; console.warn is
// legal diagnostics. Auto fixture so both tests get it without ceremony; asserted on teardown so
// the collected messages survive an earlier timeout in the test body.
const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      await use(errors);
      expect(errors, 'clean console (devlog contract)').toEqual([]);
    },
    { auto: true },
  ],
});

async function readInteger(hud: Locator, name: string): Promise<number> {
  const text = await hud.getAttribute(name);
  if (text === null) {
    throw new Error(`#hud is missing ${name}`);
  }
  expect(text, `${name} is a plain ungrouped integer`).toMatch(PLAIN_INTEGER);
  return Number.parseInt(text, 10);
}

async function bootDeterministic(page: Page, query: string): Promise<Locator> {
  await page.goto(`/#/?${query}`);
  // "title" beat: the header becomes visible before massing/settled.
  await expect(page.locator('#title')).toBeVisible({ timeout: FIRST_FRAME_TIMEOUT_MS });
  // "settled": #scrub (range input) loses `hidden` exactly when the arrival FSM settles.
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-frame-ms', POSITIVE_FRAME_MS, {
    timeout: HUD_BIND_TIMEOUT_MS,
  });
  return hud;
}

async function expectWithinBudgets(hud: Locator): Promise<void> {
  // All four data-* come from one buildHudAttrs call, so once data-frame-ms is non-zero the
  // draw/triangle numbers describe a real whole-frame render (including the shadow pass).
  // The budget is "any frame", so whichever frame was bound must hold the ceiling.
  const draws = await readInteger(hud, 'data-draws');
  const tris = await readInteger(hud, 'data-tris');
  expect(draws, 'frame rendered something').toBeGreaterThan(0);
  expect(draws, 'draw calls, any frame').toBeLessThanOrEqual(MAX_DRAW_CALLS);
  expect(tris, 'frame rendered something').toBeGreaterThan(0);
  expect(tris, 'triangles in frustum').toBeLessThanOrEqual(MAX_TRIANGLES);
}

test('deterministic T1 boot settles within budget', async ({ page }) => {
  // Fresh context: no persisted tier, no ?q → det skips the probe and boots T1.
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1`);
  await expect(hud).toHaveAttribute('data-tier', 'T1 · default');
  await expectWithinBudgets(hud);
});

test('deterministic T0 boot settles within budget', async ({ page }) => {
  // The floor tier must also hold the ceiling numbers.
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&q=t0`);
  await expect(hud).toHaveAttribute('data-tier', 'T0 · low');
  await expectWithinBudgets(hud);
});
