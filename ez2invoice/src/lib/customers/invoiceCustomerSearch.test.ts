import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInvoiceCustomerSearchOrFilter,
  customerMatchesInvoiceSearchQuery,
  customerPhoneMatchesInvoiceSearch,
  searchShopCustomersForInvoice,
} from './searchCustomers.ts';
import {
  filterCustomerIdsForInvoiceSearch,
  invoiceMatchesListSearch,
  shouldIncludeCustomerIdsInInvoiceSearch,
} from '../invoices/listShopInvoices.ts';

const SAFE_MORE = {
  id: 'cust-safe-more',
  first_name: 'SAFE',
  last_name: 'MORE LLC',
  company: null,
  email: null,
  phone: '6175167742',
};

const CARCTCOLL = {
  id: 'cust-carctcoll',
  first_name: 'CARCTCOLL',
  last_name: 'LLC',
  company: null,
  email: null,
  phone: null,
};

const DEKO = {
  id: 'cust-deko',
  first_name: 'DEKO',
  last_name: 'TRANSPORT LLC',
  company: 'DEKO TRANSPORT LLC',
  email: null,
  phone: null,
};

const MAYASEN = {
  id: 'cust-mayasen',
  first_name: 'MAYASEN',
  last_name: 'TRANSPORTATION',
  company: 'MAYASEN TRANSPORTATION',
  email: null,
  phone: null,
};

const ELIANIS = {
  id: '111419a7-ebd5-4b1b-9d2e-70a4843d5908',
  first_name: 'Elianis',
  last_name: 'Acosta',
  company: null,
  email: 'acostaelianis@yahoo.com',
  phone: '5027673961',
};

const UNRELATED_PHONE = {
  id: 'cust-unrelated-phone',
  first_name: 'Other',
  last_name: 'Customer',
  company: null,
  email: null,
  phone: '5028763473',
};

describe('invoice customer search precision', () => {
  it('A: safe more llc matches SAFE / MORE LLC customer', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(SAFE_MORE, 'safe more llc'), true);
  });

  it('B: safe more llc does not match CARCTCOLL LLC merely because of LLC', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(CARCTCOLL, 'safe more llc'), false);
  });

  it('C: Deko Transport matches DEKO TRANSPORT LLC customer', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(DEKO, 'Deko Transport'), true);
  });

  it('D: Deko Transport does not match MAYASEN TRANSPORTATION via Transport alone', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(MAYASEN, 'Deko Transport'), false);
  });

  it('E: 617516 matches (617) 516-7742 stored as digits', () => {
    assert.equal(customerPhoneMatchesInvoiceSearch('6175167742', '617516'), true);
    assert.equal(customerPhoneMatchesInvoiceSearch('(617) 516-7742', '617516'), true);
  });

  it('F: 502767 matches Elianis phone', () => {
    assert.equal(customerPhoneMatchesInvoiceSearch('5027673961', '502767'), true);
    assert.equal(customerMatchesInvoiceSearchQuery(ELIANIS, '502767'), true);
  });

  it('G: 5027673 matches Elianis phone contiguously', () => {
    assert.equal(customerPhoneMatchesInvoiceSearch('5027673961', '5027673'), true);
  });

  it('H: 5027673 does not match unrelated 5028763473', () => {
    assert.equal(customerPhoneMatchesInvoiceSearch('5028763473', '5027673'), false);
    assert.equal(customerMatchesInvoiceSearchQuery(UNRELATED_PHONE, '5027673'), false);
  });

  it('I: full phone 5027673961 matches Elianis', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(ELIANIS, '5027673961'), true);
  });

  it('J: formatted phone (502) 767-3961 matches Elianis', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(ELIANIS, '(502) 767-3961'), true);
  });

  it('K: elianis still matches invoice notes via invoice OR union', () => {
    assert.equal(
      invoiceMatchesListSearch(
        {
          id: 'inv-102',
          invoice_number: 'INV-000102',
          notes: '- elianis',
          customer_id: 'cust-er-transport',
        },
        { searchTerm: 'elianis' }
      ),
      true
    );
  });

  it('L: elianis matches Elianis Acosta customer for invoice union', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(ELIANIS, 'elianis'), true);
  });

  it('M: carctcoll matches CARCTCOLL customer only', () => {
    assert.equal(customerMatchesInvoiceSearchQuery(CARCTCOLL, 'carctcoll'), true);
    assert.equal(customerMatchesInvoiceSearchQuery(SAFE_MORE, 'carctcoll'), false);
  });

  it('includes customer IDs for 6-digit partial phone in invoice union', () => {
    assert.equal(shouldIncludeCustomerIdsInInvoiceSearch('617516', ['cust-a']), true);
    assert.equal(filterCustomerIdsForInvoiceSearch('502767', ['cust-a']).length, 1);
  });

  it('buildInvoiceCustomerSearchOrFilter uses phrase AND for multi-word names', () => {
    const filter = buildInvoiceCustomerSearchOrFilter('Deko Transport');
    assert.ok(filter);
    assert.match(filter!, /and\(first_name\.ilike\.%Deko%,last_name\.ilike\.%Transport%\)/);
    assert.doesNotMatch(filter!, /last_name\.ilike\.%Transport%,last_name\.ilike/);
  });

  it('buildInvoiceCustomerSearchOrFilter does not use fuzzy digit-between phone pattern', () => {
    const filter = buildInvoiceCustomerSearchOrFilter('5027673') || '';
    assert.doesNotMatch(filter, /%5%0%2%7%6%7%3%/);
    assert.match(filter, /phone\.ilike\.%5027673%/);
  });
});

describe('searchShopCustomersForInvoice post-filter', () => {
  it('post-filters broad server matches to phrase-aware customer rows', async () => {
    const customers = [SAFE_MORE, CARCTCOLL, DEKO, MAYASEN, ELIANIS, UNRELATED_PHONE];
    const supabase = {
      from(table: string) {
        assert.equal(table, 'customers');
        return {
          select() {
            return {
              or() {
                return {
                  order() {
                    return this;
                  },
                  limit() {
                    return this;
                  },
                  eq() {
                    return this;
                  },
                  async then(
                    resolve: (value: { data: typeof customers; error: null }) => void
                  ) {
                    resolve({ data: customers, error: null });
                  },
                };
              },
            };
          },
        };
      },
    };

    const safeMoreResult = await searchShopCustomersForInvoice(supabase as any, {
      shopId: 'shop-1',
      isFounder: false,
      searchTerm: 'safe more llc',
    });
    assert.deepEqual(
      safeMoreResult.data.map((row) => row.id),
      ['cust-safe-more']
    );

    const dekoResult = await searchShopCustomersForInvoice(supabase as any, {
      shopId: 'shop-1',
      isFounder: false,
      searchTerm: 'Deko Transport',
    });
    assert.deepEqual(dekoResult.data.map((row) => row.id), ['cust-deko']);

    const phoneResult = await searchShopCustomersForInvoice(supabase as any, {
      shopId: 'shop-1',
      isFounder: false,
      searchTerm: '5027673',
    });
    assert.deepEqual(phoneResult.data.map((row) => row.id), [ELIANIS.id]);
  });
});
