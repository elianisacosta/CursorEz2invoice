'use client';

import type { InputHTMLAttributes, WheelEvent } from 'react';
import { preventNumberInputWheelChange } from '@/lib/preventNumberInputWheel';

/** Number input that ignores mouse wheel while focused (spinners and typing still work). */
export function WheelSafeNumberInput({
  onWheel,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...props}
      onWheel={(event: WheelEvent<HTMLInputElement>) => {
        preventNumberInputWheelChange(event);
        onWheel?.(event);
      }}
    />
  );
}
