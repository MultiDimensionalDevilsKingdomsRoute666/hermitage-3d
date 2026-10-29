// tests/e2e/season.spec.ts
// R16 — the season menu (design-season-chooser.md + DEC-034/036). The control is a
// DERIVED view of the committed time state: choosing a season commits the anchor day
// through the scrub's at= transaction (one replaceState, unrelated keys preserved, no
// history entry); «Сейчас» is the scrub's return-to-now law. R16 moved the open face
// in-page: the control is a button with aria-haspopup="listbox" whose listbox borrows
// the room menu's row voice and keyboard law without its modality (no dialog, no
// backdrop, no centering). Ground rules (the sibling specs): ?hud=1 rides the HASH
// query; a deep link boots on a FRESH page; the settle proxy is #scrub visible + the
// control + one margin.
import { expect, type Page, test } from '@playwright/test';

const JUNE_AT = '2026-06-22T03:18:00Z'; // the committed det day instant (06:18 +03)
const DEC_AT = '2026-12-21T10:00:00Z'; // the dec-noon golden
const EDGE_AT = '2099-12-31T22:00:00Z'; // 2100-01-01 01:00 +03: the only window whose anchors leave the bounds

type Lang = 'ru' | 'en';
type SeasonChoice = 'now' | 'winter' | 'spring' | 'summer' | 'autumn';

const seedUrl = (at: string | null, lang: Lang, det = true): string => {
  const parts: string[] = [];
  if (at !== null) parts.push(`at=${at}`);
  if (det) parts.push('det=1');
  parts.push('hud=1', `lang=${lang}`);
  return `/#/?${parts.join('&')}`;
};

const hashParams = (page: Page): URLSearchParams => {
  const hash = new URL(page.url()).hash;
  const mark = hash.indexOf('?');
  return new URLSearchParams(mark === -1 ? '' : hash.slice(mark + 1));
};

const SETTLE_TIMEOUT_MS = 45_000; // the sibling-spec law: SwiftShader CI boots are slow, never gate on the default

const settle = async (page: Page): Promise<void> => {
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator('#season')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.waitForTimeout(300);
};

// The menu interaction: open (click), choose (a row click). The list closes on every
// commit; the derived value is the aria-selected carrier plus the button's label.
const openMenu = async (page: Page): Promise<void> => {
  await page.locator('#season').click();
  await expect(page.locator('#season-list')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
};

const choose = async (page: Page, id: SeasonChoice): Promise<void> => {
  await openMenu(page);
  await page.locator(`#season-list [data-season="${id}"]`).click();
};

const expectDerived = async (page: Page, id: SeasonChoice): Promise<void> => {
  await expect(page.locator(`#season-list [data-season="${id}"]`)).toHaveAttribute(
    'aria-selected',
    'true',
  );
};

test.describe('season chooser — choosing a season commits the anchor day', () => {
  test('winter from a June det boot moves at= to Jan 15 at the same time, keeps the seed params', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'ru'));
    await settle(page);
    await expectDerived(page, 'summer');
    await choose(page, 'winter');
    const params = hashParams(page);
    expect(params.get('at')).toBe('2026-01-15T03:18:00.000Z');
    expect(params.get('det')).toBe('1');
    expect(params.get('hud')).toBe('1');
    expect(params.get('lang')).toBe('ru');
    await expectDerived(page, 'winter');
    await expect(page.locator('#clock-date')).toContainText('15 января 2026');
  });

  test('the same commit under lang=en writes the same instant', async ({ page }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await choose(page, 'winter');
    const params = hashParams(page);
    expect(params.get('at')).toBe('2026-01-15T03:18:00.000Z');
    expect(params.get('det')).toBe('1');
    expect(params.get('lang')).toBe('en');
    await expectDerived(page, 'winter');
  });

  test('autumn from a December boot keeps the local time of day', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    await choose(page, 'autumn');
    expect(hashParams(page).get('at')).toBe('2026-10-15T10:00:00.000Z');
    await expectDerived(page, 'autumn');
  });
});

