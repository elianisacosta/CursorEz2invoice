import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pageRange } from '../postgrestPagination.ts';
import { listShopLaborPage } from './listShopLaborItems.ts';

describe('listShopLaborPage regression', () => {
  for (const totalRows of [1205, 2050]) {
    it(`finds labor rows past index 1000 in a ${totalRows}-row shop catalog`, async () => {
      const dataset = Array.from({ length: totalRows }, (_, index) => ({
        id: `labor-${index}`,
        service_name: index === 1204 ? 'Past Cap Brake Job' : `Service ${index}`,
        category: 'General',
        description: null,
        rate_type: index % 2 === 0 ? 'fixed' : 'hourly',
        rate: 100,
        est_hours: 1,
        shop_id: 'shop-1',
        created_at: '2026-01-01T00:00:00.000Z',
      }));

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
      queryBuilder.then = (resolve: (value: unknown) => void) => {
        const { from, to } = queryBuilder._range as { from: number; to: number };
        resolve({ data: dataset.slice(from, to + 1), count: dataset.length, error: null });
      };

      const supabase = {
        from: () => ({
          select: () => queryBuilder,
        }),
      };

      const pageSize = 25;
      const page = Math.floor(1204 / pageSize);
      const { data, count, error } = await listShopLaborPage(supabase as never, {
        shopId: 'shop-1',
        isFounder: false,
        page,
        pageSize,
      });

      assert.equal(error, null);
      assert.equal(count, totalRows);
      assert.ok(data.some((row) => row.service_name === 'Past Cap Brake Job'));
    });
  }

  it('computes the last page slice for 2050 rows at page size 25', () => {
    const { from, to } = pageRange(Math.ceil(2050 / 25) - 1, 25);
    assert.equal(from, 2050 - 25);
    assert.equal(to, 2049);
  });
});
