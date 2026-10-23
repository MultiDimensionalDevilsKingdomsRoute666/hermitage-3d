import { describe, expect, it } from 'vitest';

import {
  DOOR_LABEL_SEPARATOR,
  doorLabel,
  edgePromptView,
  pushMemory,
  roomName,
} from '../src/ui/edge-prompt';

const view = (
  boundary: 'backward' | 'forward' | null,
  pushed: 'backward' | 'forward' | null,
  settled = true,
  atRest = true,
) => edgePromptView({ settled, atRest, boundary, pushed });

describe('§2/§9 door label: the far end invites, the entry end answers a push', () => {
  it('shows on the settle frame at the far end without any push', () => {
    expect(view('forward', null)).toEqual({ visible: true, boundary: 'forward' });
  });

  it('keeps the first settled frame at an entry stop silent until a backward push', () => {
    expect(view('backward', null)).toEqual({ visible: false, boundary: null });
    expect(view('backward', 'backward')).toEqual({ visible: true, boundary: 'backward' });
    // A forward push at the entry end is travel inward, never a door answer.
    expect(view('backward', 'forward').visible).toBe(false);
  });

  it('never shows while the camera moves, in transit, or where no airlock side exists', () => {
    expect(view('forward', 'forward', true, false).visible).toBe(false);
    expect(view('forward', 'forward', false, true).visible).toBe(false);
    expect(view(null, 'forward').visible).toBe(false);
  });
});

describe('§2 push memory: set by a push into the clamped end, dropped on leaving it', () => {
  it('remembers a push in the end direction and holds it through the stream', () => {
    expect(pushMemory(null, { end: 'backward', push: 'backward' })).toBe('backward');
    expect(pushMemory('backward', { end: 'backward', push: null })).toBe('backward');
  });

  it('forgets when the clamped target leaves the end or the end changes', () => {
    expect(pushMemory('backward', { end: null, push: null })).toBeNull();
    expect(pushMemory('backward', { end: 'forward', push: null })).toBeNull();
    expect(pushMemory(null, { end: 'backward', push: 'forward' })).toBeNull();
  });
});

describe('D1 door label text: the verb, the ruled separator, the room NAME', () => {
  it('takes the head of a sentence title before the em dash, in both languages', () => {
    expect(roomName('Rastrelli Gallery — the way in')).toBe('Rastrelli Gallery');
    expect(roomName('Галерея Растрелли\u00A0— путь внутрь')).toBe('Галерея Растрелли');
    expect(roomName('Palace Square')).toBe('Palace Square');
  });

  it('composes the ruled copy exactly', () => {
    expect(DOOR_LABEL_SEPARATOR).toBe(' · ');
    expect(doorLabel({ verb: 'Enter', title: 'Rastrelli Gallery — the way in' })).toBe(
      'Enter · Rastrelli Gallery',
    );
    expect(doorLabel({ verb: 'Назад', title: 'Дворцовая площадь' })).toBe(
      'Назад · Дворцовая площадь',
    );
  });

  it('refuses an empty verb or name, loud', () => {
    expect(() => doorLabel({ verb: ' ', title: 'Palace Square' })).toThrow(RangeError);
    expect(() => roomName('')).toThrow(RangeError);
  });
});

describe('purity', () => {
  const sources = import.meta.glob('../src/ui/edge-prompt.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
