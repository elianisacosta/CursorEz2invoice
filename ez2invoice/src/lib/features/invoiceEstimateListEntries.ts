import { normalizePhoneForLookup } from '@/lib/customers/phoneNumber';

export type InvoiceListDocumentKind = 'invoice' | 'estimate';

export interface InvoiceListDocumentEntry<TInvoice, TEstimate> {
  kind: InvoiceListDocumentKind;
  data: TInvoice | TEstimate;
}

export type EstimateListStatusLabel =
  | 'Draft'
  | 'Sent'
  | 'Accepted'
  | 'Denied'
  | 'Expired'
  | string;

export function getEstimateListStatusLabel(status: string | null | undefined): EstimateListStatusLabel {
  const normalized = (status || 'draft').toLowerCase();
  switch (normalized) {
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Denied';
    case 'expired':
      return 'Expired';
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

export function getEstimateListStatusColors(status: string | null | undefined): string {
  const normalized = (status || 'draft').toLowerCase();
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-yellow-100 text-yellow-800',
  };
  return colors[normalized] || 'bg-gray-100 text-gray-800';
}

export function formatEstimateDocumentNumber(
  estimateNumber: string | null | undefined,
  fallbackId: string
): string {
  if (estimateNumber) return estimateNumber;
  return `EST-${fallbackId.slice(0, 8)}`;
}

interface EstimateCustomerLike {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function getEstimateCustomerName(
  customer: EstimateCustomerLike | null | undefined
): string {
  if (!customer) return 'No Customer';
  const individual = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
  return individual || customer.company || 'Unknown';
}

export function estimateMatchesInvoiceListSearch<
  TEstimate extends {
    id: string;
    estimate_number?: string | null;
    notes?: string | null;
    customer?: EstimateCustomerLike | null;
  }
>(estimate: TEstimate, searchQuery: string): boolean {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return true;

  const number = formatEstimateDocumentNumber(estimate.estimate_number, estimate.id).toLowerCase();
  if (number.includes(q)) return true;
  if ((estimate.estimate_number || '').toString().toLowerCase().includes(q)) return true;
  if (estimate.id.toLowerCase().includes(q)) return true;

  const customer = estimate.customer;
  if (customer) {
    const name = getEstimateCustomerName(customer).toLowerCase();
    if (name.includes(q)) return true;
    if ((customer.first_name || '').toLowerCase().includes(q)) return true;
    if ((customer.last_name || '').toLowerCase().includes(q)) return true;
    if ((customer.company || '').toLowerCase().includes(q)) return true;
    if ((customer.email || '').toLowerCase().includes(q)) return true;
    if (customer.phone) {
      const normalizedPhone = normalizePhoneForLookup(String(customer.phone));
      const normalizedSearch = normalizePhoneForLookup(q);
      if (
        normalizedSearch.length >= 3 &&
        (normalizedPhone.includes(normalizedSearch) || normalizedSearch.includes(normalizedPhone))
      ) {
        return true;
      }
    }
  }

  if ((estimate.notes || '').toLowerCase().includes(q)) return true;
  return false;
}

export function buildCombinedInvoiceEstimateList<TInvoice extends { created_at?: string }, TEstimate extends { created_at?: string }>(
  invoices: TInvoice[],
  estimates: TEstimate[]
): Array<InvoiceListDocumentEntry<TInvoice, TEstimate>> {
  const entries: Array<InvoiceListDocumentEntry<TInvoice, TEstimate>> = [
    ...invoices.map((data) => ({ kind: 'invoice' as const, data })),
    ...estimates.map((data) => ({ kind: 'estimate' as const, data })),
  ];

  entries.sort((a, b) => {
    const aTime = a.data.created_at ? new Date(a.data.created_at).getTime() : 0;
    const bTime = b.data.created_at ? new Date(b.data.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return entries;
}
