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
  // §8.4/§1.2 + §4 (DEC-017 rewritten): the black card carries the destination's room title
  // above the seed-stop caption — the cold entry's card-first shape, now titled. The sticky
  // data-shown breadcrumb catches the card no matter how short its window is (a staged
  // room's card lives exactly holdMs — CI polls at ~500 ms and can miss the whole window).
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Rastrelli Gallery — the way in',
    { timeout: 60_000 },
  );
  // §8.4/§1.2: the dwell shows the destination's seed-stop caption and hands over to the
  // rest frame on the same stop — the dark card never flashes a second text.
  await expect(page.locator('#caption')).toHaveText('dark; the square behind', { timeout: 60_000 });

  // gallery → jordan: the heaviest room must render within the whole-frame budgets.
  await nav('/jordan');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  // The transit's card titled the destination — the sticky breadcrumb proves the shape.
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Jordan Staircase — the ascent',
    { timeout: 60_000 },
  );
  await expectWithinBudgets(hud);

  // Re-target DURING the open transit: the queued chain still ends where the URL says,
  // and the departing room always disposes first (§2.4) — this leg exercises that path.
  await nav('/gallery');
  await nav('/');
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
});

test('wheel walk: the boundary prompt and the sustained wheel enter both airlocks', async ({
  page,
}) => {
  // The owner's reachability report (2026-10-21): a trackpad visitor scrolled to a rail
  // end and stalled — the doors were arrows-only. Two roads must reach the same
  // beginTransitTo call the arrows use: the chrome prompt (click) and a sustained
  // deliberate wheel past the clamp (the momentum-immunity law, DEC-031). Fresh page:
  // a mounted room keeps its technique (the round-17 measurement trap).
  test.slow();
  const query = `${AT}&det=1&hud=1&lang=en`;
  const hud = await bootDeterministic(page, query);
  await expectWithinBudgets(hud);
  const edgePrompt = page.locator('#edge-prompt');
  // Mid-room at the start: the prompt is hidden (the UI-nearly-absent law).
  await expect(edgePrompt).toHaveAttribute('data-visible', 'false');
  await page.mouse.move(640, 360);
  // The deliberate walk: 80 px per event at ~45 ms — every event under the speed gate.
  // Dispatched inside the page: a trusted-input round-trip per event makes a 50-event
  // walk crawl under SwiftShader (the hint spec sends one event; this walk needs a stream).
  const wheel = async (events: number): Promise<void> => {
    await page.evaluate((n) => {
      const canvas = document.querySelector('#scene');
      for (let i = 0; i < n; i += 1) {
        setTimeout(() => {
          canvas?.dispatchEvent(
            new WheelEvent('wheel', { deltaY: 80, cancelable: true, bubbles: true }),
          );
        }, i * 45);
      }
    }, events);
    await page.waitForTimeout(events * 45 + 120);
  };
  // The square's one segment into S1's clamp; the glide settles and the prompt appears.
  await wheel(16);
  await expect(edgePrompt).toHaveAttribute('data-visible', 'true', { timeout: 30_000 });
  // The label names the room through the door (§2/D1): verb + ' · ' + the room's NAME.
  await expect(edgePrompt).toHaveText('Enter · Rastrelli Gallery', { timeout: 30_000 });
  // Road 1 — the prompt: the click travels the same boundary step the arrows use.
  await edgePrompt.click();
  // The threshold beat (§4, DEC-017 rewritten): the black card shows the destination's room
  // title (the words the door label will click), then empties with the first lit frame.
  // The sticky data-shown breadcrumb (the CI poll-cadence lesson) catches the short window.
  const captionTitle = page.locator('#caption-title');
  await expect(captionTitle).toHaveAttribute('data-shown', 'Rastrelli Gallery — the way in', {
    timeout: 60_000,
  });
  await expect(captionTitle).toHaveAttribute('data-visible', 'false', { timeout: 60_000 });
  // The URL is the state: the swap rewrites the hash to the room's route (DEC-031).
  await expect(page).toHaveURL(/#\/gallery/, { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  // The swap is only proven by the hold returning to zero at the NEW room (the dwell
  // caption shows DURING the hold — it names the destination, not the arrival).
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expectWithinBudgets(hud);
  // The entry stop's first settled frame shows the caption only (§9): the door label waits
  // for a backward push.
  await expect(edgePrompt).toHaveAttribute('data-visible', 'false');
  // The backward push — the door answers (§2/§9): one event latches it, the text names home.
  await page.evaluate(() => {
    document
      .querySelector('#scene')
      ?.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, cancelable: true, bubbles: true }));
  });
  await expect(edgePrompt).toHaveAttribute('data-visible', 'true');
  await expect(edgePrompt).toHaveText('Back out · Palace Square');
  // Road 2 — the sustained wheel: the gallery's two segments into G2's clamp, then the
  // pass spans its sustain window; the airlock fires mid-batch.
  await wheel(34);
  await expect(edgePrompt).toHaveAttribute('data-visible', 'true', { timeout: 30_000 });
  await expect(edgePrompt).toHaveText('Enter · Jordan Staircase', { timeout: 30_000 });
  await wheel(14);
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expect(page).toHaveURL(/#\/jordan/, { timeout: 60_000 });
  await expectWithinBudgets(hud);
  // Home by URL (the smoke's own law): the ledger returns to boot values. The room's
  // own rewrites mean the boot hash now DIFFERS from the address bar (the URL-is-the-
  // state law), so this assignment is a real hashchange → the transit home by the chain.
  await page.evaluate((hash) => {
    location.hash = hash;
  }, `#/?${query}`);
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
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
