-- SQL Script to Create Shop for Current User
-- Run this in your Supabase SQL Editor
-- This will:
-- 1. Add INSERT policy for users table (so users can create their own record)
-- 2. Create a function to set up shop for a user
-- 3. Provide instructions to get your user ID

-- Step 1: Add INSERT policy for users table (allows users to create their own record)
-- Note: This will fail if the policy already exists - that's OK, just continue
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.users
      FOR INSERT WITH CHECK (auth.uid()::text = id::text);
  END IF;
END $$;

-- Step 2: First, get your user ID from auth.users table
-- Run this query first to find your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- Copy the ID (UUID) from the result

-- Step 3: Replace 'YOUR_USER_ID_HERE' below with your actual user ID from Step 2
-- Then run the INSERT statements below

-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- Also replace 'your-email@example.com' with your actual email

-- Create user record in public.users if it doesn't exist
INSERT INTO public.users (id, email, plan_type)
SELECT 
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with your actual user ID
  'your-email@example.com',   -- Replace with your actual email
  'starter'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = 'YOUR_USER_ID_HERE'::uuid
);

-- Create shop if it doesn't exist
INSERT INTO public.truck_shops (user_id, shop_name, plan_type, is_active)
SELECT 
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with your actual user ID
  COALESCE(
    SPLIT_PART('your-email@example.com', '@', 1) || ' Shop',  -- Replace with your email
    'My Shop'
  ),
  'starter',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.truck_shops WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
);

-- Verify the shop was created (replace YOUR_USER_ID_HERE with your actual user ID)
SELECT 
  ts.id as shop_id,
  ts.shop_name,
  ts.plan_type,
  ts.is_active,
  u.email
FROM public.truck_shops ts
JOIN public.users u ON ts.user_id = u.id
WHERE ts.user_id = 'YOUR_USER_ID_HERE'::uuid;

