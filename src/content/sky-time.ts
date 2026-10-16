// Immutable Phase 0 configuration — src/content/sky-time.ts
// Contract: docs/design-sky-time.md §3, §7. No three.js imports, no clock
// reads, no browser globals; importable from node tests as-is.

export type Rgb3 = readonly [number, number, number];

export const SITE = {
  latitudeDeg: 59.9398,
  longitudeDeg: 30.3146,
  timeZoneLabel: 'Europe/Moscow',
  utcOffsetMinutes: 180,
} as const;

export const TIME = {
  minEpochMs: -2177452800000,
  maxEpochMsExclusive: 4102444800000,
  minuteMs: 60000,
  scrubRadiusMs: 86400000,
  liveSamplePeriodMs: 1000,
  maxFragmentLength: 4096,
  maxAtLength: 64,
} as const;

export const EXPOSURE = {
  lowElevationDeg: -6.6,
  highElevationDeg: 15,
  low: 0.55,
  high: 1.0,
} as const;

export const BLEND = {
  nightEndDeg: -8,
  duskStartDeg: -7,
  duskEndDeg: -4,
  dayStartDeg: 10,
} as const;

export const ARRIVAL = {
  titleHoldMs: 240,
  massingFadeMs: 600,
} as const;

export const DETERMINISTIC_SEED = 0x5a494d4e;

export const SKY_RESERVATION = {
  drawCalls: 1,
  triangles: 1,
  customShaderMaterials: 1,
  ownedTextureBytes: 0,
} as const;

// Scene-linear sky palette (not sRGB hex) — design-sky-time.md §7.
export const PALETTE = {
  night: [0.0015, 0.003, 0.01] as Rgb3,
  twilightZenith: [0.018, 0.039, 0.105] as Rgb3,
  dayZenith: [0.14, 0.3, 0.56] as Rgb3,
  dayHorizon: [0.58, 0.7, 0.8] as Rgb3,
  warmHorizon: [0.48, 0.28, 0.17] as Rgb3,
};

export const DAYLIGHT_SUN_INTENSITY_MAX = 3;
