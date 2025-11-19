# Run Mechanics Schema in Supabase

## Quick Setup Guide

This file contains instructions to fix the "Error fetching mechanics" error on your dashboard.

## Steps to Run the SQL Schema

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **komyyuqpwmrehslfbyhk**
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New Query"** to create a new SQL script

### Step 2: Copy and Paste the SQL Schema

1. Open the file: `ez2invoice/mechanics-schema.sql`
2. Copy the **entire contents** (lines 1-224)
3. Paste into the Supabase SQL Editor
4. Click the **"Run"** button (or press Ctrl+Enter)

### Step 3: Verify Tables Were Created

1. In Supabase, go to **"Table Editor"** in the left sidebar
2. You should now see two new tables:
   - `mechanics` (with 3 sample mechanics)
   - `timesheets` (with 3 sample timesheet entries)

### Step 4: Refresh Your Dashboard

1. Go back to your localhost dashboard: http://localhost:3000/dashboard
2. Refresh the page (F5 or Ctrl+R)
3. The error should be gone
4. You should see 3 sample mechanics displayed

## What This Schema Does

- Creates `mechanics` table with fields for mechanic management
- Creates `timesheets` table for time tracking
- Sets up Row Level Security (RLS) policies
- Creates indexes for better performance
- Adds 3 sample mechanics (John Smith, Mike Johnson, Sarah Wilson)
- Adds 3 sample timesheet entries

## After Running the Schema

Your dashboard will now:
- Display real database data instead of placeholder data
- Allow you to add, edit, and delete mechanics
- Track timesheets for each mechanic
- Store all data persistently in Supabase

## Troubleshooting

If you encounter any errors:
1. Make sure you're logged into your Supabase account
2. Verify you're in the correct project
3. Check the SQL Editor output for specific error messages
4. The schema uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

## Need Help?

Check the SQL schema file: `ez2invoice/mechanics-schema.sql`


