// src/i18n/index.ts
/**
 * The dictionary accessor. Implements the adopted i18n/notes design: "Strings live in a
 * typed dictionary with identical key sets". Round-24b law: the EN column IS the committed
 * tree's bytes, so t() is a plain lookup; the round-25 runtime swaps the internals for the
 * lang-aware resolution (?lang= URL → the persisted override → RU) without touching callsites.
 */

import { en } from './en';
import type { Key } from './keys';

export type { Dictionary, Key } from './keys';
export { en };

export const t = (key: Key): string => en[key];
