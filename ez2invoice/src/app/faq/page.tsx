import Header from '@/components/Header';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function FAQPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <FadeInOnScroll delay={0} duration={800}>
          <FAQ />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
}
