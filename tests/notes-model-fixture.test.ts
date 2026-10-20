// tests/notes-model-fixture.test.ts
// The model fixture gate: the /notes view-model is pinned as a serialized snapshot the DOM
// binding renders 1:1 — a byte-identical model is a byte-identical page. Captured before the
// keys switch (r24b) and re-baselined deliberately when the page's content changes by design
// (r26: the §3 ledger redesign — the legend, the folded kit footer, the margins on rows); any
// OTHER diff is a regression to explain.
import { expect, it } from 'vitest';
import { buildSouthNotesModel } from '../src/ui/notes-view';

it('the notes model stays byte-identical to the pinned r26 ledger model', async () => {
  const result = buildSouthNotesModel();
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return;
  }
  await expect(JSON.stringify(result.model, null, 2)).toMatchFileSnapshot(
    'fixtures/notes-model-en.json',
  );
});
