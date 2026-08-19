import type { SupabaseClient } from '@supabase/supabase-js';

export type InventorySearchPartRow = {
  id: string;
  part_number: string | null;
  part_name: string;
  description: string | null;
  category: string | null;
  supplier: string | null;
  quantity_in_stock: number;
  minimum_stock_level: number;
  selling_price: number;
  cost: number | null;
  shop_id?: string | null;
  created_at?: string;
};

export type InventoryPartsSearchResult = {
  data: InventorySearchPartRow[];
  error: { message?: string; code?: string } | null;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,]/g, '\\$&');
}

function applyShopScope<T extends { or: (filters: string) => T; eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(
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

function normalizeInventorySearchRow(row: Record<string, unknown>): InventorySearchPartRow {
  return {
    id: String(row.id),
    part_number: (row.part_number as string | null) ?? null,
    part_name: String(row.part_name ?? ''),
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    supplier: (row.supplier as string | null) ?? null,
    quantity_in_stock: Number(row.quantity_in_stock) || 0,
    minimum_stock_level: Number(row.minimum_stock_level) || 0,
    selling_price: Number(row.selling_price) || 0,
    cost: (row.cost as number | null) ?? null,
    shop_id: (row.shop_id as string | null) ?? null,
    created_at: (row.created_at as string | undefined) ?? undefined,
  };
}

export const INVENTORY_DEFAULT_PAGE_SIZE = 25;
export const INVENTORY_SCAN_PAGE_SIZE = 1000;

export type InventoryShopScope = {
  shopId: string | null;
  isFounder: boolean;
};

export type InventoryStockStatusFilter =
  | 'all'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'negative_stock';

export const INVENTORY_CATEGORY_ALL = 'All Categories';

export type InventoryListFilters = InventoryShopScope & {
  searchTerm?: string;
  category?: string;
  stockStatus?: InventoryStockStatusFilter;
};

export function normalizeInventoryCategoryLabel(category: string | null | undefined): string {
  const trimmed = String(category || '').trim();
  return trimmed || 'General';
}

export function buildInventorySearchOrFilter(searchTerm: string): string | null {
  const trimmed = searchTerm.trim();
  if (!trimmed) return null;
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  return [
    `part_name.ilike.${pattern}`,
    `part_number.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `supplier.ilike.${pattern}`,
  ].join(',');
}

export function inventoryStockFilterNeedsScan(stockStatus: InventoryStockStatusFilter | undefined): boolean {
  return stockStatus === 'low_stock' || stockStatus === 'in_stock';
}

function applyInventoryListFilters<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string | number) => T;
    lt: (column: string, value: number) => T;
    is: (column: string, value: null) => T;
  }
>(query: T, options: InventoryListFilters): T {
  let next = applyShopScope(query, options.shopId, options.isFounder);
  const searchFilter = buildInventorySearchOrFilter(options.searchTerm || '');
  if (searchFilter) {
    next = next.or(searchFilter);
  }
  const category = options.category || INVENTORY_CATEGORY_ALL;
  if (category && category !== INVENTORY_CATEGORY_ALL && category !== 'All') {
    if (category === 'General') {
      next = next.or('category.eq.General,category.is.null,category.eq.');
    } else {
      next = next.eq('category', category);
    }
  }
  const stockStatus = options.stockStatus || 'all';
  if (stockStatus === 'out_of_stock') {
    next = next.eq('quantity_in_stock', 0);
  } else if (stockStatus === 'negative_stock') {
    next = next.lt('quantity_in_stock', 0);
  }
  return next;
}

/**
 * Autocomplete-style search against the full shop parts table.
 * Includes supplier so it matches the Inventory search placeholder.
 * Uses select('*') so missing optional columns cannot break the query.
 */
export async function searchInventoryParts(
  supabase: SupabaseClient,
  options: {
    shopId: string | null;
    isFounder: boolean;
    searchTerm: string;
    limit?: number;
  }
): Promise<InventoryPartsSearchResult> {
  const trimmed = options.searchTerm.trim();
  if (!trimmed) return { data: [], error: null };

  const orFilter = buildInventorySearchOrFilter(trimmed);
  if (!orFilter) return { data: [], error: null };
  const limit = options.limit ?? 50;

  let query = supabase
    .from('parts')
    .select('*')
    .or(orFilter)
    .order('part_name', { ascending: true })
    .limit(limit);

  query = applyShopScope(query, options.shopId, options.isFounder);

  const { data, error } = await query;
  if (error) {
    console.warn('Inventory parts search failed:', error);
    return { data: [], error: { message: error.message, code: error.code } };
  }

  return {
    data: ((data || []) as Record<string, unknown>[]).map(normalizeInventorySearchRow),
    error: null,
  };
}

export type InventorySummary = {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
  categories: string[];
};

export async function loadShopInventorySummary(
  supabase: SupabaseClient,
  options: InventoryShopScope
): Promise<{ data: InventorySummary; error: { message?: string; code?: string } | null }> {
  let countQuery = supabase.from('parts').select('id', { count: 'exact', head: true });
  countQuery = applyShopScope(countQuery, options.shopId, options.isFounder);
  const { count, error: countError } = await countQuery;
  if (countError) {
    return {
      data: { totalItems: 0, lowStockCount: 0, totalValue: 0, categories: [] },
      error: { message: countError.message, code: countError.code },
    };
  }

  let totalValue = 0;
  let lowStockCount = 0;
  const categories = new Set<string>();
  let from = 0;
  for (;;) {
    let pageQuery = supabase
      .from('parts')
      .select('quantity_in_stock, selling_price, category, minimum_stock_level')
      .order('id', { ascending: true })
      .range(from, from + INVENTORY_SCAN_PAGE_SIZE - 1);
    pageQuery = applyShopScope(pageQuery, options.shopId, options.isFounder);
    const { data, error } = await pageQuery;
    if (error) {
      return {
        data: { totalItems: count ?? 0, lowStockCount: 0, totalValue: 0, categories: [] },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = data || [];
    for (const row of batch as {
      quantity_in_stock?: number | null;
      selling_price?: number | null;
      category?: string | null;
      minimum_stock_level?: number | null;
    }[]) {
      const quantity = Number(row.quantity_in_stock) || 0;
      const price = Number(row.selling_price) || 0;
      totalValue += quantity * price;
      if (inventoryPartMatchesStockStatus(row, 'low_stock')) lowStockCount += 1;
      categories.add(normalizeInventoryCategoryLabel(row.category));
    }
    if (batch.length < INVENTORY_SCAN_PAGE_SIZE) break;
    from += INVENTORY_SCAN_PAGE_SIZE;
  }

  return {
    data: {
      totalItems: count ?? 0,
      lowStockCount,
      totalValue,
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
    },
    error: null,
  };
}

export async function listShopPartsPage(
  supabase: SupabaseClient,
  options: InventoryListFilters & {
    page?: number;
    pageSize?: number;
  }
): Promise<{
  data: InventorySearchPartRow[];
  count: number;
  error: { message?: string; code?: string } | null;
}> {
  const pageSize = Math.max(1, options.pageSize ?? INVENTORY_DEFAULT_PAGE_SIZE);
  const page = Math.max(0, options.page ?? 0);
  const stockStatus = options.stockStatus || 'all';

  const buildQuery = (withCount: boolean) => {
    let query = supabase
      .from('parts')
      .select('*', withCount ? { count: 'exact' } : undefined)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    return applyInventoryListFilters(query, options);
  };

  if (!inventoryStockFilterNeedsScan(stockStatus)) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await buildQuery(true).range(from, to);
    if (error) {
      return { data: [], count: 0, error: { message: error.message, code: error.code } };
    }
    return {
      data: ((data || []) as Record<string, unknown>[]).map(normalizeInventorySearchRow),
      count: count ?? 0,
      error: null,
    };
  }

  const skip = page * pageSize;
  const rows: InventorySearchPartRow[] = [];
  let matchingCount = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(false).range(from, from + INVENTORY_SCAN_PAGE_SIZE - 1);
    if (error) {
      return { data: [], count: 0, error: { message: error.message, code: error.code } };
    }
    const batch = ((data || []) as Record<string, unknown>[]).map(normalizeInventorySearchRow);
    for (const row of batch) {
      if (!inventoryPartMatchesStockStatus(row, stockStatus)) continue;
      if (matchingCount >= skip && rows.length < pageSize) {
        rows.push(row);
      }
      matchingCount += 1;
    }
    if (batch.length < INVENTORY_SCAN_PAGE_SIZE) break;
    from += INVENTORY_SCAN_PAGE_SIZE;
  }

  return { data: rows, count: matchingCount, error: null };
}

/** Merge server hits with local matches so search never blanks if one source is incomplete. */
export function mergeInventorySearchResults<T extends { id: string }>(
  localMatches: T[],
  serverMatches: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const item of localMatches) {
    byId.set(String(item.id), item);
  }
  for (const item of serverMatches) {
    byId.set(String(item.id), item);
  }
  return Array.from(byId.values());
}

/** Client-side match used when browsing already-loaded rows or as search fallback. */
export function inventoryPartMatchesQuery(
  item: {
    part_name?: string | null;
    part_number?: string | null;
    description?: string | null;
    supplier?: string | null;
    category?: string | null;
  },
  searchTerm: string
): boolean {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    item.part_name,
    item.part_number,
    item.description,
    item.supplier,
    item.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function inventoryPartMatchesStockStatus(
  item: {
    quantity_in_stock?: number | null;
    minimum_stock_level?: number | null;
  },
  stockStatus: InventoryStockStatusFilter
): boolean {
  const quantity = Number(item.quantity_in_stock) || 0;
  const threshold = Number(item.minimum_stock_level) || 0;

  switch (stockStatus) {
    case 'all':
      return true;
    case 'in_stock':
      return quantity > threshold;
    case 'low_stock':
      return quantity > 0 && quantity <= threshold;
    case 'out_of_stock':
      return quantity === 0;
    case 'negative_stock':
      return quantity < 0;
    default:
      return true;
  }
}

export function inventoryPartMatchesCategory(
  item: { category?: string | null },
  categoryFilter: string
): boolean {
  if (!categoryFilter || categoryFilter === INVENTORY_CATEGORY_ALL || categoryFilter === 'All') {
    return true;
  }
  return (item.category || 'General') === categoryFilter;
}

export function getInventoryStockBadge(
  item: {
    quantity_in_stock?: number | null;
    minimum_stock_level?: number | null;
  }
): { label: string; className: string } {
  const quantity = Number(item.quantity_in_stock) || 0;
  const threshold = Number(item.minimum_stock_level) || 0;
  if (quantity < 0) {
    return { label: 'Negative Stock', className: 'bg-purple-100 text-purple-800' };
  }
  if (quantity === 0) {
    return { label: 'Out of Stock', className: 'bg-gray-100 text-gray-800' };
  }
  if (quantity <= threshold) {
    return { label: 'Low Stock', className: 'bg-red-100 text-red-800' };
  }
  return { label: 'In Stock', className: 'bg-green-100 text-green-800' };
}
