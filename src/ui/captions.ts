/**
 * Caption presentation core.
 * Implements design-staircase §6.1 (caption beat: rest and glide), §8.4 + §1.2
 * (airlock dwell shows the destination's entry caption on the dark card),
 * architecture.md room contract (the caption doubles as the accessible
 * description), the design-sky-time §9 precedent (passive overlay plus a
 * live region; no permanent panel) and design-walkthrough-ux.md §4 + DEC-017
 * (the threshold beat's TITLE CARD: the dwell carries the destination's room
 * title above the caption; it fades on the first lit frame).
 *
 * Pure: DOM-free, three-free. The host feeds parsed data once per frame and
 * rewrites DOM only where `captionChanges` reports a difference.
 *
 * Laws (stated once, here):
 *  - REST: at a stop, that stop's caption is visible; the title is empty.
 *  - GLIDE: the overlay fades out holding the departure text; the text swaps
 *    only on landing, while still hidden, then fades back in. Requires
 *    CAPTION_FADE_MS to be shorter than the shortest glide.
 *  - DWELL: the dark card shows the destination entry caption — plus the
 *    destination's room title while the frame is black (the card phase); the
 *    title empties with the first lit frame (the arrive phase), so its fade
 *    overlaps the room lighting up. The frame that follows the beats rests on
 *    that same stop, so the caption's hand-over changes nothing.
 *  - SUPPRESSED: during the square's title beat the caption stays hidden,
 *    holding its text, so two fades never compete. A dwell outranks it.
 *  - ANNOUNCE: the live region holds `<id> · <caption>`; it is rewritten only
 *    when that string changes and hiding never clears it. The title is a
 *    visual line only (aria-hidden in the DOM); the announcement law is
 *    untouched.
 * Precedence: dwell > suppressed > gliding > rest.
 * Committed caption data is static, so malformed input fails loud.
 */
export type CaptionStop = Readonly<{ id: string; caption: string }>;
export type CaptionInput = Readonly<{
  stops: readonly CaptionStop[];
  stopIndex: number;
  gliding: boolean;
  dwell: CaptionStop | null;
  /** The card's title line (the destination's room title); null clears it. */
  dwellTitle: string | null;
  suppressed: boolean;
}>;
export type CaptionView = Readonly<{
  text: string;
  visible: boolean;
  stopId: string | null;
  title: string;
  announcement: string;
}>;
export type CaptionChanges = Readonly<{
  text: boolean;
  visible: boolean;
  stopId: boolean;
  title: boolean;
  announcement: boolean;
}>;
/** Opacity transition length; the CSS rule and the rail's shortest glide must respect it. */
export const CAPTION_FADE_MS = 240;
export const ANNOUNCEMENT_SEPARATOR = ' · ';
export const EMPTY_CAPTION = {
  text: '',
  visible: false,
  stopId: null,
  title: '',
  announcement: '',
} as const satisfies CaptionView;
export const formatAnnouncement = (stop: CaptionStop): string =>
  `${stop.id}${ANNOUNCEMENT_SEPARATOR}${stop.caption}`;
const assertStop = (stop: CaptionStop, where: string): CaptionStop => {
  if (stop.id === '' || stop.caption === '') {
    throw new Error(`captions: ${where} has an empty id or caption`);
  }
  return stop;
};
const restStop = (input: CaptionInput): CaptionStop => {
  const { stops, stopIndex } = input;
  if (stops.length === 0) throw new Error('captions: node without stops');
  if (!Number.isInteger(stopIndex)) {
    throw new Error(`captions: stop index ${stopIndex} is not an integer`);
  }
  const stop = stops[stopIndex];
  if (stop === undefined) {
    throw new Error(`captions: stop index ${stopIndex} outside 0..${stops.length - 1}`);
  }
  return assertStop(stop, `stop ${stopIndex}`);
};
const shown = (stop: CaptionStop): CaptionView => ({
  text: stop.caption,
  visible: true,
  stopId: stop.id,
  title: '',
  announcement: formatAnnouncement(stop),
});
/** Hidden, holding the previous text; a first frame borrows the rest stop so it never blanks. */
const hidden = (prev: CaptionView, fallback: CaptionStop): CaptionView => {
  const fresh = prev.text === '';
  return {
    text: fresh ? fallback.caption : prev.text,
    visible: false,
    stopId: fresh ? fallback.id : prev.stopId,
    title: '',
    announcement: prev.announcement,
  };
};
export const presentCaption = (prev: CaptionView, input: CaptionInput): CaptionView => {
  const rest = restStop(input);
  if (input.dwell !== null) {
    const stop = shown(assertStop(input.dwell, 'dwell stop'));
    return { ...stop, title: input.dwellTitle ?? '' };
  }
  if (input.suppressed || input.gliding) return { ...hidden(prev, rest), title: '' };
  return shown(rest);
};
export const captionChanges = (prev: CaptionView, next: CaptionView): CaptionChanges => ({
  text: prev.text !== next.text,
  visible: prev.visible !== next.visible,
  stopId: prev.stopId !== next.stopId,
  title: prev.title !== next.title,
  announcement: prev.announcement !== next.announcement,
});
