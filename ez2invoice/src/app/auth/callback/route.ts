import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const priceId = requestUrl.searchParams.get('priceId')
  const planName = requestUrl.searchParams.get('planName') ?? undefined
  
  // Priority 1: Handle PKCE flow with code parameter (standard flow)
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      // If a Stripe priceId was provided, immediately start checkout
      if (priceId) {
        const customerEmail = data.session?.user?.email ?? undefined

        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            customer_email: customerEmail,
            success_url: `${requestUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${requestUrl.origin}/pricing`,
            metadata: planName ? { planName } : undefined,
          })

          if (session.url) {
            return NextResponse.redirect(session.url)
          } else {
            // Session created but no URL - this should not happen, redirect to pricing with error
            console.error('Stripe checkout session created but no URL returned', session.id)
            return NextResponse.redirect(`${requestUrl.origin}/pricing?error=checkout_failed`)
          }
        } catch (stripeError) {
          // Handle Stripe API errors
          console.error('Error creating Stripe checkout session:', stripeError)
          return NextResponse.redirect(`${requestUrl.origin}/pricing?error=checkout_failed`)
        }
      }

      // Successful confirmation without Stripe flow, redirect to the intended page
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } else if (error) {
      // Handle specific Supabase errors
      console.error('Auth callback error:', error)
      
      // If token expired, redirect to signup with priceId preserved
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        const redirectParams = new URLSearchParams()
        if (priceId) redirectParams.set('priceId', priceId)
        if (planName) redirectParams.set('planName', planName)
        redirectParams.set('error', 'email_expired')
        return NextResponse.redirect(`${requestUrl.origin}/signup?${redirectParams.toString()}`)
      }
    }
  }

  // Priority 2: Check for access_token in hash (client-side auth success)
  const hash = requestUrl.hash
  const hasAccessToken = hash && hash.includes('access_token')
  
  if (hasAccessToken) {
    // Auth succeeded via hash token - redirect to client page to handle it
    if (priceId) {
      const redirectParams = new URLSearchParams()
      redirectParams.set('priceId', priceId)
      if (planName) redirectParams.set('planName', planName)
      return NextResponse.redirect(`${requestUrl.origin}/auth/complete?${redirectParams.toString()}`)
    }
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // Priority 3: Check for errors only if no code and no access_token
  let errorCode = requestUrl.searchParams.get('error_code')
  let errorDescription = requestUrl.searchParams.get('error_description')
  
  // Parse hash for errors (only if no access_token)
  if (hash && hash.includes('error') && !hasAccessToken) {
    const hashParams = new URLSearchParams(hash.substring(1))
    errorCode = errorCode || hashParams.get('error_code')
    errorDescription = errorDescription || hashParams.get('error_description')
  }

  // If there's an error, redirect to signup with priceId preserved
  if (errorCode || errorDescription) {
    const errorMsg = errorCode === 'otp_expired' 
      ? 'email_expired' 
      : 'auth_callback_error'
    
    const redirectParams = new URLSearchParams()
    if (priceId) redirectParams.set('priceId', priceId)
    if (planName) redirectParams.set('planName', planName)
    redirectParams.set('error', errorMsg)
    
    return NextResponse.redirect(`${requestUrl.origin}/signup?${redirectParams.toString()}`)
  }

  // If there's no code, no access_token, and no error, redirect to signup with error
  const redirectParams = new URLSearchParams()
  if (priceId) redirectParams.set('priceId', priceId)
  if (planName) redirectParams.set('planName', planName)
  redirectParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(`${requestUrl.origin}/signup?${redirectParams.toString()}`)
}
