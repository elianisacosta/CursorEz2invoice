'use client';

import { buildInvoiceDocumentHtml } from './buildInvoiceDocumentHtml';
import type { InvoiceDocumentData } from './invoiceDocumentTypes';
import { invoiceElementToPdfBase64 } from './invoiceHtmlToPdfBase64';

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

async function waitForIframeContent(
  iframe: HTMLIFrameElement,
  maxMs = 15000
): Promise<HTMLElement> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const doc = iframe.contentDocument;
      const printPage = doc?.querySelector('.print-page') as HTMLElement | null;
      const textLen = printPage?.textContent?.trim().length ?? 0;

      if (printPage && textLen > 30) {
        resolve(printPage);
        return;
      }

      if (Date.now() - start > maxMs) {
        reject(new Error('Invoice HTML did not render in capture frame.'));
        return;
      }

      setTimeout(check, 80);
    };

    check();
  });
}

function loadHtmlInIframe(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Invoice PDF capture');
    iframe.style.cssText = IFRAME_STYLE;
    document.body.appendChild(iframe);

    const timeout = window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
      reject(new Error('Timed out loading invoice for PDF capture.'));
    }, 15000);

    iframe.onload = () => {
      window.clearTimeout(timeout);
      resolve(iframe);
    };

    iframe.onerror = () => {
      window.clearTimeout(timeout);
      if (iframe.parentNode) document.body.removeChild(iframe);
      reject(new Error('Failed to load invoice HTML for PDF capture.'));
    };

    iframe.srcdoc = html;
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

  await new Promise((r) => setTimeout(r, 350));
}

export async function captureInvoicePdfFromData(
  data: InvoiceDocumentData
): Promise<string | null> {
  const html = buildInvoiceDocumentHtml(data);
  let iframe: HTMLIFrameElement | null = null;

  try {
    iframe = await loadHtmlInIframe(html);
    const printPage = await waitForIframeContent(iframe);
    await prepareIframeForCapture(iframe, printPage);

    const base64 = await invoiceElementToPdfBase64(
      printPage,
      iframe.contentWindow ?? undefined
    );

    if (base64) return base64;

    return await invoiceElementToPdfBase64(printPage);
  } catch (error) {
    console.error('captureInvoicePdfFromData:', error);
    return null;
  } finally {
    if (iframe?.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
