import type { WheelEvent } from 'react';

/**
 * Blur on wheel so scrolling the page does not change the value.
 * Typing and spinner arrows still work normally.
 */
export function preventNumberInputWheelChange(
  event: WheelEvent<HTMLInputElement>
): void {
  event.currentTarget.blur();
}
