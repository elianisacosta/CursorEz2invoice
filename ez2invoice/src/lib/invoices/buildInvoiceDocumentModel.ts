import type {
  InvoiceDocumentInvoice,
  InvoiceDocumentLineItem,
  InvoiceDocumentModel,
  InvoiceDocumentPayment,
} from './invoiceDocumentTypes';
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
  const getPaymentCardFee = (payment: InvoiceDocumentPayment) => {
    const explicitFee = toCurrencyNumber(payment.card_fee);
    if (explicitFee > 0) return Math.round(explicitFee * 100) / 100;
    if (invoice.apply_card_fee !== true || payment.payment_method !== 'card' || cardFeeRate <= 0) {
      return 0;
    }
    const amount = toCurrencyNumber(payment.amount);
    return Math.max(0, Math.round((amount - Math.round((amount / (1 + cardFeeRate)) * 100) / 100) * 100) / 100);
  };
  const paidAmount = toCurrencyNumber(invoice.paid_amount);
  const paidDisplay = payments.length > 0
    ? payments.reduce((sum, p) => {
        const amount = toCurrencyNumber(p.amount);
        const cardFee = getPaymentCardFee(p);
        if (cardFee > 0) return sum + Math.max(0, amount - cardFee);
        if (invoice.apply_card_fee === true && p.payment_method === 'card' && cardFeeRate > 0) {
          return sum + Math.round((amount / (1 + cardFeeRate)) * 100) / 100;
        }
        return sum + amount;
      }, 0)
    : paidAmount;
  const paidTowardInvoice = Math.min(totalBase, paidDisplay);
  const cardFeeCollected = Math.round(
    payments.reduce((sum, p) => sum + getPaymentCardFee(p), 0) * 100
  ) / 100;
  const totalCollected = Math.round((paidTowardInvoice + cardFeeCollected) * 100) / 100;
  const baseBalance = Math.max(0, totalBase - paidTowardInvoice);
  const cardFee =
    invoice.apply_card_fee === true && cardFeeRate > 0
      ? Math.round(baseBalance * cardFeeRate * 100) / 100
      : 0;
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
