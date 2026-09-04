import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const visibleFocusableElements = (root) => [...(root?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
  .filter((element) => element.tabIndex >= 0
    && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    && element.getClientRects().length > 0
    && window.getComputedStyle(element).visibility !== 'hidden');

const isTopmostDialog = (root) => {
  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .filter((dialog) => !dialog.hidden && dialog.getAttribute('aria-hidden') !== 'true' && dialog.getClientRects().length > 0);
  return dialogs.at(-1) === root;
};

/**
 * Keep keyboard focus inside the active dialog and return it to the trigger on close.
 * When dialogs are nested, only the topmost dialog responds to keyboard input.
 */
export function useDialogFocus({ active = true, onClose, initialFocus } = {}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const initialFocusRef = useRef(initialFocus);

  useEffect(() => {
    closeRef.current = onClose;
    initialFocusRef.current = initialFocus;
  }, [initialFocus, onClose]);

  useEffect(() => {
    if (!active) return undefined;

    const previouslyFocused = document.activeElement;
    const focusDialog = () => {
      const root = dialogRef.current;
      if (!root || !isTopmostDialog(root)) return;
      const requested = initialFocusRef.current?.();
      const initial = requested
        || root.querySelector('[data-dialog-initial-focus]')
        || visibleFocusableElements(root)[0]
        || root;
      initial?.focus?.({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(focusDialog);

    const handleKeyDown = (event) => {
      const root = dialogRef.current;
      if (!root || !isTopmostDialog(root)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = visibleFocusableElements(root);
      if (!focusable.length) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !root.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event) => {
      const root = dialogRef.current;
      if (root && isTopmostDialog(root) && !root.contains(event.target)) focusDialog();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      if (previouslyFocused?.isConnected) previouslyFocused.focus?.({ preventScroll: true });
    };
  }, [active]);

  return dialogRef;
}

export function handleRovingChoiceKeyDown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const choices = [...event.currentTarget.querySelectorAll('[role="radio"], [role="tab"]')]
    .filter((element) => !element.disabled && element.getAttribute('aria-disabled') !== 'true');
  const currentIndex = choices.indexOf(event.target.closest?.('[role="radio"], [role="tab"]'));
  if (!choices.length || currentIndex < 0) return;

  event.preventDefault();
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? choices.length - 1
      : (currentIndex + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + choices.length) % choices.length;
  choices[nextIndex].focus();
  choices[nextIndex].click();
}
