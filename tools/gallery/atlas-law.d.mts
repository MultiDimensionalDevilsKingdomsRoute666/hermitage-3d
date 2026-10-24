/** Type declarations for tools/gallery/atlas-law.mjs (the test imports the .mjs; allowJs is off). */
export type Rgb = readonly [number, number, number];
export type SlotRole = 'block' | 'roster' | 'spare' | 'missing';
export interface StandInParams {
  readonly silhouette: number;
  readonly shoulder: number;
  readonly uniform: number;
  readonly facing: number;
  readonly epaulettes: boolean;
  readonly umber: number;
  readonly face: number;
  readonly umberValue: number;
  readonly headOffset: number;
}
export const ATLAS_SIZE_PX: number;
export const ATLAS_COLUMNS: number;
export const ATLAS_ROWS: number;
export const SLOT_W_PX: number;
export const SLOT_H_PX: number;
export const ATLAS_GUTTER_PX: number;
export const ATLAS_INSET_PX: number;
export const SUPER_BLOCK_SLOTS: number;
export const SUPER_BLOCK_COUNT: number;
export const MISSING_SLOT: number;
export const SLOT_COUNT: number;
export const ROSTER_COUNT: number;
export const SALT_1812: string;
export const MONARCH_X_SCALE: number;
export const GUTTER_RGB: Rgb;
export function hash32(salt: string, ...ints: number[]): number;
export function bits(h: number, shift: number, count: number): number;
export function superBlockSlots(block: number): readonly number[];
export function reservedSlotSet(): ReadonlySet<number>;
export function slotRoles(): readonly SlotRole[];
export function rosterSlots(): readonly number[];
export function standInParams(slot: number): StandInParams;
export function paintAtlas(): Uint8Array;
export function encodePng(rgba: Uint8Array, width: number, height: number): Uint8Array;
