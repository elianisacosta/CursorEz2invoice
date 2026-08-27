import type { SupabaseClient } from '@supabase/supabase-js';
import {
  POSTGREST_PAGE_SIZE,
  applyShopScope,
  fetchAllPagedRows,
  pageRange,
  type ShopScope,
} from '../postgrestPagination.ts';

export { POSTGREST_PAGE_SIZE };
export const LABOR_DEFAULT_PAGE_SIZE = 25;
export const LABOR_SEARCH_LIMIT = 100;

export type LaborListRow = {
  id: string;
  service_name: string;
  category: string | null;
  description: string | null;
  rate_type: string | null;
  rate: number;
  est_hours: number | null;
  shop_id: string | null;
  created_at?: string;
};

export type LaborListFilters = ShopScope & {
  searchTerm?: string;
  category?: string;
  rateType?: 'all' | 'fixed' | 'hourly';
};

export type LaborSummary = {
  totalCount: number;
  fixedCount: number;
  hourlyCount: number;
  averageHourlyRate: number;
};

export const LABOR_CATEGORY_ALL = 'All Categories';

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,]/g, '\\$&');
}

function normalizeLaborRow(row: Record<string, unknown>): LaborListRow {
  return {
    id: String(row.id),
    service_name: String(row.service_name ?? ''),
    category: (row.category as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    rate_type: (row.rate_type as string | null) ?? null,
    rate: Number(row.rate) || 0,
    est_hours: row.est_hours == null ? null : Number(row.est_hours) || 0,
    shop_id: (row.shop_id as string | null) ?? null,
    created_at: (row.created_at as string | undefined) ?? undefined,
  };
}

function applyLaborListFilters<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string) => T;
  }
>(query: T, options: LaborListFilters): T {
  let next = applyShopScope(
    query as unknown as Parameters<typeof applyShopScope>[0],
    options.shopId,
    options.isFounder
  ) as unknown as T;
  const trimmed = (options.searchTerm || '').trim();
  if (trimmed) {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    next = next.or(
      [
        `service_name.ilike.${pattern}`,
        `category.ilike.${pattern}`,
        `description.ilike.${pattern}`,
      ].join(',')
    );
  }
  const category = options.category || LABOR_CATEGORY_ALL;
  if (category && category !== LABOR_CATEGORY_ALL && category !== 'All') {
    next = next.eq('category', category === 'General' ? 'General' : category);
  }
  const rateType = options.rateType || 'all';
  if (rateType !== 'all') {
    next = next.eq('rate_type', rateType);
  }
  return next;
}

export async function countShopLaborItems(
  supabase: SupabaseClient,
  options: LaborListFilters
): Promise<{ count: number; error: { message?: string; code?: string } | null }> {
  let query = supabase.from('labor_items').select('id', { count: 'exact', head: true });
  query = applyLaborListFilters(query, options);
  const { count, error } = await query;
  if (error) return { count: 0, error: { message: error.message, code: error.code } };
  return { count: count ?? 0, error: null };
}

export async function loadShopLaborSummary(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: LaborSummary; error: { message?: string; code?: string } | null }> {
  const countResult = await countShopLaborItems(supabase, options);
  if (countResult.error) {
    return {
      data: { totalCount: 0, fixedCount: 0, hourlyCount: 0, averageHourlyRate: 0 },
      error: countResult.error,
    };
  }

  let fixedCount = 0;
  let hourlyCount = 0;
  let hourlyRateSum = 0;
  let from = 0;
  for (;;) {
    let query = supabase
      .from('labor_items')
      .select('rate_type, rate')
      .order('id', { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    if (error) {
      return {
        data: { totalCount: countResult.count, fixedCount: 0, hourlyCount: 0, averageHourlyRate: 0 },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = data || [];
    for (const row of batch) {
      if (row.rate_type === 'fixed') fixedCount += 1;
      if (row.rate_type === 'hourly') {
        hourlyCount += 1;
        hourlyRateSum += Number(row.rate) || 0;
      }
    }
    if (batch.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  return {
    data: {
      totalCount: countResult.count,
      fixedCount,
      hourlyCount,
      averageHourlyRate: hourlyCount > 0 ? hourlyRateSum / hourlyCount : 0,
    },
    error: null,
  };
}

export async function listShopLaborPage(
  supabase: SupabaseClient,
  options: LaborListFilters & { page?: number; pageSize?: number }
): Promise<{
  data: LaborListRow[];
  count: number;
  error: { message?: string; code?: string } | null;
}> {
  const pageSize = Math.max(1, options.pageSize ?? LABOR_DEFAULT_PAGE_SIZE);
  const { from, to } = pageRange(options.page ?? 0, pageSize);
  let query = supabase
    .from('labor_items')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  query = applyLaborListFilters(query, options);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: { message: error.message, code: error.code } };
  return {
    data: ((data || []) as Record<string, unknown>[]).map(normalizeLaborRow),
    count: count ?? 0,
    error: null,
  };
}

export async function fetchAllShopLaborItems(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: LaborListRow[]; error: { message?: string; code?: string } | null }> {
  return fetchAllPagedRows(async (from, to) => {
    let query = supabase
      .from('labor_items')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return {
      data: ((data || []) as Record<string, unknown>[]).map(normalizeLaborRow),
      error: error ? { message: error.message, code: error.code } : null,
    };
  });
}
