import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { priceId, customerEmail, couponId, discounts, accessToken, userId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    // If accessToken is provided, verify user and get userId
    let supabaseUserId = userId;
    if (accessToken && !supabaseUserId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (!authError && user) {
        supabaseUserId = user.id;
      }
    }

    // Build session configuration
    const sessionConfig: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/pricing`,
      // Enable promotion code entry in checkout UI
      // This allows customers to enter Stripe Promotion Codes (not just Coupons)
      allow_promotion_codes: true,
    };

    // Link Stripe session to Supabase user via client_reference_id and metadata
    // This allows webhook to correctly associate the subscription with the exact user
    // Set both fields for redundancy (client_reference_id is primary, metadata is backup)
    if (supabaseUserId) {
      sessionConfig.client_reference_id = supabaseUserId;
      sessionConfig.metadata = {
        supabase_user_id: supabaseUserId,
      };
      console.log(`[CreateCheckoutSession] ✅ Linking session to Supabase user: ${supabaseUserId} (client_reference_id + metadata)`);
    } else {
      console.warn(`[CreateCheckoutSession] ⚠️ No Supabase user ID provided - webhook will need to use email lookup`);
    }

    // Add discounts if provided (for auto-apply discounts)
    // discounts should be an array like: [{ coupon: 'COUPON_ID' }]
    if (discounts && Array.isArray(discounts) && discounts.length > 0) {
      sessionConfig.discounts = discounts;
    } else if (couponId) {
      // Support legacy couponId parameter for backward compatibility
      sessionConfig.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Unable to create checkout session' },
      { status: 500 }
    );
  }
}


