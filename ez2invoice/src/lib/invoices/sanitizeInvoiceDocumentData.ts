import type {
  InvoiceDocumentData,
  InvoiceDocumentInvoice,
  InvoiceDocumentLineItem,
  InvoiceDocumentModel,
  InvoiceDocumentPayment,
  InvoiceDocumentShop,
} from './invoiceDocumentTypes';

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function toCurrencyNumber(value: unknown, fallback = 0): number {
  return Math.round(toFiniteNumber(value, fallback) * 100) / 100;
}

function toSafeString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

export function sanitizeInvoiceLineItem(
  item: InvoiceDocumentLineItem
): InvoiceDocumentLineItem {
  const quantity = Math.max(0, toFiniteNumber(item.quantity, 1) || 1);
  const unitPrice = Math.max(0, toCurrencyNumber(item.unit_price));
  const fallbackTotal = quantity * unitPrice;
  const totalPrice = Math.max(0, toCurrencyNumber(item.total_price, fallbackTotal));

  return {
    ...item,
    item_type: toSafeString(item.item_type || 'labor', 'labor'),
    description: toSafeString(item.description),
    item_name: item.item_name == null ? null : toSafeString(item.item_name),
    item_number: item.item_number == null ? null : toSafeString(item.item_number),
    invoice_note: item.invoice_note == null ? null : toSafeString(item.invoice_note),
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
    reference_id: item.reference_id == null ? null : toSafeString(item.reference_id),
    discount_type: item.discount_type == null ? null : toSafeString(item.discount_type),
    discount_value: Math.max(0, toFiniteNumber(item.discount_value)),
    discount_amount: Math.max(0, toCurrencyNumber(item.discount_amount)),
  };
}

export function sanitizeInvoicePayment(
  payment: InvoiceDocumentPayment
): InvoiceDocumentPayment {
  const amount = Math.max(0, toCurrencyNumber(payment.amount));
  const cardFee = Math.min(amount, Math.max(0, toCurrencyNumber(payment.card_fee)));

  return {
    amount,
    card_fee: cardFee,
    payment_method: toSafeString(payment.payment_method || 'Other', 'Other'),
    created_at: payment.created_at == null ? null : toSafeString(payment.created_at),
  };
}

export function sanitizeInvoiceRecord(
  invoice: InvoiceDocumentInvoice
): InvoiceDocumentInvoice {
  return {
    ...invoice,
    id: toSafeString(invoice.id || 'unknown', 'unknown'),
    invoice_number: invoice.invoice_number == null ? null : toSafeString(invoice.invoice_number),
    status: invoice.status == null ? null : toSafeString(invoice.status),
    created_at: invoice.created_at == null ? null : toSafeString(invoice.created_at),
    due_date: invoice.due_date == null ? null : toSafeString(invoice.due_date),
    work_order_id: invoice.work_order_id == null ? null : toSafeString(invoice.work_order_id),
    subtotal: Math.max(0, toCurrencyNumber(invoice.subtotal)),
    discount_amount: Math.max(0, toCurrencyNumber(invoice.discount_amount)),
    tax_rate: Math.max(0, toFiniteNumber(invoice.tax_rate)),
    tax_amount: Math.max(0, toCurrencyNumber(invoice.tax_amount)),
    total_amount: Math.max(0, toCurrencyNumber(invoice.total_amount)),
    paid_amount: Math.max(0, toCurrencyNumber(invoice.paid_amount)),
    apply_card_fee: invoice.apply_card_fee === true,
    card_fee_amount: Math.max(0, toCurrencyNumber(invoice.card_fee_amount)),
    notes: invoice.notes == null ? null : toSafeString(invoice.notes),
    customer: invoice.customer
      ? {
          first_name:
            invoice.customer.first_name == null ? null : toSafeString(invoice.customer.first_name),
          last_name:
            invoice.customer.last_name == null ? null : toSafeString(invoice.customer.last_name),
          company: invoice.customer.company == null ? null : toSafeString(invoice.customer.company),
          email: invoice.customer.email == null ? null : toSafeString(invoice.customer.email),
          phone: invoice.customer.phone == null ? null : toSafeString(invoice.customer.phone),
          address: invoice.customer.address == null ? null : toSafeString(invoice.customer.address),
          city: invoice.customer.city == null ? null : toSafeString(invoice.customer.city),
          state: invoice.customer.state == null ? null : toSafeString(invoice.customer.state),
          zip_code:
            invoice.customer.zip_code == null ? null : toSafeString(invoice.customer.zip_code),
        }
      : null,
  };
}

export function sanitizeInvoiceShop(shop: InvoiceDocumentShop): InvoiceDocumentShop {
  return {
    shop_name: toSafeString(shop.shop_name || 'Your Company Name', 'Your Company Name'),
    addressLines: toSafeString(shop.addressLines || 'Address not set', 'Address not set'),
    phone: toSafeString(shop.phone),
    email: toSafeString(shop.email),
    website: toSafeString(shop.website),
    tax_id: toSafeString(shop.tax_id),
    cardProcessingFeePercentage:
      shop.cardProcessingFeePercentage == null
        ? null
        : Math.max(0, toFiniteNumber(shop.cardProcessingFeePercentage)),
  };
}

export function sanitizeInvoiceModel(model: InvoiceDocumentModel): InvoiceDocumentModel {
  const subtotal = Math.max(0, toCurrencyNumber(model.subtotal));
  const discount = Math.max(0, toCurrencyNumber(model.discount));
  const taxRate = Math.max(0, toFiniteNumber(model.taxRate));
  const taxAmount = Math.max(0, toCurrencyNumber(model.taxAmount));
  const cardFee = Math.max(0, toCurrencyNumber(model.cardFee));
  const cardFeeCollected = Math.max(0, toCurrencyNumber(model.cardFeeCollected));
  const totalCollected = Math.max(0, toCurrencyNumber(model.totalCollected));
  const paidAmount = Math.max(0, toCurrencyNumber(model.paidAmount));
  const paidDisplay = Math.max(0, toCurrencyNumber(model.paidDisplay));
  const grandTotal = Math.max(0, toCurrencyNumber(model.grandTotal, subtotal - discount + taxAmount + cardFee));
  const balanceDue = Math.max(0, toCurrencyNumber(model.balanceDue));

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
    paidDisplay,
    balanceDue,
    showSignature: model.showSignature === true,
  };
}

export function sanitizeInvoiceDocumentData(
  data: InvoiceDocumentData
): InvoiceDocumentData {
  const safeData = data || ({} as InvoiceDocumentData);
  return {
    invoice: sanitizeInvoiceRecord(safeData.invoice || ({ id: 'unknown' } as InvoiceDocumentInvoice)),
    lineItems: Array.isArray(safeData.lineItems)
      ? safeData.lineItems.map((item) => sanitizeInvoiceLineItem(item))
      : [],
    payments: Array.isArray(safeData.payments)
      ? safeData.payments.map((payment) => sanitizeInvoicePayment(payment))
      : [],
    shop: sanitizeInvoiceShop(safeData.shop || ({} as InvoiceDocumentShop)),
    invoiceTerms: toSafeString(safeData.invoiceTerms),
    model: sanitizeInvoiceModel(safeData.model || ({} as InvoiceDocumentModel)),
  };
}
