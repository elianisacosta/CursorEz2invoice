import Link from 'next/link';
import { Wrench, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-primary-500 smooth-transition" prefetch={true}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-primary-500 smooth-transition" prefetch={true}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Company
            </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-primary-500 smooth-transition" prefetch={true}>
                    Contact
                  </Link>
                </li>
              </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#terms" className="text-gray-600 hover:text-primary-500 transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-gray-600 hover:text-primary-500 transition-colors">
                  Privacy
                </a>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Support
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a 
                  href="mailto:support@ez2invoice.com" 
                  className="text-gray-600 hover:text-primary-500 transition-colors"
                >
                  support@ez2invoice.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <a 
                  href="tel:+15550123456" 
                  className="text-gray-600 hover:text-primary-500 transition-colors"
                >
                  (555) 012-3456
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Wrench className="h-6 w-6 text-primary-500" />
              <span className="text-lg font-bold text-gray-800">EZ2Invoice</span>
            </div>

            {/* Copyright */}
            <p className="text-gray-500 text-sm">
              © 2024 EZ2Invoice. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
