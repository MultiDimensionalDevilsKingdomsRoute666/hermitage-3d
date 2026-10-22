/**
 * Caption presentation core — design-staircase §6.1, §8.4, §1.2 laws.
 * Beat texts restated verbatim from the committed stop data.
 */
import { describe, expect, it } from 'vitest';
import {
  type CaptionInput,
  type CaptionStop,
  captionChanges,
  EMPTY_CAPTION,
  formatAnnouncement,
  presentCaption,
} from '../src/ui/captions';

const SQUARE = [
  { id: 'S0', caption: 'the facade and the hour' },
  { id: 'S1', caption: 'the arch opens' },
] as const satisfies readonly CaptionStop[];
const GALLERY = [
  { id: 'G0', caption: 'dark; the square behind' },
  { id: 'G1', caption: 'compression' },
  { id: 'G2', caption: 'the door (airlock)' },
] as const satisfies readonly CaptionStop[];
const JORDAN = [
  { id: 'J0', caption: 'looking up into light' },
  { id: 'J1', caption: 'the flight' },
  { id: 'J2', caption: 'portholes mirror the windows' },
  { id: 'J3', caption: 'the gallery above' },
  { id: 'J4', caption: 'arrival; the portal (landing airlock)' },
] as const satisfies readonly CaptionStop[];
const NODES = [SQUARE, GALLERY, JORDAN] as const;

const rest = (stops: readonly CaptionStop[], stopIndex: number): CaptionInput => ({
  stops,
  stopIndex,
  gliding: false,
  dwell: null,
  dwellTitle: null,
  suppressed: false,
});
const glide = (stops: readonly CaptionStop[], stopIndex: number): CaptionInput => ({
  ...rest(stops, stopIndex),
  gliding: true,
});
const noChange = {
  text: false,
  visible: false,
  stopId: false,
  title: false,
  announcement: false,
};

describe('rest law', () => {
  it('reaches every committed beat text, visibly, from an empty view', () => {
    for (const stops of NODES) {
      stops.forEach((stop, i) => {
        const view = presentCaption(EMPTY_CAPTION, rest(stops, i));
        expect(view.text).toBe(stop.caption);
        expect(view.visible).toBe(true);
        expect(view.stopId).toBe(stop.id);
      });
    }
  });
  it('names the stop in the announcement but not in the visible text', () => {
    const view = presentCaption(EMPTY_CAPTION, rest(JORDAN, 1));
    expect(view.announcement).toBe('J1 · the flight');
    expect(view.text).toBe('the flight');
    expect(formatAnnouncement(JORDAN[1])).toBe(view.announcement);
  });
});

describe('glide law', () => {
  it('fades out holding the departure text even after the nearest stop flips', () => {
    const atG0 = presentCaption(EMPTY_CAPTION, rest(GALLERY, 0));
    const early = presentCaption(atG0, glide(GALLERY, 0));
    const late = presentCaption(early, glide(GALLERY, 1));
    expect(early.visible).toBe(false);
    expect(late.visible).toBe(false);
    expect(late.text).toBe(GALLERY[0].caption);
    expect(late.stopId).toBe('G0');
    expect(captionChanges(early, late)).toEqual(noChange);
  });
  it('swaps text only on landing and fades back in', () => {
    const atG0 = presentCaption(EMPTY_CAPTION, rest(GALLERY, 0));
    const mid = presentCaption(atG0, glide(GALLERY, 1));
    const landed = presentCaption(mid, rest(GALLERY, 1));
    expect(landed.text).toBe(GALLERY[1].caption);
    expect(landed.visible).toBe(true);
    expect(captionChanges(mid, landed)).toEqual({
      text: true,
      visible: true,
      stopId: true,
      title: false,
      announcement: true,
    });
  });
  it('never blanks: a glide on the first frame borrows the rest text', () => {
    const view = presentCaption(EMPTY_CAPTION, glide(SQUARE, 1));
    expect(view.text).toBe(SQUARE[1].caption);
    expect(view.stopId).toBe('S1');
    expect(view.visible).toBe(false);
  });
});

