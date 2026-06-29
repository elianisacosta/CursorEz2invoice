import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInventoryPartToInvoiceLineItem,
  buildInvoiceLineItemDescriptionForSave,
  buildPartLineDescriptionFallback,
  hydrateInvoiceLineItemLabelsFromRow,
  prepareSavableInvoiceLineItems,
} from './invoiceLineItemPersistence.ts';

describe('invoiceLineItemPersistence', () => {
  it('builds a persisted description from part number and name when note is empty', () => {
    const description = buildInvoiceLineItemDescriptionForSave({
      item_type: 'part',
      reference_id: 'part-1',
      item_number: '444',
      item_name: 'Widget',
      description: '',
      quantity: 1,
      unit_price: 25,
      total_price: 25,
    });
    assert.equal(description, '444 — Widget');
  });

  it('applies inventory part fields to an invoice line item', () => {
    const line = applyInventoryPartToInvoiceLineItem(
      {
        item_type: 'labor',
        description: 'search text',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        lineId: 'line-abc',
      },
      {
        id: 'part-444',
        part_number: '444',
        part_name: 'New Part',
        selling_price: 19.99,
      }
    );

    assert.equal(line.item_type, 'part');
    assert.equal(line.reference_id, 'part-444');
    assert.equal(line.item_number, '444');
    assert.equal(line.item_name, 'New Part');
    assert.equal(line.unit_price, 19.99);
    assert.equal(line.lineId, 'line-abc');
  });

  it('includes normalized new part rows in the savable payload', () => {
    const { savable } = prepareSavableInvoiceLineItems(
      [
        {
          item_type: 'part',
          reference_id: 'part-444',
          item_number: '444',
          item_name: 'New Part',
          description: '',
          quantity: 2,
          unit_price: 10,
          total_price: 0,
          lineId: 'line-1',
        },
      ],
      {
        isEmpty: (item) => !item.reference_id && !item.description?.trim(),
        withTotals: (item) => ({
          ...item,
          total_price: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        }),
      }
    );

    assert.equal(savable.length, 1);
    assert.equal(savable[0].total_price, 20);
    assert.equal(savable[0].reference_id, 'part-444');
  });

  it('hydrates labels from saved description when item_name columns are missing', () => {
    const labels = hydrateInvoiceLineItemLabelsFromRow({
      description: '444 — New Part',
      item_type: 'part',
      reference_id: 'part-444',
    });

    assert.equal(labels.item_number, '444');
    assert.equal(labels.item_name, 'New Part');
  });

  it('builds part description fallback for database persistence', () => {
    assert.equal(
      buildPartLineDescriptionFallback({
        id: 'part-444',
        part_number: '444',
        part_name: 'New Part',
      }),
      '444 — New Part'
    );
  });
});
