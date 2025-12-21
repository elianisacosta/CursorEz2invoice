# Supabase Email Configuration Guide

## Problem: Users Not Receiving Confirmation Emails

If new users are not receiving confirmation emails after signing up, you need to configure Supabase's email service.

## Solution: Configure Supabase Email Settings

### Option 1: Use Supabase's Built-in Email Service (Free Tier - Limited)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Go to **Authentication** → **Settings** (or **Configuration**)
   - Scroll down to **Email Templates** or **SMTP Settings**

3. **Check Email Service Status**
   - Verify that email sending is enabled
   - Free tier has limited email sending (usually 3-4 emails per hour)

4. **Configure Email Templates (Optional)**
   - You can customize the confirmation email template
   - Make sure the redirect URL includes your domain: `https://ez2invoice.us/auth/callback`

### Option 2: Configure Custom SMTP (Recommended for Production)

1. **Get SMTP Credentials**
   - Sign up for an email service (Resend, SendGrid, Mailgun, etc.)
   - Get your SMTP credentials (host, port, username, password)

2. **Configure in Supabase**
   - Go to **Authentication** → **Settings** → **SMTP Settings**
   - Enable **Custom SMTP**
   - Enter your SMTP details:
     - **Host**: `smtp.resend.com` (for Resend) or your provider's SMTP host
     - **Port**: `587` (TLS) or `465` (SSL)
     - **Username**: Your SMTP username
     - **Password**: Your SMTP password
     - **Sender Email**: `noreply@ez2invoice.us` (must be verified domain)
     - **Sender Name**: `EZ2Invoice`

3. **Verify Your Domain**
   - Make sure your domain (`ez2invoice.us`) is verified with your email provider
   - Add required DNS records (SPF, DKIM, DMARC)

### Option 3: Use Resend (Recommended - Already Set Up)

Since you already have Resend configured for invoice/estimate emails, you can use it for confirmation emails too:

1. **Get Resend SMTP Credentials**
   - Log in to Resend dashboard
   - Go to **SMTP** section
   - Copy your SMTP credentials

2. **Configure in Supabase**
   - Use Resend's SMTP settings:
     - **Host**: `smtp.resend.com`
     - **Port**: `587`
     - **Username**: `resend`
     - **Password**: Your Resend API key (starts with `re_`)
     - **Sender Email**: Your verified domain email (e.g., `noreply@ez2invoice.us`)

## Quick Fix: Check These Settings

1. **Site URL in Supabase**
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: `https://ez2invoice.us`
   - **Redirect URLs**: Add `https://ez2invoice.us/auth/callback`

2. **Email Confirmation Settings**
   - Go to **Authentication** → **Settings**
   - Make sure **Enable email confirmations** is turned ON
   - **Email confirmation expiry**: Set to a reasonable time (e.g., 24 hours)

3. **Check Email Logs**
   - Go to **Authentication** → **Logs**
   - Look for email sending errors or rate limit warnings

## Testing

1. **Test Signup Flow**
   - Try creating a new account
   - Check the browser console for any errors
   - Check Supabase logs for email sending status

2. **Check Email Delivery**
   - Check spam/junk folder
   - Verify email address is correct
   - Try resending confirmation email

## Troubleshooting

### Emails Still Not Sending?

1. **Check Supabase Logs**
   - Go to **Logs** → **Auth Logs**
   - Look for email-related errors

2. **Verify SMTP Credentials**
   - Double-check username/password
   - Test SMTP connection from Supabase dashboard

3. **Check Rate Limits**
   - Free tier has strict limits
   - Upgrade to Pro plan for higher limits

4. **Domain Verification**
   - Ensure your domain is verified
   - Check DNS records are correct

## Alternative: Custom Email Confirmation Flow

If Supabase email continues to be unreliable, we can implement a custom email confirmation flow using Resend directly. This would require:
- Creating a custom API route to send confirmation emails
- Storing confirmation tokens in the database
- Creating a verification endpoint

Let me know if you'd like to implement this alternative approach.

