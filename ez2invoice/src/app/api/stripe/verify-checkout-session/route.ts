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

    console.log(`[VerifyCheckoutSession] Updating user ${user.id} with customer ${customerId} and plan ${planType}`);

    // CRITICAL: Use service role key to bypass RLS - required for updates
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[VerifyCheckoutSession] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set! Updates will fail with RLS enabled.');
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user record with stripe_customer_id and plan_type
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        stripe_customer_id: customerId,
        plan_type: planType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('stripe_customer_id, plan_type');

    if (updateError) {
      console.error('[VerifyCheckoutSession] ❌ Error updating user record:', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        userId: user.id,
        customerId,
        planType,
      });
      return NextResponse.json(
        { error: 'Failed to update user record', details: updateError.message },
        { status: 500 }
      );
    }

    // Verify the update actually worked
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, plan_type')
      .eq('id', user.id)
      .maybeSingle();

    if (verifyError) {
      console.error('[VerifyCheckoutSession] ⚠️ Error verifying update:', verifyError);
    } else {
      console.log(`[VerifyCheckoutSession] ✅ Verified update - User ${user.id}:`, {
        stripe_customer_id: verifyData?.stripe_customer_id,
        plan_type: verifyData?.plan_type,
      });

      // Double-check the update was successful
      if (verifyData?.stripe_customer_id !== customerId) {
        console.error(`[VerifyCheckoutSession] ❌ VERIFICATION FAILED: stripe_customer_id mismatch! Expected: ${customerId}, Got: ${verifyData?.stripe_customer_id}`);
        return NextResponse.json(
          { error: 'Update verification failed: stripe_customer_id not saved correctly' },
          { status: 500 }
        );
      }
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
          plan_type: planType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopRecord.id);
      console.log(`[VerifyCheckoutSession] Updated shop ${shopRecord.id} with plan ${planType}`);
    }

    console.log(`[VerifyCheckoutSession] ✅ Successfully updated user ${user.id} with plan ${planType}`);

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

