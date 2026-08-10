export type InvoiceLineItemType = 'labor' | 'part';

export interface PersistableInvoiceLineItem {
  /** Database row id when editing an existing saved line item. */
  id?: string;
  /** Frozen display label from the invoice row snapshot; never replaced by live catalog state. */
  savedDisplayLabel?: string;
  item_type: InvoiceLineItemType;
  reference_id?: string | null;
  description?: string;
  /** Optional per-line note; persisted in invoice_line_items.notes, never mixed into description. */
  notes?: string | null;
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
  /** True once the user edits this row in the current edit session. */
  userModified?: boolean;
  /** Frozen DB values at load time for unchanged-row save protection. */
  originalDbSnapshot?: InvoiceLineItemDbSnapshot;
}

export type InvoiceLineItemDbSnapshot = {
  description: string;
  notes: string | null;
  item_name: string | null;
  item_number: string | null;
  reference_id: string | null;
  item_type: InvoiceLineItemType;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  taxable: boolean;
};

export type InvoiceLineItemCatalogLabor = {
  service_name?: string | null;
  description?: string | null;
};

export type InvoiceLineItemCatalogMaps = {
  laborById?: Map<string, InvoiceLineItemCatalogLabor>;
  partById?: Map<string, InventoryPartLike>;
};

/** Placeholder labels that must not override real saved invoice item text. */
const GENERIC_INVOICE_LINE_LABELS = new Set([
  'service',
  'services',
  'item',
  'labor',
  'part',
  'parts',
  'fee',
  'fees',
]);

export function isGenericInvoiceLinePlaceholder(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.length > 0 && GENERIC_INVOICE_LINE_LABELS.has(normalized);
}

export function pickInvoiceLineRowString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

/**
 * Build the display label from a database invoice_line_items row.
 * Catalog lookup is optional enrichment only when the row has no real saved text.
 */
export function extractSavedDisplayLabelFromRow(
  row: Record<string, unknown>,
  catalog?: InvoiceLineItemCatalogMaps
): string {
  const itemName = pickInvoiceLineRowString(row.item_name, row.name, row.service_name, row.part_name);
  const itemNumber = pickInvoiceLineRowString(row.item_number, row.part_number, row.sku);
  // description is the item/service name. Do not use notes/note — those are optional line notes.
  const description = pickInvoiceLineRowString(row.description, row.title);

  const partStyleLabel = [itemNumber, itemName].filter(Boolean).join(' — ');
  if (partStyleLabel && !isGenericInvoiceLinePlaceholder(partStyleLabel)) {
    return partStyleLabel;
  }
  if (itemName && !isGenericInvoiceLinePlaceholder(itemName)) return itemName;
  if (description && !isGenericInvoiceLinePlaceholder(description)) return description;

  const referenceId = row.reference_id ? String(row.reference_id) : '';
  const itemType = normalizeInvoiceLineItemType(row.item_type);
  if (referenceId && catalog) {
    if (itemType === 'part') {
      const part = catalog.partById?.get(referenceId);
      const fromPart = formatPartLineLabel({
        item_number: part?.part_number ?? null,
        item_name: part?.part_name ?? null,
      });
      if (fromPart && !isGenericInvoiceLinePlaceholder(fromPart)) return fromPart;
    } else {
      const labor = catalog.laborById?.get(referenceId);
      const fromLabor = labor?.service_name?.trim() || '';
      if (fromLabor && !isGenericInvoiceLinePlaceholder(fromLabor)) return fromLabor;
    }
  }

  if (description && !isGenericInvoiceLinePlaceholder(description)) return description;
  return '';
}

export type InvoiceLineItemLoadStatus =
  | 'loaded'
  | 'loaded-stale'
  | 'empty'
  | 'error'
  | 'reconnecting'
  | 'timeout';

export type InvoiceLineItemLoadResolution = {
  status: InvoiceLineItemLoadStatus;
  rows: Record<string, unknown>[];
  fromCache: boolean;
  fetchFailed: boolean;
  /** When false, invoice line items must not be inserted/updated/deleted. */
  canMutateLineItems: boolean;
  errorMessage?: string;
  suspiciousFetch?: boolean;
};

