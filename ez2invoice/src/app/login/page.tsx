'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const searchParams = useSearchParams();

  const { signIn, resendConfirmation } = useAuth();

  // Check for error in URL parameters
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'auth_callback_error') {
      setError('Email verification link is invalid or has expired. Please request a new confirmation email.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else if (data.user) {
        setSuccess('Login successful! Redirecting...');
        
        // Check if this is a founder email
        const founderEmails = ['acostaelianis@yahoo.com', 'founder@ez2invoice.com', 'admin@ez2invoice.com'];
        if (founderEmails.includes(email.toLowerCase())) {
          // Redirect founder to dashboard
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          // Check if user has an active subscription
          try {
            const { data: userRecord, error: userError } = await supabase
              .from('users')
              .select('plan_type, stripe_customer_id')
              .eq('id', data.user.id)
              .maybeSingle(); // Use maybeSingle instead of single to handle missing records

            // If user record doesn't exist, create it with default 'starter' plan
            if (!userRecord && !userError) {
              // User record doesn't exist, create it
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: data.user.id,
                  email: data.user.email || email,
                  plan_type: 'starter',
                });

              if (insertError) {
                console.error('Error creating user record:', insertError);
              }
              
              // New user, redirect to pricing
              setTimeout(() => {
                window.location.href = '/pricing';
              }, 1000);
              return;
            }

            // Check if user has an active subscription
            // plan_type must exist and not be null (null means subscription ended)
            // Having stripe_customer_id alone doesn't mean active subscription
            let hasSubscription = userRecord?.plan_type && userRecord.plan_type !== null;

            // If database shows no subscription but user has stripe_customer_id,
            // verify directly with Stripe (webhook might not have fired yet)
            if (!hasSubscription && userRecord?.stripe_customer_id) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
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
                    if (verifyData.hasActiveSubscription) {
                      hasSubscription = true;
                      console.log('Subscription verified from Stripe, plan:', verifyData.planType);
                    }
                  }
                }
              } catch (verifyError) {
                console.error('Error verifying subscription from Stripe:', verifyError);
                // Continue with database value if verification fails
              }
            }

            if (hasSubscription) {
              // User has an active subscription, redirect to dashboard
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } else {
              // User doesn't have a subscription, redirect to pricing
              setTimeout(() => {
                window.location.href = '/pricing';
              }, 1000);
            }
          } catch (err) {
            console.error('Error checking subscription status:', err);
            // On error, redirect to pricing to be safe
            setTimeout(() => {
              window.location.href = '/pricing';
            }, 1000);
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    setResending(true);
    setError('');
    
    try {
      const { error } = await resendConfirmation(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Confirmation email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Blur */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("/images/hero-semitruck-shop.jpg")',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
        {/* Dark overlay for better form readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Zap className="h-8 w-8 text-primary-500" />
              <span className="text-2xl font-bold text-white">EZ2Invoice</span>
            </div>
            <h1 className="text-2xl font-bold text-primary-500 mb-2">
              Login to EZ2Invoice
            </h1>
            <p className="text-green-400 text-sm">
              Access your invoicing dashboard
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-50"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-50"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <Link
                  href="#forgot-password"
                  className="text-sm text-green-500 hover:text-green-600 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                  {error.toLowerCase().includes('email not confirmed') && (
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resending}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Resend confirmation email'}
                    </button>
                  )}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">{success}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600'
                } text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200`}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    href="/signup"
                    className="text-green-500 hover:text-green-600 transition-colors font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
