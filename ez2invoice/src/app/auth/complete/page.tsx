'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');

  useEffect(() => {
    const handleAuthComplete = async () => {
      try {
        // Get priceId and planName from URL
        const priceId = searchParams.get('priceId');
        const planName = searchParams.get('planName');

        // Wait a moment for Supabase to process the hash token
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the current session (Supabase should have processed the hash token by now)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('Error getting session:', sessionError);
          setStatus('error');
          // Redirect to signup with error
          const redirectParams = new URLSearchParams();
          if (priceId) redirectParams.set('priceId', priceId);
          if (planName) redirectParams.set('planName', planName);
          redirectParams.set('error', 'auth_callback_error');
          router.push(`/signup?${redirectParams.toString()}`);
          return;
        }

        // If we have a priceId, redirect to Stripe checkout
        if (priceId) {
          setStatus('redirecting');
          try {
            const response = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                priceId: priceId,
                customerEmail: session.user.email,
                accessToken: session.access_token,
                userId: session.user.id,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to create checkout session');
            }

            const data = await response.json();
            if (data.url) {
              window.location.href = data.url;
            } else {
              throw new Error('No checkout URL returned');
            }
          } catch (error) {
            console.error('Error creating checkout session:', error);
            router.push('/pricing?error=checkout_failed');
          }
        } else {
          // No priceId, just go to dashboard
          setStatus('redirecting');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error in auth complete:', error);
        setStatus('error');
        router.push('/signup?error=auth_callback_error');
      }
    };

    handleAuthComplete();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
          </>
        )}
        {status === 'redirecting' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to checkout...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-gray-600">An error occurred. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCompleteContent />
    </Suspense>
  );
}

