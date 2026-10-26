// src/ui/index-dialog.ts
/**
 * Room index dialog (design-gallery §6.3, §6.4): a native <dialog> — focus trap, Escape,
 * backdrop for free — listing the registry's built rooms in route order. Rows re-derive
 * from ENTRIES on every open (the registry is the index); the current room is marked
 * aria-current. The jump hands the route to the host, which writes the hash — one code
 * path for URL entry and index entry (§6.4). Impure by design (DOM wiring).
 */
import { ENTRIES } from '../../rooms/index';
import type { Key } from '../i18n/keys';
import type { NodeHandle } from '../world/registry';
import { indexLabel, indexRows, nextIndex } from './room-index';

export type IndexDialogDeps = Readonly<{
  button: HTMLButtonElement;
  dialog: HTMLDialogElement;
  list: HTMLElement;
  t: (key: Key) => string;
  activeNode: () => NodeHandle | null;
  jump: (route: string) => void;
}>;

export function bindIndexDialog(deps: IndexDialogDeps): void {
  const { button, dialog, list, t, activeNode, jump } = deps;

  const render = (): readonly HTMLButtonElement[] => {
    list.replaceChildren();
    const buttons: HTMLButtonElement[] = [];
    for (const row of indexRows(ENTRIES, activeNode())) {
      const li = document.createElement('li');
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.textContent = indexLabel(t(row.titleKey));
      if (row.current) {
        entry.setAttribute('aria-current', 'true');
        entry.setAttribute('aria-label', `${entry.textContent}, ${t('index.current')}`);
      }
      entry.addEventListener('click', () => {
        dialog.close();
        if (!row.current) jump(row.route);
      });
      li.append(entry);
      list.append(li);
      buttons.push(entry);
    }
    return buttons;
  };

  button.addEventListener('click', () => {
    const buttons = render();
    dialog.showModal();
    // Focus lands on the current room's entry (the first row otherwise).
    const current = buttons.findIndex((b) => b.getAttribute('aria-current') === 'true');
    buttons[current >= 0 ? current : 0]?.focus();
  });

  // §6.4: arrows move (wrapping, the pure law), Enter jumps (the click), Escape closes
  // (the native cancel) — and no key reaches the rail: the host's document-level arrow
  // handler bails while the dialog is open.
  list.addEventListener('keydown', (event: KeyboardEvent) => {
    // The native modal trap has a measured gap in Chromium: Tab from the dialog's LAST
    // focusable drops focus to the document body (the §6.3 "focus trap for free" holds
    // for the inert background, not for the wrap edge) — the wrap is finished by hand.
    if (event.key === 'Tab') {
      const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
      const focused = document.activeElement;
      const from = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
      const toStart = from === buttons.length - 1 && !event.shiftKey;
      const toEnd = from === 0 && event.shiftKey;
      if (!toStart && !toEnd) return;
      event.preventDefault();
      (toStart ? buttons[0] : buttons[buttons.length - 1])?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
    const focused = document.activeElement;
    const from = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
    if (from < 0) return;
    event.preventDefault();
    const to = nextIndex(buttons.length, from, event.key === 'ArrowDown' ? 1 : -1);
    buttons[to]?.focus();
  });

  // §6.4: focus returns to the button on every close (Escape, a jump, a backdrop click).
  dialog.addEventListener('close', () => {
    button.focus();
  });
  // The native idiom §6.3's "backdrop for free" gestures at: a click on the backdrop (or
  // the dialog's own dead padding — the target is the dialog element either way) closes.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
