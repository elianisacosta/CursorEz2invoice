import type {
  InvoiceDocumentInvoice,
  InvoiceDocumentLineItem,
  InvoiceDocumentPayment,
} from './invoiceDocumentTypes';

type RawRecord = Record<string, unknown>;

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function pickNumber(...values: unknown[]): number {
  for (const v of values) {
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Map legacy item_type values (e.g. service, fee) to display labels. */
export function getLineItemTypeLabel(itemType: string | null | undefined): string {
  const t = String(itemType || 'labor').toLowerCase();
  if (t === 'part' || t === 'parts') return 'Part';
  if (t === 'fee' || t === 'fees') return 'Fee';
  if (t === 'service' || t === 'services') return 'Labor';
  if (t === 'labor') return 'Labor';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function normalizeInvoiceLineItem(raw: RawRecord): InvoiceDocumentLineItem {
  const quantity = pickNumber(raw.quantity, raw.qty, 1) || 1;
  const unit_price = pickNumber(raw.unit_price, raw.unit_cost, raw.price, raw.rate);
  const total_price = pickNumber(
    raw.total_price,
    raw.line_total,
    raw.total,
    raw.amount,
    quantity * unit_price
  );

  const itemTypeRaw = pickString(raw.item_type, raw.type, raw.line_type, 'labor').toLowerCase();
  let item_type = itemTypeRaw;
  if (itemTypeRaw === 'parts') item_type = 'part';
  if (itemTypeRaw === 'services') item_type = 'service';
  if (itemTypeRaw === 'fees') item_type = 'fee';

  return {
    item_type,
    description: pickString(raw.description, raw.name, raw.item_name, raw.title) || '',
    item_name: pickString(raw.item_name, raw.name) || null,
    item_number: pickString(raw.item_number, raw.part_number, raw.sku) || null,
    invoice_note: pickString(raw.invoice_note, raw.note) || null,
    quantity,
    unit_price,
    total_price,
    reference_id: pickString(raw.reference_id, raw.ref_id) || null,
    discount_type: pickString(raw.discount_type) || null,
    discount_value: pickNumber(raw.discount_value),
    discount_amount: pickNumber(raw.discount_amount, raw.discount, raw.line_discount),
  };
}

export function normalizeInvoicePayment(raw: RawRecord): InvoiceDocumentPayment {
  return {
    amount: pickNumber(raw.amount, raw.payment_amount, raw.total),
    card_fee: pickNumber(raw.card_fee, raw.card_fee_amount, raw.processing_fee),
    payment_method: pickString(raw.payment_method, raw.method, 'Other') || 'Other',
    created_at: pickString(raw.created_at, raw.payment_date, raw.date) || null,
  };
}

export function normalizeInvoiceRecord(raw: RawRecord): InvoiceDocumentInvoice {
  const customerRaw = raw.customer;
  const customer =
    customerRaw && typeof customerRaw === 'object' && !Array.isArray(customerRaw)
      ? (customerRaw as InvoiceDocumentInvoice['customer'])
      : null;

  return {
    id: pickString(raw.id) || 'unknown',
    invoice_number: pickString(raw.invoice_number, raw.number, raw.invoice_no) || null,
    status: pickString(raw.status, raw.computed_status, 'pending') || 'pending',
    created_at: pickString(raw.created_at, raw.invoice_date, raw.date) || null,
    due_date: pickString(raw.due_date, raw.due_on) || null,
    work_order_id: pickString(raw.work_order_id, raw.work_order) || null,
    subtotal: pickNumber(raw.subtotal, raw.sub_total),
    discount_amount: pickNumber(raw.discount_amount, raw.discount, raw.discount_total),
    tax_rate: pickNumber(raw.tax_rate, raw.tax_percent),
    tax_amount: pickNumber(raw.tax_amount, raw.tax),
    total_amount: pickNumber(raw.total_amount, raw.total, raw.grand_total),
    paid_amount: pickNumber(raw.paid_amount, raw.paid, raw.amount_paid),
    apply_card_fee: raw.apply_card_fee === true,
    card_fee_amount: pickNumber(
      raw.card_fee_amount,
      raw.card_fee,
      raw.processing_fee,
      raw.card_processing_fee
    ),
    notes: pickString(raw.notes, raw.note, raw.memo) || null,
    customer,
  };
}

export function normalizeLineItems(rows: unknown[]): InvoiceDocumentLineItem[] {
  return rows
    .filter((row): row is RawRecord => !!row && typeof row === 'object')
    .map((row) => normalizeInvoiceLineItem(row));
}

export function normalizePayments(rows: unknown[]): InvoiceDocumentPayment[] {
  return rows
    .filter((row): row is RawRecord => !!row && typeof row === 'object')
    .map((row) => normalizeInvoicePayment(row));
}

/** Legacy invoices may only have paid_amount on the invoice row — synthesize one payment row. */
export function ensureLegacyPayments(
  invoice: InvoiceDocumentInvoice,
  payments: InvoiceDocumentPayment[]
): InvoiceDocumentPayment[] {
  if (payments.length > 0) return payments;

  const paid = Number(invoice.paid_amount) || 0;
  if (paid <= 0) return payments;

  return [
    {
      amount: paid,
      card_fee: 0,
      payment_method: 'Other',
      created_at: invoice.created_at || null,
    },
  ];
}
