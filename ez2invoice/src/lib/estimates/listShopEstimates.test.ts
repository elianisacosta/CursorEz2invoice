import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POSTGREST_PAGE_SIZE, pageRange } from '../postgrestPagination.ts';
import { listShopEstimatesPage } from './listShopEstimates.ts';

function buildEstimateDataset(totalRows: number) {
  return Array.from({ length: totalRows }, (_, index) => ({
    id: `est-${index}`,
    estimate_number: `EST-${String(index).padStart(4, '0')}`,
    status: index % 2 === 0 ? 'draft' : 'sent',
    total_amount: index + 1,
    subtotal: index,
    tax_amount: 1,
    created_at: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    valid_until: null,
    customer_id: `cust-${index % 10}`,
    shop_id: 'shop-1',
    customer: {
      id: `cust-${index % 10}`,
      first_name: 'Test',
      last_name: String(index),
      email: null,
      phone: null,
      company: index > 1000 ? 'Past Cap LLC' : 'Before Cap LLC',
    },
  }));
}

describe('listShopEstimatesPage regression', () => {
  for (const totalRows of [1205, 2050]) {
    it(`returns rows past index 1000 when dataset has ${totalRows} estimates`, async () => {
      const dataset = buildEstimateDataset(totalRows);
      const supabase = {
        from() {
          return {
            select(_cols: string, _opts?: unknown) {
              return queryBuilder;
            },
          };
        },
      };
      const queryBuilder: Record<string, unknown> = {};
      const chain = () => queryBuilder;
      queryBuilder.order = chain;
      queryBuilder.range = (from: number, to: number) => {
        queryBuilder._range = { from, to };
        return queryBuilder;
      };
      queryBuilder.or = chain;
      queryBuilder.eq = chain;
      queryBuilder.is = chain;
      queryBuilder.in = chain;
      queryBuilder.then = (resolve: (value: unknown) => void) => {
        const { from, to } = queryBuilder._range as { from: number; to: number };
        resolve({
          data: dataset.slice(from, to + 1),
          count: dataset.length,
          error: null,
        });
      };

      const targetIndex = 1024;
      const pageSize = 25;
      const page = Math.floor(targetIndex / pageSize);
      const { data, count, error } = await listShopEstimatesPage(supabase as never, {
        shopId: 'shop-1',
        isFounder: false,
        page,
        pageSize,
      });

      assert.equal(error, null);
      assert.equal(count, totalRows);
      assert.ok(data.some((row) => row.id === `est-${targetIndex}`));
      assert.equal(data.length, pageSize);
    });
  }

  it('uses pageRange to reach the final page of a 2050-row dataset', () => {
    const totalRows = 2050;
    const pageSize = 50;
    const lastPage = Math.ceil(totalRows / pageSize) - 1;
    const { from, to } = pageRange(lastPage, pageSize);
    assert.equal(from, 2000);
    assert.equal(to, 2049);
    assert.equal(to - from + 1, 50);
  });

  it('requires two PostgREST pages when total exceeds POSTGREST_PAGE_SIZE', () => {
    assert.ok(1205 > POSTGREST_PAGE_SIZE);
    assert.ok(2050 > POSTGREST_PAGE_SIZE);
  });
});
