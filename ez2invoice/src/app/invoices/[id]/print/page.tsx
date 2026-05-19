'use client';

declare global {
  interface Window {
    __INVOICE_PRINT_READY__?: boolean;
  }
}

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import { loadInvoiceDocumentData } from '@/lib/invoices/loadInvoiceDocumentData';
import type { InvoiceDocumentData } from '@/lib/invoices/invoiceDocumentTypes';

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const invoiceId = String(params?.id || '');
  const embedMode = searchParams.get('embed') === '1';
  const hasPrintedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<InvoiceDocumentData | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId) {
        setError('Missing invoice id.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const data = await loadInvoiceDocumentData(supabase, invoiceId);

        if (!data) {
          throw new Error('Invoice not found');
        }

        if (!data.invoiceTerms.trim() && typeof window !== 'undefined') {
          const stored = localStorage.getItem('ez2invoice-invoice-terms') || '';
          if (stored) data.invoiceTerms = stored;
        }

        setDocumentData(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load invoice';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [invoiceId]);

  useEffect(() => {
    if (!loading && !error && documentData) {
      if (embedMode) {
        const markReady = () => {
          window.__INVOICE_PRINT_READY__ = true;
        };
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            markReady();
            window.setTimeout(markReady, 300);
          });
        });
        return;
      }
      if (!hasPrintedRef.current) {
        hasPrintedRef.current = true;
        setTimeout(() => window.print(), 200);
      }
    }
    return () => {
      if (embedMode) {
        window.__INVOICE_PRINT_READY__ = false;
      }
    };
  }, [loading, error, documentData, embedMode]);

  if (loading) return <div style={{ padding: 24 }}>Loading invoice...</div>;
  if (error || !documentData) {
    return (
      <div style={{ padding: 24 }}>
        Unable to print invoice: {error || 'Unknown error'}
      </div>
    );
  }

  return (
    <>
      <InvoiceDocument {...documentData} />
      <div className="no-print" style={{ padding: '16px 52px' }}>
        <button type="button" onClick={() => window.print()}>
          Print Again
        </button>
      </div>
    </>
  );
}
