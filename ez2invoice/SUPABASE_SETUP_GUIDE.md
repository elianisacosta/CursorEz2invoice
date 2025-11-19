# Quick Supabase Database Setup Guide

## Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project (URL: komyyuqpwmrehslfbyhk.supabase.co)

## Step 2: Open SQL Editor
1. In the left sidebar, click on "SQL Editor"
2. Click "New Query" button

## Step 3: Run the Database Schema
Copy and paste this entire SQL code into the editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255),
  duties_description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  hire_date DATE,
  status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'Busy', 'Vacation', 'Off')),
  vacation_weeks_per_year INTEGER DEFAULT 2,
  vacation_weeks_used INTEGER DEFAULT 0,
  default_start_time TIME DEFAULT '08:30',
  default_end_time TIME DEFAULT '17:30',
  skills TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5,2),
  payment_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mechanics_status ON mechanics(status);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_active ON mechanics(is_active);
CREATE INDEX IF NOT EXISTS idx_timesheets_mechanic_id ON timesheets(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON timesheets(work_date);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_mechanics_updated_at 
    BEFORE UPDATE ON mechanics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at 
    BEFORE UPDATE ON timesheets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO mechanics (
    full_name, role_title, duties_description, email, phone, 
    hourly_rate, hire_date, status, vacation_weeks_per_year, 
    vacation_weeks_used, default_start_time, default_end_time, 
    skills, notes, is_active
) VALUES 
(
    'John Smith', 'Senior Mechanic', 'Engine repair, brake service, transmission work',
    'john@shop.com', '(555) 123-4567', 30.00, '2023-01-15', 'Available',
    2, 0, '08:00', '17:00', 
    ARRAY['Engine Repair', 'Brake Service', 'Transmission'],
    'Experienced mechanic with 10+ years', true
),
(
    'Mike Johnson', 'Oil Change Specialist', 'Oil changes, basic maintenance, tire service',
    'mike@shop.com', '(555) 234-5678', 22.00, '2023-03-20', 'Available',
    2, 1, '08:30', '17:30',
    ARRAY['Oil Changes', 'Basic Maintenance', 'Tire Service'],
    'Fast and efficient with routine maintenance', true
),
(
    'Sarah Wilson', 'Diagnostic Specialist', 'Computer diagnostics, electrical systems, troubleshooting',
    'sarah@shop.com', '(555) 345-6789', 28.00, '2023-06-10', 'Available',
    2, 0, '09:00', '18:00',
    ARRAY['Diagnostics', 'Electrical Systems', 'Computer Systems'],
    'Expert in modern vehicle diagnostics', true
);

-- Insert sample timesheets
INSERT INTO timesheets (mechanic_id, work_date, start_time, end_time, total_hours, payment_amount, notes) VALUES 
((SELECT id FROM mechanics WHERE full_name = 'John Smith' LIMIT 1), CURRENT_DATE - INTERVAL '1 day', '08:00', '17:00', 9.0, 270.00, 'Engine repair work'),
((SELECT id FROM mechanics WHERE full_name = 'Mike Johnson' LIMIT 1), CURRENT_DATE - INTERVAL '1 day', '08:30', '17:30', 9.0, 198.00, 'Oil changes and maintenance'),
((SELECT id FROM mechanics WHERE full_name = 'Sarah Wilson' LIMIT 1), CURRENT_DATE, '09:00', '18:00', 9.0, 252.00, 'Diagnostic work');
```

## Step 4: Execute the SQL
1. Click the "Run" button (or press Ctrl+Enter)
2. You should see "Success. No rows returned" message

## Step 5: Verify Tables Created
1. Go to "Table Editor" in the left sidebar
2. You should see two new tables: `mechanics` and `timesheets`
3. Click on `mechanics` table to see the sample data

## Step 6: Test Your Application
1. Go back to your application: http://localhost:3000/dashboard
2. Click on "Mechanics" tab
3. You should now see the sample mechanics loaded from Supabase
4. Try adding a new mechanic - you should see "Mechanic added successfully!" message

## Troubleshooting
- If you get permission errors, make sure you're logged into the correct Supabase project
- If tables already exist, the SQL will skip creating them (safe to run multiple times)
- The sample data will only be inserted if the tables are empty

## What This Does
✅ Creates `mechanics` table with all required fields
✅ Creates `timesheets` table for time tracking
✅ Adds sample mechanics and timesheet data
✅ Sets up automatic timestamp updates
✅ Creates database indexes for better performance
✅ No authentication required (simplified setup)
