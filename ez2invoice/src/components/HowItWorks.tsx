import { ClipboardList, Wrench, CheckCircle, FileText } from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    title: "Add truck to waitlist",
    description: "Easily add incoming trucks with all details."
  },
  {
    icon: Wrench,
    title: "Assign bay & track progress",
    description: "Allocate bays and monitor progress in real-time."
  },
  {
    icon: CheckCircle,
    title: "Release truck from bay",
    description: "Mark completion and free the bay for the next truck."
  },
  {
    icon: FileText,
    title: "Invoice generated automatically",
    description: "Accurate invoices based on service duration and type."
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How EZ2Invoice Works
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="text-center">
                {/* Step Number and Icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  {/* Connection Line (hidden on mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-300 transform translate-x-8"></div>
                  )}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-primary-500 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Everything you need to run your shop
            </h3>
            <p className="text-gray-600 text-lg">
              Professional tools designed specifically for truck repair businesses
            </p>
            
            {/* Additional Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Wrench className="h-6 w-6 text-primary-500" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Work Order Management</h4>
                <p className="text-gray-600 text-sm">Streamline your service workflow with digital work orders and real-time tracking.</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="h-6 w-6 text-primary-500" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Customer Database</h4>
                <p className="text-gray-600 text-sm">Maintain detailed customer records and service history in one centralized location.</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-primary-500" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Analytics & Reports</h4>
                <p className="text-gray-600 text-sm">Get insights into your business performance with comprehensive reporting tools.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
