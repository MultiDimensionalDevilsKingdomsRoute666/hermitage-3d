// src/camera/square-rail.ts
/**
 * The square's rail (design-staircase §6.1 — S0 «the facade and the hour», S1 «the arch
 * approach»). The square is a resident without a contract, so its stop data lives here; the
 * values are the §6.1 declared ones, ids follow the design's stop naming (S0/S1 like J0/J4).
 *
 * The square's default gaze is NOT the room pose law: S0's authored framing — level with the
 * boot camera, up at the cornice line — is what the noon and white-night goldens pin, so it is
 * carried here as SQUARE_S0_GAZE and fed to samplePose by the host. S1 gazes into the arch:
 * the host resolves that target to the gallery's entry stop at runtime (no room data lives here).
 */
import type { Rail, Vec3 } from '../world/registry';

export const SQUARE_RAIL = {
  stops: [
    {
      id: 'S0',
      position: [0, 1.7, 230],
      look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
      caption: 'the facade and the hour',
    },
    {
      id: 'S1',
      position: [0, 1.7, 100],
      look: { yaw: 25, pitchUp: 20, pitchDown: 10 },
      caption: 'the arch opens',
    },
  ],
} satisfies Rail;

/** The authored S0 gaze target (§6.1 «exists today»): the boot pose the goldens pin. */
export const SQUARE_S0_GAZE: Vec3 = [0, 11, 0];
