import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInventoryPartToInvoiceLineItem,
  buildInvoiceLineItemDbPayloads,
  buildInvoiceLineItemDescriptionForSave,
  buildPartLineDescriptionFallback,
  extractSavedDisplayLabelFromRow,
  getSavedInvoiceLineItemDisplayLabel,
  hydrateInvoiceLineItemLabelsFromRow,
  hydrateInvoiceLineItemRowsForEdit,
  isGenericInvoiceLinePlaceholder,
  isUiOnlyInvoiceLineItemEmpty,
  mapInvoiceLineItemRowForEdit,
  normalizeInvoiceLineItemType,
  prepareSavableInvoiceLineItems,
  resolveInvoiceLineItemLoadForEdit,
  resolveInvoiceLineItemSavePayload,
  resolveInvoiceLineItemRowsForEdit,
  captureInvoiceLineItemDbSnapshot,
  canMutateInvoiceLineItemsForSave,
  isInvoiceLineItemFetchFailure,
  wouldInvoiceLineItemSaveRegressToService,
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

  it('normalizes legacy service item_type to labor for edit', () => {
    assert.equal(normalizeInvoiceLineItemType('service'), 'labor');
    assert.equal(normalizeInvoiceLineItemType('part'), 'part');
  });

  it('preserves saved invoice labels when catalog lookup is missing', () => {
    const [line] = hydrateInvoiceLineItemRowsForEdit(
      [
        {
          id: 'row-1',
          item_type: 'service',
          reference_id: 'missing-labor-id',
          description: 'AC GAS AND LABOR',
          quantity: 1,
          unit_price: 150,
          total_price: 150,
        },
      ],
      { laborById: new Map(), partById: new Map() }
    );

    assert.equal(line.item_type, 'labor');
    assert.equal(line.item_name, 'AC GAS AND LABOR');
    assert.equal(getSavedInvoiceLineItemDisplayLabel(line), 'AC GAS AND LABOR');
  });

  it('does not replace saved item_name with catalog labels', () => {
    const [line] = hydrateInvoiceLineItemRowsForEdit(
      [
        {
          id: 'row-2',
          item_type: 'labor',
          reference_id: 'labor-1',
          item_name: 'Saved labor label',
          description: 'Saved labor label',
          quantity: 1,
          unit_price: 100,
          total_price: 100,
        },
      ],
      {
        laborById: new Map([
          ['labor-1', { service_name: 'Generic Service', description: 'Catalog description' }],
        ]),
      }
    );

    assert.equal(line.item_name, 'Saved labor label');
    assert.equal(getSavedInvoiceLineItemDisplayLabel(line), 'Saved labor label');
  });

  it('falls back to cached invoice rows when fetch fails', () => {
    const resolved = resolveInvoiceLineItemLoadForEdit(
      'inv-1',
      [],
      { message: 'Failed to fetch' },
      [{ invoice_id: 'inv-1', description: 'Cached part line', item_type: 'part' }]
    );
    assert.equal(resolved.status, 'loaded-stale');
    assert.equal(resolved.fromCache, true);
    assert.equal(resolved.canMutateLineItems, false);
    assert.equal(resolved.rows.length, 1);
    assert.equal(resolved.rows[0].description, 'Cached part line');
  });

  it('does not treat a failed fetch as an empty invoice_items table', () => {
    const resolved = resolveInvoiceLineItemLoadForEdit('inv-1', [], { message: 'Failed to fetch' }, []);
    assert.equal(resolved.status, 'error');
    assert.equal(resolved.rows.length, 0);
    assert.equal(resolved.canMutateLineItems, false);
  });

  it('does not use cache when fetch succeeds with zero rows', () => {
    const resolved = resolveInvoiceLineItemLoadForEdit(
      'inv-1',
      [],
      null,
      [{ invoice_id: 'inv-1', description: 'Stale cache line', item_type: 'part' }]
    );
    assert.equal(resolved.status, 'empty');
    assert.equal(resolved.rows.length, 0);
    assert.equal(resolved.canMutateLineItems, true);
  });

  it('treats empty fetch after reconnect with known snapshot as reconnecting', () => {
    const resolved = resolveInvoiceLineItemLoadForEdit(
      'inv-1',
      [],
      null,
      [],
      {
        priorSuccessfulSnapshot: [
          { invoice_id: 'inv-1', id: 'line-1', description: 'Oil Change', unit_price: 150 },
        ],
        invoiceSubtotal: 150,
        recentlyReconnected: true,
      }
    );
    assert.equal(resolved.status, 'reconnecting');
    assert.equal(resolved.canMutateLineItems, false);
    assert.equal(resolved.rows[0].description, 'Oil Change');
  });

  it('rejects generic Service fetch when snapshot had real labels', () => {
    const resolved = resolveInvoiceLineItemLoadForEdit(
      'inv-1',
      [{ invoice_id: 'inv-1', id: 'line-1', description: 'Service', unit_price: 504 }],
      null,
      [],
      {
        priorSuccessfulSnapshot: [
          { invoice_id: 'inv-1', id: 'line-1', description: 'AC GAS AND LABOR', unit_price: 504 },
        ],
        invoiceSubtotal: 504,
        recentlyReconnected: true,
      }
    );
    assert.equal(resolved.status, 'reconnecting');
    assert.equal(resolved.rows[0].description, 'AC GAS AND LABOR');
    assert.equal(resolved.canMutateLineItems, false);
  });

  it('blocks save payload that regresses to Service', () => {
    const blocked = wouldInvoiceLineItemSaveRegressToService(
      [
        {
          id: 'line-1',
          item_type: 'labor',
          reference_id: null,
          description: 'Service',
          quantity: 1,
          unit_price: 504,
          total_price: 504,
          userModified: false,
          originalDbSnapshot: {
            description: 'Oil Change',
            item_name: 'Oil Change',
            item_number: null,
            reference_id: null,
            item_type: 'labor',
            quantity: 1,
            unit_price: 504,
            total_price: 504,
            discount_type: 'none',
            discount_value: 0,
            discount_amount: 0,
            taxable: true,
          },
        },
      ],
      new Map()
    );
    assert.equal(blocked.blocked, true);
  });

  it('detects network fetch failures', () => {
    assert.equal(isInvoiceLineItemFetchFailure({ message: 'Failed to fetch' }), true);
    assert.equal(isInvoiceLineItemFetchFailure(null), false);
    assert.equal(canMutateInvoiceLineItemsForSave('loaded-stale'), false);
    assert.equal(canMutateInvoiceLineItemsForSave('loaded'), true);
  });

  it('maps database row id to stable lineId for edit', () => {
    const line = mapInvoiceLineItemRowForEdit({
      id: 'db-line-1',
      item_type: 'part',
      description: '444 — Widget',
      quantity: 2,
      unit_price: 10,
      total_price: 20,
    });
    assert.equal(line.id, 'db-line-1');
    assert.equal(line.lineId, 'db-line-1');
    assert.equal(line.item_number, '444');
    assert.equal(line.item_name, 'Widget');
    assert.equal(line.savedDisplayLabel, '444 — Widget');
  });

  it('ignores generic Service placeholder and uses catalog name when row text is placeholder', () => {
    const label = extractSavedDisplayLabelFromRow(
      {
        description: 'Service',
        item_type: 'labor',
        reference_id: 'labor-1',
      },
      {
        laborById: new Map([['labor-1', { service_name: 'Oil Change' }]]),
      }
    );
    assert.equal(label, 'Oil Change');
  });

  it('prefers real saved description over generic Service', () => {
    const label = extractSavedDisplayLabelFromRow({
      description: 'AC GAS AND LABOR',
      item_type: 'service',
    });
    assert.equal(label, 'AC GAS AND LABOR');
    assert.equal(isGenericInvoiceLinePlaceholder('Service'), true);
    assert.equal(isGenericInvoiceLinePlaceholder('AC GAS AND LABOR'), false);
  });

  it('reads alternate row field names such as name/title', () => {
    const label = extractSavedDisplayLabelFromRow({
      name: 'Brake Pad Replacement',
      item_type: 'labor',
    });
    assert.equal(label, 'Brake Pad Replacement');
  });

  it('preserves unchanged existing row snapshot on save', () => {
    const payload = resolveInvoiceLineItemSavePayload(
      {
        id: 'line-1',
        item_type: 'labor',
        reference_id: null,
        description: 'Service',
        savedDisplayLabel: 'Service',
        item_name: 'Service',
        item_number: null,
        quantity: 1,
        unit_price: 504,
        total_price: 504,
        userModified: false,
        originalDbSnapshot: {
          description: 'AC GAS AND LABOR',
          item_name: 'AC GAS AND LABOR',
          item_number: null,
          reference_id: null,
          item_type: 'labor',
          quantity: 1,
          unit_price: 504,
          total_price: 504,
          discount_type: 'none',
          discount_value: 0,
          discount_amount: 0,
          taxable: true,
        },
      },
      {
        description: 'Service',
        item_name: 'Service',
        quantity: 1,
        unit_price: 504,
        total_price: 504,
      }
    );
    assert.equal(payload.description, 'AC GAS AND LABOR');
    assert.equal('item_name' in payload, false);
  });

  it('builds schema-safe DB payloads without item_name or item_number', () => {
    const [payload] = buildInvoiceLineItemDbPayloads('inv-1', [
      {
        id: 'line-2',
        item_type: 'labor',
        reference_id: null,
        description: 'ALIGMENT TRUCK FOR AXEL',
        savedDisplayLabel: 'ALIGMENT TRUCK FOR AXEL',
        item_name: 'ALIGMENT TRUCK FOR AXEL',
        quantity: 3,
        unit_price: 120,
        total_price: 360,
      },
    ]);
    assert.equal(payload.description, 'ALIGMENT TRUCK FOR AXEL');
    assert.equal(payload.reference_id, null);
    assert.equal('item_name' in payload, false);
    assert.equal('item_number' in payload, false);
  });

  it('blocks regressing a prior DB description to Service unless user edited', () => {
    const payload = resolveInvoiceLineItemSavePayload(
      {
        id: 'line-1',
        item_type: 'labor',
        reference_id: null,
        description: 'Service',
        quantity: 1,
        unit_price: 150,
        total_price: 150,
        userModified: true,
      },
      { description: 'Service' },
      { description: 'Oil Change', item_name: 'Oil Change' }
    );
    assert.equal(payload.description, 'Oil Change');
  });

  it('treats UI padding rows as empty but never existing DB rows', () => {
    assert.equal(isUiOnlyInvoiceLineItemEmpty({ quantity: 1, unit_price: 0, total_price: 0 }), true);
    assert.equal(
      isUiOnlyInvoiceLineItemEmpty({
        id: 'db-line-1',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      }),
      false
    );
    assert.equal(
      isUiOnlyInvoiceLineItemEmpty({
        description: 'Service',
        quantity: 1,
        unit_price: 504,
        total_price: 504,
      }),
      false
    );
  });

  it('persists optional notes separately from item description', () => {
    const [payload] = buildInvoiceLineItemDbPayloads('inv-1', [
      {
        id: 'line-note-1',
        item_type: 'labor',
        reference_id: 'labor-1',
        description: 'TAKE TIRE OUT',
        savedDisplayLabel: 'TAKE TIRE OUT',
        notes: 'customer requested tire removal only',
        quantity: 1,
        unit_price: 50,
        total_price: 50,
        userModified: true,
      },
    ]);
    assert.equal(payload.description, 'TAKE TIRE OUT');
    assert.equal(payload.notes, 'customer requested tire removal only');
    assert.equal('item_name' in payload, false);
  });

  it('does not let a typed note replace the item name in description', () => {
    const description = buildInvoiceLineItemDescriptionForSave(
      {
        item_type: 'labor',
        reference_id: 'labor-1',
        description: 'TAKE TIRE OUT',
        savedDisplayLabel: 'TAKE TIRE OUT',
        notes: 'optional note',
        quantity: 1,
        unit_price: 50,
        total_price: 50,
      },
      'optional note that must not become description'
    );
    assert.equal(description, 'TAKE TIRE OUT');
  });

  it('loads notes from DB rows and preserves them on unchanged save', () => {
    const mapped = mapInvoiceLineItemRowForEdit({
      id: 'line-1',
      item_type: 'labor',
      reference_id: 'labor-1',
      description: 'TAKE TIRE OUT',
      notes: 'keep this note',
      quantity: 1,
      unit_price: 50,
      total_price: 50,
    });
    assert.equal(mapped.description, 'TAKE TIRE OUT');
    assert.equal(mapped.notes, 'keep this note');
    assert.equal(mapped.savedDisplayLabel, 'TAKE TIRE OUT');

    const [payload] = buildInvoiceLineItemDbPayloads('inv-1', [mapped as any], {
      priorRowsById: new Map([
        [
          'line-1',
          {
            id: 'line-1',
            description: 'TAKE TIRE OUT',
            notes: 'keep this note',
            item_type: 'labor',
            reference_id: 'labor-1',
            quantity: 1,
            unit_price: 50,
            total_price: 50,
          },
        ],
      ]),
    });
    assert.equal(payload.description, 'TAKE TIRE OUT');
    assert.equal(payload.notes, 'keep this note');
  });

  it('saves empty notes as null and ignores notes-only padding rows', () => {
    const [payload] = buildInvoiceLineItemDbPayloads('inv-1', [
      {
        item_type: 'labor',
        reference_id: 'labor-1',
        description: 'TAKE TIRE OUT',
        savedDisplayLabel: 'TAKE TIRE OUT',
        notes: '   ',
        quantity: 1,
        unit_price: 50,
        total_price: 50,
        userModified: true,
      },
    ]);
    assert.equal(payload.notes, null);

    const prepared = prepareSavableInvoiceLineItems(
      [
        {
          item_type: 'labor' as const,
          reference_id: null,
          description: '',
          notes: 'orphan note',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        },
      ],
      {
        isEmpty: (item) => isUiOnlyInvoiceLineItemEmpty(item),
        withTotals: (item) => item,
      }
    );
    assert.equal(prepared.savable.length, 0);
  });
});
