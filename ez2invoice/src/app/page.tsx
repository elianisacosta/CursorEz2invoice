'use client';

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
