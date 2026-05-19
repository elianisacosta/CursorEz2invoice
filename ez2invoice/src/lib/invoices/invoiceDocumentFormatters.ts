import type { InvoiceDocumentData, InvoiceDocumentShop } from './invoiceDocumentTypes';
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
