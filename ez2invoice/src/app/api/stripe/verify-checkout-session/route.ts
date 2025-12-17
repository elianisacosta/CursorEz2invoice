import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, accessToken } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

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

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!checkoutSession || checkoutSession.mode !== 'subscription') {
      return NextResponse.json(
        { error: 'Invalid checkout session' },
        { status: 400 }
      );
    }

    // Get customer ID from the session
    const customerId = typeof checkoutSession.customer === 'string' 
      ? checkoutSession.customer 
      : checkoutSession.customer?.id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer ID found in checkout session' },
        { status: 400 }
      );
    }

    // Get subscription to determine plan type
    const subscriptionId = typeof checkoutSession.subscription === 'string'
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

    let planType = 'starter'; // Default
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });
      
      // Map price IDs to plan types (you'll need to update these with your actual Stripe price IDs)
      const priceId = subscription.items.data[0]?.price.id;
      
      // Determine plan type based on price ID or product metadata
      // You can also check the product metadata or price amount
      if (priceId) {
        // Check if price contains plan type in metadata or use amount
        const price = subscription.items.data[0]?.price;
        if (price?.metadata?.plan_type) {
          planType = price.metadata.plan_type;
        } else {
          // Fallback: determine by price amount
          const amount = price?.unit_amount || 0;
          if (amount >= 16000) { // $160/month
            planType = 'professional';
          } else if (amount >= 8000) { // $80/month
            planType = 'starter';
          }
        }
      }
    }

    // Update user record with stripe_customer_id and plan_type
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        plan_type: planType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId,
      planType,
    });
  } catch (error: any) {
    console.error('Error verifying checkout session:', error);
    return NextResponse.json(
      { error: 'Unable to verify checkout session', details: error.message },
      { status: 500 }
    );
  }
}

