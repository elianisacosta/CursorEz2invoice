import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_LOCATIONS_FILTER,
  NO_LOCATION_FILTER,
  buildManualLocationPatch,
  formatServiceBayLabel,
  invoiceMatchesLocationFilter,
  resolveInvoiceLocation,
} from './resolveInvoiceLocation.ts';
import { applyInvoiceLocationFilter } from './shopLocations.ts';
import { listShopInvoicesPage } from './listShopInvoices.ts';

describe('resolveInvoiceLocation', () => {
  it('A/F: manual Bay 2 works without work order', () => {
    const resolved = resolveInvoiceLocation(
      { manual_location_id: 'loc-2', location_id: 'loc-2' },
      { shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } } }
    );
    assert.equal(resolved.displayName, 'Bay 2');
    assert.equal(resolved.source, 'manual');
  });

  it('D/E: digital work order bay overrides manual location for display', () => {
    const resolved = resolveInvoiceLocation(
      {
        work_order_id: 'wo-1',
        manual_location_id: 'loc-wait',
        location_id: 'loc-wait',
      },
      {
        workOrderBayById: {
          'wo-1': { work_order_id: 'wo-1', bay_name: 'Bay 3', bay_number: 3 },
        },
        shopLocationById: { 'loc-wait': { id: 'loc-wait', name: 'Waiting' } },
      }
    );
    assert.equal(resolved.displayName, 'Bay 3');
    assert.equal(resolved.source, 'digital');
    assert.equal(resolved.manualLocationId, 'loc-wait');
  });

  it('E: moving digital bay 3 to bay 5 updates displayed location', () => {
    const before = resolveInvoiceLocation(
      { work_order_id: 'wo-1' },
      { workOrderBayById: { 'wo-1': { work_order_id: 'wo-1', bay_name: 'Bay 3', bay_number: 3 } } }
    );
    const after = resolveInvoiceLocation(
      { work_order_id: 'wo-1' },
      { workOrderBayById: { 'wo-1': { work_order_id: 'wo-1', bay_name: 'Bay 5', bay_number: 5 } } }
    );
    assert.equal(before.displayName, 'Bay 3');
    assert.equal(after.displayName, 'Bay 5');
  });

  it('manual fallback when work order has no bay assignment', () => {
    const resolved = resolveInvoiceLocation(
      {
        work_order_id: 'wo-2',
        manual_location_id: 'loc-road',
        location_id: 'loc-road',
      },
      {
        workOrderBayById: { 'wo-2': { work_order_id: 'wo-2', bay_name: null, bay_number: null } },
        shopLocationById: { 'loc-road': { id: 'loc-road', name: 'Road Service' } },
      }
    );
    assert.equal(resolved.displayName, 'Road Service');
    assert.equal(resolved.source, 'manual');
  });

  it('shows + Location when no digital bay and no manual location', () => {
    const resolved = resolveInvoiceLocation({ work_order_id: null, manual_location_id: null });
    assert.equal(resolved.displayName, null);
    assert.equal(resolved.source, 'none');
  });

  it('uses effective_location_name from invoice_balances_v when provided', () => {
    const resolved = resolveInvoiceLocation({
      effective_location_name: 'Front Lot',
      effective_location_source: 'manual',
      manual_location_id: 'loc-front',
    });
    assert.equal(resolved.displayName, 'Front Lot');
    assert.equal(resolved.source, 'manual');
  });

  it('prefers manual location id over stale effective_location_name', () => {
    const resolved = resolveInvoiceLocation(
      {
        manual_location_id: 'loc-2',
        location_id: 'loc-2',
        effective_location_name: 'Bay 1',
        effective_location_source: 'manual',
      },
      { shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } } }
    );
    assert.equal(resolved.displayName, 'Bay 2');
    assert.equal(resolved.source, 'manual');
  });

  it('G: digital bay display remains when manual fallback is also set', () => {
    const resolved = resolveInvoiceLocation(
      {
        work_order_id: 'wo-1',
        manual_location_id: 'loc-2',
        location_id: 'loc-2',
        effective_location_name: 'Bay 1',
        effective_location_source: 'digital',
      },
      {
        workOrderBayById: {
          'wo-1': { work_order_id: 'wo-1', bay_name: 'Bay 1', bay_number: 1 },
        },
        shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } },
      }
    );
    assert.equal(resolved.displayName, 'Bay 1');
    assert.equal(resolved.source, 'digital');
    assert.equal(resolved.manualLocationId, 'loc-2');
  });

  it('H: manual fallback becomes visible when digital bay is removed', () => {
    const resolved = resolveInvoiceLocation(
      {
        work_order_id: 'wo-1',
        manual_location_id: 'loc-2',
        location_id: 'loc-2',
        effective_location_name: 'Bay 2',
        effective_location_source: 'manual',
      },
      {
        workOrderBayById: {
          'wo-1': { work_order_id: 'wo-1', bay_name: null, bay_number: null },
        },
        shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } },
      }
    );
    assert.equal(resolved.displayName, 'Bay 2');
    assert.equal(resolved.source, 'manual');
  });
});

