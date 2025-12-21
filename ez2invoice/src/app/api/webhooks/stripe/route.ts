import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get webhook secret from environment variable
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    console.log(`Received webhook event: ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process subscription checkouts
        if (session.mode !== 'subscription') {
          console.log('Skipping non-subscription checkout session');
          return NextResponse.json({ received: true });
        }

        // Get customer ID
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        if (!customerId) {
          console.error('No customer ID in checkout session');
          return NextResponse.json(
            { error: 'No customer ID found' },
            { status: 400 }
          );
        }

        // Get customer email from session
        const customerEmail = session.customer_email || 
          (typeof session.customer_details === 'object' && session.customer_details?.email
            ? session.customer_details.email
            : null);

        if (!customerEmail) {
          console.error('No customer email in checkout session');
          return NextResponse.json(
            { error: 'No customer email found' },
            { status: 400 }
          );
        }

        // Get subscription ID
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (!subscriptionId) {
          console.error('No subscription ID in checkout session');
          return NextResponse.json(
            { error: 'No subscription ID found' },
            { status: 400 }
          );
        }

        // Retrieve subscription to get plan details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price.product'],
        });

        // Determine plan type from subscription
        let planType = 'starter'; // Default
        const priceId = subscription.items.data[0]?.price.id;
        const price = subscription.items.data[0]?.price;

        if (price?.metadata?.plan_type) {
          // Use metadata if available
          planType = price.metadata.plan_type;
        } else if (price?.metadata?.plan) {
          planType = price.metadata.plan;
        } else {
          // Fallback: determine by price amount
          const amount = price?.unit_amount || 0;
          if (amount >= 16000) { // $160/month or more
            planType = 'professional';
          } else if (amount >= 8000) { // $80/month or more
            planType = 'starter';
          }
        }

        console.log(`Processing checkout completion for customer ${customerId}, plan: ${planType}`);

        // Find user by email in Supabase
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();

        if (userError) {
          console.error('Error finding user:', userError);
          return NextResponse.json(
            { error: 'Failed to find user' },
            { status: 500 }
          );
        }

        if (!userRecord) {
          console.error(`User not found for email: ${customerEmail}`);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Update user record with stripe_customer_id and plan_type
        const { error: updateError } = await supabase
          .from('users')
          .update({
            stripe_customer_id: customerId,
            plan_type: planType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRecord.id);

        if (updateError) {
          console.error('Error updating user record:', updateError);
          return NextResponse.json(
            { error: 'Failed to update user record' },
            { status: 500 }
          );
        }

        // Also update truck_shops if it exists for this user
        const { data: shopRecord } = await supabase
          .from('truck_shops')
          .select('id')
          .eq('user_id', userRecord.id)
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

            console.log(`✅ Successfully updated user ${userRecord.id} with customer ID ${customerId} and plan ${planType}`);
            break;
          }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) {
          console.error('No customer ID in subscription event');
          return NextResponse.json({ received: true });
        }

        // Find user by stripe_customer_id
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (!userRecord) {
          console.log(`User not found for customer ID: ${customerId}`);
          return NextResponse.json({ received: true });
        }

        console.log(`Processing ${event.type} event for customer ${customerId}`);
        
        if (event.type === 'customer.subscription.deleted') {
          // Subscription cancelled and period ended - block access completely
          // Set plan_type to null to indicate no active subscription
          console.log(`❌ Subscription deleted for customer ${customerId}, blocking access`);
          
          await supabase
            .from('users')
            .update({
              plan_type: null, // null = no active subscription, access blocked
              updated_at: new Date().toISOString(),
            })
            .eq('id', userRecord.id);

          // Update shop plan type too
          const { data: shopRecord } = await supabase
            .from('truck_shops')
            .select('id')
            .eq('user_id', userRecord.id)
            .maybeSingle();

          if (shopRecord) {
            await supabase
              .from('truck_shops')
              .update({
                plan_type: null, // Block access
                updated_at: new Date().toISOString(),
              })
              .eq('id', shopRecord.id);
          }
        } else {
          // Subscription updated - check status and update plan type accordingly
          const subscriptionStatus = subscription.status;
          const cancelAtPeriodEnd = subscription.cancel_at_period_end;
          
          console.log(`Subscription updated for customer ${customerId}: status=${subscriptionStatus}, cancel_at_period_end=${cancelAtPeriodEnd}`);
          
          // If subscription is actually canceled, past_due, or unpaid, block access
          if (subscriptionStatus === 'canceled' || 
              subscriptionStatus === 'past_due' || 
              subscriptionStatus === 'unpaid' ||
              subscriptionStatus === 'incomplete_expired') {
            console.log(`Subscription ${subscriptionStatus} for customer ${customerId}, blocking access`);
            
            await supabase
              .from('users')
              .update({
                plan_type: null, // Block access
                updated_at: new Date().toISOString(),
              })
              .eq('id', userRecord.id);

            // Update shop plan type too
            const { data: shopRecord } = await supabase
              .from('truck_shops')
              .select('id')
              .eq('user_id', userRecord.id)
              .maybeSingle();

            if (shopRecord) {
              await supabase
                .from('truck_shops')
                .update({
                  plan_type: null, // Block access
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shopRecord.id);
            }
          } else if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
            // Subscription is active - update plan type based on current subscription
            // Note: If cancel_at_period_end is true, subscription is still active until period ends
            const priceId = subscription.items.data[0]?.price.id;
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

            console.log(`Subscription active for customer ${customerId}, updating to ${planType} plan${cancelAtPeriodEnd ? ' (cancels at period end)' : ''}`);

            await supabase
              .from('users')
              .update({
                plan_type: planType,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userRecord.id);

            // Update shop plan type too
            const { data: shopRecord } = await supabase
              .from('truck_shops')
              .select('id')
              .eq('user_id', userRecord.id)
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
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Successfully processed webhook event: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhooks (we need raw body for signature verification)
export const runtime = 'nodejs';

