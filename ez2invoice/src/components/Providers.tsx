'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { FounderProvider } from '@/contexts/FounderContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FounderProvider>
        {children}
      </FounderProvider>
    </AuthProvider>
  );
}