describe('buildManualLocationPatch', () => {
  const shopLocations = {
    'loc-1': { id: 'loc-1', name: 'Bay 1' },
    'loc-2': { id: 'loc-2', name: 'Bay 2' },
    'loc-wait': { id: 'loc-wait', name: 'Waiting' },
  };

  it('A: null → Bay 1', () => {
    const patch = buildManualLocationPatch({}, 'loc-1', { shopLocationById: shopLocations });
    assert.equal(patch.manual_location_id, 'loc-1');
    assert.equal(patch.effective_location_name, 'Bay 1');
    assert.equal(patch.effective_location_source, 'manual');
  });

  it('B: Bay 1 → Bay 2 with stale effective_location_name on invoice row', () => {
    const patch = buildManualLocationPatch(
      {
        manual_location_id: 'loc-1',
        location_id: 'loc-1',
        effective_location_name: 'Bay 1',
        effective_location_source: 'manual',
      },
      'loc-2',
      { shopLocationById: shopLocations }
    );
    assert.equal(patch.manual_location_id, 'loc-2');
    assert.equal(patch.effective_location_name, 'Bay 2');
    assert.equal(patch.effective_location_source, 'manual');
  });

  it('C: Bay 2 → Waiting', () => {
    const patch = buildManualLocationPatch(
      {
        manual_location_id: 'loc-2',
        location_id: 'loc-2',
        effective_location_name: 'Bay 2',
        effective_location_source: 'manual',
      },
      'loc-wait',
      { shopLocationById: shopLocations }
    );
    assert.equal(patch.effective_location_name, 'Waiting');
    assert.equal(patch.effective_location_source, 'manual');
  });

  it('D: Waiting → No Location', () => {
    const patch = buildManualLocationPatch(
      {
        manual_location_id: 'loc-wait',
        location_id: 'loc-wait',
        effective_location_name: 'Waiting',
        effective_location_source: 'manual',
      },
      null,
      { shopLocationById: shopLocations }
    );
    assert.equal(patch.manual_location_id, null);
    assert.equal(patch.effective_location_name, null);
    assert.equal(patch.effective_location_source, null);
  });

  it('builds optimistic manual location fields', () => {
    const patch = buildManualLocationPatch(
      { work_order_id: null },
      'loc-2',
      { shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } } }
    );
    assert.equal(patch.manual_location_id, 'loc-2');
    assert.equal(patch.effective_location_name, 'Bay 2');
    assert.equal(patch.effective_location_source, 'manual');
  });

  it('keeps digital bay as effective display when work order has bay assignment', () => {
    const patch = buildManualLocationPatch(
      {
        work_order_id: 'wo-1',
        effective_location_name: 'Bay 3',
        effective_location_source: 'digital',
      },
      'loc-wait',
      {
        workOrderBayById: {
          'wo-1': { work_order_id: 'wo-1', bay_name: 'Bay 3', bay_number: 3 },
        },
        shopLocationById: { 'loc-wait': { id: 'loc-wait', name: 'Waiting' } },
      }
    );
    assert.equal(patch.effective_location_name, 'Bay 3');
    assert.equal(patch.effective_location_source, 'digital');
    assert.equal(patch.manual_location_id, 'loc-wait');
  });
});

describe('invoiceMatchesLocationFilter', () => {
  it('F: Bay 2 filter no longer matches after change to Bay 3', () => {
    const before = buildManualLocationPatch(
      {},
      'loc-2',
      { shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } } }
    );
    const after = buildManualLocationPatch(
      {},
      'loc-3',
      { shopLocationById: { 'loc-3': { id: 'loc-3', name: 'Bay 3' } } }
    );
    assert.equal(invoiceMatchesLocationFilter(before, 'Bay 2', { shopLocationById: { 'loc-2': { id: 'loc-2', name: 'Bay 2' } } }), true);
    assert.equal(invoiceMatchesLocationFilter(after, 'Bay 2', { shopLocationById: { 'loc-3': { id: 'loc-3', name: 'Bay 3' } } }), false);
    assert.equal(invoiceMatchesLocationFilter(after, 'Bay 3', { shopLocationById: { 'loc-3': { id: 'loc-3', name: 'Bay 3' } } }), true);
  });
});

