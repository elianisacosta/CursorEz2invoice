/** True only for first paint when no invoice rows are in memory yet. */
export function shouldShowInvoiceListSkeleton(
  initialLoading: boolean,
  rowCount: number
): boolean {
  return initialLoading && rowCount === 0;
}

/** Summary cards skeleton only before the first successful summary load. */
export function shouldShowInvoiceSummarySkeleton(
  initialLoading: boolean,
  summaryLoaded: boolean
): boolean {
  return initialLoading && !summaryLoaded;
}

export type InvoiceListFetchMode = 'initial' | 'background';

/** Decide whether a fetch should block the list with skeletons. */
export function resolveInvoiceListFetchMode(options: {
  background?: boolean;
  visibleRowCount: number;
}): InvoiceListFetchMode {
  if (options.background || options.visibleRowCount > 0) {
    return 'background';
  }
  return 'initial';
}