describe('dwell law', () => {
  const dwellJ0: CaptionInput = { ...rest(GALLERY, 2), dwell: JORDAN[0] };
  const card: CaptionInput = { ...dwellJ0, dwellTitle: 'Jordan Staircase — the ascent' };
  it('shows the destination entry caption on the dark card', () => {
    const atG2 = presentCaption(EMPTY_CAPTION, rest(GALLERY, 2));
    const view = presentCaption(atG2, dwellJ0);
    expect(view.text).toBe('looking up into light');
    expect(view.visible).toBe(true);
    expect(view.stopId).toBe('J0');
    expect(view.announcement).toBe('J0 · looking up into light');
  });
  it('carries the room title above the caption while the frame is black (§4, DEC-017)', () => {
    const view = presentCaption(EMPTY_CAPTION, card);
    expect(view.title).toBe('Jordan Staircase — the ascent');
    expect(view.text).toBe('looking up into light');
    expect(view.visible).toBe(true);
  });
  it('the title empties on the first lit frame (the arrive phase: no dwellTitle)', () => {
    const black = presentCaption(EMPTY_CAPTION, card);
    const lit = presentCaption(black, dwellJ0);
    expect(lit.title).toBe('');
    expect(lit.text).toBe(black.text); // the caption hand-over is still zero-change
    expect(captionChanges(black, lit)).toEqual({ ...noChange, title: true });
  });
  it('the rest frame after the beats equals the lit beat frame (no caption flash)', () => {
    const lit = presentCaption(EMPTY_CAPTION, dwellJ0);
    const frame = presentCaption(lit, rest(JORDAN, 0));
    expect(frame).toEqual(lit);
    expect(captionChanges(lit, frame)).toEqual(noChange);
  });
  it('cold deep link: the first view is already J0 text, fading in from empty', () => {
    const view = presentCaption(EMPTY_CAPTION, { ...rest(JORDAN, 0), dwell: JORDAN[0] });
    expect(captionChanges(EMPTY_CAPTION, view).visible).toBe(true);
    expect(view.text).toBe(JORDAN[0].caption);
  });
  it('outranks suppression', () => {
    const view = presentCaption(EMPTY_CAPTION, { ...dwellJ0, suppressed: true });
    expect(view.visible).toBe(true);
    expect(view.text).toBe(JORDAN[0].caption);
  });
});

describe('suppression (arrival title beat)', () => {
  it('hides while holding S0 so lifting it is a single fade-in with no text change', () => {
    const boot = presentCaption(EMPTY_CAPTION, { ...rest(SQUARE, 0), suppressed: true });
    expect(boot.visible).toBe(false);
    expect(boot.text).toBe(SQUARE[0].caption);
    const settled = presentCaption(boot, rest(SQUARE, 0));
    const changes = captionChanges(boot, settled);
    expect(changes.text).toBe(false);
    expect(changes.visible).toBe(true);
  });
});

describe('announce only on change', () => {
  it('reports no change for an identical frame', () => {
    const a = presentCaption(EMPTY_CAPTION, rest(JORDAN, 3));
    const b = presentCaption(a, rest(JORDAN, 3));
    expect(captionChanges(a, b)).toEqual(noChange);
  });
  it('keeps the announcement sticky through a glide and back to the same stop', () => {
    const a = presentCaption(EMPTY_CAPTION, rest(JORDAN, 2));
    const away = presentCaption(a, glide(JORDAN, 2));
    const back = presentCaption(away, rest(JORDAN, 2));
    expect(away.announcement).toBe(a.announcement);
    expect(captionChanges(a, away).announcement).toBe(false);
    expect(captionChanges(away, back).announcement).toBe(false);
  });
  it('announces once per new stop along a keyboard walk', () => {
    let view = presentCaption(EMPTY_CAPTION, rest(JORDAN, 0));
    const announced: string[] = [];
    for (let i = 1; i < JORDAN.length; i += 1) {
      const mid = presentCaption(view, glide(JORDAN, i));
      const next = presentCaption(mid, rest(JORDAN, i));
      if (captionChanges(view, next).announcement) announced.push(next.announcement);
      view = next;
    }
    expect(announced).toEqual(JORDAN.slice(1).map(formatAnnouncement));
  });
});

describe('malformed input fails loud', () => {
  it('rejects a node without stops', () => {
    expect(() => presentCaption(EMPTY_CAPTION, rest([], 0))).toThrow(/without stops/);
  });
  it('rejects an out-of-range or non-integer index', () => {
    expect(() => presentCaption(EMPTY_CAPTION, rest(SQUARE, 2))).toThrow(/outside/);
    expect(() => presentCaption(EMPTY_CAPTION, rest(SQUARE, -1))).toThrow(/outside/);
    expect(() => presentCaption(EMPTY_CAPTION, rest(SQUARE, 0.5))).toThrow(/integer/);
  });
  it('rejects empty ids or captions, at rest and in a dwell', () => {
    const blank: CaptionStop = { id: 'X0', caption: '' };
    expect(() => presentCaption(EMPTY_CAPTION, rest([blank], 0))).toThrow(/empty/);
    expect(() => presentCaption(EMPTY_CAPTION, { ...rest(SQUARE, 0), dwell: blank })).toThrow(
      /dwell/,
    );
  });
});
