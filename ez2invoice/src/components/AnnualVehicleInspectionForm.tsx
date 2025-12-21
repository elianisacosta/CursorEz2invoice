'use client';

import { useState } from 'react';
import { Printer, Save, X } from 'lucide-react';

interface InspectionItem {
  name: string;
  pass: boolean;
  fail: boolean;
}

interface InspectionComponent {
  name: string;
  items: InspectionItem[];
}

interface AnnualVehicleInspectionFormData {
  // Motor Carrier
  motorCarrier: string;
  motorCarrierAddress: string;
  
  // Inspector
  inspectorName: string;
  inspectorAddress: string;
  
  // Inspection Details
  dateOfInspection: string;
  inspectionCityStateZip: string;
  inspectorCompany: string;
  inspectorCompanyCityStateZip: string;
  inspectorMeetsFMCSA: boolean;
  
  // Report and Vehicle Identification
  reportNumber: string;
  unitNumber: string;
  vin: string;
  
  // Vehicle Type
  vehicleType: 'Tractor' | 'Trailer' | 'Truck' | 'Other';
  vehicleTypeOther: string;
  
  // Inspection Components
  components: {
    brakeSystem: InspectionComponent;
    couplingDevices: InspectionComponent;
    exhaustSystem: InspectionComponent;
    fuelSystem: InspectionComponent;
    lightingDevices: InspectionComponent;
    safeLoading: InspectionComponent;
    steeringMechanism: InspectionComponent;
    suspension: InspectionComponent;
    frame: InspectionComponent;
    tires: InspectionComponent;
    wheelsRims: InspectionComponent;
    windshieldGlazing: InspectionComponent;
    windshieldWipers: InspectionComponent;
  };
  
  // Defects and Corrective Actions
  defectsAndCorrectiveActions: string;
  
  // Notes
  notes: string;
  
  // Certification
  inspectorSignature: string;
  inspectorPrintedName: string;
  certificationDate: string;
}

interface AnnualVehicleInspectionFormProps {
  initialData?: Partial<AnnualVehicleInspectionFormData>;
  onSave: (data: AnnualVehicleInspectionFormData) => Promise<void>;
  onClose: () => void;
}

// Helper function to create inspection items from string array
const createInspectionItems = (itemNames: string[]): InspectionItem[] => {
  return itemNames.map(name => ({ name, pass: false, fail: false }));
};

