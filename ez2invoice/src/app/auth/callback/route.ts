import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful confirmation, redirect to the intended page
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
}
