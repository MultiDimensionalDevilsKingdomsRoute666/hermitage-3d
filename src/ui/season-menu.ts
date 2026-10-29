// The season menu (DEC-036, the r16 disposition blocks 1–2): the native select's
// UA-painted popup is retired — three Windows engines paint that popup from UA color
// providers that no gate in the loop reaches (the dev machine is macOS, CI is Ubuntu), so
// the control moved in-page. The closed face stays the clock-row button (style.css
// #season); this module owns the open face: a plain in-page listbox under the clock row
// that borrows the room menu's row voice and keyboard law (src/ui/index-dialog.ts)
// without its modality — no <dialog>, no backdrop, no centering, no Chromium Tab-wrap
// hand-finish (not modal; the browser's own tab order proceeds).
//
// State law (DEC-034 unchanged): the value is never stored. aria-selected and the button
// label are re-derived by the host's sync on every open and after every commit and hash
// change; rows commit a DATE through the host's commit path (the same at= transaction the
// select's change handler used) — they never navigate, and the R15 grouping holds (the
// season stays beside the time it edits, never inside the room menu).
//
// Keyboard law: ArrowDown/ArrowUp wrap (room-index's nextIndex, the room menu's law),
// Home/End step to the boundary, Enter/Space (or a click) commit the focused option,
// Escape closes without a commit, Tab/Shift+Tab closes with the module silent (no
// preventDefault, no refocus — the default tab move must not fight the module). The open
// list stops propagation on the keys it handles, so the rail's and the scrub's shortcut
// handlers never fire while the menu is open. Dismissal: a pointerdown outside the
// button/list (capture), a focusout to outside, or a language swap (closeIfOpen).
import { isSeasonId, type SeasonId } from '../sky/season';
import { nextIndex } from './room-index';

export interface SeasonMenuDeps {
  button: HTMLButtonElement;
  list: HTMLUListElement;
  /** Re-derives the button label and every row's aria-selected from the committed time state. */
  sync: () => void;
  /** Commits a choice through the host's law: return-to-now or the season transaction. */
  commit: (choice: 'now' | SeasonId) => void;
}

export interface SeasonMenu {
  /** Closes the menu when it is open (the language-swap law); a no-op otherwise. */
  closeIfOpen(): void;
}

export const createSeasonMenu = (deps: SeasonMenuDeps): SeasonMenu => {
  const { button, list } = deps;

  const rows = (): HTMLElement[] => Array.from(list.querySelectorAll<HTMLElement>('[data-season]'));

  const rowFor = (value: string): HTMLElement | null => {
    for (const row of rows()) if (row.dataset.season === value) return row;
    return null;
  };

  const close = (refocus: boolean): void => {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  };

  const commitValue = (row: HTMLElement): void => {
    const id = row.dataset.season;
    if (id === undefined) throw new Error('season row without data-season'); // markup law
    close(true);
    if (id === 'now') {
      deps.commit('now');
      return;
    }
    if (isSeasonId(id)) {
      deps.commit(id);
      return;
    }
    throw new Error(`unknown season row "${id}"`); // loud: a markup bug, not a runtime state
  };

  const open = (): void => {
    deps.sync();
    button.setAttribute('aria-expanded', 'true');
    list.hidden = false;
    const selected = rows().find((row) => row.getAttribute('aria-selected') === 'true');
    (selected ?? rowFor('now') ?? rows()[0])?.focus();
  };

  button.addEventListener('click', () => {
    if (list.hidden) open();
    else close(false);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open();
  });

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute('data-season')) commitValue(target);
  });
  list.addEventListener('keydown', (event) => {
    const authored = document.activeElement;
    if (!(authored instanceof HTMLElement) || !authored.hasAttribute('data-season')) return;
    const all = rows();
    const from = all.indexOf(authored);
    if (from === -1) return;
    const command = event.key;
    if (command === 'ArrowDown' || command === 'ArrowUp') {
      event.preventDefault();
      all[nextIndex(all.length, from, command === 'ArrowDown' ? 1 : -1)]?.focus();
    } else if (command === 'Home') {
      event.preventDefault();
      all[0]?.focus();
    } else if (command === 'End') {
      event.preventDefault();
      all[all.length - 1]?.focus();
    } else if (command === 'Enter' || command === ' ') {
      event.preventDefault();
      commitValue(authored);
    } else if (command === 'Escape') {
      event.preventDefault();
      close(true);
    } else {
      return; // Tab and everything else ride the browser's default (the focusout closes)
    }
    event.stopPropagation(); // the rail's/scrub's shortcut handlers never fire while open
  });

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (list.hidden) return;
      const target = event.target;
      if (target instanceof Node && !button.contains(target) && !list.contains(target)) {
        close(false);
      }
    },
    { capture: true },
  );
  const onFocusout = (event: FocusEvent): void => {
    if (list.hidden) return;
    const to = event.relatedTarget;
    if (!(to instanceof Node) || (!button.contains(to) && !list.contains(to))) close(false);
  };
  button.addEventListener('focusout', onFocusout);
  list.addEventListener('focusout', onFocusout);

  return {
    closeIfOpen: (): void => {
      if (!list.hidden) close(false);
    },
  };
};
