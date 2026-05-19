'use client';

import { invoiceElementToPdfBase64 } from './invoiceHtmlToPdfBase64';

declare global {
  interface Window {
    __INVOICE_PRINT_READY__?: boolean;
  }
}

function waitForPrintPageReady(iframe: HTMLIFrameElement, maxMs = 20000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const printPage = doc?.querySelector('.print-page') as HTMLElement | null;
      const hasContent = (printPage?.textContent?.trim().length ?? 0) > 40;
      const readyFlag = win?.__INVOICE_PRINT_READY__ === true;

      if (printPage && hasContent && readyFlag) {
        resolve(printPage);
        return;
      }

      if (Date.now() - start > maxMs) {
        reject(new Error('Invoice print view did not finish loading.'));
        return;
      }

      setTimeout(check, 120);
    };

    check();
  });
}

/**
 * Capture PDF from the same /invoices/[id]/print route used in the browser.
 * Ensures emailed PDFs match the website print view for old and new invoices.
 */
export async function captureInvoicePdfFromPrintPage(
  invoiceId: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Invoice print capture');
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:850px',
    'height:3200px',
    'border:0',
    'z-index:2147483647',
    'background:#fff',
  ].join(';');

  const url = `${window.location.origin}/invoices/${encodeURIComponent(invoiceId)}/print?embed=1`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load invoice print view.'));
      iframe.src = url;
    });

    const printPage = await waitForPrintPageReady(iframe);
    await new Promise((r) => setTimeout(r, 400));

    return await invoiceElementToPdfBase64(
      printPage,
      iframe.contentWindow ?? undefined
    );
  } catch (error) {
    console.error('captureInvoicePdfFromPrintPage:', error);
    return null;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
