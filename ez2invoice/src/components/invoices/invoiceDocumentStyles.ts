export const INVOICE_DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; }
  .print-page { padding: 36px 52px; line-height: 1.4; background: #fff; }
  .header { display: flex; justify-content: space-between; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 2px solid #1f2937; }
  .invoice-title { font-size: 48px; font-weight: 700; color: #374151; margin-bottom: 8px; }
  .invoice-number { font-size: 16px; color: #6b7280; }
  .company-info { text-align: right; font-size: 14px; color: #374151; white-space: pre-line; }
  .company-name { font-weight: 700; font-size: 18px; margin-bottom: 8px; color: #1f2937; }
  .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .section-title { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .4px; color: #374151; margin-bottom: 8px; }
  .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .table th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #374151; }
  .table td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 13px; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
  .totals { text-align: right; }
  .row { margin-bottom: 2px; font-size: 13px; }
  .row.total { font-size: 16px; font-weight: 700; margin-top: 6px; padding-top: 6px; border-top: 2px solid #e5e7eb; }
  .payments-title { font-weight: 700; margin: 8px 0 6px; font-size: 11px; text-transform: uppercase; color: #374151; }
  .payment-row { font-size: 11px; margin-bottom: 2px; }
  .payment-history-row { padding: 3px 0; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; line-height: 1.2; }
  .terms-section { margin-top: 14px; font-size: 12px; line-height: 1.35; }
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
