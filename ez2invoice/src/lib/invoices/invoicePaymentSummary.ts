export type InvoicePaymentLike = {
  id?: string | null;
  invoice_id?: string | null;
  amount?: number | string | null;
  card_fee?: number | string | null;
  card_fee_amount?: number | string | null;
  processing_fee?: number | string | null;
  payment_method?: string | null;
  created_at?: string | null;
};

export type InvoicePaymentSummary = {
  paidTowardInvoice: number;
  cardFeeCollected: number;
  totalCollected: number;
  balanceBeforeCardFee: number;
  currentCardFee: number;
  totalDueToday: number;
};

export type InvoiceFinancials = InvoicePaymentSummary & {
  subtotal: number;
  tax: number;
  invoiceTotal: number;
  status: 'paid' | 'partial' | 'unpaid' | 'pending';
};

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function getSavedPaymentTotalCollected(payment: InvoicePaymentLike): number {
  return Math.max(0, round2(Number(payment.amount) || 0));
}

export function getSavedPaymentCardFee(payment: InvoicePaymentLike): number {
  const amount = getSavedPaymentTotalCollected(payment);
  const fee = Math.max(
    0,
    round2(
      Number(payment.card_fee ?? payment.card_fee_amount ?? payment.processing_fee) || 0
    )
  );
  return Math.min(amount, fee);
}

export function getSavedPaymentAppliedToInvoice(payment: InvoicePaymentLike): number {
  return Math.max(0, round2(getSavedPaymentTotalCollected(payment) - getSavedPaymentCardFee(payment)));
}

export function summarizeSavedInvoicePayments(
  payments: InvoicePaymentLike[],
  options: {
    invoiceTotal: number;
    applyCardFee: boolean;
    cardFeePercentage: number;
    legacyPaidTowardInvoice?: number | string | null;
    allowLegacyFallback?: boolean;
  }
): InvoicePaymentSummary {
  const invoiceTotal = Math.max(0, round2(options.invoiceTotal));
  const paidFromRows = round2(
    payments.reduce((sum, payment) => sum + getSavedPaymentAppliedToInvoice(payment), 0)
  );
  const legacyPaid =
    payments.length === 0 && options.allowLegacyFallback
      ? Math.max(0, round2(Number(options.legacyPaidTowardInvoice) || 0))
      : 0;
  const paidTowardInvoice = Math.min(
    invoiceTotal,
    payments.length > 0 ? paidFromRows : legacyPaid
  );
  const cardFeeCollected = round2(
    payments.reduce((sum, payment) => sum + getSavedPaymentCardFee(payment), 0)
  );
  const totalCollected = payments.length > 0
    ? round2(payments.reduce((sum, payment) => sum + getSavedPaymentTotalCollected(payment), 0))
    : paidTowardInvoice;
  const balanceBeforeCardFee = Math.max(0, round2(invoiceTotal - paidTowardInvoice));
  const rate = Math.max(0, Number(options.cardFeePercentage) || 0) / 100;
  const currentCardFee =
    options.applyCardFee && balanceBeforeCardFee > 0 && rate > 0
      ? round2(balanceBeforeCardFee * rate)
      : 0;
  const totalDueToday = Math.max(0, round2(balanceBeforeCardFee + currentCardFee));

  return {
    paidTowardInvoice,
    cardFeeCollected,
    totalCollected,
    balanceBeforeCardFee,
    currentCardFee,
    totalDueToday,
  };
}

export function calculateInvoiceFinancials(
  invoice: {
    subtotal?: number | string | null;
    tax_amount?: number | string | null;
    total_amount?: number | string | null;
    paid_amount?: number | string | null;
    apply_card_fee?: boolean | null;
  },
  payments: InvoicePaymentLike[],
  options: {
    cardFeePercentage: number;
    allowLegacyFallback?: boolean;
  }
): InvoiceFinancials {
  const subtotal = Math.max(0, round2(Number(invoice.subtotal) || 0));
  const tax = Math.max(0, round2(Number(invoice.tax_amount) || 0));
  const invoiceTotal = Math.max(0, round2(Number(invoice.total_amount) || 0));
  const paymentSummary = summarizeSavedInvoicePayments(payments, {
    invoiceTotal,
    applyCardFee: invoice.apply_card_fee === true,
    cardFeePercentage: options.cardFeePercentage,
    legacyPaidTowardInvoice: invoice.paid_amount,
    allowLegacyFallback: options.allowLegacyFallback,
  });

  const status =
    invoiceTotal <= 0
      ? 'pending'
      : paymentSummary.paidTowardInvoice >= invoiceTotal - 0.01
        ? 'paid'
        : paymentSummary.paidTowardInvoice > 0.01
          ? 'partial'
          : 'unpaid';

  return {
    subtotal,
    tax,
    invoiceTotal,
    status,
    ...paymentSummary,
  };
}
