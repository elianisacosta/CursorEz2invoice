'use client';

import { invoiceElementToPdfBase64 } from './invoiceHtmlToPdfBase64';

declare global {
  interface Window {
    __INVOICE_PRINT_READY__?: boolean;
  }
}

const IFRAME_STYLE = [
  'position:fixed',
  'left:-10000px',
  'top:0',
  'width:816px',
  'height:1200px',
  'border:0',
  'opacity:1',
  'visibility:visible',
  'pointer-events:none',
  'z-index:1',
  'background:#fff',
].join(';');

function waitForPrintPageReady(iframe: HTMLIFrameElement, maxMs = 25000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let stablePasses = 0;
    let lastTextLen = 0;

    const check = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const printPage = doc?.querySelector('.print-page') as HTMLElement | null;
      const textLen = printPage?.textContent?.trim().length ?? 0;
      const hasContent = textLen > 30;
      const readyFlag = win?.__INVOICE_PRINT_READY__ === true;
      const errorBanner = doc?.body?.textContent?.includes('Unable to print invoice');

      if (errorBanner) {
        reject(new Error('Invoice print view failed to load.'));
        return;
      }

      if (hasContent && textLen === lastTextLen) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
        lastTextLen = textLen;
      }

      if (printPage && hasContent && (readyFlag || stablePasses >= 4)) {
        resolve(printPage);
        return;
      }

      if (Date.now() - start > maxMs) {
        reject(new Error('Invoice print view did not finish loading.'));
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

async function prepareIframeForCapture(
  iframe: HTMLIFrameElement,
  printPage: HTMLElement
): Promise<void> {
  const doc = iframe.contentDocument;
  if (!doc) return;

  const contentHeight = Math.max(printPage.scrollHeight, printPage.offsetHeight, 400);
  iframe.style.height = `${Math.min(contentHeight + 48, 12000)}px`;

  if (doc.fonts?.ready) {
    try {
      await doc.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  await new Promise((r) => setTimeout(r, 400));
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
  iframe.style.cssText = IFRAME_STYLE;

  const url = `${window.location.origin}/invoices/${encodeURIComponent(invoiceId)}/print?embed=1`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load invoice print view.'));
      iframe.src = url;
    });

    const printPage = await waitForPrintPageReady(iframe);
    await prepareIframeForCapture(iframe, printPage);

    let base64 = await invoiceElementToPdfBase64(
      printPage,
      iframe.contentWindow ?? undefined
    );

    if (!base64) {
      base64 = await invoiceElementToPdfBase64(printPage);
    }

    return base64;
  } catch (error) {
    console.error('captureInvoicePdfFromPrintPage:', error);
    return null;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
