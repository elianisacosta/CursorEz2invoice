export type InvoiceListPerfSnapshot = {
  summaryMs: number;
  pageMs: number;
  customerMs: number;
  invoicesTransferred: number;
  dbRequests: number;
};

let lastSnapshot: InvoiceListPerfSnapshot | null = null;

export function logInvoiceListPerformance(snapshot: InvoiceListPerfSnapshot): void {
  lastSnapshot = snapshot;
  if (process.env.NODE_ENV !== 'development') return;
  console.info('[invoice-list-perf]', {
    summaryMs: Math.round(snapshot.summaryMs),
    pageMs: Math.round(snapshot.pageMs),
    customerMs: Math.round(snapshot.customerMs),
    invoicesTransferred: snapshot.invoicesTransferred,
    dbRequests: snapshot.dbRequests,
  });
}

export function getLastInvoiceListPerformance(): InvoiceListPerfSnapshot | null {
  return lastSnapshot;
}
