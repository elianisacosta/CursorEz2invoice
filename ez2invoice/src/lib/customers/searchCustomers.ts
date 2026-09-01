import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePhoneForLookup } from '@/lib/customers/phoneNumber';

export { normalizePhoneForLookup };

export const CUSTOMER_PAGE_SIZE = 50;
export const CUSTOMER_SEARCH_LIMIT = 50;
export const CUSTOMER_PICKER_BROWSE_LIMIT = 25;

export type CustomerSearchRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  company?: string | null;
  is_fleet?: boolean | null;
  created_at?: string;
  shop_id?: string | null;
};

export type CustomerShopScope = {
  shopId: string | null;
  isFounder: boolean;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,]/g, '\\$&');
}

export function applyCustomerShopScope<T extends { or: (filters: string) => T; eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(
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

export function normalizeTextForLookup(value: string): string {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isPhoneSearchQuery(query: string): boolean {
  const trimmed = query.trim();
  const normalized = normalizePhoneForLookup(trimmed);
  return normalized.length >= 3 && !/[a-z]/i.test(trimmed);
}

export function getCustomerLookupNameFields(customer: {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}): string[] {
  const firstName = normalizeTextForLookup(customer.first_name || '');
  const lastName = normalizeTextForLookup(customer.last_name || '');
  const fullName = normalizeTextForLookup([customer.first_name, customer.last_name].filter(Boolean).join(' '));
  const companyName = normalizeTextForLookup(customer.company || '');
  return [firstName, lastName, fullName, companyName].filter(Boolean);
}

export function customerMatchesQuery(
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  query: string
): boolean {
  const normalizedQuery = normalizeTextForLookup(query);
  if (!normalizedQuery) return true;
  if (isPhoneSearchQuery(query)) {
    const normalizedQueryPhone = normalizePhoneForLookup(query);
    const customerPhone = normalizePhoneForLookup(customer.phone || '');
    return normalizedQueryPhone.length > 0 && customerPhone.includes(normalizedQueryPhone);
  }
  const email = normalizeTextForLookup(customer.email || '');
  if (email.includes(normalizedQuery)) return true;
  return getCustomerLookupNameFields(customer).some((name) => name.includes(normalizedQuery));
}

export function hasExactCustomerLookupMatch(
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    phone?: string | null;
  },
  query: string
): boolean {
  const normalizedQuery = normalizeTextForLookup(query);
  if (!normalizedQuery) return false;
  if (isPhoneSearchQuery(query)) {
    const normalizedQueryPhone = normalizePhoneForLookup(query);
    const customerPhone = normalizePhoneForLookup(customer.phone || '');
    return normalizedQueryPhone.length > 0 && customerPhone === normalizedQueryPhone;
  }
  return getCustomerLookupNameFields(customer).some((name) => name === normalizedQuery);
}

/** ILIKE pattern that still matches formatted phone numbers when the user typed digits. */
export function buildPhoneDigitIlikePattern(query: string): string | null {
  const digits = normalizePhoneForLookup(query);
  if (digits.length < 3) return null;
  return `%${digits.split('').join('%')}%`;
}

export function mergeCustomersById<T extends { id: string }>(...groups: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    for (const item of group) {
      byId.set(String(item.id), item);
    }
  }
  return Array.from(byId.values());
}

export function replaceCustomerById<T extends { id: string }>(rows: T[], updated: T): T[] {
  const updatedId = String(updated.id);
  let found = false;
  const next = rows.map((row) => {
    if (String(row.id) !== updatedId) return row;
    found = true;
    return { ...row, ...updated };
  });
  return found ? next : rows;
}

export function selectedCustomerId(customer: { id: string } | null | undefined): string {
  return customer?.id ? String(customer.id) : '';
}

export function isCurrentCustomerRequest(activeRequestId: number, requestId: number): boolean {
  return activeRequestId === requestId;
}

function normalizeCustomerRow(row: Record<string, unknown>): CustomerSearchRow {
  return {
    id: String(row.id),
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    zip_code: (row.zip_code as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    is_fleet: (row.is_fleet as boolean | null) ?? null,
    created_at: (row.created_at as string | undefined) ?? undefined,
    shop_id: (row.shop_id as string | null) ?? null,
  };
}

export async function countShopCustomers(
  supabase: SupabaseClient,
  options: CustomerShopScope
): Promise<{ count: number; error: { message?: string; code?: string } | null }> {
  let query = supabase.from('customers').select('id', { count: 'exact', head: true });
  query = applyCustomerShopScope(query, options.shopId, options.isFounder);
  const { count, error } = await query;
  if (error) {
    return { count: 0, error: { message: error.message, code: error.code } };
  }
  return { count: count ?? 0, error: null };
}

export async function listShopCustomersPage(
  supabase: SupabaseClient,
  options: CustomerShopScope & {
    page?: number;
    pageSize?: number;
  }
): Promise<{ data: CustomerSearchRow[]; error: { message?: string; code?: string } | null }> {
  const pageSize = options.pageSize ?? CUSTOMER_PAGE_SIZE;
  const page = Math.max(0, options.page ?? 0);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  query = applyCustomerShopScope(query, options.shopId, options.isFounder);
  const { data, error } = await query;
  if (error) {
    return { data: [], error: { message: error.message, code: error.code } };
  }
  return {
    data: ((data || []) as Record<string, unknown>[]).map(normalizeCustomerRow),
    error: null,
  };
}

export function canQueryShopCustomers(shopId: string | null | undefined, isFounder: boolean): boolean {
  return Boolean(shopId) || isFounder;
}

export type CustomerEmailLookupRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  shop_id: string | null;
};

export type CustomerEmailRecipientResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'not_found' | 'missing_email' };

