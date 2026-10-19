// tests/lightmap-look.test.ts
// §5 look law content table: INTERIOR_LOOK_GAIN covers exactly the interior rooms, every state
// entry finite and > 0; LIGHT_STATES is the ordered §4 triple. Pure module, pure test.
import { describe, expect, it } from 'vitest';
import { INTERIOR_LOOK_GAIN, LIGHT_STATES } from '../src/content/lightmap-look';

const INTERIOR_ROOMS = ['jordan', 'rastrelli-gallery'] as const;

describe('LIGHT_STATES', () => {
  it('is exactly day, dusk, nightChandeliers in that order', () => {
    expect([...LIGHT_STATES]).toEqual(['day', 'dusk', 'nightChandeliers']);
  });
});

describe('INTERIOR_LOOK_GAIN', () => {
  it('covers exactly the two interior rooms', () => {
    expect(Object.keys(INTERIOR_LOOK_GAIN).sort()).toEqual([...INTERIOR_ROOMS].sort());
  });
  it('every state entry is a finite positive number', () => {
    for (const room of INTERIOR_ROOMS) {
      const row = INTERIOR_LOOK_GAIN[room];
      expect(Object.keys(row).sort()).toEqual([...LIGHT_STATES].sort());
      for (const state of LIGHT_STATES) {
        const gain = row[state];
        expect(Number.isFinite(gain), `${room}.${state} finite`).toBe(true);
        expect(gain, `${room}.${state} > 0`).toBeGreaterThan(0);
      }
    }
  });
});
