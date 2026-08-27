import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  POSTGREST_PAGE_SIZE,
  fetchAllPagedRows,
  pageRange,
} from './postgrestPagination.ts';

function buildMockDataset(totalRows: number) {
  return Array.from({ length: totalRows }, (_, index) => ({
    id: `row-${index}`,
    sortKey: totalRows - index,
  }));
}

async function loadMockPage(
  dataset: { id: string; sortKey: number }[],
  from: number,
  to: number
) {
  return { data: dataset.slice(from, to + 1), error: null };
}

describe('fetchAllPagedRows regression', () => {
  for (const totalRows of [1205, 2050]) {
    it(`loads all ${totalRows} records past the 1000-row PostgREST cap`, async () => {
      const dataset = buildMockDataset(totalRows);
      const { data, error } = await fetchAllPagedRows((from, to) => loadMockPage(dataset, from, to));
      assert.equal(error, null);
      assert.equal(data.length, totalRows);
      assert.equal(data[0]?.id, 'row-0');
      assert.equal(data[999]?.id, 'row-999');
      assert.equal(data[1000]?.id, 'row-1000');
      assert.equal(data[totalRows - 1]?.id, `row-${totalRows - 1}`);
    });
  }

  it('finds a record on page 2 when dataset has 1205 rows and page size is 25', async () => {
    const dataset = buildMockDataset(1205);
    const targetId = 'row-1024';
    const pageSize = 25;
    const page = Math.floor(1024 / pageSize);
    const { from, to } = pageRange(page, pageSize);
    const pageRows = dataset.slice(from, to + 1);
    assert.ok(pageRows.some((row) => row.id === targetId));
    assert.equal(page, 40);
  });

  it('paginates to the last page when dataset has 2050 rows and page size is 50', async () => {
    const dataset = buildMockDataset(2050);
    const pageSize = 50;
    const lastPage = Math.ceil(dataset.length / pageSize) - 1;
    const { from, to } = pageRange(lastPage, pageSize);
    const pageRows = dataset.slice(from, to + 1);
    assert.equal(pageRows.length, 50);
    assert.equal(pageRows[0]?.id, 'row-2000');
    assert.equal(pageRows[49]?.id, 'row-2049');
  });

  it('merges exactly POSTGREST_PAGE_SIZE + 1 rows in two requests', async () => {
    let requestCount = 0;
    const { data } = await fetchAllPagedRows(async (from, to) => {
      requestCount += 1;
      const batchSize = Math.min(POSTGREST_PAGE_SIZE, 1001 - from);
      const rows = Array.from({ length: batchSize }, (_, index) => ({ id: from + index }));
      return { data: rows, error: null };
    });
    assert.equal(requestCount, 2);
    assert.equal(data.length, 1001);
  });
});
