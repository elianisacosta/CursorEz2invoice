import type { SupabaseClient } from '@supabase/supabase-js';

/** PostgREST returns at most 1000 rows unless range() is used. */
export const CUSTOMER_STATS_PAGE_SIZE = 1000;

type CustomerShopScope = {
  shopId: string | null;
  isFounder: boolean;
};

function applyCustomerShopScope<T extends { or: (filters: string) => T; eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(
  query: T,
  shopId: string | null,
  isFounder: boolean
): T {
  if (shopId) {
    if (isFounder) {
      return query.or(`shop_id.eq.${shopId},shop_id.is.null`);
    }
    return query.eq('shop_id', shopId);
  }
  if (isFounder) {
    return query.is('shop_id', null);
  }
  return query;
}

export type CustomerActivityStats = {
  visits: number;
  totalSpent: number;
  lastVisitAt: string | null;
};

export type InvoiceActivityRow = {
  customer_id: string | null;
  total_amount?: number | string | null;
  created_at?: string | null;
};

export type WorkOrderActivityRow = {
  customer_id: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

function asCustomerId(value: string | null | undefined): string | null {
  if (!value) return null;
  const id = String(value);
  return id || null;
}

function asAmount(value: number | string | null | undefined): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function laterTimestamp(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

export function emptyCustomerActivityStats(): CustomerActivityStats {
  return { visits: 0, totalSpent: 0, lastVisitAt: null };
}

/**
 * Visits / Total Spent / Last Visit for specific customer IDs.
 * Each customer_id is counted independently. Similar names/phones never share stats.
 */
export function computeCustomerActivityStats(
  customerIds: string[],
  invoices: InvoiceActivityRow[],
  workOrders: WorkOrderActivityRow[]
): Record<string, CustomerActivityStats> {
  const invoiceCount = new Map<string, number>();
  const invoiceSpent = new Map<string, number>();
  const invoiceLast = new Map<string, string | null>();
  const workOrderCount = new Map<string, number>();
  const workOrderLast = new Map<string, string | null>();

  for (const invoice of invoices) {
    const customerId = asCustomerId(invoice.customer_id);
    if (!customerId) continue;
    invoiceCount.set(customerId, (invoiceCount.get(customerId) || 0) + 1);
    invoiceSpent.set(customerId, (invoiceSpent.get(customerId) || 0) + asAmount(invoice.total_amount));
    invoiceLast.set(customerId, laterTimestamp(invoiceLast.get(customerId) || null, invoice.created_at || null));
  }

  for (const workOrder of workOrders) {
    const customerId = asCustomerId(workOrder.customer_id);
    if (!customerId) continue;
    workOrderCount.set(customerId, (workOrderCount.get(customerId) || 0) + 1);
    const visitAt = workOrder.completed_at || workOrder.created_at || null;
    workOrderLast.set(customerId, laterTimestamp(workOrderLast.get(customerId) || null, visitAt));
  }

  const map: Record<string, CustomerActivityStats> = {};
  for (const rawId of customerIds) {
    const customerId = asCustomerId(rawId);
    if (!customerId) continue;
    const invoicesForCustomer = invoiceCount.get(customerId) || 0;
    const workOrdersForCustomer = workOrderCount.get(customerId) || 0;
    map[customerId] = {
      visits: Math.max(invoicesForCustomer, workOrdersForCustomer),
      totalSpent: invoiceSpent.get(customerId) || 0,
      lastVisitAt: laterTimestamp(invoiceLast.get(customerId) || null, workOrderLast.get(customerId) || null),
    };
  }
  return map;
}

export function sumCustomerActivityStats(
  statsMap: Record<string, CustomerActivityStats>
): { totalRevenue: number; totalVisits: number } {
  let totalRevenue = 0;
  let totalVisits = 0;
  for (const stats of Object.values(statsMap)) {
    totalRevenue += stats.totalSpent;
    totalVisits += stats.visits;
  }
  return { totalRevenue, totalVisits };
}

async function fetchAllActivityPages<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }>
): Promise<{ data: T[]; error: { message?: string; code?: string } | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + CUSTOMER_STATS_PAGE_SIZE - 1;
    const { data, error } = await loadPage(from, to);
    if (error) return { data: [], error: { message: error.message, code: error.code } };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < CUSTOMER_STATS_PAGE_SIZE) break;
    from += CUSTOMER_STATS_PAGE_SIZE;
  }
  return { data: rows, error: null };
}

/**
 * Load complete invoice + work-order history for the given customer IDs.
 * Paginates past the 1000-row PostgREST cap. Does not mutate customer rows.
 */
export async function loadCustomerActivityStats(
  supabase: SupabaseClient,
  options: CustomerShopScope & { customerIds: string[] }
): Promise<{
  data: Record<string, CustomerActivityStats>;
  error: { message?: string; code?: string } | null;
}> {
  const customerIds = [...new Set(options.customerIds.map((id) => String(id)).filter(Boolean))];
  if (customerIds.length === 0) {
    return { data: {}, error: null };
  }

  const invoiceResult = await fetchAllActivityPages<InvoiceActivityRow>(async (from, to) => {
    let query = supabase
      .from('invoices')
      .select('customer_id, total_amount, created_at')
      .in('customer_id', customerIds)
      .order('id', { ascending: true })
      .range(from, to);
    query = applyCustomerShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as InvoiceActivityRow[], error };
  });
  if (invoiceResult.error) return { data: {}, error: invoiceResult.error };

  const workOrderResult = await fetchAllActivityPages<WorkOrderActivityRow>(async (from, to) => {
    let query = supabase
      .from('work_orders')
      .select('customer_id, created_at, completed_at')
      .in('customer_id', customerIds)
      .order('id', { ascending: true })
      .range(from, to);
    query = applyCustomerShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as WorkOrderActivityRow[], error };
  });
  if (workOrderResult.error) return { data: {}, error: workOrderResult.error };

  return {
    data: computeCustomerActivityStats(customerIds, invoiceResult.data, workOrderResult.data),
    error: null,
  };
}
