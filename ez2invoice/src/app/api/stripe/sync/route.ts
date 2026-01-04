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

    // Check subscription status
    const subscriptionStatus = subscription.status;
    const currentPeriodEnd = subscription.current_period_end;
    const now = Math.floor(Date.now() / 1000);

    console.log(`[SyncRoute] Subscription status: ${subscriptionStatus}, period_end: ${currentPeriodEnd}, now: ${now}`);

    // Determine final plan type based on subscription status
    // For successful payments, status should be 'active' or 'trialing'
    let finalPlanType: string | null = planType; // Default to the determined plan type
    
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      // Active subscription - use the determined plan type
      finalPlanType = planType;
      
    } else if (subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired') {
      // Payment failed or incomplete - don't grant access
      finalPlanType = null;
      console.warn(`[SyncRoute] ⚠️ Subscription status is ${subscriptionStatus} - not granting access`);
      
    } else if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
      // Check if subscription period has ended
      if (currentPeriodEnd < now) {
        finalPlanType = null; // Subscription has truly ended
        console.log(`[SyncRoute] Subscription ${subscriptionStatus} and period ended - blocking access`);
      } else {
        // Still within period, grant access
        finalPlanType = planType;
        console.log(`[SyncRoute] Subscription ${subscriptionStatus} but period not ended - granting access`);
      }
      
    } else {
      // Unknown status - log warning but still try to set plan type
      console.warn(`[SyncRoute] ⚠️ Unknown subscription status: ${subscriptionStatus} - setting plan type anyway`);
      finalPlanType = planType;
    }

    console.log(`[SyncRoute] Updating user ${user.id} with customer ${customerId} and plan ${finalPlanType}`);

    // CRITICAL: Use service role key to bypass RLS - required for updates
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[SyncRoute] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set! Updates will fail with RLS enabled.');
      
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // IMPORTANT: Always update stripe_customer_id regardless of subscription status
    // The plan_type depends on subscription status, but customer_id should always be saved
    const updateData: {
      stripe_customer_id: string;
      plan_type: string | null;
      updated_at: string;
    } = {
      stripe_customer_id: customerId,
      plan_type: finalPlanType,
      updated_at: new Date().toISOString(),
    };

    console.log(`[SyncRoute] Update data:`, {
      userId: user.id,
      stripe_customer_id: customerId,
      plan_type: finalPlanType,
      subscriptionStatus,
    });

    // First, check if user record exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, company')
      .eq('id', user.id)
      .maybeSingle();

    let updateData_result;
    let updateError;

    if (existingUser) {
      // User record exists, update it
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select();
      updateData_result = data;
      updateError = error;
    } else {
      // User record doesn't exist, create it with all necessary fields
      console.log(`[SyncRoute] User record doesn't exist, creating it for user ${user.id}`);
      const insertData = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        company: user.user_metadata?.company || null,
        ...updateData,
      };
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(insertData)
        .select();
      updateData_result = data;
      updateError = error;
    }

    if (updateError) {
      console.error('[SyncRoute] ❌ Error updating user record:', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        userId: user.id,
        customerId,
        planType: finalPlanType,
      });
      
      return NextResponse.json(
        { error: 'Failed to update user record', details: updateError.message },
        { status: 500 }
      );
    }

    // Verify the update actually worked by reading back the data
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, plan_type')
      .eq('id', user.id)
      .maybeSingle();

    if (verifyError) {
      console.error('[SyncRoute] ⚠️ Error verifying update:', verifyError);
    } else {
      console.log(`[SyncRoute] ✅ Verified update - User ${user.id}:`, {
        stripe_customer_id: verifyData?.stripe_customer_id,
        plan_type: verifyData?.plan_type,
      });

      // Double-check the update was successful
      if (verifyData?.stripe_customer_id !== customerId) {
        console.error(`[SyncRoute] ❌ VERIFICATION FAILED: stripe_customer_id mismatch! Expected: ${customerId}, Got: ${verifyData?.stripe_customer_id}`);
        
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

