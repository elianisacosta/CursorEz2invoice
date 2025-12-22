# Production Setup Guide

## ✅ Security Check: RESEND_API_KEY

**Your `RESEND_API_KEY` is SAFE and SECRET!** ✅

- It's only used in server-side API routes (`/api/send-email/route.ts`)
- It's accessed via `process.env.RESEND_API_KEY` (NOT `NEXT_PUBLIC_`)
- Variables without `NEXT_PUBLIC_` prefix are **never exposed** to client-side code
- The API key only runs on Vercel's servers, never in the browser

## 🚀 Next Steps for Production

### Step 1: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project (`CursorEz2invoice` or `ez2invoice`)

2. **Go to Settings → Environment Variables**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add All Required Variables**
   Add these variables for **Production** environment:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
   NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id_here
   NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_your_professional_price_id_here
   NEXT_PUBLIC_SITE_URL=https://ez2invoice.us
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   RESEND_API_KEY=re_your_resend_api_key_here
   EMAIL_FROM=no-reply@ez2invoice.us
   ```

   **Important:**
   - Set `NEXT_PUBLIC_SITE_URL` to `https://ez2invoice.us` (NOT localhost)
   - Make sure to select **Production** environment when adding
   - You can also add them for **Preview** and **Development** if needed

4. **Redeploy After Adding Variables**
   - After adding variables, trigger a new deployment
   - Go to **Deployments** → Click **Redeploy** on the latest deployment

### Step 2: Verify Domain in Resend

1. **Go to Resend Dashboard**
   - Navigate to: https://resend.com/domains
   - Log in to your Resend account

2. **Add Domain**
   - Click **Add Domain**
   - Enter: `ez2invoice.us`
   - Follow the DNS verification steps

3. **Add DNS Records**
   You'll need to add these DNS records to your domain provider:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT) - Optional but recommended

4. **Wait for Verification**
   - Resend will verify your domain (usually takes a few minutes)
   - Once verified, you can use `no-reply@ez2invoice.us` as sender

### Step 3: Configure Supabase Email Settings

**This is critical for user confirmation emails!**

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Configure Authentication URLs**
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: `https://ez2invoice.us`
   - **Redirect URLs**: Add `https://ez2invoice.us/auth/callback`

3. **Configure Email Settings**
   - Go to **Authentication** → **Settings** → **SMTP Settings**
   - **Option A**: Use Supabase's built-in email (limited: ~3-4 emails/hour on free tier)
   - **Option B**: Configure Custom SMTP with Resend (Recommended):
     - **Enable Custom SMTP**: ON
     - **Host**: `smtp.resend.com`
     - **Port**: `587`
     - **Username**: `resend`
     - **Password**: Your Resend API key (starts with `re_`)
     - **Sender Email**: `no-reply@ez2invoice.us` (must be verified in Resend first)
     - **Sender Name**: `EZ2Invoice`

4. **Enable Email Confirmations**
   - Go to **Authentication** → **Settings**
   - Make sure **Enable email confirmations** is turned ON
   - Set **Email confirmation expiry** to 24 hours (or your preference)

### Step 4: Update .env.local for Local Development

Keep your `.env.local` file for local development:

```env
# Keep localhost for local dev
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# All other variables stay the same
# ... (rest of your variables)
```

**Note:** Vercel will use the environment variables you set in the dashboard, not `.env.local`. The `.env.local` file is only for local development.

### Step 5: Test Email Functionality

1. **Test Invoice/Estimate Emails (Resend)**
   - Log in to your dashboard
   - Create a test invoice
   - Click "Send Invoice" to a test email
   - Check if email is received from `no-reply@ez2invoice.us`

2. **Test User Confirmation Emails (Supabase)**
   - Try creating a new test account
   - Check if confirmation email is received
   - Verify the email redirects to `https://ez2invoice.us/auth/callback`

### Step 6: Monitor Email Delivery

1. **Resend Dashboard**
   - Check **Logs** section for email delivery status
   - Monitor bounce rates and spam reports

2. **Supabase Dashboard**
   - Check **Authentication** → **Logs** for email sending errors
   - Look for rate limit warnings

## 🔒 Security Best Practices

✅ **DO:**
- Keep `RESEND_API_KEY` secret (never commit to git)
- Use environment variables in Vercel
- Rotate API keys periodically
- Monitor email logs for suspicious activity

❌ **DON'T:**
- Never add `NEXT_PUBLIC_` prefix to secret keys
- Never commit `.env.local` to git (it's in `.gitignore`)
- Never expose API keys in client-side code
- Never share API keys publicly

## 📋 Checklist

- [ ] Added all environment variables to Vercel (Production)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to `https://ez2invoice.us` in Vercel
- [ ] Verified domain `ez2invoice.us` in Resend
- [ ] Configured Supabase SMTP settings (or enabled built-in email)
- [ ] Updated Supabase Site URL to `https://ez2invoice.us`
- [ ] Added redirect URL `https://ez2invoice.us/auth/callback` in Supabase
- [ ] Tested invoice/estimate email sending
- [ ] Tested user confirmation email flow
- [ ] Redeployed application after adding environment variables

## 🆘 Troubleshooting

### Emails Not Sending?

1. **Check Vercel Environment Variables**
   - Verify all variables are set correctly
   - Make sure they're set for **Production** environment
   - Redeploy after adding variables

2. **Check Resend Dashboard**
   - Verify domain is verified
   - Check API key is valid
   - Look for rate limits or errors

3. **Check Supabase Logs**
   - Go to **Authentication** → **Logs**
   - Look for email sending errors
   - Check SMTP connection status

4. **Check Browser Console**
   - Open browser DevTools (F12)
   - Look for API errors
   - Check network tab for failed requests

### Confirmation Emails Not Working?

- Verify Supabase Site URL is `https://ez2invoice.us`
- Check redirect URLs include `/auth/callback`
- Verify SMTP settings are correct
- Check email confirmation is enabled in Supabase

