export type LineItemType = 'labor' | 'part';

export interface LineItemMatchFields {
  item_type: LineItemType;
  reference_id?: string | null;
  description?: string;
}

export interface LineItemSelection extends LineItemMatchFields {
  reference_id: string;
  /** Labor service name for fallback matching */
  serviceName?: string;
  /** Part number for fallback matching */
  partNumber?: string;
}

const normalizeMatchKey = (value: string) => value.trim().toLowerCase();

export function isLineItemPopulated(item: LineItemMatchFields): boolean {
  if (item.reference_id) return true;
  return Boolean((item.description || '').trim());
}

/**
 * Find an existing row for the same part/labor.
 * Prefers reference_id; falls back to description / part number + type.
 */
export function findExistingLineItemIndex<T extends LineItemMatchFields>(
  items: T[],
  selection: LineItemSelection,
  excludeIndex?: number
): number {
  const selRef = selection.reference_id;
  const selType = selection.item_type;
  const selDesc = normalizeMatchKey(
    selection.description || selection.serviceName || ''
  );
  const selPartNum = normalizeMatchKey(selection.partNumber || '');

  for (let i = 0; i < items.length; i++) {
    if (i === excludeIndex) continue;
    const item = items[i];
    if (!isLineItemPopulated(item)) continue;
    if (item.item_type !== selType) continue;

    if (selRef && item.reference_id && item.reference_id === selRef) {
      return i;
    }

    if (selRef && item.reference_id) {
      continue;
    }

    const itemDesc = normalizeMatchKey(item.description || '');
    if (selDesc && itemDesc && itemDesc === selDesc) {
      return i;
    }
    if (selType === 'part' && selPartNum && itemDesc === selPartNum) {
      return i;
    }
  }

  return -1;
}

export const DUPLICATE_LINE_ITEM_TOAST =
  'Item already exists. Quantity updated.';

export function mergeDuplicateLineItem<T extends LineItemMatchFields & { quantity?: number }>(
  items: T[],
  targetIndex: number,
  selection: LineItemSelection,
  options: {
    withTotals: (item: T) => T;
    createBlank: (itemType: LineItemType, baseItem?: T) => T;
    applySelection: (item: T) => T;
  }
): { items: T[]; merged: boolean } {
  const existingIdx = findExistingLineItemIndex(items, selection, targetIndex);

  if (existingIdx >= 0) {
    const updated = items.map((item, i) => {
      if (i === existingIdx) {
        return options.withTotals({
          ...item,
          quantity: (Number(item.quantity) || 0) + 1,
        } as T);
      }
      if (i === targetIndex && existingIdx !== targetIndex) {
        return options.createBlank(selection.item_type, item);
      }
      return item;
    });
    return { items: updated, merged: true };
  }

  const updated = items.map((item, i) =>
    i === targetIndex ? options.withTotals(options.applySelection(item)) : item
  );
  return { items: updated, merged: false };
}

export function laborLineItemSelection(labor: {
  id: string;
  service_name?: string;
  description?: string | null;
}): LineItemSelection {
  return {
    item_type: 'labor',
    reference_id: labor.id,
    description: labor.description || labor.service_name || '',
    serviceName: labor.service_name,
  };
}

/** Accepts inventory/part records from the dashboard (nullable fields). */
export function partLineItemSelection(part: {
  id: string;
  part_name?: string | null;
  part_number?: string | null;
  description?: string | null;
}): LineItemSelection {
  const partName = part.part_name ?? '';
  const partNumber = part.part_number ?? '';
  return {
    item_type: 'part',
    reference_id: part.id,
    description: partName || part.description || '',
    partNumber: partNumber || undefined,
  };
}