export type InvoiceLineItemLoadContext = {
  priorSuccessfulSnapshot?: Record<string, unknown>[] | null;
  invoiceSubtotal?: number | null;
  recentlyReconnected?: boolean;
};

export function logInvoiceLineItemNetwork(stage: string, payload: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[${stage}]`, payload);
}

export function invoiceLineItemRowsHaveRealLabels(rows: Record<string, unknown>[]): boolean {
  return rows.some((row) => {
    const label = extractSavedDisplayLabelFromRow(row);
    return Boolean(label && !isGenericInvoiceLinePlaceholder(label));
  });
}

/** Empty or generic-only fetch when we already know this invoice had real line items. */
export function isSuspiciousReconnectLineItemFetch(
  fetchedRows: Record<string, unknown>[],
  priorSuccessfulSnapshot: Record<string, unknown>[] | null | undefined,
  invoiceSubtotal?: number | null,
  recentlyReconnected = false
): boolean {
  const snapshot = Array.isArray(priorSuccessfulSnapshot) ? priorSuccessfulSnapshot : [];
  const snapshotHasRealLabels = invoiceLineItemRowsHaveRealLabels(snapshot);
  const snapshotHasRows = snapshot.length > 0;
  const invoiceExpectsItems = Number(invoiceSubtotal) > 0;

  if (fetchedRows.length === 0) {
    if (snapshotHasRows) return true;
    if (invoiceExpectsItems && recentlyReconnected) return true;
    return false;
  }

  if (snapshotHasRealLabels) {
    const fetchOnlyGeneric = fetchedRows.every((row) => {
      const label = extractSavedDisplayLabelFromRow(row);
      return !label || isGenericInvoiceLinePlaceholder(label);
    });
    if (fetchOnlyGeneric) return true;
  }

  return false;
}

export function shouldRetryInvoiceLineItemFetch(resolution: InvoiceLineItemLoadResolution): boolean {
  return resolution.status === 'reconnecting' || resolution.status === 'timeout';
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatInvoiceLineItemFetchError(fetchError: unknown): string {
  if (!fetchError) return 'Could not load invoice line items.';
  if (typeof fetchError === 'string') return fetchError;
  const message = String((fetchError as { message?: string }).message || '').trim();
  if (message) return message;
  return 'Could not load invoice line items.';
}

/** True when Supabase/network did not return a trustworthy row set. */
export function isInvoiceLineItemFetchFailure(fetchError: unknown): boolean {
  if (!fetchError) return false;
  if (typeof fetchError === 'string') return fetchError.trim().length > 0;
  const err = fetchError as { message?: string; code?: string; name?: string };
  const message = String(err.message || '').trim().toLowerCase();
  const code = String(err.code || '').trim();
  const name = String(err.name || '').trim().toLowerCase();
  if (name === 'aborterror' || name === 'timeouterror') return true;
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('offline') ||
    message.includes('load failed') ||
    message.includes('connection') ||
    message.includes('aborted')
  ) {
    return true;
  }
  if (code === 'ECONNABORTED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') return true;
  return Object.keys(err as object).length > 0;
}

function filterCachedInvoiceLineRows(
  invoiceId: string,
  cachedRows: unknown[] | null | undefined
): Record<string, unknown>[] {
  return (Array.isArray(cachedRows) ? cachedRows : []).filter(
    (row) =>
      row &&
      typeof row === 'object' &&
      String((row as Record<string, unknown>).invoice_id || '') === String(invoiceId)
  ) as Record<string, unknown>[];
}

/**
 * Separates a successful empty table from fetch/network failure.
 * Never treat a failed fetch as "invoice has no line items".
 */
export function resolveInvoiceLineItemLoadForEdit(
  invoiceId: string,
  fetchedRows: unknown[] | null | undefined,
  fetchError: unknown,
  cachedRows: unknown[] | null | undefined,
  context: InvoiceLineItemLoadContext = {}
): InvoiceLineItemLoadResolution {
  const fetchFailed = isInvoiceLineItemFetchFailure(fetchError);
  const fromFetch = Array.isArray(fetchedRows) ? (fetchedRows as Record<string, unknown>[]) : [];
  const priorSnapshot = Array.isArray(context.priorSuccessfulSnapshot)
    ? context.priorSuccessfulSnapshot
    : [];
  const trustedSnapshot = filterCachedInvoiceLineRows(invoiceId, priorSnapshot);
  const fallbackSnapshot = trustedSnapshot.length > 0
    ? trustedSnapshot
    : filterCachedInvoiceLineRows(invoiceId, cachedRows);

  const buildReconnecting = (message: string, suspiciousFetch = true): InvoiceLineItemLoadResolution => ({
    status: 'reconnecting',
    rows: fallbackSnapshot,
    fromCache: true,
    fetchFailed: fetchFailed || suspiciousFetch,
    canMutateLineItems: false,
    errorMessage: message,
    suspiciousFetch,
  });

  if (fetchFailed) {
    const isTimeout =
      String((fetchError as { name?: string })?.name || '').toLowerCase() === 'timeouterror' ||
      String((fetchError as { message?: string })?.message || '')
        .toLowerCase()
        .includes('timeout');
    if (fallbackSnapshot.length > 0) {
      return {
        status: 'loaded-stale',
        rows: fallbackSnapshot,
        fromCache: true,
        fetchFailed: true,
        canMutateLineItems: false,
        errorMessage: formatInvoiceLineItemFetchError(fetchError),
      };
    }
    return {
      status: isTimeout ? 'timeout' : 'error',
      rows: [],
      fromCache: false,
      fetchFailed: true,
      canMutateLineItems: false,
      errorMessage: formatInvoiceLineItemFetchError(fetchError),
    };
  }

  if (
    isSuspiciousReconnectLineItemFetch(
      fromFetch,
      trustedSnapshot,
      context.invoiceSubtotal,
      context.recentlyReconnected
    ) ||
    (context.recentlyReconnected &&
      isSuspiciousReconnectLineItemFetch(
        fromFetch,
        fallbackSnapshot,
        context.invoiceSubtotal,
        true
      ))
  ) {
    return buildReconnecting(
      'Reconnecting — waiting for a confirmed invoice line item response from the server.'
    );
  }

  if (fromFetch.length > 0) {
    const fetchOnlyGeneric = fromFetch.every((row) => {
      const label = extractSavedDisplayLabelFromRow(row);
      return !label || isGenericInvoiceLinePlaceholder(label);
    });
    if (
      context.recentlyReconnected &&
      fetchOnlyGeneric &&
      Number(context.invoiceSubtotal) > 0
    ) {
      return buildReconnecting(
        'Reconnecting — received placeholder line items before the server response was confirmed.'
      );
    }

    return {
      status: 'loaded',
      rows: fromFetch,
      fromCache: false,
      fetchFailed: false,
      canMutateLineItems: true,
    };
  }

  const invoiceExpectsItems =
    Number(context.invoiceSubtotal) > 0 && Boolean(context.recentlyReconnected);
  if (trustedSnapshot.length > 0 || invoiceExpectsItems) {
    return buildReconnecting(
      'Invoice line items did not reload yet. Keeping last known saved items until fetch is confirmed.'
    );
  }

  return {
    status: 'empty',
    rows: [],
    fromCache: false,
    fetchFailed: false,
    canMutateLineItems: true,
  };
}

export function canMutateInvoiceLineItemsForSave(
  status: InvoiceLineItemLoadStatus | 'loading' | 'idle'
): boolean {
  return status === 'loaded' || status === 'empty';
}

export function wouldInvoiceLineItemSaveRegressToService(
  savableItems: Array<
    PersistableInvoiceLineItem & {
      userModified?: boolean;
      originalDbSnapshot?: InvoiceLineItemDbSnapshot;
    }
  >,
  priorRowsById: Map<string, Record<string, unknown>>
): { blocked: boolean; reason?: string } {
  for (const item of savableItems) {
    if (item.userModified) continue;

    const priorSnapshot =
      item.originalDbSnapshot ||
      (item.id ? captureInvoiceLineItemDbSnapshot(priorRowsById.get(String(item.id)) || {}) : null);
    const priorDescription = priorSnapshot
      ? pickInvoiceLineRowString(priorSnapshot.description, priorSnapshot.item_name)
      : '';
    const nextDescription = buildInvoiceLineItemDescriptionForSave(item);

    if (
      priorDescription &&
      !isGenericInvoiceLinePlaceholder(priorDescription) &&
      isGenericInvoiceLinePlaceholder(nextDescription)
    ) {
      return {
        blocked: true,
        reason: `Line item would regress from "${priorDescription}" to "${nextDescription || 'Service'}".`,
      };
    }
  }
  return { blocked: false };
}

export function logInvoiceLineItemEditPipeline(
  stage: string,
  invoiceId: string,
  payload: unknown
): void {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[invoice-line-edit:${stage}]`, { invoiceId, payload });
}

