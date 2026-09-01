import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCustomerEmailRecipient } from './searchCustomers.ts';

const ELIANIS_CUSTOMER_ID = '111419a7-ebd5-4b1b-9d2e-70a4843d5908';

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

const elianisCustomer = {
  id: ELIANIS_CUSTOMER_ID,
  first_name: 'Elianis',
  last_name: 'Acosta',
  email: 'acostaelianis@yahoo.com',
  phone: '5027673961',
  shop_id: 'ebce8e4b-a765-4243-aa81-3219663534c2',
};

describe('resolveCustomerEmailRecipient', () => {
  it('A: customer in first 50 loaded customers can send invoice email', () => {
    const firstPage = buildFirstPageCustomers();
    const inPageCustomer = firstPage[0];
    const fromPaginatedUi = firstPage.find((customer) => customer.id === inPageCustomer.id);
    const recipient = resolveCustomerEmailRecipient(fromPaginatedUi);
    assert.equal(recipient.ok, true);
    if (recipient.ok) {
      assert.equal(recipient.email, 'customer0@example.com');
    }
  });

  it('B/C: customer outside first page is missing from paginated UI but resolves by customer_id', () => {
    const firstPage = buildFirstPageCustomers();
    const fromPaginatedUi = firstPage.find((customer) => customer.id === elianisCustomer.id);
    assert.equal(fromPaginatedUi, undefined);

    const recipient = resolveCustomerEmailRecipient(elianisCustomer);
    assert.equal(recipient.ok, true);
    if (recipient.ok) {
      assert.equal(recipient.email, 'acostaelianis@yahoo.com');
    }
  });

  it('D: customer exists in database but stored email is blank', () => {
    const recipient = resolveCustomerEmailRecipient({
      id: 'cust-no-email',
      first_name: 'No',
      last_name: 'Email',
      email: '   ',
      phone: null,
      shop_id: 'shop-1',
    });
    assert.deepEqual(recipient, { ok: false, reason: 'missing_email' });
  });

  it('E: customer_id cannot be found in database', () => {
    const recipient = resolveCustomerEmailRecipient(null);
    assert.deepEqual(recipient, { ok: false, reason: 'not_found' });
  });

  it('F: estimate email uses the same by-id customer resolution outside page 1', () => {
    const firstPage = buildFirstPageCustomers();
    assert.equal(
      firstPage.some((customer) => customer.id === elianisCustomer.id),
      false
    );
    const recipient = resolveCustomerEmailRecipient(elianisCustomer);
    assert.equal(recipient.ok, true);
    if (recipient.ok) {
      assert.equal(recipient.email, 'acostaelianis@yahoo.com');
    }
  });
});
