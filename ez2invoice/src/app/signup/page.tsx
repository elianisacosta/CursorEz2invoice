'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Zap } from 'lucide-react';

function SignUpForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signUp, resendConfirmation } = useAuth();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if this is a founder email
      const founderEmails = ['acostaelianis@yahoo.com', 'founder@ez2invoice.com', 'admin@ez2invoice.com'];
      const isFounder = founderEmails.includes(email.toLowerCase());

      const priceId = searchParams.get('priceId');
      const planName = searchParams.get('planName') ?? undefined;

      // Build redirect URL - include priceId if present (for both founders and regular users)
      // Founders can still purchase plans, they just get dashboard access without payment
      // Use NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin for development
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = priceId
        ? `${baseUrl}/auth/callback?priceId=${encodeURIComponent(priceId)}${planName ? `&planName=${encodeURIComponent(planName)}` : ''}`
        : `${baseUrl}/auth/callback?next=/dashboard`;
      
      const { data, error } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        role: isFounder ? 'founder' : 'user'
      }, redirectTo);

      if (error) {
        setError(error.message);
      } else {
        if (isFounder) {
          setSuccess('Founder account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
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

      {/* Sign Up Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Zap className="h-8 w-8 text-primary-500" />
              <span className="text-2xl font-bold text-white">EZ2Invoice</span>
            </div>
            <h1 className="text-2xl font-bold text-primary-500 mb-2">
              Create Your Account
            </h1>
            <p className="text-green-400 text-sm">
              Start managing your truck shop today
            </p>
          </div>

          {/* Sign Up Form */}
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-50"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-50"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              </div>

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
                    placeholder="john@example.com"
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

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm mb-3">{success}</p>
                  {success.includes('check your email') && (
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        setError('');
                        const priceId = searchParams.get('priceId');
                        const planName = searchParams.get('planName') ?? undefined;
                        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                        const redirectTo = priceId
                          ? `${baseUrl}/auth/callback?priceId=${encodeURIComponent(priceId)}${planName ? `&planName=${encodeURIComponent(planName)}` : ''}`
                          : `${baseUrl}/auth/callback?next=/dashboard`;
                        
                        const { error: resendError } = await resendConfirmation(email, redirectTo);
                        if (resendError) {
                          setError('Failed to resend email. Please try again.');
                        } else {
                          setSuccess('Confirmation email resent! Please check your inbox.');
                        }
                        setLoading(false);
                      }}
                      disabled={loading}
                      className="text-sm text-primary-600 hover:text-primary-700 underline font-medium"
                    >
                      Resend confirmation email
                    </button>
                  )}
                </div>
              )}

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600'
                } text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200`}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-green-500 hover:text-green-600 transition-colors font-medium"
                  >
                    Sign in
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

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
