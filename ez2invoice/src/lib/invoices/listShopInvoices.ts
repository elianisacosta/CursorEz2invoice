import type { SupabaseClient } from '@supabase/supabase-js';
import {
  POSTGREST_PAGE_SIZE,
  fetchAllPagedRows,
  pageRange,
  type ShopScope,
} from '@/lib/postgrestPagination';
import { calculateInvoiceFinancials } from '@/lib/invoices/invoicePaymentSummary';
import { ALL_LOCATIONS_FILTER } from '@/lib/invoices/resolveInvoiceLocation';
import {
  applyInvoiceLocationFilter,
  type InvoiceLocationListFilter,
} from '@/lib/invoices/shopLocations';

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
  locationFilter?: InvoiceLocationListFilter;
  sortDir?: 'asc' | 'desc';
};

export { ALL_LOCATIONS_FILTER };

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
  if (filter === 'Paid') return query.eq('computed_status', 'Paid');
  if (filter === 'Partial') return query.eq('computed_status', 'Partial');
  if (filter === 'Unpaid') return query.or('computed_status.eq.Unpaid,computed_status.eq.Draft');
  if (filter === 'Pending') return query.or('computed_status.eq.Unpaid,computed_status.eq.Draft,computed_status.eq.Partial');
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
    is: (column: string, value: null) => T;
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
  next = applyInvoiceLocationFilter(next, options.locationFilter);
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

export type InvoiceSummary = {
  totalDueToday: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  filteredCount: number;
};

export type InvoiceOverviewMetrics = {
  salesToday: number;
  invoicesToday: number;
  salesThisMonth: number;
  jobsThisMonth: number;
  totalOutstanding: number;
};

const INVOICE_SUMMARY_SELECT =
  'id,total_amount,paid_amount,apply_card_fee,subtotal,tax_amount,due_date,status';

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function aggregateInvoiceSummaryRow(
  row: Record<string, unknown>,
  cardFeePercentage: number,
  accum: { totalDueToday: number; totalPaid: number; overdueCount: number }
): void {
  const financials = calculateInvoiceFinancials(
    {
      subtotal: row.subtotal as number | null,
      tax_amount: row.tax_amount as number | null,
      total_amount: row.total_amount as number | null,
      paid_amount: row.paid_amount as number | null,
      apply_card_fee: row.apply_card_fee as boolean | null,
    },
    [],
    { cardFeePercentage, allowLegacyFallback: true }
  );
  accum.totalDueToday += financials.totalDueToday;
  accum.totalPaid += financials.paidTowardInvoice;
  const dueDate = row.due_date ? String(row.due_date) : '';
  const isOverdue =
    financials.totalDueToday > 0.01 && !!dueDate && new Date(dueDate) < new Date();
  if (isOverdue) accum.overdueCount += 1;
}

export function normalizeInvoiceListRow(
  row: Record<string, unknown>,
  customer?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } | null
): Record<string, unknown> {
  const customerId = row.customer_id ? String(row.customer_id) : undefined;
  return {
    ...row,
    id: String(row.id),
    customer_id: customerId,
    customer: customer ?? null,
  };
}

export async function loadShopInvoiceSummary(
  supabase: SupabaseClient,
  options: InvoiceListFilters & { cardFeePercentage: number }
): Promise<{ data: InvoiceSummary; error: { message?: string; code?: string } | null }> {
  const accum = { totalDueToday: 0, totalPaid: 0, overdueCount: 0 };
  let from = 0;
  for (;;) {
    let query = supabase
      .from('invoice_balances_v')
      .select(INVOICE_SUMMARY_SELECT)
      .order('id', { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    query = applyInvoiceListFilters(query, options);
    const { data, error } = await query;
    if (error) {
      return {
        data: {
          totalDueToday: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueCount: 0,
          filteredCount: 0,
        },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = (data || []) as Record<string, unknown>[];
    for (const row of batch) {
      aggregateInvoiceSummaryRow(row, options.cardFeePercentage, accum);
    }
    if (batch.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  const countResult = await countShopInvoices(supabase, options);
  return {
    data: {
      totalDueToday: round2(accum.totalDueToday),
      totalPaid: round2(accum.totalPaid),
      totalOutstanding: round2(accum.totalDueToday),
      overdueCount: accum.overdueCount,
      filteredCount: countResult.count,
    },
    error: countResult.error,
  };
}

export async function loadShopInvoiceOverviewMetrics(
  supabase: SupabaseClient,
  options: InvoiceShopScope & { cardFeePercentage: number }
): Promise<{ data: InvoiceOverviewMetrics; error: { message?: string; code?: string } | null }> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let salesToday = 0;
  let invoicesToday = 0;
  let salesThisMonth = 0;
  let jobsThisMonth = 0;
  let totalOutstanding = 0;
  let from = 0;

  for (;;) {
    let query = supabase
      .from('invoice_balances_v')
      .select('id,total_amount,paid_amount,apply_card_fee,subtotal,tax_amount,due_date,status,created_at')
      .order('id', { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    if (error) {
      return {
        data: {
          salesToday: 0,
          invoicesToday: 0,
          salesThisMonth: 0,
          jobsThisMonth: 0,
          totalOutstanding: 0,
        },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = (data || []) as Record<string, unknown>[];
    for (const row of batch) {
      const createdAt = row.created_at ? new Date(String(row.created_at)) : null;
      const totalAmount = Number(row.total_amount) || 0;
      if (createdAt && createdAt >= todayStart && createdAt <= todayEnd) {
        salesToday += totalAmount;
        invoicesToday += 1;
      }
      if (createdAt && createdAt >= monthStart) {
        salesThisMonth += totalAmount;
        jobsThisMonth += 1;
      }
      const financials = calculateInvoiceFinancials(
        {
          subtotal: row.subtotal as number | null,
          tax_amount: row.tax_amount as number | null,
          total_amount: row.total_amount as number | null,
          paid_amount: row.paid_amount as number | null,
          apply_card_fee: row.apply_card_fee as boolean | null,
        },
        [],
        { cardFeePercentage: options.cardFeePercentage, allowLegacyFallback: true }
      );
      totalOutstanding += financials.totalDueToday;
    }
    if (batch.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  return {
    data: {
      salesToday: round2(salesToday),
      invoicesToday,
      salesThisMonth: round2(salesThisMonth),
      jobsThisMonth,
      totalOutstanding: round2(totalOutstanding),
    },
    error: null,
  };
}

export async function fetchShopOutstandingInvoiceRows(
  supabase: SupabaseClient,
  options: InvoiceShopScope
): Promise<{ data: Record<string, unknown>[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('invoice_balances_v')
      .select('*')
      .gt('balance_due', 0)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .range(from, to);
    query = applyInvoiceShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error };
  });
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
