'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login_required' | 'wrong_user'>('loading');
  const [message, setMessage] = useState('');
  const [wrongUserEmail, setWrongUserEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link. No token provided.');
      return;
    }

    const acceptInvite = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setStatus('login_required');
        setMessage('Please sign in or sign up to accept this invite.');
        return;
      }

      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.error === 'wrong_user') {
          setStatus('wrong_user');
          setMessage(data.message || 'This invite was sent to a different email.');
          setInviteEmail(data.inviteEmail || '');
          setWrongUserEmail(data.userEmail || '');
        } else {
          setStatus('error');
          setMessage(data.error || data.message || 'Failed to accept invite.');
        }
        return;
      }

      setStatus('success');
      setMessage('You have joined the shop successfully!');
      setTimeout(() => router.push('/dashboard'), 2000);
    };

    acceptInvite();
  }, [token, router]);

  if (status === 'wrong_user') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wrong account</h1>
          <p className="text-gray-600 mb-4">{message}</p>
          {inviteEmail && (
            <p className="text-sm text-gray-500 mb-2">Invite was sent to: <strong>{inviteEmail}</strong></p>
          )}
          {wrongUserEmail && (
            <p className="text-sm text-gray-500 mb-6">You&apos;re signed in as: <strong>{wrongUserEmail}</strong></p>
          )}
          <p className="text-sm text-gray-600 mb-6">
            Sign out, then open this invite link again (in this window or in a private window) and sign up or sign in with the invited email.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = `/invite/accept?token=${token}`;
            }}
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium mb-3"
          >
            Sign out and try again
          </button>
          <p className="text-xs text-gray-500">
            Or open this link in a private/incognito window to sign up with the invited email.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'login_required') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in or sign up</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Sign in
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href={`/signup?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`} className="text-primary-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Accepting invite...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/"
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}
