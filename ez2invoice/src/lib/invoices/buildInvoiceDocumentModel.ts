import type {
  InvoiceDocumentInvoice,
  InvoiceDocumentLineItem,
  InvoiceDocumentModel,
  InvoiceDocumentPayment,
} from './invoiceDocumentTypes';

export function buildInvoiceDocumentModel(
  invoice: InvoiceDocumentInvoice,
  payments: InvoiceDocumentPayment[],
  lineItems: InvoiceDocumentLineItem[] = []
): InvoiceDocumentModel {
  const lineSubtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.total_price) || 0),
    0
  );

  let subtotal = Number(invoice.subtotal) || 0;
  if (subtotal <= 0 && lineSubtotal > 0) {
    subtotal = lineSubtotal;
  }

  const discount = Number(invoice.discount_amount) || 0;
  let taxRate = Number(invoice.tax_rate) || 0;
  if (taxRate > 1) {
    taxRate = taxRate / 100;
  }

  let taxAmount = Number(invoice.tax_amount) || 0;
  if (taxAmount <= 0 && taxRate > 0 && subtotal > 0) {
    taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  }

  let totalBase = Number(invoice.total_amount) || 0;
  if (totalBase <= 0 && subtotal > 0) {
    totalBase = Math.max(0, subtotal - discount + taxAmount);
  }

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
