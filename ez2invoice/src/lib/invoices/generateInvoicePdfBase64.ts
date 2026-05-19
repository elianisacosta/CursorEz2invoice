'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { captureInvoicePdfFromData } from './captureInvoicePdfFromHtml';
import { captureInvoicePdfFromPrintPage } from './captureInvoicePdfFromPrintPage';
import { loadInvoiceDocumentData } from './loadInvoiceDocumentData';

export type InvoicePdfResult =
  | { ok: true; base64: string }
  | { ok: false; error: string };

const USER_FACING_PDF_ERROR =
  'Invoice PDF could not be generated. Please try again.';

export async function generateInvoicePdfBase64(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<InvoicePdfResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: USER_FACING_PDF_ERROR };
  }

  const data = await loadInvoiceDocumentData(supabase, invoiceId);
  if (!data) {
    return { ok: false, error: USER_FACING_PDF_ERROR };
  }

  if (!data.invoiceTerms.trim()) {
    const localTerms = localStorage.getItem('ez2invoice-invoice-terms') || '';
    if (localTerms) data.invoiceTerms = localTerms;
  }

  try {
    // Primary: static HTML using the same styles as the print view (works without opening print)
    let base64 = await captureInvoicePdfFromData(data);

    // Fallback: live React print route for parity with the website print page
    if (!base64) {
      base64 = await captureInvoicePdfFromPrintPage(invoiceId);
    }

    if (!base64) {
      return { ok: false, error: USER_FACING_PDF_ERROR };
    }

    return { ok: true, base64 };
  } catch (error) {
    console.error('generateInvoicePdfBase64:', error);
    return { ok: false, error: USER_FACING_PDF_ERROR };
  }
}
