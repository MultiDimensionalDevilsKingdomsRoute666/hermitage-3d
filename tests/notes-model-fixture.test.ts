// tests/notes-model-fixture.test.ts
// The round-24b byte-identity gate: the /notes view-model must stay byte-identical to the
// pre-refactor extraction (design-i18n-notes.md §6, round-24 exit). The fixture was captured
// from the committed tree BEFORE the keys switch; this test re-runs the pure model builder and
// compares the serialized model field by field. The DOM binding renders this model 1:1, so a
// byte-identical model is a byte-identical page.
import { expect, it } from 'vitest';
import { buildSouthNotesModel } from '../src/ui/notes-view';

it('the notes model stays byte-identical to the pre-refactor extraction', async () => {
  const result = buildSouthNotesModel();
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return;
  }
  await expect(JSON.stringify(result.model, null, 2)).toMatchFileSnapshot(
    'fixtures/notes-model-en.json',
  );
});
