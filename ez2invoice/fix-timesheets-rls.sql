-- Fix RLS Policies for Timesheets Table
-- Run this in Supabase SQL editor if you're getting errors when logging time

-- Drop existing policies if they exist (to ensure clean slate)
DROP POLICY IF EXISTS dev_timesheets_all ON public.timesheets;
DROP POLICY IF EXISTS "Users can view timesheets for their mechanics" ON public.timesheets;
DROP POLICY IF EXISTS "Users can insert timesheets for their mechanics" ON public.timesheets;
DROP POLICY IF EXISTS "Users can update timesheets for their mechanics" ON public.timesheets;
DROP POLICY IF EXISTS "Users can delete timesheets for their mechanics" ON public.timesheets;

-- Create permissive policy for development (allows all operations without auth)
CREATE POLICY dev_timesheets_all ON public.timesheets
  FOR ALL
  USING (true)
  WITH CHECK (true);

