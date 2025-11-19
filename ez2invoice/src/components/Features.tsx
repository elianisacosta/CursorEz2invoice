import { 
  ClipboardList, 
  FileText, 
  Package, 
  BarChart3, 
  Bell, 
  Shield 
} from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: "Smart Waitlist Management",
    description: "Track trucks waiting for service, assign bays, update status, and notify customers in real time."
  },
  {
    icon: FileText,
    title: "Invoice Generation",
    description: "Create accurate invoices automatically when trucks are released, saving time and reducing errors."
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track parts and labor costs, adjust rates, and get low-stock alerts to maintain optimal inventory levels."
  },
  {
    icon: BarChart3,
    title: "Client Overview Dashboard",
    description: "View active waitlists, recent invoices, and job statuses at a glance for better decision making."
  },
  {
    icon: Bell,
    title: "Updates & Reports",
    description: "Stay updated with new features and generate reports to improve shop efficiency and track performance."
  },
  {
    icon: Shield,
    title: "Role Permissions",
    description: "Owner, Admin, Technician, Viewer roles to keep data secure and workflows clean."
  }
];

export default function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Your Repair Shop
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            EZ2Invoice provides everything you need to streamline operations and wow your customers.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 group"
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <IconComponent className="h-6 w-6 text-primary-500" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
