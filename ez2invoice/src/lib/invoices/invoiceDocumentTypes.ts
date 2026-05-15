export type InvoiceDocumentCustomer = {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
};

export type InvoiceDocumentInvoice = {
  id: string;
  invoice_number: string | null;
  status?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  work_order_id?: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  card_fee_amount?: number | null;
  notes?: string | null;
  customer?: InvoiceDocumentCustomer | null;
};

export type InvoiceDocumentLineItem = {
  item_type?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  reference_id?: string | null;
  discount_amount?: number | null;
};

export type InvoiceDocumentPayment = {
  amount?: number | null;
  card_fee?: number | null;
  payment_method?: string | null;
  created_at?: string | null;
};

export type InvoiceDocumentShop = {
  shop_name: string;
  addressLines: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
};

export type InvoiceDocumentModel = {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  cardFee: number;
  grandTotal: number;
  paidAmount: number;
  paidDisplay: number;
  balanceDue: number;
  showSignature: boolean;
};

export type InvoiceDocumentData = {
  invoice: InvoiceDocumentInvoice;
  lineItems: InvoiceDocumentLineItem[];
  payments: InvoiceDocumentPayment[];
  shop: InvoiceDocumentShop;
  invoiceTerms: string;
  model: InvoiceDocumentModel;
};
