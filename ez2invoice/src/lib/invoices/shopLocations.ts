import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShopScope } from '@/lib/postgrestPagination';
import {
  ALL_LOCATIONS_FILTER,
  DEFAULT_SHOP_LOCATION_NAMES,
  NO_LOCATION_FILTER,
} from '@/lib/invoices/resolveInvoiceLocation';

export type ShopLocation = {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type InvoiceLocationListFilter = typeof ALL_LOCATIONS_FILTER | typeof NO_LOCATION_FILTER | string;

function applyLocationShopScope<
  T extends { or: (filters: string) => T; eq: (column: string, value: string) => T }
>(query: T, shopId: string | null, isFounder: boolean): T {
  if (!shopId) return query;
  if (isFounder) {
    return query.or(`shop_id.eq.${shopId},shop_id.is.null`);
  }
  return query.eq('shop_id', shopId);
}

export async function listShopLocations(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: ShopLocation[]; error: { message?: string; code?: string } | null }> {
  let query = supabase
    .from('shop_locations')
    .select('id, shop_id, name, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  query = applyLocationShopScope(query, options.shopId, options.isFounder);
  const { data, error } = await query;
  if (error) return { data: [], error: { message: error.message, code: error.code } };
  return { data: (data || []) as ShopLocation[], error: null };
}

export async function ensureDefaultShopLocations(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: ShopLocation[]; error: { message?: string; code?: string } | null }> {
  const existing = await listShopLocations(supabase, options);
  if (existing.error) return existing;
  if (existing.data.length > 0) return existing;

  if (!options.shopId) {
    return { data: [], error: null };
  }

  const rows = DEFAULT_SHOP_LOCATION_NAMES.map((name, index) => ({
    shop_id: options.shopId,
    name,
    sort_order: index,
    is_active: true,
  }));

  const { data, error } = await supabase.from('shop_locations').insert(rows).select('id, shop_id, name, sort_order, is_active');
  if (error) return { data: [], error: { message: error.message, code: error.code } };
  return { data: (data || []) as ShopLocation[], error: null };
}

export async function createShopLocation(
  supabase: SupabaseClient,
  options: ShopScope & { name: string }
): Promise<{ data: ShopLocation | null; error: { message?: string; code?: string } | null }> {
  const trimmed = options.name.trim();
  if (!trimmed || !options.shopId) {
    return { data: null, error: { message: 'Location name is required.' } };
  }

  const existing = await listShopLocations(supabase, options);
  const duplicate = existing.data.find((row) => row.name.toLowerCase() === trimmed.toLowerCase());
  if (duplicate) {
    return { data: duplicate, error: null };
  }

  const nextSort = existing.data.reduce((max, row) => Math.max(max, row.sort_order || 0), -1) + 1;
  const { data, error } = await supabase
    .from('shop_locations')
    .insert({
      shop_id: options.shopId,
      name: trimmed,
      sort_order: nextSort,
      is_active: true,
    })
    .select('id, shop_id, name, sort_order, is_active')
    .single();

  if (error) return { data: null, error: { message: error.message, code: error.code } };
  return { data: data as ShopLocation, error: null };
}

export async function setInvoiceManualLocation(
  supabase: SupabaseClient,
  options: { invoiceId: string; locationId: string | null }
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { error } = await supabase
    .from('invoices')
    .update({
      location_id: options.locationId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', options.invoiceId);
  if (error) return { error: { message: error.message, code: error.code } };
  return { error: null };
}

export async function fetchWorkOrderBaySnapshots(
  supabase: SupabaseClient,
  workOrderIds: string[]
): Promise<{
  data: Record<string, { work_order_id: string; bay_name: string | null; bay_number: number | null }>;
  error: { message?: string; code?: string } | null;
}> {
  const uniqueIds = [...new Set(workOrderIds.filter(Boolean))];
  const map: Record<string, { work_order_id: string; bay_name: string | null; bay_number: number | null }> = {};
  if (uniqueIds.length === 0) return { data: map, error: null };

  const { data, error } = await supabase
    .from('work_orders')
    .select('id, bay_id, service_bays(bay_name, bay_number)')
    .in('id', uniqueIds);

  if (error) return { data: map, error: { message: error.message, code: error.code } };

  for (const row of data || []) {
    const record = row as Record<string, unknown>;
    const bay = record.service_bays as Record<string, unknown> | null | undefined;
    map[String(record.id)] = {
      work_order_id: String(record.id),
      bay_name: (bay?.bay_name as string | null) ?? null,
      bay_number: bay?.bay_number == null ? null : Number(bay.bay_number),
    };
  }

  return { data: map, error: null };
}

export function applyInvoiceLocationFilter<
  T extends {
    eq: (column: string, value: string | number | boolean) => T;
    is: (column: string, value: null) => T;
  }
>(query: T, locationFilter: InvoiceLocationListFilter | undefined): T {
  const filter = locationFilter || ALL_LOCATIONS_FILTER;
  if (filter === ALL_LOCATIONS_FILTER) return query;
  if (filter === NO_LOCATION_FILTER) return query.is('effective_location_name', null);
  return query.eq('effective_location_name', filter);
}
