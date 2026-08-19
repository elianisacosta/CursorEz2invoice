import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCustomerActivityStats,
  emptyCustomerActivityStats,
  sumCustomerActivityStats,
} from './customerStats.ts';
import { replaceCustomerById, selectedCustomerId } from './searchCustomers.ts';

const FREEMAN_HISTORY_ID = '3dc8da77-0c31-4cb9-8e1b-3f82817128da';
const FREEMAN_TODAY_ID = 'dc8df65e-7016-459d-acec-046ecd9f7686';
const CHM_7998_ID = '756bfd8a-66d0-4e8c-9b0c-2b4bab4a0867';
const CHM_7990_ID = 'b39ca535-489b-42ef-b98e-bbb527a2ea4f';

describe('customer activity stats by customer.id', () => {
  it('attributes FREEMAN invoices only to the matching customer_id', () => {
    const invoices = [
      { customer_id: FREEMAN_HISTORY_ID, total_amount: 4000, created_at: '2026-07-31T04:00:00.000Z' },
      { customer_id: FREEMAN_HISTORY_ID, total_amount: 236.82, created_at: '2026-06-01T04:00:00.000Z' },
      { customer_id: FREEMAN_TODAY_ID, total_amount: 159, created_at: '2026-08-19T04:00:00.000Z' },
    ];
    const stats = computeCustomerActivityStats(
      [FREEMAN_HISTORY_ID, FREEMAN_TODAY_ID],
      invoices,
      []
    );

    assert.equal(stats[FREEMAN_HISTORY_ID].visits, 2);
    assert.equal(stats[FREEMAN_HISTORY_ID].totalSpent, 4236.82);
    assert.equal(stats[FREEMAN_HISTORY_ID].lastVisitAt, '2026-07-31T04:00:00.000Z');

    assert.equal(stats[FREEMAN_TODAY_ID].visits, 1);
    assert.equal(stats[FREEMAN_TODAY_ID].totalSpent, 159);
    assert.equal(stats[FREEMAN_TODAY_ID].lastVisitAt, '2026-08-19T04:00:00.000Z');
  });

  it('keeps CHM 7998 history on that id and leaves CHM 7990 at zero', () => {
    const invoices = Array.from({ length: 25 }, (_, index) => ({
      customer_id: CHM_7998_ID,
      total_amount: 100,
      created_at: `2026-08-${String((index % 19) + 1).padStart(2, '0')}T04:00:00.000Z`,
    }));
    invoices[0].created_at = '2026-08-19T04:00:00.000Z';
    const stats = computeCustomerActivityStats([CHM_7998_ID, CHM_7990_ID], invoices, []);

    assert.equal(stats[CHM_7998_ID].visits, 25);
    assert.equal(stats[CHM_7998_ID].totalSpent, 2500);
    assert.equal(stats[CHM_7998_ID].lastVisitAt, '2026-08-19T04:00:00.000Z');
    assert.deepEqual(stats[CHM_7990_ID], emptyCustomerActivityStats());
  });

  it('does not copy stats between similar names', () => {
    const stats = computeCustomerActivityStats(
      [FREEMAN_HISTORY_ID, FREEMAN_TODAY_ID],
      [{ customer_id: FREEMAN_TODAY_ID, total_amount: 159, created_at: '2026-08-19T04:00:00.000Z' }],
      []
    );
    assert.deepEqual(stats[FREEMAN_HISTORY_ID], emptyCustomerActivityStats());
    assert.equal(stats[FREEMAN_TODAY_ID].visits, 1);
  });

  it('uses max(invoices, work orders) for visits and the latest of either date', () => {
    const stats = computeCustomerActivityStats(
      ['cust-1'],
      [{ customer_id: 'cust-1', total_amount: 10, created_at: '2026-01-01T00:00:00.000Z' }],
      [
        { customer_id: 'cust-1', created_at: '2026-02-01T00:00:00.000Z', completed_at: null },
        { customer_id: 'cust-1', created_at: '2026-03-01T00:00:00.000Z', completed_at: '2026-04-01T00:00:00.000Z' },
      ]
    );
    assert.equal(stats['cust-1'].visits, 2);
    assert.equal(stats['cust-1'].totalSpent, 10);
    assert.equal(stats['cust-1'].lastVisitAt, '2026-04-01T00:00:00.000Z');
  });
});

describe('customer id selection', () => {
  it('stores the clicked row id, not a similar-name neighbor', () => {
    const selected = { id: FREEMAN_HISTORY_ID, company: 'FREEMAN TRANSPORT LLC' };
    const neighbor = { id: FREEMAN_TODAY_ID, company: 'FREEMAN TRANSPORT LLC' };
    const payload = { customer_id: selectedCustomerId(selected) };
    assert.equal(payload.customer_id, FREEMAN_HISTORY_ID);
    assert.notEqual(payload.customer_id, neighbor.id);
  });

  it('replaces the edited customer in place by id', () => {
    const rows = [
      { id: FREEMAN_HISTORY_ID, first_name: 'FREEMAN', last_name: 'OLD' },
      { id: FREEMAN_TODAY_ID, first_name: 'FREEMAN', last_name: 'NEW' },
    ];
    const updated = replaceCustomerById(rows, {
      id: FREEMAN_HISTORY_ID,
      first_name: 'FREEMAN',
      last_name: 'UPDATED',
    });
    assert.equal(updated[0].last_name, 'UPDATED');
    assert.equal(updated[1].id, FREEMAN_TODAY_ID);
    assert.equal(updated.length, 2);
  });
});

describe('sumCustomerActivityStats', () => {
  it('sums only the provided customer ids', () => {
    const totals = sumCustomerActivityStats({
      [FREEMAN_HISTORY_ID]: { visits: 9, totalSpent: 4236.82, lastVisitAt: '2026-07-31T04:00:00.000Z' },
      [FREEMAN_TODAY_ID]: { visits: 1, totalSpent: 159, lastVisitAt: '2026-08-19T04:00:00.000Z' },
    });
    assert.equal(totals.totalVisits, 10);
    assert.equal(totals.totalRevenue, 4395.82);
  });
});
