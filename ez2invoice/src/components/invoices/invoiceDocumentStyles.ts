export const INVOICE_DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; overflow-wrap: anywhere; }
  .print-page { width: 816px; max-width: 816px; padding: 36px 52px; line-height: 1.4; background: #fff; overflow-wrap: anywhere; word-break: break-word; }
  .header { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #1f2937; }
  .invoice-title { font-size: 38px; font-weight: 700; color: #374151; margin-bottom: 4px; line-height: 1; }
  .invoice-number { font-size: 13px; color: #6b7280; }
  .company-info { text-align: right; font-size: 11px; line-height: 1.25; color: #374151; white-space: pre-line; overflow-wrap: anywhere; }
  .company-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #1f2937; }
  .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .section-title { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .4px; color: #374151; margin-bottom: 8px; }
  .table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 16px 0; }
  .table th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #374151; }
  .table th:nth-child(1), .table td:nth-child(1) { width: 44px; }
  .table th:nth-child(2), .table td:nth-child(2) { width: 58px; }
  .table th:nth-child(4), .table td:nth-child(4) { width: 78px; }
  .table th:nth-child(5), .table td:nth-child(5) { width: 78px; }
  .table td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 13px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px; }
  .totals { text-align: right; }
  .row { margin-bottom: 1px; font-size: 11px; line-height: 1.25; }
  .row.total { font-size: 13px; font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb; }
  .payments-title { font-weight: 700; margin: 6px 0 3px; font-size: 9px; text-transform: uppercase; color: #374151; }
  .payment-row { font-size: 9.5px; margin-bottom: 1px; line-height: 1.2; }
  .payment-history-row { padding: 2px 0; border-bottom: 1px solid #e5e7eb; font-size: 9px; line-height: 1.15; }
  .terms-section { margin-top: 10px; font-size: 11px; line-height: 1.25; overflow-wrap: anywhere; word-break: break-word; }
  .notes-text, .terms-text, .line-note { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  .footer { margin-top: 26px; text-align: center; color: #9ca3af; font-size: 13px; }
  .auth-block { margin-top: 28px; margin-bottom: 10px; text-align: left; color: #374151; }
  .auth-heading { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; color: #1f2937; }
  .auth-body { font-size: 11px; font-weight: 400; line-height: 1.45; }
  .signature-block { margin-top: 4px; margin-bottom: 8px; font-size: 11px; }
  .signature-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 20px; }
  .sig-label { white-space: nowrap; flex-shrink: 0; }
  .sig-line { flex: 1 1 180px; border-bottom: 1px solid #1f2937; min-height: 22px; }
  .sig-line-narrow { flex: 0 1 100px; border-bottom: 1px solid #1f2937; min-height: 22px; }
  .no-print { margin-top: 16px; }
  @media print {
    .print-page { padding: 22px 30px; }
    .no-print { display: none !important; }
    @page { margin: 0; }
  }
`;
