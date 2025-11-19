# Email Setup Guide

This application uses **Resend** for sending emails to customers. Follow these steps to enable email functionality:

## Step 1: Sign up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

## Step 2: Get Your API Key

1. Log in to Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "EZ2Invoice Production")
5. Copy the API key (starts with `re_`)

## Step 3: Add API Key to Environment Variables

1. Create or edit `.env.local` file in the `ez2invoice` directory
2. Add the following:

```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

**Important Notes:**
- Replace `re_your_api_key_here` with your actual Resend API key
- Replace `noreply@yourdomain.com` with your verified domain email
- For testing, you can use `onboarding@resend.dev` (Resend's test domain)

## Step 4: Verify Your Domain (Optional but Recommended)

For production use, you should verify your own domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS verification steps
4. Once verified, update `EMAIL_FROM` in `.env.local` to use your domain

## Step 5: Test Email Sending

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Try sending an estimate or invoice to a customer
3. Check the customer's email inbox (and spam folder)

## Troubleshooting

### Emails not sending?

1. **Check console logs** - The API route will log errors
2. **Verify API key** - Make sure `RESEND_API_KEY` is set correctly
3. **Check Resend dashboard** - Look for any errors or rate limits
4. **Verify email address** - Make sure the customer has a valid email in the database

### Using a different email service?

You can modify `/src/app/api/send-email/route.ts` to use:
- **SendGrid** - Replace Resend API calls with SendGrid SDK
- **Mailgun** - Replace Resend API calls with Mailgun SDK
- **AWS SES** - Replace Resend API calls with AWS SES SDK
- **Supabase Edge Functions** - Use Supabase's email functionality

## Current Email Features

- ✅ **Estimate Emails** - Sends formatted estimate emails to customers
- ✅ **Invoice Emails** - Sends formatted invoice emails to customers (when implemented)
- ✅ **HTML Email Templates** - Professional, responsive email design
- ✅ **Automatic Status Updates** - Updates estimate/invoice status after sending

## Email Template Customization

Email templates are generated in:
- Estimates: `generateEstimateEmailHTML()` function in `dashboard/page.tsx`
- Invoices: `generateInvoiceEmailHTML()` function (to be implemented)

You can customize the HTML templates to match your brand.

