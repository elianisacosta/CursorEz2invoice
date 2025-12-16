'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, MessageCircle } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    question: "What is EZ2Invoice?",
    answer: "EZ2Invoice is a comprehensive truck shop management solution designed specifically for semi-truck repair shops. It helps streamline operations with tools for work orders, customer management, inventory tracking, invoicing, and more."
  },
  {
    id: 2,
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences. You can manage your subscription directly from your account dashboard."
  },
  {
    id: 3,
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade security with SSL encryption, regular backups, and secure data centers. Your data is protected with industry-standard security measures and compliance protocols."
  },
  {
    id: 4,
    question: "What kind of support do you provide?",
    answer: "We provide email support for all plans, with priority support for Professional and Enterprise customers. Our support team is available Monday-Friday 9AM-6PM EST, and we typically respond within 24 hours."
  },
  {
    id: 5,
    question: "Can I import my existing data?",
    answer: "Yes, we offer data import services for customer information, inventory, and historical records. Our team can help you migrate from your current system during onboarding."
  },
  {
    id: 6,
    question: "Do you offer training?",
    answer: "Yes, we provide comprehensive training resources including video tutorials, documentation, and live training sessions. Enterprise customers receive dedicated training sessions with our team."
  },
  {
    id: 7,
    question: "What happens if I cancel?",
    answer: "You can cancel your subscription at any time. Your data will be available for download for 30 days after cancellation. After that, data is securely deleted according to our privacy policy."
  },
  {
    id: 8,
    question: "Do you offer discounts for multiple locations?",
    answer: "Yes, we offer volume discounts for businesses with multiple locations. Contact our sales team for custom pricing based on your specific needs and number of locations."
  }
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions about EZ2Invoice.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 mb-16">
          {faqData.map((item) => {
            const isOpen = openItems.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg font-medium text-gray-900 pr-4">
                    {item.question}
                  </span>
                  <div className="flex-shrink-0">
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </button>
                
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-700 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Section */}
        <div className="text-center bg-gray-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Contact Support</span>
            </a>
            <a
              href="mailto:ez2invoicellc@gmail.com"
              className="bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>Email Us</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
