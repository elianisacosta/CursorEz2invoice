import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  fetchCustomerById,
  resolveCustomerEmailRecipient,
} from '../customers/searchCustomers.ts';
import { INVOICE_DEFAULT_PAGE_SIZE, listShopInvoicesPage } from './listShopInvoices.ts';
import { logInvoiceListPerformance, getLastInvoiceListPerformance } from './invoiceListPerformance.ts';

const ELIANIS_CUSTOMER_ID = '111419a7-ebd5-4b1b-9d2e-70a4843d5908';
const ELIANIS_INVOICE_ID = 'inv-002325';

function buildFirstPageCustomers(pageSize = 50) {
  return Array.from({ length: pageSize }, (_, index) => ({
    id: `cust-page1-${index}`,
    first_name: 'Page',
    last_name: String(index),
    email: `customer${index}@example.com`,
    phone: null,
    shop_id: 'shop-1',
  }));
}

function buildInvoiceRow(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `inv-${index}`,
    shop_id: 'shop-1',
    customer_id: `cust-${index}`,
    invoice_number: String(index).padStart(6, '0'),
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

function createCustomerFilteredSupabase(rows: Record<string, unknown>[]) {
  let listCalls = 0;
  const supabase = {
    from(table: string) {
      assert.equal(table, 'invoice_balances_v');
      return {
        select(_columns: string, options?: { count?: string; head?: boolean }) {
          if (options?.head) {
            return {
              eq() {
                return this;
              },
              or() {
                return this;
              },
              in(_column: string, values: string[]) {
                (this as { filteredIds?: string[] }).filteredIds = values;
                return this;
              },
              lt() {
                return this;
              },
              gt() {
                return this;
              },
              async then(resolve: (value: { count: number; error: null }) => void) {
                const filteredIds = (this as { filteredIds?: string[] }).filteredIds;
                const count = filteredIds
                  ? rows.filter((row) => filteredIds.includes(String(row.customer_id))).length
                  : rows.length;
                resolve({ count, error: null });
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
                in(_column: string, values: string[]) {
                  (this as { filteredIds?: string[] }).filteredIds = values;
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
                  listCalls += 1;
                  const filteredIds = (this as { filteredIds?: string[] }).filteredIds;
                  const scoped = filteredIds
                    ? rows.filter((row) => filteredIds.includes(String(row.customer_id)))
                    : rows;
                  resolve({
                    data: scoped.slice(from, to + 1),
                    error: null,
                    count: scoped.length,
                  });
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase: supabase as any, getListCalls: () => listCalls };
}

describe('invoice regression scenarios E and I', () => {
  it('E: customer outside first customer page finds invoice via server-side customerIds filter', async () => {
    const firstPageCustomers = buildFirstPageCustomers();
    assert.equal(
      firstPageCustomers.some((customer) => customer.id === ELIANIS_CUSTOMER_ID),
      false
    );

    const rows = Array.from({ length: 1936 }, (_, index) => buildInvoiceRow(index + 1));
    rows[324] = buildInvoiceRow(325, {
      id: ELIANIS_INVOICE_ID,
      customer_id: ELIANIS_CUSTOMER_ID,
      invoice_number: '002325',
      invoice_number_numeric: 2325,
    });

    const customerIdsFromServerSearch = [ELIANIS_CUSTOMER_ID];
    const { supabase, getListCalls } = createCustomerFilteredSupabase(rows);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      customerIds: customerIdsFromServerSearch,
      searchTerm: 'Elianis Acosta',
      page: 0,
      pageSize: INVOICE_DEFAULT_PAGE_SIZE,
    });

    assert.equal(result.error, null);
    assert.equal(result.count, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.id, ELIANIS_INVOICE_ID);
    assert.equal(getListCalls(), 1);
    assert.equal(
      firstPageCustomers.find((customer) => customer.id === ELIANIS_CUSTOMER_ID),
      undefined
    );
  });

  it('I: send invoice resolves recipient by customer_id when customer is outside paginated UI', async () => {
    const firstPageCustomers = buildFirstPageCustomers();
    const fromPaginatedUi = firstPageCustomers.find((customer) => customer.id === ELIANIS_CUSTOMER_ID);
    assert.equal(fromPaginatedUi, undefined);

    const customerFromByIdLookup = {
      id: ELIANIS_CUSTOMER_ID,
      first_name: 'Elianis',
      last_name: 'Acosta',
      email: 'acostaelianis@yahoo.com',
      phone: '5027673961',
      shop_id: 'ebce8e4b-a765-4243-aa81-3219663534c2',
    };

    const recipient = resolveCustomerEmailRecipient(customerFromByIdLookup);
    assert.equal(recipient.ok, true);
    if (recipient.ok) {
      assert.equal(recipient.email, 'acostaelianis@yahoo.com');
    }

    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf8'
    );
    const sendInvoiceBlock = dashboardSource.slice(
      dashboardSource.indexOf('const handleSendInvoice = async'),
      dashboardSource.indexOf('const handleSendEstimate = async')
    );
    assert.match(sendInvoiceBlock, /fetchCustomerById\(supabase/);
    assert.match(sendInvoiceBlock, /resolveCustomerEmailRecipient\(customer\)/);
    assert.doesNotMatch(sendInvoiceBlock, /customers\.find\(/);
    assert.doesNotMatch(sendInvoiceBlock, /refreshInvoiceList\(\)/);
  });

  it('I: fetchCustomerById returns Elianis email without paginated customers state', async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return this;
              },
              or() {
                return this;
              },
              async maybeSingle() {
                return {
                  data: {
                    id: ELIANIS_CUSTOMER_ID,
                    first_name: 'Elianis',
                    last_name: 'Acosta',
                    email: 'acostaelianis@yahoo.com',
                    phone: '5027673961',
                    shop_id: 'ebce8e4b-a765-4243-aa81-3219663534c2',
                  },
                  error: null,
                };
              },
            };
          },
        };
      },
    };

    const { data, error } = await fetchCustomerById(supabase as any, {
      shopId: 'ebce8e4b-a765-4243-aa81-3219663534c2',
      isFounder: false,
      customerId: ELIANIS_CUSTOMER_ID,
    });
    assert.equal(error, null);
    const recipient = resolveCustomerEmailRecipient(data);
    assert.equal(recipient.ok, true);
    if (recipient.ok) {
      assert.equal(recipient.email, 'acostaelianis@yahoo.com');
    }
  });
});

