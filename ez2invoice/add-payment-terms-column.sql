-- Add payment_terms column to invoices table
-- This column stores payment terms like "Due on receipt", "Net 15", "Net 30", etc.

-- Check if column exists before adding (PostgreSQL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'payment_terms'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN payment_terms TEXT DEFAULT 'Due on receipt';
        
        -- Update existing invoices to have default value
        UPDATE invoices 
        SET payment_terms = 'Due on receipt' 
        WHERE payment_terms IS NULL;
    END IF;
END $$;

-- Add comment to column for documentation
COMMENT ON COLUMN invoices.payment_terms IS 'Payment terms for the invoice (e.g., "Due on receipt", "Net 15", "Net 30", "Net 60", "Net 90")';
