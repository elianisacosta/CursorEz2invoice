import type {
  InvoiceDocumentInvoice,
  InvoiceDocumentModel,
  InvoiceDocumentPayment,
} from './invoiceDocumentTypes';

export function buildInvoiceDocumentModel(
  invoice: InvoiceDocumentInvoice,
  payments: InvoiceDocumentPayment[]
): InvoiceDocumentModel {
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount_amount) || 0;
  const taxRate = Number(invoice.tax_rate) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const totalBase = Number(invoice.total_amount) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const grossPaidFromPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidDisplay = grossPaidFromPayments > 0 ? grossPaidFromPayments : paidAmount;
  const paidCardFees = payments.reduce((sum, p) => sum + (Number(p.card_fee) || 0), 0);
  const fallbackCardFee = Number(invoice.card_fee_amount) || 0;
  const cardFee = paidCardFees > 0 ? paidCardFees : fallbackCardFee;
  const grandTotal = totalBase + cardFee;
  const balanceDue = Math.max(0, grandTotal - paidDisplay);
  const showSignature =
    (invoice.status || '').toLowerCase() === 'paid' || balanceDue <= 0.01;

  return {
    subtotal,
    discount,
    taxRate,
    taxAmount,
    cardFee,
    grandTotal,
    paidAmount,
    paidDisplay,
    balanceDue,
    showSignature,
  };
}