describe('invoice tab pagination behavior (production-sized dataset)', () => {
  function createPagedSupabase(totalRows: number) {
    const rows = Array.from({ length: totalRows }, (_, index) => buildInvoiceRow(index + 1));
    let listCalls = 0;
    const supabase = {
      from(table: string) {
        assert.equal(table, 'invoice_balances_v');
        return {
          select(_columns: string, options?: { count?: string; head?: boolean }) {
            if (options?.head) {
              return {
                eq() { return this; },
                or() { return this; },
                in() { return this; },
                lt() { return this; },
                gt() { return this; },
                async then(resolve: (value: { count: number; error: null }) => void) {
                  resolve({ count: totalRows, error: null });
                },
              };
            }
            return {
              order() { return this; },
              range(from: number, to: number) {
                return {
                  eq() { return this; },
                  or() { return this; },
                  in() { return this; },
                  lt() { return this; },
                  gt() { return this; },
                  async then(resolve: (value: { data: Record<string, unknown>[]; error: null; count?: number }) => void) {
                    listCalls += 1;
                    resolve({ data: rows.slice(from, to + 1), error: null, count: totalRows });
                  },
                };
              },
            };
          },
        };
      },
    };
    return { supabase: supabase as any, rows, getListCalls: () => listCalls };
  }

  it('initial load: 25 rows and total count 1936', async () => {
    const { supabase } = createPagedSupabase(1936);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page: 0,
      pageSize: 25,
    });
    assert.equal(result.data.length, 25);
    assert.equal(result.count, 1936);
  });

  it('page 2 retrieves only page 2 rows', async () => {
    const { supabase, rows, getListCalls } = createPagedSupabase(1936);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page: 1,
      pageSize: 25,
    });
    assert.equal(getListCalls(), 1);
    assert.equal(result.data.length, 25);
    assert.equal(result.data[0]?.id, rows[25]?.id);
  });

  it('rows=50 retrieves only 50 invoice rows', async () => {
    const { supabase } = createPagedSupabase(1936);
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      page: 0,
      pageSize: 50,
    });
    assert.equal(result.data.length, 50);
    assert.equal(result.count, 1936);
  });

  it('searching old invoice number uses one paged list query, not full-history download', async () => {
    const { supabase, rows, getListCalls } = createPagedSupabase(1936);
    const oldInvoice = rows[1500];
    const result = await listShopInvoicesPage(supabase, {
      shopId: 'shop-1',
      isFounder: false,
      searchTerm: String(oldInvoice.invoice_number),
      page: 0,
      pageSize: 25,
    });
    assert.equal(getListCalls(), 1);
    assert.equal(result.data.length, 25);
  });

  it('sorting uses listShopInvoicesPage only (no fetchShopInvoicesFromBalancesView in fetchInvoiceList)', () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf8'
    );
    const fetchInvoiceListBlock = dashboardSource.slice(
      dashboardSource.indexOf('const fetchInvoiceList = async'),
      dashboardSource.indexOf('const refreshInvoiceList = async')
    );
    assert.match(fetchInvoiceListBlock, /listShopInvoicesPage\(supabase/);
    assert.doesNotMatch(fetchInvoiceListBlock, /fetchShopInvoicesFromBalancesView/);
  });
});

describe('invoice initial load diagnostics', () => {
  it('records 25 transferred rows and does not imply full-history download', () => {
    logInvoiceListPerformance({
      summaryMs: 120,
      pageMs: 45,
      customerMs: 18,
      invoicesTransferred: 25,
      dbRequests: 3,
    });
    const snapshot = getLastInvoiceListPerformance();
    assert.equal(snapshot?.invoicesTransferred, 25);
    assert.equal(snapshot?.dbRequests, 3);
    assert.notEqual(snapshot?.invoicesTransferred, 1936);
  });

  it('fetchInvoiceList path does not call bulk line-item or payment loaders', () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf8'
    );
    const fetchInvoiceListBlock = dashboardSource.slice(
      dashboardSource.indexOf('const fetchInvoiceList = async'),
      dashboardSource.indexOf('const refreshInvoiceList = async')
    );
    assert.doesNotMatch(fetchInvoiceListBlock, /replaceInvoicePaymentsForInvoices/);
    assert.doesNotMatch(fetchInvoiceListBlock, /fetchAllRowsByInvoiceIds/);
    assert.doesNotMatch(fetchInvoiceListBlock, /fetchShopInvoicesFromBalancesView/);

    const analyticsBlock = dashboardSource.slice(
      dashboardSource.indexOf('const fetchAnalyticsBulkData = async'),
      dashboardSource.indexOf('useEffect(() => {\n    setInvoiceCurrentPage(1);')
    );
    assert.match(analyticsBlock, /fetchShopInvoicesFromBalancesView/);
    assert.match(analyticsBlock, /invoice_line_items/);
    assert.match(analyticsBlock, /invoice_payments/);
  });
});
