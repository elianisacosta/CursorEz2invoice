import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POSTGREST_PAGE_SIZE } from '../postgrestPagination.ts';
import { calculateInvoiceFinancials } from './invoicePaymentSummary.ts';
import {
  aggregateInvoiceSummaryRow,
  loadShopInvoiceSummary,
} from './listShopInvoices.ts';

const CARD_FEE_PERCENTAGE = 2.5;
const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

/** Pre-change client summary: filteredInvoicesForList reduce via getInvoiceFinancialsForInvoice. */
function computeLegacyClientSummary(
  rows: Record<string, unknown>[],
  cardFeePercentage: number
) {
  let totalDueToday = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  for (const row of rows) {
    const financials = calculateInvoiceFinancials(
      {
        subtotal: row.subtotal as number | null,
        tax_amount: row.tax_amount as number | null,
        total_amount: row.total_amount as number | null,
        paid_amount: row.paid_amount as number | null,
        apply_card_fee: row.apply_card_fee as boolean | null,
      },
      [],
      { cardFeePercentage, allowLegacyFallback: true }
    );
    totalDueToday += financials.totalDueToday;
    totalPaid += financials.paidTowardInvoice;
    const dueDate = row.due_date ? String(row.due_date) : '';
    if (
      financials.totalDueToday > 0.01 &&
      dueDate &&
      new Date(dueDate) < new Date()
    ) {
      overdueCount += 1;
    }
  }
  return {
    totalDueToday: round2(totalDueToday),
    totalPaid: round2(totalPaid),
    totalOutstanding: round2(totalDueToday),
    overdueCount,
  };
}

function computeNewSummaryAccumulator(
  rows: Record<string, unknown>[],
  cardFeePercentage: number
) {
  const accum = { totalDueToday: 0, totalPaid: 0, overdueCount: 0 };
  for (const row of rows) {
    aggregateInvoiceSummaryRow(row, cardFeePercentage, accum);
  }
  return {
    totalDueToday: round2(accum.totalDueToday),
    totalPaid: round2(accum.totalPaid),
    totalOutstanding: round2(accum.totalDueToday),
    overdueCount: accum.overdueCount,
  };
}

const PARITY_FIXTURES: Record<string, unknown>[] = [
  {
    id: 'inv-partial',
    total_amount: 500,
    paid_amount: 200,
    subtotal: 500,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2026-12-31',
    status: 'sent',
  },
  {
    id: 'inv-card-fee',
    total_amount: 1000,
    paid_amount: 400,
    subtotal: 1000,
    tax_amount: 0,
    apply_card_fee: true,
    due_date: '2026-12-31',
    status: 'sent',
  },
  {
    id: 'inv-no-payments',
    total_amount: 250,
    paid_amount: 0,
    subtotal: 250,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2026-12-31',
    status: 'sent',
  },
  {
    id: 'inv-paid',
    total_amount: 300,
    paid_amount: 300,
    subtotal: 300,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2020-01-01',
    status: 'sent',
  },
  {
    id: 'inv-overdue',
    total_amount: 150,
    paid_amount: 0,
    subtotal: 150,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2020-06-01',
    status: 'sent',
  },
  {
    id: 'inv-draft',
    total_amount: 0,
    paid_amount: 0,
    subtotal: 0,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2026-12-31',
    status: 'draft',
  },
  {
    id: 'inv-unpaid',
    total_amount: 75,
    paid_amount: 0,
    subtotal: 75,
    tax_amount: 0,
    apply_card_fee: false,
    due_date: '2026-12-31',
    status: 'sent',
  },
];

function createSummaryMockSupabase(rows: Record<string, unknown>[]) {
  return {
    from(table: string) {
      assert.equal(table, 'invoice_balances_v');
      return {
        select(columns: string, options?: { count?: string; head?: boolean }) {
          if (options?.head) {
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
                resolve({ count: rows.length, error: null });
              },
            };
          }
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
                  resolve: (value: { data: Record<string, unknown>[]; error: null }) => void
                ) {
                  resolve({ data: rows.slice(from, to + 1), error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('invoice summary financial parity', () => {
  it('legacy client reduce matches aggregateInvoiceSummaryRow for mixed fixtures', () => {
    const legacy = computeLegacyClientSummary(PARITY_FIXTURES, CARD_FEE_PERCENTAGE);
    const next = computeNewSummaryAccumulator(PARITY_FIXTURES, CARD_FEE_PERCENTAGE);
    assert.deepEqual(next, legacy);
  });

  it('loadShopInvoiceSummary matches legacy client reduce for the same dataset', async () => {
    const legacy = computeLegacyClientSummary(PARITY_FIXTURES, CARD_FEE_PERCENTAGE);
    const supabase = createSummaryMockSupabase(PARITY_FIXTURES) as any;
    const result = await loadShopInvoiceSummary(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      cardFeePercentage: CARD_FEE_PERCENTAGE,
    });
    assert.equal(result.error, null);
    assert.equal(result.data.totalDueToday, legacy.totalDueToday);
    assert.equal(result.data.totalPaid, legacy.totalPaid);
    assert.equal(result.data.totalOutstanding, legacy.totalOutstanding);
    assert.equal(result.data.overdueCount, legacy.overdueCount);
    assert.equal(result.data.filteredCount, PARITY_FIXTURES.length);
  });

  it('reports individual parity fields for audit trail', () => {
    const legacy = computeLegacyClientSummary(PARITY_FIXTURES, CARD_FEE_PERCENTAGE);
    assert.equal(legacy.totalDueToday, 1390);
    assert.equal(legacy.totalPaid, 900);
    assert.equal(legacy.totalOutstanding, 1390);
    assert.equal(legacy.overdueCount, 1);
  });
});
