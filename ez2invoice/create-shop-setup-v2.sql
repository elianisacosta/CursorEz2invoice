-- Alternative: Create a function that can be called from your application
-- This function will automatically create the shop when called from your app
-- Run this in Supabase SQL Editor

-- Step 1: Add INSERT policy for users table (if it doesn't exist)
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

-- Step 2: Create a function to set up shop (this will be called automatically by your app)
CREATE OR REPLACE FUNCTION setup_user_shop()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
  user_email text;
  shop_id uuid;
BEGIN
  -- Get current user ID and email
  user_uuid := auth.uid();
  user_email := auth.email();
  
  -- Check if user_uuid is null (shouldn't happen when called from app)
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Create user record in public.users if it doesn't exist
  INSERT INTO public.users (id, email, plan_type)
  VALUES (user_uuid, user_email, 'starter')
  ON CONFLICT (id) DO NOTHING;
  
  -- Check if shop already exists
  SELECT id INTO shop_id FROM public.truck_shops WHERE user_id = user_uuid LIMIT 1;
  
  -- Create shop if it doesn't exist
  IF shop_id IS NULL THEN
    INSERT INTO public.truck_shops (user_id, shop_name, plan_type, is_active)
    VALUES (
      user_uuid,
      COALESCE(SPLIT_PART(user_email, '@', 1) || ' Shop', 'My Shop'),
      'starter',
      true
    )
    RETURNING id INTO shop_id;
  END IF;
  
  RETURN shop_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_user_shop() TO authenticated;

-- Note: Your application will automatically call this function when needed
-- You can also manually test it by running: SELECT setup_user_shop();

