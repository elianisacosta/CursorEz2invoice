'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isFounder: boolean;
  signUp: (email: string, password: string, userData?: any, redirectTo?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string, redirectTo?: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Founder emails list
  const founderEmails = [
    'acostaelianis@yahoo.com',
    'founder@ez2invoice.com',
    'admin@ez2invoice.com'
  ];

  const isFounder = user ? founderEmails.includes(user.email || '') : false;

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (mounted) {
          if (session && !error) {
            setSession(session);
            setUser(session.user);
          } else {
            // Explicitly clear user state if no valid session
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        // If session check fails, assume no user is logged in
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Start session check
    initSession();

    // Listen for auth changes
    let subscription: any;
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      });
      subscription = sub;
    } catch (error) {
      // If auth listener fails, page can still render
      console.warn('Auth state listener setup failed:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, userData?: any, redirectTo?: string) => {
    // Use NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin for development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const finalRedirectTo = redirectTo ?? `${baseUrl}/auth/callback?next=/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: finalRedirectTo
      }
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Explicitly clear user state on sign out
    setSession(null);
    setUser(null);
  };

  const resendConfirmation = async (email: string, redirectTo?: string) => {
    // Use NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin for development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectTo ?? `${baseUrl}/auth/callback?next=/dashboard`
      }
    });
    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    isFounder,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
