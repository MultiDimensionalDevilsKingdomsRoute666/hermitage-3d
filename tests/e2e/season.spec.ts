// tests/e2e/season.spec.ts
// R11 — the manual season chooser (design-season-chooser.md; DEC-034). The select is a
// DERIVED view of the committed time state: choosing a season commits the anchor day
// through the scrub's at= transaction (one replaceState, unrelated keys preserved, no
// history entry); «Сейчас» is the scrub's return-to-now law. Ground rules (the sibling
// specs): ?hud=1 rides the HASH query; a deep link boots on a FRESH page; the settle
// proxy is #scrub visible + the select + one margin.
import { expect, type Page, test } from '@playwright/test';

const JUNE_AT = '2026-06-22T03:18:00Z'; // the committed det day instant (06:18 +03)
const DEC_AT = '2026-12-21T10:00:00Z'; // the dec-noon golden
const EDGE_AT = '2099-12-31T22:00:00Z'; // 2100-01-01 01:00 +03: the only window whose anchors leave the bounds

type Lang = 'ru' | 'en';

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

const settle = async (page: Page): Promise<void> => {
  await expect(page.locator('#scrub')).toBeVisible();
  await expect(page.locator('#season')).toBeVisible();
  await page.waitForTimeout(300);
};

test.describe('season chooser — choosing a season commits the anchor day', () => {
  test('winter from a June det boot moves at= to Jan 15 at the same time, keeps the seed params', async ({
    page,
  }) => {
    await page.goto(seedUrl(JUNE_AT, 'ru'));
    await settle(page);
    await expect(page.locator('#season')).toHaveValue('summer');
    await page.selectOption('#season', 'winter');
    const params = hashParams(page);
    expect(params.get('at')).toBe('2026-01-15T03:18:00.000Z');
    expect(params.get('det')).toBe('1');
    expect(params.get('hud')).toBe('1');
    expect(params.get('lang')).toBe('ru');
    await expect(page.locator('#season')).toHaveValue('winter');
    await expect(page.locator('#clock-date')).toContainText('15 января 2026');
  });

  test('the same commit under lang=en writes the same instant', async ({ page }) => {
    await page.goto(seedUrl(JUNE_AT, 'en'));
    await settle(page);
    await page.selectOption('#season', 'winter');
    const params = hashParams(page);
    expect(params.get('at')).toBe('2026-01-15T03:18:00.000Z');
    expect(params.get('det')).toBe('1');
    expect(params.get('lang')).toBe('en');
    await expect(page.locator('#season')).toHaveValue('winter');
  });

  test('autumn from a December boot keeps the local time of day', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    await page.selectOption('#season', 'autumn');
    expect(hashParams(page).get('at')).toBe('2026-10-15T10:00:00.000Z');
    await expect(page.locator('#season')).toHaveValue('autumn');
  });
});

test.describe('season chooser — «now» under det', () => {
  test('captures a new instant, keeps det=1, and re-derives to the season of that instant', async ({
    page,
  }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    const before = Date.now();
    await page.selectOption('#season', 'now');
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
    // frozen time is never «now»: the select shows the season of the captured instant
    const value = await page.locator('#season').inputValue();
    expect(['winter', 'spring', 'summer', 'autumn']).toContain(value);
  });
});

test.describe('season chooser — the value is derived from the time state at boot', () => {
  test('a December at= boot reads winter before any interaction', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    await expect(page.locator('#season')).toHaveValue('winter');
    expect(hashParams(page).get('at')).toBe(DEC_AT); // the derive writes nothing
  });

  test('a June at= boot reads summer', async ({ page }) => {
    await page.goto(seedUrl(JUNE_AT, 'ru'));
    await settle(page);
    await expect(page.locator('#season')).toHaveValue('summer');
  });

  test('a live boot reads now', async ({ page }) => {
    await page.goto(seedUrl(null, 'en', false));
    await settle(page);
    await expect(page.locator('#season')).toHaveValue('now');
    expect(hashParams(page).has('at')).toBe(false);
  });
});

test.describe('season chooser — language switch', () => {
  test('keeps the value and swaps the labels', async ({ page }) => {
    await page.goto(seedUrl(DEC_AT, 'en'));
    await settle(page);
    const select = page.locator('#season');
    await expect(select).toHaveValue('winter');
    await expect(select).toHaveAttribute('aria-label', 'Season of the scene');
    await expect(select.locator('option[value="winter"]')).toHaveText('Winter');
    await expect(select.locator('option[value="now"]')).toHaveText('Now');
    await page.locator('#lang-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(select).toHaveValue('winter');
    await expect(select).toHaveAttribute('aria-label', 'Время года сцены');
    await expect(select.locator('option[value="winter"]')).toHaveText('Зима');
    await expect(select.locator('option[value="now"]')).toHaveText('Сейчас');
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
      const select = await page.locator('#season').boundingBox();
      expect(row).not.toBeNull();
      expect(clock).not.toBeNull();
      expect(select).not.toBeNull();
      if (row === null || clock === null || select === null) return;
      expect(row.height).toBeLessThanOrEqual(40);
      // a wrapped row would place the select on a second line below the clock
      expect(Math.abs(select.y - clock.y)).toBeLessThanOrEqual(6);
      expect(select.x + select.width).toBeLessThanOrEqual(360);
    });
  }
});

test.describe('season chooser — the bounds refusal', () => {
  test('an anchor outside 1901–2100 is refused: state unchanged, select re-synced, one warn', async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.goto(seedUrl(EDGE_AT, 'en'));
    await settle(page);
    await expect(page.locator('#season')).toHaveValue('winter');
    await page.selectOption('#season', 'summer');
    const params = hashParams(page);
    expect(params.get('at')).toBe(EDGE_AT);
    expect(params.get('det')).toBe('1');
    await expect(page.locator('#season')).toHaveValue('winter');
    expect(warnings.filter((w) => w.includes('season issue — out-of-range'))).toHaveLength(1);
  });
});
