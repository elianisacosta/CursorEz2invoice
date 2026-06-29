export type InvoiceLineItemType = 'labor' | 'part';

export interface PersistableInvoiceLineItem {
  item_type: InvoiceLineItemType;
  reference_id?: string | null;
  description?: string;
  item_name?: string | null;
  item_number?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  taxable?: boolean;
  lineId?: string;
}

export interface InventoryPartLike {
  id: string;
  part_name?: string | null;
  part_number?: string | null;
  description?: string | null;
  selling_price?: number | null;
}

export function formatPartLineLabel(item: {
  item_number?: string | null;
  item_name?: string | null;
}): string {
  return [item.item_number, item.item_name].filter(Boolean).join(' — ');
}

export function buildPartLineDescriptionFallback(part: InventoryPartLike): string {
  return (
    formatPartLineLabel({
      item_number: part.part_number,
      item_name: part.part_name,
    }) ||
    part.part_name?.trim() ||
    part.part_number?.trim() ||
    ''
  );
}

/**
 * Stored description must survive reload even when reference_id lookup fails.
 * Optional user note takes priority; otherwise persist part/labor labels.
 */
export function buildInvoiceLineItemDescriptionForSave(
  item: PersistableInvoiceLineItem,
  userNote = ''
): string {
  const trimmedNote = userNote.trim();
  if (trimmedNote) return trimmedNote;

  if (item.item_type === 'part') {
    const partLabel = formatPartLineLabel(item);
    if (partLabel) return partLabel;
  }

  const itemName = item.item_name?.trim();
  if (itemName) return itemName;

  return (item.description || '').trim();
}

export function applyInventoryPartToInvoiceLineItem<T extends PersistableInvoiceLineItem>(
  line: T,
  part: InventoryPartLike
): T {
  const partName = part.part_name?.trim() || '';
  const partNumber = part.part_number?.trim() || null;
  return {
    ...line,
    item_type: 'part',
    reference_id: part.id,
    description: '',
    item_name: partName || null,
    item_number: partNumber,
    unit_price: Number(part.selling_price) || 0,
  };
}

export function findInvoiceLineIndexByLineId(
  items: PersistableInvoiceLineItem[],
  lineId: string
): number {
  return items.findIndex((item, index) => (item.lineId || String(index)) === lineId);
}

export function prepareSavableInvoiceLineItems<T extends PersistableInvoiceLineItem>(
  items: T[],
  options: {
    isEmpty: (item: T) => boolean;
    withTotals: (item: T) => T;
  }
): { normalized: T[]; nonEmpty: T[]; savable: T[] } {
  const normalized = items.map((item) => options.withTotals(item));
  const nonEmpty = normalized.filter((item) => !options.isEmpty(item));
  const savable = nonEmpty.filter((item) => {
    const hasIdentity =
      Boolean(item.reference_id) ||
      Boolean(item.description?.trim()) ||
      Boolean(item.item_name?.trim()) ||
      Boolean(item.item_number?.trim());
    return hasIdentity && (Number(item.total_price) || 0) > 0;
  });
  return { normalized, nonEmpty, savable };
}

export function hydrateInvoiceLineItemLabelsFromRow(row: Record<string, unknown>): {
  item_name: string | null;
  item_number: string | null;
  description: string;
} {
  const itemName = (row.item_name as string | null | undefined) ?? null;
  const itemNumber =
    (row.item_number as string | null | undefined) ??
    (row.part_number as string | null | undefined) ??
    null;
  const description = String(row.description ?? '');

  if (itemName || itemNumber) {
    return {
      item_name: itemName,
      item_number: itemNumber,
      description,
    };
  }

  if (description.trim()) {
    const split = description.split(' — ');
    if (split.length >= 2) {
      return {
        item_name: split.slice(1).join(' — ').trim() || null,
        item_number: split[0]?.trim() || null,
        description,
      };
    }
    return {
      item_name: description.trim(),
      item_number: null,
      description,
    };
  }

  return { item_name: null, item_number: null, description };
}
