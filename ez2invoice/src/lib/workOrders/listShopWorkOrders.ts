import type { SupabaseClient } from '@supabase/supabase-js';
import {
  POSTGREST_PAGE_SIZE,
  applyShopScope,
  fetchAllPagedRows,
  pageRange,
  type ShopScope,
} from '../postgrestPagination.ts';
import { buildPhoneDigitIlikePattern } from '../customers/searchCustomers.ts';

export { POSTGREST_PAGE_SIZE };
export const WORK_ORDER_DEFAULT_PAGE_SIZE = 25;

export type WorkOrderListFilter = 'all' | 'waiting' | 'in_progress' | 'on_hold' | 'completed';

export type WorkOrderListRow = {
  id: string;
  customer: string;
  truck: string;
  status: string;
  bay: string;
  work_order_number: string;
  customer_id: string | null;
  truck_id: string | null;
  bay_id: string | null;
  priority: string | null;
  description: string;
  notes: string;
  created_at: string | null;
  truck_number: string;
  vin: string;
  make: string;
  model: string;
  year: number | null;
  estimated_hours: number | null;
  service_title: string;
  customer_phone: string;
  mechanic: string | null;
  updated_at: string | null;
};

export type WorkOrderListFilters = ShopScope & {
  statusFilter?: WorkOrderListFilter;
  phoneSearch?: string;
  customerIds?: string[];
};

export type WorkOrderSummary = {
  totalCount: number;
  waitingCount: number;
  inProgressCount: number;
  onHoldCount: number;
  completedCount: number;
};

const WORK_ORDER_SELECT = `
  *,
  customers (first_name, last_name, email, phone),
  trucks (make, model, vin, license_plate, year),
  service_bays (bay_name, bay_number)
`;

function normalizeStatus(value: string | null | undefined): string {
  return String(value || '').toLowerCase().replace(/\s+/g, '_');
}

export function workOrderMatchesStatusFilter(
  status: string | null | undefined,
  filter: WorkOrderListFilter
): boolean {
  if (filter === 'all') return true;
  const normalized = normalizeStatus(status);
  switch (filter) {
    case 'waiting':
      return normalized === 'pending' || normalized === 'waiting';
    case 'in_progress':
      return normalized === 'in_progress' || normalized === 'in progress'.replace(/\s+/g, '_');
    case 'on_hold':
      return normalized === 'on_hold' || normalized === 'onhold';
    case 'completed':
      return normalized === 'completed';
    default:
      return true;
  }
}

function buildWorkOrderStatusOrFilter(filter: WorkOrderListFilter): string | null {
  switch (filter) {
    case 'waiting':
      return 'status.eq.pending,status.eq.waiting';
    case 'in_progress':
      return 'status.eq.in_progress,status.eq.in progress';
    case 'on_hold':
      return 'status.eq.on_hold,status.eq.on hold,status.eq.onhold';
    case 'completed':
      return 'status.eq.completed';
    default:
      return null;
  }
}

export function transformWorkOrderRow(wo: Record<string, unknown>, sequentialNumber?: number): WorkOrderListRow {
  const customers = wo.customers as Record<string, unknown> | null | undefined;
  const trucks = wo.trucks as Record<string, unknown> | null | undefined;
  const serviceBays = wo.service_bays as Record<string, unknown> | null | undefined;
  const dbNumber = wo.work_order_number != null ? String(wo.work_order_number).trim() : '';
  const isLongFormat = dbNumber.length > 0 && /^WO-\d{10,}$/.test(dbNumber);
  const workOrderNumber =
    dbNumber && !isLongFormat
      ? dbNumber
      : sequentialNumber != null
        ? `Work Order ${sequentialNumber}`
        : dbNumber || `Work Order ${String(wo.id).slice(0, 8)}`;
  const descriptionParts = wo.description ? String(wo.description).split(' - ') : [];
  const serviceTitle = descriptionParts[0] || String(wo.description || '');
  const description =
    descriptionParts.length > 1 ? descriptionParts.slice(1).join(' - ') : '';

  return {
    id: String(wo.id),
    customer: customers
      ? `${customers.first_name || ''} ${customers.last_name || ''}`.trim() || 'Unknown'
      : 'Unknown',
    truck: trucks ? `${trucks.make || ''} ${trucks.model || ''}`.trim() || 'Unknown' : 'Unknown',
    status: String(wo.status || 'pending'),
    bay: serviceBays
      ? String(serviceBays.bay_name || `Bay ${serviceBays.bay_number}`)
      : 'Bay TBD',
    work_order_number: workOrderNumber,
    customer_id: (wo.customer_id as string | null) ?? null,
    truck_id: (wo.truck_id as string | null) ?? null,
    bay_id: (wo.bay_id as string | null) ?? null,
    priority: (wo.priority as string | null) ?? null,
    description: description || String(wo.description || ''),
    notes: String(wo.notes || ''),
    created_at: (wo.created_at as string | null) ?? null,
    truck_number: String(trucks?.license_plate || '').trim(),
    vin: String(trucks?.vin || ''),
    make: String(trucks?.make || ''),
    model: String(trucks?.model || ''),
    year: trucks?.year == null ? null : Number(trucks.year) || null,
    estimated_hours: wo.estimated_hours == null ? null : Number(wo.estimated_hours) || null,
    service_title: serviceTitle,
    customer_phone: String(customers?.phone || ''),
    mechanic: (wo.employee_id as string | null) ?? (wo.mechanic as string | null) ?? null,
    updated_at: (wo.updated_at as string | null) ?? null,
  };
}

