'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FadeInOnScroll from '@/components/FadeInOnScroll';
import dynamic from 'next/dynamic';

// Lazy load non-critical components
const Features = dynamic(() => import('@/components/Features'), { ssr: false });
const HowItWorks = dynamic(() => import('@/components/HowItWorks'), { ssr: false });
const Benefits = dynamic(() => import('@/components/Benefits'), { ssr: false });
const CTA = dynamic(() => import('@/components/CTA'), { ssr: false });
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });

export default function Home() {
  const router = useRouter();

  // Check if user just verified email and has pending priceId
  // This handles the case where Supabase redirects to homepage instead of callback
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Check for pending priceId in localStorage
    const pendingPriceId = localStorage.getItem('pending_priceId');
    if (pendingPriceId) {
      // Small delay to ensure auth state is ready
      const timer = setTimeout(() => {
        // Redirect to callback page to handle Stripe checkout
        router.push(`/auth/callback?priceId=${encodeURIComponent(pendingPriceId)}`);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <Hero />
        <FadeInOnScroll delay={0} duration={800}>
          <Features />
        </FadeInOnScroll>
        <FadeInOnScroll delay={100} duration={800}>
          <HowItWorks />
        </FadeInOnScroll>
        <FadeInOnScroll delay={200} duration={800}>
          <Benefits />
        </FadeInOnScroll>
        <FadeInOnScroll delay={300} duration={800}>
          <CTA />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
}