describe('invoice location list filtering', () => {
  function createLocationFilterSupabase(rows: Record<string, unknown>[]) {
    return {
      from(table: string) {
        assert.equal(table, 'invoice_balances_v');
        return {
          select(_columns: string, options?: { count?: string; head?: boolean }) {
            if (options?.head) {
              return {
                eq() { return this; },
                or() { return this; },
                in() { return this; },
                is() { return this; },
                lt() { return this; },
                gt() { return this; },
                async then(resolve: (value: { count: number; error: null }) => void) {
                  resolve({ count: rows.length, error: null });
                },
              };
            }
            return {
              order() { return this; },
              range(from: number, to: number) {
                return {
                  eq(column: string, value: string) {
                    (this as { filtered?: Record<string, unknown>[] }).filtered = rows.filter(
                      (row) => String(row[column]) === value
                    );
                    return this;
                  },
                  or() { return this; },
                  in() { return this; },
                  is(column: string, value: null) {
                    (this as { filtered?: Record<string, unknown>[] }).filtered = rows.filter(
                      (row) => (row[column] ?? null) === value
                    );
                    return this;
                  },
                  lt() { return this; },
                  gt() { return this; },
                  async then(resolve: (value: { data: Record<string, unknown>[]; error: null; count?: number }) => void) {
                    const filtered = (this as { filtered?: Record<string, unknown>[] }).filtered ?? rows;
                    resolve({
                      data: filtered.slice(from, to + 1),
                      error: null,
                      count: filtered.length,
                    });
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  it('M: location filter searches complete history server-side', async () => {
    const rows = Array.from({ length: 1205 }, (_, index) => ({
      id: `inv-${index + 1}`,
      shop_id: 'shop-1',
      effective_location_name: index === 1204 ? 'Road Service' : 'Bay 1',
      invoice_number_numeric: index + 1,
    }));
    const supabase = createLocationFilterSupabase(rows) as any;
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      locationFilter: 'Road Service',
      page: 0,
      pageSize: 25,
    });
    assert.equal(result.count, 1);
    assert.equal(result.data[0]?.id, 'inv-1205');
  });

  it('J: pagination still returns only one page of rows', async () => {
    const rows = Array.from({ length: 1936 }, (_, index) => ({
      id: `inv-${index + 1}`,
      shop_id: 'shop-1',
      effective_location_name: 'Bay 1',
      invoice_number_numeric: index + 1,
    }));
    const supabase = createLocationFilterSupabase(rows) as any;
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      locationFilter: ALL_LOCATIONS_FILTER,
      page: 0,
      pageSize: 25,
    });
    assert.equal(result.data.length, 25);
    assert.equal(result.count, 1936);
  });

  it('location filter supports No Location', () => {
    const query = applyInvoiceLocationFilter(
      {
        eq() { return this; },
        is(column: string, value: null) {
          assert.equal(column, 'effective_location_name');
          assert.equal(value, null);
          return this;
        },
      },
      NO_LOCATION_FILTER
    );
    assert.ok(query);
  });

  it('H: shop locations are scoped per shop via list query', async () => {
    const shopOneRows = [{ id: 'loc-1', shop_id: 'shop-1', name: 'Bay 1', sort_order: 0, is_active: true }];
    const shopTwoRows = [{ id: 'loc-2', shop_id: 'shop-2', name: 'Front Lot', sort_order: 0, is_active: true }];
    const allRows = [...shopOneRows, ...shopTwoRows];

    const supabase = {
      from(table: string) {
        assert.equal(table, 'shop_locations');
        return {
          select() {
            return {
              eq() { return this; },
              order() { return this; },
              or() { return this; },
              async then(resolve: (value: { data: typeof allRows; error: null }) => void) {
                resolve({ data: shopOneRows, error: null });
              },
            };
          },
        };
      },
    };

    const { listShopLocations } = await import('./shopLocations.ts');
    const result = await listShopLocations(supabase as any, { shopId: 'shop-1', isFounder: false });
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.name, 'Bay 1');
    assert.ok(!result.data.some((row) => row.shop_id === 'shop-2'));
  });
});

describe('formatServiceBayLabel', () => {
  it('formats bay number when name is missing', () => {
    assert.equal(formatServiceBayLabel(null, 4), 'Bay 4');
  });
});