const initialFormData: AnnualVehicleInspectionFormData = {
  motorCarrier: '',
  motorCarrierAddress: '',
  inspectorName: '',
  inspectorAddress: '',
  dateOfInspection: new Date().toISOString().split('T')[0],
  inspectionCityStateZip: '',
  inspectorCompany: '',
  inspectorCompanyCityStateZip: '',
  inspectorMeetsFMCSA: false,
  reportNumber: '',
  unitNumber: '',
  vin: '',
  vehicleType: 'Truck',
  vehicleTypeOther: '',
  components: {
    brakeSystem: {
      name: 'BRAKE SYSTEM',
      items: createInspectionItems([
        'Service brakes',
        'Parking brake system',
        'Brake drums or rotors',
        'Brake hoses',
        'Brake tubing',
        'Low pressure warning device',
        'Tractor protection valve',
        'Air compressor',
        'Electric brakes',
        'Hydraulic brakes',
        'Vacuum systems'
      ])
    },
    couplingDevices: {
      name: 'COUPLING DEVICES',
      items: createInspectionItems([
        'Fifth wheel',
        'Pintle hooks',
        'Drawbar/towbar',
        'Safety devices',
        'Saddle-mounts',
        'Towbar eye'
      ])
    },
    exhaustSystem: {
      name: 'EXHAUST SYSTEM',
      items: createInspectionItems([
        'Leaks',
        'Exhaust mounting',
        'Exhaust discharge location'
      ])
    },
    fuelSystem: {
      name: 'FUEL SYSTEM',
      items: createInspectionItems([
        'Visible leaks',
        'Tank cap',
        'Tank secure'
      ])
    },
    lightingDevices: {
      name: 'LIGHTING DEVICES',
      items: createInspectionItems([
        'All required lamps, reflectors, signals'
      ])
    },
    safeLoading: {
      name: 'SAFE LOADING',
      items: createInspectionItems([
        'Tailgate',
        'Securement devices'
      ])
    },
    steeringMechanism: {
      name: 'STEERING MECHANISM',
      items: createInspectionItems([
        'Steering wheel free play',
        'Steering column',
        'Front axle beam & steering components',
        'Steering gearbox',
        'Pitman arm',
        'Power steering',
        'Ball and socket joints',
        'Tie rods / drag links',
        'Steering mechanism',
        'Steering lash'
      ])
    },
    suspension: {
      name: 'SUSPENSION',
      items: createInspectionItems([
        'Springs',
        'Torque / radius arms',
        'Suspension components'
      ])
    },
    frame: {
      name: 'FRAME',
      items: createInspectionItems([
        'Cracks',
        'Loose bolts',
        'Frame condition'
      ])
    },
    tires: {
      name: 'TIRES',
      items: createInspectionItems([
        'Tread',
        'Inflation'
      ])
    },
    wheelsRims: {
      name: 'WHEELS & RIMS',
      items: createInspectionItems([
        'Cracks',
        'Lock / retaining rings',
        'Wheel fasteners',
        'Rim condition'
      ])
    },
    windshieldGlazing: {
      name: 'WINDSHIELD GLAZING',
      items: createInspectionItems(['Windshield glazing'])
    },
    windshieldWipers: {
      name: 'WINDSHIELD WIPERS',
      items: createInspectionItems(['Windshield wipers'])
    }
  },
  defectsAndCorrectiveActions: '',
  notes: '',
  inspectorSignature: '',
  inspectorPrintedName: '',
  certificationDate: new Date().toISOString().split('T')[0]
};

