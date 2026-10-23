// src/camera/square-rail.ts
/**
 * The square's rail (design-staircase §6.1 — S0 «the facade and the hour», S1 «the arch
 * approach»; design-walkthrough-ux §3 «the gate composition», §12 R-UX3, §8 R-UX5). The square
 * is a resident without a contract, so its stop data lives here; ids follow the design's naming.
 *
 * The square's gaze is authored, not the room pose law: S0 — level with the boot camera, up at
 * the cornice line — is what the noon and white-night goldens pin; S1 (R-UX3, D7) stands back so
 * the gate pavilion composes as architecture and gazes at a point just inside the arch mouth at
 * about two-thirds of the opening's height — the throat's axis. Since R-UX5 both are the stops'
 * SUBJECTS (registry Stop.subject): samplePose reads them from the data, the host feeds nothing.
 * Between S0 and S1 the target point sweeps in world space from the cornice to the arch mouth.
 */
import type { Rail, Vec3 } from '../world/registry';

/** The authored S0 subject (§6.1 «exists today»): the boot pose the goldens pin. */
export const SQUARE_S0_GAZE: Vec3 = [0, 11, 0];
/** The authored S1 subject (R-UX3): inside the mouth (z 93.5), ≈ ⅔ of the 9.55 m opening.
 * From S1 this is 8.7° up: the frame's top edge meets the facade near y 24 (entablature in). */
export const SQUARE_S1_GAZE: Vec3 = [0, 6.6, 92];

export const SQUARE_RAIL = {
  stops: [
    {
      id: 'S0',
      position: [0, 1.7, 230],
      subject: SQUARE_S0_GAZE,
      look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
      caption: 'caption.s0',
    },
    {
      id: 'S1',
      position: [0, 1.7, 124],
      subject: SQUARE_S1_GAZE,
      look: { yaw: 25, pitchUp: 20, pitchDown: 10 },
      caption: 'caption.s1',
    },
  ],
} satisfies Rail;
