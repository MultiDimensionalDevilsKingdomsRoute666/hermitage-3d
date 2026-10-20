// src/ui/lang-host.ts
// The DOM-side language glue shared by both pages (design-i18n-notes.md §1.1/§1.2): the
// storage access, the hash-query write and the #lang-toggle binding. The pure resolution
// law lives in src/i18n/locale.ts; this module touches the DOM and the storage only.
import { t } from '../i18n';
import {
  activeLang,
  LANG_QUERY_PARAM,
  LANG_STORAGE_KEY,
  type Lang,
  onLangChange,
  toggleTarget,
} from '../i18n/locale';
import { queryOf } from '../sky/time';

export function readStoredLang(): string | null {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null; // no storage — the default governs
  }
}

export function writeStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // No storage — the URL remains the truth.
  }
}

export function clearStoredLang(): void {
  try {
    localStorage.removeItem(LANG_STORAGE_KEY);
  } catch {
    // No storage — nothing to clear.
  }
}

/** The lang= value of the current hash query, or null. */
export function currentQueryLang(): string | null {
  return new URLSearchParams(queryOf(location.hash)).get(LANG_QUERY_PARAM);
}

/** §1.2: the toggle writes lang= into the hash-query (replaceState, no history entry);
 * replaceState fires no hashchange, so the call site activates the language itself. */
export function setLangParam(lang: Lang): void {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const mark = raw.indexOf('?');
  const head = mark === -1 ? raw : raw.slice(0, mark);
  const params = new URLSearchParams(mark === -1 ? '' : raw.slice(mark + 1));
  params.set(LANG_QUERY_PARAM, lang);
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}#${head}?${params.toString()}`,
  );
}

/** Binds #lang-toggle: the visible label is the TARGET language in its own script, the
 * accessible name is the target language's name, the lang attribute pronounces it (§1.2);
 * re-syncs on every switch. Clicks hand the target to the page's onToggle. */
export function bindLangToggle(onToggle: (target: Lang) => void): void {
  const toggle = document.querySelector('#lang-toggle');
  if (!(toggle instanceof HTMLButtonElement)) return;
  const sync = (): void => {
    const target = toggleTarget(activeLang());
    toggle.textContent = t('chrome.toggleLabel');
    toggle.setAttribute('aria-label', t('chrome.toggleAria'));
    toggle.lang = target;
  };
  sync();
  onLangChange(sync);
  toggle.addEventListener('click', () => onToggle(toggleTarget(activeLang())));
}
