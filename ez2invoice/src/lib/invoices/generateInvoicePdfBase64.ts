'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import { loadInvoiceDocumentData } from './loadInvoiceDocumentData';
import { invoiceElementToPdfBase64 } from './invoiceHtmlToPdfBase64';
import { waitForInvoiceRender } from './waitForInvoiceRender';

export type InvoicePdfResult =
  | { ok: true; base64: string }
  | { ok: false; error: string };

/** Mount invoice on-screen (invisible) so html2canvas can capture it. */
function createPdfCaptureHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.setAttribute('data-invoice-pdf-capture', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:820px',
    'max-width:100vw',
    'background:#fff',
    'opacity:0.01',
    'pointer-events:none',
    'z-index:2147483646',
    'overflow:visible',
  ].join(';');
  document.body.appendChild(host);
  return host;
}

export async function generateInvoicePdfBase64(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<InvoicePdfResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'PDF generation is only available in the browser.' };
  }

  const data = await loadInvoiceDocumentData(supabase, invoiceId);
  if (!data) {
    return { ok: false, error: 'Invoice data could not be loaded.' };
  }

  if (!data.lineItems.length) {
    console.warn('[generateInvoicePdfBase64] Invoice has no line items:', invoiceId);
  }

  if (!data.invoiceTerms.trim()) {
    const localTerms = localStorage.getItem('ez2invoice-invoice-terms') || '';
    if (localTerms) data.invoiceTerms = localTerms;
  }

  const host = createPdfCaptureHost();
  const root = createRoot(host);

  try {
    root.render(createElement(InvoiceDocument, data));
    await waitForInvoiceRender(host, 6000);

    const printPage = host.querySelector('.print-page') as HTMLElement | null;
    if (!printPage) {
      return { ok: false, error: 'Invoice layout did not render.' };
    }

    // Extra frame for styles/layout to settle before canvas capture
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    const base64 = await invoiceElementToPdfBase64(printPage);
    if (!base64) {
      return {
        ok: false,
        error: 'PDF conversion failed. Try printing from the invoice print view instead.',
      };
    }

    return { ok: true, base64 };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error during PDF generation.';
    console.error('generateInvoicePdfBase64:', error);
    return { ok: false, error: message };
  } finally {
    root.unmount();
    if (host.parentNode) {
      document.body.removeChild(host);
    }
  }
}
