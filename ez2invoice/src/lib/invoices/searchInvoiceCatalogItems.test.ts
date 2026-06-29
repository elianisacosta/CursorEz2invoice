import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeInventoryPartFromInsert } from './searchInvoiceCatalogItems.ts';

describe('mergeInventoryPartFromInsert', () => {
  it('uses form values when INSERT RETURNING row is empty', () => {
    const merged = mergeInventoryPartFromInsert(null, {
      name: 'New Part',
      sku: '444',
      unit_price: 19.99,
    });
    assert.equal(merged, null);
  });

  it('merges RETURNING row with form fallbacks for invoice line linking', () => {
    const merged = mergeInventoryPartFromInsert(
      { id: 'part-444', selling_price: 0 },
      {
        name: 'New Part',
        sku: '444',
        unit_price: 19.99,
      }
    );

    assert.equal(merged?.id, 'part-444');
    assert.equal(merged?.part_number, '444');
    assert.equal(merged?.part_name, 'New Part');
    assert.equal(merged?.selling_price, 19.99);
  });
});