test.describe('season chooser — «now» under det', () => {
  test('captures a new instant, keeps det=1, and re-derives to the season of that instant', async ({
    page,
  }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    const before = Date.now();
    await choose(page, 'now');
    const params = hashParams(page);
    const at = params.get('at');
    expect(at).not.toBeNull();
    expect(at).not.toBe('2026-12-21T10:00:00.000Z');
    const captured = Date.parse(at ?? '');
    expect(Number.isNaN(captured)).toBe(false);
    expect(Math.abs(captured - before)).toBeLessThan(60_000);
    expect(params.get('det')).toBe('1');
    expect(params.get('hud')).toBe('1');
    expect(params.get('lang')).toBe('en');
    // frozen time is never «now»: the button shows the season of the captured instant
    await expect(page.locator('#season')).toHaveText('Winter');
  });
});

test.describe('season chooser — the value is derived from the time state at boot', () => {
  test('a December at= boot reads winter before any interaction', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    await expect(page.locator('#season')).toHaveText('Winter');
    await expectDerived(page, 'winter');
    expect(hashParams(page).get('at')).toBe(DEC_AT); // the derive writes nothing
  });

  test('a June at= boot reads summer', async ({ page }) => {
    await page.goto(seedUrl(JUNE_AT, 'ru'));
    await settle(page);
    await expect(page.locator('#season')).toHaveText('Лето');
    await expectDerived(page, 'summer');
  });

  test('a live boot reads now', async ({ page }) => {
    await page.goto(seedUrl(null, 'en', false));
    await settle(page);
    await expect(page.locator('#season')).toHaveText('Now');
    await expectDerived(page, 'now');
    expect(hashParams(page).has('at')).toBe(false);
  });
});

test.describe('season chooser — language switch', () => {
  test('keeps the value and swaps the labels', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    const button = page.locator('#season');
    await expectDerived(page, 'winter');
    await expect(page.locator('#season-label')).toHaveText('Season of the scene');
    await openMenu(page);
    await expect(page.locator('[data-season="winter"]')).toHaveText('Winter');
    await expect(page.locator('[data-season="now"]')).toHaveText('Now');
    await page.locator('#lang-toggle').click(); // an open menu closes on a language swap
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('#season-list')).toBeHidden();
    await expectDerived(page, 'winter');
    await expect(button).toHaveText('Зима');
    await expect(page.locator('#season-label')).toHaveText('Время года сцены');
    await openMenu(page);
    await expect(page.locator('[data-season="winter"]')).toHaveText('Зима');
    await expect(page.locator('[data-season="now"]')).toHaveText('Сейчас');
    await expect(page.locator('#season-help')).toContainText('Выбор времени года');
    expect(hashParams(page).get('at')).toBe(DEC_AT);
  });
});

test.describe('season chooser — the clock row stays one line at 360 px', () => {
  test.use({ viewport: { width: 360, height: 744 } });

  for (const lang of ['ru', 'en'] as const) {
    test(`one line in ${lang}`, async ({ page }) => {
      await page.goto(seedUrl(JUNE_AT, lang));
      await settle(page);
      const row = await page.locator('#timeline').boundingBox();
      const clock = await page.locator('#clock').boundingBox();
      const button = await page.locator('#season').boundingBox();
      expect(row).not.toBeNull();
      expect(clock).not.toBeNull();
      expect(button).not.toBeNull();
      if (row === null || clock === null || button === null) return;
      expect(row.height).toBeLessThanOrEqual(40);
      // a wrapped row would place the control on a second line below the clock
      expect(Math.abs(button.y - clock.y)).toBeLessThanOrEqual(6);
      expect(button.x + button.width).toBeLessThanOrEqual(360);

      // R16: the opened list stays inside the viewport at the phone width
      await openMenu(page);
      const list = await page.locator('#season-list').boundingBox();
      expect(list).not.toBeNull();
      if (list === null) return;
      expect(list.x).toBeGreaterThanOrEqual(0);
      expect(list.y).toBeGreaterThanOrEqual(0);
      expect(list.x + list.width).toBeLessThanOrEqual(360);
      expect(list.y + list.height).toBeLessThanOrEqual(744);
    });
  }
});

