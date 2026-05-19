import { INVOICE_DOCUMENT_STYLES } from '@/components/invoices/invoiceDocumentStyles';
import { formatInvoiceDate } from './formatInvoiceDate';
import type { InvoiceDocumentData } from './invoiceDocumentTypes';
import {
  escapeHtml,
  formatCompanyDetails,
  formatCustomerAddress,
  formatCustomerName,
  getLineItemTypeLabel,
} from './invoiceDocumentFormatters';

export function buildInvoiceDocumentHtml(data: InvoiceDocumentData): string {
  const { invoice, lineItems, payments, shop, invoiceTerms, model } = data;
  const customerName = formatCustomerName(data);
  const customerAddress = formatCustomerAddress(data);
  const invoiceDate = formatInvoiceDate(invoice.created_at);
  const dueDate = formatInvoiceDate(invoice.due_date);
  const companyDetails = formatCompanyDetails(shop);

  const lineRows =
    lineItems.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#6b7280">No line items</td></tr>`
      : lineItems
          .map((item) => {
            const type = getLineItemTypeLabel(item.item_type);
            const desc = escapeHtml(item.description || 'Item');
            const discount =
              (Number(item.discount_amount) || 0) > 0
                ? `<div style="font-size:11px;color:#b91c1c">Discount: -$${(Number(item.discount_amount) || 0).toFixed(2)}</div>`
                : '';
            return `<tr>
              <td>${type}</td>
              <td>${desc}</td>
              <td>${desc}${discount}</td>
              <td style="text-align:right">${Number(item.quantity) || 1}</td>
              <td style="text-align:right">$${(Number(item.unit_price) || 0).toFixed(2)}</td>
              <td style="text-align:right">$${(Number(item.total_price) || 0).toFixed(2)}</td>
            </tr>`;
          })
          .join('');

  const paymentBlock =
    model.paidAmount > 0 || payments.length > 0
      ? `<div style="margin-top:16px">
          <div class="payment-row"><strong>Amount Paid:</strong> -$${model.paidDisplay.toFixed(2)}</div>
          <div class="payment-row" style="font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb">
            <strong>Balance Due:</strong> $${model.balanceDue.toFixed(2)}
          </div>
          <div class="payments-title">PAYMENT HISTORY:</div>
          ${
            payments.length > 0
              ? payments
                  .map((p) => {
                    const rawDate = formatInvoiceDate(p.created_at);
                    const date = rawDate === 'N/A' ? '' : rawDate;
                    const method =
                      p.payment_method === 'card'
                        ? 'Credit Card'
                        : p.payment_method === 'cash'
                          ? 'Cash'
                          : escapeHtml(p.payment_method || 'Other');
                    const amount = Number(p.amount) || 0;
                    const fee = Number(p.card_fee) || 0;
                    const base = amount - fee;
                    return `<div class="payment-history-row">${escapeHtml(date)} (${method}) $${base.toFixed(2)}${fee > 0 ? ` + $${fee.toFixed(2)} fee` : ''}</div>`;
                  })
                  .join('')
              : '<div class="payment-history-row">No payment history</div>'
          }
        </div>`
      : '';

  const signatureBlock = model.showSignature
    ? `<div class="auth-block">
        <div class="auth-heading">Customer Authorization &amp; Acceptance</div>
        <div class="auth-body">
          By signing below, I approve the total amount on this invoice and confirm that the listed parts, labor, repairs, diagnostics, and/or services were requested, approved, and completed. I had the opportunity to review the invoice and inspect the vehicle/unit. If paid by card, I authorize the card transaction and agree not to dispute or charge back approved and completed services.
        </div>
      </div>
      <div class="signature-block">
        <div class="signature-row">
          <span class="sig-label">Customer Signature:</span>
          <span class="sig-line"></span>
          <span class="sig-label">Date:</span>
          <span class="sig-line-narrow"></span>
        </div>
      </div>`
    : '';

  const termsBlock =
    invoiceTerms.trim().length > 0
      ? `<div class="terms-section">
          <div class="section-title">TERMS AND CONDITIONS</div>
          <div style="white-space:pre-wrap">${escapeHtml(invoiceTerms)}</div>
        </div>`
      : '';

  const page = `<div class="print-page">
    <div class="header">
      <div>
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${escapeHtml(invoice.invoice_number || invoice.id)}</div>
      </div>
      <div class="company-info">
        <div class="company-name">${escapeHtml(shop.shop_name)}</div>
        ${escapeHtml(companyDetails)}
      </div>
    </div>
    <div class="main-content">
      <div>
        <div class="section-title">BILL TO:</div>
        <div>${escapeHtml(customerName)}</div>
        ${customerAddress ? `<div>${escapeHtml(customerAddress)}</div>` : ''}
        ${invoice.customer?.email ? `<div>${escapeHtml(invoice.customer.email)}</div>` : ''}
        ${invoice.customer?.phone ? `<div>${escapeHtml(invoice.customer.phone)}</div>` : ''}
      </div>
      <div>
        <div><strong>Invoice Date:</strong> ${escapeHtml(invoiceDate)}</div>
        ${invoice.work_order_id ? `<div><strong>Work Order:</strong> ${escapeHtml(invoice.work_order_id)}</div>` : ''}
        <div><strong>Due Date:</strong> ${escapeHtml(dueDate)}</div>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>TYPE</th><th>ITEM</th><th>DESCRIPTION</th>
          <th style="text-align:right">QTY</th>
          <th style="text-align:right">PRICE</th>
          <th style="text-align:right">TOTAL</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
    <div class="summary">
      <div class="terms-section">
        ${
          invoice.notes
            ? `<div style="margin-bottom:20px">
                <div class="section-title">NOTES:</div>
                <div>${escapeHtml(invoice.notes)}</div>
              </div>`
            : ''
        }
      </div>
      <div class="totals">
        <div class="row">Subtotal: $${model.subtotal.toFixed(2)}</div>
        ${model.discount > 0 ? `<div class="row">Discount: -$${model.discount.toFixed(2)}</div>` : ''}
        <div class="row">Tax (${(model.taxRate * 100).toFixed(0)}%): $${model.taxAmount.toFixed(2)}</div>
        ${model.cardFee > 0 ? `<div class="row">Card Processing Fee: $${model.cardFee.toFixed(2)}</div>` : ''}
        <div class="row total">Total (incl. card fee): $${model.grandTotal.toFixed(2)}</div>
        ${paymentBlock}
      </div>
    </div>
    ${termsBlock}
    ${signatureBlock}
    <div class="footer">Thank you for your business!</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${INVOICE_DOCUMENT_STYLES}</style>
</head>
<body style="margin:0;background:#fff">
${page}
</body>
</html>`;
}

