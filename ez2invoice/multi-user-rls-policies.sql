-- Multi-User RLS Policies Update
-- Run AFTER multi-user-team-members-schema.sql
-- Updates existing tables to use user_has_shop_access (allows team members)

-- ============================================
-- truck_shops: owner OR active member can view; owner can manage
-- ============================================
DROP POLICY IF EXISTS "Users can manage own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can view own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can insert own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can update own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can delete own shops" ON public.truck_shops;

CREATE POLICY "truck_shops_select" ON public.truck_shops FOR SELECT
  USING (user_has_shop_access(auth.uid(), id));

CREATE POLICY "truck_shops_insert" ON public.truck_shops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "truck_shops_update" ON public.truck_shops FOR UPDATE
  USING (user_has_shop_access(auth.uid(), id));

CREATE POLICY "truck_shops_delete" ON public.truck_shops FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- invoices
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices for own shops" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- invoice_line_items (via invoice)
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoice line items for own shops" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can view invoice line items for own shops" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can insert invoice line items for own shops" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can update invoice line items for own shops" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can delete invoice line items for own shops" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select" ON public.invoice_line_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));

CREATE POLICY "invoice_line_items_insert" ON public.invoice_line_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));

CREATE POLICY "invoice_line_items_update" ON public.invoice_line_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));

CREATE POLICY "invoice_line_items_delete" ON public.invoice_line_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));

-- ============================================
-- customers
-- ============================================
DROP POLICY IF EXISTS "Users can manage customers for own shops" ON public.customers;

CREATE POLICY "customers_select" ON public.customers FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "customers_delete" ON public.customers FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- work_orders
-- ============================================
DROP POLICY IF EXISTS "Users can manage work orders for own shops" ON public.work_orders;

CREATE POLICY "work_orders_select" ON public.work_orders FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "work_orders_insert" ON public.work_orders FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "work_orders_update" ON public.work_orders FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "work_orders_delete" ON public.work_orders FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- parts
-- ============================================
DROP POLICY IF EXISTS "Users can manage parts for own shops" ON public.parts;

CREATE POLICY "parts_select" ON public.parts FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "parts_insert" ON public.parts FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "parts_update" ON public.parts FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "parts_delete" ON public.parts FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- estimates
-- ============================================
DROP POLICY IF EXISTS estimates_select ON public.estimates;
DROP POLICY IF EXISTS estimates_insert ON public.estimates;
DROP POLICY IF EXISTS estimates_update ON public.estimates;
DROP POLICY IF EXISTS estimates_delete ON public.estimates;

CREATE POLICY "estimates_select" ON public.estimates FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "estimates_insert" ON public.estimates FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "estimates_update" ON public.estimates FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "estimates_delete" ON public.estimates FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- service_bays
-- ============================================
DROP POLICY IF EXISTS "Users can manage bays for own shops" ON public.service_bays;

CREATE POLICY "service_bays_select" ON public.service_bays FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "service_bays_insert" ON public.service_bays FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "service_bays_update" ON public.service_bays FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "service_bays_delete" ON public.service_bays FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- trucks
-- ============================================
DROP POLICY IF EXISTS "Users can manage trucks for own shops" ON public.trucks;

CREATE POLICY "trucks_select" ON public.trucks FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "trucks_insert" ON public.trucks FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "trucks_update" ON public.trucks FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "trucks_delete" ON public.trucks FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- invoice_counters
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoice counters for own shops" ON public.invoice_counters;

CREATE POLICY "invoice_counters_all" ON public.invoice_counters FOR ALL
  USING (user_has_shop_access(auth.uid(), shop_id))
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));

-- ============================================
-- employees (or mechanics if not refactored)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    DROP POLICY IF EXISTS "Users can manage employees for own shops" ON public.employees;
    DROP POLICY IF EXISTS "employees_select" ON public.employees;
    DROP POLICY IF EXISTS "employees_insert" ON public.employees;
    DROP POLICY IF EXISTS "employees_update" ON public.employees;
    DROP POLICY IF EXISTS "employees_delete" ON public.employees;
    CREATE POLICY "employees_select" ON public.employees FOR SELECT USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (user_has_shop_access(auth.uid(), shop_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mechanics') THEN
    DROP POLICY IF EXISTS "Users can manage mechanics for own shops" ON public.mechanics;
    DROP POLICY IF EXISTS "mechanics_select" ON public.mechanics;
    DROP POLICY IF EXISTS "mechanics_insert" ON public.mechanics;
    DROP POLICY IF EXISTS "mechanics_update" ON public.mechanics;
    DROP POLICY IF EXISTS "mechanics_delete" ON public.mechanics;
    CREATE POLICY "mechanics_select" ON public.mechanics FOR SELECT USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "mechanics_insert" ON public.mechanics FOR INSERT WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "mechanics_update" ON public.mechanics FOR UPDATE USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "mechanics_delete" ON public.mechanics FOR DELETE USING (user_has_shop_access(auth.uid(), shop_id));
  END IF;
END $$;

-- ============================================
-- labor_items
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'labor_items') THEN
    DROP POLICY IF EXISTS "Users can manage labor items for own shops" ON public.labor_items;
    DROP POLICY IF EXISTS "labor_items_select" ON public.labor_items;
    DROP POLICY IF EXISTS "labor_items_insert" ON public.labor_items;
    DROP POLICY IF EXISTS "labor_items_update" ON public.labor_items;
    DROP POLICY IF EXISTS "labor_items_delete" ON public.labor_items;
    CREATE POLICY "labor_items_select" ON public.labor_items FOR SELECT USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "labor_items_insert" ON public.labor_items FOR INSERT WITH CHECK (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "labor_items_update" ON public.labor_items FOR UPDATE USING (user_has_shop_access(auth.uid(), shop_id));
    CREATE POLICY "labor_items_delete" ON public.labor_items FOR DELETE USING (user_has_shop_access(auth.uid(), shop_id));
  END IF;
END $$;

-- ============================================
-- invoice_payments (via invoice shop)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_payments') THEN
    DROP POLICY IF EXISTS invoice_payments_select ON public.invoice_payments;
    DROP POLICY IF EXISTS invoice_payments_insert ON public.invoice_payments;
    DROP POLICY IF EXISTS invoice_payments_update ON public.invoice_payments;
    DROP POLICY IF EXISTS invoice_payments_delete ON public.invoice_payments;
    CREATE POLICY invoice_payments_select ON public.invoice_payments FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_payments.invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));
    CREATE POLICY invoice_payments_insert ON public.invoice_payments FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_payments.invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));
    CREATE POLICY invoice_payments_update ON public.invoice_payments FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_payments.invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));
    CREATE POLICY invoice_payments_delete ON public.invoice_payments FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_payments.invoice_id AND user_has_shop_access(auth.uid(), i.shop_id)));
  END IF;
END $$;
