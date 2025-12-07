# Work Order Attachments Setup Guide

This guide will help you set up the camera capture and photo upload feature for work orders.

## Prerequisites

1. You must have a Supabase project set up
2. You must have run the `work-order-attachments-schema.sql` file in your Supabase SQL Editor

## Step 1: Create the Database Table

Run the SQL file in your Supabase SQL Editor:

```sql
-- Run: work-order-attachments-schema.sql
```

This will create:
- The `work_order_attachments` table
- Required indexes
- Row Level Security (RLS) policies

## Step 2: Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create a new bucket"**
4. Configure the bucket:
   - **Name**: `work-order-attachments` (must match exactly)
   - **Public bucket**: ✅ Check this box (or configure policies manually)
   - **File size limit**: Set as needed (recommended: 10MB or higher)
   - **Allowed MIME types**: Leave empty or add `image/jpeg, image/png, image/webp`
5. Click **"Create bucket"**

## Step 3: Configure Storage Policies (Optional but Recommended)

If you made the bucket private, you'll need to set up policies:

1. Go to **Storage** → **Policies** → **work-order-attachments**
2. Create the following policies:

### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Authenticated users can upload work order attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-attachments' AND
  auth.role() = 'authenticated'
);
```

### Policy 2: Allow authenticated users to read files
```sql
CREATE POLICY "Authenticated users can view work order attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-attachments' AND
  auth.role() = 'authenticated'
);
```

### Policy 3: Allow authenticated users to delete files
```sql
CREATE POLICY "Authenticated users can delete work order attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-attachments' AND
  auth.role() = 'authenticated'
);
```

## Step 4: Verify Setup

1. Check that the `work_order_attachments` table exists:
   - Go to **Table Editor** → Look for `work_order_attachments`

2. Check that the storage bucket exists:
   - Go to **Storage** → Look for `work-order-attachments`

3. Test the feature:
   - Go to **Work Orders** tab
   - Click the camera icon on any work order
   - Take a photo and try to upload it

## Troubleshooting

### Error: "Storage bucket not found"
- Make sure the bucket name is exactly `work-order-attachments` (case-sensitive)
- Verify the bucket exists in Storage → Buckets

### Error: "Permission denied" or "new row violates row-level security"
- Check that RLS policies are set up correctly
- Verify storage bucket policies allow uploads
- Make sure you're authenticated

### Error: "JWT" or authentication errors
- Refresh the page and log in again
- Check that your Supabase session is valid

### Photos upload but don't appear
- Check the browser console for errors
- Verify the `work_order_attachments` table exists
- Check that RLS policies allow SELECT operations

### Camera doesn't open
- Grant camera permissions in your browser
- Make sure you're using HTTPS (required for camera access)
- Try a different browser if issues persist

## File Structure

After setup, your files will be stored as:
```
work-order-attachments/
  └── work-order-{work_order_id}-{timestamp}-{random}.jpg
```

## Database Schema

The `work_order_attachments` table stores:
- `id`: UUID primary key
- `work_order_id`: Reference to the work order
- `file_url`: Public URL of the stored file
- `file_name`: Original filename
- `file_type`: MIME type (e.g., image/jpeg)
- `file_size`: File size in bytes
- `created_at`: Timestamp
- `created_by`: User who uploaded (optional)

## Security Notes

- RLS policies ensure users can only access attachments for work orders in their shop
- Storage policies control who can upload/read/delete files
- Files are stored with unique names to prevent conflicts
- Consider setting up automatic cleanup for old attachments if needed

