import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const priceId = requestUrl.searchParams.get('priceId')
  const planName = requestUrl.searchParams.get('planName') ?? undefined
  
  // Check for error in URL hash (Supabase sometimes puts errors in the hash)
  const hash = requestUrl.hash
  let errorCode = requestUrl.searchParams.get('error_code')
  let errorDescription = requestUrl.searchParams.get('error_description')
  
  // Parse hash for errors (format: #error=access_denied&error_code=otp_expired&error_description=...)
  if (hash && hash.includes('error')) {
    const hashParams = new URLSearchParams(hash.substring(1))
    errorCode = errorCode || hashParams.get('error_code')
    errorDescription = errorDescription || hashParams.get('error_description')
  }

  // If there's an error (like expired token), redirect to signup with priceId preserved
  if (errorCode || errorDescription) {
    const errorMsg = errorCode === 'otp_expired' 
      ? 'email_expired' 
      : 'auth_callback_error'
    
    // Preserve priceId and planName if they were in the original signup
    const redirectParams = new URLSearchParams()
    if (priceId) redirectParams.set('priceId', priceId)
    if (planName) redirectParams.set('planName', planName)
    redirectParams.set('error', errorMsg)
    
    return NextResponse.redirect(`${requestUrl.origin}/signup?${redirectParams.toString()}`)
  }

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

  // If there's an error or no code, redirect to signup (not login) with error
  const redirectParams = new URLSearchParams()
  if (priceId) redirectParams.set('priceId', priceId)
  if (planName) redirectParams.set('planName', planName)
  redirectParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(`${requestUrl.origin}/signup?${redirectParams.toString()}`)
}
