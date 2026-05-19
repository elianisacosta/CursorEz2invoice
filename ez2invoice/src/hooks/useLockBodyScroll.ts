'use client';

import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/lockBodyScroll';

/** Locks page scroll while `locked` is true; safe for nested modals (ref-counted). */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}
