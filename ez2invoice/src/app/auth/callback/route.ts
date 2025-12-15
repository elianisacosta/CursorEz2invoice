import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const priceId = requestUrl.searchParams.get('priceId')
  const planName = requestUrl.searchParams.get('planName') ?? undefined

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
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
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
}
