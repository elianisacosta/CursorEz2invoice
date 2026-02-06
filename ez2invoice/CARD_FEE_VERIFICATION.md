# Card processing fee fix – verification

Use these steps to confirm the fee is applied once and never doubled.

## Setup

1. Run in Supabase SQL Editor (in order):
   - `add-invoice-card-fee-columns.sql`
   - `create-invoice-balances-view.sql`

## Regression check

1. **Create invoice with card fee on**
   - Create or edit an invoice with line items (e.g. subtotal $70, tax 6% → base $74.20).
   - Turn **Apply 2.5% card fee** ON.
   - Save/Update Invoice.
   - **Expect:** Cost summary shows Total (base) $74.20, Card fee $1.86, Balance due $76.06.

2. **Open Record Payment**
   - From the same invoice (edit modal or list), click **Record Payment**.
   - **Expect:** Modal shows Invoice Total (base) $74.20, Card Processing Fee $1.86, Balance Due $76.06. “Pay Full Amount” fills $76.06.

3. **Record first payment**
   - Record a full payment (e.g. $76.06, method Card). Confirm.
   - **Expect:** Invoice shows Paid; Balance due $0. Card fee still $1.86 (not doubled).

4. **Record payment again (e.g. partial or second invoice)**
   - On another invoice with card fee on: record a payment, then record another payment.
   - **Expect:** `card_fee_amount` stays the same (one 2.5% of base). `payments_sum` increases. `balance_due` = (total_amount + card_fee_amount) − payments_sum and decreases as payments are added.

## Formula

- **Base:** `total_amount` = subtotal + tax (no fee in this field).
- **Card fee:** `card_fee_amount` = roundTo2(base × 0.025) when apply_card_fee, else 0.
- **Balance due:** `(total_amount + card_fee_amount) − sum(invoice_payments.amount)`.