/** Resolve a saved customer row for outbound email. Does not use paginated UI state. */
export function resolveCustomerEmailRecipient(
  customer: CustomerEmailLookupRow | null | undefined
): CustomerEmailRecipientResult {
  if (!customer) {
    return { ok: false, reason: 'not_found' };
  }
  const email = String(customer.email || '').trim();
  if (!email) {
    return { ok: false, reason: 'missing_email' };
  }
  return { ok: true, email };
}

export async function fetchCustomerById(
  supabase: SupabaseClient,
  options: CustomerShopScope & { customerId: string | null | undefined }
): Promise<{ data: CustomerEmailLookupRow | null; error: { message?: string; code?: string } | null }> {
  const customerId = String(options.customerId || '').trim();
  if (!customerId) {
    return { data: null, error: null };
  }

  let query = supabase
    .from('customers')
    .select('id, first_name, last_name, email, phone, shop_id')
    .eq('id', customerId);
  query = applyCustomerShopScope(query, options.shopId, options.isFounder);
  const { data, error } = await query.maybeSingle();
  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  if (!data) {
    return { data: null, error: null };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      id: String(row.id),
      first_name: (row.first_name as string | null) ?? null,
      last_name: (row.last_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      shop_id: (row.shop_id as string | null) ?? null,
    },
    error: null,
  };
}

export function buildCustomerSearchOrFilter(searchTerm: string): string | null {
  const trimmed = searchTerm.trim();
  if (!trimmed) return null;

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const filters = [
    `first_name.ilike.${pattern}`,
    `last_name.ilike.${pattern}`,
    `company.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `phone.ilike.${pattern}`,
  ];

  const phonePattern = buildPhoneDigitIlikePattern(trimmed);
  if (phonePattern) {
    filters.push(`phone.ilike.${phonePattern}`);
  }

  const words = trimmed.split(/\s+/).filter((word) => word.length >= 2);
  if (words.length >= 2) {
    const first = `%${escapeIlikePattern(words[0])}%`;
    const last = `%${escapeIlikePattern(words[words.length - 1])}%`;
    filters.push(`first_name.ilike.${first}`);
    filters.push(`last_name.ilike.${last}`);
  }

  return filters.join(',');
}

export async function searchShopCustomers(
  supabase: SupabaseClient,
  options: CustomerShopScope & {
    searchTerm: string;
    limit?: number;
  }
): Promise<{ data: CustomerSearchRow[]; error: { message?: string; code?: string } | null }> {
  const trimmed = options.searchTerm.trim();
  if (!trimmed) return { data: [], error: null };

  const limit = options.limit ?? CUSTOMER_SEARCH_LIMIT;
  const orFilter = buildCustomerSearchOrFilter(trimmed);
  if (!orFilter) return { data: [], error: null };

  let query = supabase
    .from('customers')
    .select('*')
    .or(orFilter)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  query = applyCustomerShopScope(query, options.shopId, options.isFounder);
  const { data, error } = await query;
  if (error) {
    return { data: [], error: { message: error.message, code: error.code } };
  }
  return {
    data: ((data || []) as Record<string, unknown>[]).map(normalizeCustomerRow),
    error: null,
  };
}
