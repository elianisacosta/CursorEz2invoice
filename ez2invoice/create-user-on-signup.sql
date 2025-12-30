-- SQL Script to Automatically Create Users Table Entry on Signup
-- Run this in your Supabase SQL Editor
-- This will create a function and trigger to automatically create a public.users entry
-- when a new user is created in auth.users

-- Step 1: Add INSERT policy for users table (if it doesn't exist)
-- This allows users to create their own record
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

-- Step 2: Create a function to handle new user creation
-- This function will be called automatically via trigger when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, company, plan_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company',
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'starter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger on auth.users to call the function
-- Note: This requires access to auth schema, which may need special permissions
-- If this fails, the application code will handle user creation as a fallback
DO $$
BEGIN
  -- Check if trigger already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Note: If the trigger creation fails due to permissions, 
-- the application code in AuthContext will handle user creation as a fallback.

