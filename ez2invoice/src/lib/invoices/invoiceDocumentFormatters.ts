import type { InvoiceDocumentData, InvoiceDocumentLineItem, InvoiceDocumentShop } from './invoiceDocumentTypes';
export { getLineItemTypeLabel } from './normalizeInvoiceDocumentData';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatCustomerName(data: InvoiceDocumentData): string {
  const c = data.invoice.customer;
  if (!c) return 'Unknown';
  return (
    [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || 'Unknown'
  );
}

export function formatCustomerAddress(data: InvoiceDocumentData): string {
  const c = data.invoice.customer;
  if (!c?.address) return '';
  return `${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''}${c.zip_code ? ` ${c.zip_code}` : ''}`;
}

export function formatCompanyDetails(shop: InvoiceDocumentShop): string {
  return [
    shop.addressLines,
    shop.phone,
    shop.email,
    shop.website,
    shop.tax_id ? `Tax ID: ${shop.tax_id}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatLineItemDisplayName(item: InvoiceDocumentLineItem): string {
  const type = String(item.item_type || '').toLowerCase();
  if (type === 'part') {
    const partDisplay = [item.item_number, item.item_name]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' — ');
    return partDisplay || String(item.description || '').trim() || 'Part';
  }
  return String(item.item_name || item.description || '').trim() || 'Item';
}

export function formatLineItemDiscountText(item: InvoiceDocumentLineItem): string {
  const discountAmount = Number.isFinite(Number(item.discount_amount))
    ? Number(item.discount_amount)
    : 0;
  if (discountAmount <= 0) return '';

  const discountValue = Number.isFinite(Number(item.discount_value))
    ? Number(item.discount_value)
    : 0;
  if (item.discount_type === 'percentage' && discountValue > 0) {
    return `Discount applied: ${discountValue}% (-$${discountAmount.toFixed(2)})`;
  }

  return `Discount applied: -$${discountAmount.toFixed(2)}`;
}
