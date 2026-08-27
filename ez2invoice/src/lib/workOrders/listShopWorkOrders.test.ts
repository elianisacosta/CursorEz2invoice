import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pageRange } from '../postgrestPagination.ts';
import { listShopWorkOrdersPage } from './listShopWorkOrders.ts';

describe('listShopWorkOrdersPage regression', () => {
  for (const totalRows of [1205, 2050]) {
    it(`paginates work orders past row 1000 in a ${totalRows}-row dataset`, async () => {
      const dataset = Array.from({ length: totalRows }, (_, index) => ({
        id: `wo-${index}`,
        status: 'pending',
        work_order_number: `Work Order ${index}`,
        customer_id: 'cust-1',
        truck_id: null,
        bay_id: null,
        description: index === 1024 ? 'Past Cap Repair' : 'Routine service',
        notes: '',
        created_at: `2026-02-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        customers: { first_name: 'Test', last_name: 'Customer', email: null, phone: '5551234567' },
        trucks: null,
        service_bays: null,
      }));

      const queryBuilder: Record<string, unknown> = {};
      const chain = () => queryBuilder;
      queryBuilder.order = chain;
      queryBuilder.range = (from: number, to: number) => {
        queryBuilder._range = { from, to };
        return queryBuilder;
      };
      queryBuilder.or = chain;
      queryBuilder.in = chain;
      queryBuilder.eq = chain;
      queryBuilder.is = chain;
      queryBuilder.then = (resolve: (value: unknown) => void) => {
        const { from, to } = queryBuilder._range as { from: number; to: number };
        resolve({ data: dataset.slice(from, to + 1), count: dataset.length, error: null });
      };

      const supabase = { from: () => ({ select: () => queryBuilder }) };
      const pageSize = 25;
      const page = Math.floor(1024 / pageSize);
      const { data, count, error } = await listShopWorkOrdersPage(supabase as never, {
        shopId: 'shop-1',
        isFounder: false,
        page,
        pageSize,
      });

      assert.equal(error, null);
      assert.equal(count, totalRows);
      assert.ok(data.some((row) => row.description === 'Past Cap Repair'));
    });
  }

  it('reaches the final page for 2050 rows with deterministic ordering', () => {
    const pageSize = 100;
    const lastPage = Math.ceil(2050 / pageSize) - 1;
    const { from } = pageRange(lastPage, pageSize);
    assert.equal(from, 2000);
  });
});
