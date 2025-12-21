import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Get the access token from the request body
    const body = await req.json();
    const accessToken = body.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token provided' },
        { status: 401 }
      );
    }

    // Create Supabase client and verify the user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Check if user is a founder
    const founderEmails = ['acostaelianis@yahoo.com', 'founder@ez2invoice.com', 'admin@ez2invoice.com'];
    const isFounder = user.email ? founderEmails.includes(user.email.toLowerCase()) : false;

    // Get the user's stripe_customer_id from the users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user record:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    let stripeCustomerId = userRecord?.stripe_customer_id;

    // If user doesn't have a stripe_customer_id, try to find or create one
    if (!stripeCustomerId) {
      const userEmail = user.email || userRecord?.email;
      
      if (!userEmail) {
        return NextResponse.json(
          { error: 'No email found. Please contact support.' },
          { status: 400 }
        );
      }

      try {
        // Search for existing Stripe customer by email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        });

        if (customers.data.length > 0) {
          // Found existing customer
          stripeCustomerId = customers.data[0].id;
          
          // Update user record with the found customer ID
          await supabase
            .from('users')
            .update({
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        } else {
          // No existing customer found
          // If user is a founder, create a Stripe customer for them so they can access billing portal
          if (isFounder) {
            try {
              // Create a Stripe customer for the founder
              const newCustomer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                  user_id: user.id,
                  is_founder: 'true',
                },
              });
              
              stripeCustomerId = newCustomer.id;
              
              // Update user record with the new customer ID
              await supabase
                .from('users')
                .update({
                  stripe_customer_id: stripeCustomerId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            } catch (createError: any) {
              console.error('Error creating Stripe customer for founder:', createError);
              return NextResponse.json(
                { error: 'Unable to set up billing account. Please contact support.' },
                { status: 500 }
              );
            }
          } else {
            // No existing customer found - user hasn't subscribed yet
            return NextResponse.json(
              { error: 'No active subscription found. Please subscribe to a plan first.' },
              { status: 400 }
            );
          }
        }
      } catch (stripeError: any) {
        console.error('Error searching for Stripe customer:', stripeError);
        return NextResponse.json(
          { error: 'Unable to access billing information. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // Create Stripe billing portal session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/dashboard?tab=settings&subtab=billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Unable to create billing portal session', details: error.message },
      { status: 500 }
    );
  }
}

