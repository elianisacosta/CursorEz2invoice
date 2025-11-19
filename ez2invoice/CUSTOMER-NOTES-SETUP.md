# Customer Notes Setup

This guide will help you set up the customer notes feature in your database.

## What This Does

The customer notes feature allows you to:
- Add notes and alerts when creating customers
- View customer notes when creating work orders
- Categorize notes (General, Warning, Compliment, Payment Issue, Loyalty)

## Setup Instructions

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the contents of `customer-notes-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the Table**
   - The `customer_notes` table should now exist
   - It includes Row Level Security (RLS) policies for data protection

## Table Structure

The `customer_notes` table has the following columns:
- `id` - Unique identifier (UUID)
- `customer_id` - Reference to the customer (UUID, foreign key)
- `category` - Note category (General, Warning, Compliment, Payment Issue, Loyalty)
- `note` - The note text content
- `created_at` - Timestamp when note was created
- `updated_at` - Timestamp when note was last updated

## Features

- **Automatic Timestamps**: `created_at` and `updated_at` are automatically managed
- **Row Level Security**: Only users from the same shop can view/edit notes
- **Cascade Delete**: Notes are automatically deleted when a customer is deleted
- **Indexed**: Fast lookups by customer_id and created_at

## Usage

Once the table is created:
1. When creating a customer, you can add notes using the "Customer Notes & Alerts" section
2. When creating a work order and selecting a customer, their notes will automatically appear
3. Notes are color-coded by category for easy identification

## Troubleshooting

If you encounter RLS (Row Level Security) errors:
- Make sure you've run the `create-shop-setup.sql` or `create-shop-setup-v2.sql` file first
- Ensure your user has the proper shop_id set up in the users table

