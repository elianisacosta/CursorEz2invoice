import Header from '@/components/Header';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function PricingPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <FadeInOnScroll delay={0} duration={800}>
          <Pricing />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
}