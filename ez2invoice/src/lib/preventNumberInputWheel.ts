import type { WheelEvent as ReactWheelEvent } from 'react';

function isFocusedNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'number' &&
    document.activeElement === target
  );
}

/** Native wheel handler for document-level guards. Requires passive: false. */
export function handleNumberInputWheelNative(event: WheelEvent): void {
  if (isFocusedNumberInput(event.target)) {
    event.preventDefault();
  }
}

/**
 * Prevent mouse wheel from changing a focused number input.
 * Typing and spinner arrows still work normally.
 */
export function preventNumberInputWheelChange(
  event: ReactWheelEvent<HTMLInputElement>
): void {
  event.preventDefault();
  event.stopPropagation();
}
