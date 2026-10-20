// src/i18n/index.ts
/**
 * Dictionary accessor (design-i18n-notes.md §1.1, §1.3; R2).
 *
 * State law, stated once:
 * - exactly one dictionary is active at a time; the module boots on the static EN column so
 *   t() is total from the first import and EN never needs a chunk;
 * - RU is the default language (DEC-020) and rides a lazy chunk, so the host awaits
 *   locale.activateLang() before its first text render — the RU default never flashes EN;
 * - installDictionary() is the only mutation; locale.ts is its only caller and the only
 *   place that notifies the host about a switch.
 */

import { en } from './en';
import type { Dictionary, Key } from './keys';
import type { Lang } from './locale';

interface ActiveDictionary {
  readonly lang: Lang;
  readonly dictionary: Dictionary;
}

let active: ActiveDictionary = { lang: 'en', dictionary: en };

export function t(key: Key): string {
  return active.dictionary[key];
}

export function activeLang(): Lang {
  return active.lang;
}

export function installDictionary(lang: Lang, dictionary: Dictionary): void {
  active = { lang, dictionary };
}

export type { Dictionary, Key } from './keys';
export { en };
