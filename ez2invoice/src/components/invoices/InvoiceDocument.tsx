import type { InvoiceDocumentData } from '@/lib/invoices/invoiceDocumentTypes';
import { formatInvoiceDate } from '@/lib/invoices/formatInvoiceDate';
import {
  formatCompanyDetails,
  formatCustomerAddress,
  formatCustomerName,
  formatLineItemDiscountText,
  formatLineItemDisplayName,
  getLineItemTypeLabel,
} from '@/lib/invoices/invoiceDocumentFormatters';
import { INVOICE_DOCUMENT_STYLES } from './invoiceDocumentStyles';

type InvoiceDocumentProps = InvoiceDocumentData;

export default function InvoiceDocument({
  invoice,
  lineItems,
  payments,
  shop,
  invoiceTerms,
  model,
}: InvoiceDocumentProps) {
  const customerName = formatCustomerName({ invoice, lineItems, payments, shop, invoiceTerms, model });
  const customerAddress = formatCustomerAddress({ invoice, lineItems, payments, shop, invoiceTerms, model });
  const invoiceDate = formatInvoiceDate(invoice.created_at);
  const dueDate = formatInvoiceDate(invoice.due_date);
  const invoiceTotal = Math.max(0, model.grandTotal - model.cardFee);
  const balanceBeforeCardFee = Math.max(0, model.balanceDue - model.cardFee);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INVOICE_DOCUMENT_STYLES }} />
      <div className="print-page">
        <div className="header">
          <div>
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-number">{invoice.invoice_number || invoice.id}</div>
          </div>
          <div className="company-info">
            <div className="company-name">{shop.shop_name}</div>
            {formatCompanyDetails(shop)}
          </div>
        </div>

        <div className="main-content">
          <div>
            <div className="section-title">BILL TO:</div>
            <div>{customerName}</div>
            {customerAddress && <div>{customerAddress}</div>}
            {invoice.customer?.email && <div>{invoice.customer.email}</div>}
            {invoice.customer?.phone && <div>{invoice.customer.phone}</div>}
          </div>
          <div>
            <div>
              <strong>Invoice Date:</strong> {invoiceDate}
            </div>
            {invoice.work_order_id && (
              <div>
                <strong>Work Order:</strong> {invoice.work_order_id}
              </div>
            )}
            <div>
              <strong>Due Date:</strong> {dueDate}
            </div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>QTY</th>
              <th>TYPE</th>
              <th>ITEM / SERVICE</th>
              <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
              <th style={{ textAlign: 'right' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item, idx) => {
                const discountText = formatLineItemDiscountText(item);
                return (
                <tr key={`${idx}-${item.reference_id || ''}`}>
                  <td style={{ textAlign: 'right' }}>{Number(item.quantity) || 1}</td>
                  <td>{getLineItemTypeLabel(item.item_type)}</td>
                  <td>
                    {formatLineItemDisplayName(item)}
                    {item.invoice_note && (
                      <div style={{ fontSize: 11, color: '#4b5563' }}>{item.invoice_note}</div>
                    )}
                    {discountText && (
                      <div style={{ fontSize: 11, color: '#b91c1c' }}>
                        {discountText}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>${(Number(item.unit_price) || 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>${(Number(item.total_price) || 0).toFixed(2)}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="summary">
          <div className="terms-section">
            {invoice.notes && (
              <div style={{ marginBottom: 20 }}>
                <div className="section-title">NOTES:</div>
                <div>{invoice.notes}</div>
              </div>
            )}
          </div>
          <div className="totals">
            <div className="row">Subtotal: ${model.subtotal.toFixed(2)}</div>
            {model.discount > 0 && (
              <div className="row">Discount: -${model.discount.toFixed(2)}</div>
            )}
            <div className="row">
              Tax ({(model.taxRate * 100).toFixed(0)}%): ${model.taxAmount.toFixed(2)}
            </div>
            <div className="row">
              <strong>Invoice Total:</strong> ${invoiceTotal.toFixed(2)}
            </div>
            {(model.paidAmount > 0 || payments.length > 0 || model.cardFee > 0 || model.cardFeeCollected > 0) && (
              <div style={{ marginTop: 16 }}>
                {model.paidDisplay > 0 && (
                  <div className="payment-row">
                    <strong>Paid Toward Invoice:</strong> -${model.paidDisplay.toFixed(2)}
                  </div>
                )}
                {model.cardFeeCollected > 0 && (
                  <>
                    <div className="payment-row">
                      <strong>Card Fee Collected:</strong> ${model.cardFeeCollected.toFixed(2)}
                    </div>
                    <div className="payment-row">
                      <strong>Total Collected:</strong> ${model.totalCollected.toFixed(2)}
                    </div>
                  </>
                )}
                {model.cardFee > 0 && (
                  <>
                    <div className="payment-row">
                      <strong>Balance Before Card Fee:</strong> ${balanceBeforeCardFee.toFixed(2)}
                    </div>
                    <div className="payment-row">
                      <strong>Card Processing Fee ({(shop.cardProcessingFeePercentage || 0).toFixed(1)}%):</strong> ${model.cardFee.toFixed(2)}
                    </div>
                  </>
                )}
                <div
                  className="payment-row"
                  style={{
                    fontWeight: 700,
                    marginTop: 6,
                    padding: '6px 10px',
                    border: '1px solid #bfdbfe',
                    borderRadius: 5,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: 10,
                    lineHeight: 1.2,
                  }}
                >
                  <strong>{model.cardFee > 0 ? 'Total Due Today' : 'Balance Due'}:</strong> ${model.balanceDue.toFixed(2)}
                </div>
                <div className="payments-title">PAYMENT HISTORY:</div>
                {payments.length > 0 ? (
                  payments.map((p, idx) => {
                    const rawDate = formatInvoiceDate(p.created_at);
                    const date = rawDate === 'N/A' ? '' : rawDate;
                    const method =
                      p.payment_method === 'card'
                        ? 'Credit Card'
                        : p.payment_method === 'cash'
                          ? 'Cash'
                          : p.payment_method || 'Other';
                    const amount = Number(p.amount) || 0;
                    const fee = Number(p.card_fee) || 0;
                    const base = amount - fee;
                    return (
                      <div key={`${idx}-${date}`} className="payment-history-row">
                        {date} ({method}) ${amount.toFixed(2)}
                        {fee > 0 ? ` (${base.toFixed(2)} applied + $${fee.toFixed(2)} fee)` : ''}
                      </div>
                    );
                  })
                ) : (
                  <div className="payment-history-row">No payment history</div>
                )}
              </div>
            )}
          </div>
        </div>

        {invoiceTerms.trim().length > 0 && (
          <div className="terms-section">
            <div className="section-title">TERMS AND CONDITIONS</div>
            <div>{invoiceTerms}</div>
          </div>
        )}

        {model.showSignature && (
          <>
            <div className="auth-block">
              <div className="auth-heading">Customer Authorization &amp; Acceptance</div>
              <div className="auth-body">
                By signing below, I approve the total amount on this invoice and confirm that the
                listed parts, labor, repairs, diagnostics, and/or services were requested, approved,
                and completed. I had the opportunity to review the invoice and inspect the
                vehicle/unit. If paid by card, I authorize the card transaction and agree not to
                dispute or charge back approved and completed services.
              </div>
            </div>
            <div className="signature-block">
              <div className="signature-row">
                <span className="sig-label">Customer Signature:</span>
                <span className="sig-line" role="presentation" />
                <span className="sig-label">Date:</span>
                <span className="sig-line-narrow" role="presentation" />
              </div>
            </div>
          </>
        )}

        <div className="footer">Thank you for your business!</div>
      </div>
    </>
  );
}
