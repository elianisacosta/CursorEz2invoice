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

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:820px;background:#fff;z-index:-1;';
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    root.render(createElement(InvoiceDocument, data));
    await waitForInvoiceRender(container);

    const base64 = await invoiceElementToPdfBase64(container);
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
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