/** Map legacy DB item_type values (e.g. service) to editor labor/part. */
export function normalizeInvoiceLineItemType(raw: unknown): InvoiceLineItemType {
  const value = String(raw || 'labor').toLowerCase();
  if (value === 'part' || value === 'parts') return 'part';
  return 'labor';
}

export function hasSavedInvoiceLineItemLabel(item: {
  savedDisplayLabel?: string;
  description?: string;
  item_name?: string | null;
  item_number?: string | null;
}): boolean {
  if (item.savedDisplayLabel?.trim() && !isGenericInvoiceLinePlaceholder(item.savedDisplayLabel)) {
    return true;
  }
  if (item.item_name?.trim() && !isGenericInvoiceLinePlaceholder(item.item_name)) return true;
  if (item.item_number?.trim()) return true;
  if (item.description?.trim() && !isGenericInvoiceLinePlaceholder(item.description)) return true;
  return false;
}

/**
 * Display label from the invoice line item snapshot only (no live catalog lookup).
 */
export function getSavedInvoiceLineItemDisplayLabel(item: {
  savedDisplayLabel?: string;
  item_type?: string;
  description?: string;
  item_name?: string | null;
  item_number?: string | null;
}): string {
  if (item.savedDisplayLabel?.trim()) {
    const trimmed = item.savedDisplayLabel.trim();
    if (!isGenericInvoiceLinePlaceholder(trimmed)) return trimmed;
  }

  const stored = hydrateInvoiceLineItemLabelsFromRow(item as Record<string, unknown>);
  const itemType = normalizeInvoiceLineItemType(item.item_type);

  if (itemType === 'part') {
    const partLabel = formatPartLineLabel(stored);
    if (partLabel && !isGenericInvoiceLinePlaceholder(partLabel)) return partLabel;
  }

  if (stored.item_name?.trim() && !isGenericInvoiceLinePlaceholder(stored.item_name)) {
    return stored.item_name.trim();
  }
  if (stored.description?.trim() && !isGenericInvoiceLinePlaceholder(stored.description)) {
    return stored.description.trim();
  }
  return '';
}

