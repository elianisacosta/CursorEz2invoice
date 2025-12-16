import { Check } from 'lucide-react';

const benefits = [
  "Increase efficiency by up to 40%",
  "Reduce paperwork and manual processes",
  "Improve customer satisfaction with better communication",
  "Track inventory and prevent stockouts",
  "Generate professional invoices instantly",
  "Access your data from anywhere, anytime"
];

const stats = [
  { value: "500+", label: "Truck Shops" },
  { value: "24/7", label: "Support" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9★", label: "Rating" }
];

export default function Benefits() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Benefits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          {/* Benefits List */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              Why truck shops choose EZ2Invoice
            </h2>
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-lg">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Statistics */}
          <div className="bg-gray-50 rounded-xl p-8">
            <div className="grid grid-cols-2 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold text-primary-500 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
