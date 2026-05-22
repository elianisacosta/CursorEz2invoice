import type { InvoiceDocumentData, InvoiceDocumentLineItem, InvoiceDocumentShop } from './invoiceDocumentTypes';
export { getLineItemTypeLabel } from './normalizeInvoiceDocumentData';

export function escapeHtml(value: string): string {
  return value
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
    const partDisplay = [item.item_number, item.item_name].filter(Boolean).join(' — ');
    return partDisplay || item.description || 'Part';
  }
  return item.item_name || item.description || 'Item';
}

export function formatLineItemDiscountText(item: InvoiceDocumentLineItem): string {
  const discountAmount = Number(item.discount_amount) || 0;
  if (discountAmount <= 0) return '';

  if (item.discount_type === 'percentage' && Number(item.discount_value) > 0) {
    return `Discount applied: ${Number(item.discount_value)}% (-$${discountAmount.toFixed(2)})`;
  }

  return `Discount applied: -$${discountAmount.toFixed(2)}`;
}
