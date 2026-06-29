/**
 * Feature flag: Invoices tab + Estimates integration.
 *
 * Enable for all users: set NEXT_PUBLIC_FEATURE_INVOICES_ESTIMATES_INTEGRATION=true
 * Founder local override (browser console): localStorage.setItem('ez2invoice_feature_invoices_estimates_integration', 'true'|'false')
 * Development: enabled automatically for founder when env var is unset.
 */
const STORAGE_KEY = 'ez2invoice_feature_invoices_estimates_integration';

export function isInvoicesEstimatesIntegrationEnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_INVOICES_ESTIMATES_INTEGRATION === 'true';
}

export function readInvoicesEstimatesIntegrationLocalOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function isInvoicesEstimatesIntegrationEnabled(isFounder: boolean): boolean {
  const override = readInvoicesEstimatesIntegrationLocalOverride();
  if (override !== null) return override;
  if (isInvoicesEstimatesIntegrationEnvEnabled()) return true;
  if (isFounder && process.env.NODE_ENV === 'development') return true;
  return false;
}

export function shouldShowEstimatesNavTab(
  isFounder: boolean,
  integrationEnabled: boolean
): boolean {
  if (!integrationEnabled) return true;
  return isFounder;
}