export function serializeInvoiceLineItemRowForDebug(row: Record<string, unknown>) {
  return {
    id: row.id ?? null,
    invoice_id: row.invoice_id ?? null,
    description: row.description ?? null,
    name: row.name ?? null,
    title: row.title ?? null,
    item_name: row.item_name ?? null,
    item_number: row.item_number ?? null,
    service_name: row.service_name ?? null,
    part_name: row.part_name ?? null,
    display_name: row.display_name ?? null,
    notes: row.notes ?? null,
    note: row.note ?? null,
    reference_id: row.reference_id ?? null,
    labor_id: row.labor_id ?? null,
    part_id: row.part_id ?? null,
    metadata: row.metadata ?? null,
    item_type: row.item_type ?? null,
    quantity: row.quantity ?? null,
    unit_price: row.unit_price ?? null,
    total_price: row.total_price ?? null,
    raw_keys: Object.keys(row),
  };
}

export function captureInvoiceLineItemDbSnapshot(row: Record<string, unknown>): InvoiceLineItemDbSnapshot {
  const itemName =
    pickInvoiceLineRowString(row.item_name, row.name, row.service_name, row.part_name) || null;
  const notes = pickInvoiceLineRowString(row.notes) || null;
  return {
    description: pickInvoiceLineRowString(
      row.description,
      row.title,
      row.item_name,
      row.name,
      row.service_name,
      row.part_name
    ),
    notes,
    item_name: itemName,
    item_number: pickInvoiceLineRowString(row.item_number, row.part_number, row.sku) || null,
    reference_id: row.reference_id
      ? String(row.reference_id)
      : row.labor_id
        ? String(row.labor_id)
        : row.part_id
          ? String(row.part_id)
          : null,
    item_type: normalizeInvoiceLineItemType(row.item_type),
    quantity: Number(row.quantity) || 1,
    unit_price: Number(row.unit_price) || 0,
    total_price: Number(row.total_price) || 0,
    discount_type: ((row.discount_type as 'none' | 'percentage' | 'fixed') || 'none') as
      | 'none'
      | 'percentage'
      | 'fixed',
    discount_value: Number(row.discount_value) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    taxable: row.taxable !== false,
  };
}

