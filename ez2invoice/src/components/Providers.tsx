'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { FounderProvider } from '@/contexts/FounderContext';
import { ShopProvider } from '@/contexts/ShopContext';
import { ToastProvider } from '@/components/ui/ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FounderProvider>
        <ShopProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ShopProvider>
      </FounderProvider>
    </AuthProvider>
  );
}

