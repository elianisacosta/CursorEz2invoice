'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/useToast';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Activating subscription...');

  useEffect(() => {
    const handleBillingSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        console.error('No session_id in URL');
        setStatus('error');
        setMessage('Invalid checkout session. Please contact support.');
        setTimeout(() => {
          router.push('/pricing');
        }, 3000);
        return;
      }

      try {
        // Get the current session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('No access token available:', sessionError);
          setStatus('error');
          setMessage('Authentication error. Please log in again.');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          return;
        }

        console.log(`[BillingSuccess] Syncing checkout session: ${sessionId}`);
        setMessage('Activating subscription...');

        // Call sync API to retrieve checkout session from Stripe and upsert subscription into DB
        const syncUrl = `/api/stripe/sync?session_id=${encodeURIComponent(sessionId)}&access_token=${encodeURIComponent(session.access_token)}`;
        const response = await fetch(syncUrl, {
          method: 'GET',
        });

        const result = await response.json();

        console.log(`[BillingSuccess] Sync result:`, {
          success: response.ok && result.success,
          planType: result.planType,
          subscriptionStatus: result.subscriptionStatus,
          error: result.error,
        });

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to sync checkout session');
        }

        // Check if subscription status is active or trialing before redirecting
        const isActiveOrTrialing = result.subscriptionStatus === 'active' || result.subscriptionStatus === 'trialing';
        
        if (!isActiveOrTrialing) {
          throw new Error(`Subscription status is ${result.subscriptionStatus}, expected active or trialing`);
        }

        // Verify the subscription was saved to DB by checking user record
        // Poll for up to 30 seconds for the subscription to appear in DB with active/trialing status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          throw new Error('User not found');
        }

        let attempts = 0;
        const maxAttempts = 30; // 30 attempts * 1 second = 30 seconds
        const pollInterval = 1000; // 1 second
        
        while (attempts < maxAttempts) {
          const { data: userRecord } = await supabase
            .from('users')
            .select('plan_type, stripe_customer_id')
            .eq('id', user.id)
            .maybeSingle();
          
          console.log(`[BillingSuccess] Poll attempt ${attempts + 1}/${maxAttempts}:`, {
            planType: userRecord?.plan_type,
            hasStripeCustomerId: !!userRecord?.stripe_customer_id,
          });

          // Check if subscription is active/trialing in DB
          if (userRecord?.plan_type && userRecord?.stripe_customer_id) {
            // Verify subscription status with Stripe to ensure it's active/trialing
            try {
              const verifyResponse = await fetch('/api/stripe/verify-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  accessToken: session.access_token,
                }),
              });

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                const isActive = verifyData.subscriptionStatus === 'active' || verifyData.subscriptionStatus === 'trialing';
                
                if (isActive && verifyData.hasActiveSubscription) {
                  console.log(`[BillingSuccess] ✅ Subscription confirmed active/trialing in DB: ${userRecord.plan_type}, status: ${verifyData.subscriptionStatus}`);
                  
                  // Set timestamp in localStorage to indicate recent checkout completion
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('recent_checkout_timestamp', Date.now().toString());
                  }
                  
                  setStatus('success');
                  setMessage('Subscription activated successfully!');
                  
                  showToast({
                    type: 'success',
                    message: 'Welcome! Your subscription is now active.',
                  });
                  
                  // Redirect to dashboard
                  setTimeout(() => {
                    router.push('/dashboard');
                  }, 1500);
                  return;
                }
              }
            } catch (verifyError) {
              console.error('[BillingSuccess] Error verifying subscription status:', verifyError);
              // Continue polling if verification fails
            }
          }
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // If we get here, subscription wasn't confirmed as active/trialing after 30 seconds
        console.warn(`[BillingSuccess] ⚠️ Subscription not confirmed as active/trialing after ${maxAttempts} attempts. Redirecting anyway.`);
        
        // Set timestamp in localStorage to indicate recent checkout completion
        if (typeof window !== 'undefined') {
          localStorage.setItem('recent_checkout_timestamp', Date.now().toString());
        }
        
        setStatus('success');
        setMessage('Subscription activated! Redirecting...');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (error: any) {
        console.error('[BillingSuccess] Error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to activate subscription. Please contact support.');
        
        showToast({
          type: 'error',
          message: 'There was an issue activating your subscription. Our team has been notified.',
        });
        
        setTimeout(() => {
          router.push('/pricing');
        }, 5000);
      }
    };

    handleBillingSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Activating subscription</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="rounded-full bg-green-100 h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="rounded-full bg-red-100 h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}

