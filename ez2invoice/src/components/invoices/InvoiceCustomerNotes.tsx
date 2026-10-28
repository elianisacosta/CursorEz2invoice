'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type InvoiceCustomerNote = {
  id: string;
  category: string;
  note: string;
};

const isImportantNote = (note: InvoiceCustomerNote) =>
  note.category === 'Warning' || note.category === 'Payment Issue';

/**
 * Staff-only customer alerts in the Create/Edit Invoice drawer.
 * Reads existing customer_notes; does not write to the invoice or its documents.
 */
export function InvoiceCustomerNotes({ customerId }: { customerId: string }) {
  const [notes, setNotes] = useState<InvoiceCustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setNotes([]);
    setLoading(true);
    setFailed(false);

    const loadNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_notes')
          .select('id, category, note')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const loadedNotes = (data ?? [])
          .map((item) => ({
            id: item.id as string,
            category: (item.category as string) || 'General',
            note: (item.note as string) || '',
          }))
          .filter((item) => item.note.trim().length > 0);

        setNotes(loadedNotes);
      } catch (error) {
        if (!cancelled) {
          console.error('Could not load customer notes in invoice:', error);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [customerId, retryCount]);

  if (!customerId) return null;

  if (loading) {
    return <p className="mt-2 text-xs text-gray-500" role="status">Checking customer notes…</p>;
  }

  if (failed) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-900" role="alert">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Customer notes could not be loaded.</span>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="font-semibold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notes.length === 0) return null;

  const hasImportantNotes = notes.some(isImportantNote);

  return (
    <section aria-label="Internal customer notes and alerts" className="mt-2">
      <div className="flex items-center gap-2">
        {hasImportantNotes
          ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          : <MessageCircle className="h-4 w-4 shrink-0 text-gray-600" />}
        <span className="text-xs font-semibold text-gray-900">
          Customer Notes &amp; Alerts
        </span>
      </div>
      <div className="mt-1 space-y-1 pl-6">
        {notes.map((note) => (
          <p key={note.id} className="whitespace-pre-wrap break-words text-xs text-gray-700">
            <span className={isImportantNote(note) ? 'font-semibold text-amber-900' : 'font-semibold text-gray-700'}>
              {note.category}:
            </span>{' '}{note.note}
          </p>
        ))}
      </div>
    </section>
  );
}
