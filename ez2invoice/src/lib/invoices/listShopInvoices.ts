import type { SupabaseClient } from '@supabase/supabase-js';

/** PostgREST returns at most 1000 rows unless range() is used. */
export const INVOICE_FETCH_PAGE_SIZE = 1000;

export type InvoiceShopScope = {
  shopId: string | null;
  isFounder: boolean;
};

function applyShopScope<T extends { or: (filters: string) => T; eq: (column: string, value: string) => T }>(
  query: T,
  shopId: string | null,
  isFounder: boolean
): T {
  if (!shopId) return query;
  if (isFounder) {
    return query.or(`shop_id.eq.${shopId},shop_id.is.null`);
  }
  return query.eq('shop_id', shopId);
}

export async function fetchAllPagedRows<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }>
): Promise<{ data: T[]; error: { message?: string; code?: string } | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + INVOICE_FETCH_PAGE_SIZE - 1;
    const { data, error } = await loadPage(from, to);
    if (error) return { data: [], error };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < INVOICE_FETCH_PAGE_SIZE) break;
    from += INVOICE_FETCH_PAGE_SIZE;
  }
  return { data: rows, error: null };
}

export async function fetchShopInvoicesFromBalancesView(
  supabase: SupabaseClient,
  options: InvoiceShopScope & { sortDir?: 'asc' | 'desc' }
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  const ascending = (options.sortDir ?? 'desc') === 'asc';
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('invoice_balances_v')
      .select('*')
      .order('invoice_number_numeric', { ascending })
      .order('created_at', { ascending })
      .range(from, to);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error };
  });
}

export async function fetchShopInvoicesFallback(
  supabase: SupabaseClient,
  options: InvoiceShopScope & { sortDir?: 'asc' | 'desc' }
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  const ascending = (options.sortDir ?? 'desc') === 'asc';
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('invoices')
      .select('*, customer:customers(id, first_name, last_name, email, phone, company)')
      .order('invoice_number', { ascending })
      .order('created_at', { ascending })
      .range(from, to);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error };
  });
}

export async function fetchCustomersByIds(
  supabase: SupabaseClient,
  customerIds: string[],
  chunkSize = 200
): Promise<Record<string, { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null; company?: string | null }>> {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  const map: Record<string, { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null; company?: string | null }> = {};
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone, company')
      .in('id', chunk);
    for (const customer of data || []) {
      map[String((customer as { id: string }).id)] = customer as typeof map[string];
    }
  }
  return map;
}
