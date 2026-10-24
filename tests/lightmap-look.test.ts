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
  it('covers every interior room id (the Record keys on the registry union)', () => {
    expect(Object.keys(INTERIOR_LOOK_GAIN).sort()).toEqual(
      [...INTERIOR_ROOMS, 'military-gallery'].sort(),
    );
  });
  it('the unbaked room\u2019s row is the neutral unset (1/1/1) — R4\u2019s bake declares the real gains', () => {
    expect(INTERIOR_LOOK_GAIN['military-gallery']).toEqual({
      day: 1,
      dusk: 1,
      nightChandeliers: 1,
    });
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
