import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { priceId, customerEmail, couponId, discounts } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
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


