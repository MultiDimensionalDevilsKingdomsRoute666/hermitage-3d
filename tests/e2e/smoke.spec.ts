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
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&lang=en`);
  await expect(hud).toHaveAttribute('data-tier', 'T1 · default');
  await expectWithinBudgets(hud);
});

test('deterministic T0 boot settles within budget', async ({ page }) => {
  // The floor tier must also hold the ceiling numbers.
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&q=t0&lang=en`);
  await expect(hud).toHaveAttribute('data-tier', 'T0 · low');
  await expectWithinBudgets(hud);
});

// §8.3 layer 3: the smoke walks the phase-2 graph (transits driven directly in-test — the
// hash is the r16 input surface; rail-driven walking is asserted in r18) and asserts the
// HUD metadata ledger rows return to their boot values with a clean console. Smoke asserts
// contracts, never cadence: attribute waits are generous (holds dwell until data is ready),
// no frame timing is compared.
test('smoke walk: the graph returns the ledger to boot values', async ({ page }) => {
  test.slow(); // four transits on a starved page: the load dwell is data-bound, not timed
  const query = `${AT}&det=1&hud=1&lang=en`;
  const hud = await bootDeterministic(page, query);
  // Boot posture: the resident owns the row, nothing registered, no hold.
  await expect(hud).toHaveAttribute('data-room', 'square');
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0');
  await expect(hud).toHaveAttribute('data-hold-ms', '0');
  const nav = (path: string): Promise<void> =>
    page.evaluate((hash) => {
      location.hash = hash;
    }, `#${path}?${query}`);

  // #/ → gallery: a cold entry (from = null); the room registers its payload in load.
  await nav('/gallery');
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  await expect(hud).not.toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  // §8.4/§1.2: the dwell shows the destination's seed-stop caption and hands over to the
  // rest frame on the same stop — the dark card never flashes a second text.
  await expect(page.locator('#caption')).toHaveText('dark; the square behind', { timeout: 60_000 });

  // gallery → jordan: the heaviest room must render within the whole-frame budgets.
  await nav('/jordan');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  await expectWithinBudgets(hud);

  // Re-target DURING the open transit: the queued chain still ends where the URL says,
  // and the departing room always disposes first (§2.4) — this leg exercises that path.
  await nav('/gallery');
  await nav('/');
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
});

// r18 gate (§6.1, §10): every stop of the phase is reachable by keyboard — arrows step
// stop→stop and a boundary intent past an end stop IS the keyboard's airlock — and
// reduced-motion glides are cuts. Reduced motion is emulated BEFORE boot (the host reads
// matchMedia once); cuts make the walk instant. The room flips and the hold rows carry the
// assertions; per-stop captions surface in r18b. Fresh page: a mounted room keeps its
// technique (no reload between configurations — the round-17 measurement trap).
test('keyboard walk: every stop reachable, reduced-motion cuts', async ({ page }) => {
  test.slow(); // same data-bound dwell per transit, on top of the instant reduced-motion cuts
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&lang=en`);
  // Press-and-poll one stop at a time. data-stop re-binds at most every 500 ms and a press
  // fired while a transit is open is dropped by design (§2.4 owns the camera), so: press,
  // then wait for the row to CHANGE (a dropped press retries; a landed one binds within
  // ~500 ms on a healthy frame — the change-wait absorbs slow frames without overshooting).
  // A cut transit to the instant-ready resident never reports a non-zero hold — data-stop
  // is the honest gate, and every landing is observed (§10 r18 gate).
  const caption = page.locator('#caption');
  // The §6.1 caption beats, verbatim from the committed stop data (rooms/*/contract.ts).
  const BEATS: Readonly<Record<string, string>> = {
    S0: 'the facade and the hour',
    S1: 'the arch opens',
    G0: 'dark; the square behind',
    G1: 'compression',
    G2: 'the door (airlock)',
    J0: 'looking up into light',
    J1: 'the flight',
    J2: 'portholes mirror the windows',
    J3: 'the gallery above',
    J4: 'arrival; the portal (landing airlock)',
  };
  const walkTo = (stop: string, key = 'ArrowRight'): Promise<void> =>
    expect
      .poll(
        async () => {
          const before = await hud.getAttribute('data-stop');
          if (before !== stop) {
            await page.keyboard.press(key);
            // The change-wait must outlast a data-bound load dwell (seconds on a starved
            // page): the press either lands, or an open transit's swap lands its seed —
            // either way the row changes; a dropped press needs no retry of its own.
            await expect
              .poll(() => hud.getAttribute('data-stop'), { timeout: 30_000, intervals: [250] })
              .not.toBe(before);
          }
          return hud.getAttribute('data-stop');
        },
        { timeout: 180_000, intervals: [1000] },
      )
      .toBe(stop)
      .then(async () => {
        // Every landing shows that stop's beat (the caption doubles as the description).
        const beat = BEATS[stop];
        if (beat === undefined) throw new Error(`no committed beat for stop ${stop}`);
        await expect(caption).toHaveAttribute('data-stop', stop, { timeout: 60_000 });
        await expect(caption).toHaveText(beat, { timeout: 60_000 });
      });
  // Forward: S0 → S1, the arch-portal boundary, G0 → G2, the gallery-airlock boundary,
  // J0 → J4 — every stop of the phase observed landed.
  for (const stop of ['S1', 'G0', 'G1', 'G2', 'J0', 'J1', 'J2', 'J3', 'J4']) {
    await walkTo(stop);
  }
  // The live region names the stop (§1.2) and tracks the walk's landings.
  await expect(page.locator('#caption-live')).toHaveText(
    'J4 · arrival; the portal (landing airlock)',
  );
  // The landing's far end is inert: a press past J4 fires the boundary intent, but the
  // dead end has no neighbor to transit to (§1.1) — the stop stays, no room row changes.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2000);
  await expect(hud).toHaveAttribute('data-stop', 'J4');
  // Backward: the whole way home through both airlocks — the backward entries seed the
  // far stop (G2, then S1), so the direction of travel is preserved (§6.1 seed law).
  for (const stop of ['J3', 'J2', 'J1', 'J0', 'G2', 'G1', 'G0', 'S1', 'S0']) {
    await walkTo(stop, 'ArrowLeft');
  }
  await expect(page.locator('#caption-live')).toHaveText('S0 · the facade and the hour');
  await expect(hud).toHaveAttribute('data-room', 'square');
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
});
