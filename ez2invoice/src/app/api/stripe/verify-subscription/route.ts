import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token provided' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Get user's stripe_customer_id from database
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, plan_type')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user record:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    if (!userRecord?.stripe_customer_id) {
      // No Stripe customer ID in database - try to find customer by email
      // This handles cases where user just paid but stripe_customer_id wasn't saved yet
      try {
        // #region agent log
        console.log('No stripe_customer_id in database, searching Stripe by email:', user.email);
        // #endregion
        
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          const customer = customers.data[0];
          // #region agent log
          console.log('Found Stripe customer by email:', customer.id);
          // #endregion
          
          // Update database with stripe_customer_id
          await supabase
            .from('users')
            .update({
              stripe_customer_id: customer.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          
          // Now check subscriptions for this customer - update userRecord
          // Handle case where userRecord might be null
          userRecord = { 
            ...(userRecord || {}), 
            stripe_customer_id: customer.id,
            plan_type: userRecord?.plan_type || null
          };
        } else {
          // #region agent log
          console.log('No Stripe customer found by email');
          // #endregion
          // No Stripe customer found by email either
          return NextResponse.json({
            hasActiveSubscription: false,
            planType: null,
          });
        }
      } catch (emailSearchError: any) {
        console.error('Error searching Stripe by email:', emailSearchError);
        // If email search fails, return no subscription
        return NextResponse.json({
          hasActiveSubscription: false,
          planType: null,
        });
      }
    }

    // Ensure userRecord exists and has stripe_customer_id
    if (!userRecord || !userRecord.stripe_customer_id) {
      return NextResponse.json({
        hasActiveSubscription: false,
        planType: null,
      });
    }

    // Check subscription status directly from Stripe
    try {
      // #region agent log
      console.log('Checking Stripe subscriptions for customer:', userRecord.stripe_customer_id);
      // #endregion
      
      const subscriptions = await stripe.subscriptions.list({
        customer: userRecord.stripe_customer_id,
        status: 'all',
        limit: 10, // Increase limit to catch all subscriptions
      });

      // #region agent log
      console.log('Stripe subscriptions found:', subscriptions.data.length, 'for customer:', userRecord.stripe_customer_id);
      subscriptions.data.forEach((sub, idx) => {
        console.log(`Subscription ${idx}:`, {
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          cancel_at: sub.cancel_at,
          items: sub.items.data.map(item => ({
            price_id: item.price.id,
            amount: item.price.unit_amount,
            metadata: item.price.metadata
          }))
        });
      });
      // #endregion

      if (subscriptions.data.length === 0) {
        // No subscriptions found in Stripe
        // Update database to reflect this
        await supabase
          .from('users')
          .update({
            plan_type: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        return NextResponse.json({
          hasActiveSubscription: false,
          planType: null,
        });
      }

      // Find the first active subscription (not just the first one)
      // A subscription can be 'active', 'trialing', or 'past_due' (still has access)
      // Also check for subscriptions that are scheduled to cancel but still active
      const activeSubscription = subscriptions.data.find(
        sub => {
          const isActive = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
          const isScheduledCancel = sub.status === 'active' && sub.cancel_at_period_end === true;
          // #region agent log
          console.log('Checking subscription:', {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end,
            isActive,
            isScheduledCancel,
            matches: isActive || isScheduledCancel
          });
          // #endregion
          return isActive || isScheduledCancel;
        }
      );

      if (!activeSubscription) {
        // No active subscription found - check if any are scheduled to cancel
        const scheduledCancel = subscriptions.data.find(
          sub => sub.status === 'active' && sub.cancel_at_period_end === true
        );
        
        if (scheduledCancel) {
          // Subscription is active but scheduled to cancel - still grant access until period ends
          const subscription = scheduledCancel;
          const subscriptionStatus = subscription.status;
          
          // #region agent log
          console.log('Found subscription scheduled to cancel but still active:', {
            id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.current_period_end,
          });
          // #endregion
          
          // Continue to process this subscription as active
          const price = subscription.items.data[0]?.price;
          let planType = 'starter';

          if (price?.metadata?.plan_type) {
            planType = price.metadata.plan_type;
          } else if (price?.metadata?.plan) {
            planType = price.metadata.plan;
          } else {
            const amount = price?.unit_amount || 0;
            if (amount >= 16000) {
              planType = 'professional';
            } else if (amount >= 8000) {
              planType = 'starter';
            }
          }

          // Update database if it's out of sync
          if (userRecord.plan_type !== planType) {
            await supabase
              .from('users')
              .update({
                plan_type: planType,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);

            // Also update shop
            const { data: shopRecord } = await supabase
              .from('truck_shops')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (shopRecord) {
              await supabase
                .from('truck_shops')
                .update({
                  plan_type: planType,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shopRecord.id);
            }
          }

          return NextResponse.json({
            hasActiveSubscription: true,
            planType,
          });
        }
        
        // No active subscriptions found
        // Update database to reflect this
        await supabase
          .from('users')
          .update({
            plan_type: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Also update shop
        const { data: shopRecord } = await supabase
          .from('truck_shops')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (shopRecord) {
          await supabase
            .from('truck_shops')
            .update({
              plan_type: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', shopRecord.id);
        }

        return NextResponse.json({
          hasActiveSubscription: false,
          planType: null,
        });
      }

      const subscription = activeSubscription;
      const subscriptionStatus = subscription.status;

      // #region agent log
      console.log('Found active subscription:', {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
        price_id: subscription.items.data[0]?.price.id,
        amount: subscription.items.data[0]?.price.unit_amount,
      });
      // #endregion

      // Check if subscription is actually active
      // Include 'past_due' as still having access (user can still use service)
      if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due') {
        // Determine plan type from subscription
        const price = subscription.items.data[0]?.price;
        let planType = 'starter';

        if (price?.metadata?.plan_type) {
          planType = price.metadata.plan_type;
        } else if (price?.metadata?.plan) {
          planType = price.metadata.plan;
        } else {
          const amount = price?.unit_amount || 0;
          if (amount >= 16000) {
            planType = 'professional';
          } else if (amount >= 8000) {
            planType = 'starter';
          }
        }

        // Update database if it's out of sync
        if (userRecord.plan_type !== planType) {
          await supabase
            .from('users')
            .update({
              plan_type: planType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          // Also update shop
          const { data: shopRecord } = await supabase
            .from('truck_shops')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (shopRecord) {
            await supabase
              .from('truck_shops')
              .update({
                plan_type: planType,
                updated_at: new Date().toISOString(),
              })
              .eq('id', shopRecord.id);
          }
        }

        return NextResponse.json({
          hasActiveSubscription: true,
          planType,
        });
      } else {
        // Subscription is canceled, past_due, etc. - no active subscription
        // Update database to reflect this
        await supabase
          .from('users')
          .update({
            plan_type: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Also update shop
        const { data: shopRecord } = await supabase
          .from('truck_shops')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (shopRecord) {
          await supabase
            .from('truck_shops')
            .update({
              plan_type: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', shopRecord.id);
        }

        return NextResponse.json({
          hasActiveSubscription: false,
          planType: null,
        });
      }
    } catch (stripeError: any) {
      console.error('Error checking Stripe subscription:', stripeError);
      // If Stripe check fails, trust the database
      return NextResponse.json({
        hasActiveSubscription: userRecord?.plan_type !== null && userRecord?.plan_type !== undefined,
        planType: userRecord?.plan_type || null,
      });
    }
  } catch (error: any) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: 'Unable to verify subscription', details: error.message },
      { status: 500 }
    );
  }
}

