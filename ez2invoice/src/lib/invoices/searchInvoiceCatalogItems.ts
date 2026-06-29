import type { SupabaseClient } from '@supabase/supabase-js';

export type InvoiceCatalogLaborRow = {
  id: string;
  service_name: string;
  description: string | null;
  category: string | null;
  rate_type: 'fixed' | 'hourly';
  rate: number;
  est_hours: number | null;
  shop_id?: string | null;
};

export type InvoiceCatalogPartRow = {
  id: string;
  part_name: string;
  part_number: string | null;
  description: string | null;
  category: string | null;
  selling_price: number;
  cost: number | null;
  quantity_in_stock: number;
  shop_id?: string | null;
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

export async function searchInvoiceCatalogItems(
  supabase: SupabaseClient,
  options: {
    shopId: string | null;
    isFounder: boolean;
    searchTerm: string;
    limit?: number;
  }
): Promise<{ labor: InvoiceCatalogLaborRow[]; parts: InvoiceCatalogPartRow[] }> {
  const trimmed = options.searchTerm.trim();
  if (trimmed.length < 2) {
    return { labor: [], parts: [] };
  }

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const limit = options.limit ?? 50;

  let laborQuery = supabase
    .from('labor_items')
    .select('id, service_name, description, category, rate_type, rate, est_hours, shop_id')
    .or(`service_name.ilike.${pattern},description.ilike.${pattern}`)
    .order('service_name', { ascending: true })
    .limit(limit);

  let partsQuery = supabase
    .from('parts')
    .select('id, part_name, part_number, description, category, selling_price, cost, quantity_in_stock, shop_id')
    .or(`part_name.ilike.${pattern},part_number.ilike.${pattern},description.ilike.${pattern}`)
    .order('part_name', { ascending: true })
    .limit(limit);

  laborQuery = applyShopScope(laborQuery, options.shopId, options.isFounder);
  partsQuery = applyShopScope(partsQuery, options.shopId, options.isFounder);

  const [laborResult, partsResult] = await Promise.all([laborQuery, partsQuery]);

  if (laborResult.error) {
    console.warn('Invoice labor search failed:', laborResult.error);
  }
  if (partsResult.error) {
    console.warn('Invoice part search failed:', partsResult.error);
  }

  return {
    labor: (laborResult.data || []) as InvoiceCatalogLaborRow[],
    parts: (partsResult.data || []) as InvoiceCatalogPartRow[],
  };
}

export async function findPartByPartNumber(
  supabase: SupabaseClient,
  options: {
    shopId: string | null;
    isFounder: boolean;
    partNumber: string;
    excludePartId?: string | null;
  }
): Promise<InvoiceCatalogPartRow | null> {
  const trimmed = options.partNumber.trim();
  if (!trimmed) {
    return null;
  }

  let query = supabase
    .from('parts')
    .select('id, part_name, part_number, description, category, selling_price, cost, quantity_in_stock, shop_id')
    .ilike('part_number', trimmed)
    .limit(5);

  query = applyShopScope(query, options.shopId, options.isFounder);

  const { data, error } = await query;
  if (error) {
    console.warn('Part number lookup failed:', error);
    return null;
  }

  const exactMatches = (data || []).filter((row) => {
    if (options.excludePartId && String(row.id) === String(options.excludePartId)) {
      return false;
    }
    return String(row.part_number || '').trim().toLowerCase() === trimmed.toLowerCase();
  });

  return (exactMatches[0] as InvoiceCatalogPartRow | undefined) || null;
}

export type InventoryPartInsertForm = {
  name: string;
  sku: string;
  unit_price: number;
};

/** Merge insert RETURNING row with form values (RETURNING may be empty under RLS). */
export function mergeInventoryPartFromInsert(
  row: Partial<InvoiceCatalogPartRow> | null | undefined,
  form: InventoryPartInsertForm
): InvoiceCatalogPartRow | null {
  const id = row?.id ? String(row.id) : '';
  if (!id) return null;

  const rowPrice = Number(row?.selling_price);
  const formPrice = Number(form.unit_price) || 0;
  const sellingPrice = rowPrice > 0 ? rowPrice : formPrice;

  return {
    id,
    part_name: (row?.part_name || form.name).trim(),
    part_number: (row?.part_number || form.sku).trim() || null,
    description: row?.description ?? null,
    category: row?.category ?? null,
    selling_price: sellingPrice,
    cost: row?.cost ?? null,
    quantity_in_stock: Number(row?.quantity_in_stock) || 0,
    shop_id: row?.shop_id ?? null,
  };
}

/**
 * After parts INSERT, resolve the created row for invoice line-item linking.
 * Supabase may return data=[] when INSERT succeeds but RETURNING is blocked.
 */
export async function resolvePartAfterInventoryInsert(
  supabase: SupabaseClient,
  options: {
    shopId: string | null;
    isFounder: boolean;
    insertRows: Partial<InvoiceCatalogPartRow>[] | null | undefined;
    form: InventoryPartInsertForm;
  }
): Promise<InvoiceCatalogPartRow | null> {
  const fromReturning = mergeInventoryPartFromInsert(options.insertRows?.[0], options.form);
  if (fromReturning) return fromReturning;

  const fetched = await findPartByPartNumber(supabase, {
    shopId: options.shopId,
    isFounder: options.isFounder,
    partNumber: options.form.sku,
  });
  return mergeInventoryPartFromInsert(fetched, options.form);
}
