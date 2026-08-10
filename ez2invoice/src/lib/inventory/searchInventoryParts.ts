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

/**
 * Global inventory search against public.parts (same table as invoice autocomplete).
 * Uses the same ILIKE fields as invoice part search: part_name, part_number, description.
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

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const limit = options.limit ?? 200;

  // Match invoice catalog part search filters exactly (proven working).
  let query = supabase
    .from('parts')
    .select('*')
    .or(
      [
        `part_name.ilike.${pattern}`,
        `part_number.ilike.${pattern}`,
        `description.ilike.${pattern}`,
      ].join(',')
    )
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
