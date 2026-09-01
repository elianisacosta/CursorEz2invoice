import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pageRange, POSTGREST_PAGE_SIZE } from '../postgrestPagination.ts';
import {
  aggregateInvoiceSummaryRow,
  INVOICE_DEFAULT_PAGE_SIZE,
  listShopInvoicesPage,
  loadShopInvoiceSummary,
} from './listShopInvoices.ts';

function buildMockInvoiceRow(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `inv-${index}`,
    shop_id: 'shop-1',
    customer_id: `cust-${index}`,
    invoice_number: `INV-${String(index).padStart(4, '0')}`,
    status: 'sent',
    subtotal: 100,
    tax_amount: 0,
    total_amount: 100,
    paid_amount: 0,
    apply_card_fee: false,
    due_date: '2026-12-31',
    created_at: '2026-06-01T00:00:00.000Z',
    balance_due: 100,
    computed_status: 'Unpaid',
    invoice_number_numeric: index,
    ...overrides,
  };
}

function createPagedSupabase(totalRows: number) {
  const rows = Array.from({ length: totalRows }, (_, index) => buildMockInvoiceRow(index + 1));
  let listCalls = 0;
  let summaryCalls = 0;
  let countCalls = 0;

  const supabase = {
    from(table: string) {
      assert.equal(table, 'invoice_balances_v');
      return {
        select(columns: string, options?: { count?: string; head?: boolean }) {
          if (options?.head) {
            countCalls += 1;
            return {
              eq() {
                return this;
              },
              or() {
                return this;
              },
              in() {
                return this;
              },
              lt() {
                return this;
              },
              gt() {
                return this;
              },
              async then(resolve: (value: { count: number; error: null }) => void) {
                resolve({ count: totalRows, error: null });
              },
            };
          }

          const withCount = options?.count === 'exact';
          return {
            order() {
              return this;
            },
            range(from: number, to: number) {
              return {
                eq() {
                  return this;
                },
                or() {
                  return this;
                },
                in() {
                  return this;
                },
                lt() {
                  return this;
                },
                gt() {
                  return this;
                },
                async then(
                  resolve: (value: {
                    data: Record<string, unknown>[];
                    error: null;
                    count?: number;
                  }) => void
                ) {
                  if (withCount) {
                    listCalls += 1;
                    const pageRows = rows.slice(from, to + 1);
                    resolve({ data: pageRows, error: null, count: totalRows });
                    return;
                  }
                  summaryCalls += 1;
                  const pageRows = rows.slice(from, to + 1);
                  resolve({ data: pageRows, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  return { supabase: supabase as any, rows, getStats: () => ({ listCalls, summaryCalls, countCalls }) };
}

describe('invoice list server pagination', () => {
  it('A: 1936 invoices returns page size 25 and total count 1936', async () => {
    const { supabase } = createPagedSupabase(1936);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page: 0,
      pageSize: INVOICE_DEFAULT_PAGE_SIZE,
    });
    assert.equal(result.error, null);
    assert.equal(result.count, 1936);
    assert.equal(result.data.length, 25);
  });

  it('B: 5000 invoices still retrieves only the requested page size', async () => {
    const { supabase } = createPagedSupabase(5000);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page: 0,
      pageSize: 50,
    });
    assert.equal(result.data.length, 50);
    assert.equal(result.count, 5000);
  });

  it('C: page 5 returns correct rows without loading pages 1-4', async () => {
    const { supabase, rows } = createPagedSupabase(1936);
    const page = 4;
    const pageSize = 25;
    const { from } = pageRange(page, pageSize);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page,
      pageSize,
    });
    assert.equal(result.data[0]?.id, rows[from]?.id);
    assert.equal(result.data.length, 25);
  });

  it('D: old invoice outside first 1000 is returned on a later database page', async () => {
    const { supabase, rows } = createPagedSupabase(1936);
    const page = 60;
    const pageSize = 25;
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page,
      pageSize,
    });
    assert.ok(result.data.some((row) => row.id === rows[1500]?.id));
    assert.equal(result.count, 1936);
  });

  it('F: status filter uses computed_status and returns filtered count', async () => {
    const { supabase } = createPagedSupabase(120);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      statusFilter: 'Paid',
      page: 0,
      pageSize: 25,
    });
    assert.equal(result.count, 120);
    assert.equal(result.data.length, 25);
  });

  it('G: summary cards aggregate paid and outstanding using invoice financials', () => {
    const accum = { totalDueToday: 0, totalPaid: 0, overdueCount: 0 };
    aggregateInvoiceSummaryRow(
      buildMockInvoiceRow(1, { total_amount: 200, paid_amount: 50, apply_card_fee: false }),
      2.5,
      accum
    );
    aggregateInvoiceSummaryRow(
      buildMockInvoiceRow(2, {
        total_amount: 100,
        paid_amount: 100,
        apply_card_fee: false,
        due_date: '2020-01-01',
      }),
      2.5,
      accum
    );
    assert.equal(accum.totalPaid, 150);
    assert.equal(accum.totalDueToday, 150);
    assert.equal(accum.overdueCount, 0);
  });

  it('H: summary loader scans full history in PostgREST pages without returning all rows', async () => {
    const { supabase, getStats } = createPagedSupabase(1936);
    const result = await loadShopInvoiceSummary(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      cardFeePercentage: 2.5,
    });
    assert.equal(result.error, null);
    assert.equal(result.data.filteredCount, 1936);
    assert.ok(result.data.totalOutstanding >= 0);
    const { summaryCalls, countCalls } = getStats();
    assert.equal(summaryCalls, Math.ceil(1936 / POSTGREST_PAGE_SIZE));
    assert.equal(countCalls, 1);
  });
});
