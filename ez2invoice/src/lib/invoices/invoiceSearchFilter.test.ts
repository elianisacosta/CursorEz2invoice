import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInvoiceSearchOrFilter,
  filterCustomerIdsForInvoiceSearch,
  invoiceMatchesListSearch,
  parseInvoiceNumberNumericSearch,
  parseInvoiceSearchFromOrFilter,
  shouldIncludeCustomerIdsInInvoiceSearch,
  INVOICE_DEFAULT_PAGE_SIZE,
} from './listShopInvoices.ts';

const ELIANIS_CUSTOMER_ID = '111419a7-ebd5-4b1b-9d2e-70a4843d5908';
const INVOICE_002343_ID = 'inv-002343';
const INVOICE_002343_NUMERIC = 2343;

const PRODUCTION_FIXTURE_ROWS: Record<string, unknown>[] = [
  {
    id: INVOICE_002343_ID,
    shop_id: 'shop-1',
    customer_id: 'cust-other',
    invoice_number: 'INV-002343',
    invoice_number_numeric: INVOICE_002343_NUMERIC,
    notes: 'truck #111',
    status: 'sent',
    computed_status: 'Unpaid',
    balance_due: 100,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'inv-notes-111-orange',
    shop_id: 'shop-1',
    customer_id: 'cust-unrelated',
    invoice_number: 'INV-000100',
    invoice_number_numeric: 100,
    notes: '#111 ORANGE FREIGHTLINER',
    status: 'sent',
    computed_status: 'Unpaid',
    balance_due: 50,
    created_at: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'inv-elianis',
    shop_id: 'shop-1',
    customer_id: ELIANIS_CUSTOMER_ID,
    invoice_number: 'INV-002325',
    invoice_number_numeric: 2325,
    notes: 'brake service',
    status: 'sent',
    computed_status: 'Unpaid',
    balance_due: 200,
    created_at: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'inv-old-1500',
    shop_id: 'shop-1',
    customer_id: 'cust-old',
    invoice_number: 'INV-001500',
    invoice_number_numeric: 1500,
    notes: 'historical job',
    status: 'sent',
    computed_status: 'Paid',
    balance_due: 0,
    created_at: '2020-01-01T00:00:00.000Z',
  },
];

function createSearchableSupabase(
  rows: Record<string, unknown>[],
  options?: { statusFilter?: (row: Record<string, unknown>) => boolean }
) {
  let listCalls = 0;
  let lastOrFilter: string | null = null;

  const applyFilters = (searchOptions: {
    searchTerm?: string;
    customerIds?: string[];
    statusFilter?: string;
  }) => {
    let scoped = rows.filter((row) =>
      invoiceMatchesListSearch(row, {
        searchTerm: searchOptions.searchTerm,
        customerIds: searchOptions.customerIds,
      })
    );
    if (options?.statusFilter) {
      scoped = scoped.filter(options.statusFilter);
    }
    if (searchOptions.statusFilter === 'Paid') {
      scoped = scoped.filter((row) => row.computed_status === 'Paid');
    }
    return scoped;
  };

  const supabase = {
    from(table: string) {
      assert.equal(table, 'invoice_balances_v');
      return {
        select(_columns: string, selectOptions?: { count?: string; head?: boolean }) {
          const queryState: {
            searchTerm?: string;
            customerIds?: string[];
            statusFilter?: string;
          } = {};

          const chain = {
            eq() {
              return chain;
            },
            or(filter: string) {
              lastOrFilter = filter;
              return chain;
            },
            in(_column: string, values: string[]) {
              queryState.customerIds = values;
              return chain;
            },
            lt() {
              return chain;
            },
            gt() {
              return chain;
            },
            order() {
              return chain;
            },
            range(from: number, to: number) {
              return {
                ...chain,
                async then(
                  resolve: (value: {
                    data: Record<string, unknown>[];
                    error: null;
                    count?: number;
                  }) => void
                ) {
                  listCalls += 1;
                  const scoped = applyFilters(queryState);
                  resolve({
                    data: scoped.slice(from, to + 1),
                    error: null,
                    count: scoped.length,
                  });
                },
              };
            },
            async then(resolve: (value: { count: number; error: null }) => void) {
              const scoped = applyFilters(queryState);
              resolve({ count: scoped.length, error: null });
            },
          };

          if (selectOptions?.head) {
            return chain;
          }

          return {
            order() {
              return chain;
            },
            range(from: number, to: number) {
              return chain.range(from, to);
            },
            setSearch(searchTerm?: string, customerIds?: string[]) {
              queryState.searchTerm = searchTerm;
              queryState.customerIds = customerIds;
              return chain;
            },
            or(filter: string) {
              lastOrFilter = filter;
              const orParts = filter.split(',');
              for (const part of orParts) {
                if (part.startsWith('customer_id.in.')) return chain;
              }
              return chain;
            },
            eq() {
              return chain;
            },
            in(_column: string, values: string[]) {
              queryState.customerIds = values;
              return chain;
            },
            lt() {
              return chain;
            },
            gt() {
              return chain;
            },
          };
        },
      };
    },
  };

  return {
    supabase: supabase as any,
    getListCalls: () => listCalls,
    getLastOrFilter: () => lastOrFilter,
    listWithSearch: async (searchOptions: {
      searchTerm?: string;
      customerIds?: string[];
      statusFilter?: 'All Status' | 'Paid';
      page?: number;
    }) => {
      const scoped = applyFilters({
        searchTerm: searchOptions.searchTerm,
        customerIds: searchOptions.customerIds,
        statusFilter: searchOptions.statusFilter,
      });
      listCalls += 1;
      const page = searchOptions.page ?? 0;
      const from = page * INVOICE_DEFAULT_PAGE_SIZE;
      const to = from + INVOICE_DEFAULT_PAGE_SIZE - 1;
      return {
        data: scoped.slice(from, to + 1),
        count: scoped.length,
        error: null,
      };
    },
  };
}

