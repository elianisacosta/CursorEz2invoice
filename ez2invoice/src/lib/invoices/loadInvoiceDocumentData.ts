import type { SupabaseClient } from '@supabase/supabase-js';
import { buildInvoiceDocumentModel } from './buildInvoiceDocumentModel';
import {
  ensureLegacyPayments,
  normalizeInvoiceRecord,
  normalizeLineItems,
  normalizePayments,
} from './normalizeInvoiceDocumentData';
import type {
  InvoiceDocumentData,
  InvoiceDocumentInvoice,
  InvoiceDocumentShop,
} from './invoiceDocumentTypes';

type ShopRow = {
  shop_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tax_id?: string | null;
  invoice_terms?: string | null;
  card_processing_fee_percentage?: number | null;
};

function buildShopAddressLines(shop: ShopRow): string {
  const cityLine = shop.city
    ? `${shop.city}${shop.state ? `, ${shop.state}` : ''}${shop.zip_code ? ` ${shop.zip_code}` : ''}`
    : '';
  return [shop.address || '', cityLine].filter(Boolean).join('\n') || 'Address not set';
}

function buildShopFromRow(shop: ShopRow, fallbackEmail: string): InvoiceDocumentShop {
  return {
    shop_name: shop.shop_name || 'Your Company Name',
    addressLines: buildShopAddressLines(shop),
    phone: shop.phone || '',
    email: shop.email || fallbackEmail || '',
    website: shop.website || '',
    tax_id: shop.tax_id || '',
    cardProcessingFeePercentage: Number(shop.card_processing_fee_percentage) || null,
  };
}

export type LoadInvoiceDocumentOptions = {
  invoiceTermsOverride?: string;
  userEmail?: string;
};

async function loadCustomerFallback(
  supabase: SupabaseClient,
  customerId: string | null | undefined
): Promise<InvoiceDocumentInvoice['customer']> {
  if (!customerId) return null;
  const { data } = await supabase
    .from('customers')
    .select('first_name,last_name,company,email,phone,address,city,state,zip_code')
    .eq('id', customerId)
    .maybeSingle();
  return (data as InvoiceDocumentInvoice['customer']) || null;
}

export async function loadInvoiceDocumentData(
  supabase: SupabaseClient,
  invoiceId: string,
  options: LoadInvoiceDocumentOptions = {}
): Promise<InvoiceDocumentData | null> {
  const { data: invoiceData, error: invErr } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers(first_name,last_name,company,email,phone,address,city,state,zip_code)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (invErr || !invoiceData) {
    return null;
  }

  const [{ data: lineData }, paymentResult, userResult] = await Promise.all([
    supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const paymentData = paymentResult.error ? [] : paymentResult.data || [];
  if (paymentResult.error) {
    console.warn('[loadInvoiceDocumentData] invoice_payments:', paymentResult.error.message);
  }

  const userEmail = options.userEmail || userResult.data.user?.email || '';
  const rawInvoice = invoiceData as Record<string, unknown>;
  let invoice = normalizeInvoiceRecord(rawInvoice);

  if (!invoice.customer) {
    const customerId = rawInvoice.customer_id as string | undefined;
    invoice = {
      ...invoice,
      customer: await loadCustomerFallback(supabase, customerId),
    };
  }

  let lineItems = normalizeLineItems(lineData || []);
  const laborIds = lineItems
    .filter((item) => item.item_type === 'labor' && item.reference_id)
    .map((item) => item.reference_id as string);
  const partIds = lineItems
    .filter((item) => item.item_type === 'part' && item.reference_id)
    .map((item) => item.reference_id as string);

  const [laborResult, partResult] = await Promise.all([
    laborIds.length > 0
      ? supabase.from('labor_items').select('id,service_name,description').in('id', laborIds)
      : Promise.resolve({ data: [] as any[] }),
    partIds.length > 0
      ? supabase.from('parts').select('id,part_name,part_number,description').in('id', partIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const laborById = new Map((laborResult.data || []).map((row: any) => [row.id, row]));
  const partById = new Map((partResult.data || []).map((row: any) => [row.id, row]));
  lineItems = lineItems.map((item) => {
    const description = (item.description || '').trim();
    if (item.item_type === 'labor' && item.reference_id) {
      const labor = laborById.get(item.reference_id);
      const autoText = [labor?.service_name, labor?.description].filter(Boolean).map((value) => String(value).trim().toLowerCase());
      return {
        ...item,
        item_name: labor?.service_name || item.item_name || description || 'Labor',
        invoice_note: labor && description && !autoText.includes(description.toLowerCase()) ? description : null,
      };
    }
    if (item.item_type === 'part' && item.reference_id) {
      const part = partById.get(item.reference_id);
      const partDisplay = [part?.part_number, part?.part_name].filter(Boolean).join(' — ');
      const autoText = [part?.part_name, part?.part_number, part?.description, partDisplay]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      return {
        ...item,
        item_name: part?.part_name || item.item_name || description || 'Part',
        item_number: part?.part_number || item.item_number || null,
        invoice_note: part && description && !autoText.includes(description.toLowerCase()) ? description : null,
      };
    }
    return {
      ...item,
      item_name: item.item_name || description || 'Item',
      invoice_note: item.invoice_note || null,
    };
  });
  let payments = normalizePayments(paymentData);
  payments = ensureLegacyPayments(invoice, payments);

  let shopId = (rawInvoice.shop_id as string | null) || null;
  if (!shopId && userResult.data.user?.id) {
    const { data: fallbackShop } = await supabase
      .from('truck_shops')
      .select('id')
      .eq('user_id', userResult.data.user.id)
      .limit(1)
      .maybeSingle();
    shopId = fallbackShop?.id || null;
  }

  let shop: InvoiceDocumentShop = {
    shop_name: 'Your Company Name',
    addressLines: 'Address not set',
    phone: '',
    email: userEmail,
    website: '',
    tax_id: '',
  };

  let invoiceTerms = '';

  if (shopId) {
    const extendedSelect =
      'shop_name,address,city,state,zip_code,phone,email,website,tax_id,invoice_terms,card_processing_fee_percentage';
    let shopData: ShopRow | null = null;

    const { data: extendedShop, error: extendedErr } = await supabase
      .from('truck_shops')
      .select(extendedSelect)
      .eq('id', shopId)
      .single();

    if (!extendedErr && extendedShop) {
      shopData = extendedShop as ShopRow;
    } else {
      const { data: basicShop } = await supabase
        .from('truck_shops')
        .select('shop_name,address,city,state,zip_code,phone')
        .eq('id', shopId)
        .single();
      if (basicShop) shopData = basicShop as ShopRow;
    }

    if (shopData) {
      shop = buildShopFromRow(shopData, userEmail);
      if (shopData.invoice_terms) {
        invoiceTerms = String(shopData.invoice_terms);
      }
    }
  }

  if (!invoiceTerms && options.invoiceTermsOverride) {
    invoiceTerms = options.invoiceTermsOverride;
  }

  const model = buildInvoiceDocumentModel(
    invoice,
    payments,
    lineItems,
    shop.cardProcessingFeePercentage
  );

  return {
    invoice,
    lineItems,
    payments,
    shop,
    invoiceTerms,
    model,
  };
}
