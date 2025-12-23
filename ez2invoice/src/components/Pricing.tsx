'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Plan = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  buttonStyle: 'primary' | 'secondary';
  popular: boolean;
  priceId?: string;
};

const pricingPlans: Plan[] = [
  {
    name: "Starter",
    description: "Perfect for small truck shops.",
    price: "$80",
    period: "/month",
    features: [
      "Up to 3 service bays",
      "Work order management",
      "Customer database",
      "Invoice generation",
      "Inventory management",
      "Basic reporting",
      "Email support"
    ],
    buttonText: "Get Started",
    buttonStyle: "secondary",
    popular: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: "Professional",
    description: "For growing truck shops.",
    price: "$160",
    period: "/month",
    features: [
      "Everything in Starter",
      "Up to 8 service bays",
      "Analytics dashboard",
      "Timesheet tracking",
      "Fleet customer management",
      "DOT inspection tracking",
      "Accounts Receivable",
      "Priority support"
    ],
    buttonText: "Get Started",
    buttonStyle: "primary",
    popular: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  },
  {
    name: "Enterprise",
    description: "For large truck shop chains.",
    price: "Contact Sales",
    period: "",
    features: [
      "Everything in Professional",
      "Unlimited service bays",
      "Multi-location management",
      "User permissions (up to 5 users)",
      "Advanced reporting",
      "API access",
      "Custom integrations",
      "Dedicated account manager"
    ],
    buttonText: "Contact",
    buttonStyle: "secondary",
    popular: false,
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your truck shop's needs. Start managing your business today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-xl shadow-lg border-2 p-8 ${
                plan.popular 
                  ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-20' 
                  : 'border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-600">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {plan.name === 'Enterprise' ? (
                <Link
                  href="/contact"
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 block text-center ${
                    plan.buttonStyle === 'primary'
                      ? 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-lg hover:-translate-y-1'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              ) : (
                <PlanCheckoutButton plan={plan} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCheckoutButton({ plan }: { plan: Plan }) {
  const { user } = useAuth();

  const handleClick = async () => {
    if (!user?.email) {
      const params = new URLSearchParams();
      if (plan.priceId) {
        params.set('priceId', plan.priceId);
        params.set('planName', plan.name);
      }
      const query = params.toString();
      window.location.href = query ? `/signup?${query}` : '/signup';
      return;
    }

    if (!plan.priceId) {
      alert('This plan is not yet available for online purchase.');
      return;
    }

    try {
      // Get access token for linking Stripe session to Supabase user
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          customerEmail: user.email,
          accessToken: session?.access_token,
          userId: user.id,
        }),
      });

      if (!res.ok) {
        alert('Unable to start checkout. Please try again.');
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Unable to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 block text-center ${
        plan.buttonStyle === 'primary'
          ? 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-lg hover:-translate-y-1'
          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      {plan.buttonText}
    </button>
  );
}
