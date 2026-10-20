// tests/hint.test.ts
// The travel-hint state machine gates (design-i18n-notes.md §9; src/ui/hint.ts). The law
// is total and pure: events in, view out; the host owns the timers and the DOM.
import { describe, expect, it } from 'vitest';
import {
  createHintState,
  HINT_DISMISS_MS,
  HINT_FADE_MS,
  HINT_HOLD_MS,
  type HintBoot,
  type HintState,
  hintHoldElapsed,
  hintReducedMotion,
  hintSettled,
  hintTravelIntent,
  hintView,
} from '../src/ui/hint';

const boot = (over: Partial<HintBoot> = {}): HintBoot => ({
  mainPage: true,
  initialStopIsStart: true,
  det: false,
  reducedMotion: false,
  ...over,
});

const armed = (over: Partial<HintBoot> = {}): HintState => createHintState(boot(over));

describe('the travel hint law (§9)', () => {
  it('pins the §9 constants', () => {
    expect(HINT_HOLD_MS).toBe(6000);
    expect(HINT_FADE_MS).toBe(1200);
    expect(HINT_DISMISS_MS).toBe(240);
  });
  it('is eligible only on the main page, at the start stop, outside det', () => {
    expect(armed().eligible).toBe(true);
    expect(armed({ mainPage: false }).eligible).toBe(false);
    expect(armed({ initialStopIsStart: false }).eligible).toBe(false);
    expect(armed({ det: true }).eligible).toBe(false);
  });
  it('ineligible boots are gone with dismissed none — nothing is ever shown, no timers', () => {
    for (const over of [
      { mainPage: false },
      { initialStopIsStart: false },
      { det: true },
    ] as const) {
      const state = armed(over);
      expect(state.phase).toBe('gone');
      expect(state.dismissed).toBe('none');
      const settled = hintSettled(state);
      expect(settled.timer).toBeNull();
      expect(hintView(settled.state).visible).toBe(false);
    }
  });
  it('shows at the settle beat and schedules the hold timer once', () => {
    const step = hintSettled(armed());
    expect(step.state.phase).toBe('shown');
    expect(step.timer).toBe('schedule-hold');
    expect(hintView(step.state).visible).toBe(true);
    expect(hintSettled(step.state).timer).toBeNull(); // the settle fires once
  });
  it('travel before the show beat wins: the hint never flashes', () => {
    const travelled = hintTravelIntent(armed()).state;
    expect(travelled.phase).toBe('gone');
    expect(travelled.dismissed).toBe('travel');
    const settled = hintSettled(travelled);
    expect(hintView(settled.state).visible).toBe(false);
    expect(settled.timer).toBeNull();
  });
  it('the first travel intent dismisses with the caption fade and cancels the hold', () => {
    const { state } = hintSettled(armed());
    const step = hintTravelIntent(state);
    expect(step.state.phase).toBe('gone');
    expect(step.state.dismissed).toBe('travel');
    expect(step.timer).toBe('cancel-hold');
    expect(hintView(step.state).exitMs).toBe(HINT_DISMISS_MS);
  });
  it('the hold elapsing dismisses with the slower unprompted fade', () => {
    const { state } = hintSettled(armed());
    const step = hintHoldElapsed(state);
    expect(step.state.phase).toBe('gone');
    expect(step.state.dismissed).toBe('timeout');
    expect(hintView(step.state).exitMs).toBe(HINT_FADE_MS);
    expect(step.timer).toBeNull();
  });
  it('gone is absorbing: no event brings the hint back for the page lifetime', () => {
    const { state: travelled } = hintSettled(armed());
    const afterTravel = hintTravelIntent(travelled).state;
    const lateHold = hintHoldElapsed(afterTravel).state;
    const reSettled = hintSettled(lateHold).state;
    expect(hintView(reSettled).visible).toBe(false);
    expect(hintView(hintTravelIntent(reSettled).state).dismissed).toBe('travel');
  });
  it('reduced motion cuts every exit; the flag change mid-session applies to the view', () => {
    const { state } = hintSettled(armed({ reducedMotion: true }));
    expect(hintView(state).exitMs).toBe(0);
    const step = hintTravelIntent(state);
    expect(hintView(step.state).exitMs).toBe(0);
    // A mid-session change: the state only moves when the flag differs.
    const changed = hintReducedMotion(state, true);
    expect(changed).toBe(state);
    expect(hintReducedMotion(state, false).reducedMotion).toBe(false);
  });
});
