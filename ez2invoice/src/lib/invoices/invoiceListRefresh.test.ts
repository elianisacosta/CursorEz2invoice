import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveInvoiceListFetchMode,
  shouldShowInvoiceListSkeleton,
  shouldShowInvoiceSummarySkeleton,
} from './invoiceListRefresh.ts';

describe('invoiceListRefresh loading helpers', () => {
  it('A: skeleton allowed only on initial load with zero rows', () => {
    assert.equal(shouldShowInvoiceListSkeleton(true, 0), true);
    assert.equal(shouldShowInvoiceListSkeleton(true, 25), false);
    assert.equal(shouldShowInvoiceListSkeleton(false, 0), false);
    assert.equal(shouldShowInvoiceListSkeleton(false, 25), false);
  });

  it('summary skeleton only before first summary load', () => {
    assert.equal(shouldShowInvoiceSummarySkeleton(true, false), true);
    assert.equal(shouldShowInvoiceSummarySkeleton(true, true), false);
    assert.equal(shouldShowInvoiceSummarySkeleton(false, false), false);
  });

  it('background fetch when rows exist or background flag set', () => {
    assert.equal(
      resolveInvoiceListFetchMode({ background: false, visibleRowCount: 0 }),
      'initial'
    );
    assert.equal(
      resolveInvoiceListFetchMode({ background: false, visibleRowCount: 10 }),
      'background'
    );
    assert.equal(
      resolveInvoiceListFetchMode({ background: true, visibleRowCount: 0 }),
      'background'
    );
  });
});

describe('invoice list UX regression (source guards)', () => {
  const dashboardSource = readFileSync(
    resolve(process.cwd(), 'src/app/dashboard/page.tsx'),
    'utf8'
  );

  function blockBetween(start: string, end: string): string {
    const startIdx = dashboardSource.indexOf(start);
    assert.notEqual(startIdx, -1, `missing block start: ${start}`);
    const endIdx = dashboardSource.indexOf(end, startIdx);
    assert.notEqual(endIdx, -1, `missing block end: ${end}`);
    return dashboardSource.slice(startIdx, endIdx);
  }

  it('B: tab switch does not refetch when invoice rows are cached', () => {
    assert.match(
      dashboardSource,
      /if \(activeTab === 'invoices' && invoicesRef\.current\.length > 0\) \{\s*skipNextInvoiceFetchRef\.current = true/
    );
    assert.match(dashboardSource, /if \(skipNextInvoiceFetchRef\.current\)/);
  });

  it('E: send invoice does not refresh the full list', () => {
    const sendBlock = blockBetween(
      'const handleSendInvoice = async',
      'const handlePrintInvoice = async'
    );
    assert.doesNotMatch(sendBlock, /refreshInvoiceList\(\)/);
  });

  it('C/D/E: create, edit, delete avoid full-list refreshInvoiceList', () => {
    const createBlock = dashboardSource.slice(
      dashboardSource.indexOf("showToast({ type: 'success', message: 'Invoice created' })"),
      dashboardSource.indexOf('// Close modal and reset form')
    );
    assert.doesNotMatch(createBlock, /refreshInvoiceList\(\)/);

    const editBlock = dashboardSource.slice(
      dashboardSource.indexOf("showToast({ type: 'success', message: 'Invoice updated' })"),
      dashboardSource.indexOf('// Keep drawer open so user can print')
    );
    assert.doesNotMatch(editBlock, /refreshInvoiceList\(\)/);

    const deleteBlock = dashboardSource.slice(
      dashboardSource.indexOf("showToast({ type: 'success', message: 'Invoice deleted' })"),
      dashboardSource.indexOf('setInvoiceToDelete(null)')
    );
    assert.doesNotMatch(deleteBlock, /refreshInvoiceList\(\)/);
  });

  it('H: payment record/delete reconcile row instead of refreshInvoiceList', () => {
    const recordBlock = blockBetween(
      'const handleRecordPayment = async',
      'const handleDeleteInvoicePayment = async'
    );
    assert.doesNotMatch(recordBlock, /refreshInvoiceList\(\)/);
    assert.match(recordBlock, /reconcileInvoiceRowInList/);
    assert.match(recordBlock, /refreshInvoiceSummaryOnly/);

    const deletePaymentBlock = blockBetween(
      'const handleDeleteInvoicePayment = async',
      'const handleSendInvoice = async'
    );
    assert.doesNotMatch(deletePaymentBlock, /refreshInvoiceList\(\)/);
    assert.match(deletePaymentBlock, /reconcileInvoiceRowInList/);
    assert.match(deletePaymentBlock, /refreshInvoiceSummaryOnly/);
  });

  it('list skeleton uses initial loading + zero rows', () => {
    assert.match(
      dashboardSource,
      /const showInvoiceListSkeleton = shouldShowInvoiceListSkeleton\(\s*invoiceInitialLoading,\s*invoices\.length\s*\)/
    );
    assert.match(
      dashboardSource,
      /const showInvoiceSummarySkeleton = shouldShowInvoiceSummarySkeleton\(\s*invoiceInitialLoading,\s*invoiceSummaryLoaded\s*\)/
    );
    assert.match(dashboardSource, /\{showInvoiceListSkeleton \?/);
    assert.match(dashboardSource, /\{showInvoiceSummarySkeleton \?/);
  });

  it('fetchInvoiceList supports background mode without always setting initial loading', () => {
    const fetchBlock = blockBetween(
      'const fetchInvoiceList = async',
      'const refreshInvoiceList = async'
    );
    assert.match(fetchBlock, /resolveInvoiceListFetchMode/);
    assert.match(fetchBlock, /setInvoiceInitialLoading\(true\)/);
    assert.match(fetchBlock, /setInvoiceListRefreshing\(true\)/);
    assert.doesNotMatch(fetchBlock, /setInvoiceListLoading\(true\)/);
  });
});
