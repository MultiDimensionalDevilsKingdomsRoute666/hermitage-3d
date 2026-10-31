// docs/design-mobile-tier.md §§4–5: injected facts only; the host owns input and layout.
export const TOUCH_BUTTON_MIN_INLINE_PX = 72;
export const TOUCH_BUTTON_MIN_BLOCK_PX = 44;
export const TOUCH_RAIL_GAP_PX = 8;
export const TOUCH_RAIL_INSET_PX = 24;
export const TOUCH_RAIL_CLEARANCE_PX = 16;
export const TOUCH_RAIL_MAX_WIDTH_PX = 767.98;

export function touchRailVisible(
  f: Readonly<{ coarsePointer: boolean; widthCssPx: number }>,
): boolean {
  return f.coarsePointer || f.widthCssPx <= TOUCH_RAIL_MAX_WIDTH_PX;
}

export function admitTouchTravel(
  f: Readonly<{
    settled: boolean;
    transitNull: boolean;
    glideNull: boolean;
    canvasGestureFree: boolean;
    menuOwningInput: boolean;
  }>,
): 'accept' | 'drop' {
  // Deliberately stricter than arrows: their mid-glide retargeting remains unchanged.
  return f.settled && f.transitNull && f.glideNull && f.canvasGestureFree && !f.menuOwningInput
    ? 'accept'
    : 'drop';
}

export function admitTouchKey(
  f: Readonly<{ repeat: boolean; accepted: boolean }>,
): 'accept' | 'drop' {
  return !f.repeat && !f.accepted ? 'accept' : 'drop';
}

export function canvasContact(
  f: Readonly<{
    primaryDown: boolean;
    secondContactShadowed: boolean;
    reArmableAfterSequenceEnd: boolean;
  }>,
): 'admit' | 'cancel' | 'drop' | 'rearm' {
  if (f.reArmableAfterSequenceEnd) return 'rearm';
  if (f.secondContactShadowed) return 'cancel';
  return f.primaryDown ? 'admit' : 'drop';
}
