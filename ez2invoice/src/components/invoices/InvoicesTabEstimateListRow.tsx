'use client';

import { Eye, Printer, Send, Trash2 } from 'lucide-react';
import { formatUsPhoneDisplay } from '@/lib/customers/phoneNumber';
import {
  formatEstimateDocumentNumber,
  getEstimateCustomerName,
  getEstimateListStatusColors,
  getEstimateListStatusLabel,
} from '@/lib/features/invoiceEstimateListEntries';

export interface InvoicesTabEstimateListRowEstimate {
  id: string;
  estimate_number?: string | null;
  status: string;
  total_amount: number;
  created_at?: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface InvoicesTabEstimateListRowProps {
  estimate: InvoicesTabEstimateListRowEstimate;
  formatCurrency: (amount: number) => string;
  formatDateInTimezone: (date: string | undefined, options?: Intl.DateTimeFormatOptions) => string;
  onView: (estimate: InvoicesTabEstimateListRowEstimate) => void;
  onPrint: (estimate: InvoicesTabEstimateListRowEstimate) => void;
  onSend: (estimate: InvoicesTabEstimateListRowEstimate) => void;
  onDelete: (estimate: InvoicesTabEstimateListRowEstimate) => void;
}

export function InvoicesTabEstimateListRow({
  estimate,
  formatCurrency,
  formatDateInTimezone,
  onView,
  onPrint,
  onSend,
  onDelete,
}: InvoicesTabEstimateListRowProps) {
  const customerName = getEstimateCustomerName(estimate.customer);
  const customerPhone = formatUsPhoneDisplay(estimate.customer?.phone);
  const documentNumber = formatEstimateDocumentNumber(estimate.estimate_number, estimate.id);
  const statusLabel = getEstimateListStatusLabel(estimate.status);
  const statusClass = getEstimateListStatusColors(estimate.status);
  const canSend = estimate.status === 'draft' || estimate.status === 'sent';

  return (
    <div key={estimate.id}>
      <div className="md:hidden bg-white border border-gray-200 rounded-lg p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-800">
                Estimate
              </span>
              <div className="font-medium text-gray-900 text-sm truncate">{documentNumber}</div>
            </div>
            <div className="text-sm text-gray-600 font-medium min-w-0">
              <div className="truncate max-w-[12rem]">{customerName}</div>
              {customerPhone ? <div className="text-xs text-gray-500">{customerPhone}</div> : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 mb-1">
              <div>Total</div>
              <div className="text-base font-semibold text-gray-900">
                {formatCurrency(estimate.total_amount || 0)}
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
          <span className="text-gray-500">Date:</span> {formatDateInTimezone(estimate.created_at)}
        </div>
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onView(estimate)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="View estimate"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPrint(estimate)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Print estimate"
          >
            <Printer className="h-4 w-4" />
          </button>
          {canSend ? (
            <button
              type="button"
              onClick={() => onSend(estimate)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title={estimate.status === 'draft' ? 'Send to customer' : 'Resend to customer'}
            >
              <Send className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(estimate)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete estimate"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="hidden md:grid gap-2 items-center py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 min-w-0"
        style={{
          gridTemplateColumns:
            'minmax(72px, 0.75fr) minmax(110px, 1.1fr) minmax(150px, 1.5fr) minmax(100px, 1fr) minmax(120px, 1.05fr) minmax(90px, 0.85fr) minmax(105px, 0.95fr) minmax(170px, 1.25fr)',
        }}
      >
        <div className="min-w-0">
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-800 whitespace-nowrap">
            Estimate
          </span>
        </div>
        <div className="font-medium text-gray-900 min-w-0 truncate">{documentNumber}</div>
        <div className="text-gray-700 min-w-0">
          <div className="font-medium truncate">{customerName}</div>
          {customerPhone ? <div className="text-xs text-gray-500 truncate">{customerPhone}</div> : null}
        </div>
        <div className="text-sm text-gray-500 min-w-0">—</div>
        <div className="text-right font-semibold text-gray-900 min-w-0 whitespace-nowrap">
          {formatCurrency(estimate.total_amount || 0)}
        </div>
        <div className="min-w-0">
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <div className="text-sm text-gray-600 min-w-0 whitespace-nowrap">
          {formatDateInTimezone(estimate.created_at)}
        </div>
        <div className="min-w-0 sticky right-0 bg-white pl-2 text-right">
          <div className="inline-flex items-center gap-1 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => onView(estimate)}
              className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="View estimate"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPrint(estimate)}
              className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Print estimate"
            >
              <Printer className="h-4 w-4" />
            </button>
            {canSend ? (
              <button
                type="button"
                onClick={() => onSend(estimate)}
                className="p-1.5 text-gray-400 hover:text-blue-600 flex-shrink-0"
                title={estimate.status === 'draft' ? 'Send to customer' : 'Resend to customer'}
              >
                <Send className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onDelete(estimate)}
              className="p-2 text-gray-400 hover:text-red-600"
              title="Delete estimate"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
