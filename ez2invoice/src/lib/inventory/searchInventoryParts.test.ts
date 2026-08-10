import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inventoryPartMatchesQuery } from './searchInventoryParts.ts';

describe('inventoryPartMatchesQuery', () => {
  it('matches part number, name, description, and supplier', () => {
    assert.equal(
      inventoryPartMatchesQuery(
        { part_name: 'Brake shoes', part_number: 'A470781810', description: null, supplier: null },
        '4707'
      ),
      true
    );
    assert.equal(
      inventoryPartMatchesQuery(
        { part_name: 'ALLIANCE Brake shoes 4707', part_number: null, description: null, supplier: null },
        '4707'
      ),
      true
    );
    assert.equal(
      inventoryPartMatchesQuery(
        {
          part_name: 'Tobera',
          part_number: 'X1',
          description: 'Fits 4707 brake shoes',
          supplier: null,
        },
        '4707'
      ),
      true
    );
    assert.equal(
      inventoryPartMatchesQuery(
        { part_name: 'Pads', part_number: '1', description: null, supplier: 'MERITOR 4707' },
        '4707'
      ),
      true
    );
  });

  it('returns false when term is not present', () => {
    assert.equal(
      inventoryPartMatchesQuery(
        { part_name: 'Oil Filter', part_number: 'OF-100', description: 'Engine oil', supplier: 'WIX' },
        '4707'
      ),
      false
    );
  });
});
