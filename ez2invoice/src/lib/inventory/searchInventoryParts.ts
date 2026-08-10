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

/**
 * Global inventory search against public.parts (same table as invoice autocomplete).
 * Matches part name, part number/SKU, description, and supplier.
 *
 * Important: only select columns that exist on public.parts.
 * Selecting a missing column (e.g. location) causes PostgREST to fail and return no rows.
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

  // Same ILIKE fields as invoice catalog part search, plus supplier.
  let query = supabase
    .from('parts')
    .select(
      'id, part_number, part_name, description, category, supplier, quantity_in_stock, minimum_stock_level, selling_price, cost, shop_id, created_at'
    )
    .or(
      [
        `part_name.ilike.${pattern}`,
        `part_number.ilike.${pattern}`,
        `description.ilike.${pattern}`,
        `supplier.ilike.${pattern}`,
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

  return { data: (data || []) as InventorySearchPartRow[], error: null };
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