test.describe('season chooser — the bounds refusal', () => {
  test('an anchor outside 1901–2100 is refused: state unchanged, control re-synced, one warn', async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.goto(seedUrl(EDGE_AT, 'en'));
    await settle(page);
    await expectDerived(page, 'winter');
    await choose(page, 'summer');
    const params = hashParams(page);
    expect(params.get('at')).toBe(EDGE_AT);
    expect(params.get('det')).toBe('1');
    await expectDerived(page, 'winter');
    await expect(page.locator('#season-list')).toBeHidden();
    expect(warnings.filter((w) => w.includes('season issue — out-of-range'))).toHaveLength(1);
  });
});

test.describe('season menu — the open-face laws (DEC-036)', () => {
  test('the keyboard opens, the selected row takes focus, and the row focus is the chrome law', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await page.locator('#season').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#season-list')).toBeVisible();
    await expect(page.locator('#season')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-season="summer"]')).toBeFocused(); // the derived row
    // the one focus law (the r16 blocks 5–6): the label underline, never a box
    const row = page.locator('[data-season="summer"]');
    await expect(row).toHaveCSS('text-decoration-line', 'underline');
    await expect(row).toHaveCSS('outline-style', 'none');
  });

  test('ArrowUp from the first row wraps to the last row', async ({ page }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await openMenu(page);
    await expect(page.locator('[data-season="now"]')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-season="autumn"]')).toBeFocused();
  });

  test('Enter on a row commits through the keyboard; Escape closes without a commit', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await openMenu(page);
    await page.keyboard.press('ArrowDown'); // now → winter
    await expect(page.locator('[data-season="winter"]')).toBeFocused();
    await page.keyboard.press('Enter');
    const params = hashParams(page);
    expect(params.get('at')).toBe('2026-01-15T03:18:00.000Z');
    await expect(page.locator('#season-list')).toBeHidden();
    await expect(page.locator('#season')).toBeFocused(); // focus returns to the control
    await expect(page.locator('#season')).toHaveAttribute('aria-expanded', 'false');

    // Escape: close, no commit, focus returns
    await expect(page.locator('#season')).toHaveText('Winter');
    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#season-list')).toBeHidden();
    await expect(page.locator('#season')).toBeFocused();
    expect(hashParams(page).get('at')).toBe('2026-01-15T03:18:00.000Z'); // unchanged
  });

  test('a pointer/outside click closes; Tab closes into the browser order; the open list never touches the scrub', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    const scrub = page.locator('#scrub');
    await openMenu(page);
    const before = await scrub.evaluate((el) => (el as HTMLInputElement).valueAsNumber);
    await page.keyboard.press('ArrowDown'); // handled by the list, stopped from the page
    await expect(page.locator('[data-season="winter"]')).toBeFocused();
    expect(await scrub.evaluate((el) => (el as HTMLInputElement).valueAsNumber)).toBe(before);
    await page.mouse.click(180, 500); // outside the button and the list
    await expect(page.locator('#season-list')).toBeHidden();

    // Tab: the module closes silently; the browser's default tab order proceeds
    await openMenu(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('#season-list')).toBeHidden();
  });

  test('the list never overlaps the viewport chrome: it clears the top-right controls', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await openMenu(page);
    const list = await page.locator('#season-list').boundingBox();
    const controls = await page.locator('#controls').boundingBox();
    expect(list).not.toBeNull();
    expect(controls).not.toBeNull();
    if (list === null || controls === null) return;
    const overlapX =
      Math.min(list.x + list.width, controls.x + controls.width) - Math.max(list.x, controls.x);
    const overlapY =
      Math.min(list.y + list.height, controls.y + controls.height) - Math.max(list.y, controls.y);
    expect(overlapX).toBeLessThanOrEqual(0);
    expect(overlapY).toBeLessThanOrEqual(0);
  });
});
