'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get priceId and planName from query string, hash, or localStorage
        // Supabase might not preserve query params in redirect, so we store them in localStorage during signup
        let priceId = searchParams.get('priceId') || searchParams.get('priceld'); // Handle typo
        let planName = searchParams.get('planName');
        const code = searchParams.get('code');
        const next = searchParams.get('next') ?? '/dashboard';
        
        // Also check hash for priceId (Supabase might preserve it in hash)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          if (!priceId) {
            priceId = hashParams.get('priceId') || hashParams.get('priceld');
          }
          if (!planName) {
            planName = hashParams.get('planName') || null;
          }
        }
        
        // If still no priceId, check localStorage (stored during signup)
        if (!priceId && typeof window !== 'undefined') {
          const storedPriceId = localStorage.getItem('pending_priceId');
          const storedPlanName = localStorage.getItem('pending_planName');
          console.log('Checking localStorage - storedPriceId:', storedPriceId, 'storedPlanName:', storedPlanName);
          if (storedPriceId) {
            priceId = storedPriceId;
          }
          if (!planName && storedPlanName) {
            planName = storedPlanName;
          }
        }
        
        // Debug logging
        console.log('Auth callback - Final priceId:', priceId, 'planName:', planName, 'code:', code, 'hasHash:', !!hash);

        let session = null;
        let authError = null;

        // Check if we have a code parameter (PKCE flow)
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              authError = error;
            } else {
              session = data?.session;
            }
          } catch (err: any) {
            authError = err;
            console.error('Error exchanging code for session:', err);
          }
        } else {
          // No code, try to get session from URL hash (access_token)
          // Supabase automatically processes the hash token, we just need to wait and get the session
          try {
            // Wait a moment for Supabase to process the hash token
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get the session (Supabase should have processed the hash token by now)
            const { data, error } = await supabase.auth.getSession();
            if (error) {
              authError = error;
            } else {
              session = data?.session;
            }
          } catch (err: any) {
            authError = err;
            console.error('Error getting session from URL:', err);
          }
        }

        // If authentication failed, redirect to signup with error
        if (authError || !session) {
          console.error('Auth callback error:', authError);
          setStatus('error');
          
          // Determine error type
          let errorType = 'auth_callback_error';
          if (authError?.message?.includes('expired') || authError?.message?.includes('invalid')) {
            errorType = 'email_expired';
          }

          // Redirect to signup with error and preserve priceId
          const redirectParams = new URLSearchParams();
          if (priceId) redirectParams.set('priceId', priceId);
          if (planName) redirectParams.set('planName', planName);
          redirectParams.set('error', errorType);
          
          router.push(`/signup?${redirectParams.toString()}`);
          return;
        }

        // Authentication succeeded!
        console.log('Auth successful, priceId:', priceId, 'planName:', planName);
        
        // Ensure user record exists in public.users table
        // This handles cases where the initial signup user creation might have failed
        if (session?.user) {
          try {
            const { data: existingUser, error: checkError } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!existingUser && !checkError) {
              // Get user metadata from auth user
              const userMetadata = session.user.user_metadata || {};
              
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  first_name: userMetadata.first_name || null,
                  last_name: userMetadata.last_name || null,
                  company: userMetadata.company || null,
                  plan_type: userMetadata.plan_type || 'starter'
                });
              
              if (insertError) {
                console.error('Error creating user record in auth callback:', insertError);
                // Continue anyway - login flow will handle it
              }
            }
          } catch (err) {
            console.error('Unexpected error ensuring user record exists:', err);
            // Continue anyway - login flow will handle it
          }
        }
        
        // If we have a priceId, redirect to Stripe checkout
        if (priceId) {
          setStatus('redirecting');
          
          try {
            const customerEmail = session.user?.email;
            console.log('Creating Stripe checkout session with priceId:', priceId, 'email:', customerEmail);
            
            const response = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                priceId: priceId,
                customerEmail: customerEmail,
                accessToken: session.access_token,
                userId: session.user.id,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const data = await response.json();
            console.log('Stripe checkout session created, URL:', data.url);
            
            if (data.url) {
              // Clear stored priceId since we're proceeding to checkout
              if (typeof window !== 'undefined') {
                localStorage.removeItem('pending_priceId');
                localStorage.removeItem('pending_planName');
              }
              // Redirect to Stripe checkout immediately
              window.location.href = data.url;
              return; // Don't continue execution
            } else {
              throw new Error('No checkout URL returned');
            }
          } catch (error: any) {
            console.error('Error creating checkout session:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to start checkout');
            
            // Redirect to pricing with error
            setTimeout(() => {
              router.push('/pricing?error=checkout_failed');
            }, 2000);
            return;
          }
        } else {
          // No priceId found - this shouldn't happen if user selected a plan
          console.warn('No priceId found after successful auth. Redirecting to dashboard.');
          // Clear any stale localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_priceId');
            localStorage.removeItem('pending_planName');
          }
          // Redirect to dashboard
          setStatus('redirecting');
          router.push('/dashboard');
        }
      } catch (error: any) {
        console.error('Unexpected error in auth callback:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
        
        // Redirect to signup with error
        const redirectParams = new URLSearchParams();
        const priceId = searchParams.get('priceId') || searchParams.get('priceld');
        const planName = searchParams.get('planName');
        if (priceId) redirectParams.set('priceId', priceId);
        if (planName) redirectParams.set('planName', planName);
        redirectParams.set('error', 'auth_callback_error');
        
        router.push(`/signup?${redirectParams.toString()}`);
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your email...</p>
            <p className="text-xs text-gray-400 mt-2">Please wait while we process your verification</p>
          </>
        )}
        {status === 'redirecting' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to checkout...</p>
            <p className="text-xs text-gray-400 mt-2">You will be redirected to Stripe in a moment</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-gray-600 mb-2">Verification failed</p>
            {errorMessage && (
              <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
            )}
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          </>
        )}
        {/* Always show debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded text-left text-xs">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>Hash:</strong> {typeof window !== 'undefined' ? window.location.hash.substring(0, 50) : 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

