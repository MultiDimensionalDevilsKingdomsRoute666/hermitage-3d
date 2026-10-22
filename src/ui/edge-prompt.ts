// src/ui/edge-prompt.ts
/**
 * The boundary prompt law (the owner's reachability report, 2026-10-21): a rail
 * end whose airlock side is next is invisible today — a trackpad visitor stalls
 * at a door. The prompt names the door's affordance: one chrome line, keyed by
 * the language law (chrome.edgePrompt), visible while settled at a rail end
 * with an airlock side to enter, gone everywhere else and during every transit.
 * Pure over the host's per-frame facts; the host owns the node, the timer-less
 * fade (the chrome's exit is the caption's 240 ms law) and the click:
 * activating it travels through the same boundary step the arrows use.
 * UI-nearly-absent law: it never shows mid-room, never stacks a second line,
 * and it is hidden from the golden fixtures with the other chrome overlays.
 * The railBoundary() contract main.ts feeds already codes "an airlock side
 * exists there" into a non-null boundary — no separate target boolean.
 */

export interface EdgePromptInput {
  /** The arrival beats own the pre-settle frames; a transit owns the camera. */
  readonly settled: boolean;
  /** The rail end passed: 'forward' (the deeper hall) or 'backward' (home). */
  readonly boundary: 'backward' | 'forward' | null;
}

export interface EdgePromptView {
  readonly visible: boolean;
}

export function edgePromptView(input: EdgePromptInput): EdgePromptView {
  return { visible: Boolean(input.settled && input.boundary !== null) };
}