/** Never regress an existing row to a generic placeholder unless the user edited it. */
function stripFrontendOnlyInvoiceLineFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const { item_name: _itemName, item_number: _itemNumber, ...rest } = payload;
  return rest;
}

export function resolveInvoiceLineItemSavePayload<
  T extends PersistableInvoiceLineItem & {
    userModified?: boolean;
    originalDbSnapshot?: InvoiceLineItemDbSnapshot;
  },
>(item: T, payload: Record<string, unknown>, priorRow?: Record<string, unknown> | null): Record<string, unknown> {
  const priorSnapshot =
    !item.userModified && item.originalDbSnapshot
      ? item.originalDbSnapshot
      : priorRow
        ? captureInvoiceLineItemDbSnapshot(priorRow)
        : null;

  if (priorSnapshot && !item.userModified) {
    const preservedDescription =
      pickInvoiceLineRowString(
        priorSnapshot.description,
        priorSnapshot.item_name,
        payload.description as string
      ) || String(payload.description ?? '');
    return stripFrontendOnlyInvoiceLineFields({
      ...payload,
      item_type: priorSnapshot.item_type,
      reference_id: priorSnapshot.reference_id,
      description: preservedDescription,
      notes: priorSnapshot.notes,
      quantity: priorSnapshot.quantity,
      unit_price: priorSnapshot.unit_price,
      total_price: priorSnapshot.total_price,
      discount_type: priorSnapshot.discount_type,
      discount_value: priorSnapshot.discount_value,
      discount_amount: priorSnapshot.discount_amount,
      taxable: priorSnapshot.taxable,
    });
  }

  const priorDescription = priorSnapshot
    ? pickInvoiceLineRowString(priorSnapshot.description, priorSnapshot.item_name)
    : pickInvoiceLineRowString(
        priorRow?.description,
        priorRow?.item_name,
        priorRow?.name,
        priorRow?.title
      );
  const nextDescription = String(payload.description ?? '').trim();
  if (
    priorDescription &&
    !isGenericInvoiceLinePlaceholder(priorDescription) &&
    isGenericInvoiceLinePlaceholder(nextDescription)
  ) {
    return stripFrontendOnlyInvoiceLineFields({
      ...payload,
      description: priorDescription,
    });
  }

  return stripFrontendOnlyInvoiceLineFields(payload);
}

