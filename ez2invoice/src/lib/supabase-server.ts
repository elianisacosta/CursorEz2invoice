import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSslFetchError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { message?: string; cause?: { code?: string; message?: string } };
  if (err.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') return true;
  if (err.cause?.message?.includes('unable to verify the first certificate')) return true;
  if (err.message?.includes('unable to verify the first certificate')) return true;
  if (err.message?.includes('fetch failed') && isSslFetchError(err.cause)) return true;
  return false;
}

/** Dev-only: corporate proxies / AV often break Node TLS to Supabase */
export async function withRelaxedTlsInDev<T>(fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    }
  }
}

export function createAuthSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AuthenticatedSupabaseResult = {
  user: User | null;
  supabase: SupabaseClient;
  admin: SupabaseClient | null;
  error: unknown;
  usedInsecureSsl: boolean;
};

export async function getAuthenticatedSupabase(
  accessToken: string
): Promise<AuthenticatedSupabaseResult> {
  const supabase = createAuthSupabaseClient(accessToken);
  const usedInsecureSsl = process.env.NODE_ENV === 'development';

  const resolveUser = async () => {
    if (process.env.NODE_ENV === 'development') {
      return withRelaxedTlsInDev(() => supabase.auth.getUser(accessToken));
    }
    return supabase.auth.getUser(accessToken);
  };

  let result = await resolveUser();

  if (!result.error && result.data.user) {
    return {
      user: result.data.user,
      supabase,
      admin: createAdminSupabaseClient(),
      error: null,
      usedInsecureSsl,
    };
  }

  if (process.env.NODE_ENV === 'development' && isSslFetchError(result.error)) {
    result = await withRelaxedTlsInDev(() => supabase.auth.getUser(accessToken));
  }

  return {
    user: result.data.user ?? null,
    supabase,
    admin: createAdminSupabaseClient(),
    error: result.error,
    usedInsecureSsl,
  };
}
