'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { captureInvoicePdfFromData } from './captureInvoicePdfFromHtml';
import { captureInvoicePdfFromPrintPage } from './captureInvoicePdfFromPrintPage';
import { loadInvoiceDocumentData } from './loadInvoiceDocumentData';

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

  if (!data.invoiceTerms.trim()) {
    const localTerms = localStorage.getItem('ez2invoice-invoice-terms') || '';
    if (localTerms) data.invoiceTerms = localTerms;
  }

  try {
    // Primary: same React print route as the website (old + new invoices)
    let base64 = await captureInvoicePdfFromPrintPage(invoiceId);

    // Fallback: static HTML snapshot if print route capture fails
    if (!base64) {
      base64 = await captureInvoicePdfFromData(data);
    }

    if (!base64) {
      return {
        ok: false,
        error:
          'PDF capture failed. Open Print on the invoice to verify it loads, then try sending again.',
      };
    }

    return { ok: true, base64 };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error during PDF generation.';
    console.error('generateInvoicePdfBase64:', error);
    return { ok: false, error: message };
  }
}
