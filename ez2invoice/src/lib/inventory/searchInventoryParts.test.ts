import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INVENTORY_CATEGORY_ALL,
  buildInventorySearchOrFilter,
  getInventoryStockBadge,
  inventoryPartMatchesCategory,
  inventoryPartMatchesQuery,
  inventoryPartMatchesStockStatus,
  inventoryStockFilterNeedsScan,
  mergeInventorySearchResults,
  normalizeInventoryCategoryLabel,
} from './searchInventoryParts.ts';

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

  it('merges local and server search hits by id without wiping local matches', () => {
    const merged = mergeInventorySearchResults(
      [{ id: 'a', part_name: 'Local Only' }],
      [
        { id: 'a', part_name: 'Server Updated' },
        { id: 'b', part_name: 'Server Only' },
      ]
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((row) => row.id === 'a')?.part_name, 'Server Updated');
    assert.equal(merged.find((row) => row.id === 'b')?.part_name, 'Server Only');
  });
});

describe('inventoryPartMatchesStockStatus', () => {
  const threshold = 5;

  it('classifies in / low / out / negative stock by quantity vs threshold', () => {
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: 10, minimum_stock_level: threshold }, 'in_stock'),
      true
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: 5, minimum_stock_level: threshold }, 'in_stock'),
      false
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: 3, minimum_stock_level: threshold }, 'low_stock'),
      true
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: 0, minimum_stock_level: threshold }, 'low_stock'),
      false
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: 0, minimum_stock_level: threshold }, 'out_of_stock'),
      true
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: -2, minimum_stock_level: threshold }, 'negative_stock'),
      true
    );
    assert.equal(
      inventoryPartMatchesStockStatus({ quantity_in_stock: -2, minimum_stock_level: threshold }, 'all'),
      true
    );
  });
});

describe('inventoryPartMatchesCategory', () => {
  it('treats All Categories as no filter and defaults blank category to General', () => {
    assert.equal(inventoryPartMatchesCategory({ category: 'Tires' }, INVENTORY_CATEGORY_ALL), true);
    assert.equal(inventoryPartMatchesCategory({ category: 'Tires' }, 'Tires'), true);
    assert.equal(inventoryPartMatchesCategory({ category: 'Tires' }, 'Brakes'), false);
    assert.equal(inventoryPartMatchesCategory({ category: null }, 'General'), true);
  });
});

describe('getInventoryStockBadge', () => {
  it('labels negative, out, low, and in stock distinctly', () => {
    assert.equal(getInventoryStockBadge({ quantity_in_stock: -1, minimum_stock_level: 2 }).label, 'Negative Stock');
    assert.equal(getInventoryStockBadge({ quantity_in_stock: 0, minimum_stock_level: 2 }).label, 'Out of Stock');
    assert.equal(getInventoryStockBadge({ quantity_in_stock: 1, minimum_stock_level: 2 }).label, 'Low Stock');
    assert.equal(getInventoryStockBadge({ quantity_in_stock: 5, minimum_stock_level: 2 }).label, 'In Stock');
  });
});

describe('inventory server search filters', () => {
  it('includes supplier in the ILIKE filter along with name, number, and description', () => {
    const filter = buildInventorySearchOrFilter('meritor') || '';
    assert.equal(filter.includes('part_name.ilike.%meritor%'), true);
    assert.equal(filter.includes('part_number.ilike.%meritor%'), true);
    assert.equal(filter.includes('description.ilike.%meritor%'), true);
    assert.equal(filter.includes('supplier.ilike.%meritor%'), true);
  });

  it('scans in-stock and low-stock filters because they compare two columns', () => {
    assert.equal(inventoryStockFilterNeedsScan('all'), false);
    assert.equal(inventoryStockFilterNeedsScan('out_of_stock'), false);
    assert.equal(inventoryStockFilterNeedsScan('negative_stock'), false);
    assert.equal(inventoryStockFilterNeedsScan('low_stock'), true);
    assert.equal(inventoryStockFilterNeedsScan('in_stock'), true);
  });

  it('treats blank categories as General', () => {
    assert.equal(normalizeInventoryCategoryLabel(null), 'General');
    assert.equal(normalizeInventoryCategoryLabel('  '), 'General');
    assert.equal(normalizeInventoryCategoryLabel('FILTER'), 'FILTER');
  });
});
