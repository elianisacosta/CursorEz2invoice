'use client';

import { useEffect, useState } from 'react';
import { isInvoicesEstimatesIntegrationEnabled } from '@/lib/features/invoicesEstimatesIntegration';

export function useInvoicesEstimatesIntegration(isFounder: boolean): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isInvoicesEstimatesIntegrationEnabled(isFounder));
  }, [isFounder]);

  return enabled;
}
