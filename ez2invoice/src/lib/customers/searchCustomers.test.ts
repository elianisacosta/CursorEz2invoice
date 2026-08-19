import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerSearchOrFilter,
  buildPhoneDigitIlikePattern,
  canQueryShopCustomers,
  customerMatchesQuery,
  hasExactCustomerLookupMatch,
  isCurrentCustomerRequest,
  isPhoneSearchQuery,
  mergeCustomersById,
  replaceCustomerById,
  selectedCustomerId,
} from './searchCustomers.ts';

describe('customer search matching', () => {
  it('matches name, company, email, and formatted phone digits', () => {
    const customer = {
      first_name: 'Maria',
      last_name: 'Lopez',
      company: 'Lopez Fleet',
      email: 'maria@example.com',
      phone: '(555) 123-4567',
    };
    assert.equal(customerMatchesQuery(customer, 'maria lo'), true);
    assert.equal(customerMatchesQuery(customer, 'Lopez Fleet'), true);
    assert.equal(customerMatchesQuery(customer, 'maria@example'), true);
    assert.equal(customerMatchesQuery(customer, '5551234567'), true);
    assert.equal(customerMatchesQuery(customer, 'zzz'), false);
  });

  it('treats digit-only queries as phone searches', () => {
    assert.equal(isPhoneSearchQuery('555-123'), true);
    assert.equal(isPhoneSearchQuery('Maria'), false);
    assert.equal(
      hasExactCustomerLookupMatch(
        { first_name: 'A', last_name: 'B', phone: '555-123-4567' },
        '5551234567'
      ),
      true
    );
  });

  it('builds an ILIKE pattern that can match formatted phone numbers', () => {
    assert.equal(buildPhoneDigitIlikePattern('555-123-4567'), '%5%5%5%1%2%3%4%5%6%7%');
    assert.equal(buildPhoneDigitIlikePattern('ab'), null);
  });
});

describe('customer request sequencing', () => {
  it('ignores stale responses when a newer request is active', () => {
    let active = 0;
    const first = ++active;
    const second = ++active;
    const staleResult = ['old'];
    const freshResult = ['new'];
    let applied = staleResult;
    if (isCurrentCustomerRequest(active, first)) applied = staleResult;
    if (isCurrentCustomerRequest(active, second)) applied = freshResult;
    assert.equal(isCurrentCustomerRequest(active, first), false);
    assert.equal(isCurrentCustomerRequest(active, second), true);
    assert.deepEqual(applied, ['new']);
  });
});

describe('shop scope and list helpers', () => {
  it('does not add a different customer when replacing by id', () => {
    const rows = [{ id: 'keep', name: 'A' }];
    const result = replaceCustomerById(rows, { id: 'other', name: 'B' });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'keep');
  });

  it('keeps selected/created customers when merging later pages', () => {
    const merged = mergeCustomersById(
      [{ id: 'a', name: 'Cached' }],
      [{ id: 'b', name: 'Page' }],
      [{ id: 'a', name: 'Updated' }]
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((row) => row.id === 'a')?.name, 'Updated');
  });
});

describe('CHM Mounir production fixture', () => {
  const chmMounir = {
    id: '756bfd8a-66d0-4e8c-9b0c-2b4bab4a0867',
    first_name: 'CHM',
    last_name: 'MOUNIR',
    company: 'CHM EXPRESS MOUNIR LLC ',
    email: 'chexpressllc@yahoo.com',
    phone: '(502) 471-7998',
    is_fleet: true,
  };

  it('matches every required Customers/Invoice search term', () => {
    for (const term of ['moun', 'mounir', '4717998', '5024717998', 'chexpressllc@yahoo.com']) {
      assert.equal(customerMatchesQuery(chmMounir, term), true, `expected match for ${term}`);
    }
  });

  it('builds server filters that include name, company, email, and phone digits', () => {
    const mounirFilter = buildCustomerSearchOrFilter('mounir') || '';
    assert.equal(mounirFilter.includes('last_name.ilike.%mounir%'), true);
    assert.equal(mounirFilter.includes('company.ilike.%mounir%'), true);
    const phoneFilter = buildCustomerSearchOrFilter('4717998') || '';
    assert.equal(phoneFilter.includes('phone.ilike.%4%7%1%7%9%9%8%'), true);
    const emailFilter = buildCustomerSearchOrFilter('chexpressllc@yahoo.com') || '';
    assert.equal(emailFilter.includes('email.ilike.%chexpressllc@yahoo.com%'), true);
  });

  it('does not require the customer to be in the newest 1000 rows to match', () => {
    const newestThousand = Array.from({ length: 1000 }, (_, index) => ({
      id: `new-${index}`,
      first_name: 'Other',
      last_name: 'Customer',
      company: null,
      email: null,
      phone: null,
    }));
    const localOnly = newestThousand.filter((row) => customerMatchesQuery(row, 'mounir'));
    assert.equal(localOnly.length, 0);
    assert.equal(customerMatchesQuery(chmMounir, 'mounir'), true);
  });
});

describe('canQueryShopCustomers', () => {
  it('skips unscoped queries when shop id is not ready', () => {
    assert.equal(canQueryShopCustomers(null, false), false);
    assert.equal(canQueryShopCustomers('shop-1', false), true);
    assert.equal(canQueryShopCustomers(null, true), true);
  });
});
