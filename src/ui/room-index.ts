// src/ui/room-index.ts
/**
 * Room index model (design-gallery §6.2, §6.4): the registry IS the index — rows derive
 * from the committed ENTRIES in route order; the bare list label is the R-UX2 door-label
 * law (the sentence title's head before its em dash). Pure: no DOM, no three.
 */
import type { Key } from '../i18n/keys';
import type { NodeHandle, RegistryEntry } from '../world/registry';
import { roomName } from './edge-prompt';

export type IndexRow = Readonly<{
  node: NodeHandle;
  route: string;
  titleKey: Key;
  current: boolean;
}>;

/**
 * Rows in route order: the resident square first, then each built room. Unbuilt rooms
 * cannot appear — they are not in ENTRIES (§6.2: nothing says "coming soon").
 */
export function indexRows(
  entries: readonly RegistryEntry[],
  active: NodeHandle | null,
): readonly IndexRow[] {
  const rows: IndexRow[] = [];
  for (const entry of entries) {
    const titleKey: Key = entry.kind === 'resident' ? 'data.titleSquare' : entry.contract.title;
    rows.push({
      node: entry.id,
      route: entry.route,
      titleKey,
      current: active !== null && active === entry.id,
    });
  }
  return rows;
}

/** The bare list label for a row: the sentence title's head (the R-UX2 door-label law). */
export function indexLabel(title: string): string {
  return roomName(title);
}

/** Arrow navigation: wraps at both ends; -1/+1 only (§6.4 — arrows move, Enter jumps). */
export function nextIndex(count: number, from: number, delta: -1 | 1): number {
  if (count <= 0) return 0;
  return (from + delta + count) % count;
}