/** Columns that exist on invoice_line_items in the base schema (+ reference_id, taxable, notes migrations). */
export const INVOICE_LINE_ITEM_DB_CORE_FIELDS = [
  'invoice_id',
  'item_type',
  'reference_id',
  'description',
  'quantity',
  'unit_price',
  'total_price',
] as const;

export function normalizeInvoiceLineItemNotes(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

export function sanitizeInvoiceLineItemDbPayload(
  payload: Record<string, unknown>,
  options: { includeTaxable?: boolean; includeDiscounts?: boolean; includeNotes?: boolean } = {}
): Record<string, unknown> {
  const description = String(payload.description ?? '').trim();
  const sanitized: Record<string, unknown> = {
    invoice_id: payload.invoice_id,
    item_type: payload.item_type ?? 'labor',
    reference_id: payload.reference_id ?? null,
    description: description || 'Item',
    quantity: Number(payload.quantity) || 1,
    unit_price: Number(payload.unit_price) || 0,
    total_price: Number(payload.total_price) || 0,
  };
  if (options.includeTaxable) {
    sanitized.taxable = payload.taxable !== false;
  }
  if (options.includeDiscounts) {
    sanitized.discount_type = payload.discount_type || 'none';
    sanitized.discount_value = Number(payload.discount_value) || 0;
    sanitized.discount_amount = Number(payload.discount_amount) || 0;
  }
  if (options.includeNotes) {
    sanitized.notes = normalizeInvoiceLineItemNotes(payload.notes);
  }
  return sanitized;
}

export function buildInvoiceLineItemDbPayloads<
  T extends PersistableInvoiceLineItem & {
    userModified?: boolean;
    originalDbSnapshot?: InvoiceLineItemDbSnapshot;
  },
>(
  invoiceId: string,
  items: T[],
  options: {
    includeTaxable?: boolean;
    includeDiscounts?: boolean;
    includeNotes?: boolean;
    priorRowsById?: Map<string, Record<string, unknown>>;
  } = {}
): Record<string, unknown>[] {
  return items.map((item) => {
    const priorRow = item.id ? options.priorRowsById?.get(String(item.id)) : null;
    const description =
      buildInvoiceLineItemDescriptionForSave(item) ||
      item.savedDisplayLabel?.trim() ||
      item.description?.trim() ||
      item.item_name?.trim() ||
      '';
    const rawPayload: Record<string, unknown> = {
      invoice_id: invoiceId,
      item_type: item.item_type,
      reference_id: item.reference_id || null,
      description,
      notes: normalizeInvoiceLineItemNotes(item.notes),
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
      taxable: item.taxable !== false,
      discount_type: item.discount_type || 'none',
      discount_value: Number(item.discount_value) || 0,
      discount_amount: Number(item.discount_amount) || 0,
    };
    const resolved = resolveInvoiceLineItemSavePayload(item, rawPayload, priorRow);
    return sanitizeInvoiceLineItemDbPayload(resolved, {
      includeTaxable: options.includeTaxable,
      includeDiscounts: options.includeDiscounts,
      includeNotes: options.includeNotes !== false,
    });
  });
}

export function partitionSavableLineItems<T extends PersistableInvoiceLineItem & { id?: string }>(
  items: T[]
): { updates: T[]; inserts: T[] } {
  const updates: T[] = [];
  const inserts: T[] = [];
  for (const item of items) {
    if (item.id) updates.push(item);
    else inserts.push(item);
  }
  return { updates, inserts };
}

export function isUiOnlyInvoiceLineItemEmpty(item: {
  id?: string;
  reference_id?: string | null;
  savedDisplayLabel?: string;
  description?: string;
  item_name?: string | null;
  item_number?: string | null;
  quantity?: number;
  unit_price?: number;
  discount_value?: number;
  total_price?: number;
}): boolean {
  if (item.id) return false;
  if (item.reference_id) return false;
  if (item.savedDisplayLabel?.trim()) return false;
  if (item.item_name?.trim()) return false;
  if (item.item_number?.trim()) return false;
  if (item.description?.trim()) return false;
  return (
    (Number(item.quantity) || 0) === 1 &&
    (Number(item.unit_price) || 0) === 0 &&
    (Number(item.discount_value) || 0) === 0 &&
    (Number(item.total_price) || 0) === 0
  );
}

export function enrichInvoiceLineItemCatalogLabels<T extends PersistableInvoiceLineItem>(
  item: T,
  catalog?: InvoiceLineItemCatalogMaps
): T {
  if (!item.reference_id || !catalog || item.savedDisplayLabel?.trim()) return item;

  const referenceId = String(item.reference_id);
  const hasSnapshot = hasSavedInvoiceLineItemLabel(item);

  if (item.item_type === 'labor') {
    const labor = catalog.laborById?.get(referenceId);
    if (!labor) return item;
    const catalogName = labor.service_name?.trim() || '';
    return {
      ...item,
      item_name:
        item.item_name?.trim() && !isGenericInvoiceLinePlaceholder(item.item_name)
          ? item.item_name
          : !isGenericInvoiceLinePlaceholder(catalogName)
            ? catalogName
            : item.item_name || null,
      description: hasSnapshot ? item.description : item.description || labor.description || item.description,
    };
  }

  const part = catalog.partById?.get(referenceId);
  if (!part) return item;

  return {
    ...item,
    item_name:
      item.item_name?.trim() && !isGenericInvoiceLinePlaceholder(item.item_name)
        ? item.item_name
        : part.part_name?.trim() || item.item_name || null,
    item_number: item.item_number?.trim() ? item.item_number : part.part_number?.trim() || item.item_number || null,
    description: hasSnapshot ? item.description : item.description || part.description || item.description,
  };
}

export function mapInvoiceLineItemRowForEdit(
  row: Record<string, unknown>,
  catalog?: InvoiceLineItemCatalogMaps,
  options?: { lineId?: string }
): PersistableInvoiceLineItem {
  const itemType = normalizeInvoiceLineItemType(row.item_type);
  const rawSavedDisplayLabel = extractSavedDisplayLabelFromRow(row, catalog);
  const savedDisplayLabel = isGenericInvoiceLinePlaceholder(rawSavedDisplayLabel)
    ? ''
    : rawSavedDisplayLabel;
  const storedLabels = hydrateInvoiceLineItemLabelsFromRow(row);
  const dbId = row.id ? String(row.id) : undefined;
  const description = pickInvoiceLineRowString(row.description, row.title) || storedLabels.description;
  const notes = normalizeInvoiceLineItemNotes(row.notes);

  return {
    id: dbId,
    savedDisplayLabel,
    item_type: itemType,
    reference_id: row.reference_id ? String(row.reference_id) : null,
    description,
    notes,
    item_name:
      storedLabels.item_name ??
      (pickInvoiceLineRowString(row.item_name, row.name, row.service_name, row.part_name) || null),
    item_number: storedLabels.item_number ?? null,
    quantity: Number(row.quantity) || 1,
    unit_price: Number(row.unit_price) || 0,
    total_price: Number(row.total_price) || 0,
    discount_type: ((row.discount_type as 'none' | 'percentage' | 'fixed') || 'none') as
      | 'none'
      | 'percentage'
      | 'fixed',
    discount_value: Number(row.discount_value) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    taxable: row.taxable !== false,
    lineId: options?.lineId || dbId || undefined,
    originalDbSnapshot: captureInvoiceLineItemDbSnapshot(row),
    userModified: false,
  };
}

export function hydrateInvoiceLineItemRowsForEdit(
  rows: unknown[],
  catalog?: InvoiceLineItemCatalogMaps
): PersistableInvoiceLineItem[] {
  const rawRows = Array.isArray(rows) ? rows : [];
  return rawRows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => enrichInvoiceLineItemCatalogLabels(mapInvoiceLineItemRowForEdit(row, catalog), catalog));
}