function applyWorkOrderListFilters<
  T extends {
    or: (filters: string) => T;
    in: (column: string, values: string[]) => T;
  }
>(query: T, options: WorkOrderListFilters): T {
  let next = applyShopScope(
    query as unknown as Parameters<typeof applyShopScope>[0],
    options.shopId,
    options.isFounder
  ) as unknown as T;
  const statusOr = buildWorkOrderStatusOrFilter(options.statusFilter || 'all');
  if (statusOr) next = next.or(statusOr);
  if (options.customerIds && options.customerIds.length > 0) {
    next = next.in('customer_id', options.customerIds);
  }
  return next;
}

export async function resolveWorkOrderCustomerIdsByPhone(
  supabase: SupabaseClient,
  options: ShopScope & { phoneSearch: string }
): Promise<string[]> {
  const digits = options.phoneSearch.replace(/\D/g, '');
  if (digits.length < 3) return [];
  const phonePattern = buildPhoneDigitIlikePattern(options.phoneSearch);
  if (!phonePattern) return [];
  let query = supabase
    .from('customers')
    .select('id')
    .or(`phone.ilike.${phonePattern}`)
    .limit(200);
  query = applyShopScope(query, options.shopId, options.isFounder);
  const { data } = await query;
  return (data || []).map((row) => String((row as { id: string }).id));
}

export async function countShopWorkOrders(
  supabase: SupabaseClient,
  options: WorkOrderListFilters
): Promise<{ count: number; error: { message?: string; code?: string } | null }> {
  let query = supabase.from('work_orders').select('id', { count: 'exact', head: true });
  query = applyWorkOrderListFilters(query, options);
  const { count, error } = await query;
  if (error) return { count: 0, error: { message: error.message, code: error.code } };
  return { count: count ?? 0, error: null };
}

export async function loadShopWorkOrderSummary(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: WorkOrderSummary; error: { message?: string; code?: string } | null }> {
  const countResult = await countShopWorkOrders(supabase, { ...options, statusFilter: 'all' });
  if (countResult.error) {
    return {
      data: { totalCount: 0, waitingCount: 0, inProgressCount: 0, onHoldCount: 0, completedCount: 0 },
      error: countResult.error,
    };
  }

  let waitingCount = 0;
  let inProgressCount = 0;
  let onHoldCount = 0;
  let completedCount = 0;
  let from = 0;
  for (;;) {
    let query = supabase
      .from('work_orders')
      .select('status')
      .order('id', { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    if (error) {
      return {
        data: {
          totalCount: countResult.count,
          waitingCount: 0,
          inProgressCount: 0,
          onHoldCount: 0,
          completedCount: 0,
        },
        error: { message: error.message, code: error.code },
      };
    }
    const batch = data || [];
    for (const row of batch) {
      const status = String(row.status || '');
      if (workOrderMatchesStatusFilter(status, 'waiting')) waitingCount += 1;
      if (workOrderMatchesStatusFilter(status, 'in_progress')) inProgressCount += 1;
      if (workOrderMatchesStatusFilter(status, 'on_hold')) onHoldCount += 1;
      if (workOrderMatchesStatusFilter(status, 'completed')) completedCount += 1;
    }
    if (batch.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  return {
    data: {
      totalCount: countResult.count,
      waitingCount,
      inProgressCount,
      onHoldCount,
      completedCount,
    },
    error: null,
  };
}

export async function listShopWorkOrdersPage(
  supabase: SupabaseClient,
  options: WorkOrderListFilters & { page?: number; pageSize?: number }
): Promise<{
  data: WorkOrderListRow[];
  count: number;
  error: { message?: string; code?: string } | null;
}> {
  const pageSize = Math.max(1, options.pageSize ?? WORK_ORDER_DEFAULT_PAGE_SIZE);
  const { from, to } = pageRange(options.page ?? 0, pageSize);
  let query = supabase
    .from('work_orders')
    .select(WORK_ORDER_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  query = applyWorkOrderListFilters(query, options);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: { message: error.message, code: error.code } };
  return {
    data: ((data || []) as Record<string, unknown>[]).map((row) => transformWorkOrderRow(row)),
    count: count ?? 0,
    error: null,
  };
}

export async function fetchAllShopWorkOrders(
  supabase: SupabaseClient,
  options: ShopScope
): Promise<{ data: WorkOrderListRow[]; error: { message?: string; code?: string } | null }> {
  const result = await fetchAllPagedRows<Record<string, unknown>>(async (from, to) => {
    let query = supabase
      .from('work_orders')
      .select(WORK_ORDER_SELECT)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);
    query = applyShopScope(query, options.shopId, options.isFounder);
    const { data, error } = await query;
    return { data: (data || []) as Record<string, unknown>[], error: error ? { message: error.message, code: error.code } : null };
  });

  if (result.error) return { data: [], error: result.error };

  const transformed = result.data.map((row, index) => transformWorkOrderRow(row, index + 1));
  transformed.sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });
  return { data: transformed, error: null };
}
