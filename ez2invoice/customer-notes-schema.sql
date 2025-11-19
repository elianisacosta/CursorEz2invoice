-- Customer Notes Schema
-- This table stores customer notes and alerts that can be displayed when creating work orders

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('General', 'Warning', 'Compliment', 'Payment Issue', 'Loyalty')),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view notes for customers in their shop
CREATE POLICY "Users can view customer notes for their shop"
  ON customer_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
      AND c.shop_id IN (
        SELECT id FROM public.truck_shops 
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- RLS Policy: Users can insert notes for customers in their shop
CREATE POLICY "Users can insert customer notes for their shop"
  ON customer_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
      AND c.shop_id IN (
        SELECT id FROM public.truck_shops 
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- RLS Policy: Users can update notes for customers in their shop
CREATE POLICY "Users can update customer notes for their shop"
  ON customer_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
      AND c.shop_id IN (
        SELECT id FROM public.truck_shops 
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- RLS Policy: Users can delete notes for customers in their shop
CREATE POLICY "Users can delete customer notes for their shop"
  ON customer_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
      AND c.shop_id IN (
        SELECT id FROM public.truck_shops 
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_customer_notes_updated_at
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_notes_updated_at();

-- Add comment to table
COMMENT ON TABLE customer_notes IS 'Stores customer notes and alerts that appear when creating work orders';
COMMENT ON COLUMN customer_notes.category IS 'Category of the note: General, Warning, Compliment, Payment Issue, or Loyalty';
COMMENT ON COLUMN customer_notes.note IS 'The actual note text content';

