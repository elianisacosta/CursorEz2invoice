'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { FounderProvider } from '@/contexts/FounderContext';
import { ToastProvider } from '@/components/ui/ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FounderProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </FounderProvider>
    </AuthProvider>
  );
}

