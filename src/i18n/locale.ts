// src/i18n/locale.ts
/**
 * Language law (design-i18n-notes.md §1.1, §1.2; decisions.md DEC-020; R2).
 *
 * Resolution, stated once: a valid `lang=` in the hash query → the persisted override
 * (`zimny:lang`) → 'ru'. Invalid values are ignored, never thrown on (the URL is not
 * committed data). The URL wins and is written into the override; the override is cleared
 * only when the stored value is not a language. Under det the override is neither read nor
 * written, `lang=` still works, otherwise 'ru'. Nothing is seeded from the browser's own
 * language preference. The host reads the hash and the storage key and applies the
 * OverrideWrite directive — this module touches neither.
 *
 * The ?q= lifecycle, mirrored verbatim from the tier (main.ts boot vs hashchange): at a
 * fresh load a URL without the parameter falls back to the stored override, but a
 * HASHCHANGE navigation without it resets to the default and CLEARS the override (the URL
 * is the per-navigation truth; the tier's persistTier('auto') does the same). The toggle
 * therefore writes lang= into the hash-query AND the storage itself (replaceState fires no
 * hashchange) — §1.2.
 *
 * Loading: EN is static (the fallback column ships in the main chunk); RU rides a lazy
 * chunk — the dynamic import below is the only reference to ./ru in the codebase. Because
 * RU is the default, the host awaits activateLang() before its first text render.
 *
 * Switching: activateLang() installs the dictionary and, when the language actually
 * changed, notifies the host's listeners; a switch superseded by a later one is dropped
 * without installing. The host re-renders the pages and html lang / title / description.
 */

import { en } from './en';
import { activeLang, installDictionary } from './index';
import type { Dictionary } from './keys';

export const LANGS = ['ru', 'en'] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'ru';
export const LANG_QUERY_PARAM = 'lang';
export const LANG_STORAGE_KEY = 'zimny:lang';

export function isLang(value: string | null): value is Lang {
  return value !== null && LANGS.some((lang) => lang === value);
}

export function toggleTarget(lang: Lang): Lang {
  return lang === 'ru' ? 'en' : 'ru';
}

export type LangSource = 'query' | 'override' | 'default';

export type OverrideWrite =
  | { readonly kind: 'write'; readonly lang: Lang }
  | { readonly kind: 'clear' }
  | { readonly kind: 'keep' };

export interface LangResolutionInput {
  readonly queryLang: string | null;
  readonly storedLang: string | null;
  readonly det: boolean;
  /** True on a hashchange navigation: a URL without lang= resets to the default and clears
   * the override (the tier's persistTier('auto') mirror). Fresh loads pass false. */
  readonly navigation: boolean;
}

export interface LangResolution {
  readonly lang: Lang;
  readonly source: LangSource;
  readonly override: OverrideWrite;
}

const KEEP: OverrideWrite = { kind: 'keep' };
const CLEAR: OverrideWrite = { kind: 'clear' };

export function resolveLang(input: LangResolutionInput): LangResolution {
  if (isLang(input.queryLang)) {
    const lang = input.queryLang;
    return { lang, source: 'query', override: input.det ? KEEP : { kind: 'write', lang } };
  }
  if (input.det) return { lang: DEFAULT_LANG, source: 'default', override: KEEP };
  if (input.navigation) return { lang: DEFAULT_LANG, source: 'default', override: CLEAR };
  if (isLang(input.storedLang)) {
    return { lang: input.storedLang, source: 'override', override: KEEP };
  }
  return {
    lang: DEFAULT_LANG,
    source: 'default',
    override: input.storedLang === null ? KEEP : CLEAR,
  };
}

let ruChunk: Promise<Dictionary> | null = null;

function loadRu(): Promise<Dictionary> {
  if (ruChunk === null) {
    ruChunk = import('./ru').then(
      (chunk) => chunk.ru,
      (error: unknown) => {
        ruChunk = null;
        throw error;
      },
    );
  }
  return ruChunk;
}

export function ensureDictionary(lang: Lang): Promise<Dictionary> {
  return lang === 'en' ? Promise.resolve(en) : loadRu();
}

export type LangListener = (lang: Lang) => void;

const listeners = new Set<LangListener>();

export function onLangChange(listener: LangListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The consumers' single import surface for the language API (the accessor state re-exports
// here; installDictionary stays internal to this module).
export { activeLang };

let switchSeq = 0;

export async function activateLang(lang: Lang): Promise<boolean> {
  switchSeq += 1;
  const seq = switchSeq;
  const dictionary = await ensureDictionary(lang);
  if (seq !== switchSeq) return false;
  const changed = activeLang() !== lang;
  installDictionary(lang, dictionary);
  if (changed) {
    for (const listener of listeners) listener(lang);
  }
  return true;
}
