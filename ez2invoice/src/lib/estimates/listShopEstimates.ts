import type { SupabaseClient } from '@supabase/supabase-js';
import {
  POSTGREST_PAGE_SIZE,
  applyShopScope,
  fetchAllPagedRows,
  pageRange,
  type ShopScope,
} from '../postgrestPagination.ts';

export { POSTGREST_PAGE_SIZE };
export const ESTIMATE_DEFAULT_PAGE_SIZE = 25;
export const ESTIMATE_SEARCH_LIMIT = 100;

export type EstimateListRow = {
  id: string;
  estimate_number: string | null;
  status: string | null;
  total_amount: number;
  subtotal: number | null;
  tax_amount: number | null;
  created_at: string | null;
  valid_until: string | null;
  customer_id: string | null;
  shop_id: string | null;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
};

export type EstimateListFilters = ShopScope & {
  searchTerm?: string;
  status?: string;
  customerIds?: string[];
};

export type EstimateSummary = {
  totalCount: number;
  totalValue: number;
  rejectedCount: number;
  acceptedCount: number;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,]/g, '\\$&');
}

function normalizeEstimateRow(row: Record<string, unknown>): EstimateListRow {
  const customerRaw = row.customer as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    estimate_number: (row.estimate_number as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    total_amount: Number(row.total_amount) || 0,
    subtotal: row.subtotal == null ? null : Number(row.subtotal) || 0,
    tax_amount: row.tax_amount == null ? null : Number(row.tax_amount) || 0,
    created_at: (row.created_at as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
    customer_id: (row.customer_id as string | null) ?? null,
    shop_id: (row.shop_id as string | null) ?? null,
    customer: customerRaw
      ? {
          id: String(customerRaw.id),
          first_name: (customerRaw.first_name as string | null) ?? null,
          last_name: (customerRaw.last_name as string | null) ?? null,
          email: (customerRaw.email as string | null) ?? null,
          phone: (customerRaw.phone as string | null) ?? null,
          company: (customerRaw.company as string | null) ?? null,
        }
      : null,
  };
}

const ESTIMATE_SELECT = `
  *,
  customer:customers(id, first_name, last_name, email, phone, company)
`;

function applyEstimateListFilters<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string) => T;
    in: (column: string, values: string[]) => T;
  }
>(query: T, options: EstimateListFilters): T {
  let next = applyShopScope(query as unknown as Parameters<typeof applyShopScope>[0], options.shopId, options.isFounder) as T;
  const trimmed = (options.searchTerm || '').trim();
  if (trimmed) {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    next = next.or(`estimate_number.ilike.${pattern}`);
  }
  if (options.customerIds && options.customerIds.length > 0) {
    next = next.in('customer_id', options.customerIds);
  }
  const status = options.status || 'all';
  if (status !== 'all') {
    next = next.eq('status', status);
  }
  return next;
}

export function estimateMatchesListSearch(
  estimate: EstimateListRow,
  searchTerm: string
): boolean {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return true;
  if ((estimate.estimate_number || estimate.id.slice(0, 8)).toLowerCase().includes(q)) return true;
  const customer = estimate.customer;
  if (!customer) return false;
  return [customer.first_name, customer.last_name, customer.company, customer.email, customer.phone]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export async function countShopEstimates(
  supabase: SupabaseClient,
  options: EstimateListFilters
): Promise<{ count: number; error: { message?: string; code?: string } | null }> {
  let query = supabase.from('estimates').select('id', { count: 'exact', head: true });
  query = applyEstimateListFilters(query, options);
  const { count, error } = await query;
  if (error) return { count: 0, error: { message: error.message, code: error.code } };
  return { count: count ?? 0, error: null };
}

export async function loadShopEstimateSummary(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: EstimateSummary; error: { message?: string; code?: string } | null }> {
  const countResult = await countShopEstimates(supabase, { ...options, status: 'all' });
  if (countResult.error) {
    return {
      data: { totalCount: 0, totalValue: 0, rejectedCount: 0, acceptedCount: 0 },
      error: countResult.error,
    };
  }

  let totalValue = 0;
  let rejectedCount = 0;
  let acceptedCount = 0;
  let from = 0;
  for (;;) {
    let query = supabase
      .from('estimates')
      .select('total_amount, status')
      .order('id', { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    if (error) {
      return {
        data: { totalCount: countResult.count, totalValue: 0, rejectedCount: 0, acceptedCount: 0 },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = data || [];
    for (const row of batch) {
      totalValue += Number(row.total_amount) || 0;
      const status = String(row.status || '').toLowerCase();
      if (status === 'rejected') rejectedCount += 1;
      if (status === 'accepted') acceptedCount += 1;
    }
    if (batch.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  return {
    data: {
      totalCount: countResult.count,
      totalValue,
      rejectedCount,
      acceptedCount,
    },
    error: null,
  };
}

export async function listShopEstimatesPage(
  supabase: SupabaseClient,
  options: EstimateListFilters & { page?: number; pageSize?: number }
): Promise<{
  data: EstimateListRow[];
  count: number;
  error: { message?: string; code?: string } | null;
}> {
  const pageSize = Math.max(1, options.pageSize ?? ESTIMATE_DEFAULT_PAGE_SIZE);
  const { from, to } = pageRange(options.page ?? 0, pageSize);
  let query = supabase
    .from('estimates')
    .select(ESTIMATE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  query = applyEstimateListFilters(query, options);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: { message: error.message, code: error.code } };
  return {
    data: ((data || []) as Record<string, unknown>[]).map(normalizeEstimateRow),
    count: count ?? 0,
    error: null,
  };
}

export async function searchShopEstimates(
  supabase: SupabaseClient,
  options: EstimateListFilters & { limit?: number }
): Promise<{ data: EstimateListRow[]; error: { message?: string; code?: string } | null }> {
  const trimmed = (options.searchTerm || '').trim();
  if (!trimmed) return { data: [], error: null };

  const limit = options.limit ?? ESTIMATE_SEARCH_LIMIT;
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  let query = supabase
    .from('estimates')
    .select(ESTIMATE_SELECT)
    .or(`estimate_number.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  query = applyShopScope(query, options.shopId, options.isFounder);
  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  const { data, error } = await query;
  if (error) return { data: [], error: { message: error.message, code: error.code } };

  const rows = ((data || []) as Record<string, unknown>[]).map(normalizeEstimateRow);
  const customerFiltered =
    options.customerIds && options.customerIds.length > 0
      ? rows.filter((row) => row.customer_id && options.customerIds!.includes(row.customer_id))
      : rows;
  return {
    data: customerFiltered.filter((row) => estimateMatchesListSearch(row, trimmed)),
    error: null,
  };
}

export async function fetchAllShopEstimates(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: EstimateListRow[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('estimates')
      .select(ESTIMATE_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return {
      data: ((data || []) as Record<string, unknown>[]).map(normalizeEstimateRow),
      error: error ? { message: error.message, code: error.code } : null,
    };
  });
}
