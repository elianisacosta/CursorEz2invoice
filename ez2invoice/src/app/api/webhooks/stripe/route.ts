import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use SERVICE_ROLE key to bypass RLS for webhook operations
// This is REQUIRED - webhooks need to bypass RLS to update user records
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Webhook] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set! Webhook updates will fail if RLS is enabled.');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for webhook operations');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('[Webhook] ✅ Using SERVICE_ROLE_KEY for webhook operations (RLS bypass enabled)');

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
  // Return 200 quickly to Stripe, then process asynchronously if needed
  const startTime = Date.now();
  try {
    console.log(`[Webhook] Received webhook event: ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('[Webhook] Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process subscription checkouts
        if (session.mode !== 'subscription') {
          console.log('[Webhook] Skipping non-subscription checkout session');
          return NextResponse.json({ received: true });
        }

        // Get customer ID
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        if (!customerId) {
          console.error('[Webhook] No customer ID in checkout session');
          return NextResponse.json(
            { error: 'No customer ID found' },
            { status: 400 }
          );
        }

        // Get customer email from session (for fallback only)
        const customerEmail = session.customer_email || 
          (typeof session.customer_details === 'object' && session.customer_details?.email
            ? session.customer_details.email
            : null);

        // Get subscription ID
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (!subscriptionId) {
          console.error('[Webhook] No subscription ID in checkout session');
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

        console.log(`[Webhook] Processing checkout completion for customer ${customerId}, plan: ${planType}`);

        // Read Supabase user ID from event.data.object.client_reference_id or metadata.supabase_user_id
        // These are set during checkout session creation
        let supabaseUserId: string | null = null;
        if (event.data.object.client_reference_id) {
          supabaseUserId = event.data.object.client_reference_id;
          console.log(`[Webhook] Found Supabase user ID from event.data.object.client_reference_id: ${supabaseUserId}`);
        } else if (event.data.object.metadata?.supabase_user_id) {
          supabaseUserId = event.data.object.metadata.supabase_user_id;
          console.log(`[Webhook] Found Supabase user ID from event.data.object.metadata.supabase_user_id: ${supabaseUserId}`);
        }

        if (!supabaseUserId) {
          console.error(`[Webhook] ❌ No Supabase user ID found in checkout session (client_reference_id or metadata.supabase_user_id). Customer: ${customerId}, Email: ${customerEmail}`);
          // Fall back to email lookup only if user_id is not available
          if (!customerEmail) {
            return NextResponse.json(
              { error: 'No user identifier found (no client_reference_id, metadata, or email)' },
              { status: 400 }
            );
          }
          console.log(`[Webhook] ⚠️ Falling back to email lookup: ${customerEmail}`);
        }

        // Find user by exact Supabase user ID (preferred method)
        let userRecord: { id: string } | null = null;
        if (supabaseUserId) {
          const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', supabaseUserId)
            .maybeSingle();
          
          if (error) {
            console.error(`[Webhook] ❌ Error finding user by ID ${supabaseUserId}:`, error);
            return NextResponse.json(
              { error: 'Failed to find user by ID', details: error.message },
              { status: 500 }
            );
          } else if (data) {
            userRecord = data;
            console.log(`[Webhook] ✅ Found user by exact Supabase user ID: ${supabaseUserId}`);
          } else {
            console.error(`[Webhook] ❌ User not found for Supabase user ID: ${supabaseUserId}`);
            return NextResponse.json(
              { error: `User not found for ID: ${supabaseUserId}` },
              { status: 404 }
            );
          }
        } else {
          // Fall back to email lookup only if user_id was not provided
          console.log(`[Webhook] ⚠️ No Supabase user ID available, using email lookup: ${customerEmail}`);
          const { data, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', customerEmail)
            .maybeSingle();

          if (userError) {
            console.error('[Webhook] ❌ Error finding user by email:', userError);
            return NextResponse.json(
              { error: 'Failed to find user by email', details: userError.message },
              { status: 500 }
            );
          }

          if (!data) {
            console.error(`[Webhook] ❌ User not found for email: ${customerEmail}`);
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
          }
          
          userRecord = data;
          console.log(`[Webhook] ⚠️ Found user by email fallback: ${userRecord.id}`);
        }

        // Update user record with stripe_customer_id and plan_type
        // Use service role key to bypass RLS
        const { error: updateError } = await supabase
          .from('users')
          .update({
            stripe_customer_id: customerId,
            plan_type: planType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRecord.id);
        
        console.log(`[Webhook] Updating user ${userRecord.id}:`, {
          stripe_customer_id: customerId,
          plan_type: planType,
          updateError: updateError?.message,
        });

        if (updateError) {
          console.error(`[Webhook] ❌ Error updating user ${userRecord.id}:`, {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            userId: userRecord.id,
            customerId,
            planType,
          });
          return NextResponse.json(
            { error: 'Failed to update user record', details: updateError.message },
            { status: 500 }
          );
        }
        
        console.log(`[Webhook] ✅ Successfully updated user ${userRecord.id} with customer ${customerId} and plan ${planType}`);

        // Also update truck_shops if it exists for this user
        const { data: shopRecord, error: shopSelectError } = await supabase
          .from('truck_shops')
          .select('id')
          .eq('user_id', userRecord.id)
          .maybeSingle();

        if (shopSelectError) {
          console.error(`[Webhook] Error selecting shop for user ${userRecord.id}:`, shopSelectError);
        }

        if (shopRecord) {
          const { error: shopUpdateError } = await supabase
            .from('truck_shops')
            .update({
              plan_type: planType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', shopRecord.id);
          
          if (shopUpdateError) {
            console.error(`[Webhook] Error updating shop ${shopRecord.id}:`, {
              error: shopUpdateError.message,
              code: shopUpdateError.code,
              details: shopUpdateError.details,
              hint: shopUpdateError.hint,
            });
          } else {
            console.log(`[Webhook] ✅ Successfully updated shop ${shopRecord.id} with plan ${planType}`);
          }
        }

        console.log(`[Webhook] ✅ Successfully updated user ${userRecord.id} with customer ID ${customerId} and plan ${planType}`);
        break;
          }

      case 'customer.subscription.created':
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
        
        // Handle subscription creation and updates the same way
        if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
          // Subscription created or updated - check status and update plan type accordingly
          const subscriptionStatus = subscription.status;
          const cancelAtPeriodEnd = subscription.cancel_at_period_end;
          
          const eventTypeLabel = event.type === 'customer.subscription.created' ? 'created' : 'updated';
          console.log(`Subscription ${eventTypeLabel} for customer ${customerId}: status=${subscriptionStatus}, cancel_at_period_end=${cancelAtPeriodEnd}`);
          
          // If subscription is actually canceled, past_due, or unpaid, block access
          if (subscriptionStatus === 'canceled' || 
              subscriptionStatus === 'past_due' || 
              subscriptionStatus === 'unpaid' ||
              subscriptionStatus === 'incomplete_expired') {
            console.log(`[Webhook] Subscription ${subscriptionStatus} for customer ${customerId}, blocking access`);
            
            const { error: userUpdateError } = await supabase
              .from('users')
              .update({
                plan_type: null, // Block access
                updated_at: new Date().toISOString(),
              })
              .eq('id', userRecord.id);

            if (userUpdateError) {
              console.error(`[Webhook] ❌ Error updating user ${userRecord.id} (blocking access):`, {
                error: userUpdateError.message,
                code: userUpdateError.code,
                details: userUpdateError.details,
                hint: userUpdateError.hint,
              });
            } else {
              console.log(`[Webhook] ✅ Blocked access for user ${userRecord.id} (subscription ${subscriptionStatus})`);
            }

            // Update shop plan type too
            const { data: shopRecord, error: shopSelectError } = await supabase
              .from('truck_shops')
              .select('id')
              .eq('user_id', userRecord.id)
              .maybeSingle();

            if (shopSelectError) {
              console.error(`[Webhook] Error selecting shop for user ${userRecord.id}:`, shopSelectError);
            }

            if (shopRecord) {
              const { error: shopUpdateError } = await supabase
                .from('truck_shops')
                .update({
                  plan_type: null, // Block access
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shopRecord.id);
              
              if (shopUpdateError) {
                console.error(`[Webhook] ❌ Error updating shop ${shopRecord.id} (blocking access):`, {
                  error: shopUpdateError.message,
                  code: shopUpdateError.code,
                  details: shopUpdateError.details,
                });
              }
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

            console.log(`[Webhook] Subscription active for customer ${customerId}, updating to ${planType} plan${cancelAtPeriodEnd ? ' (cancels at period end)' : ''}`);

            const { error: userUpdateError } = await supabase
              .from('users')
              .update({
                plan_type: planType,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userRecord.id);

            if (userUpdateError) {
              console.error(`[Webhook] ❌ Error updating user ${userRecord.id} (setting plan ${planType}):`, {
                error: userUpdateError.message,
                code: userUpdateError.code,
                details: userUpdateError.details,
                hint: userUpdateError.hint,
                userId: userRecord.id,
                customerId,
                planType,
              });
            } else {
              console.log(`[Webhook] ✅ Updated user ${userRecord.id} to plan ${planType}`);
            }

            // Update shop plan type too
            const { data: shopRecord, error: shopSelectError } = await supabase
              .from('truck_shops')
              .select('id')
              .eq('user_id', userRecord.id)
              .maybeSingle();

            if (shopSelectError) {
              console.error(`[Webhook] Error selecting shop for user ${userRecord.id}:`, shopSelectError);
            }

            if (shopRecord) {
              const { error: shopUpdateError } = await supabase
                .from('truck_shops')
                .update({
                  plan_type: planType,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shopRecord.id);
              
              if (shopUpdateError) {
                console.error(`[Webhook] ❌ Error updating shop ${shopRecord.id} (setting plan ${planType}):`, {
                  error: shopUpdateError.message,
                  code: shopUpdateError.code,
                  details: shopUpdateError.details,
                });
              } else {
                console.log(`[Webhook] ✅ Updated shop ${shopRecord.id} to plan ${planType}`);
              }
            }
          }
        } else if (event.type === 'customer.subscription.deleted') {
          // Subscription cancelled and period ended - block access completely
          // Set plan_type to null to indicate no active subscription
          console.log(`[Webhook] ❌ Subscription deleted for customer ${customerId}, blocking access`);
          
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({
              plan_type: null, // null = no active subscription, access blocked
              updated_at: new Date().toISOString(),
            })
            .eq('id', userRecord.id);

          if (userUpdateError) {
            console.error(`[Webhook] ❌ Error updating user ${userRecord.id} (deleting subscription):`, {
              error: userUpdateError.message,
              code: userUpdateError.code,
              details: userUpdateError.details,
              hint: userUpdateError.hint,
              userId: userRecord.id,
              customerId,
            });
          } else {
            console.log(`[Webhook] ✅ Blocked access for user ${userRecord.id} (subscription deleted)`);
          }

          // Update shop plan type too
          const { data: shopRecord, error: shopSelectError } = await supabase
            .from('truck_shops')
            .select('id')
            .eq('user_id', userRecord.id)
            .maybeSingle();

          if (shopSelectError) {
            console.error(`[Webhook] Error selecting shop for user ${userRecord.id}:`, shopSelectError);
          }

          if (shopRecord) {
            const { error: shopUpdateError } = await supabase
              .from('truck_shops')
              .update({
                plan_type: null, // Block access
                updated_at: new Date().toISOString(),
              })
              .eq('id', shopRecord.id);
            
            if (shopUpdateError) {
              console.error(`[Webhook] ❌ Error updating shop ${shopRecord.id} (deleting subscription):`, {
                error: shopUpdateError.message,
                code: shopUpdateError.code,
                details: shopUpdateError.details,
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Webhook] ✅ Successfully processed webhook event: ${event.type} (took ${processingTime}ms)`);
    
    // Return 200 quickly to Stripe (Stripe expects response within 30 seconds)
    return NextResponse.json({ received: true });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[Webhook] ❌ Error processing webhook event ${event.type} (took ${processingTime}ms):`, {
      error: error.message,
      stack: error.stack,
      eventType: event.type,
    });
    
    // Still return 200 to prevent Stripe from retrying (we'll handle errors internally)
    // Only return error status for critical issues
    if (error.message?.includes('SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Webhook configuration error', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ received: true, error: 'Processing failed but acknowledged' });
  }
}

// Disable body parsing for webhooks (we need raw body for signature verification)
export const runtime = 'nodejs';

