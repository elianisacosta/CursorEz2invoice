'use client';

import { buildInvoiceDocumentHtml } from './buildInvoiceDocumentHtml';
import type { InvoiceDocumentData } from './invoiceDocumentTypes';
import { invoiceElementToPdfBase64 } from './invoiceHtmlToPdfBase64';

function loadHtmlInIframe(html: string): Promise<{
  iframe: HTMLIFrameElement;
  printPage: HTMLElement;
}> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Invoice PDF capture');
    iframe.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:850px',
      'height:2400px',
      'border:0',
      'z-index:2147483647',
      'background:#fff',
    ].join(';');
    document.body.appendChild(iframe);

    const timeout = window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
      reject(new Error('Timed out loading invoice for PDF capture.'));
    }, 12000);

    iframe.onload = () => {
      window.clearTimeout(timeout);
      const doc = iframe.contentDocument;
      const printPage = doc?.querySelector('.print-page') as HTMLElement | null;
      if (!doc || !printPage) {
        if (iframe.parentNode) document.body.removeChild(iframe);
        reject(new Error('Invoice HTML did not render in capture frame.'));
        return;
      }
      resolve({ iframe, printPage });
    };

    iframe.srcdoc = html;
  });
}

export async function captureInvoicePdfFromData(
  data: InvoiceDocumentData
): Promise<string | null> {
  const html = buildInvoiceDocumentHtml(data);
  let iframe: HTMLIFrameElement | null = null;

  try {
    const loaded = await loadHtmlInIframe(html);
    iframe = loaded.iframe;
    const { printPage } = loaded;

    await new Promise((r) => setTimeout(r, 250));

    const base64 = await invoiceElementToPdfBase64(
      printPage,
      iframe.contentWindow ?? undefined
    );

    return base64;
  } finally {
    if (iframe?.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
