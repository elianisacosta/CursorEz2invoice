import type { SupabaseClient } from '@supabase/supabase-js';
import {
  POSTGREST_PAGE_SIZE,
  fetchAllPagedRows,
  pageRange,
  type ShopScope,
} from '../postgrestPagination.ts';

/** @deprecated use POSTGREST_PAGE_SIZE */
export const INVOICE_FETCH_PAGE_SIZE = POSTGREST_PAGE_SIZE;

export type InvoiceShopScope = ShopScope;

function applyInvoiceShopScope<
  T extends { or: (filters: string) => T; eq: (column: string, value: string) => T }
>(query: T, shopId: string | null, isFounder: boolean): T {
  if (!shopId) return query;
  if (isFounder) {
    return query.or(`shop_id.eq.${shopId},shop_id.is.null`);
  }
  return query.eq('shop_id', shopId);
}

export type InvoiceListStatusFilter =
  | 'All Status'
  | 'Pending'
  | 'Unpaid'
  | 'Paid'
  | 'Sent'
  | 'Partial'
  | 'Overdue';

export type InvoiceListFilters = InvoiceShopScope & {
  searchTerm?: string;
  statusFilter?: InvoiceListStatusFilter;
  customerIds?: string[];
  sortDir?: 'asc' | 'desc';
};

export const INVOICE_DEFAULT_PAGE_SIZE = 25;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,]/g, '\\$&');
}

export { fetchAllPagedRows };

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
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
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
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error };
  });
}

function applyInvoiceStatusFilter<
  T extends {
    eq: (column: string, value: string | number | boolean) => T;
    or: (filters: string) => T;
    lt: (column: string, value: string) => T;
    gt: (column: string, value: number) => T;
  }
>(query: T, statusFilter: InvoiceListStatusFilter | undefined): T {
  const filter = statusFilter || 'All Status';
  if (filter === 'All Status') return query;
  if (filter === 'Paid') return query.eq('payment_status', 'Paid');
  if (filter === 'Partial') return query.eq('payment_status', 'Partial');
  if (filter === 'Unpaid') return query.or('payment_status.eq.Unpaid,payment_status.eq.Draft');
  if (filter === 'Pending') return query.or('payment_status.eq.Unpaid,payment_status.eq.Draft,payment_status.eq.Partial');
  if (filter === 'Sent') return query.eq('status', 'sent');
  if (filter === 'Overdue') {
    const today = new Date().toISOString().slice(0, 10);
    return query.lt('due_date', today).gt('balance_due', 0);
  }
  return query;
}

function applyInvoiceListFilters<
  T extends {
    or: (filters: string) => T;
    in: (column: string, values: string[]) => T;
    eq: (column: string, value: string | number | boolean) => T;
    lt: (column: string, value: string) => T;
    gt: (column: string, value: number) => T;
  }
>(query: T, options: InvoiceListFilters): T {
  let next = applyInvoiceShopScope(
    query as unknown as Parameters<typeof applyInvoiceShopScope>[0],
    options.shopId,
    options.isFounder
  ) as unknown as T;
  const trimmed = (options.searchTerm || '').trim();
  if (trimmed) {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    next = next.or(`invoice_number.ilike.${pattern},notes.ilike.${pattern}`);
  }
  if (options.customerIds && options.customerIds.length > 0) {
    next = next.in('customer_id', options.customerIds);
  }
  next = applyInvoiceStatusFilter(next, options.statusFilter);
  return next;
}

export async function countShopInvoices(
  supabase: SupabaseClient,
  options: InvoiceListFilters
): Promise<{ count: number; error: { message?: string; code?: string } | null }> {
  let query = supabase.from('invoice_balances_v').select('id', { count: 'exact', head: true });
  query = applyInvoiceListFilters(query, options);
  const { count, error } = await query;
  if (error) return { count: 0, error: { message: error.message, code: error.code } };
  return { count: count ?? 0, error: null };
}

export async function listShopInvoicesPage(
  supabase: SupabaseClient,
  options: InvoiceListFilters & { page?: number; pageSize?: number }
): Promise<{
  data: Record<string, unknown>[];
  count: number;
  error: { message?: string; code?: string } | null;
}> {
  const ascending = (options.sortDir ?? 'desc') === 'asc';
  const pageSize = Math.max(1, options.pageSize ?? INVOICE_DEFAULT_PAGE_SIZE);
  const { from, to } = pageRange(options.page ?? 0, pageSize);
  let query = supabase
    .from('invoice_balances_v')
    .select('*', { count: 'exact' })
    .order('invoice_number_numeric', { ascending })
    .order('created_at', { ascending })
    .range(from, to);
  query = applyInvoiceListFilters(query, options);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: { message: error.message, code: error.code } };
  return { data: (data || []) as Record<string, unknown>[], count: count ?? 0, error: null };
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

export async function fetchAllRowsByInvoiceIds<T>(
  supabase: SupabaseClient,
  table: 'invoice_payments' | 'invoice_line_items',
  invoiceIds: string[],
  chunkSize = 200
): Promise<{ data: T[]; error: { message?: string; code?: string } | null }> {
  const uniqueIds = [...new Set(invoiceIds.filter(Boolean))];
  const rows: T[] = [];
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const chunkResult = await fetchAllPagedRows<T>(async (from, to) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .in('invoice_id', chunk)
        .order('id', { ascending: true })
        .range(from, to);
      return { data: (data || []) as T[], error: error ? { message: error.message, code: error.code } : null };
    });
    if (chunkResult.error) return { data: [], error: chunkResult.error };
    rows.push(...chunkResult.data);
  }
  return { data: rows, error: null };
}

export async function fetchAllInventoryHistoryForPart(
  supabase: SupabaseClient,
  partId: string
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    const { data, error } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('part_id', partId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    return { data: (data || []) as Record<string, unknown>[], error: error ? { message: error.message, code: error.code } : null };
  });
}

export async function fetchAllCustomerInvoices(
  supabase: SupabaseClient,
  options: ShopScope & { customerId: string }
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', options.customerId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error: error ? { message: error.message, code: error.code } : null };
  });
}

export async function fetchAllCustomerWorkOrders(
  supabase: SupabaseClient,
  options: ShopScope & { customerId: string }
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('work_orders')
      .select('*')
      .eq('customer_id', options.customerId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error: error ? { message: error.message, code: error.code } : null };
  });
}