/** @deprecated Prefer resolveInvoiceLineItemLoadForEdit for fetch/error-aware resolution. */
export function resolveInvoiceLineItemRowsForEdit(
  invoiceId: string,
  fetchedRows: unknown[] | null | undefined,
  cachedRows: unknown[] | null | undefined,
  fetchError?: unknown,
  context: InvoiceLineItemLoadContext = {}
): Record<string, unknown>[] {
  return resolveInvoiceLineItemLoadForEdit(
    invoiceId,
    fetchedRows,
    fetchError,
    cachedRows,
    context
  ).rows;
}

/** Legacy invoices may only have header totals; never invent a "Service" label. */
export function buildLegacyInvoiceLineItemsFromTotals(invoice: {
  subtotal?: number | null;
  total_amount?: number | null;
  tax_rate?: number | null;
}): PersistableInvoiceLineItem[] {
  const subtotal = Number(invoice.subtotal) || 0;
  const total = Number(invoice.total_amount) || 0;

  if (subtotal > 0) {
    return [
      {
        item_type: 'labor',
        reference_id: null,
        description: '',
        item_name: null,
        item_number: null,
        quantity: 1,
        unit_price: subtotal,
        total_price: subtotal,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: 0,
        taxable: true,
      },
    ];
  }

  if (total > 0) {
    const taxRate = Number(invoice.tax_rate) || 0;
    const calculatedSubtotal = taxRate > 0 ? total / (1 + taxRate) : total;
    return [
      {
        item_type: 'labor',
        reference_id: null,
        description: '',
        item_name: null,
        item_number: null,
        quantity: 1,
        unit_price: calculatedSubtotal,
        total_price: calculatedSubtotal,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: 0,
        taxable: true,
      },
    ];
  }

  return [];
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
 * Optional user notes are persisted separately in `notes` — never overwrite the item name.
 */
export function buildInvoiceLineItemDescriptionForSave(
  item: PersistableInvoiceLineItem,
  _userNote = ''
): string {
  const savedLabel = item.savedDisplayLabel?.trim();
  if (savedLabel && !isGenericInvoiceLinePlaceholder(savedLabel)) return savedLabel;

  if (item.item_type === 'part') {
    const partLabel = formatPartLineLabel(item);
    if (partLabel && !isGenericInvoiceLinePlaceholder(partLabel)) return partLabel;
  }

  const itemName = item.item_name?.trim();
  if (itemName && !isGenericInvoiceLinePlaceholder(itemName)) return itemName;

  const description = (item.description || '').trim();
  if (description && !isGenericInvoiceLinePlaceholder(description)) return description;
  return description || '';
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
    savedDisplayLabel: buildPartLineDescriptionFallback(part) || part.part_name?.trim() || '',
    item_name: partName || null,
    item_number: partNumber,
    unit_price: (() => {
      const fromPart = Number(part.selling_price);
      return fromPart > 0 ? fromPart : Number(line.unit_price) || 0;
    })(),
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
      Boolean(item.savedDisplayLabel?.trim()) ||
      Boolean(item.description?.trim()) ||
      Boolean(item.item_name?.trim()) ||
      Boolean(item.item_number?.trim());
    const gross = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const hasPrice = (Number(item.total_price) || 0) > 0 || gross > 0;
    return hasIdentity && hasPrice;
  });
  return { normalized, nonEmpty, savable };
}

export function hydrateInvoiceLineItemLabelsFromRow(row: Record<string, unknown>): {
  item_name: string | null;
  item_number: string | null;
  description: string;
} {
  const itemName = pickInvoiceLineRowString(row.item_name, row.name, row.service_name, row.part_name) || null;
  const itemNumber =
    pickInvoiceLineRowString(row.item_number, row.part_number, row.sku) || null;
  const description = pickInvoiceLineRowString(row.description, row.title);

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
    if (!isGenericInvoiceLinePlaceholder(description)) {
      return {
        item_name: description.trim(),
        item_number: null,
        description,
      };
    }
    return { item_name: null, item_number: null, description };
  }

  return { item_name: null, item_number: null, description };
}
