import type {
  InvoiceDocumentInvoice,
  InvoiceDocumentLineItem,
  InvoiceDocumentModel,
  InvoiceDocumentPayment,
} from './invoiceDocumentTypes';
import { calculateInvoiceFinancials } from './invoicePaymentSummary';
import { toCurrencyNumber, toFiniteNumber } from './sanitizeInvoiceDocumentData';

export function buildInvoiceDocumentModel(
  invoice: InvoiceDocumentInvoice,
  payments: InvoiceDocumentPayment[],
  lineItems: InvoiceDocumentLineItem[] = [],
  cardProcessingFeePercentage?: number | null
): InvoiceDocumentModel {
  const lineSubtotal = lineItems.reduce(
    (sum, item) => sum + toCurrencyNumber(item.total_price),
    0
  );

  let subtotal = toCurrencyNumber(invoice.subtotal);
  if (subtotal <= 0 && lineSubtotal > 0) {
    subtotal = lineSubtotal;
  }

  const discount = toCurrencyNumber(invoice.discount_amount);
  let taxRate = toFiniteNumber(invoice.tax_rate);
  if (taxRate > 1) {
    taxRate = taxRate / 100;
  }

  let taxAmount = toCurrencyNumber(invoice.tax_amount);
  if (taxAmount <= 0 && taxRate > 0 && subtotal > 0) {
    taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  }

  let totalBase = toCurrencyNumber(invoice.total_amount);
  if (totalBase <= 0 && subtotal > 0) {
    totalBase = Math.max(0, subtotal - discount + taxAmount);
  }

  const fallbackCardFee = toCurrencyNumber(invoice.card_fee_amount);
  let cardFeeRate = toFiniteNumber(cardProcessingFeePercentage);
  if (cardFeeRate > 1) cardFeeRate = cardFeeRate / 100;
  if (cardFeeRate <= 0 && fallbackCardFee > 0 && totalBase > 0) {
    cardFeeRate = fallbackCardFee / totalBase;
  }
  const paymentSummary = calculateInvoiceFinancials(
    { ...invoice, subtotal, tax_amount: taxAmount, total_amount: totalBase },
    payments,
    {
    cardFeePercentage: cardFeeRate * 100,
      allowLegacyFallback: true,
    }
  );
  const paidAmount = paymentSummary.paidTowardInvoice;
  const paidTowardInvoice = paymentSummary.paidTowardInvoice;
  const cardFeeCollected = paymentSummary.cardFeeCollected;
  const totalCollected = paymentSummary.totalCollected;
  const baseBalance = paymentSummary.balanceBeforeCardFee;
  const cardFee = paymentSummary.currentCardFee;
  const grandTotal = totalBase + cardFee;
  const balanceDue = Math.max(0, baseBalance + cardFee);
  const showSignature =
    (invoice.status || '').toLowerCase() === 'paid' || balanceDue <= 0.01;

  return {
    subtotal,
    discount,
    taxRate,
    taxAmount,
    cardFee,
    cardFeeCollected,
    totalCollected,
    grandTotal,
    paidAmount,
    paidDisplay: paidTowardInvoice,
    balanceDue,
    showSignature,
  };
}
