import { ArrowRight, MessageCircle } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Heading */}
        <h2 className="text-4xl font-bold text-gray-900 mb-6">
          Ready to transform your truck shop?
        </h2>
        
        {/* Subheading */}
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Join hundreds of successful truck shops using EZ2Invoice to streamline their operations.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <a
            href="#getstarted"
            className="bg-primary-500 text-white px-8 py-4 rounded-lg hover:bg-primary-600 transition-colors font-semibold text-lg flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            <span>Get Started Today</span>
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="/request-demo"
            className="bg-white text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg flex items-center space-x-2 border border-gray-300 hover:border-gray-400"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Request Demo</span>
          </a>
        </div>

        {/* Footer Text */}
        <p className="text-gray-500">
          Questions? Contact our team or check out our{' '}
          <a href="#faq" className="text-primary-500 hover:text-primary-600 transition-colors">
            FAQ
          </a>
        </p>
      </div>
    </section>
  );
}
