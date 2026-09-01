export type ShopLocationRow = {
  id: string;
  name: string;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type WorkOrderBaySnapshot = {
  work_order_id: string;
  bay_name: string | null;
  bay_number: number | null;
};

export type InvoiceLocationInput = {
  manual_location_id?: string | null;
  location_id?: string | null;
  effective_location_name?: string | null;
  effective_location_source?: string | null;
  work_order_id?: string | null;
};

export type ResolvedInvoiceLocation = {
  displayName: string | null;
  source: 'digital' | 'manual' | 'none';
  manualLocationId: string | null;
  canEditManual: boolean;
};

export function formatServiceBayLabel(
  bayName: string | null | undefined,
  bayNumber: number | null | undefined
): string | null {
  const trimmed = String(bayName || '').trim();
  if (trimmed) return trimmed;
  if (bayNumber != null && Number.isFinite(Number(bayNumber))) {
    return `Bay ${bayNumber}`;
  }
  return null;
}

export function resolveInvoiceLocation(
  invoice: InvoiceLocationInput,
  options?: {
    workOrderBayById?: Record<string, WorkOrderBaySnapshot>;
    shopLocationById?: Record<string, ShopLocationRow>;
  }
): ResolvedInvoiceLocation {
  const manualLocationId = String(
    invoice.manual_location_id ?? invoice.location_id ?? ''
  ).trim() || null;

  const workOrderId = invoice.work_order_id ? String(invoice.work_order_id) : '';
  const digitalBay = workOrderId ? options?.workOrderBayById?.[workOrderId] : undefined;
  const digitalName = digitalBay
    ? formatServiceBayLabel(digitalBay.bay_name, digitalBay.bay_number)
    : null;

  if (digitalName) {
    return {
      displayName: digitalName,
      source: 'digital',
      manualLocationId,
      canEditManual: true,
    };
  }

  const viewName = String(invoice.effective_location_name || '').trim();
  if (viewName && invoice.effective_location_source === 'digital') {
    return {
      displayName: viewName,
      source: 'digital',
      manualLocationId,
      canEditManual: true,
    };
  }

  if (manualLocationId) {
    const manual = options?.shopLocationById?.[manualLocationId];
    const manualName = String(manual?.name || '').trim();
    if (manualName) {
      return {
        displayName: manualName,
        source: 'manual',
        manualLocationId,
        canEditManual: true,
      };
    }
  }

  if (viewName && invoice.effective_location_source === 'manual') {
    return {
      displayName: viewName,
      source: 'manual',
      manualLocationId,
      canEditManual: true,
    };
  }

  if (viewName) {
    return {
      displayName: viewName,
      source: invoice.effective_location_source === 'digital' ? 'digital' : 'manual',
      manualLocationId,
      canEditManual: invoice.effective_location_source !== 'digital',
    };
  }

  return {
    displayName: null,
    source: 'none',
    manualLocationId,
    canEditManual: true,
  };
}

export const DEFAULT_SHOP_LOCATION_NAMES = [
  'Bay 1',
  'Bay 2',
  'Bay 3',
  'Waiting',
  'Parking Lot',
  'Outside',
  'Road Service',
  'Ready for Pickup',
] as const;

export const ALL_LOCATIONS_FILTER = 'All Locations';
export const NO_LOCATION_FILTER = 'No Location';

export type ManualLocationPatch = {
  manual_location_id: string | null;
  location_id: string | null;
  effective_location_name: string | null;
  effective_location_source: 'digital' | 'manual' | null;
};

export function buildManualLocationPatch(
  invoice: InvoiceLocationInput,
  locationId: string | null,
  options?: {
    shopLocationById?: Record<string, ShopLocationRow>;
    workOrderBayById?: Record<string, WorkOrderBaySnapshot>;
  }
): ManualLocationPatch {
  const patchedInput: InvoiceLocationInput =
    locationId === null
      ? {
          ...invoice,
          manual_location_id: null,
          location_id: null,
          ...(invoice.effective_location_source === 'manual'
            ? { effective_location_name: null, effective_location_source: null }
            : {}),
        }
      : {
          ...invoice,
          manual_location_id: locationId,
          location_id: locationId,
          ...(invoice.effective_location_source !== 'digital'
            ? { effective_location_name: null, effective_location_source: null }
            : {}),
        };
  const resolved = resolveInvoiceLocation(patchedInput, options);
  return {
    manual_location_id: locationId,
    location_id: locationId,
    effective_location_name: resolved.displayName,
    effective_location_source:
      resolved.source === 'digital'
        ? 'digital'
        : resolved.source === 'manual'
          ? 'manual'
          : null,
  };
}

export function invoiceMatchesLocationFilter(
  invoice: InvoiceLocationInput,
  locationFilter: string,
  options?: { shopLocationById?: Record<string, ShopLocationRow> }
): boolean {
  if (!locationFilter || locationFilter === ALL_LOCATIONS_FILTER) return true;
  const resolved = resolveInvoiceLocation(invoice, options);
  if (locationFilter === NO_LOCATION_FILTER) return resolved.source === 'none';
  return resolved.displayName === locationFilter;
}
