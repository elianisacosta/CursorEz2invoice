'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type PrintInvoice = {
  id: string;
  invoice_number: string | null;
  status?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  customer_id?: string | null;
  work_order_id?: string | null;
  shop_id?: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  paid_at?: string | null;
  notes?: string | null;
  card_fee_amount?: number | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
};

type PrintLineItem = {
  item_type?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  reference_id?: string | null;
  discount_amount?: number | null;
};

type PaymentRow = {
  amount?: number | null;
  card_fee?: number | null;
  payment_method?: string | null;
  created_at?: string | null;
};

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = String(params?.id || '');
  const hasPrintedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<PrintInvoice | null>(null);
  const [lineItems, setLineItems] = useState<PrintLineItem[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [companyName, setCompanyName] = useState('Your Company Name');
  const [companyAddress, setCompanyAddress] = useState('Address not set');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInvoiceTerms(localStorage.getItem('ez2invoice-invoice-terms') || '');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId) {
        setError('Missing invoice id.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const { data: invoiceData, error: invErr } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:customers(first_name,last_name,company,email,phone,address,city,state,zip_code)
          `)
          .eq('id', invoiceId)
          .single();
        if (invErr || !invoiceData) {
          throw new Error(invErr?.message || 'Invoice not found');
        }
        setInvoice(invoiceData as PrintInvoice);

        const [{ data: lineData }, { data: paymentData }, { data: userData }] = await Promise.all([
          supabase.from('invoice_line_items').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: true }),
          supabase.from('invoice_payments').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: true }),
          supabase.auth.getUser(),
        ]);
        setLineItems((lineData || []) as PrintLineItem[]);
        setPayments((paymentData || []) as PaymentRow[]);
        setCompanyEmail(userData?.user?.email || '');

        let shopId = invoiceData.shop_id as string | null;
        if (!shopId && userData?.user?.id) {
          const { data: fallbackShop } = await supabase
            .from('truck_shops')
            .select('id')
            .eq('user_id', userData.user.id)
            .limit(1)
            .maybeSingle();
          shopId = fallbackShop?.id || null;
        }
        if (shopId) {
          const { data: shopData } = await supabase
            .from('truck_shops')
            .select('shop_name,address,city,state,zip_code,phone')
            .eq('id', shopId)
            .single();
          if (shopData) {
            setCompanyName(shopData.shop_name || 'Your Company Name');
            const fullAddress = [
              shopData.address || '',
              shopData.city
                ? `${shopData.city}${shopData.state ? `, ${shopData.state}` : ''}${shopData.zip_code ? ` ${shopData.zip_code}` : ''}`
                : '',
            ]
              .filter(Boolean)
              .join('\n');
            setCompanyAddress(fullAddress || 'Address not set');
            setCompanyPhone(shopData.phone || '');
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [invoiceId]);

  const model = useMemo(() => {
    if (!invoice) return null;
    const subtotal = Number(invoice.subtotal) || 0;
    const discount = Number(invoice.discount_amount) || 0;
    const taxRate = Number(invoice.tax_rate) || 0;
    const taxAmount = Number(invoice.tax_amount) || 0;
    const totalBase = Number(invoice.total_amount) || 0;
    const paidAmount = Number(invoice.paid_amount) || 0;
    const grossPaidFromPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paidDisplay = grossPaidFromPayments > 0 ? grossPaidFromPayments : paidAmount;
    const paidCardFees = payments.reduce((sum, p) => sum + (Number(p.card_fee) || 0), 0);
    const fallbackCardFee = Number(invoice.card_fee_amount) || 0;
    const cardFee = paidCardFees > 0 ? paidCardFees : fallbackCardFee;
    const grandTotal = totalBase + cardFee;
    const balanceDue = Math.max(0, grandTotal - paidDisplay);
    const showSignature = (invoice.status || '').toLowerCase() === 'paid' || balanceDue <= 0.01;
    return { subtotal, discount, taxRate, taxAmount, cardFee, grandTotal, paidAmount, paidDisplay, balanceDue, showSignature };
  }, [invoice, payments]);

  useEffect(() => {
    if (!loading && !error && invoice && model && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      setTimeout(() => window.print(), 200);
    }
  }, [loading, error, invoice, model]);

  if (loading) return <div style={{ padding: 24 }}>Loading invoice...</div>;
  if (error || !invoice || !model) return <div style={{ padding: 24 }}>Unable to print invoice: {error || 'Unknown error'}</div>;

  const customerName = invoice.customer
    ? [invoice.customer.first_name, invoice.customer.last_name].filter(Boolean).join(' ') || invoice.customer.company || 'Unknown'
    : 'Unknown';
  const customerAddress = invoice.customer?.address
    ? `${invoice.customer.address}${invoice.customer.city ? `, ${invoice.customer.city}` : ''}${invoice.customer.state ? `, ${invoice.customer.state}` : ''}${invoice.customer.zip_code ? ` ${invoice.customer.zip_code}` : ''}`
    : '';
  const invoiceDate = invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : 'N/A';
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : 'N/A';

  return (
    <div className="print-page">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; }
        .print-page { padding: 36px 52px; line-height: 1.4; background: #fff; }
        .header { display: flex; justify-content: space-between; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 2px solid #1f2937; }
        .invoice-title { font-size: 48px; font-weight: 700; color: #374151; margin-bottom: 8px; }
        .invoice-number { font-size: 16px; color: #6b7280; }
        .company-info { text-align: right; font-size: 14px; color: #374151; white-space: pre-line; }
        .company-name { font-weight: 700; font-size: 18px; margin-bottom: 8px; color: #1f2937; }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
        .section-title { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .4px; color: #374151; margin-bottom: 8px; }
        .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .table th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #374151; }
        .table td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
        .totals { text-align: right; }
        .row { margin-bottom: 2px; font-size: 13px; }
        .row.total { font-size: 16px; font-weight: 700; margin-top: 6px; padding-top: 6px; border-top: 2px solid #e5e7eb; }
        .payments-title { font-weight: 700; margin: 8px 0 6px; font-size: 11px; text-transform: uppercase; color: #374151; }
        .payment-row { font-size: 11px; margin-bottom: 2px; }
        .payment-history-row { padding: 3px 0; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; line-height: 1.2; }
        .terms-section { margin-top: 14px; font-size: 12px; line-height: 1.35; }
        .footer { margin-top: 26px; text-align: center; color: #9ca3af; font-size: 13px; }
        .auth-block { margin-top: 28px; margin-bottom: 8px; text-align: left; font-size: 9px; line-height: 1.35; color: #374151; }
        .auth-heading { font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; color: #1f2937; }
        .auth-body { font-size: 12px; font-weight: 400; line-height: 1.35; }
        .signature-section { margin-top: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; }
        .signature-line { border-top: 1px solid #1f2937; padding-top: 6px; margin-top: 22px; }
        .no-print { margin-top: 16px; }
        @media print {
          .print-page { padding: 22px 30px; }
          .no-print { display: none; }
          @page { margin: 0; }
        }
      `}</style>

      <div className="header">
        <div>
          <div className="invoice-title">INVOICE</div>
          <div className="invoice-number">{invoice.invoice_number || invoice.id}</div>
        </div>
        <div className="company-info">
          <div className="company-name">{companyName}</div>
          {companyAddress}
          {companyEmail ? `\n${companyEmail}` : ''}
          {companyPhone ? `\n${companyPhone}` : ''}
        </div>
      </div>

      <div className="main-content">
        <div>
          <div className="section-title">BILL TO:</div>
          <div>{customerName}</div>
          {customerAddress && <div>{customerAddress}</div>}
          {invoice.customer?.email && <div>{invoice.customer.email}</div>}
          {invoice.customer?.phone && <div>{invoice.customer.phone}</div>}
        </div>
        <div>
          <div><strong>Invoice Date:</strong> {invoiceDate}</div>
          {invoice.work_order_id && <div><strong>Work Order:</strong> {invoice.work_order_id}</div>}
          <div><strong>Due Date:</strong> {dueDate}</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>TYPE</th>
            <th>ITEM</th>
            <th>DESCRIPTION</th>
            <th style={{ textAlign: 'right' }}>QTY</th>
            <th style={{ textAlign: 'right' }}>PRICE</th>
            <th style={{ textAlign: 'right' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>No line items</td></tr>
          ) : lineItems.map((item, idx) => (
            <tr key={`${idx}-${item.reference_id || ''}`}>
              <td>{(item.item_type || 'labor').toLowerCase() === 'part' ? 'Part' : 'Labor'}</td>
              <td>{item.description || 'Item'}</td>
              <td>
                {item.description || ''}
                {(Number(item.discount_amount) || 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#b91c1c' }}>Discount: -${(Number(item.discount_amount) || 0).toFixed(2)}</div>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>{Number(item.quantity) || 1}</td>
              <td style={{ textAlign: 'right' }}>${(Number(item.unit_price) || 0).toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>${(Number(item.total_price) || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary">
        <div className="terms-section">
          {invoice.notes && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">NOTES:</div>
              <div>{invoice.notes}</div>
            </div>
          )}
        </div>
        <div className="totals">
          <div className="row">Subtotal: ${model.subtotal.toFixed(2)}</div>
          {model.discount > 0 && <div className="row">Discount: -${model.discount.toFixed(2)}</div>}
          <div className="row">Tax ({(model.taxRate * 100).toFixed(0)}%): ${model.taxAmount.toFixed(2)}</div>
          {model.cardFee > 0 && <div className="row">Card Processing Fee: ${model.cardFee.toFixed(2)}</div>}
          <div className="row total">Total (incl. card fee): ${model.grandTotal.toFixed(2)}</div>
          {(model.paidAmount > 0 || payments.length > 0) && (
            <div style={{ marginTop: 16 }}>
              <div className="payment-row"><strong>Amount Paid:</strong> -${model.paidDisplay.toFixed(2)}</div>
              <div className="payment-row" style={{ fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                <strong>Balance Due:</strong> ${model.balanceDue.toFixed(2)}
              </div>
              <div className="payments-title">PAYMENT HISTORY:</div>
              {payments.length > 0 ? payments.map((p, idx) => {
                const date = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
                const method = p.payment_method === 'card' ? 'Credit Card' : p.payment_method === 'cash' ? 'Cash' : (p.payment_method || 'Other');
                const amount = Number(p.amount) || 0;
                const fee = Number(p.card_fee) || 0;
                const base = amount - fee;
                return <div key={`${idx}-${date}`} className="payment-history-row">{date} ({method}) ${base.toFixed(2)}{fee > 0 ? ` + $${fee.toFixed(2)} fee` : ''}</div>;
              }) : <div className="payment-history-row">No payment history</div>}
            </div>
          )}
        </div>
      </div>

      {invoiceTerms.trim().length > 0 && (
        <div className="terms-section">
          <div className="section-title">TERMS AND CONDITIONS</div>
          <div>{invoiceTerms}</div>
        </div>
      )}

      <div className="footer">Thank you for your business!</div>
      {model.showSignature && (
        <>
          <div className="auth-block">
            <div className="auth-heading">Customer Authorization & Acceptance</div>
            <div className="auth-body">
              By signing, I authorize this purchase and approve the total amount. I confirm receipt/completion of the parts/services and agree to the Terms & Conditions.
            </div>
          </div>
          <div className="signature-section">
            <div>
              <div className="signature-line">Customer Signature</div>
            </div>
            <div>
              <div className="signature-line">Date</div>
            </div>
          </div>
        </>
      )}
      <div className="no-print">
        <button onClick={() => window.print()}>Print Again</button>
      </div>
    </div>
  );
}

