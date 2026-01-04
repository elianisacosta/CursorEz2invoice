# EZ2Invoice - Truck Shop Management System

A comprehensive truck shop management solution built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Frontend**: Modern React/Next.js application with smooth animations
- **Backend**: Supabase for database, authentication, and real-time features
- **Pages**: Homepage, Pricing, Contact, FAQ
- **Authentication**: User sign-up, sign-in, and profile management
- **Contact Form**: Integrated with Supabase for message storage
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL script to create all tables and policies

### 2. Environment Variables

**IMPORTANT:** Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your actual keys:

```env
# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# CRITICAL: Service Role Key (required for Stripe webhooks and database updates)
# This key bypasses Row Level Security (RLS) - keep it SECRET!
# Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# Look for "service_role" key (NOT the anon key)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe Price IDs (get from: https://dashboard.stripe.com/products)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_starter_here
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_professional_here

# Stripe Webhook Secret (get from: https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**How to get your Supabase Service Role Key:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to find the **"service_role"** key (it's a long string starting with `eyJ...`)
5. **⚠️ WARNING:** This key has admin privileges - never expose it in client-side code or commit it to git!
6. Copy it and add it to your `.env.local` file as `SUPABASE_SERVICE_ROLE_KEY`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Database Schema

The application includes the following main tables:

- **users**: User profiles and authentication data
- **contact_messages**: Contact form submissions
- **truck_shops**: Truck shop information
- **customers**: Customer database
- **trucks**: Vehicle information
- **service_bays**: Service bay management
- **work_orders**: Work order tracking
- **parts**: Inventory management
- **invoices**: Invoice generation and tracking
- **invoice_line_items**: Detailed invoice line items

## Authentication

- Users can sign up with email and password
- Additional profile information (name, company) is stored
- Row Level Security (RLS) ensures data privacy
- Users can only access their own data

## Contact Form

- Integrated with Supabase
- Stores messages in the `contact_messages` table
- Shows success/error feedback to users
- Includes form validation

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## Development

### Project Structure

```
ez2invoice/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── contexts/           # React contexts (Auth)
│   └── lib/                # Utilities and Supabase client
├── database-schema.sql     # Database setup script
└── README.md
```

### Key Components

- **Header**: Navigation with authentication
- **Contact**: Contact form with Supabase integration
- **FAQ**: Interactive accordion
- **AuthForm**: Sign-in/sign-up modal
- **AuthContext**: Authentication state management

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Contact form submissions are public (for lead generation)
- Secure authentication with Supabase Auth

## Support

For questions or issues:
- Email: support@ez2invoice.com
- Phone: +1 (502) 767-3961

## License

© 2024 EZ2Invoice. All rights reserved.