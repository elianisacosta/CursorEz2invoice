'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/useToast';

type SubscriptionAccessCheckProps = {
  isVerifyingCheckout: boolean;
  userPlanType: string | null;
  onPlanTypeChange: (planType: string) => void;
};

export default function SubscriptionAccessCheck({
  isVerifyingCheckout,
  userPlanType,
  onPlanTypeChange,
}: SubscriptionAccessCheckProps) {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const subscriptionPollStartRef = useRef<number | null>(null);
  const subscriptionSetupToastShownRef = useRef(false);
  const onPlanTypeChangeRef = useRef(onPlanTypeChange);
  onPlanTypeChangeRef.current = onPlanTypeChange;

  useEffect(() => {
    const checkSubscriptionAccess = async () => {
      if (isVerifyingCheckout) {
        console.log('[Dashboard] Skipping subscription check - verifying checkout');
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          return;
        }

        const userId = userData.user.id;
        const userEmail = userData.user.email?.toLowerCase() || '';

        const founderEmails = ['acostaelianis@yahoo.com', 'founder@ez2invoice.com', 'admin@ez2invoice.com'];
        if (founderEmails.includes(userEmail)) {
          console.log('[Dashboard] Founder access - skipping subscription check');
          return;
        }

        let recentCheckoutTimestamp =
          typeof window !== 'undefined' ? localStorage.getItem('recent_checkout_timestamp') : null;

        const gracePeriodMs = 30 * 1000;
        if (recentCheckoutTimestamp) {
          const checkoutAge = Date.now() - parseInt(recentCheckoutTimestamp, 10);
          if (checkoutAge >= gracePeriodMs) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('recent_checkout_timestamp');
            }
            recentCheckoutTimestamp = null;
            subscriptionPollStartRef.current = null;
            subscriptionSetupToastShownRef.current = false;
          }
        }
        const isWithinGracePeriod = recentCheckoutTimestamp
          ? Date.now() - parseInt(recentCheckoutTimestamp, 10) < gracePeriodMs
          : false;

        const { data: userRecord } = await supabase
          .from('users')
          .select('plan_type, stripe_customer_id, updated_at')
          .eq('id', userId)
          .maybeSingle();

        const hasStripeCustomerId = !!userRecord?.stripe_customer_id;
        const planType = userRecord?.plan_type;
        const hasActivePlan = planType !== null && planType !== undefined;

        if (hasActivePlan) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token && hasStripeCustomerId) {
              const verifyResponse = await fetch('/api/stripe/verify-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: session.access_token }),
              });

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();

                if (
                  verifyData.hasActiveSubscription &&
                  (verifyData.subscriptionStatus === 'active' || verifyData.subscriptionStatus === 'trialing')
                ) {
                  if (verifyData.planType !== planType) {
                    onPlanTypeChangeRef.current(verifyData.planType);
                  }
                  if (typeof window !== 'undefined' && recentCheckoutTimestamp) {
                    localStorage.removeItem('recent_checkout_timestamp');
                  }
                  return;
                }

                if (
                  verifyData.subscriptionStatus === 'canceled' ||
                  verifyData.subscriptionStatus === 'unpaid' ||
                  verifyData.subscriptionStatus === 'past_due'
                ) {
                  const now = Math.floor(Date.now() / 1000);
                  if (verifyData.currentPeriodEnd && verifyData.currentPeriodEnd < now) {
                    showToastRef.current({
                      type: 'error',
                      message: 'Your subscription has ended. Please subscribe to continue using EZ2Invoice.',
                    });
                    setTimeout(() => {
                      window.location.href = '/pricing';
                    }, 2000);
                    return;
                  }
                  return;
                }
              }
            }
          } catch (verifyError) {
            console.error('[Dashboard] Error verifying subscription:', verifyError);
            if (hasActivePlan) {
              return;
            }
          }

          if (hasActivePlan) {
            if (typeof window !== 'undefined' && recentCheckoutTimestamp) {
              localStorage.removeItem('recent_checkout_timestamp');
            }
            subscriptionPollStartRef.current = null;
            subscriptionSetupToastShownRef.current = false;
            return;
          }
        }

        if (!hasStripeCustomerId && hasActivePlan) {
          return;
        }

        if (hasStripeCustomerId && !hasActivePlan) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const verifyResponse = await fetch('/api/stripe/verify-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: session.access_token }),
              });

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                if (
                  verifyData.hasActiveSubscription &&
                  (verifyData.subscriptionStatus === 'active' || verifyData.subscriptionStatus === 'trialing')
                ) {
                  onPlanTypeChangeRef.current(verifyData.planType);
                  return;
                }
              }
            }
          } catch (verifyError) {
            console.error('[Dashboard] Error verifying subscription:', verifyError);
          }
        }

        const shouldPoll = isWithinGracePeriod;
        const pollDurationMs = 30 * 1000;
        if (shouldPoll && subscriptionPollStartRef.current === null) {
          subscriptionPollStartRef.current = recentCheckoutTimestamp
            ? parseInt(recentCheckoutTimestamp, 10)
            : Date.now();
        }
        const pollStartTime = subscriptionPollStartRef.current ?? Date.now();
        const timeSinceCheckout = Date.now() - pollStartTime;
        const isWithinPollWindow = timeSinceCheckout < pollDurationMs;

        if (shouldPoll && isWithinPollWindow) {
          if (!subscriptionSetupToastShownRef.current) {
            subscriptionSetupToastShownRef.current = true;
            showToastRef.current({
              type: 'info',
              message: 'Setting up your subscription... Please wait.',
            });
          }
          setTimeout(() => {
            checkSubscriptionAccess();
          }, 2000);
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('recent_checkout_timestamp');
        }
        subscriptionPollStartRef.current = null;
        subscriptionSetupToastShownRef.current = false;

        if (!hasStripeCustomerId) {
          showToastRef.current({
            type: 'error',
            message: 'Please subscribe to continue using EZ2Invoice.',
          });
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 2000);
        } else {
          showToastRef.current({
            type: 'error',
            message: 'Your subscription has ended. Please subscribe to continue using EZ2Invoice.',
          });
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 2000);
        }
      } catch (error) {
        console.error('[Dashboard] Error checking subscription access:', error);
      }
    };

    const delay = isVerifyingCheckout ? 4000 : 1000;
    const timer = setTimeout(() => {
      checkSubscriptionAccess();
    }, delay);

    return () => clearTimeout(timer);
  }, [isVerifyingCheckout, userPlanType]);

  return null;
}