describe('invoice search OR filter builder', () => {
  it('combines invoice fields and customer IDs in one OR expression for name search', () => {
    const filter = buildInvoiceSearchOrFilter('Elianis', [ELIANIS_CUSTOMER_ID]);
    assert.ok(filter);
    assert.match(filter!, /invoice_number\.ilike/);
    assert.match(filter!, /notes\.ilike/);
    assert.ok(filter!.includes(`customer_id.in.("${ELIANIS_CUSTOMER_ID}")`));
  });

  it('excludes customer IDs from OR when query starts with #', () => {
    const filter = buildInvoiceSearchOrFilter('#111', ['cust-a', 'cust-b']);
    assert.ok(filter);
    assert.match(filter!, /invoice_number\.ilike\.%#111%/);
    assert.match(filter!, /notes\.ilike\.%#111%/);
    assert.doesNotMatch(filter!, /customer_id\.in/);
  });

  it('excludes customer IDs for short numeric queries', () => {
    assert.equal(shouldIncludeCustomerIdsInInvoiceSearch('111', ['cust-a']), false);
    assert.equal(filterCustomerIdsForInvoiceSearch('111', ['cust-a']).length, 0);
  });

  it('includes customer IDs for full phone numbers', () => {
    assert.equal(shouldIncludeCustomerIdsInInvoiceSearch('5027673961', ['cust-a']), true);
    assert.equal(
      shouldIncludeCustomerIdsInInvoiceSearch('(502) 767-3961', [ELIANIS_CUSTOMER_ID]),
      true
    );
    assert.equal(shouldIncludeCustomerIdsInInvoiceSearch('617516', ['cust-a']), true);
    assert.equal(shouldIncludeCustomerIdsInInvoiceSearch('502767', ['cust-a']), true);
  });

  it('parseInvoiceSearchFromOrFilter recovers customer IDs and search term', () => {
    const filter = buildInvoiceSearchOrFilter('Elianis Acosta', [ELIANIS_CUSTOMER_ID]);
    assert.ok(filter);
    const parsed = parseInvoiceSearchFromOrFilter(filter!);
    assert.equal(parsed.searchTerm, 'Elianis Acosta');
    assert.deepEqual(parsed.customerIds, [ELIANIS_CUSTOMER_ID]);
  });

  it('parseInvoiceNumberNumericSearch handles invoice number variants', () => {
    assert.equal(parseInvoiceNumberNumericSearch('2343'), 2343);
    assert.equal(parseInvoiceNumberNumericSearch('002343'), 2343);
    assert.equal(parseInvoiceNumberNumericSearch('#2343'), 2343);
    assert.equal(parseInvoiceNumberNumericSearch('INV-002343'), 2343);
    assert.equal(parseInvoiceNumberNumericSearch('#111'), 111);
    assert.equal(parseInvoiceNumberNumericSearch('truck #111'), null);
    assert.equal(parseInvoiceNumberNumericSearch('Elianis'), null);
  });
});

describe('invoice list search semantics', () => {
  const rows = PRODUCTION_FIXTURE_ROWS;

  it('A: notes "truck #111" matches search "#111" without customer phone fan-out', () => {
    const notesInvoice = {
      id: INVOICE_002343_ID,
      invoice_number: 'INV-002343',
      notes: 'truck #111',
      customer_id: 'cust-unrelated',
    };
    const phoneCustomerInvoice = {
      id: 'inv-phone-customer',
      invoice_number: 'INV-000999',
      notes: 'unrelated work',
      customer_id: 'cust-phone-111',
    };
    const noisyCustomerIds = Array.from({ length: 43 }, (_, index) => `cust-phone-${index}`).concat(
      'cust-phone-111'
    );

    assert.equal(
      invoiceMatchesListSearch(notesInvoice, {
        searchTerm: '#111',
        customerIds: noisyCustomerIds,
      }),
      true
    );
    assert.equal(
      invoiceMatchesListSearch(phoneCustomerInvoice, {
        searchTerm: '#111',
        customerIds: noisyCustomerIds,
      }),
      false
    );
  });

  it('B: same notes match search "111" without short phone fan-out', () => {
    assert.equal(invoiceMatchesListSearch(rows[0], { searchTerm: '111' }), true);
    assert.equal(
      invoiceMatchesListSearch(
        {
          id: 'inv-phone-only',
          invoice_number: 'INV-000500',
          invoice_number_numeric: 500,
          notes: 'unrelated work order',
          customer_id: 'cust-phone-111',
        },
        { searchTerm: '111', customerIds: ['cust-phone-111'] }
      ),
      false
    );
  });

  it('C: customer name Elianis matches without appearing in invoice fields', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: 'Elianis',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
    assert.equal(invoiceMatchesListSearch(rows[2], { searchTerm: 'Elianis' }), false);
  });

  it('D: raw customer phone matches via customerIds union', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: '5027673961',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
  });

  it('E: formatted phone matches via same customerIds', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: '(502) 767-3961',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
  });

  it('F: invoice #002343 found by "2343"', () => {
    assert.equal(invoiceMatchesListSearch(rows[0], { searchTerm: '2343' }), true);
  });

  it('G: invoice #002343 found by "#2343"', () => {
    assert.equal(invoiceMatchesListSearch(rows[0], { searchTerm: '#2343' }), true);
  });

  it('H: invoice #002343 found by "INV-002343"', () => {
    assert.equal(invoiceMatchesListSearch(rows[0], { searchTerm: 'INV-002343' }), true);
  });

  it('I: notes-only match without customerIds still returns invoice', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[1], { searchTerm: 'ORANGE FREIGHTLINER' }),
      true
    );
  });

  it('J: customer-only match without invoice field hit still returns invoice', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: 'Elianis Acosta',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
  });

  it('K: term matching both invoice and customer appears once in results', async () => {
    const manyRows = Array.from({ length: 1936 }, (_, index) => ({
      id: `inv-${index + 1}`,
      shop_id: 'shop-1',
      customer_id: `cust-${index}`,
      invoice_number: `INV-${String(index + 1).padStart(4, '0')}`,
      invoice_number_numeric: index + 1,
      notes: '',
      computed_status: 'Unpaid',
    }));
    manyRows[1500] = {
      ...manyRows[1500],
      id: INVOICE_002343_ID,
      invoice_number: 'INV-002343',
      invoice_number_numeric: INVOICE_002343_NUMERIC,
      notes: 'truck #111',
      customer_id: ELIANIS_CUSTOMER_ID,
    };

    const { listWithSearch } = createSearchableSupabase(manyRows);
    const result = await listWithSearch({
      searchTerm: 'Elianis',
      customerIds: [ELIANIS_CUSTOMER_ID],
    });
    const matches = result.data.filter((row) => row.id === INVOICE_002343_ID);
    assert.equal(matches.length, 1);
  });

  it('L: old invoice outside first 1000 remains searchable', async () => {
    const manyRows = Array.from({ length: 1936 }, (_, index) => ({
      id: `inv-${index + 1}`,
      shop_id: 'shop-1',
      customer_id: `cust-${index}`,
      invoice_number: `INV-${String(index + 1).padStart(4, '0')}`,
      invoice_number_numeric: index + 1,
      notes: index === 1499 ? 'truck #111' : '',
      computed_status: 'Unpaid',
    }));
    const { listWithSearch } = createSearchableSupabase(manyRows);
    const result = await listWithSearch({ searchTerm: 'truck #111' });
    assert.ok(result.data.some((row) => row.id === 'inv-1500'));
    assert.equal(result.count, 1);
  });

  it('M: no match returns empty result', async () => {
    const { listWithSearch } = createSearchableSupabase(rows);
    const result = await listWithSearch({
      searchTerm: 'zzznomatch',
      customerIds: [],
    });
    assert.equal(result.count, 0);
    assert.equal(result.data.length, 0);
  });

  it('N: search union AND status filter intersect correctly', async () => {
    const { listWithSearch } = createSearchableSupabase(rows);
    const result = await listWithSearch({
      searchTerm: 'historical',
      statusFilter: 'Paid',
    });
    assert.equal(result.count, 1);
    assert.equal(result.data[0]?.id, 'inv-old-1500');
  });

  it('O: search union AND status excludes non-matching status', async () => {
    const { listWithSearch } = createSearchableSupabase(rows);
    const result = await listWithSearch({
      searchTerm: 'truck',
      statusFilter: 'Paid',
    });
    assert.equal(result.count, 0);
  });

  it('production-shaped #111 returns invoice 002343 via listShopInvoicesPage mock', async () => {
    const manyRows = Array.from({ length: 50 }, (_, index) => ({
      id: `inv-${index}`,
      shop_id: 'shop-1',
      customer_id: `cust-${index}`,
      invoice_number: `INV-${String(index).padStart(6, '0')}`,
      invoice_number_numeric: index,
      notes: '',
      computed_status: 'Unpaid',
    }));
    manyRows.push({
      id: INVOICE_002343_ID,
      shop_id: 'shop-1',
      customer_id: 'cust-x',
      invoice_number: 'INV-002343',
      invoice_number_numeric: INVOICE_002343_NUMERIC,
      notes: 'truck #111',
      computed_status: 'Unpaid',
    });

    const customerIds = Array.from({ length: 43 }, (_, index) => `cust-search-${index}`);
    const { listWithSearch } = createSearchableSupabase(manyRows);
    const result = await listWithSearch({
      searchTerm: '#111',
      customerIds,
    });
    assert.ok(result.data.some((row) => row.id === INVOICE_002343_ID));
    assert.equal(
      invoiceMatchesListSearch(
        { notes: 'truck #111', invoice_number: 'INV-002343', customer_id: 'cust-x' },
        { searchTerm: '#111', customerIds }
      ),
      true
    );
    assert.equal(
      invoiceMatchesListSearch(
        { notes: 'truck #111', invoice_number: 'INV-002343', customer_id: 'cust-x' },
        { searchTerm: '#111', customerIds: ['other-only'] }
      ),
      true
    );
  });

  it('buildInvoiceSearchOrFilter is used instead of separate customer in()', () => {
    const filter = buildInvoiceSearchOrFilter('Elianis', [ELIANIS_CUSTOMER_ID]);
    assert.ok(filter);
    assert.ok(filter!.includes(`customer_id.in.("${ELIANIS_CUSTOMER_ID}")`));
    assert.match(filter!, /invoice_number\.ilike/);
    assert.match(filter!, /notes\.ilike/);
  });

  it('P: "#111" returns notes invoice but not unrelated phone-customer invoices', () => {
    const notesInvoice = {
      id: INVOICE_002343_ID,
      notes: 'truck #111',
      customer_id: 'cust-x',
    };
    const unrelated = {
      id: 'inv-other',
      notes: 'other',
      customer_id: 'cust-phone-5',
    };
    const customerIds = Array.from({ length: 43 }, (_, i) => `cust-phone-${i}`);
    assert.equal(
      invoiceMatchesListSearch(notesInvoice, { searchTerm: '#111', customerIds }),
      true
    );
    assert.equal(
      invoiceMatchesListSearch(unrelated, { searchTerm: '#111', customerIds }),
      false
    );
  });

  it('Q: "111" matches notes/invoice fields but not 3-digit phone fan-out', () => {
    assert.equal(invoiceMatchesListSearch(rows[0], { searchTerm: '111' }), true);
    assert.equal(
      invoiceMatchesListSearch(
        { id: 'x', invoice_number: 'INV-000500', invoice_number_numeric: 500, notes: 'none', customer_id: 'cust-phone-111' },
        { searchTerm: '111', customerIds: ['cust-phone-111'] }
      ),
      false
    );
  });

  it('R: "5027673961" returns customer phone invoice', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: '5027673961',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
  });

  it('S: "(502) 767-3961" returns same customer phone invoice', () => {
    assert.equal(
      invoiceMatchesListSearch(rows[2], {
        searchTerm: '(502) 767-3961',
        customerIds: [ELIANIS_CUSTOMER_ID],
      }),
      true
    );
  });
});
