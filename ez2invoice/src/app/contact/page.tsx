import Header from '@/components/Header';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function ContactPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <FadeInOnScroll delay={0} duration={800}>
          <Contact />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
}
