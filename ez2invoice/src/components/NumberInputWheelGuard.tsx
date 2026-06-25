'use client';

import { useEffect } from 'react';
import { handleNumberInputWheelNative } from '@/lib/preventNumberInputWheel';

/** Blocks mouse-wheel value changes on every focused number input in the app. */
export function NumberInputWheelGuard() {
  useEffect(() => {
    document.addEventListener('wheel', handleNumberInputWheelNative, {
      capture: true,
      passive: false,
    });
    return () => {
      document.removeEventListener('wheel', handleNumberInputWheelNative, {
        capture: true,
      });
    };
  }, []);

  return null;
}
