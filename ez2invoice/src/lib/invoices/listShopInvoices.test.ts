import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POSTGREST_PAGE_SIZE } from '../postgrestPagination.ts';
import { fetchAllPagedRows } from './listShopInvoices.ts';

describe('fetchAllPagedRows', () => {
  it('merges multiple PostgREST pages past the 1000-row cap', async () => {
    const totalRows = POSTGREST_PAGE_SIZE + 862;
    let fromSeen = 0;
    const { data, error } = await fetchAllPagedRows(async (from, to) => {
      fromSeen = from;
      const batchSize = Math.min(POSTGREST_PAGE_SIZE, totalRows - from);
        const rows = Array.from({ length: batchSize }, (_, index) => ({ id: `inv-${from + index}` }));
        return { data: rows, error: null };
    });
    assert.equal(error, null);
    assert.equal(data.length, totalRows);
    assert.equal(data[0]?.id, 'inv-0');
    assert.equal(data[POSTGREST_PAGE_SIZE]?.id, `inv-${POSTGREST_PAGE_SIZE}`);
    assert.equal(fromSeen, POSTGREST_PAGE_SIZE);
  });

  for (const totalRows of [1205, 2050]) {
    it(`loads all ${totalRows} invoice rows without stopping at row 1000`, async () => {
      const { data, error } = await fetchAllPagedRows(async (from, to) => {
        const batchSize = Math.min(POSTGREST_PAGE_SIZE, totalRows - from);
        const rows = Array.from({ length: batchSize }, (_, index) => ({
          id: `inv-${from + index}`,
        }));
        return { data: rows, error: null };
      });
      assert.equal(error, null);
      assert.equal(data.length, totalRows);
      assert.ok(data.some((row) => row.id === 'inv-1204'));
      if (totalRows >= 2050) {
        assert.ok(data.some((row) => row.id === 'inv-2049'));
      }
    });
  }

  it('returns an empty array when the shop has no invoices', async () => {
    const { data, error } = await fetchAllPagedRows(async () => ({ data: [], error: null }));
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });
});