export default function AnnualVehicleInspectionForm({ initialData, onSave, onClose }: AnnualVehicleInspectionFormProps) {
  const [formData, setFormData] = useState<AnnualVehicleInspectionFormData>(() => ({
    ...initialFormData,
    ...initialData
  }));
  const [isSaving, setIsSaving] = useState(false);

  const handleItemChange = (
    componentKey: keyof typeof formData.components,
    itemIndex: number,
    field: 'pass' | 'fail',
    value: boolean
  ) => {
    setFormData(prev => {
      const component = prev.components[componentKey];
      const updatedItems = [...component.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        [field]: value,
        [field === 'pass' ? 'fail' : 'pass']: value ? false : updatedItems[itemIndex][field === 'pass' ? 'fail' : 'pass']
      };
      
      return {
        ...prev,
        components: {
          ...prev.components,
          [componentKey]: {
            ...component,
            items: updatedItems
          }
        }
      };
    });
  };


  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      // Success - the onSave function will handle closing the modal
    } catch (error: any) {
      console.error('Error saving inspection:', error);
      // Only show alert if error message doesn't already include user-friendly message
      const errorMessage = error?.message || String(error) || 'Unknown error';
      if (!errorMessage.includes('Failed to create DOT inspection') && !errorMessage.includes('Unexpected error')) {
        alert(`Failed to save inspection: ${errorMessage}`);
      }
      // Don't close the modal on error so user can fix and retry
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const form = document.getElementById('annual-inspection-print-form');
    if (!form) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const headHtml = document.head ? document.head.innerHTML : '';

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          ${headHtml}
          <style>
            /* Smaller page margins so the form uses more space */
            @page {
              margin: 0.25in;
            }

            html, body {
              margin: 0;
              padding: 0;
            }

            /* Make the inspection form stretch across the page */
            #annual-inspection-print-form {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0.25in !important;
            }

            /* Comprehensive print spacing optimizations */
            @media print {
              /* Reduce all margins and padding */
              #annual-inspection-print-form > * {
                margin-top: 0.15rem !important;
                margin-bottom: 0.15rem !important;
              }

              /* Title section */
              #annual-inspection-print-form > div:first-child {
                margin-bottom: 0.2rem !important;
              }

              /* Reduce grid gaps */
              .grid {
                gap: 0.2rem !important;
              }

              /* Reduce section spacing */
              .mb-6, .mb-4 {
                margin-bottom: 0.2rem !important;
              }

              /* Reduce label margins */
              label {
                margin-bottom: 0.1rem !important;
                margin-top: 0.1rem !important;
              }

              /* Reduce input padding */
              input, textarea {
                padding-top: 0.15rem !important;
                padding-bottom: 0.15rem !important;
                padding-left: 0.25rem !important;
                padding-right: 0.25rem !important;
              }

              /* Reduce component spacing */
              .space-y-4 > * + *, .space-y-3 > * + * {
                margin-top: 0.15rem !important;
              }

              /* Reduce component padding */
              .border {
                padding: 0.25rem !important;
              }

              /* Reduce row padding */
              .py-1 {
                padding-top: 0.1rem !important;
                padding-bottom: 0.1rem !important;
              }

              /* Reduce textarea height */
              textarea {
                min-height: auto !important;
                height: auto !important;
                resize: none !important;
                background: white !important;
              }

              /* Keep Defects and Notes together */
              .print\\:break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              /* Reduce line height */
              * {
                line-height: 1.2 !important;
              }

              /* Reduce checkbox/radio size */
              input[type="checkbox"], input[type="radio"] {
                width: 0.75rem !important;
                height: 0.75rem !important;
                margin: 0 !important;
              }

              /* Remove min-heights */
              * {
                min-height: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          ${form.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    // Give the browser a moment to render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto print:fixed print:top-0 print:left-0 print:right-0 print:bottom-auto print:bg-white print:z-auto print:overflow-visible print:m-0 print:p-0 print:h-auto">
      <div className="dot-inspection-print-wrapper min-h-full flex items-start justify-center p-4 print:block print:p-0 print:m-0 print:min-h-0 print:w-full print:h-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-4 print:shadow-none print:max-w-none print:my-0 print:w-full print:rounded-none print:m-0 print:p-0 print:block print:min-h-0 print:h-auto">
          {/* Header - Hidden when printing */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden sticky top-0 bg-white z-10">
            <h3 className="text-lg font-semibold text-gray-900">Annual Vehicle Inspection Report</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Print"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        {/* Form Content - Wrapped in print container */}
        <div id="annual-inspection-print-form" className="dot-inspection-print p-8 print:p-4">
          {/* Title */}
          <div className="text-center mb-6 print:mb-2">
            <h1 className="text-2xl font-bold mb-2 print:text-sm print:mb-0.5 print:leading-tight">ANNUAL VEHICLE INSPECTION REPORT</h1>
            <p className="text-sm text-gray-600 print:text-[10px] print:leading-tight">FMCSA Compliance — 49 CFR §396.17 & Appendix G</p>
          </div>

          {/* Motor Carrier and Inspector Section */}
          <div className="grid grid-cols-2 gap-6 mb-6 print:gap-2 print:mb-2">
            <div>
              <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Date of Inspection</label>
              <input
                type="date"
                value={formData.dateOfInspection}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfInspection: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">Motor Carrier</label>
              <input
                type="text"
                value={formData.motorCarrier}
                onChange={(e) => setFormData(prev => ({ ...prev, motorCarrier: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">Address</label>
              <input
                type="text"
                value={formData.motorCarrierAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, motorCarrierAddress: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">City, State, Zip</label>
              <input
                type="text"
                value={formData.inspectionCityStateZip}
                onChange={(e) => setFormData(prev => ({ ...prev, inspectionCityStateZip: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              {/* FMCSA Checkbox */}
              <div className="mt-2 print:mt-1">
                <label className="flex items-center gap-2 print:gap-1">
                  <input
                    type="checkbox"
                    checked={formData.inspectorMeetsFMCSA}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspectorMeetsFMCSA: e.target.checked }))}
                    className="w-4 h-4 print:w-3 print:h-3"
                  />
                  <span className="text-sm print:text-[10px] print:leading-tight">Inspector meets FMCSA §396.19</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Inspector Name</label>
              <input
                type="text"
                value={formData.inspectorName}
                onChange={(e) => setFormData(prev => ({ ...prev, inspectorName: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">Inspector Company</label>
              <input
                type="text"
                value={formData.inspectorCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, inspectorCompany: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">Address</label>
              <input
                type="text"
                value={formData.inspectorAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, inspectorAddress: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
              <label className="block text-xs font-semibold mb-1 mt-2 print:mb-0.5 print:mt-1 print:text-[10px]">City, State, Zip</label>
              <input
                type="text"
                value={formData.inspectorCompanyCityStateZip}
                onChange={(e) => setFormData(prev => ({ ...prev, inspectorCompanyCityStateZip: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
            </div>
          </div>

          {/* Report and Vehicle Identification */}
          <div className="grid grid-cols-3 gap-4 mb-6 print:gap-2 print:mb-2">
            <div>
              <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Report (Optional) #</label>
              <input
                type="text"
                value={formData.reportNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, reportNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Unit #</label>
              <input
                type="text"
                value={formData.unitNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">VIN</label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
              />
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="mb-6 print:mb-2">
            <label className="block text-xs font-semibold mb-2 print:mb-1 print:text-[10px]">Vehicle Type</label>
            <div className="flex items-center gap-4 print:gap-2">
              {(['Tractor', 'Trailer', 'Truck', 'Other'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 print:gap-1">
                  <input
                    type="radio"
                    name="vehicleType"
                    value={type}
                    checked={formData.vehicleType === type}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                    className="w-4 h-4 print:w-3 print:h-3"
                  />
                  <span className="text-sm print:text-[10px] print:leading-tight">{type}</span>
                </label>
              ))}
              {formData.vehicleType === 'Other' && (
                <input
                  type="text"
                  value={formData.vehicleTypeOther}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleTypeOther: e.target.value }))}
                  placeholder="Specify"
                  className="px-2 py-1 border border-gray-300 rounded text-sm flex-1 max-w-xs print:border-0 print:border-b print:rounded-none print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
                />
              )}
            </div>
          </div>

          {/* Inspection Components - Two Column Layout */}
          <div className="mb-6 print:mb-2">
            <div className="grid grid-cols-2 gap-6 print:gap-2">
              {/* Left Column */}
              <div className="space-y-4 print:space-y-1.5">
                {[
                  'brakeSystem',
                  'couplingDevices',
                  'exhaustSystem',
                  'fuelSystem',
                  'lightingDevices',
                  'safeLoading'
                ].map((key) => {
                  const component = formData.components[key as keyof typeof formData.components];
                  return (
                    <div key={key} className="border border-gray-300 rounded p-3 print:border-gray-800 print:p-2 print:rounded-none print:border">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2 print:gap-2 print:mb-2 print:border-b print:border-gray-800 print:pb-1">
                        <div className="font-semibold text-xs print:text-[9px] print:font-bold">{component.name}</div>
                        <div className="text-xs text-center print:text-[9px] print:font-semibold">Pass</div>
                        <div className="text-xs text-center print:text-[9px] print:font-semibold">Fail</div>
                      </div>
                      {component.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 text-sm py-0.5 border-t border-gray-200 print:border-gray-400 print:gap-2 print:py-0.5 print:text-[10px] print:border-t print:border-gray-300">
                          <div className="pl-2 print:pl-1">{item.name}</div>
                          <div className="text-center">
                            <input
                              type="checkbox"
                              checked={item.pass}
                              onChange={(e) => handleItemChange(key as keyof typeof formData.components, idx, 'pass', e.target.checked)}
                              className="w-4 h-4 print:w-3 print:h-3"
                            />
                          </div>
                          <div className="text-center">
                            <input
                              type="checkbox"
                              checked={item.fail}
                              onChange={(e) => handleItemChange(key as keyof typeof formData.components, idx, 'fail', e.target.checked)}
                              className="w-4 h-4 print:w-3 print:h-3"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Right Column */}
              <div className="space-y-4 print:space-y-1.5">
                {[
                  'steeringMechanism',
                  'suspension',
                  'frame',
                  'tires',
                  'wheelsRims',
                  'windshieldGlazing',
                  'windshieldWipers'
                ].map((key) => {
                  const component = formData.components[key as keyof typeof formData.components];
                  return (
                    <div key={key} className="border border-gray-300 rounded p-3 print:border-gray-800 print:p-1 print:rounded-none print:border">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2 print:gap-1 print:mb-1 print:border-b print:border-gray-800 print:pb-0.5">
                        <div className="font-semibold text-xs print:text-[8px] print:font-bold print:leading-tight">{component.name}</div>
                        <div className="text-xs text-center print:text-[8px] print:font-semibold print:leading-tight">Pass</div>
                        <div className="text-xs text-center print:text-[8px] print:font-semibold print:leading-tight">Fail</div>
                      </div>
                      {component.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 text-sm py-0.5 border-t border-gray-200 print:border-gray-400 print:gap-1 print:py-0.5 print:text-[9px] print:border-t print:border-gray-300 print:leading-tight">
                          <div className="pl-2 print:pl-0.5">{item.name}</div>
                          <div className="text-center">
                            <input
                              type="checkbox"
                              checked={item.pass}
                              onChange={(e) => handleItemChange(key as keyof typeof formData.components, idx, 'pass', e.target.checked)}
                              className="w-4 h-4 print:w-2.5 print:h-2.5"
                            />
                          </div>
                          <div className="text-center">
                            <input
                              type="checkbox"
                              checked={item.fail}
                              onChange={(e) => handleItemChange(key as keyof typeof formData.components, idx, 'fail', e.target.checked)}
                              className="w-4 h-4 print:w-2.5 print:h-2.5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Defects and Corrective Actions + Notes */}
          <div className="mb-6 print:mb-2 print:break-inside-avoid">
            <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4 print:grid-cols-[3fr_1fr] print:gap-2">
              {/* Defects and Corrective Actions - Left Column */}
              <div>
                <h3 className="font-semibold text-sm mb-2 print:text-[10px] print:mb-1 print:font-bold print:leading-tight">DEFECTS AND CORRECTIVE ACTIONS</h3>
                <textarea
                  value={formData.defectsAndCorrectiveActions}
                  onChange={(e) => setFormData(prev => ({ ...prev, defectsAndCorrectiveActions: e.target.value }))}
                  rows={6}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-gray-800 print:rows-2 print:text-[9px] print:p-1 print:border print:leading-tight print:resize-none"
                  placeholder="Enter defects and corrective actions..."
                />
              </div>
              
              {/* Notes - Right Column */}
              <div>
                <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px] print:font-bold print:leading-tight">Notes:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={6}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm print:border-gray-800 print:rows-2 print:text-[9px] print:p-1 print:border print:leading-tight print:resize-none print:bg-white"
                  placeholder="Enter notes..."
                />
              </div>
            </div>
          </div>

          {/* Certification */}
          <div className="mb-6 print:mb-2">
            <p className="text-sm mb-4 print:text-[10px] print:mb-1 print:leading-tight">
              I certify that this vehicle has passed the Annual Inspection in accordance with 49 CFR §396.17.
            </p>
            <div className="grid grid-cols-3 gap-4 print:gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Inspector Signature</label>
                <input
                  type="text"
                  value={formData.inspectorSignature}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspectorSignature: e.target.value }))}
                  className="w-full px-2 py-1 border-b border-gray-300 text-sm print:border-gray-800 print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Printed Name</label>
                <input
                  type="text"
                  value={formData.inspectorPrintedName}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspectorPrintedName: e.target.value }))}
                  className="w-full px-2 py-1 border-b border-gray-300 text-sm print:border-gray-800 print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 print:mb-0.5 print:text-[10px]">Date</label>
                <input
                  type="date"
                  value={formData.certificationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificationDate: e.target.value }))}
                  className="w-full px-2 py-1 border-b border-gray-300 text-sm print:border-gray-800 print:px-1 print:py-0.5 print:text-[10px] print:leading-tight"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8 print:mt-1 print:text-[7px] print:leading-tight">
            <p>© 2025 EZ2Invoice™. All rights reserved. Unauthorized reproduction or distribution is prohibited.</p>
          </div>
        </div>

          {/* Action Buttons - Hidden when printing */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 print:hidden sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Inspection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

