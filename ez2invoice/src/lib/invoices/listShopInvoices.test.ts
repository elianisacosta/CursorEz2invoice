import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INVOICE_FETCH_PAGE_SIZE, fetchAllPagedRows } from './listShopInvoices.ts';

describe('fetchAllPagedRows', () => {
  it('merges multiple PostgREST pages past the 1000-row cap', async () => {
    const totalRows = INVOICE_FETCH_PAGE_SIZE + 862;
    let fromSeen = 0;
    const { data, error } = await fetchAllPagedRows(async (from, to) => {
      fromSeen = from;
      const batchSize = Math.min(INVOICE_FETCH_PAGE_SIZE, totalRows - from);
      const data = Array.from({ length: batchSize }, (_, index) => ({ id: `inv-${from + index}` }));
      return { data, error: null };
    });
    assert.equal(error, null);
    assert.equal(data.length, totalRows);
    assert.equal(data[0]?.id, 'inv-0');
    assert.equal(data[INVOICE_FETCH_PAGE_SIZE]?.id, `inv-${INVOICE_FETCH_PAGE_SIZE}`);
    assert.equal(fromSeen, INVOICE_FETCH_PAGE_SIZE);
  });

  it('returns an empty array when the shop has no invoices', async () => {
    const { data, error } = await fetchAllPagedRows(async () => ({ data: [], error: null }));
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });
});
