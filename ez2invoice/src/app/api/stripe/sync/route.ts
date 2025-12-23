import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    const accessToken = searchParams.get('access_token');

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

    console.log(`[SyncRoute] Syncing checkout session ${sessionId} for user ${user.id}`);

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

    // Get subscription ID
    const subscriptionId = typeof checkoutSession.subscription === 'string'
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No subscription ID found in checkout session' },
        { status: 400 }
      );
    }

    // Retrieve subscription to get plan details and status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    // Determine plan type from subscription
    let planType = 'starter'; // Default
    const priceId = subscription.items.data[0]?.price.id;
    const price = subscription.items.data[0]?.price;

    if (price?.metadata?.plan_type) {
      planType = price.metadata.plan_type;
    } else if (price?.metadata?.plan) {
      planType = price.metadata.plan;
    } else {
      // Fallback: determine by price amount
      const amount = price?.unit_amount || 0;
      if (amount >= 16000) { // $160/month
        planType = 'professional';
      } else if (amount >= 8000) { // $80/month
        planType = 'starter';
      }
    }

    // Check subscription status - only set plan_type if active or trialing
    const subscriptionStatus = subscription.status;
    const currentPeriodEnd = subscription.current_period_end;
    const now = Math.floor(Date.now() / 1000);

    console.log(`[SyncRoute] Subscription status: ${subscriptionStatus}, period_end: ${currentPeriodEnd}, now: ${now}`);

    // Only update plan_type if subscription is active or trialing
    // If canceled/unpaid/past_due AND period_end < now, set plan_type to null
    let finalPlanType: string | null = null;
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      finalPlanType = planType;
    } else if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
      if (currentPeriodEnd < now) {
        finalPlanType = null; // Subscription has truly ended
      } else {
        // Still within period, grant access
        finalPlanType = planType;
      }
    }

    console.log(`[SyncRoute] Updating user ${user.id} with customer ${customerId} and plan ${finalPlanType}`);

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Update user record with stripe_customer_id and plan_type
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        stripe_customer_id: customerId,
        plan_type: finalPlanType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[SyncRoute] Error updating user record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record', details: updateError.message },
        { status: 500 }
      );
    }

    // Also update truck_shops if it exists for this user
    const { data: shopRecord } = await supabaseAdmin
      .from('truck_shops')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (shopRecord) {
      await supabaseAdmin
        .from('truck_shops')
        .update({
          plan_type: finalPlanType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopRecord.id);
      console.log(`[SyncRoute] Updated shop ${shopRecord.id} with plan ${finalPlanType}`);
    }

    console.log(`[SyncRoute] ✅ Successfully synced subscription for user ${user.id}`);

    return NextResponse.json({
      success: true,
      customerId,
      planType: finalPlanType,
      subscriptionStatus,
      currentPeriodEnd,
    });
  } catch (error: any) {
    console.error('[SyncRoute] Error syncing checkout session:', error);
    return NextResponse.json(
      { error: 'Unable to sync checkout session', details: error.message },
      { status: 500 }
    );
  }
}

