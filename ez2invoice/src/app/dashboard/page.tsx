'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Type definitions
interface WorkOrder {
  id: string;
  customer: string;
  truck: string;
  status: string;
  bay: string;
  work_order_number?: string;
  customer_id?: string;
  truck_id?: string;
  bay_id?: string;
  priority?: string;
  description?: string;
  notes?: string;
  created_at?: string;
  truck_number?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  trailer_number?: string;
  engine_type?: string;
  service_title?: string;
  estimated_hours?: number;
  mechanic?: string;
  arrival_time?: string;
}

interface WaitlistEntry {
  workOrderId: string;
  customer: string;
  truck: string;
  status: string;
  addedAt: string;
}

interface BayInfo {
  status: 'Occupied' | 'Available';
  workOrder: string | null;
  customer: string | null;
  waitlist: WaitlistEntry[];
}

interface Mechanic {
  id: string;
  full_name: string;
  role_title: string;
  duties_description: string;
  email: string;
  phone: string;
  hourly_rate: number;
  hire_date: string;
  status: 'Available' | 'Busy' | 'Vacation' | 'Off';
  vacation_weeks_per_year: number;
  vacation_weeks_used: number;
  default_start_time: string;
  default_end_time: string;
  skills: string[];
  notes: string;
  is_active: boolean;
  created_at?: string;
}

interface Timesheet {
  id: string;
  mechanic_id: string;
  mechanic_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  payment_amount: number;
  notes: string;
}
import { 
  LayoutDashboard, 
  Wrench, 
  Car, 
  ClipboardList, 
  FileText, 
  Package, 
  Clock, 
  Users, 
  UserCheck, 
  Settings, 
  BarChart3,
  DollarSign,
  Shield,
  Crown,
  Search,
  Bell,
  Plus,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Eye,
  Printer,
  Send,
  Info,
  MapPin,
  X,
  User,
  Building,
  CreditCard,
  Phone,
  Calendar,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  Heart
} from 'lucide-react';
import { useFounder } from '@/contexts/FounderContext';
import AppHeader from '@/components/AppHeader';

export default function Dashboard() {
  const { isFounder, subscriptionBypass, currentTier, canAccessFeature } = useFounder();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    customer_id: '',
    work_order_id: '',
    due_date: '',
    tax_rate: 0.06,
    notes: ''
  });
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showAddBayModal, setShowAddBayModal] = useState(false);
  const [showAddToWaitlistModal, setShowAddToWaitlistModal] = useState(false);
  const [selectedBayForWaitlist, setSelectedBayForWaitlist] = useState<string | null>(null);
  const [newBayName, setNewBayName] = useState('');
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  
  // Work order history and move modals
  const [showWorkOrderHistoryModal, setShowWorkOrderHistoryModal] = useState(false);
  const [selectedWorkOrderForHistory, setSelectedWorkOrderForHistory] = useState<WorkOrder | null>(null);
  const [showMoveWorkOrderModal, setShowMoveWorkOrderModal] = useState(false);
  const [selectedWorkOrderForMove, setSelectedWorkOrderForMove] = useState<{ workOrder: WorkOrder; currentBay: string } | null>(null);
  
  // Customers state
  interface Customer {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    company?: string | null;
    is_fleet?: boolean | null;
    created_at?: string;
  }
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState<null | Customer>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    is_fleet: false,
    company: '',
    fleet_name: '',
    enable_fleet_discounts: false
  });
  
  // Customer notes state
  interface CustomerNote {
    id: string;
    category: 'General' | 'Warning' | 'Compliment' | 'Payment Issue' | 'Loyalty';
    note: string;
  }
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNote, setNewNote] = useState({ category: 'General' as CustomerNote['category'], note: '' });
  
  // Customer notes for edit modal
  const [editCustomerNotes, setEditCustomerNotes] = useState<CustomerNote[]>([]);
  const [editingNote, setEditingNote] = useState<CustomerNote | null>(null);

  // Fleet management modals
  const [showFleetModal, setShowFleetModal] = useState<null | Customer>(null);
  const [fleetTrucks, setFleetTrucks] = useState<any[]>([]);
  const [fleetDiscounts, setFleetDiscounts] = useState<any[]>([]);
  
  // Fleet form data for Add Customer modal
  const [addCustomerFleetTrucks, setAddCustomerFleetTrucks] = useState<any[]>([]);
  const [addCustomerFleetDiscounts, setAddCustomerFleetDiscounts] = useState<any[]>([]);
  const [showAddTruckModal, setShowAddTruckModal] = useState(false);
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [newTruckForm, setNewTruckForm] = useState({ unit_no: '', vin: '', year: '', make: '', model: '', notes: '' });
  const [newDiscountForm, setNewDiscountForm] = useState({ scope: 'labor' as 'labor'|'labor_type', labor_item_id: '', labor_type: '', discount_type: 'percentage' as 'percentage'|'fixed', percent_off: 0, fixed_amount: 0, notes: '' });

  // Load fleet data when Fleet modal opens
  useEffect(() => {
    if (showFleetModal) {
      (async () => {
        try {
          const customerId = showFleetModal.id;
          const { data: trucks } = await supabase
            .from('fleet_trucks')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
          setFleetTrucks(trucks || []);

          const { data: discounts } = await supabase
            .from('fleet_discounts')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
          setFleetDiscounts(discounts || []);
        } catch (e) {
          console.error('Error loading fleet data:', e);
        }
      })();
    } else {
      setFleetTrucks([]);
      setFleetDiscounts([]);
    }
  }, [showFleetModal]);
  const [truckForm, setTruckForm] = useState({ unit_no:'', vin:'', year:'', make:'', model:'', notes:'' });
  const [discountForm, setDiscountForm] = useState({ scope:'labor' as 'labor'|'labor_type', labor_item_id:'', labor_type:'', percent_off:0 });
  
  // Mechanics state
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [showAddMechanicModal, setShowAddMechanicModal] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [mechanicsSubTab, setMechanicsSubTab] = useState('team'); // 'team' or 'timesheets'
  const [showWeekSettingsModal, setShowWeekSettingsModal] = useState(false);
  const [weekSettings, setWeekSettings] = useState({
    weekStart: 'Monday',
    weekEnd: 'Friday'
  });
  const [selectedWeekRange, setSelectedWeekRange] = useState<{ start: Date; end: Date } | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState<string>('This week');
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [timesheetMechanicFilter, setTimesheetMechanicFilter] = useState<string>('all'); // 'all' or mechanic ID
  const [mechanicFormData, setMechanicFormData] = useState({
    full_name: '',
    role_title: '',
    duties_description: '',
    email: '',
    phone: '',
    hourly_rate: 25,
    hire_date: '',
    status: 'Available' as 'Available' | 'Busy' | 'Vacation' | 'Off',
    vacation_weeks_per_year: 2,
    vacation_weeks_used: 0,
    default_start_time: '08:30',
    default_end_time: '17:30',
    skills: [] as string[],
    notes: '',
    is_active: true
  });
  const [timesheetFormData, setTimesheetFormData] = useState({
    mechanic_id: '',
    work_date: '',
    start_time: '',
    end_time: '',
    notes: '',
    useFullHours: false
  });
  const [selectedMechanicIds, setSelectedMechanicIds] = useState<string[]>([]);
  const [mechanicSearchTerm, setMechanicSearchTerm] = useState('');
  
  // Initialize work orders as empty array, will be populated from Supabase
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    customerId: '', // Store customer ID for fleet truck lookup
    truckNumber: '',
    vin: '',
    makeModel: '',
    trailerNumber: '',
    engineType: '',
    serviceTitle: '',
    description: '',
    priority: 'Normal',
    hours: 2,
    minutes: 0,
    mechanic: '',
    arrivalTime: '',
    selectedBay: ''
  });

  // Fleet trucks for selected customer
  const [selectedCustomerFleetTrucks, setSelectedCustomerFleetTrucks] = useState<any[]>([]);
  const [selectedFleetTruck, setSelectedFleetTruck] = useState<string>('');
  
  // Customer notes for work order creation
  const [selectedCustomerNotes, setSelectedCustomerNotes] = useState<CustomerNote[]>([]);

  // Bay status management - initialize empty, will be loaded from Supabase
  const [bayStatus, setBayStatus] = useState<Record<string, BayInfo>>({});
  const [serviceBays, setServiceBays] = useState<any[]>([]);
  const [baysLoading, setBaysLoading] = useState(false);

  // Labor state
  interface LaborItem {
    id: string;
    user_id?: string | null;
    service_name: string;
    category: string | null;
    description: string | null;
    rate_type: 'fixed' | 'hourly';
    rate: number;
    est_hours: number | null;
    created_at?: string;
  }
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborQuery, setLaborQuery] = useState('');
  const [laborRateFilter, setLaborRateFilter] = useState<'all'|'fixed'|'hourly'>('all');
  const [laborCategoryFilter, setLaborCategoryFilter] = useState<string>('All');
  const [showAddLaborModal, setShowAddLaborModal] = useState(false);
  const [editLaborItem, setEditLaborItem] = useState<LaborItem | null>(null);
  const [laborForm, setLaborForm] = useState({
    service_name: '',
    category: '',
    description: '',
    rate_type: 'hourly' as 'fixed'|'hourly',
    rate: 0,
    est_hours: '' as string | ''
  });

  // Inventory state (uses public.parts table from database-schema.sql)
  interface InventoryItem {
    id: string;
    part_number: string | null;
    part_name: string;
    description: string | null;
    category: string | null;
    supplier: string | null;
    location?: string | null;
    quantity_in_stock: number;
    minimum_stock_level: number;
    selling_price: number;
    cost: number | null;
    created_at?: string;
  }
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('All');
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<null | InventoryItem>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<null | InventoryItem>(null);
  const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);
  const [inventoryHistoryLoading, setInventoryHistoryLoading] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: '',
    description: '',
    sku: '',
    supplier: '',
    location: '',
    quantity: 0,
    min_stock: 0,
    unit_price: 0,
    cost: 0
  });
  const [adjustForm, setAdjustForm] = useState({
    type: '',
    change: '' as string | '',
    reason: '',
    notes: ''
  });

  // Estimates state
  interface Estimate { 
    id: string; 
    estimate_number: string | null; 
    status: string; 
    total_amount: number; 
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    notes?: string | null;
    created_at?: string;
    valid_until?: string;
    customer_id?: string;
    shop_id?: string;
    customer?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | null;
  }
  interface EstimateItem { item_type: 'labor'|'part'|'fee'; reference_id?: string | null; description: string; quantity: number; unit_price: number; total_price: number; }
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  
  // Invoice state
  interface Invoice {
    id: string;
    invoice_number: string | null;
    status: string;
    total_amount: number;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    created_at?: string;
    due_date?: string;
    customer_id?: string;
    shop_id?: string;
    customer?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | null;
  }
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showCreateEstimateModal, setShowCreateEstimateModal] = useState(false);
  const [estimateCustomerId, setEstimateCustomerId] = useState('');
  const [estimateValidUntil, setEstimateValidUntil] = useState('');
  const [estimateTaxRate, setEstimateTaxRate] = useState(6);
  const [estimateNotes, setEstimateNotes] = useState('');
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([ { item_type: 'labor', description: '', quantity: 1, unit_price: 0, total_price: 0 } ]);
  const estimateSubtotal = estimateItems.reduce((s,i)=> s + (i.quantity * i.unit_price), 0);
  const estimateTaxAmount = +(estimateSubtotal * (estimateTaxRate/100)).toFixed(2);
  const estimateTotal = +(estimateSubtotal + estimateTaxAmount).toFixed(2);
  const [estimateSearchQuery, setEstimateSearchQuery] = useState('');
  const [estimateStatusFilter, setEstimateStatusFilter] = useState('all');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showViewEstimateModal, setShowViewEstimateModal] = useState(false);
  const [estimateLineItems, setEstimateLineItems] = useState<any[]>([]);

  const fetchEstimates = async () => {
    setEstimatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone, company)
        `)
        .order('created_at', { ascending: false });
      
      // Ensure shop_id is included in the data
      if (data) {
        data.forEach((est: any) => {
          if (!est.shop_id) {
            // shop_id might not be in the select, but it should be in *
            // This is just a safety check
          }
        });
      }
      if (data) setEstimates(data as unknown as Estimate[]);

      if (error) {
        // Check if error object stringifies to empty object first
        const errorStringified = JSON.stringify(error);
        const isEmptyErrorObject = errorStringified === '{}' || errorStringified === 'null';
        
        // Check if it's a table not found error (common during development)
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error as any)?.message || '';
        const hasTableNotFoundError =
          errorCode === 'PGRST116' ||
          errorMessage.includes('relation "estimates" does not exist') ||
          errorMessage.includes('table "estimates" does not exist') ||
          errorCode === '42P01';
        
        // If error is empty object or has no meaningful code/message, treat as empty error
        const isActuallyEmpty = isEmptyErrorObject || (!errorCode && !errorMessage && Object.keys(error as any).length === 0);
        
        if (isActuallyEmpty || hasTableNotFoundError) {
          // Silently handle empty errors and table-not-found errors (expected during development)
        } else {
          // Only log actual unexpected errors with meaningful content
          const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
          if (hasMeaningfulError) {
            console.error('Error fetching estimates:', error);
          }
        }
        // Soft fallback: keep empty list in UI
      }
    } catch (e) {
      console.error('fetchEstimates', e);
    } finally {
      setEstimatesLoading(false);
    }
  };
  useEffect(()=>{ fetchEstimates(); },[]);

  // Fetch invoices from Supabase
  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone, company)
        `)
        .order('created_at', { ascending: false });
      
      if (data) setInvoices(data as unknown as Invoice[]);

      if (error) {
        const errorStringified = JSON.stringify(error);
        const isEmptyErrorObject = errorStringified === '{}' || errorStringified === 'null';
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error as any)?.message || '';
        const hasTableNotFoundError =
          errorCode === 'PGRST116' ||
          errorMessage.includes('relation "invoices" does not exist') ||
          errorMessage.includes('table "invoices" does not exist') ||
          errorCode === '42P01';
        
        const isActuallyEmpty = isEmptyErrorObject || (!errorCode && !errorMessage && Object.keys(error as any).length === 0);
        
        if (isActuallyEmpty || hasTableNotFoundError) {
          // Silently handle empty errors and table-not-found errors
        } else {
          const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
          if (hasMeaningfulError) {
            console.error('Error fetching invoices:', error);
          }
        }
      }
    } catch (e) {
      console.error('fetchInvoices', e);
    } finally {
      setInvoicesLoading(false);
    }
  };
  
  useEffect(() => { fetchInvoices(); }, []);

  // Function to view estimate details
  const handleViewEstimate = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    try {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimate.id)
        .order('created_at', { ascending: true });
      if (data) {
        setEstimateLineItems(data);
      }
      if (error) {
        console.error('Error fetching estimate line items:', error);
      }
    } catch (e) {
      console.error('Error fetching estimate line items:', e);
    }
    setShowViewEstimateModal(true);
  };

  // Function to print estimate
  const handlePrintEstimate = async (estimate: Estimate) => {
    try {
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimate.id);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const customerName = estimate.customer 
        ? [estimate.customer.first_name, estimate.customer.last_name].filter(Boolean).join(' ') || estimate.customer.company || 'Unknown'
        : 'No Customer';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Estimate ${estimate.estimate_number || estimate.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; }
            .info { margin-bottom: 30px; }
            .info-row { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ESTIMATE</h1>
            <div class="info-row"><strong>Estimate #:</strong> ${estimate.estimate_number || estimate.id.slice(0, 8)}</div>
            <div class="info-row"><strong>Date:</strong> ${estimate.created_at ? new Date(estimate.created_at).toLocaleDateString() : '—'}</div>
            ${estimate.valid_until ? `<div class="info-row"><strong>Valid Until:</strong> ${new Date(estimate.valid_until).toLocaleDateString()}</div>` : ''}
          </div>
          <div class="info">
            <h3>Customer Information</h3>
            <div class="info-row"><strong>Name:</strong> ${customerName}</div>
            ${estimate.customer?.email ? `<div class="info-row"><strong>Email:</strong> ${estimate.customer.email}</div>` : ''}
            ${estimate.customer?.phone ? `<div class="info-row"><strong>Phone:</strong> ${estimate.customer.phone}</div>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(lineItems || []).map((item: any) => `
                <tr>
                  <td>${item.description || '—'}</td>
                  <td>${item.quantity || 0}</td>
                  <td>$${(item.unit_price || 0).toFixed(2)}</td>
                  <td>$${(item.total_price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                <td><strong>$${(estimate.subtotal || 0).toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right;"><strong>Tax (${((estimate.tax_rate || 0) * 100).toFixed(2)}%):</strong></td>
                <td><strong>$${(estimate.tax_amount || 0).toFixed(2)}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                <td><strong>$${(estimate.total_amount || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          ${estimate.notes ? `<div class="footer"><strong>Notes:</strong><br>${estimate.notes}</div>` : ''}
          <div class="footer">
            <p><strong>Status:</strong> ${estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (e) {
      console.error('Error printing estimate:', e);
      alert('Error printing estimate');
    }
  };

  // Function to generate estimate email HTML
  const generateEstimateEmailHTML = async (estimate: Estimate, baseUrl?: string) => {
    // Fetch line items
    const { data: lineItems } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', estimate.id);

    const customerName = estimate.customer 
      ? [estimate.customer.first_name, estimate.customer.last_name].filter(Boolean).join(' ') || estimate.customer.company || 'Valued Customer'
      : 'Valued Customer';

    const estimateNumber = estimate.estimate_number || estimate.id.slice(0, 8);
    const estimateDate = estimate.created_at ? new Date(estimate.created_at).toLocaleDateString() : '—';
    const validUntil = estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : '—';
    
    // Get the base URL for the acceptance link
    // Use provided baseUrl, or environment variable, or window.location, or fallback
    const siteUrl = baseUrl || 
                    (typeof window !== 'undefined' ? window.location.origin : null) ||
                    process.env.NEXT_PUBLIC_SITE_URL || 
                    'http://localhost:3000';
    const acceptUrl = `${siteUrl}/estimate/${estimate.id}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate ${estimateNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 10px 0;">ESTIMATE</h1>
          <p style="margin: 5px 0;"><strong>Estimate #:</strong> ${estimateNumber}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${estimateDate}</p>
          ${estimate.valid_until ? `<p style="margin: 5px 0;"><strong>Valid Until:</strong> ${validUntil}</p>` : ''}
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Customer Information</h2>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${customerName}</p>
          ${estimate.customer?.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${estimate.customer.email}</p>` : ''}
          ${estimate.customer?.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${estimate.customer.phone}</p>` : ''}
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Line Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Quantity</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Unit Price</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(lineItems || []).map((item: any) => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.description || '—'}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${item.quantity || 0}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${(item.unit_price || 0).toFixed(2)}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${(item.total_price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f9fafb;">
                <td colspan="3" style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>Subtotal:</strong></td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>$${(estimate.subtotal || 0).toFixed(2)}</strong></td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td colspan="3" style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>Tax (${((estimate.tax_rate || 0) * 100).toFixed(2)}%):</strong></td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>$${(estimate.tax_amount || 0).toFixed(2)}</strong></td>
              </tr>
              <tr style="background-color: #dbeafe; font-size: 18px;">
                <td colspan="3" style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>Total:</strong></td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>$${(estimate.total_amount || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        ${estimate.notes ? `
          <div style="margin-bottom: 20px;">
            <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Notes</h2>
            <p style="white-space: pre-wrap;">${estimate.notes}</p>
          </div>
        ` : ''}

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2563eb;">
          <p style="margin: 0;"><strong>Status:</strong> ${estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}</p>
          <p style="margin: 10px 0 0 0;">Please review this estimate and let us know if you have any questions.</p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; text-align: center;">
          <h2 style="color: #15803d; margin: 0 0 15px 0; font-size: 20px;">Review & Accept Your Estimate</h2>
          <p style="color: #166534; margin: 0 0 20px 0;">Click the button below to view and accept this estimate online:</p>
          <a href="${acceptUrl}" 
             style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            View & Accept Estimate
          </a>
          <p style="color: #166534; margin: 15px 0 0 0; font-size: 12px;">Or copy and paste this link into your browser:</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 11px; word-break: break-all;">${acceptUrl}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from EZ2Invoice. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  };

  // Function to send estimate to customer
  const handleSendEstimate = async (estimate: Estimate) => {
    if (!confirm(`Send estimate ${estimate.estimate_number || estimate.id.slice(0, 8)} to customer?`)) {
      return;
    }

    if (!estimate.customer?.email) {
      alert('Cannot send estimate: Customer email is missing.');
      return;
    }

    try {
      // Get the base URL for the acceptance link (from client-side)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 
                      process.env.NEXT_PUBLIC_SITE_URL || 
                      'http://localhost:3000';
      
      // Generate email HTML with the correct base URL
      const emailHTML = await generateEstimateEmailHTML(estimate, baseUrl);
      const estimateNumber = estimate.estimate_number || estimate.id.slice(0, 8);
      
      // Send email via API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: estimate.customer.email,
          subject: `Estimate ${estimateNumber} from EZ2Invoice`,
          html: emailHTML,
          type: 'estimate',
          estimateId: estimate.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Update estimate status
      const { error } = await supabase
        .from('estimates')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', estimate.id);
      
      if (error) {
        console.error('Error updating estimate status:', error);
        // Email was sent but status update failed - still show success
      }
      
      alert('Estimate sent to customer successfully!');
      fetchEstimates();
    } catch (e: any) {
      console.error('Error sending estimate:', e);
      alert(`Error sending estimate: ${e.message || 'Please try again.'}`);
    }
  };

  // Function to convert estimate to invoice
  const handleConvertToInvoice = async (estimate: Estimate) => {
    if (!confirm(`Convert estimate ${estimate.estimate_number || estimate.id.slice(0, 8)} to invoice?`)) {
      return;
    }
    
    if (!estimate.customer_id) {
      alert('Cannot convert estimate: No customer associated.');
      return;
    }

    try {
      // Get shop_id - first try from estimate, then from user's shop
      let shopId = estimate.shop_id;
      
      if (!shopId) {
        // Get shop_id from user's truck_shops
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data: shopData } = await supabase
            .from('truck_shops')
            .select('id')
            .eq('user_id', userData.user.id)
            .limit(1)
            .single();
          
          shopId = shopData?.id || null;
        }
      }

      if (!shopId) {
        console.warn('No shop_id found, attempting to create invoice without it (RLS may handle it)');
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          shop_id: shopId || null,
          customer_id: estimate.customer_id,
          invoice_number: invoiceNumber,
          status: 'pending',
          subtotal: estimate.subtotal || 0,
          tax_rate: estimate.tax_rate || 0,
          tax_amount: estimate.tax_amount || 0,
          total_amount: estimate.total_amount || 0,
          notes: estimate.notes || null,
        })
        .select('id')
        .single();

      if (invoiceError || !invoiceData) {
        console.error('Error creating invoice:', invoiceError);
        const errorMessage = invoiceError?.message || 
                            invoiceError?.details || 
                            invoiceError?.hint || 
                            JSON.stringify(invoiceError) || 
                            'Unknown error';
        console.error('Full error details:', {
          error: invoiceError,
          shopId,
          customerId: estimate.customer_id,
          invoiceNumber
        });
        alert(`Error creating invoice: ${errorMessage}. Please check the console for more details.`);
        return;
      }

      // Fetch estimate line items
      const { data: lineItems, error: itemsError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimate.id);

      if (itemsError) {
        console.error('Error fetching estimate line items:', itemsError);
        alert('Error fetching estimate line items. Invoice created but without line items.');
        return;
      }

      // Create invoice line items
      if (lineItems && lineItems.length > 0) {
        const invoiceLineItems = lineItems.map((item: any) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          item_type: item.item_type || 'service',
        }));

        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(invoiceLineItems);

        if (lineItemsError) {
          console.error('Error creating invoice line items:', lineItemsError);
          alert('Invoice created but there was an error adding line items.');
          return;
        }
      }

      // Update estimate status to indicate it was converted
      await supabase
        .from('estimates')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', estimate.id);

      alert(`Estimate converted to invoice ${invoiceNumber} successfully!`);
      fetchEstimates();
      fetchInvoices(); // Refresh invoices list
      // Optionally switch to invoices tab
      // setActiveTab('invoices');
    } catch (e) {
      console.error('Error converting estimate to invoice:', e);
      alert('Error converting estimate to invoice. Please try again.');
    }
  };

  // Helper function to get shop_id, create one if it doesn't exist
  const getShopId = async (): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id || !userData?.user?.email) {
        console.error('No user found or missing email');
        return null;
      }
      
      const authUserId = userData.user.id;
      const userEmail = userData.user.email;
      
      // First, try to use the setup_user_shop() function if it exists
      try {
        const { data: shopIdFromFunction, error: functionError } = await supabase
          .rpc('setup_user_shop');
        
        if (!functionError && shopIdFromFunction) {
          return shopIdFromFunction as string;
        }
        // If function doesn't exist or fails, continue with manual approach
      } catch (rpcError) {
        // Function might not exist, continue with manual approach
        console.log('setup_user_shop function not available, using manual approach');
      }
      
      // Manual approach: Check if user exists in public.users
      let publicUserId = authUserId; // Default to auth user ID
      
      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();
      
      // If user doesn't exist in public.users, try to create one
      if (!existingUser) {
        const { data: newUser, error: userCreateError } = await supabase
          .from('users')
          .insert({
            id: authUserId,
            email: userEmail,
            plan_type: 'starter'
          })
          .select('id')
          .single();
        
        if (userCreateError) {
          // Check if it's an RLS error (empty object or specific error codes)
          const isEmptyError = !userCreateError || 
            (typeof userCreateError === 'object' && 
             Object.keys(userCreateError).length === 0) ||
            JSON.stringify(userCreateError) === '{}';
          
          const errorCode = (userCreateError as any)?.code || '';
          const errorMessage = (userCreateError as any)?.message || '';
          
          if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorMessage?.includes('policy')) {
            console.error('❌ RLS Policy Error: Cannot create user in public.users table.');
            console.error('SOLUTION: Run create-shop-setup.sql or create-shop-setup-v2.sql in your Supabase SQL Editor.');
            console.error('This will add the necessary INSERT policy for the users table.');
            // Don't return null yet - try to continue and see if shop exists
      } else {
            console.error('Error creating user in public.users:', userCreateError);
          }
          // Try to continue anyway - shop might already exist
        } else if (newUser?.id) {
          publicUserId = newUser.id;
        }
      } else {
        publicUserId = existingUser.id;
      }
      
      // Try to get existing shop
      const { data: shopData, error: fetchError } = await supabase
        .from('truck_shops')
        .select('id')
        .eq('user_id', publicUserId)
        .limit(1)
        .maybeSingle();
      
      if (shopData?.id) {
        return shopData.id;
      }
      
      // If no shop exists, try to create one
      if (!shopData) {
        // Get user email for shop name
        const shopName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') + ' Shop';
        
        const { data: newShop, error: createError } = await supabase
          .from('truck_shops')
          .insert({
            user_id: publicUserId,
            shop_name: shopName,
            plan_type: 'starter',
            is_active: true
          })
          .select('id')
          .single();
        
        if (createError) {
          // Check if it's an RLS error
          const isEmptyError = !createError || 
            (typeof createError === 'object' && 
             Object.keys(createError).length === 0) ||
            JSON.stringify(createError) === '{}';
          
          const errorCode = (createError as any)?.code || '';
          const errorMessage = (createError as any)?.message || '';
          
          if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorMessage?.includes('policy')) {
            console.error('❌ RLS Policy Error: Cannot create shop in truck_shops table.');
            console.error('SOLUTION: Run create-shop-setup.sql or create-shop-setup-v2.sql in your Supabase SQL Editor.');
            console.error('This will set up your shop and add necessary RLS policies.');
      } else {
            console.error('Error creating shop:', createError);
            const errorMsg = errorMessage || JSON.stringify(createError);
            console.error('Shop creation error details:', errorMsg);
          }
          
          return null;
        }
        
        if (newShop?.id) {
          return newShop.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting shop_id:', error);
      return null;
    }
  };

  // Fetch work orders from Supabase
  const fetchWorkOrders = async () => {
    setWorkOrdersLoading(true);
    try {
      const shopId = await getShopId();
      if (!shopId) {
        console.warn('No shop_id found, skipping work orders fetch');
        setWorkOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers (first_name, last_name, email, phone),
          trucks (make, model, vin, license_plate, year),
          service_bays (bay_name, bay_number)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work orders:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        setWorkOrders([]);
        return;
      }

      // Transform Supabase data to WorkOrder format
      // Sort by created_at ascending to assign sequential numbers (oldest = 1)
      const sortedData = [...(data || [])].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB; // Oldest first
      });
      
      const transformedWorkOrders: WorkOrder[] = sortedData.map((wo: any, index: number) => {
        // Generate sequential work order number (1, 2, 3, etc.)
        const sequentialNumber = index + 1;
        const workOrderNumber = `Work Order ${sequentialNumber}`;
        
        // Extract service title and description from the description field
        // Format is usually "Service Title - Description" or just "Service Title"
        const descriptionParts = wo.description ? wo.description.split(' - ') : [];
        const serviceTitle = descriptionParts[0] || wo.description || '';
        const description = descriptionParts.length > 1 ? descriptionParts.slice(1).join(' - ') : '';
        
        return {
          id: wo.id,
          customer: wo.customers ? `${wo.customers.first_name || ''} ${wo.customers.last_name || ''}`.trim() : 'Unknown',
          truck: wo.trucks ? `${wo.trucks.make || ''} ${wo.trucks.model || ''}`.trim() : 'Unknown',
          status: wo.status || 'pending',
          bay: wo.service_bays ? (wo.service_bays.bay_name || `Bay ${wo.service_bays.bay_number}`) : 'Bay TBD',
          work_order_number: workOrderNumber,
          customer_id: wo.customer_id,
          truck_id: wo.truck_id,
          bay_id: wo.bay_id,
          priority: wo.priority,
          description: description || wo.description || '',
          notes: wo.notes || '',
          created_at: wo.created_at,
          // Use license_plate field for truck number (displayed as "Truck #"), NOT VIN
          truck_number: (wo.trucks?.license_plate || '').trim(),
          // Debug: log truck number retrieval
          // console.log('Work Order', wo.id, 'truck_number:', (wo.trucks?.license_plate || '').trim(), 'trucks:', wo.trucks),
          vin: wo.trucks?.vin || '',
          make: wo.trucks?.make || '',
          model: wo.trucks?.model || '',
          year: wo.trucks?.year || null,
          estimated_hours: wo.estimated_hours || null,
          service_title: serviceTitle
        };
      });
      
      // Re-sort by created_at descending for display (newest first)
      transformedWorkOrders.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Newest first
      });

      // Debug logging
      console.log('Transformed work orders:', transformedWorkOrders);
      transformedWorkOrders.forEach((wo, idx) => {
        console.log(`Work Order ${idx + 1}:`, {
          id: wo.id,
          work_order_number: wo.work_order_number,
          truck_number: wo.truck_number,
          truck_id: wo.truck_id,
          created_at: wo.created_at,
          customer: wo.customer,
          truck: wo.truck,
          bay_id: wo.bay_id,
          raw_trucks_data: (data || [])[idx]?.trucks
        });
        if (!wo.truck_number || wo.truck_number.trim() === '') {
          console.warn(`⚠️ Work Order ${wo.work_order_number} (${wo.id}) has no truck_number!`, {
            truck_id: wo.truck_id,
            trucks_data: (data || [])[idx]?.trucks
          });
        }
      });

      setWorkOrders(transformedWorkOrders);
    } catch (error) {
      console.error('Error in fetchWorkOrders:', error);
      setWorkOrders([]);
    } finally {
      setWorkOrdersLoading(false);
    }
  };

  // Fetch service bays from Supabase
  const fetchServiceBays = async () => {
    setBaysLoading(true);
    try {
      const shopId = await getShopId();
      if (!shopId) {
        // Try to fetch without shop_id filter (RLS might allow it)
        const { data, error } = await supabase
          .from('service_bays')
          .select('*')
          .order('bay_number', { ascending: true });
        
        if (data) {
          setServiceBays(data || []);
          // Transform to bayStatus format
          const bayStatusMap: Record<string, BayInfo> = {};
          (data || []).forEach((bay: any) => {
            const bayName = bay.bay_name || `Bay ${bay.bay_number}`;
            bayStatusMap[bayName] = {
              status: bay.is_available ? 'Available' : 'Occupied',
              workOrder: null,
              customer: null,
              waitlist: []
            };
          });
          setBayStatus(bayStatusMap);
        } else {
          setServiceBays([]);
          setBayStatus({});
        }
        return;
      }

      const { data, error } = await supabase
        .from('service_bays')
        .select('*')
        .eq('shop_id', shopId)
        .order('bay_number', { ascending: true });

      if (error) {
        console.error('Error fetching service bays:', error);
        setServiceBays([]);
        setBayStatus({});
        return;
      }

      setServiceBays(data || []);

      // Transform to bayStatus format
      const bayStatusMap: Record<string, BayInfo> = {};
      (data || []).forEach((bay: any) => {
        const bayName = bay.bay_name || `Bay ${bay.bay_number}`;
        bayStatusMap[bayName] = {
          status: bay.is_available ? 'Available' : 'Occupied',
          workOrder: null, // Will be updated when we fetch work orders
          customer: null,
          waitlist: []
        };
      });

      // Update bay status with work order assignments
      // Use the workOrders state array to get consistent work order numbers
      console.log('fetchServiceBays - workOrders state:', workOrders);
      console.log('fetchServiceBays - workOrders length:', workOrders.length);
      
      workOrders.forEach((wo) => {
        if (wo.bay_id) {
          const bay = data?.find((b: any) => b.id === wo.bay_id);
          if (bay) {
            const bayName = bay.bay_name || `Bay ${bay.bay_number}`;
            if (bayStatusMap[bayName]) {
              bayStatusMap[bayName].status = wo.status?.toLowerCase() === 'completed' ? 'Available' : 'Occupied';
              // Use the work order number from the workOrders array (already has sequential numbers)
              const workOrderNumber = wo.work_order_number || wo.id;
              console.log(`Setting bay ${bayName} workOrder to: ${workOrderNumber} (from work order: ${wo.id})`);
              bayStatusMap[bayName].workOrder = workOrderNumber;
              bayStatusMap[bayName].customer = wo.customer || null;
            }
          }
        }
      });
      
      console.log('Bay status map after update:', bayStatusMap);

      setBayStatus(bayStatusMap);
    } catch (error) {
      console.error('Error in fetchServiceBays:', error);
      setServiceBays([]);
      setBayStatus({});
    } finally {
      setBaysLoading(false);
    }
  };

  // Load data from Supabase on mount
  useEffect(() => {
    fetchWorkOrders();
    fetchServiceBays();
    
    // Load week settings from localStorage
    if (typeof window !== 'undefined') {
      const savedWeekSettings = localStorage.getItem('ez2invoice-week-settings');
      if (savedWeekSettings) {
        setWeekSettings(JSON.parse(savedWeekSettings));
      }
    }
  }, []);

  // Refetch bays when workOrders changes to update work order numbers
  useEffect(() => {
    if (workOrders.length > 0) {
      fetchServiceBays();
    }
  }, [workOrders.length]);

  // Calculate current week range based on settings
  const getCurrentWeekRange = (): { start: Date; end: Date } => {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };

    const today = new Date();
    const currentDay = today.getDay();
    const weekStartDay = dayMap[weekSettings.weekStart];
    const weekEndDay = dayMap[weekSettings.weekEnd];

    // Find the most recent week start
    let daysToSubtract = (currentDay - weekStartDay + 7) % 7;
    if (daysToSubtract === 0 && currentDay !== weekStartDay) {
      daysToSubtract = 7;
    }
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    // Calculate days to add to reach week end
    let daysToAdd = (weekEndDay - weekStartDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + daysToAdd);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
  };

  // Get date range based on selected option
  const getDateRangeForOption = (option: string): { start: Date; end: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (option) {
      case 'Today': {
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start: today, end };
      }
      case 'This week': {
        return getCurrentWeekRange();
      }
      case 'This month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'Last week': {
        const currentWeek = getCurrentWeekRange();
        const start = new Date(currentWeek.start);
        start.setDate(start.getDate() - 7);
        const end = new Date(currentWeek.start);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'Last month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'Custom': {
        if (customDateRange && customDateRange.start && customDateRange.end) {
          // Parse date strings (YYYY-MM-DD) without timezone conversion
          const startParts = customDateRange.start.split('-').map(Number);
          const endParts = customDateRange.end.split('-').map(Number);
          
          if (startParts.length === 3 && endParts.length === 3) {
            const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
            end.setHours(23, 59, 59, 999);
            
            return { start, end };
          }
        }
        return getCurrentWeekRange();
      }
      default:
        return getCurrentWeekRange();
    }
  };

  // Format date as MM/DD/YYYY
  const formatDate = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get display text for date range
  const getDateRangeDisplay = (): string => {
    const range = getDateRangeForOption(dateRangeOption);
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  // Filter timesheets by selected date range and mechanic
  const getFilteredTimesheets = (): Timesheet[] => {
    const range = getDateRangeForOption(dateRangeOption);
    
    // Normalize range dates to start of day (midnight)
    const rangeStart = new Date(range.start);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(range.end);
    rangeEnd.setHours(23, 59, 59, 999); // Include the entire end date
    
    return timesheets.filter(t => {
      // Filter by mechanic if one is selected
      if (timesheetMechanicFilter !== 'all' && t.mechanic_id !== timesheetMechanicFilter) {
        return false;
      }
      
      // Parse work_date string (YYYY-MM-DD) without timezone conversion
      // This prevents timezone issues that can shift dates
      const dateParts = t.work_date.split('-').map(Number);
      if (dateParts.length !== 3) return false;
      
      const workDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      workDate.setHours(0, 0, 0, 0);
      
      // Compare dates (workDate should be >= rangeStart and <= rangeEnd)
      return workDate >= rangeStart && workDate <= rangeEnd;
    });
  };

  // Fetch mechanics from Supabase
  useEffect(() => {
    fetchMechanics();
  }, []);

  // Fetch labor items
  const fetchLaborItems = async () => {
    setLaborLoading(true);
    try {
      const { data, error } = await supabase
        .from('labor_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setLaborItems(data as unknown as LaborItem[]);
      if (error) console.error('Error fetching labor items:', error);
    } catch (err) {
      console.error('Error in fetchLaborItems:', err);
    } finally {
      setLaborLoading(false);
    }
  };

  useEffect(() => {
    fetchLaborItems();
  }, []);

  // Fetch inventory (parts)
  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setInventory(data as unknown as InventoryItem[]);
      if (error) console.error('Error fetching inventory:', error);
    } catch (err) {
      console.error('Error in fetchInventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Fetch inventory history for a specific part
  const fetchInventoryHistory = async (partId: string) => {
    setInventoryHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('part_id', partId)
        .order('created_at', { ascending: false });
      if (data) setInventoryHistory(data || []);
      if (error) console.error('Error fetching inventory history:', error);
    } catch (err) {
      console.error('Error in fetchInventoryHistory:', err);
    } finally {
      setInventoryHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setCustomers(data as unknown as Customer[]);
      if (error) console.error('Error fetching customers:', error);
    } catch (err) {
      console.error('Error in fetchCustomers:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch customer notes when Edit Customer modal opens
  useEffect(() => {
    if (showEditCustomerModal?.id) {
      const fetchEditCustomerNotes = async () => {
        try {
          const { data: notesData, error: notesError } = await supabase
            .from('customer_notes')
            .select('*')
            .eq('customer_id', showEditCustomerModal.id)
            .order('created_at', { ascending: false });
          
          if (notesError) {
            console.error('Error fetching customer notes for edit:', notesError);
            setEditCustomerNotes([]);
          } else if (notesData && notesData.length > 0) {
            setEditCustomerNotes(notesData.map((note: any) => ({
              id: note.id,
              category: note.category || 'General',
              note: note.note || ''
            })));
          } else {
            setEditCustomerNotes([]);
          }
        } catch (error) {
          console.error('Exception fetching customer notes for edit:', error);
          setEditCustomerNotes([]);
        }
      };
      
      fetchEditCustomerNotes();
    } else {
      setEditCustomerNotes([]);
    }
  }, [showEditCustomerModal]);

  // Fetch timesheets from Supabase
  useEffect(() => {
    if (mechanicsSubTab === 'timesheets') {
      fetchTimesheets();
    }
  }, [mechanicsSubTab]);

  // Data fetching functions
  const fetchMechanics = async () => {
    try {
      const { data, error } = await supabase
        .from('mechanics')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setMechanics(data);
      }
      if (error) {
        // Check if error object stringifies to empty object first
        const errorStringified = JSON.stringify(error);
        const isEmptyErrorObject = errorStringified === '{}' || errorStringified === 'null';
        
        // Check if it's a table not found error (common during development)
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error as any)?.message || '';
        const hasTableNotFoundError = 
          errorCode === 'PGRST116' || 
          errorMessage.includes('relation "mechanics" does not exist') ||
          errorMessage.includes('table "mechanics" does not exist') ||
          errorCode === '42P01'; // PostgreSQL error: relation does not exist
        
        // If error is empty object or has no meaningful code/message, treat as empty error
        const isActuallyEmpty = isEmptyErrorObject || (!errorCode && !errorMessage && Object.keys(error as any).length === 0);
        
        if (isActuallyEmpty || hasTableNotFoundError) {
          // Table doesn't exist or empty error object - use sample data
          // Silently handle these expected cases (don't log errors)
          // This is expected behavior when tables don't exist or RLS blocks access
        } else {
          // Only log actual unexpected errors with meaningful content
          const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
          if (hasMeaningfulError) {
            console.error('Error fetching mechanics:', error);
          }
        }
        setMechanics([
          {
            id: '1',
            full_name: 'John Smith',
            role_title: 'Senior Mechanic',
            duties_description: 'Engine repair, brake service, transmission work',
            email: 'john@shop.com',
            phone: '(555) 123-4567',
            hourly_rate: 30,
            hire_date: '2023-01-15',
            status: 'Available',
            vacation_weeks_per_year: 2,
            vacation_weeks_used: 0,
            default_start_time: '08:00',
            default_end_time: '17:00',
            skills: ['Engine Repair', 'Brake Service', 'Transmission'],
            notes: 'Experienced mechanic with 10+ years',
            is_active: true
          },
          {
            id: '2',
            full_name: 'Mike Johnson',
            role_title: 'Oil Change Specialist',
            duties_description: 'Oil changes, basic maintenance, tire service',
            email: 'mike@shop.com',
            phone: '(555) 234-5678',
            hourly_rate: 22,
            hire_date: '2023-03-20',
            status: 'Available',
            vacation_weeks_per_year: 2,
            vacation_weeks_used: 1,
            default_start_time: '08:30',
            default_end_time: '17:30',
            skills: ['Oil Changes', 'Basic Maintenance', 'Tire Service'],
            notes: 'Fast and efficient with routine maintenance',
            is_active: true
          }
        ]);
      }
    } catch (error) {
      // Check if it's a table not found error
      if (error instanceof Error && error.message?.includes('relation "mechanics" does not exist')) {
        console.log('Mechanics table not found. Using sample data. Please run the SQL schema in Supabase to enable database storage.');
      } else {
        console.error('Error in fetchMechanics:', error);
      }
      // Fallback to sample data
      setMechanics([
        {
          id: '1',
          full_name: 'John Smith',
          role_title: 'Senior Mechanic',
          duties_description: 'Engine repair, brake service, transmission work',
          email: 'john@shop.com',
          phone: '(555) 123-4567',
          hourly_rate: 30,
          hire_date: '2023-01-15',
          status: 'Available',
          vacation_weeks_per_year: 2,
          vacation_weeks_used: 0,
          default_start_time: '08:00',
          default_end_time: '17:00',
          skills: ['Engine Repair', 'Brake Service', 'Transmission'],
          notes: 'Experienced mechanic with 10+ years',
          is_active: true
        },
        {
          id: '2',
          full_name: 'Mike Johnson',
          role_title: 'Oil Change Specialist',
          duties_description: 'Oil changes, basic maintenance, tire service',
          email: 'mike@shop.com',
          phone: '(555) 234-5678',
          hourly_rate: 22,
          hire_date: '2023-03-20',
          status: 'Available',
          vacation_weeks_per_year: 2,
          vacation_weeks_used: 1,
          default_start_time: '08:30',
          default_end_time: '17:30',
          skills: ['Oil Changes', 'Basic Maintenance', 'Tire Service'],
          notes: 'Fast and efficient with routine maintenance',
          is_active: true
        }
      ]);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          mechanics (full_name)
        `)
        .order('work_date', { ascending: false });
      
      if (data) {
        const formattedData = data.map((t: any) => ({
          id: t.id,
          mechanic_id: t.mechanic_id,
          mechanic_name: t.mechanics?.full_name || 'Unknown',
          work_date: t.work_date,
          start_time: t.start_time,
          end_time: t.end_time,
          total_hours: Number(t.total_hours) || 0,
          payment_amount: Number(t.payment_amount) || 0,
          notes: t.notes || ''
        }));
        setTimesheets(formattedData);
      }
      if (error) {
        // Check if error object is empty or table not found
        const errorStringified = JSON.stringify(error);
        const isEmptyErrorObject = errorStringified === '{}' || errorStringified === 'null';
        
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error as any)?.message || '';
        const hasTableNotFoundError = 
          errorCode === 'PGRST116' || 
          errorMessage.includes('relation "timesheets" does not exist') ||
          errorMessage.includes('table "timesheets" does not exist') ||
          errorCode === '42P01';
        
        const isActuallyEmpty = isEmptyErrorObject || (!errorCode && !errorMessage && Object.keys(error as any).length === 0);
        
        if (isActuallyEmpty || hasTableNotFoundError) {
          // Silently handle empty errors and table-not-found errors (expected during development)
          // Don't log to console
        } else {
          // Only log actual unexpected errors with meaningful content
          const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
          if (hasMeaningfulError) {
            console.error('Error fetching timesheets:', error);
          }
        }
        // If table doesn't exist or any error, use empty array
        setTimesheets([]);
      }
    } catch (error) {
      // Silently handle expected errors, only log unexpected ones
      if (error instanceof Error && error.message?.includes('relation "timesheets" does not exist')) {
        // Table doesn't exist - this is expected if schema hasn't been run
      } else {
        console.error('Error in fetchTimesheets:', error);
      }
      // Fallback to empty array
      setTimesheets([]);
    }
  };

  // CRUD functions for mechanics
  const handleAddMechanic = async () => {
    if (!mechanicFormData.full_name || !mechanicFormData.role_title) {
      console.warn('Please fill in required fields (Name and Role)');
      return;
    }

    try {
      if (editingMechanic) {
        // Update existing mechanic
        const { data, error } = await supabase
          .from('mechanics')
          .update(mechanicFormData)
          .eq('id', editingMechanic.id)
          .select();
        
        if (data) {
          setMechanics(mechanics.map(m => m.id === editingMechanic.id ? data[0] : m));
          setShowAddMechanicModal(false);
          setEditingMechanic(null);
          resetMechanicForm();
          alert('Employee updated successfully!');
        } else if (error) {
          // Extract error details
          const errorCode = (error as any)?.code || '';
          const errorMessage = (error as any)?.message || '';
          const errorDetails = (error as any)?.details || '';
          const errorHint = (error as any)?.hint || '';
          
          // Check if error is empty (common with RLS errors)
          const isEmptyError = !error || 
            (typeof error === 'object' && 
             Object.keys(error).length === 0) ||
            JSON.stringify(error) === '{}' ||
            (!errorCode && !errorMessage && !errorDetails && !errorHint);
          
          // Check if it's an RLS policy error
          if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
            const errorMsg = 'Failed to update employee: Row-level security (RLS) policy is blocking this operation.\n\nSOLUTION: Go to your Supabase SQL Editor and run the mechanics-schema.sql file to create the necessary RLS policies.';
            console.error('❌', errorMsg);
            alert(errorMsg);
          } else {
            // Log meaningful error details
            const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
            if (hasMeaningfulError) {
              const errorMsg = errorMessage || errorDetails || errorHint || `Error code: ${errorCode}` || 'Unknown error';
              console.error('Error updating mechanic:', { code: errorCode, message: errorMessage, details: errorDetails, hint: errorHint });
              alert(`Failed to update employee: ${errorMsg}`);
            } else {
              // Empty error - likely RLS or table doesn't exist
              console.error('Error updating mechanic: Empty error object (likely RLS policy or table missing)');
              alert('Failed to update employee. Please check your database setup and RLS policies.');
            }
          }
          
          // Don't update local state on error - let user know about the issue
        }
      } else {
        // Insert new mechanic - get shop_id first
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          console.error('You must be logged in to add employees.');
          return;
        }
        
        // Get shop_id from truck_shops table
        const { data: shopData } = await supabase
          .from('truck_shops')
          .select('id')
          .eq('user_id', userData.user.id)
          .limit(1)
          .single();
        
        const { data, error } = await supabase
          .from('mechanics')
          .insert([{
            ...mechanicFormData,
            shop_id: shopData?.id || null
          }])
          .select();
        
        if (data) {
          setMechanics([...mechanics, data[0]]);
          setShowAddMechanicModal(false);
          resetMechanicForm();
          alert('Employee added successfully!');
        } else if (error) {
          // Extract error details
          const errorCode = (error as any)?.code || '';
          const errorMessage = (error as any)?.message || '';
          const errorDetails = (error as any)?.details || '';
          const errorHint = (error as any)?.hint || '';
          
          // Check if error is empty (common with RLS errors)
          const isEmptyError = !error || 
            (typeof error === 'object' && 
             Object.keys(error).length === 0) ||
            JSON.stringify(error) === '{}' ||
            (!errorCode && !errorMessage && !errorDetails && !errorHint);
          
          // Check if it's an RLS policy error
          if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
            const errorMsg = 'Failed to add employee: Row-level security (RLS) policy is blocking this operation.\n\nSOLUTION: Go to your Supabase SQL Editor and run the mechanics-schema.sql file to create the necessary RLS policies.';
            console.error('❌', errorMsg);
            alert(errorMsg);
          } else {
            // Log meaningful error details
            const hasMeaningfulError = errorCode || (errorMessage && errorMessage.trim().length > 0);
            if (hasMeaningfulError) {
              const errorMsg = errorMessage || errorDetails || errorHint || `Error code: ${errorCode}` || 'Unknown error';
              console.error('Error adding mechanic:', { code: errorCode, message: errorMessage, details: errorDetails, hint: errorHint });
              alert(`Failed to add employee: ${errorMsg}`);
            } else {
              // Empty error - likely RLS or table doesn't exist
              console.error('Error adding mechanic: Empty error object (likely RLS policy or table missing)');
              alert('Failed to add employee. Please check your database setup and RLS policies.');
            }
          }
          
          // Don't add to local state on error - let user know about the issue
        }
      }
    } catch (error) {
      console.error('Error in handleAddMechanic:', error);
      // Fallback: add to local state
      if (editingMechanic) {
        setMechanics(mechanics.map(m => m.id === editingMechanic.id ? { ...m, ...mechanicFormData } : m));
        setEditingMechanic(null);
      } else {
        const newMechanic = {
          id: Date.now().toString(),
          ...mechanicFormData
        };
        setMechanics([...mechanics, newMechanic]);
      }
      setShowAddMechanicModal(false);
      resetMechanicForm();
      console.warn(editingMechanic ? 'Mechanic updated locally (database not available)' : 'Mechanic added locally (database not available)');
    }
  };

  const handleUpdateMechanic = async (id: string, updates: Partial<Mechanic>) => {
    try {
      const { data, error } = await supabase
        .from('mechanics')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (data) {
        setMechanics(mechanics.map(m => m.id === id ? data[0] : m));
      } else if (error) {
        console.error('Error updating mechanic:', error);
        // Fallback: update local state
        setMechanics(mechanics.map(m => m.id === id ? { ...m, ...updates } : m));
        console.warn('Mechanic updated locally (database not available)');
      }
    } catch (error) {
      console.error('Error in handleUpdateMechanic:', error);
      // Fallback: update local state
      setMechanics(mechanics.map(m => m.id === id ? { ...m, ...updates } : m));
      console.warn('Mechanic updated locally (database not available)');
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      const { error } = await supabase
        .from('mechanics')
        .delete()
        .eq('id', id);
      
      if (!error) {
        setMechanics(mechanics.filter(m => m.id !== id));
      } else {
        console.error('Error deleting mechanic:', error);
        // Fallback: delete from local state
        setMechanics(mechanics.filter(m => m.id !== id));
        console.warn('Mechanic deleted locally (database not available)');
      }
    } catch (error) {
      console.error('Error in handleDeleteMechanic:', error);
      // Fallback: delete from local state
      setMechanics(mechanics.filter(m => m.id !== id));
      console.warn('Mechanic deleted locally (database not available)');
    }
  };

  const resetMechanicForm = () => {
    setMechanicFormData({
      full_name: '',
      role_title: '',
      duties_description: '',
      email: '',
      phone: '',
      hourly_rate: 25,
      hire_date: '',
      status: 'Available',
      vacation_weeks_per_year: 2,
      vacation_weeks_used: 0,
      default_start_time: '08:30',
      default_end_time: '17:30',
      skills: [],
      notes: '',
      is_active: true
    });
  };

  // Timesheet functions
  const handleLogTime = async () => {
    if (selectedMechanicIds.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    if (!timesheetFormData.work_date || !timesheetFormData.start_time || !timesheetFormData.end_time) {
      alert('Please fill in all required fields (Date, Start Time, End Time)');
      return;
    }

    const totalHours = calculateHours(timesheetFormData.start_time, timesheetFormData.end_time);
    
    try {
      let data, error;
      
      if (editingTimesheet) {
        // Update existing timesheet (single mechanic for editing)
        const mechanic = mechanics.find(m => m.id === editingTimesheet.mechanic_id);
        if (!mechanic) {
          alert('Selected employee not found. Please select a valid employee.');
          return;
        }
        const paymentAmount = totalHours * (mechanic.hourly_rate || 0);
        
        const result = await supabase
          .from('timesheets')
          .update({
            mechanic_id: editingTimesheet.mechanic_id,
            work_date: timesheetFormData.work_date,
            start_time: timesheetFormData.start_time,
            end_time: timesheetFormData.end_time,
            total_hours: totalHours,
            payment_amount: paymentAmount,
            notes: timesheetFormData.notes || null
          })
          .eq('id', editingTimesheet.id)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // Insert new timesheets for all selected mechanics
        const timesheetEntries = selectedMechanicIds.map(mechanicId => {
          const mechanic = mechanics.find(m => m.id === mechanicId);
          const paymentAmount = totalHours * (mechanic?.hourly_rate || 0);
          
          return {
            mechanic_id: mechanicId,
            work_date: timesheetFormData.work_date,
            start_time: timesheetFormData.start_time,
            end_time: timesheetFormData.end_time,
            total_hours: totalHours,
            payment_amount: paymentAmount,
            notes: timesheetFormData.notes || null
          };
        });
        
        const result = await supabase
          .from('timesheets')
          .insert(timesheetEntries)
          .select();
        data = result.data;
        error = result.error;
      }
      
      if (error) {
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error as any)?.message || '';
        const errorDetails = (error as any)?.details || '';
        const errorHint = (error as any)?.hint || '';
        
        // Check if error is empty (common with RLS errors)
        const isEmptyError = !error || 
          (typeof error === 'object' && 
           Object.keys(error).length === 0) ||
          JSON.stringify(error) === '{}' ||
          (!errorCode && !errorMessage && !errorDetails && !errorHint);
        
        // Check if it's an RLS policy error
        if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
          const errorMsg = 'Failed to log time: Row-level security (RLS) policy is blocking this operation.\n\nSOLUTION: Go to your Supabase SQL Editor and run the contents of fix-timesheets-rls.sql file to create the necessary RLS policies.';
          console.error('❌', errorMsg);
          alert(errorMsg);
        } else {
          // Only log non-empty errors with actual content
          if (errorCode || errorMessage || errorDetails || errorHint) {
            console.error('Error logging time:', { code: errorCode, message: errorMessage, details: errorDetails, hint: errorHint });
          }
          // Check if it's a table not found error
          const hasTableNotFoundError = 
            errorCode === 'PGRST116' || 
            errorMessage.includes('relation "timesheets" does not exist') ||
            errorMessage.includes('table "timesheets" does not exist') ||
            errorCode === '42P01';
          
          if (hasTableNotFoundError) {
            const errorMsg = 'Timesheets table not found.\n\nSOLUTION: Run the mechanics-schema.sql file in your Supabase SQL Editor to create the timesheets table.';
            console.error('❌', errorMsg);
            alert(errorMsg);
          } else if (errorMessage?.includes("Could not find the 'end_time' column") || errorMessage?.includes("end_time") || errorMessage?.includes("column") || errorDetails?.includes("end_time")) {
            const errorMsg = 'Timesheets table is missing the "end_time" column.\n\nSOLUTION: Run the fix-timesheets-columns.sql file in your Supabase SQL Editor to add the missing columns.';
            console.error('❌', errorMsg);
            alert(errorMsg);
          } else {
            const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(error) || 'Unknown error';
            console.error(`Failed to log time: ${errorMsg}`);
            alert(`Failed to log time: ${errorMsg}`);
          }
        }
        return; // Exit early on error
      }
      
      // Success - refresh timesheets and reset form
      if (data && data.length > 0) {
        const wasEditing = !!editingTimesheet;
        const mechanicCount = selectedMechanicIds.length;
        await fetchTimesheets();
        setShowLogTimeModal(false);
        setEditingTimesheet(null);
        setTimesheetFormData({
          mechanic_id: '',
          work_date: '',
          start_time: '',
          end_time: '',
          notes: '',
          useFullHours: false
        });
        setSelectedMechanicIds([]);
        setMechanicSearchTerm('');
        alert(wasEditing ? 'Time entry updated successfully!' : `Time logged successfully for ${mechanicCount} employee${mechanicCount !== 1 ? 's' : ''}!`);
      } else {
        console.warn('No data returned from timesheet insert/update');
        alert('Time entry saved, but there was an issue refreshing the list. Please refresh the page.');
      }
    } catch (error) {
      console.error('Error in handleLogTime:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to log time: ${errorMsg}`);
      alert(`Failed to log time: ${errorMsg}\n\nPlease check your Supabase connection and ensure the timesheets table exists.`);
    }
  };

  const handleDeleteTimesheet = async (timesheetId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', timesheetId);
      
      if (error) {
        console.error('Error deleting timesheet:', error);
      } else {
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Error in handleDeleteTimesheet:', error);
    }
  };

  const handleEditTimesheet = (timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setTimesheetFormData({
      mechanic_id: timesheet.mechanic_id,
      work_date: timesheet.work_date,
      start_time: timesheet.start_time,
      end_time: timesheet.end_time,
      notes: timesheet.notes || '',
      useFullHours: false
    });
    setSelectedMechanicIds([timesheet.mechanic_id]);
    setMechanicSearchTerm('');
    setShowLogTimeModal(true);
  };

  const formatDateString = (dateString: string): string => {
    // Parse date string (YYYY-MM-DD) without timezone conversion
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateHours = (start: string, end: string): number => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  };

  // Format phone number as (***)***-****
  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '—';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Format as (***)***-****
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // If not 10 digits, return original (could be international format)
    return phone;
  };

  const navigationItems = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'work-orders', name: 'Work Orders', icon: Wrench },
    { id: 'bays', name: 'Bays', icon: Car },
    { id: 'estimates', name: 'Estimates', icon: ClipboardList },
    { id: 'invoices', name: 'Invoices', icon: FileText },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'labor', name: 'Labor', icon: Clock },
    { id: 'mechanics', name: 'Employees', icon: Users },
    { id: 'customers', name: 'Customers', icon: UserCheck },
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 }
  ];

  const enterpriseItems = [
    { name: 'Accounts Receivable', icon: DollarSign, badge: 'ENT' },
    { name: 'User Permissions', icon: Shield, badge: 'ENT' }
  ];

  // Calculate live stats from actual data
  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'Completed' && wo.status !== 'completed').length;
  const overdueWorkOrders = workOrders.filter(wo => {
    if (!wo.created_at) return false;
    const now = new Date();
    const created = new Date(wo.created_at);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 && wo.status !== 'Completed' && wo.status !== 'completed';
  }).length;
  
  // Calculate sales today (from invoices created today - represents invoiced sales)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  // Sales today from all invoices created today (regardless of payment status)
  const salesToday = invoices
    .filter(inv => {
      if (!inv.created_at) return false;
      const created = new Date(inv.created_at);
      return created >= today && created <= todayEnd;
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const invoicesToday = invoices
    .filter(inv => {
      if (!inv.created_at) return false;
      const created = new Date(inv.created_at);
      return created >= today && created <= todayEnd;
    }).length;
  
  // Calculate sales this month (from all invoices created this month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const salesThisMonth = invoices
    .filter(inv => {
      if (!inv.created_at) return false;
      const created = new Date(inv.created_at);
      return created >= monthStart;
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const jobsThisMonth = invoices
    .filter(inv => {
      if (!inv.created_at) return false;
      const created = new Date(inv.created_at);
      return created >= monthStart;
    }).length;
  
  const avgInvoice = jobsThisMonth > 0 ? salesThisMonth / jobsThisMonth : 0;
  
  // Calculate pending invoices (invoices with status 'pending' or 'sent' - awaiting payment)
  const pendingInvoices = invoices
    .filter(inv => {
      const status = inv.status?.toLowerCase() || '';
      return status === 'pending' || status === 'sent' || status === 'unpaid';
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const pendingInvoiceCount = invoices.filter(inv => {
    const status = inv.status?.toLowerCase() || '';
    return status === 'pending' || status === 'sent' || status === 'unpaid';
  }).length;
  
  // Find oldest pending invoice
  const oldestPending = invoices
    .filter(inv => {
      const status = inv.status?.toLowerCase() || '';
      return status === 'pending' || status === 'sent' || status === 'unpaid';
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    })[0];
  
  const oldestDays = oldestPending && oldestPending.created_at
    ? Math.floor((today.getTime() - new Date(oldestPending.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Calculate estimated value of open work orders (from associated invoices if available)
  const estimatedValue = workOrders
    .filter(wo => wo.status !== 'Completed' && wo.status !== 'completed')
    .reduce((sum, wo) => {
      // Try to find associated invoice
      const invoice = invoices.find(inv => {
        return inv.customer_id && wo.customer_id === inv.customer_id;
      });
      return sum + (invoice?.total_amount || 0);
    }, 0);
  
  // Calculate bay utilization percentage
  const totalBays = Object.keys(bayStatus).length;
  const occupiedBays = Object.values(bayStatus).filter(bay => bay.status === 'Occupied').length;
  const bayUtilization = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;

  // Function to create new work order
  const handleCreateWorkOrder = async () => {
    if (!formData.customer || !formData.truckNumber || !formData.serviceTitle) {
      console.warn('Please fill in all required fields (Customer, Truck #, Service Title)');
      return;
    }

    try {
      const shopId = await getShopId();
      if (!shopId) {
        alert('Error: Could not find shop. Please ensure you are logged in.');
        return;
      }

      // Find or create customer
      let customerId: string | null = null;
      const customerNameParts = formData.customer.trim().split(/\s+/);
      const firstName = customerNameParts[0] || '';
      const lastName = customerNameParts.slice(1).join(' ') || '';

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('shop_id', shopId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .limit(1)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            shop_id: shopId,
            first_name: firstName,
            last_name: lastName || 'Customer'
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          console.error('Error creating customer:', customerError);
          alert('Error creating customer. Please try again.');
          return;
        }
        customerId = newCustomer.id;
      }

      // Find or create truck
      let truckId: string | null = null;
      const truckParts = formData.makeModel.split(' ');
      const make = truckParts[0] || '';
      const model = truckParts.slice(1).join(' ') || '';

      // Try to find existing truck by truck number (stored in license_plate field) first, then by VIN
      let existingTruck = null;
      if (formData.truckNumber) {
        const { data: truckByPlate } = await supabase
          .from('trucks')
          .select('id')
          .eq('customer_id', customerId)
          .eq('license_plate', formData.truckNumber)
          .limit(1)
          .maybeSingle();
        existingTruck = truckByPlate;
      }
      
      if (!existingTruck && formData.vin) {
        const { data: truckByVin } = await supabase
          .from('trucks')
          .select('id')
          .eq('customer_id', customerId)
          .eq('vin', formData.vin)
          .limit(1)
          .maybeSingle();
        existingTruck = truckByVin;
      }

      if (existingTruck) {
        truckId = existingTruck.id;
        // Always update truck with truckNumber to ensure it's saved
        if (formData.truckNumber) {
          const { error: updateError } = await supabase
            .from('trucks')
            .update({ license_plate: formData.truckNumber })
            .eq('id', truckId);
          
          if (updateError) {
            console.error('Error updating truck license_plate:', updateError);
          } else {
            console.log('Truck license_plate updated successfully:', formData.truckNumber);
          }
        }
      } else if (formData.truckNumber || formData.vin || formData.makeModel) {
        const { data: newTruck, error: truckError } = await supabase
          .from('trucks')
          .insert({
            customer_id: customerId,
            shop_id: shopId,
            make: make || null,
            model: model || null,
            vin: formData.vin || null,
            license_plate: formData.truckNumber || null // Save truckNumber as license_plate
          })
          .select('id')
          .single();

        if (!truckError && newTruck) {
          truckId = newTruck.id;
          console.log('New truck created with license_plate:', formData.truckNumber, 'ID:', truckId);
        } else if (truckError) {
          console.error('Error creating truck:', truckError);
        }
      }
      
      // If no truck was created but we have a truck number, create a minimal truck record
      if (!truckId && formData.truckNumber) {
        console.log('Creating minimal truck record for truck number:', formData.truckNumber);
        const { data: minimalTruck, error: minimalTruckError } = await supabase
          .from('trucks')
          .insert({
            customer_id: customerId,
            shop_id: shopId,
            license_plate: formData.truckNumber,
            make: make || null,
            model: model || null
          })
          .select('id')
          .single();
        
        if (!minimalTruckError && minimalTruck) {
          truckId = minimalTruck.id;
          console.log('Minimal truck created with ID:', truckId, 'license_plate:', formData.truckNumber);
        } else if (minimalTruckError) {
          console.error('Error creating minimal truck:', minimalTruckError);
        }
      }

      // Find bay_id if bay is selected
      let bayId: string | null = null;
      let selectedBayIsAvailable = false;
      if (formData.selectedBay && formData.selectedBay !== 'Bay TBD') {
        const bay = serviceBays.find(b => 
          (b.bay_name === formData.selectedBay) || 
          (`Bay ${b.bay_number}` === formData.selectedBay)
        );
        bayId = bay?.id || null;
        selectedBayIsAvailable = bay?.is_available || false;
      }

      // Generate work order number
      const workOrderNumber = `WO-${Date.now()}`;

      // Calculate estimated hours
      const estimatedHours = formData.hours + (formData.minutes / 60);

      // Get mechanic_id if mechanic is selected
      let mechanicId: string | null = null;
      if (formData.mechanic && formData.mechanic.trim() !== '') {
        // formData.mechanic should now be the mechanic ID
        mechanicId = formData.mechanic;
      }

      // Create work order
      // Only set bay_id if bay is available (occupied bays will go to waitlist)
      const workOrderData: any = {
        shop_id: shopId,
        customer_id: customerId,
        truck_id: truckId,
        bay_id: (bayId && selectedBayIsAvailable) ? bayId : null, // Only assign bay if available
        work_order_number: workOrderNumber,
        status: 'pending',
        priority: formData.priority.toLowerCase() || 'normal',
        description: formData.serviceTitle + (formData.description ? ` - ${formData.description}` : ''),
        estimated_hours: estimatedHours || null,
        notes: formData.description || null
      };

      // Add mechanic_id if it exists (only if the column exists in the database)
      if (mechanicId) {
        workOrderData.mechanic_id = mechanicId;
      }

      const { data: newWorkOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .insert(workOrderData)
        .select()
        .single();

      if (workOrderError || !newWorkOrder) {
        console.error('Error creating work order:', workOrderError);
        // Check if error is due to missing mechanic_id column
        if (workOrderError?.message?.includes('mechanic_id') || workOrderError?.code === '42703') {
          alert('Error: mechanic_id column not found in work_orders table. Please run the migration: add-mechanic-id-to-work-orders.sql');
        } else {
          alert('Error creating work order. Please try again.');
        }
        return;
      }
      
      if (mechanicId) {
        console.log('Work order created with mechanic_id:', mechanicId);
      }

      // Update bay availability if bay is assigned AND available
      // If bay is occupied, work order will be added to waitlist instead
      if (bayId && selectedBayIsAvailable) {
        await supabase
          .from('service_bays')
          .update({ is_available: false })
          .eq('id', bayId);
      } else if (bayId && !selectedBayIsAvailable) {
        // Bay is occupied - add work order to waitlist
        // The work order is created without bay_id, and will be added to waitlist
        // We'll handle waitlist addition after work order creation
        console.log('Bay is occupied, work order will be added to waitlist');
      }

      // If bay is occupied, add work order to waitlist
      if (bayId && !selectedBayIsAvailable && newWorkOrder) {
        // Add to waitlist by updating bay status
        const bayName = formData.selectedBay;
        const customerNameParts = formData.customer.trim().split(/\s+/);
        const customerFirstName = customerNameParts[0] || '';
        const customerLastName = customerNameParts.slice(1).join(' ') || '';
        
        setBayStatus(prev => {
          const bay = prev[bayName];
          if (!bay) return prev;
          
          const waitlistEntry: WaitlistEntry = {
            workOrderId: newWorkOrder.id,
            customer: `${customerFirstName} ${customerLastName}`.trim() || formData.customer,
            truck: formData.truckNumber || formData.makeModel || 'Unknown',
            status: 'pending',
            addedAt: new Date().toISOString()
          };
          
          return {
            ...prev,
            [bayName]: {
              ...bay,
              waitlist: [...(bay.waitlist || []), waitlistEntry]
            }
          };
        });
      }

      // Refresh data
      await fetchWorkOrders();
      await fetchServiceBays();

    setShowNewOrderModal(false);
    setSelectedCustomerNotes([]);
    
    // Reset form data
    setFormData({
      customer: '',
      customerId: '',
      truckNumber: '',
      vin: '',
      makeModel: '',
      trailerNumber: '',
      engineType: '',
      serviceTitle: '',
      description: '',
      priority: 'Normal',
      hours: 2,
      minutes: 0,
      mechanic: '',
      arrivalTime: '',
      selectedBay: ''
    });
    
    // Reset fleet truck selection
    setSelectedCustomerFleetTrucks([]);
    setSelectedFleetTruck('');
    } catch (error) {
      console.error('Error in handleCreateWorkOrder:', error);
      alert('Error creating work order. Please try again.');
    }
  };

  // State for work order view modal
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showViewWorkOrderModal, setShowViewWorkOrderModal] = useState(false);

  // Function to view work order details
  const handleViewWorkOrder = async (order: WorkOrder) => {
    setSelectedWorkOrder(order);
    setShowViewWorkOrderModal(true);
  };

  // Function to print work order
  const handlePrintWorkOrder = async (order: WorkOrder) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const workOrderNumber = order.work_order_number || order.id.slice(0, 8);
      const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Work Order ${workOrderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; }
            .info { margin-bottom: 30px; }
            .info-row { margin-bottom: 10px; }
            .section { margin-bottom: 30px; }
            .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .status-pending { background-color: #e5e7eb; color: #374151; }
            .status-in-progress { background-color: #dbeafe; color: #1e40af; }
            .status-completed { background-color: #d1fae5; color: #065f46; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>WORK ORDER</h1>
            <div class="info-row"><strong>Work Order #:</strong> ${workOrderNumber}</div>
            <div class="info-row"><strong>Date:</strong> ${createdDate}</div>
            <div class="info-row"><strong>Status:</strong> <span class="status-badge status-${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span></div>
          </div>
          <div class="section">
            <h3>Customer Information</h3>
            <div class="info-row"><strong>Customer:</strong> ${order.customer || '—'}</div>
            <div class="info-row"><strong>Truck:</strong> ${order.truck || '—'}</div>
            ${order.truck_number ? `<div class="info-row"><strong>Truck #:</strong> ${order.truck_number}</div>` : ''}
          </div>
          <div class="section">
            <h3>Service Details</h3>
            <div class="info-row"><strong>Service:</strong> ${order.description || '—'}</div>
            <div class="info-row"><strong>Bay:</strong> ${order.bay || '—'}</div>
            ${order.priority ? `<div class="info-row"><strong>Priority:</strong> ${order.priority}</div>` : ''}
          </div>
          ${order.notes ? `
          <div class="section">
            <h3>Notes</h3>
            <div class="info-row">${order.notes}</div>
          </div>
          ` : ''}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (e) {
      console.error('Error printing work order:', e);
      alert('Error printing work order');
    }
  };

  // Function to send work order to customer
  const handleSendWorkOrder = async (order: WorkOrder) => {
    // First, get customer email from database
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, first_name, last_name')
        .eq('id', order.customer_id)
        .single();

      if (customerError || !customerData) {
        alert('Cannot send work order: Customer information not found.');
        return;
      }

      if (!customerData.email) {
        alert('Cannot send work order: Customer email is missing.');
        return;
      }

      if (!confirm(`Send work order ${order.work_order_number || order.id.slice(0, 8)} to ${customerData.email}?`)) {
        return;
      }

      const workOrderNumber = order.work_order_number || order.id.slice(0, 8);
      const customerName = customerData.first_name && customerData.last_name 
        ? `${customerData.first_name} ${customerData.last_name}`
        : customerData.email;

      // Generate email HTML
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .info-section { background-color: white; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
            .info-row { margin-bottom: 10px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Work Order ${workOrderNumber}</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Your work order has been created. Details below:</p>
              
              <div class="info-section">
                <div class="info-row"><strong>Work Order #:</strong> ${workOrderNumber}</div>
                <div class="info-row"><strong>Status:</strong> ${order.status || 'Pending'}</div>
                <div class="info-row"><strong>Customer:</strong> ${order.customer || '—'}</div>
                <div class="info-row"><strong>Truck:</strong> ${order.truck || '—'}</div>
                ${order.truck_number ? `<div class="info-row"><strong>Truck #:</strong> ${order.truck_number}</div>` : ''}
                <div class="info-row"><strong>Service:</strong> ${order.description || '—'}</div>
                <div class="info-row"><strong>Bay:</strong> ${order.bay || '—'}</div>
                ${order.priority ? `<div class="info-row"><strong>Priority:</strong> ${order.priority}</div>` : ''}
              </div>

              ${order.notes ? `
              <div class="info-section">
                <strong>Notes:</strong><br>
                ${order.notes}
              </div>
              ` : ''}

              <p>We will keep you updated on the progress of your work order.</p>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email via API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customerData.email,
          subject: `Work Order ${workOrderNumber} from EZ2Invoice`,
          html: emailHTML,
          type: 'work_order',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      alert('Work order sent to customer successfully!');
      fetchWorkOrders();
    } catch (e: any) {
      console.error('Error sending work order:', e);
      alert(`Error sending work order: ${e.message || 'Please try again.'}`);
    }
  };

  // Function to delete work order
  const deleteWorkOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this work order?')) {
      return;
    }

    try {
      // Find the work order to get its bay_id
      const orderToDelete = workOrders.find(order => order.id === orderId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting work order:', error);
        alert('Error deleting work order. Please try again.');
        return;
      }

      // Update bay availability if bay was assigned
      if (orderToDelete?.bay_id) {
        await supabase
          .from('service_bays')
          .update({ is_available: true })
          .eq('id', orderToDelete.bay_id);
      }

      // Refresh data
      await fetchWorkOrders();
      await fetchServiceBays();
    } catch (error) {
      console.error('Error in deleteWorkOrder:', error);
      alert('Error deleting work order. Please try again.');
    }
  };

  // Function to add a new bay
  const handleAddBay = async () => {
    if (newBayName.trim() === '') {
      alert('Please enter a bay name');
      return;
    }
    
    try {
      const shopId = await getShopId();
    
    const bayName = newBayName.trim();
    
      // Check if bay already exists locally
    if (bayStatus[bayName]) {
        alert(`Bay ${bayName} already exists`);
      return;
    }
    
      // Get the next bay number
      const maxBayNumber = serviceBays.length > 0 
        ? Math.max(...serviceBays.map((b: any) => b.bay_number || 0))
        : 0;

      // Create bay in Supabase
      const insertData: any = {
        bay_number: maxBayNumber + 1,
        bay_name: bayName,
        is_available: true
      };
      
      // Only add shop_id if we have it
      if (shopId) {
        insertData.shop_id = shopId;
      }

      const { data: newBay, error } = await supabase
        .from('service_bays')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating bay:', error);
        const errorMsg = error.message || JSON.stringify(error);
        
        // Check if it's an RLS error or shop not found error
        if (errorMsg.includes('row-level security') || errorMsg.includes('RLS') || !shopId) {
          alert(`Error: Could not create bay. You need to set up your shop first.\n\nSOLUTION:\n1. Go to your Supabase SQL Editor\n2. Run the contents of create-shop-setup.sql file\n3. This will create your shop automatically\n\nOr manually create a shop in the truck_shops table with your user_id.`);
        } else {
          alert(`Error creating bay: ${errorMsg}`);
        }
        return;
      }

      if (!newBay) {
        alert('Bay created but no data returned. Please refresh the page.');
        return;
      }

      // Refresh bays
      await fetchServiceBays();
    
    setNewBayName('');
    setShowAddBayModal(false);
    } catch (error) {
      console.error('Error in handleAddBay:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error creating bay: ${errorMsg}`);
    }
  };

  // Function to recommend a bay based on service title
  const getRecommendedBay = (serviceTitle: string): any | null => {
    if (!serviceTitle || serviceTitle.trim() === '') {
      // If no service title, return first available bay
      return serviceBays.find((bay: any) => bay.is_available) || null;
    }

    const normalizedTitle = serviceTitle.toLowerCase().trim();
    
    // Try to find exact or partial match with bay names
    const matchingBay = serviceBays.find((bay: any) => {
      if (!bay.is_available) return false;
      
      const bayName = (bay.bay_name || `Bay ${bay.bay_number}`).toLowerCase();
      
      // Check if service title contains bay name or vice versa
      return bayName.includes(normalizedTitle) || 
             normalizedTitle.includes(bayName) ||
             // Check for common service keywords
             (normalizedTitle.includes('oil') && bayName.includes('oil')) ||
             (normalizedTitle.includes('alignment') && bayName.includes('alignment')) ||
             (normalizedTitle.includes('brake') && bayName.includes('brake')) ||
             (normalizedTitle.includes('repair') && bayName.includes('repair')) ||
             (normalizedTitle.includes('tire') && bayName.includes('tire')) ||
             (normalizedTitle.includes('inspection') && bayName.includes('inspection'));
    });

    // If found a match, return it
    if (matchingBay) {
      return matchingBay;
    }

    // Otherwise, return first available bay
    return serviceBays.find((bay: any) => bay.is_available) || null;
  };

  // Function to add work order to waitlist
  const handleAddToWaitlist = (bayName: string, order: WorkOrder) => {
    setBayStatus(prev => {
      const bay = prev[bayName];
      if (!bay) return prev;
      
      const waitlistEntry: WaitlistEntry = {
        workOrderId: order.id,
        customer: order.customer,
        truck: order.truck,
        status: order.status,
        addedAt: new Date().toISOString()
      };
      
      return {
        ...prev,
        [bayName]: {
          ...bay,
          waitlist: [...bay.waitlist, waitlistEntry]
        }
      };
    });
    
    setShowAddToWaitlistModal(false);
    setSelectedBayForWaitlist(null);
  };

  // Function to remove from waitlist
  const handleRemoveFromWaitlist = (bayName: string, workOrderId: string) => {
    setBayStatus(prev => {
      const bay = prev[bayName];
      if (!bay) return prev;
      
      return {
        ...prev,
        [bayName]: {
          ...bay,
          waitlist: bay.waitlist.filter(item => item.workOrderId !== workOrderId)
        }
      };
    });
    
  };

  // Function to assign waitlist entry to bay
  const handleAssignFromWaitlist = async (bayName: string, waitlistItem: WaitlistEntry) => {
    try {
      // Find the work order
      const workOrder = workOrders.find(wo => wo.id === waitlistItem.workOrderId);
      if (!workOrder) {
        alert('Work order not found');
        return;
      }

      // Find the bay
      const bay = serviceBays.find((b: any) => {
        const bName = b.bay_name || `Bay ${b.bay_number}`;
        return bName === bayName;
      });

      if (!bay) {
        alert('Bay not found');
        return;
      }

      // Update work order with bay_id
      const { error } = await supabase
        .from('work_orders')
        .update({
          bay_id: bay.id,
          status: 'in_progress'
        })
        .eq('id', workOrder.id);

      if (error) {
        console.error('Error assigning work order to bay:', error);
        alert('Error assigning work order to bay. Please try again.');
        return;
      }

      // Update bay availability
      await supabase
        .from('service_bays')
        .update({ is_available: false })
        .eq('id', bay.id);

      // Update local state - remove from waitlist and set as occupied
      setBayStatus(prev => {
        const bay = prev[bayName];
        if (!bay) return prev;
        
        return {
          ...prev,
          [bayName]: {
            status: 'Occupied',
            workOrder: workOrder.work_order_number || workOrder.id,
            customer: waitlistItem.customer,
            waitlist: bay.waitlist.filter(item => item.workOrderId !== waitlistItem.workOrderId)
          }
        };
      });

      // Refresh data
      await fetchWorkOrders();
      await fetchServiceBays();
    } catch (error) {
      console.error('Error in handleAssignFromWaitlist:', error);
      alert('Error assigning work order. Please try again.');
    }
  };

  // Function to complete work order and create invoice
  const handleCompleteAndBill = async (bayName: string, workOrderNumber: string) => {
    if (!workOrderNumber) {
      alert('No work order found for this bay');
      return;
    }

    try {
      // Find the work order
      const workOrder = workOrders.find(wo => {
        const woNumber = wo.work_order_number || wo.id;
        return woNumber === workOrderNumber;
      });

      if (!workOrder) {
        alert('Work order not found');
        return;
      }

      // Update work order status to completed
      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', workOrder.id);

      if (updateError) {
        console.error('Error updating work order:', updateError);
        alert('Error completing work order. Please try again.');
        return;
      }

      // Create invoice
      const shopId = await getShopId();
      if (!shopId) {
        alert('Shop not found. Please set up your shop first.');
        return;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Calculate totals (you can enhance this with actual line items later)
      // Get total cost from work order or calculate from parts and labor
      const subtotal = (workOrder as any).total_cost || (workOrder as any).labor_cost || (workOrder as any).parts_cost || 0;
      const taxRate = 0.08; // 8% tax - you can make this configurable
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          shop_id: shopId,
          customer_id: workOrder.customer_id || null,
          work_order_id: workOrder.id,
          invoice_number: invoiceNumber,
          status: 'pending',
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        alert('Work order completed, but error creating invoice. Please create invoice manually.');
      }

      // Update bay status to Available
      const bay = serviceBays.find((b: any) => {
        const bName = b.bay_name || `Bay ${b.bay_number}`;
        return bName === bayName;
      });

      if (bay) {
        await supabase
          .from('service_bays')
          .update({ is_available: true })
          .eq('id', bay.id);
      }

      // Update local bay status
      setBayStatus(prev => ({
        ...prev,
        [bayName]: {
          status: 'Available',
          workOrder: null,
          customer: null,
          waitlist: prev[bayName]?.waitlist || []
        }
      }));

      // Refresh data
      await fetchWorkOrders();
      await fetchServiceBays();
      await fetchInvoices(); // Refresh invoices list

      alert(`Work order ${workOrderNumber} completed${invoice ? ` and invoice ${invoiceNumber} created` : ''}!`);
    } catch (error) {
      console.error('Error in handleCompleteAndBill:', error);
      alert('Error completing work order. Please try again.');
    }
  };

  const handleClearBay = async (bayName: string) => {
    if (!confirm(`Are you sure you want to clear the work order from ${bayName}?`)) {
      return;
    }

    try {
      // Find the bay
      const bay = serviceBays.find((b: any) => {
        const bName = b.bay_name || `Bay ${b.bay_number}`;
        return bName === bayName;
      });

      if (bay) {
        // Clear any work orders that might be assigned to this bay
        await supabase
          .from('work_orders')
          .update({ bay_id: null })
          .eq('bay_id', bay.id);

        // Update bay availability to true
        await supabase
          .from('service_bays')
          .update({ is_available: true })
          .eq('id', bay.id);
      }

      // Update local bay status
      setBayStatus(prev => ({
        ...prev,
        [bayName]: {
          status: 'Available',
          workOrder: null,
          customer: null,
          waitlist: prev[bayName]?.waitlist || []
        }
      }));

      // Refresh data
      await fetchWorkOrders();
      await fetchServiceBays();
    } catch (error) {
      console.error('Error clearing bay:', error);
      alert('Error clearing bay. Please try again.');
    }
  };

  // Function to delete a bay
  const handleDeleteBay = async (bayName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${bayName}?`)) {
      return;
    }

    try {
      // Find the bay
      const bay = serviceBays.find((b: any) => 
        (b.bay_name === bayName) || (`Bay ${b.bay_number}` === bayName)
      );

      if (!bay) {
        alert('Bay not found');
        return;
      }

      // Check if bay has active work orders
      const { data: activeWorkOrders } = await supabase
        .from('work_orders')
        .select('id')
        .eq('bay_id', bay.id)
        .neq('status', 'completed')
        .limit(1);

      if (activeWorkOrders && activeWorkOrders.length > 0) {
        alert('Cannot delete bay with active work orders. Please complete or reassign work orders first.');
        return;
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('service_bays')
        .delete()
        .eq('id', bay.id);

      if (error) {
        console.error('Error deleting bay:', error);
        alert('Error deleting bay. Please try again.');
        return;
      }

      // Refresh bays
      await fetchServiceBays();
    } catch (error) {
      console.error('Error in handleDeleteBay:', error);
      alert('Error deleting bay. Please try again.');
    }
  };

  // Close date range dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.date-range-dropdown-container')) {
        setShowDateRangeDropdown(false);
      }
    };

    if (showDateRangeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateRangeDropdown]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      {/* Founder Mode Banner */}
      {isFounder && subscriptionBypass && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-green-800 text-sm font-medium">
                Founder Mode Active - Subscription enforcement bypassed (Development Environment)
              </span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center space-x-1 text-green-700 hover:text-green-800 text-sm"
            >
              <span>Admin Settings</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <nav className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                NAVIGATION
              </div>
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              ))}

              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
                ENTERPRISE
              </div>
              {enterpriseItems.map((item) => (
                <div
                  key={item.name}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canAccessFeature('accounts_receivable') || canAccessFeature('user_permissions')
                      ? 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Debug info */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Debug: Current activeTab = "{activeTab}" | Founder: {isFounder ? 'Yes' : 'No'}
            </p>
          </div>
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'work-orders' && 'Work Orders'}
              {activeTab === 'bays' && 'Service Bays'}
              {activeTab === 'estimates' && 'Estimates'}
              {activeTab === 'invoices' && 'Invoices'}
              {activeTab === 'inventory' && 'Inventory'}
              {activeTab === 'labor' && 'Labor'}
              {activeTab === 'mechanics' && 'Employees'}
              {activeTab === 'customers' && 'Customers'}
              {activeTab === 'settings' && 'Settings'}
              {activeTab === 'analytics' && 'Analytics'}
            </h1>
            <p className="text-gray-600 mt-2">
              {activeTab === 'overview' && 'Welcome back! Here\'s what\'s happening at your shop today.'}
              {activeTab === 'work-orders' && 'Track and manage all service requests and repairs.'}
              {activeTab === 'bays' && 'Manage bay assignments, waitlists, and work order flow.'}
              {activeTab === 'estimates' && 'Create and manage service estimates.'}
              {activeTab === 'invoices' && 'Generate and track invoices.'}
              {activeTab === 'inventory' && 'Manage parts and inventory.'}
              {activeTab === 'labor' && 'Track labor hours and costs.'}
              {activeTab === 'mechanics' && 'Manage employee assignments and schedules.'}
              {activeTab === 'customers' && 'Customer information and history.'}
              {activeTab === 'settings' && 'Application settings and preferences.'}
              {activeTab === 'analytics' && 'Business analytics and reports.'}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Sales Today */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600">Sales Today</p>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {invoices.length === 0 ? '$0' : `$${salesToday.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoices.length === 0 ? 'No invoices created' : `from ${invoicesToday} invoices`}
                  </p>
                  {invoices.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Invoices created today</p>
                  )}
                </div>

                {/* Sales This Month */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600">Sales This Month</p>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {invoices.length === 0 ? '$0' : `$${salesThisMonth.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoices.length === 0 ? 'No invoices created' : `from ${jobsThisMonth} jobs`}
                  </p>
                  {invoices.length > 0 && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">Avg invoice: ${avgInvoice.toFixed(2)}</p>
                      <span className="text-xs font-medium text-green-600">+14% from last month</span>
                    </div>
                  )}
                </div>

                {/* Work Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600">Work Orders</p>
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">{activeWorkOrders} open</p>
                  <div className="flex items-center gap-2 mt-2">
                    {overdueWorkOrders > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {overdueWorkOrders} overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Est. value: ${estimatedValue.toLocaleString()}</p>
                </div>

                {/* Pending Invoices */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {invoices.length === 0 ? '$0' : `$${pendingInvoices.toLocaleString()} total AR`}
                  </p>
                  {invoices.length === 0 ? (
                    <p className="text-xs text-gray-500 mt-2">No invoices created</p>
                  ) : (
                    <>
                      {oldestDays > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <p className="text-xs text-gray-500">Oldest: {oldestDays} days</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{pendingInvoiceCount} awaiting payment</p>
                    </>
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Work Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Work Orders</h3>
                      <button 
                        onClick={() => setShowNewOrderModal(true)}
                        className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">New Order</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {workOrders.slice(0, 3).map((order, index) => {
                        // Calculate time elapsed
                        const getTimeElapsed = (createdAt?: string): { text: string; isOverdue: boolean; days: number } => {
                          if (!createdAt) return { text: 'Unknown', isOverdue: false, days: 0 };
                          const now = new Date();
                          const created = new Date(createdAt);
                          const diffMs = now.getTime() - created.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          
                          const isOverdue = diffDays > 7;
                          
                          if (diffDays > 0) {
                            return { 
                              text: `Sitting: ${diffDays} day${diffDays > 1 ? 's' : ''}`, 
                              isOverdue: isOverdue,
                              days: diffDays
                            };
                          }
                          if (diffHours > 0) {
                            return { 
                              text: `Sitting: ${diffHours} hour${diffHours > 1 ? 's' : ''}`, 
                              isOverdue: false,
                              days: 0
                            };
                          }
                          if (diffMins > 0) {
                            return { 
                              text: `Sitting: ${diffMins} minute${diffMins > 1 ? 's' : ''}`, 
                              isOverdue: false,
                              days: 0
                            };
                          }
                          return { text: 'Just now', isOverdue: false, days: 0 };
                        };

                        const workOrderNumber = order.work_order_number || `WO-${String(index + 1).padStart(3, '0')}`;
                        const statusLower = order.status?.toLowerCase() || 'pending';
                        const timeInfo = getTimeElapsed(order.created_at);
                        
                        // Get price from associated invoice
                        const associatedInvoice = invoices.find(inv => {
                          return inv.customer_id && order.customer_id === inv.customer_id;
                        });
                        const price = associatedInvoice?.total_amount || 0;
                        
                        return (
                          <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-sm font-medium text-gray-900">{workOrderNumber}:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  statusLower === 'completed' || statusLower === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : statusLower === 'in progress' || statusLower === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : statusLower === 'pending'
                                    ? 'bg-gray-100 text-gray-800'
                                    : statusLower === 'overdue'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.status || 'Pending'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {order.customer}
                                {order.truck_number && order.truck_number.trim() !== '' 
                                  ? ` - Truck #${order.truck_number}` 
                                  : order.truck && order.truck !== 'Unknown' 
                                    ? ` - ${order.truck}` 
                                    : ''}
                              </p>
                              <div className="flex items-center gap-4 mb-1">
                                {order.service_title && (
                                  <p className="text-xs text-gray-500">{order.service_title}</p>
                                )}
                                {timeInfo.isOverdue ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Overdue by {timeInfo.days - 7} days
                                  </span>
                                ) : timeInfo.text !== 'Just now' && timeInfo.text !== 'Unknown' ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    timeInfo.days >= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {timeInfo.text}
                                  </span>
                                ) : (
                                  <p className="text-xs text-gray-500">
                                    {timeInfo.text}
                                  </p>
                                )}
                              </div>
                              {price > 0 && (
                                <p className="text-sm font-semibold text-gray-900 mt-1">${price.toLocaleString()}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button 
                                onClick={() => handleViewWorkOrder(order)}
                                className="p-1 hover:text-primary-600 transition-colors"
                                title="View work order"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handlePrintWorkOrder(order)}
                                className="p-1 hover:text-primary-600 transition-colors"
                                title="Print work order"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleSendWorkOrder(order)}
                                className="p-1 hover:text-primary-600 transition-colors"
                                title="Send work order to customer"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => deleteWorkOrder(order.id)}
                                className="p-1 hover:text-red-600 transition-colors"
                                title="Delete work order"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {workOrders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">No work orders yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bay Status */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bay Status</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Bays in use: {occupiedBays}/{totalBays}</p>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {bayUtilization}% utilized
                      </span>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(bayStatus).map(([bayName, bayInfo]) => {
                        // Find the work order to get truck number and time elapsed
                        const workOrder = workOrders.find(wo => {
                          const woNumber = wo.work_order_number || '';
                          return bayInfo.workOrder && woNumber === bayInfo.workOrder;
                        });
                        
                        const getTimeElapsed = (createdAt?: string): string => {
                          if (!createdAt) return '';
                          const now = new Date();
                          const created = new Date(createdAt);
                          const diffMs = now.getTime() - created.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          
                          if (diffDays > 0) return `Sitting: ${diffDays} day${diffDays > 1 ? 's' : ''}`;
                          if (diffHours > 0) return `Sitting: ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                          if (diffMins > 0) return `Sitting: ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                          return '';
                        };
                        
                        const timeElapsed = workOrder?.created_at ? getTimeElapsed(workOrder.created_at) : '';
                        const isLongSitting = timeElapsed && parseInt(timeElapsed.match(/\d+/)?.[0] || '0') >= 3;
                        
                        return (
                          <div key={bayName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3 flex-1">
                              <Wrench className="h-5 w-5 text-gray-400" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 block mb-1">{bayName}</span>
                                {bayInfo.workOrder && (
                                  <>
                                    <p className="text-xs text-gray-600">
                                      {bayInfo.workOrder} - {bayInfo.customer}
                                      {workOrder?.truck_number && workOrder.truck_number.trim() !== '' && ` (Truck #: ${workOrder.truck_number})`}
                                    </p>
                                    {timeElapsed && (
                                      <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                        isLongSitting ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {timeElapsed}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className={`w-2 h-2 rounded-full ${
                                bayInfo.status === 'Occupied' ? 'bg-red-500' : 'bg-green-500'
                              }`}></div>
                              <span className="text-sm text-gray-600">
                                {bayInfo.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(bayStatus).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">No bays configured yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'estimates' && (
            <div className="space-y-6">
              {/* Estimate Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">
                    ${estimates.reduce((sum, e) => sum + (e.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-600">Total Estimate Value</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {estimates.filter(e => e.status === 'draft' || e.status === 'sent').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending Approval</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-green-600">
                    {estimates.filter(e => e.status === 'accepted').length}
                  </div>
                  <div className="text-sm text-gray-600">Approved</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">{estimates.length}</div>
                  <div className="text-sm text-gray-600">Total Estimates</div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search estimates..."
                        value={estimateSearchQuery}
                        onChange={(e) => setEstimateSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <select 
                      value={estimateStatusFilter}
                      onChange={(e) => setEstimateStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FileText className="h-4 w-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => setShowCreateEstimateModal(true)}
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Estimate</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Estimate List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Estimate List</h3>
                  <p className="text-sm text-gray-600 mt-1">Create and manage service estimates for customer approval</p>
                </div>
                <div className="p-6">
                  {estimatesLoading ? (
                    <div className="text-center text-gray-600 py-12">Loading estimates...</div>
                  ) : (
                    <>
                      {/* Table Header */}
                      <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                        <div>Estimate ID</div>
                        <div>Customer</div>
                        <div>Amount</div>
                        <div>Status</div>
                        <div>Created</div>
                        <div>Valid Until</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                      
                      {/* Filtered Estimates */}
                      {(() => {
                        const filtered = estimates.filter(e => {
                          const matchesSearch = !estimateSearchQuery || 
                            (e.estimate_number || e.id.slice(0, 8)).toLowerCase().includes(estimateSearchQuery.toLowerCase()) ||
                            (e.customer?.first_name || '').toLowerCase().includes(estimateSearchQuery.toLowerCase()) ||
                            (e.customer?.last_name || '').toLowerCase().includes(estimateSearchQuery.toLowerCase()) ||
                            (e.customer?.company || '').toLowerCase().includes(estimateSearchQuery.toLowerCase());
                          const matchesStatus = estimateStatusFilter === 'all' || e.status === estimateStatusFilter;
                          return matchesSearch && matchesStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates found</h3>
                              <p className="text-gray-600 mb-6">
                                {estimates.length === 0 
                                  ? "Create your first estimate to get started with customer approvals."
                                  : "No estimates match your search criteria."}
                              </p>
                              {estimates.length === 0 && (
                                <button
                                  onClick={() => setShowCreateEstimateModal(true)}
                                  className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 mx-auto"
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Create Your First Estimate</span>
                                </button>
                              )}
                            </div>
                          );
                        }

                        return filtered.map((e) => {
                          const customerName = e.customer 
                            ? [e.customer.first_name, e.customer.last_name].filter(Boolean).join(' ') || e.customer.company || 'Unknown'
                            : 'No Customer';
                          const statusColors = {
                            draft: 'bg-gray-100 text-gray-800',
                            sent: 'bg-blue-100 text-blue-800',
                            accepted: 'bg-green-100 text-green-800',
                            rejected: 'bg-red-100 text-red-800',
                            expired: 'bg-yellow-100 text-yellow-800'
                          };

                          return (
                            <div key={e.id} className="grid grid-cols-8 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                              <div className="font-medium text-gray-900">
                                {e.estimate_number || e.id.slice(0, 8)}
                              </div>
                              <div className="text-gray-700">
                                <div className="font-medium">{customerName}</div>
                                {e.customer?.email && (
                                  <div className="text-xs text-gray-500">{e.customer.email}</div>
                                )}
                              </div>
                              <div className="font-semibold text-gray-900">
                                ${(e.total_amount || 0).toFixed(2)}
                              </div>
                              <div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[e.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                  {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {e.valid_until ? new Date(e.valid_until).toLocaleDateString() : '—'}
                              </div>
                              <div className="col-span-2 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button 
                                    onClick={() => handleViewEstimate(e)}
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                    title="View estimate"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handlePrintEstimate(e)}
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                    title="Print estimate"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>
                                  {e.status === 'draft' && (
                                    <button 
                                      onClick={() => handleSendEstimate(e)}
                                      className="p-2 text-gray-400 hover:text-blue-600"
                                      title="Send to customer"
                                    >
                                      <Send className="h-4 w-4" />
                                    </button>
                                  )}
                                  {e.status === 'accepted' && (
                                    <button 
                                      onClick={() => handleConvertToInvoice(e)}
                                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                      title="Convert to invoice"
                                    >
                                      Convert to Invoice
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab Content */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Top actions */}
              <div className="flex items-center justify-between">
                <div className="w-full max-w-md relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={inventoryQuery} onChange={(e)=>setInventoryQuery(e.target.value)} placeholder="Search inventory..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>setShowAddInventoryModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{inventory.length}</div><div className="text-sm text-gray-600">Total Items</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{inventory.filter(i=>i.quantity_in_stock <= i.minimum_stock_level).length}</div><div className="text-sm text-gray-600">Low Stock Alerts</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">${inventory.reduce((sum,i)=>sum + (i.quantity_in_stock * (i.selling_price||0)),0).toLocaleString()}</div><div className="text-sm text-gray-600">Total Value</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{Array.from(new Set(inventory.map(i=>i.category||'General'))).length}</div><div className="text-sm text-gray-600">Categories</div></div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <select value={inventoryCategory} onChange={(e)=>setInventoryCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                  {['All', ...Array.from(new Set(inventory.map(i=>i.category||'General')))].map(c=> (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-11 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    <div className="col-span-3">Item Name</div>
                    <div>Category</div>
                    <div>Quantity</div>
                    <div>Price</div>
                    <div>Supplier</div>
                    <div>Status</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>

                  {inventoryLoading ? (
                    <div className="text-center text-gray-600 py-12">Loading...</div>
                  ) : (
                    inventory
                      .filter(i => !inventoryQuery || (i.part_name + ' ' + (i.part_number||'') + ' ' + (i.category||'') ).toLowerCase().includes(inventoryQuery.toLowerCase()))
                      .filter(i => inventoryCategory==='All' || (i.category||'General')===inventoryCategory)
                      .map(i => (
                        <div key={i.id} className="grid grid-cols-11 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
                          <div className="col-span-3">
                            <div className="font-medium text-gray-900">{i.part_name}</div>
                            <div className="text-xs text-gray-500">{i.part_number || ''}</div>
                          </div>
                          <div>{i.category || 'General'}</div>
                          <div>{i.quantity_in_stock}</div>
                          <div>${i.selling_price?.toFixed(2) || '0.00'}</div>
                          <div>{i.supplier || '—'}</div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs ${i.quantity_in_stock <= i.minimum_stock_level ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {i.quantity_in_stock <= i.minimum_stock_level ? 'Low Stock' : 'In Stock'}
                            </span>
                          </div>
                          <div className="col-span-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button onClick={()=>{ setShowHistoryModal(i); fetchInventoryHistory(i.id); }} className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                History
                              </button>
                              <button onClick={()=>setShowAdjustModal(i)} className="px-3 py-1 border rounded hover:bg-gray-50">Adjust</button>
                              <button onClick={()=> { setEditingInventoryItem(i.id); setInventoryForm({ name:i.part_name, category:i.category||'', description:i.description||'', sku:i.part_number||'', supplier:i.supplier||'', location:'', quantity:i.quantity_in_stock, min_stock:i.minimum_stock_level, unit_price:i.selling_price, cost:i.cost||0 }); setShowAddInventoryModal(true); }} className="p-2 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4"/></button>
                              <button onClick={async ()=>{ if(confirm('Delete item?')){ await supabase.from('parts').delete().eq('id', i.id); fetchInventory(); }}} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  {(!inventoryLoading && inventory.length===0) && (
                    <div className="text-center text-gray-600 py-12">No inventory yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Customers Tab Content */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-full max-w-md relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Search customers..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const rows = customers.map(c => ({
                        Name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
                        Email: c.email || '',
                        Phone: c.phone || '',
                        City: c.city || '',
                        State: c.state || '',
                      }));
                      const header = Object.keys(rows[0] || { Name: '', Email: '', Phone: '', City: '', State: '' }).join(',');
                      const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click(); URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => { 
                      setCustomerForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', is_fleet: false, company: '', fleet_name: '', enable_fleet_discounts: false }); 
                      setAddCustomerFleetTrucks([]);
                      setAddCustomerFleetDiscounts([]);
                      setShowAddCustomerModal(true); 
                    }}
                    className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Customer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
                  <div className="text-sm text-gray-600">Total Customers</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">$0</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Visits</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Customer List</h3>
                  <p className="text-sm text-gray-600">Manage your customer database and track service history</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-9 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    <div className="col-span-2">Name</div>
                    <div className="col-span-2">Contact</div>
                    <div>Visits</div>
                    <div>Total Spent</div>
                    <div>Last Visit</div>
                    <div className="text-right col-span-2">Actions</div>
                  </div>

                  {customersLoading ? (
                    <div className="text-center text-gray-600 py-12">Loading customers...</div>
                  ) : (
                    (customers.filter(c => {
                      const q = customerQuery.toLowerCase();
                      const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase();
                      return !q || name.includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').includes(q);
                    })).length === 0 ? (
                      <div className="text-center text-gray-600 py-12">No customers yet</div>
                    ) : (
                      customers.filter(c => {
                        const q = customerQuery.toLowerCase();
                        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase();
                        return !q || name.includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').includes(q);
                      }).map((c) => (
                        <div key={c.id} className="grid grid-cols-9 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
                          <div className="col-span-2">
                            <div className="font-medium text-gray-900">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</div>
                          </div>
                          <div className="col-span-2 text-gray-700">
                            <div>{c.email || '—'}</div>
                            <div className="text-gray-500">{formatPhoneNumber(c.phone)}</div>
                          </div>
                          <div>0</div>
                          <div>$0</div>
                          <div>—</div>
                          <div className="text-right col-span-2">
                            <div className="inline-flex items-center gap-2">
                              {c.is_fleet ? (
                                <button onClick={()=> setShowFleetModal(c)} className="px-2 py-1 border rounded hover:bg-gray-50 text-sm">Manage Fleet</button>
                              ) : null}
                              <button onClick={() => setShowEditCustomerModal(c)} className="p-2 text-gray-400 hover:text-gray-600">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={async () => {
                                // Check for work orders
                                const { data: workOrdersData, error: workOrdersError } = await supabase
                                  .from('work_orders')
                                  .select('id')
                                  .eq('customer_id', c.id)
                                  .limit(1);
                                
                                if (workOrdersError) {
                                  console.error('Error checking work orders:', workOrdersError);
                                }
                                
                                // Check for invoices
                                const { data: invoicesData, error: invoicesError } = await supabase
                                  .from('invoices')
                                  .select('id')
                                  .eq('customer_id', c.id)
                                  .limit(1);
                                
                                if (invoicesError) {
                                  console.error('Error checking invoices:', invoicesError);
                                }
                                
                                const hasWorkOrders = workOrdersData && workOrdersData.length > 0;
                                const hasInvoices = invoicesData && invoicesData.length > 0;
                                
                                if (hasWorkOrders || hasInvoices) {
                                  let message = 'Cannot delete this customer because they have ';
                                  const reasons = [];
                                  if (hasWorkOrders) reasons.push('work orders');
                                  if (hasInvoices) reasons.push('invoices');
                                  message += reasons.join(' and ') + ' associated with them.';
                                  message += '\n\nPlease complete or remove all work orders and invoices before deleting this customer.';
                                  alert(message);
                                  return;
                                }
                                
                                if (confirm('Are you sure you want to delete this customer?')) {
                                  const { error: deleteError } = await supabase
                                    .from('customers')
                                    .delete()
                                    .eq('id', c.id);
                                  
                                  if (deleteError) {
                                    console.error('Error deleting customer:', deleteError);
                                    alert('Error deleting customer. Please try again.');
                                  } else {
                                    fetchCustomers();
                                  }
                                }
                              }} className="p-2 text-gray-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Work Orders Tab Content */}
          {activeTab === 'work-orders' && (
            <div className="space-y-6">
              {/* Work Order Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-600">
                    {workOrders.filter(wo => wo.status?.toLowerCase() === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-yellow-600">
                    {workOrders.filter(wo => wo.status?.toLowerCase() === 'waiting parts' || wo.status?.toLowerCase() === 'on hold').length}
                  </div>
                  <div className="text-sm text-gray-600">On Hold</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-green-600">
                    {workOrders.filter(wo => wo.status?.toLowerCase() === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-blue-600">{workOrders.length}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
              </div>

              {/* Work Orders Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Work Orders</h3>
                      {isFounder && (
                        <p className="text-sm text-gray-600 mt-1">
                          Founder Mode: {workOrders.length} total orders
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {isFounder && (
                        <button
                          onClick={() => {
                            console.log('Current work orders:', workOrders);
                            console.log(`Debug Info:\nTotal Orders: ${workOrders.length}\nCheck console for details`);
                          }}
                          className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          Debug Info
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNewOrderModal(true)}
                        className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>New Work Order</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {workOrders.map((order, index) => {
                      // Calculate time elapsed
                      const getTimeElapsed = (createdAt?: string): string => {
                        if (!createdAt) return 'Unknown';
                        const now = new Date();
                        const created = new Date(createdAt);
                        const diffMs = now.getTime() - created.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        
                        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                        return 'Just now';
                      };

                      const workOrderNumber = order.work_order_number || `Work Order ${index + 1}`;
                      const statusLower = order.status?.toLowerCase() || 'pending';
                      
                      return (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900">{workOrderNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                statusLower === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                  : statusLower === 'in progress'
                                ? 'bg-blue-100 text-blue-800'
                                  : statusLower === 'pending'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {order.status || 'Pending'}
                            </span>
                          </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {order.customer} - {order.truck}
                              {order.truck_number && order.truck_number.trim() !== '' && ` (Truck #: ${order.truck_number})`}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-gray-500">{order.bay}</p>
                              {order.created_at ? (
                                <p className="text-xs text-gray-500">
                                  • Sitting for {getTimeElapsed(order.created_at)}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400">• Time unknown</p>
                              )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewWorkOrder(order)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View work order"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handlePrintWorkOrder(order)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Print work order"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleSendWorkOrder(order)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Send work order to customer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteWorkOrder(order.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete work order"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Labor Tab Content */}
          {activeTab === 'labor' && (
            <div className="space-y-6">
              {/* Header actions */}
              <div className="flex items-center justify-between">
                <div className="w-full max-w-md relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={laborQuery} onChange={(e)=>setLaborQuery(e.target.value)} placeholder="Search labor..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAddLaborModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Labor Item
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{laborItems.length}</div><div className="text-sm text-gray-600">Total Labor Items</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{laborItems.filter(i=>i.rate_type==='fixed').length}</div><div className="text-sm text-gray-600">Fixed Rate Items</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">{laborItems.filter(i=>i.rate_type==='hourly').length}</div><div className="text-sm text-gray-600">Hourly Rate Items</div></div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="text-2xl font-bold text-gray-900">$0.00</div><div className="text-sm text-gray-600">Avg. Hourly Rate</div></div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {['All', ...Array.from(new Set(laborItems.map(i => i.category || 'General')))].map(cat => (
                  <button key={cat} onClick={()=>setLaborCategoryFilter(cat)} className={`px-3 py-1 rounded-lg border ${laborCategoryFilter===cat?'bg-gray-900 text-white border-gray-900':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{cat}</button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {(['all','fixed','hourly'] as const).map(rt => (
                    <button key={rt} onClick={()=>setLaborRateFilter(rt)} className={`px-3 py-1 rounded-lg border ${laborRateFilter===rt?'bg-blue-600 text-white border-blue-600':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{rt[0].toUpperCase()+rt.slice(1)}</button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Labor Items</h3>
                </div>
                <div className="p-6 space-y-4">
                  {laborLoading ? (
                    <div className="text-center text-gray-600 py-8">Loading...</div>
                  ) : (
                    laborItems
                      .filter(i => !laborQuery || i.service_name.toLowerCase().includes(laborQuery.toLowerCase()))
                      .filter(i => laborCategoryFilter==='All' || (i.category||'General')===laborCategoryFilter)
                      .filter(i => laborRateFilter==='all' || i.rate_type===laborRateFilter)
                      .map(item => (
                        <div key={item.id} className="flex items-start justify-between p-4 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-gray-900">{item.service_name}</div>
                            <div className="text-sm text-gray-600">{item.description || '—'}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{item.category || 'General'}</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{item.rate_type === 'fixed' ? 'Fixed Rate' : 'Hourly Rate'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>setEditLaborItem(item)} className="p-2 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4"/></button>
                            <button onClick={async ()=>{ if(confirm('Delete labor item?')){ await supabase.from('labor_items').delete().eq('id', item.id); fetchLaborItems(); }}} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </div>
                      ))
                  )}
                  {(!laborLoading && laborItems.length===0) && (
                    <div className="text-center text-gray-600 py-12">No labor items yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Bays Tab Content */}
          {activeTab === 'bays' && (
            <div className="space-y-6">
              {(() => {
                // Calculate bay statistics dynamically
                const totalBays = Object.keys(bayStatus).length;
                const availableBays = Object.values(bayStatus).filter(bay => bay.status === 'Available').length;
                const occupiedBays = Object.values(bayStatus).filter(bay => bay.status === 'Occupied').length;
                const totalWaiting = Object.values(bayStatus).reduce((sum, bay) => sum + (bay.waitlist?.length || 0), 0);
                
                return (
                  <>
              {/* Bay Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Bays */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">{totalBays}</div>
                      <div className="text-sm text-gray-600">Total Bays</div>
                    </div>
                  </div>
                </div>
                
                {/* Available Bays */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">{availableBays}</div>
                      <div className="text-sm text-gray-600">Available Bays</div>
                    </div>
                  </div>
                </div>
                
                {/* Occupied Bays */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">{occupiedBays}</div>
                      <div className="text-sm text-gray-600">Occupied Bays</div>
                    </div>
                  </div>
                </div>
                
                {/* Waiting Work Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
                      <div className="text-sm text-gray-600">Waiting Work Orders</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bay Management */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bay Management</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage bay assignments, waitlists, and work order flow</p>
                  </div>
                  <button
                    onClick={() => setShowAddBayModal(true)}
                    className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Bay</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(bayStatus).map(([bayName, bayInfo]) => {
                    // Debug log for bay status
                    if (bayInfo.workOrder) {
                      console.log(`Bay Tab Render - ${bayName}: workOrder = "${bayInfo.workOrder}"`);
                    }
                    
                    return (
                      <div key={bayName} className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <h4 className="font-semibold text-gray-900">{bayName}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bayInfo.status === 'Occupied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {bayInfo.status}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {bayInfo.status === 'Occupied' ? (
                            <>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">Current Work Order</h5>
                                  <div className="flex items-center space-x-2">
                                    {(() => {
                                      const workOrder = workOrders.find(wo => {
                                        const woNumber = wo.work_order_number || wo.id;
                                        return bayInfo.workOrder && (woNumber === bayInfo.workOrder || wo.id === bayInfo.workOrder);
                                      });
                                      
                                      if (!workOrder) return null;
                                      
                                      return (
                                        <>
                                          <button
                                            onClick={() => {
                                              setSelectedWorkOrderForHistory(workOrder);
                                              setShowWorkOrderHistoryModal(true);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="View History"
                                          >
                                            <Clock className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedWorkOrderForMove({ workOrder, currentBay: bayName });
                                              setShowMoveWorkOrderModal(true);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                                            title="Move Work Order"
                                          >
                                            <ArrowRight className="h-4 w-4" />
                                          </button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm">
                                    <span className="font-medium">{bayInfo.workOrder || 'Unknown'}</span>
                                  </div>
                                <div className="text-sm text-gray-600">
                                  {(() => {
                                    // Find the work order to get truck number and time elapsed
                                    const workOrder = workOrders.find(wo => {
                                      const woNumber = wo.work_order_number || wo.id;
                                      return bayInfo.workOrder && (woNumber === bayInfo.workOrder || wo.id === bayInfo.workOrder);
                                    });
                                    
                                    // If work order is "Unknown" or not found, show clear button
                                    if (!bayInfo.workOrder || bayInfo.workOrder === 'Unknown' || !workOrder) {
                                      return (
                                        <div className="text-gray-500 italic">
                                          Work order not found
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <>
                                        {bayInfo.customer}
                                        {workOrder?.truck_number && workOrder.truck_number.trim() !== '' && (
                                          <span className="ml-2 font-medium">- Truck #{workOrder.truck_number}</span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                {(() => {
                                  // Find the work order to get truck number and time elapsed
                                  const workOrder = workOrders.find(wo => {
                                    const woNumber = wo.work_order_number || wo.id;
                                    return bayInfo.workOrder && (woNumber === bayInfo.workOrder || wo.id === bayInfo.workOrder);
                                  });
                                  
                                  const getTimeElapsed = (createdAt?: string): string => {
                                    if (!createdAt) return '';
                                    const now = new Date();
                                    const created = new Date(createdAt);
                                    const diffMs = now.getTime() - created.getTime();
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffHours = Math.floor(diffMins / 60);
                                    const diffDays = Math.floor(diffHours / 24);
                                    
                                    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                                    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                                    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                                    return 'Just now';
                                  };
                                  
                                  return (
                                    <>
                                      {workOrder?.created_at && (
                                        <div className="text-xs text-gray-500">
                                          Sitting for {getTimeElapsed(workOrder.created_at)}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            {(() => {
                              // Check if work order exists
                              const workOrder = workOrders.find(wo => {
                                const woNumber = wo.work_order_number || wo.id;
                                return bayInfo.workOrder && (woNumber === bayInfo.workOrder || wo.id === bayInfo.workOrder);
                              });
                              
                              // If work order is "Unknown" or not found, show Clear Bay button
                              if (!bayInfo.workOrder || bayInfo.workOrder === 'Unknown' || !workOrder) {
                                return (
                                  <button 
                                    onClick={() => handleClearBay(bayName)}
                                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                                  >
                                    <X className="h-4 w-4" />
                                    <span>Clear Bay</span>
                                  </button>
                                );
                              }
                              
                              // Otherwise show Complete & Bill button
                              return (
                                <button 
                                  onClick={() => handleCompleteAndBill(bayName, bayInfo.workOrder || '')}
                                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>Complete & Bill</span>
                                </button>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center space-x-3">
                              <Car className="h-8 w-8 text-gray-400" />
                              <span className="text-gray-600">Bay is available</span>
                            </div>
                            <div className="text-sm text-gray-500 text-center py-2">
                              No work in queue
                            </div>
                          </>
                        )}
                      </div>

                      {/* Waitlist Section */}
                      {bayInfo.waitlist && bayInfo.waitlist.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Waitlist ({bayInfo.waitlist.length})
                          </h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {bayInfo.waitlist.map((item, idx) => {
                              // Find the work order to get the work order number
                              const workOrder = workOrders.find(wo => wo.id === item.workOrderId);
                              const workOrderNumber = workOrder?.work_order_number || item.workOrderId;
                              
                              return (
                                <div key={idx} className="bg-white border border-gray-200 rounded p-3 flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{workOrderNumber}</div>
                                    <div className="text-xs text-gray-600 truncate">
                                      {item.customer} - {item.truck}
                                      {workOrder?.truck_number && workOrder.truck_number.trim() !== '' && ` (Truck #: ${workOrder.truck_number})`}
                                    </div>
                                  </div>
                                <div className="flex items-center space-x-1 ml-2">
                                  <button
                                    onClick={() => handleAssignFromWaitlist(bayName, item)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                    title="Assign to bay"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromWaitlist(bayName, item.workOrderId)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    title="Remove from waitlist"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button 
                          onClick={() => {
                            setSelectedBayForWaitlist(bayName);
                            setShowAddToWaitlistModal(true);
                          }}
                          className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add to {bayName} Waitlist</span>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Invoices Tab Content */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              {/* Invoice Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">$0</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">$0</div>
                  <div className="text-sm text-gray-600">Pending Payment</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Total Invoices</div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search invoices..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>All Status</option>
                      <option>Draft</option>
                      <option>Sent</option>
                      <option>Paid</option>
                      <option>Overdue</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FileText className="h-4 w-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => setShowCreateInvoiceModal(true)}
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Invoice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoice List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice List</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage billing and track payment status</p>
                </div>
                <div className="p-6">
                  {/* Table Header */}
                  <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    <div>Invoice ID</div>
                    <div>Customer</div>
                    <div>Work Order</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div>Date</div>
                    <div>Due Date</div>
                    <div>Actions</div>
                  </div>
                  
                  {/* Empty State */}
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                    <p className="text-gray-600 mb-6">Create your first invoice to get started with billing.</p>
                    <button
                      onClick={() => setShowCreateInvoiceModal(true)}
                      className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Your First Invoice</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Settings Header */}
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>

              {/* Settings Sub-navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'profile', name: 'Profile', icon: User },
                    { id: 'organization', name: 'Organization', icon: Building },
                    { id: 'notifications', name: 'Notifications', icon: Bell },
                    { id: 'security', name: 'Security', icon: Shield },
                    { id: 'billing', name: 'Billing', icon: CreditCard }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsSubTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                        settingsSubTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Profile Tab */}
              {settingsSubTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                    <p className="text-sm text-gray-600 mb-6">Update your personal details and preferences</p>
                    
                    <div className="space-y-6">
                      {/* Avatar Section */}
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600">EA</span>
                        </div>
                        <div>
                          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Change Avatar
                          </button>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                        </div>
                      </div>
                      
                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                          <input
                            type="text"
                            defaultValue="Elianis"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                          <input
                            type="text"
                            defaultValue="Acosta"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          defaultValue="acostaelianis@yahoo.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </div>
                      
                      <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
                        Save Profile
                      </button>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Preferences</h3>
                    <p className="text-sm text-gray-600 mb-6">Customize your application experience</p>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option value="est">Eastern Time (EST)</option>
                          <option value="cst">Central Time (CST)</option>
                          <option value="mst">Mountain Time (MST)</option>
                          <option value="pst">Pacific Time (PST)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Dark Mode</h4>
                          <p className="text-sm text-gray-600">Enable dark theme across the application</p>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200`}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Organization Tab */}
              {settingsSubTab === 'organization' && (
                <div className="space-y-6">
                  {/* Business Information */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Information</h3>
                    <p className="text-sm text-gray-600 mb-6">Manage your shop's basic information</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shop Name</label>
                        <input
                          type="text"
                          defaultValue="R&P Truck Service"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                        <input
                          type="url"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Labor Rate ($/hour)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Settings */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Settings</h3>
                    <p className="text-sm text-gray-600 mb-6">Configure default tax rates and fees for invoices</p>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Tax Rate (%)</label>
                        <input
                          type="number"
                          defaultValue="6"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">This tax rate will be automatically applied when creating new invoices</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Enable Card Processing Fee</h4>
                          <p className="text-sm text-gray-600">Add a processing fee when customers pay by card</p>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200`}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {settingsSubTab === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h3>
                  <p className="text-sm text-gray-600 mb-6">Choose how you'd like to be notified about important events</p>
                  
                  <div className="space-y-6">
                    {/* General Notifications */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                          <p className="text-sm text-gray-600">Receive email alerts for important updates</p>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary-600`}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                          <p className="text-sm text-gray-600">Get text messages for urgent alerts</p>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200`}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Email Notification Types</h4>
                      <div className="space-y-4">
                        {[
                          { name: 'New Work Orders', description: 'When a new work order is created' },
                          { name: 'Payment Received', description: 'When invoices are paid' },
                          { name: 'Low Inventory', description: 'When items are running low' },
                          { name: 'Appointment Reminders', description: 'Daily appointment summaries' }
                        ].map((notification) => (
                          <div key={notification.name} className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">{notification.name}</h5>
                              <p className="text-sm text-gray-600">{notification.description}</p>
                            </div>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary-600`}>
                              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {settingsSubTab === 'security' && (
                <div className="space-y-6">
                  {/* Password Management */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Password</h3>
                    <p className="text-sm text-gray-600 mb-6">Change your password to keep your account secure</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mb-6">Add an extra layer of security to your account</p>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-600">Secure your account with 2FA via authenticator app</p>
                      </div>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {settingsSubTab === 'billing' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing Information</h3>
                  <p className="text-sm text-gray-600 mb-6">Manage your subscription and payment methods</p>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Current Plan</h4>
                      <p className="text-sm text-gray-600">{currentTier.name} - {currentTier.price}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Payment Methods</h4>
                      <p className="text-sm text-gray-600">No payment methods on file</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Billing History</h4>
                      <p className="text-sm text-gray-600">No billing history available</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Settings Section - Only for Founders */}
              {isFounder && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
                      <p className="text-sm text-gray-600">Manage founder privileges and subscription controls</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        SuperAdmin
                      </span>
                    </div>
                  </div>

                  {/* Founder Status */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Founder Status</h3>
                        <p className="text-sm text-gray-600">Your account has founder privileges</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <p className="text-sm text-gray-900">acostaelianis@yahoo.com</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Verified Founder</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                          <p className="text-sm text-gray-900">Development/Preview</p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          DEV
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Bypass */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Subscription Bypass</h3>
                        <p className="text-sm text-gray-600">Control subscription enforcement for testing and development</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Enable Subscription Bypass</h4>
                          <p className="text-sm text-gray-600">When enabled, you can access all app features without an active subscription.</p>
                        </div>
                        <div className="ml-4">
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            subscriptionBypass ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              subscriptionBypass ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Current Status</label>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${subscriptionBypass ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {subscriptionBypass ? 'Bypass Active' : 'Bypass Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-sm text-gray-600">Founder Mode On</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">
                              Subscription bypass is active. You can access all features without a subscription. 
                              Normal users will still require valid subscriptions.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Testing Mode */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Subscription Testing Mode</h3>
                        <p className="text-sm text-gray-600">Simulate different subscription tiers to test user experience</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            Turn OFF subscription bypass to enable testing mode.
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Select Tier to Simulate</h4>
                        <div className="space-y-3">
                          {[
                            { 
                              id: 'real', 
                              title: 'Use Real Subscription', 
                              description: 'Experience your actual subscription tier',
                              selected: true
                            },
                            { 
                              id: 'starter', 
                              title: 'Simulate Starter', 
                              description: '$80/month • 3 bays max • Basic features only',
                              badge: '3 bays',
                              badgeColor: 'bg-gray-100 text-gray-800'
                            },
                            { 
                              id: 'professional', 
                              title: 'Simulate Professional', 
                              description: '$150/month • 8 bays • Analytics & Timesheets',
                              badge: '8 bays',
                              badgeColor: 'bg-gray-100 text-gray-800'
                            },
                            { 
                              id: 'enterprise', 
                              title: 'Simulate Enterprise', 
                              description: 'Custom pricing • Unlimited bays • All features + A/R & User Permissions',
                              badge: 'Unlimited',
                              badgeColor: 'bg-yellow-100 text-gray-800'
                            }
                          ].map((option) => (
                            <div key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                option.selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {option.selected && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900">{option.title}</h5>
                                <p className="text-sm text-gray-600">{option.description}</p>
                              </div>
                              {option.badge && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.badgeColor}`}>
                                  {option.badge}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What You Can Test */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">What You Can Test</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                        <span className="text-sm text-gray-600">Bay creation limits for each tier</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                        <span className="text-sm text-gray-600">Feature access (Analytics, Timesheets, A/R, User Permissions)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                        <span className="text-sm text-gray-600">Upgrade prompts and upsell messages</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                        <span className="text-sm text-gray-600">Permission restrictions for different tiers</span>
                      </li>
                    </ul>
                  </div>

                  {/* Safety & Security */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Safety & Security</h3>
                    <p className="text-sm text-gray-600 mb-4">Important information about founder privileges</p>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Protected Features</span>
                        </div>
                        <ul className="space-y-1 ml-6">
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Bypass only works for allowlisted founder emails</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Normal users still require valid subscriptions</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">All data access is still governed by organization permissions</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Audit logs track all admin actions</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">i</span>
                          </div>
                          <span className="text-sm font-medium text-blue-700">Environment Behavior</span>
                        </div>
                        <ul className="space-y-1 ml-6">
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Development: Bypass available for founders</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Testing mode allows full app exploration</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                            <span className="text-sm text-gray-600">Production maintains security for regular users</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mechanics Tab Content */}
          {activeTab === 'mechanics' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-3xl font-bold text-green-600">
                    {mechanics.filter(m => m.is_active && m.status === 'Available').length}
                  </div>
                  <div className="text-sm text-gray-600">Active Employees</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-3xl font-bold text-gray-600">
                    {mechanics.filter(m => !m.is_active || m.status === 'Off').length}
                  </div>
                  <div className="text-sm text-gray-600">Inactive</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-3xl font-bold text-gray-900">
                    {mechanics.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Employees</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-3xl font-bold text-blue-600">
                    ${mechanics.length > 0 ? Math.round(mechanics.reduce((sum, m) => sum + (m.hourly_rate || 0), 0) / mechanics.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Hourly Rate</div>
                </div>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex items-center justify-between border-b border-gray-200">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setMechanicsSubTab('team')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      mechanicsSubTab === 'team'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Employees</span>
                  </button>
                  <button
                    onClick={() => setMechanicsSubTab('timesheets')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      mechanicsSubTab === 'timesheets'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Timesheets</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  {mechanicsSubTab === 'timesheets' && (
                <button
                      onClick={() => setShowWeekSettingsModal(true)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Week Settings</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    if (mechanicsSubTab === 'team') {
                      setEditingMechanic(null);
                      resetMechanicForm();
                      setShowAddMechanicModal(true);
                    } else {
                        console.log('Opening log time modal...');
                      setShowLogTimeModal(true);
                        console.log('Log time modal state should be true now');
                    }
                  }}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{mechanicsSubTab === 'team' ? 'Add Employee' : 'Log Time'}</span>
                </button>
                </div>
              </div>

              {/* Team Management View */}
              {mechanicsSubTab === 'team' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
                    <p className="text-sm text-gray-600">Manage your employees, their roles, and contact information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mechanics.map((mechanic) => (
                      <div key={mechanic.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-lg font-semibold text-blue-600">
                                {mechanic.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{mechanic.full_name}</h4>
                              <p className="text-sm text-gray-600">{mechanic.role_title}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                setEditingMechanic(mechanic);
                                setMechanicFormData({
                                  full_name: mechanic.full_name || '',
                                  role_title: mechanic.role_title || '',
                                  duties_description: mechanic.duties_description || '',
                                  email: mechanic.email || '',
                                  phone: mechanic.phone || '',
                                  hourly_rate: mechanic.hourly_rate || 0,
                                  hire_date: mechanic.hire_date || '',
                                  status: mechanic.status || 'Available',
                                  vacation_weeks_per_year: mechanic.vacation_weeks_per_year || 2,
                                  vacation_weeks_used: mechanic.vacation_weeks_used || 0,
                                  default_start_time: mechanic.default_start_time || '08:30',
                                  default_end_time: mechanic.default_end_time || '17:30',
                                  skills: mechanic.skills || [],
                                  notes: mechanic.notes || '',
                                  is_active: mechanic.is_active !== false
                                });
                                setShowAddMechanicModal(true);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMechanic(mechanic.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            mechanic.status === 'Available' ? 'bg-green-100 text-green-800' :
                            mechanic.status === 'Busy' ? 'bg-blue-100 text-blue-800' :
                            mechanic.status === 'Vacation' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {mechanic.status}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {mechanic.phone || 'No phone'}
                          </div>
                          <p className="text-sm text-gray-600">{mechanic.duties_description}</p>
                        </div>

                        {mechanic.skills && mechanic.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {mechanic.skills.map((skill, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-4">
                          <div>
                            <span className="text-gray-600">$</span>
                            <span className="font-semibold">{mechanic.hourly_rate}/hr</span>
                          </div>
                          <div className="text-gray-500">
                            Since {new Date(mechanic.hire_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          Vacation: {mechanic.vacation_weeks_used}/{mechanic.vacation_weeks_per_year} weeks used
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timesheet Management View */}
              {mechanicsSubTab === 'timesheets' && (
                <div>
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Timesheet Management</h3>
                    <p className="text-sm text-gray-600">Track and manage mechanic work hours and payments</p>
                  </div>

                  {/* Filter and Export Section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by:</label>
                          <select 
                            value={timesheetMechanicFilter}
                            onChange={(e) => setTimesheetMechanicFilter(e.target.value)}
                            className="px-3 py-2 border border-red-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                          >
                            <option value="all">All Employees</option>
                            {mechanics.filter(m => m.is_active).map((mechanic) => (
                              <option key={mechanic.id} value={mechanic.id}>
                                {mechanic.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date range</label>
                          <div className="relative date-range-dropdown-container">
                            <button
                              type="button"
                              onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                              className="px-3 py-2 border border-green-500 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[200px] justify-between"
                            >
                              <span>{getDateRangeDisplay()}</span>
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            </button>
                            
                            {showDateRangeDropdown && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[250px]">
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setDateRangeOption('Today');
                                    setShowDateRangeDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">Today</div>
                                    <div className="text-xs text-gray-500">{formatDate(new Date())}</div>
                                  </div>
                                  {dateRangeOption === 'Today' && <Check className="h-4 w-4 text-green-600" />}
                                </div>
                                
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setDateRangeOption('This week');
                                    setShowDateRangeDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">This week</div>
                                    <div className="text-xs text-gray-500">
                                      {(() => {
                                        const range = getDateRangeForOption('This week');
                                        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
                                      })()}
                                    </div>
                                  </div>
                                  {dateRangeOption === 'This week' && <Check className="h-4 w-4 text-green-600" />}
                                </div>
                                
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setDateRangeOption('This month');
                                    setShowDateRangeDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">This month</div>
                                    <div className="text-xs text-gray-500">
                                      {(() => {
                                        const range = getDateRangeForOption('This month');
                                        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
                                      })()}
                                    </div>
                                  </div>
                                  {dateRangeOption === 'This month' && <Check className="h-4 w-4 text-green-600" />}
                                </div>
                                
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setDateRangeOption('Last week');
                                    setShowDateRangeDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">Last week</div>
                                    <div className="text-xs text-gray-500">
                                      {(() => {
                                        const range = getDateRangeForOption('Last week');
                                        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
                                      })()}
                                    </div>
                                  </div>
                                  {dateRangeOption === 'Last week' && <Check className="h-4 w-4 text-green-600" />}
                                </div>
                                
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setDateRangeOption('Last month');
                                    setShowDateRangeDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">Last month</div>
                                    <div className="text-xs text-gray-500">
                                      {(() => {
                                        const range = getDateRangeForOption('Last month');
                                        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
                                      })()}
                                    </div>
                                  </div>
                                  {dateRangeOption === 'Last month' && <Check className="h-4 w-4 text-green-600" />}
                                </div>
                                
                                <div
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-t border-gray-200"
                                  onClick={() => {
                                    setDateRangeOption('Custom');
                                    // Keep dropdown open for custom selection
                                  }}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">Custom</div>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                </div>
                                
                                {dateRangeOption === 'Custom' && (
                                  <div className="px-3 py-3 border-t border-gray-200 bg-gray-50">
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Start Date</label>
                                        <input
                                          type="date"
                                          value={customDateRange?.start || ''}
                                          onChange={(e) => setCustomDateRange(prev => ({ ...prev || { start: '', end: '' }, start: e.target.value }))}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">End Date</label>
                                        <input
                                          type="date"
                                          value={customDateRange?.end || ''}
                                          onChange={(e) => setCustomDateRange(prev => ({ ...prev || { start: '', end: '' }, end: e.target.value }))}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (customDateRange?.start && customDateRange?.end) {
                                            setShowDateRangeDropdown(false);
                                          }
                                        }}
                                        className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                        <FileText className="h-4 w-4" />
                        Export Weekly Paystubs
                      </button>
                    </div>
                  </div>

                  {/* Weekly Summary Table */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="p-6 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Weekly Summary - {timesheetMechanicFilter === 'all' 
                          ? 'All Employees' 
                          : mechanics.find(m => m.id === timesheetMechanicFilter)?.full_name || 'Selected Employee'}
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      {getFilteredTimesheets().length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mechanic</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {getFilteredTimesheets().slice(0, 10).map((timesheet) => (
                              <tr key={timesheet.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatDateString(timesheet.work_date)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-600">{timesheet.mechanic_name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-600">
                                  {timesheet.start_time} - {timesheet.end_time}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {timesheet.total_hours}h
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900">
                                  ${timesheet.payment_amount.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleEditTimesheet(timesheet)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTimesheet(timesheet.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-12">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheet entries yet</h3>
                          <p className="text-gray-600 mb-6">Start logging time to track mechanic hours and payments.</p>
                          <button
                            onClick={() => setShowLogTimeModal(true)}
                            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 mx-auto"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Log Time</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Statistics Cards */}
                  {getFilteredTimesheets().length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="h-5 w-5 text-gray-400" />
                          <div>
                        <div className="text-2xl font-bold text-gray-900">
                              {getFilteredTimesheets().reduce((sum, t) => sum + t.total_hours, 0).toFixed(1)}h
                        </div>
                        <div className="text-sm text-gray-600">Total Hours</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                        <div className="text-2xl font-bold text-green-600">
                              ${getFilteredTimesheets().reduce((sum, t) => sum + t.payment_amount, 0).toFixed(2)}
                        </div>
                            <div className="text-sm text-gray-600">Total Payments</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                        <div className="text-2xl font-bold text-gray-900">
                              {getFilteredTimesheets().length}
                        </div>
                            <div className="text-sm text-gray-600">Number of Entries</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                        <div className="text-2xl font-bold text-blue-600">
                              {new Set(getFilteredTimesheets().map(t => t.mechanic_id)).size}
                        </div>
                            <div className="text-sm text-gray-600">Number of Mechanics</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Other tabs placeholder (no "Coming Soon" text) */}
          {!['overview', 'work-orders', 'bays', 'invoices', 'settings', 'mechanics', 'customers', 'inventory', 'labor', 'estimates'].includes(activeTab) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h3>
              <p className="text-gray-600">This feature is under development.</p>
            </div>
          )}

          {/* Subscription Tier Info */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Subscription</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentTier.name} - {currentTier.price}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isFounder && subscriptionBypass && (
                  <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">All Features Unlocked</span>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Manage Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
                  <p className="text-sm text-gray-600 mt-1">Create a detailed invoice with line items for your customer.</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateInvoiceModal(false);
                    setInvoiceFormData({
                      customer_id: '',
                      work_order_id: '',
                      due_date: '',
                      tax_rate: 0.06,
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select 
                    value={invoiceFormData.customer_id}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => {
                      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.company || 'Unknown';
                      return (
                        <option key={customer.id} value={customer.id}>
                          {customerName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.due_date}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Work Order */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order (Optional)
                </label>
                <select 
                  value={invoiceFormData.work_order_id}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, work_order_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">None - Create invoice without work order</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.work_order_number || wo.id} - {wo.customer} - {wo.truck}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                  <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    <div>Type</div>
                    <div>Select Labor Item</div>
                    <div>Description</div>
                    <div>Qty</div>
                    <div>Price</div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-4">
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>Labor</option>
                      <option>Parts</option>
                      <option>Service</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>Choose labor item</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      defaultValue="1"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      defaultValue="0"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="0.06"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Card Processing Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Processing Fee
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Apply 2.5% card fee to this invoice</span>
                    <div className="relative">
                      <input type="checkbox" className="sr-only" defaultChecked />
                      <div className="w-10 h-6 bg-primary-500 rounded-full shadow-inner"></div>
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (6.0%):</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>$0.00</span>
                  </div>
                </div>
              </div>

              {/* Terms and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Payment due within 30 days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCreateInvoiceModal(false);
                  setInvoiceFormData({
                    customer_id: '',
                    work_order_id: '',
                    due_date: '',
                    tax_rate: 0.06,
                    notes: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement invoice creation handler
                  alert('Invoice creation functionality coming soon. For now, use the "Convert Estimate to Invoice" feature.');
                  setShowCreateInvoiceModal(false);
                  setInvoiceFormData({
                    customer_id: '',
                    work_order_id: '',
                    due_date: '',
                    tax_rate: 0.06,
                    notes: ''
                  });
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Work Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Work Order</h2>
                <button
                  onClick={() => {
                    setShowNewOrderModal(false);
    setSelectedCustomerNotes([]);
                    // Reset fleet truck selection and customer notes
                    setSelectedCustomerFleetTrucks([]);
                    setSelectedFleetTruck('');
                    setSelectedCustomerNotes([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select 
                    value={formData.customer}
                    onChange={async (e) => {
                      const selectedValue = e.target.value;
                      const selectedCustomer = customers.find(c => {
                        const customerName = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || 'Unknown';
                        return customerName === selectedValue;
                      });
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        customer: selectedValue,
                        customerId: selectedCustomer?.id || ''
                      }));
                      
                      // Fetch customer notes if customer is selected
                      if (selectedCustomer?.id) {
                        try {
                          // Try to fetch customer notes from customer_notes table
                          const { data: notesData, error: notesError } = await supabase
                            .from('customer_notes')
                            .select('*')
                            .eq('customer_id', selectedCustomer.id)
                            .order('created_at', { ascending: false });
                          
                          if (notesError) {
                            console.error('Error fetching customer notes:', notesError);
                            setSelectedCustomerNotes([]);
                          } else if (notesData && notesData.length > 0) {
                            console.log('✅ Fetched customer notes:', notesData);
                            const mappedNotes = notesData.map((note: any) => ({
                              id: note.id,
                              category: note.category || 'General',
                              note: note.note || note.note_text || ''
                            }));
                            console.log('✅ Mapped notes:', mappedNotes);
                            setSelectedCustomerNotes(mappedNotes);
                          } else {
                            console.log('ℹ️ No notes found for customer:', selectedCustomer.id);
                            setSelectedCustomerNotes([]);
                          }
                        } catch (error) {
                          console.error('Exception fetching customer notes:', error);
                          setSelectedCustomerNotes([]);
                        }
                      } else {
                        setSelectedCustomerNotes([]);
                      }
                      
                      // If fleet customer, fetch their trucks
                      if (selectedCustomer?.is_fleet && selectedCustomer.id) {
                        try {
                          const { data: fleetTrucks } = await supabase
                            .from('fleet_trucks')
                            .select('*')
                            .eq('customer_id', selectedCustomer.id)
                            .order('created_at', { ascending: false });
                          setSelectedCustomerFleetTrucks(fleetTrucks || []);
                        } catch (error) {
                          console.error('Error fetching fleet trucks:', error);
                          setSelectedCustomerFleetTrucks([]);
                        }
                      } else {
                        setSelectedCustomerFleetTrucks([]);
                        setSelectedFleetTruck('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => {
                      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.company || 'Unknown';
                      return (
                        <option key={customer.id} value={customerName}>
                          {customerName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Customer Notes & Alerts - Show when customer is selected */}
                {formData.customerId && (
                  <>
                    {selectedCustomerNotes.length > 0 && (
                      <div className="space-y-3">
                        {selectedCustomerNotes.map((note) => {
                          // Determine priority based on category
                          const isHighPriority = note.category === 'Warning' || note.category === 'Payment Issue';
                          
                          return (
                            <div 
                              key={note.id} 
                              className="bg-red-50 border border-red-200 rounded-lg p-4"
                            >
                              <div className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-semibold text-red-900 mb-1">
                                    Customer Alert - {isHighPriority ? 'HIGH' : 'MEDIUM'} Priority
                                  </div>
                                  <div className="text-sm text-red-800">
                                    {note.note}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Customer Stats */}
                    {(() => {
                      const selectedCustomer = customers.find(c => c.id === formData.customerId);
                      if (!selectedCustomer) return null;
                      
                      // Calculate visits (work orders count)
                      const customerVisits = workOrders.filter(wo => wo.customer_id === formData.customerId).length;
                      
                      // Calculate total spent (sum of invoices)
                      const customerTotalSpent = invoices
                        .filter(inv => inv.customer_id === formData.customerId)
                        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
                      
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Visits</span>
                              <span className="text-sm text-gray-900">{customerVisits}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Total Spent</span>
                              <span className="text-sm text-gray-900">${customerTotalSpent.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Fleet Truck Selection - Show if fleet customer has trucks */}
                {selectedCustomerFleetTrucks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Fleet Truck
                    </label>
                    <select 
                      value={selectedFleetTruck}
                      onChange={(e) => {
                        const truckId = e.target.value;
                        setSelectedFleetTruck(truckId);
                        
                        // Find the selected truck
                        const truck = selectedCustomerFleetTrucks.find(t => t.id === truckId);
                        if (truck) {
                          // Auto-fill form fields
                          setFormData(prev => ({
                            ...prev,
                            truckNumber: truck.unit_no || '',
                            vin: truck.vin || '',
                            makeModel: [truck.make, truck.model].filter(Boolean).join(' ') || '',
                            // Note: trailerNumber and engineType are not in fleet_trucks table
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-blue-50"
                    >
                      <option value="">Select a truck...</option>
                      {selectedCustomerFleetTrucks.map((truck) => {
                        const truckLabel = [
                          truck.unit_no && `Unit #${truck.unit_no}`,
                          truck.make,
                          truck.model,
                          truck.year && `(${truck.year})`
                        ].filter(Boolean).join(' ') || 'Unnamed Truck';
                        return (
                          <option key={truck.id} value={truck.id}>
                            {truckLabel}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecting a truck will auto-fill the vehicle information below
                    </p>
                  </div>
                )}

                {/* Vehicle Information Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Truck # *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter truck number"
                      value={formData.truckNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, truckNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VIN#
                    </label>
                    <input
                      type="text"
                      placeholder="Vehicle identification number"
                      value={formData.vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make/Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ford F-150"
                      value={formData.makeModel}
                      onChange={(e) => setFormData(prev => ({ ...prev, makeModel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Trailer and Engine Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trailer#
                    </label>
                    <input
                      type="text"
                      placeholder="Enter trailer number"
                      value={formData.trailerNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, trailerNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Engine Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. V8 Diesel, V6 Gas"
                      value={formData.engineType}
                      onChange={(e) => setFormData(prev => ({ ...prev, engineType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Service Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Oil Change, Brake Service, etc."
                    value={formData.serviceTitle}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData(prev => {
                        const updated = { ...prev, serviceTitle: newTitle };
                        // Auto-select recommended bay if it matches the service title
                        const recommendedBay = getRecommendedBay(newTitle);
                        if (recommendedBay) {
                          const bayName = recommendedBay.bay_name || `Bay ${recommendedBay.bay_number}`;
                          // Only auto-select if:
                          // 1. No bay is currently selected, OR
                          // 2. The recommended bay is different from current selection and matches better
                          if (!prev.selectedBay || prev.selectedBay === 'Bay TBD') {
                            updated.selectedBay = bayName;
                          } else {
                            // Check if the recommended bay matches the service title better
                            const normalizedTitle = newTitle.toLowerCase().trim();
                            const currentBayName = prev.selectedBay.toLowerCase();
                            const recommendedBayName = bayName.toLowerCase();
                            
                            // If recommended bay name is in the service title, use it
                            if (normalizedTitle.includes(recommendedBayName) && !normalizedTitle.includes(currentBayName)) {
                              updated.selectedBay = bayName;
                            }
                          }
                        }
                        return updated;
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detailed description of the work to be performed..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>

                {/* Priority and Mechanic Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Employee
                    </label>
                    <select 
                      value={formData.mechanic}
                      onChange={(e) => setFormData(prev => ({ ...prev, mechanic: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Assign employee (optional)</option>
                      {mechanics.filter(m => m.is_active).map((mechanic) => (
                        <option key={mechanic.id} value={mechanic.id}>
                          {mechanic.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estimated Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Hours *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Minutes *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Smart Bay Assignment */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Smart Bay Assignment</h3>
                    <p className="text-sm text-gray-600">Select a bay or we'll auto-assign to the best available option</p>
                  </div>

                  {/* Recommended Bay */}
                  {(() => {
                    const recommendedBay = getRecommendedBay(formData.serviceTitle);
                    if (recommendedBay) {
                      const bayName = recommendedBay.bay_name || `Bay ${recommendedBay.bay_number}`;
                      return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                                <h4 className="font-medium text-green-900">Recommended: {bayName}</h4>
                                <p className="text-sm text-green-700">
                                  {formData.serviceTitle 
                                    ? `Perfect match for "${formData.serviceTitle}"`
                                    : 'This bay is ready and has no waitlist'}
                                </p>
                        </div>
                      </div>
                            <button 
                              onClick={() => setFormData(prev => ({ ...prev, selectedBay: bayName }))}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                        Available Now
                      </button>
                    </div>
                  </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Bay Selection Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {serviceBays.length > 0 ? (
                      serviceBays.map((bay: any) => {
                        const bayName = bay.bay_name || `Bay ${bay.bay_number}`;
                        const isAvailable = bay.is_available;
                        const isSelected = formData.selectedBay === bayName;
                        return (
                          <div
                            key={bay.id}
                            onClick={() => {
                              // Allow selecting any bay - available bays start immediately, occupied bays go to waitlist
                              setFormData(prev => ({ ...prev, selectedBay: bayName }));
                            }}
                            className={`p-4 border rounded-lg transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{bayName}</h4>
                                <p className="text-sm text-gray-600">
                                  {isAvailable ? 'Starts immediately' : 'Add to waitlist'}
                                </p>
                              </div>
                              <button 
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  isAvailable
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                                disabled={!isAvailable}
                              >
                                {isAvailable ? 'Open' : 'Busy'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-center text-gray-500 py-4">
                        No bays available. Please add a bay first.
                      </div>
                    )}
                    {/* Option to create work order without bay assignment */}
                    <div
                      onClick={() => setFormData(prev => ({ ...prev, selectedBay: 'Bay TBD' }))}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.selectedBay === 'Bay TBD'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                          <h4 className="font-medium text-gray-900">Bay TBD</h4>
                          <p className="text-sm text-gray-600">Assign later</p>
                          </div>
                        <button className="bg-gray-400 text-white px-2 py-1 rounded text-xs">
                          TBD
                          </button>
                        </div>
                      </div>
                  </div>

                  {/* Selected Bay Indicator */}
                  {formData.selectedBay && formData.selectedBay !== 'Bay TBD' && (() => {
                    const selectedBay = serviceBays.find((b: any) => {
                      const bName = b.bay_name || `Bay ${b.bay_number}`;
                      return bName === formData.selectedBay;
                    });
                    const isAvailable = selectedBay?.is_available;
                    return (
                      <div className={`flex items-center space-x-2 ${isAvailable ? 'text-green-700' : 'text-orange-700'}`}>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          ✓ Selected: {formData.selectedBay} - {isAvailable ? 'Will start immediately' : 'Will be added to waitlist'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowNewOrderModal(false);
                  // Reset fleet truck selection and customer notes
                  setSelectedCustomerFleetTrucks([]);
                  setSelectedFleetTruck('');
                  setSelectedCustomerNotes([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mechanic Modal */}
      {showAddMechanicModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingMechanic ? 'Edit Mechanic' : 'Add Mechanic'}</h2>
                <button
                  onClick={() => {
                    setShowAddMechanicModal(false);
                    setEditingMechanic(null);
                    resetMechanicForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">{editingMechanic ? 'Update mechanic information.' : 'Add a new mechanic to your team.'}</p>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={mechanicFormData.full_name}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role/Title *
                    </label>
                    <input
                      type="text"
                      placeholder="Senior Mechanic, Brake Specialist, etc."
                      value={mechanicFormData.role_title}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, role_title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Duties Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duties Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the mechanic's primary responsibilities and duties..."
                    value={mechanicFormData.duties_description}
                    onChange={(e) => setMechanicFormData(prev => ({ ...prev, duties_description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="mechanic@example.com"
                      value={mechanicFormData.email}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={mechanicFormData.phone}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Employment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={mechanicFormData.hourly_rate}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      value={mechanicFormData.hire_date}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Status and Vacation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select 
                      value={mechanicFormData.status}
                      onChange={(e) => setMechanicFormData(prev => ({ ...prev, status: e.target.value as 'Available' | 'Busy' | 'Vacation' | 'Off' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Vacation">Vacation</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vacation Weeks Per Year
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 2"
                        value={mechanicFormData.vacation_weeks_per_year}
                        onChange={(e) => setMechanicFormData(prev => ({ ...prev, vacation_weeks_per_year: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vacation Weeks Used
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 1"
                        value={mechanicFormData.vacation_weeks_used}
                        onChange={(e) => setMechanicFormData(prev => ({ ...prev, vacation_weeks_used: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active
                    </label>
                    <p className="text-sm text-gray-600">Include in work assignments</p>
                  </div>
                  <button
                    onClick={() => setMechanicFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      mechanicFormData.is_active ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        mechanicFormData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Default Working Hours */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Default Working Hours</h3>
                  <p className="text-sm text-gray-600 mb-4">Set default start and end times used for the 'Full Hours' quick option in timesheets.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={mechanicFormData.default_start_time}
                        onChange={(e) => setMechanicFormData(prev => ({ ...prev, default_start_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={mechanicFormData.default_end_time}
                        onChange={(e) => setMechanicFormData(prev => ({ ...prev, default_end_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <input
                    type="text"
                    placeholder="Add skills"
                    value={mechanicFormData.skills.join(', ')}
                    onChange={(e) => setMechanicFormData(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Separate skills with commas</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional information about the mechanic..."
                    value={mechanicFormData.notes}
                    onChange={(e) => setMechanicFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddMechanicModal(false);
                  setEditingMechanic(null);
                  resetMechanicForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMechanic}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {editingMechanic ? 'Update Mechanic' : 'Add Mechanic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Week Settings Modal */}
      {showWeekSettingsModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-bold text-gray-900">Business Week Settings</h2>
                </div>
                <button
                  onClick={() => setShowWeekSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Starts On
                  </label>
                  <select
                    value={weekSettings.weekStart}
                    onChange={(e) => {
                      const newSettings = { ...weekSettings, weekStart: e.target.value };
                      setWeekSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Ends On
                  </label>
                  <select
                    value={weekSettings.weekEnd}
                    onChange={(e) => {
                      const newSettings = { ...weekSettings, weekEnd: e.target.value };
                      setWeekSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Your business week will run from <strong>{weekSettings.weekStart}</strong> to <strong>{weekSettings.weekEnd}</strong>. This setting will be used for weekly paystub exports.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowWeekSettingsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('ez2invoice-week-settings', JSON.stringify(weekSettings));
                  }
                  setSelectedWeekRange(null); // Reset to current week
                  setShowWeekSettingsModal(false);
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Time Modal */}
      {showLogTimeModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowLogTimeModal(false);
            setEditingTimesheet(null);
            setTimesheetFormData({
              mechanic_id: '',
              work_date: '',
              start_time: '',
              end_time: '',
              notes: '',
              useFullHours: false
            });
            setSelectedMechanicIds([]);
            setMechanicSearchTerm('');
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingTimesheet ? 'Edit Time Entry' : 'Log Time Entry'}</h2>
                <button
                  onClick={() => {
                    setShowLogTimeModal(false);
                    setEditingTimesheet(null);
                    setTimesheetFormData({
                      mechanic_id: '',
                      work_date: '',
                      start_time: '',
                      end_time: '',
                      notes: '',
                      useFullHours: false
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee *
                  </label>
                  
                  {/* Select All Checkbox */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMechanicIds.length === mechanics.filter(m => m.is_active).length && mechanics.filter(m => m.is_active).length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allActiveMechanicIds = mechanics.filter(m => m.is_active).map(m => m.id);
                            setSelectedMechanicIds(allActiveMechanicIds);
                          } else {
                            setSelectedMechanicIds([]);
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Select All Employees
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({selectedMechanicIds.length} of {mechanics.filter(m => m.is_active).length} selected)
                      </span>
                    </label>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees by name..."
                      value={mechanicSearchTerm}
                      onChange={(e) => setMechanicSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>

                  {/* Mechanics List */}
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {mechanics
                      .filter(m => m.is_active)
                      .filter(m => 
                        mechanicSearchTerm === '' || 
                        m.full_name.toLowerCase().includes(mechanicSearchTerm.toLowerCase())
                      )
                      .map((mechanic) => (
                        <label
                          key={mechanic.id}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMechanicIds.includes(mechanic.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMechanicIds([...selectedMechanicIds, mechanic.id]);
                              } else {
                                setSelectedMechanicIds(selectedMechanicIds.filter(id => id !== mechanic.id));
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-700 flex-1">
                            {mechanic.full_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            (${mechanic.hourly_rate || 0}/hr)
                          </span>
                        </label>
                      ))}
                    {mechanics.filter(m => m.is_active && (
                      mechanicSearchTerm === '' || 
                      m.full_name.toLowerCase().includes(mechanicSearchTerm.toLowerCase())
                    )).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No employees found
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={timesheetFormData.work_date}
                    onChange={(e) => setTimesheetFormData(prev => ({ ...prev, work_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useFullHours"
                    checked={timesheetFormData.useFullHours}
                    onChange={(e) => {
                      setTimesheetFormData(prev => ({
                        ...prev,
                        useFullHours: e.target.checked,
                        start_time: e.target.checked ? '08:30' : prev.start_time,
                        end_time: e.target.checked ? '17:30' : prev.end_time
                      }));
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useFullHours" className="ml-2 block text-sm text-gray-700">
                    Use full hours (08:30:00 - 17:30:00)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={timesheetFormData.start_time}
                      onChange={(e) => setTimesheetFormData(prev => ({ ...prev, start_time: e.target.value, useFullHours: false }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={timesheetFormData.end_time}
                      onChange={(e) => setTimesheetFormData(prev => ({ ...prev, end_time: e.target.value, useFullHours: false }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Calculated Information */}
                {timesheetFormData.mechanic_id && timesheetFormData.start_time && timesheetFormData.end_time && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="font-medium text-gray-900">{calculateHours(timesheetFormData.start_time, timesheetFormData.end_time).toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hourly Rate:</span>
                      <span className="font-medium text-gray-900">${(mechanics.find(m => m.id === timesheetFormData.mechanic_id)?.hourly_rate || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600 font-medium">Total Payment:</span>
                      <span className="font-bold text-gray-900">${(calculateHours(timesheetFormData.start_time, timesheetFormData.end_time) * (mechanics.find(m => m.id === timesheetFormData.mechanic_id)?.hourly_rate || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Optional notes about the work performed..."
                    value={timesheetFormData.notes}
                    onChange={(e) => setTimesheetFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowLogTimeModal(false);
                  setEditingTimesheet(null);
                  setTimesheetFormData({
                    mechanic_id: '',
                    work_date: '',
                    start_time: '',
                    end_time: '',
                    notes: '',
                    useFullHours: false
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogTime}
                disabled={selectedMechanicIds.length === 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedMechanicIds.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {editingTimesheet ? 'Update Time' : `Log Time for ${selectedMechanicIds.length} Employee${selectedMechanicIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bay Modal */}
      {showAddBayModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Bay</h2>
                <button
                  onClick={() => setShowAddBayModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bay Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bay 6, Bay A, Repair Bay 1"
                    value={newBayName}
                    onChange={(e) => setNewBayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddBayModal(false);
                  setNewBayName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBay}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Add Bay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Labor Item Modal */}
      {showAddLaborModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Labor Item</h2>
              <button onClick={()=>setShowAddLaborModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                  <input value={laborForm.service_name} onChange={(e)=>setLaborForm(prev=>({...prev,service_name:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Oil Change" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input value={laborForm.category} onChange={(e)=>setLaborForm(prev=>({...prev,category:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Select category" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={laborForm.description} onChange={(e)=>setLaborForm(prev=>({...prev,description:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Description of the service..." rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate Type</label>
                  <select value={laborForm.rate_type} onChange={(e)=>setLaborForm(prev=>({...prev,rate_type:e.target.value as 'fixed'|'hourly'}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="fixed">Fixed Rate</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate ($)</label>
                  <input type="number" value={laborForm.rate} onChange={(e)=>setLaborForm(prev=>({...prev,rate:Number(e.target.value)}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours (Optional)</label>
                  <input type="number" value={laborForm.est_hours} onChange={(e)=>setLaborForm(prev=>({...prev,est_hours:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={()=>setShowAddLaborModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={async ()=>{
                if(!laborForm.service_name.trim()){ console.warn('Service name is required'); return; }
                const { data: userData } = await supabase.auth.getUser();
                const { data, error } = await supabase.from('labor_items').insert({
                  user_id: userData?.user?.id || null,
                  service_name: laborForm.service_name.trim(),
                  category: laborForm.category || null,
                  description: laborForm.description || null,
                  rate_type: laborForm.rate_type,
                  rate: Number(laborForm.rate) || 0,
                  est_hours: laborForm.est_hours ? Number(laborForm.est_hours) : null
                }).select();
                
                if(error){
                  const isEmptyError = !error || 
                    (typeof error === 'object' && 
                     Object.keys(error).length === 0) ||
                    JSON.stringify(error) === '{}';
                  const errorCode = (error as any)?.code || '';
                  const errorMessage = (error as any)?.message || '';
                  const errorDetails = (error as any)?.details || '';
                  const errorHint = (error as any)?.hint || '';
                  
                  // Only log non-empty errors to console
                  if (!isEmptyError && (errorCode || errorMessage || errorDetails || errorHint)) {
                    console.error('Create labor item error:', error);
                  }
                  
                  if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
                    console.error('❌ Failed to create labor item: Row-level security (RLS) policy is blocking this operation.\n\n✅ SOLUTION: Go to your Supabase SQL Editor and run the contents of fix-rls-policies.sql file to create the necessary RLS policies.\n\nThe file is located at: ez2invoice/fix-rls-policies.sql');
                  } else if (errorMessage?.includes("Could not find the 'est_hours' column") || errorMessage?.includes("est_hours") || errorMessage?.includes("column") && errorDetails?.includes("est_hours")) {
                    console.error('❌ Labor items table is missing the "est_hours" column.\n\n✅ SOLUTION: Run the fix-labor-items-columns.sql file in your Supabase SQL Editor to add the missing columns.\n\nThe file is located at: ez2invoice/fix-labor-items-columns.sql');
                  } else {
                    // Check if it's a table not found error
                    const hasTableNotFoundError = 
                      errorCode === 'PGRST116' || 
                      errorMessage.includes('relation "labor_items" does not exist') ||
                      errorMessage.includes('table "labor_items" does not exist') ||
                      errorCode === '42P01';
                    
                    if (hasTableNotFoundError) {
                      console.error('❌ Labor items table not found.\n\n✅ SOLUTION: Run the customers-schema.sql file in your Supabase SQL Editor to create the labor_items table.\n\nThe file is located at: ez2invoice/customers-schema.sql');
                    } else {
                      const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(error);
                      console.error(`❌ Failed to create labor item: ${errorMsg || 'Unknown error'}`);
                    }
                  }
                  return;
                }
                
                if(data){
                  setShowAddLaborModal(false);
                  setLaborForm({ service_name:'', category:'', description:'', rate_type:'hourly', rate:0, est_hours:'' });
                  fetchLaborItems();
                }
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Create Labor Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Item Modal */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddInventoryModal(false);
            setEditingInventoryItem(null);
            setInventoryForm({ name: '', category: '', description: '', sku: '', supplier: '', location: '', quantity: 0, min_stock: 0, unit_price: 0, cost: 0 });
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingInventoryItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
              <button onClick={()=>{
                setShowAddInventoryModal(false);
                setEditingInventoryItem(null);
                setInventoryForm({ name: '', category: '', description: '', sku: '', supplier: '', location: '', quantity: 0, min_stock: 0, unit_price: 0, cost: 0 });
              }} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part Name *</label>
                  <input 
                    type="text"
                    value={inventoryForm.name} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,name:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="Brake Pad Set"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part Number / SKU *</label>
                  <input 
                    type="text"
                    value={inventoryForm.sku} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,sku:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="BP-12345" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input 
                    type="text"
                    value={inventoryForm.category} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,category:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="Brakes, Engine, etc." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <input 
                    type="text"
                    value={inventoryForm.supplier} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,supplier:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="Supplier name" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  value={inventoryForm.description} 
                  onChange={(e)=>setInventoryForm(prev=>({...prev,description:e.target.value}))} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  placeholder="Description of the part..." 
                  rows={3} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost ($) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={inventoryForm.cost} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,cost:Number(e.target.value)||0}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price ($) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={inventoryForm.unit_price} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,unit_price:Number(e.target.value)||0}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity in Stock</label>
                  <input 
                    type="number" 
                    value={inventoryForm.quantity} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,quantity:Number(e.target.value)||0}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stock Level</label>
                  <input 
                    type="number" 
                    value={inventoryForm.min_stock} 
                    onChange={(e)=>setInventoryForm(prev=>({...prev,min_stock:Number(e.target.value)||0}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={()=>{
                  setShowAddInventoryModal(false);
                  setEditingInventoryItem(null);
                  setInventoryForm({ name: '', category: '', description: '', sku: '', supplier: '', location: '', quantity: 0, min_stock: 0, unit_price: 0, cost: 0 });
                }} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={async ()=>{
                  if(!inventoryForm.name.trim()){ 
                    console.warn('Part name is required'); 
                    return; 
                  }
                  if(!inventoryForm.sku.trim()){ 
                    console.warn('Part number / SKU is required'); 
                    return; 
                  }
                  
                  // Get user and shop_id
                  const { data: userData } = await supabase.auth.getUser();
                  if (!userData?.user?.id) {
                    console.error('❌ You must be logged in to add inventory items.');
                    return;
                  }
                  
                  // Get shop_id from truck_shops table
                  const { data: shopData, error: shopError } = await supabase
                    .from('truck_shops')
                    .select('id')
                    .eq('user_id', userData.user.id)
                    .limit(1)
                    .single();
                  
                  if (shopError || !shopData) {
                    // If no shop found, try to create one or use null (RLS might handle it)
                    console.warn('No shop found for user, attempting insert without shop_id (RLS may handle it)');
                  }
                  
                  let data, error;
                  
                  if (editingInventoryItem) {
                    // Update existing item
                    ({ data, error } = await supabase.from('parts').update({
                      part_number: inventoryForm.sku.trim(),
                      part_name: inventoryForm.name.trim(),
                      description: inventoryForm.description || null,
                      category: inventoryForm.category || null,
                      cost: Number(inventoryForm.cost) || 0,
                      selling_price: Number(inventoryForm.unit_price) || 0,
                      quantity_in_stock: Number(inventoryForm.quantity) || 0,
                      minimum_stock_level: Number(inventoryForm.min_stock) || 0,
                      supplier: inventoryForm.supplier || null
                    }).eq('id', editingInventoryItem).select());
                  } else {
                    // Insert new item
                    ({ data, error } = await supabase.from('parts').insert({
                      shop_id: shopData?.id || null,
                      part_number: inventoryForm.sku.trim(),
                      part_name: inventoryForm.name.trim(),
                      description: inventoryForm.description || null,
                      category: inventoryForm.category || null,
                      cost: Number(inventoryForm.cost) || 0,
                      selling_price: Number(inventoryForm.unit_price) || 0,
                      quantity_in_stock: Number(inventoryForm.quantity) || 0,
                      minimum_stock_level: Number(inventoryForm.min_stock) || 0,
                      supplier: inventoryForm.supplier || null
                    }).select());
                  }
                  
                  if(error){
                    const isEmptyError = !error || 
                      (typeof error === 'object' && 
                       Object.keys(error).length === 0) ||
                      JSON.stringify(error) === '{}';
                    const errorCode = (error as any)?.code || '';
                    const errorMessage = (error as any)?.message || '';
                    const errorDetails = (error as any)?.details || '';
                    const errorHint = (error as any)?.hint || '';
                    
                    // Only log non-empty errors to console
                    if (!isEmptyError && (errorCode || errorMessage || errorDetails || errorHint)) {
                      console.error(editingInventoryItem ? 'Update inventory item error:' : 'Create inventory item error:', error);
                    }
                    
                    if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
                      console.error(`❌ Failed to ${editingInventoryItem ? 'update' : 'create'} inventory item: Row-level security (RLS) policy is blocking this operation.\n\n✅ SOLUTION: Go to your Supabase SQL Editor and run the contents of fix-rls-policies.sql file to create the necessary RLS policies.\n\nThe file is located at: ez2invoice/fix-rls-policies.sql`);
                    } else {
                      // Check if it's a table not found error
                      const hasTableNotFoundError = 
                        errorCode === 'PGRST116' || 
                        errorMessage.includes('relation "parts" does not exist') ||
                        errorMessage.includes('table "parts" does not exist') ||
                        errorCode === '42P01';
                      
                      if (hasTableNotFoundError) {
                        console.error('❌ Parts table not found.\n\n✅ SOLUTION: Run the database-schema.sql file in your Supabase SQL Editor to create the parts table.\n\nThe file is located at: ez2invoice/database-schema.sql');
                      } else {
                        const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(error);
                        console.error(`❌ Failed to ${editingInventoryItem ? 'update' : 'create'} inventory item: ${errorMsg || 'Unknown error'}`);
                      }
                    }
                    return;
                  }
                  
                  if(data){
                    setShowAddInventoryModal(false);
                    setEditingInventoryItem(null);
                    setInventoryForm({ name: '', category: '', description: '', sku: '', supplier: '', location: '', quantity: 0, min_stock: 0, unit_price: 0, cost: 0 });
                    fetchInventory();
                  }
                }} 
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                {editingInventoryItem ? 'Update Inventory Item' : 'Add Inventory Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAdjustModal(null);
            setAdjustForm({ type: '', change: '', reason: '', notes: '' });
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
                <p className="text-sm text-gray-600 mt-1">{showAdjustModal.part_name} ({showAdjustModal.part_number})</p>
                <p className="text-sm text-gray-500 mt-1">Current Stock: {showAdjustModal.quantity_in_stock}</p>
              </div>
              <button 
                onClick={() => {
                  setShowAdjustModal(null);
                  setAdjustForm({ type: '', change: '', reason: '', notes: '' });
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6"/>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type *</label>
                  <select 
                    value={adjustForm.type} 
                    onChange={(e) => setAdjustForm(prev => ({ ...prev, type: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select type</option>
                    <option value="add">Add Stock</option>
                    <option value="remove">Remove Stock</option>
                    <option value="set">Set Quantity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={adjustForm.change} 
                    onChange={(e) => setAdjustForm(prev => ({ ...prev, change: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input 
                  type="text"
                  value={adjustForm.reason} 
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  placeholder="e.g., Received shipment, Used for repair, etc." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea 
                  value={adjustForm.notes} 
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, notes: e.target.value }))} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  placeholder="Additional notes..." 
                  rows={3} 
                />
              </div>
              {adjustForm.type && adjustForm.change && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">New Quantity:</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adjustForm.type === 'add' 
                      ? showAdjustModal.quantity_in_stock + Number(adjustForm.change)
                      : adjustForm.type === 'remove'
                      ? Math.max(0, showAdjustModal.quantity_in_stock - Number(adjustForm.change))
                      : Number(adjustForm.change)
                    }
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowAdjustModal(null);
                  setAdjustForm({ type: '', change: '', reason: '', notes: '' });
                }} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!adjustForm.type) {
                    console.warn('Please select an adjustment type');
                    return;
                  }
                  if (!adjustForm.change || Number(adjustForm.change) <= 0) {
                    console.warn('Please enter a valid amount');
                    return;
                  }
                  
                  let newQuantity: number;
                  let quantityChange: number;
                  if (adjustForm.type === 'add') {
                    quantityChange = Number(adjustForm.change);
                    newQuantity = showAdjustModal.quantity_in_stock + quantityChange;
                  } else if (adjustForm.type === 'remove') {
                    quantityChange = -Number(adjustForm.change);
                    newQuantity = Math.max(0, showAdjustModal.quantity_in_stock - Number(adjustForm.change));
                  } else {
                    newQuantity = Number(adjustForm.change);
                    quantityChange = newQuantity - showAdjustModal.quantity_in_stock;
                  }
                  
                  const { data, error } = await supabase
                    .from('parts')
                    .update({
                      quantity_in_stock: newQuantity
                    })
                    .eq('id', showAdjustModal.id)
                    .select();
                  
                  // Record in inventory history
                  if (data && !error) {
                    const { data: userData } = await supabase.auth.getUser();
                    await supabase.from('inventory_history').insert({
                      part_id: showAdjustModal.id,
                      activity_type: 'adjustment',
                      quantity_change: quantityChange,
                      quantity_before: showAdjustModal.quantity_in_stock,
                      quantity_after: newQuantity,
                      reason: adjustForm.reason || null,
                      notes: adjustForm.notes || null,
                      created_by: userData?.user?.email || 'System'
                    });
                  }
                  
                  if (error) {
                    const isEmptyError = !error || 
                      (typeof error === 'object' && 
                       Object.keys(error).length === 0) ||
                      JSON.stringify(error) === '{}';
                    const errorCode = (error as any)?.code || '';
                    const errorMessage = (error as any)?.message || '';
                    const errorDetails = (error as any)?.details || '';
                    const errorHint = (error as any)?.hint || '';
                    
                    if (!isEmptyError && (errorCode || errorMessage || errorDetails || errorHint)) {
                      console.error('Adjust inventory error:', error);
                    }
                    
                    if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
                      console.error('❌ Failed to adjust inventory: Row-level security (RLS) policy is blocking this operation.\n\n✅ SOLUTION: Go to your Supabase SQL Editor and run the contents of fix-rls-policies.sql file to create the necessary RLS policies.\n\nThe file is located at: ez2invoice/fix-rls-policies.sql');
                    } else {
                      const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(error);
                      console.error(`❌ Failed to adjust inventory: ${errorMsg || 'Unknown error'}`);
                    }
                    return;
                  }
                  
                  if (data) {
                    setShowAdjustModal(null);
                    setAdjustForm({ type: '', change: '', reason: '', notes: '' });
                    fetchInventory();
                  }
                }} 
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowHistoryModal(null);
            setInventoryHistory([]);
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-bold text-gray-900">Adjustment History</h2>
                </div>
                <p className="text-sm text-gray-600 mt-1">{showHistoryModal.part_name} ({showHistoryModal.part_number})</p>
              </div>
              <button 
                onClick={() => {
                  setShowHistoryModal(null);
                  setInventoryHistory([]);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6"/>
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Movements</h3>
              {inventoryHistoryLoading ? (
                <div className="text-center text-gray-600 py-12">Loading history...</div>
              ) : inventoryHistory.length === 0 ? (
                <div className="text-center text-gray-600 py-12">No inventory history available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Activity</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created by</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Change</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Before</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">After</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryHistory.map((entry) => {
                        const date = new Date(entry.created_at);
                        const formattedDate = date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const activityType = entry.activity_type || 'adjustment';
                        const activityLabel = activityType.charAt(0).toUpperCase() + activityType.slice(1);
                        const isPositive = entry.quantity_change > 0;
                        const isNegative = entry.quantity_change < 0;
                        
                        return (
                          <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-600">{formattedDate}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                activityType === 'sale' ? 'bg-red-100 text-red-800' :
                                activityType === 'return' ? 'bg-gray-100 text-gray-800' :
                                activityType === 'received' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {activityLabel}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{entry.created_by || 'System'}</td>
                            <td className={`py-3 px-4 text-sm text-right font-medium ${
                              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {isPositive ? '+' : ''}{entry.quantity_change}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-gray-600">{entry.quantity_before}</td>
                            <td className="py-3 px-4 text-sm text-right font-bold text-gray-900">{entry.quantity_after}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{entry.reason || entry.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Labor Item Modal */}
      {editLaborItem && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Labor Item</h2>
              <button onClick={()=>setEditLaborItem(null)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                  <input defaultValue={editLaborItem.service_name} onChange={(e)=>setLaborForm(prev=>({...prev,service_name:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input defaultValue={editLaborItem.category || ''} onChange={(e)=>setLaborForm(prev=>({...prev,category:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea defaultValue={editLaborItem.description || ''} onChange={(e)=>setLaborForm(prev=>({...prev,description:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate Type</label>
                  <select defaultValue={editLaborItem.rate_type} onChange={(e)=>setLaborForm(prev=>({...prev,rate_type:e.target.value as 'fixed'|'hourly'}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="fixed">Fixed Rate</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate ($)</label>
                  <input type="number" defaultValue={editLaborItem.rate} onChange={(e)=>setLaborForm(prev=>({...prev,rate:Number(e.target.value)}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours (Optional)</label>
                  <input type="number" defaultValue={editLaborItem.est_hours ?? ''} onChange={(e)=>setLaborForm(prev=>({...prev,est_hours:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={()=>setEditLaborItem(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={async ()=>{
                const updates:any = {
                  service_name: laborForm.service_name || editLaborItem.service_name,
                  category: laborForm.category || editLaborItem.category,
                  description: laborForm.description || editLaborItem.description,
                  rate_type: (laborForm.rate_type || editLaborItem.rate_type) as 'fixed'|'hourly',
                  rate: laborForm.rate || editLaborItem.rate,
                  est_hours: laborForm.est_hours ? Number(laborForm.est_hours) : editLaborItem.est_hours
                };
                const { error } = await supabase.from('labor_items').update(updates).eq('id', editLaborItem.id);
                if(error){ console.error('Update labor item error:', error); return; }
                setEditLaborItem(null);
                fetchLaborItems();
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Estimate Modal */}
      {showCreateEstimateModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create New Estimate</h2>
              <button onClick={()=>setShowCreateEstimateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                  <select value={estimateCustomerId} onChange={(e)=>setEstimateCustomerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="">Select a customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}> {[c.first_name,c.last_name].filter(Boolean).join(' ') || c.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                  <input type="date" value={estimateValidUntil} onChange={(e)=>setEstimateValidUntil(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Line Items</h3>
                  <button onClick={()=> setEstimateItems(prev => [...prev, { item_type:'labor', description:'', quantity:1, unit_price:0, total_price:0 }])} className="px-3 py-1 bg-gray-900 text-white rounded">Add Item</button>
                </div>
                <div className="space-y-3">
                  {estimateItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select value={item.item_type} onChange={(e)=>{
                        const t = e.target.value as 'labor'|'part'|'fee';
                        setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, item_type:t }: p));
                      }} className="col-span-2 px-2 py-2 border rounded">
                        <option value="labor">Labor</option>
                        <option value="part">Part</option>
                        <option value="fee">Fee</option>
                      </select>
                      <select onChange={(e)=>{
                        const ref = e.target.value;
                        if(item.item_type==='labor'){
                          const li = laborItems.find(l=>l.id===ref);
                          setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, reference_id: ref, description: li?.service_name || '', unit_price: li ? li.rate : 0, total_price: (p.quantity||1)*(li? li.rate:0)}: p));
                        } else if(item.item_type==='part'){
                          const pi = inventory.find(x=>x.id===ref);
                          setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, reference_id: ref, description: pi?.part_name || '', unit_price: pi ? pi.selling_price : 0, total_price: (p.quantity||1)*(pi? pi.selling_price:0)}: p));
                        }
                      }} className="col-span-3 px-2 py-2 border rounded">
                        <option value="">Choose item</option>
                        {(item.item_type==='labor'? laborItems.map(l=> (<option key={l.id} value={l.id}>{l.service_name}</option>)) : inventory.map(p=> (<option key={p.id} value={p.id}>{p.part_name}</option>)))}
                      </select>
                      <input value={item.description} onChange={(e)=> setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, description:e.target.value }: p))} placeholder="Description" className="col-span-3 px-2 py-2 border rounded" />
                      <input type="number" value={item.quantity} onChange={(e)=>{ const q = Number(e.target.value)||0; setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, quantity:q, total_price: +(q*(p.unit_price||0)).toFixed(2) }: p)); }} className="col-span-1 px-2 py-2 border rounded" />
                      <input type="number" value={item.unit_price} onChange={(e)=>{ const u = Number(e.target.value)||0; setEstimateItems(prev=> prev.map((p,i)=> i===idx? {...p, unit_price:u, total_price: +((p.quantity||0)*u).toFixed(2) }: p)); }} className="col-span-1 px-2 py-2 border rounded" />
                      <div className="col-span-1 text-right font-medium">${(item.total_price||0).toFixed(2)}</div>
                      <button onClick={()=> setEstimateItems(prev=> prev.filter((_,i)=> i!==idx))} className="col-span-1 text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                  <input type="number" value={estimateTaxRate} onChange={(e)=> setEstimateTaxRate(Number(e.target.value)||0)} className="w-full px-3 py-2 border rounded" />
                  <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Notes</label>
                  <textarea value={estimateNotes} onChange={(e)=> setEstimateNotes(e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
                </div>
                <div>
                  <div className="bg-gray-50 rounded border p-4">
                    <div className="font-semibold mb-2">Cost Summary</div>
                    <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${estimateSubtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Tax ({estimateTaxRate}%):</span><span>${estimateTaxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold mt-2"><span>Total:</span><span>${estimateTotal.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={()=> setShowCreateEstimateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={async ()=>{
                if(!estimateCustomerId){ alert('Select a customer'); return; }
                
                // Get shop_id from user's truck_shops
                let shopId = null;
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.id) {
                  const { data: shopData } = await supabase
                    .from('truck_shops')
                    .select('id')
                    .eq('user_id', userData.user.id)
                    .limit(1)
                    .single();
                  
                  shopId = shopData?.id || null;
                }
                
                const { data: estData, error } = await supabase.from('estimates').insert({ 
                  shop_id: shopId,
                  customer_id: estimateCustomerId, 
                  valid_until: estimateValidUntil || null, 
                  subtotal: estimateSubtotal, 
                  tax_rate: estimateTaxRate/100, 
                  tax_amount: estimateTaxAmount, 
                  total_amount: estimateTotal, 
                  notes: estimateNotes 
                }).select('id').single();
                if(error || !estData){
                  const isEmptyError = !error || 
                    (typeof error === 'object' && 
                     Object.keys(error).length === 0) ||
                    JSON.stringify(error) === '{}';
                  const errorCode = (error as any)?.code || '';
                  const errorMessage = (error as any)?.message || '';
                  const errorDetails = (error as any)?.details || '';
                  const errorHint = (error as any)?.hint || '';
                  
                  // Only log non-empty errors to console
                  if (!isEmptyError && (errorCode || errorMessage || errorDetails || errorHint)) {
                    console.error('Create estimate error:', error);
                  }
                  
                  if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
                    console.error('❌ Failed to create estimate: Row-level security (RLS) policy is blocking this operation.\n\n✅ SOLUTION: Go to your Supabase SQL Editor and run the contents of fix-rls-policies.sql file to create the necessary RLS policies.\n\nThe file is located at: ez2invoice/fix-rls-policies.sql');
                  } else {
                    // Check if it's a table not found error
                    const hasTableNotFoundError = 
                      errorCode === 'PGRST116' || 
                      errorMessage.includes('relation "estimates" does not exist') ||
                      errorMessage.includes('table "estimates" does not exist') ||
                      errorCode === '42P01';
                    
                    if (hasTableNotFoundError) {
                      console.error('❌ Estimates table not found.\n\n✅ SOLUTION: The estimates table may need to be created in your Supabase database.');
                    } else {
                      const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(error);
                      console.error(`❌ Failed to create estimate: ${errorMsg || 'Unknown error'}`);
                    }
                  }
                  return;
                }
                const itemsPayload = estimateItems.map(i=> ({ estimate_id: estData.id, item_type: i.item_type, reference_id: i.reference_id||null, description: i.description, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price }));
                const { error: liErr } = await supabase.from('estimate_line_items').insert(itemsPayload);
                if(liErr){ console.error('Line items error', liErr); }
                setShowCreateEstimateModal(false);
                setEstimateItems([{ item_type:'labor', description:'', quantity:1, unit_price:0, total_price:0 }]);
                setEstimateCustomerId('');
                fetchEstimates();
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Create Estimate</button>
            </div>
          </div>
        </div>
      )}

      {/* View Estimate Modal */}
      {showViewEstimateModal && selectedEstimate && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Estimate {selectedEstimate.estimate_number || selectedEstimate.id.slice(0, 8)}
              </h2>
              <button 
                onClick={() => {
                  setShowViewEstimateModal(false);
                  setSelectedEstimate(null);
                  setEstimateLineItems([]);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Estimate Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Customer Information</h3>
                  <div className="space-y-1">
                    <div className="text-gray-900">
                      {selectedEstimate.customer 
                        ? [selectedEstimate.customer.first_name, selectedEstimate.customer.last_name].filter(Boolean).join(' ') || selectedEstimate.customer.company || 'Unknown'
                        : 'No Customer'}
                    </div>
                    {selectedEstimate.customer?.email && (
                      <div className="text-sm text-gray-600">{selectedEstimate.customer.email}</div>
                    )}
                    {selectedEstimate.customer?.phone && (
                      <div className="text-sm text-gray-600">{selectedEstimate.customer.phone}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Estimate Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEstimate.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        selectedEstimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        selectedEstimate.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        selectedEstimate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedEstimate.status.charAt(0).toUpperCase() + selectedEstimate.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">
                        {selectedEstimate.created_at ? new Date(selectedEstimate.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {selectedEstimate.valid_until && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valid Until:</span>
                        <span className="text-gray-900">
                          {new Date(selectedEstimate.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Line Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {estimateLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500">No line items</td>
                        </tr>
                      ) : (
                        estimateLineItems.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900 capitalize">{item.item_type || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.description || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">${(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${(item.total_price || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900 font-medium">${(selectedEstimate.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (${((selectedEstimate.tax_rate || 0) * 100).toFixed(2)}%):</span>
                    <span className="text-gray-900 font-medium">${(selectedEstimate.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>${(selectedEstimate.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedEstimate.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedEstimate.notes}
                  </div>
                </div>
              )}

              {/* Customer Acceptance Link */}
              {selectedEstimate.status === 'sent' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-900 mb-2">Customer Acceptance Link</h3>
                  <p className="text-xs text-green-700 mb-3">
                    Share this link with your customer so they can view and accept the estimate online.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/estimate/${selectedEstimate.id}`}
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm text-gray-900"
                    />
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/estimate/${selectedEstimate.id}`;
                        navigator.clipboard.writeText(link);
                        alert('Link copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => handlePrintEstimate(selectedEstimate)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              {selectedEstimate.status === 'draft' && (
                <button
                  onClick={() => {
                    handleSendEstimate(selectedEstimate);
                    setShowViewEstimateModal(false);
                    setSelectedEstimate(null);
                    setEstimateLineItems([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send to Customer</span>
                </button>
              )}
              {selectedEstimate.status === 'accepted' && (
                <button
                  onClick={() => {
                    handleConvertToInvoice(selectedEstimate);
                    setShowViewEstimateModal(false);
                    setSelectedEstimate(null);
                    setEstimateLineItems([]);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Convert to Invoice
                </button>
              )}
              <button
                onClick={() => {
                  setShowViewEstimateModal(false);
                  setSelectedEstimate(null);
                  setEstimateLineItems([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Work Order Modal */}
      {showViewWorkOrderModal && selectedWorkOrder && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Work Order {selectedWorkOrder.work_order_number || selectedWorkOrder.id.slice(0, 8)}
              </h2>
              <button 
                onClick={() => {
                  setShowViewWorkOrderModal(false);
                  setSelectedWorkOrder(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Work Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Customer Information</h3>
                  <div className="space-y-1">
                    <div className="text-gray-900 font-medium">{selectedWorkOrder.customer || 'No Customer'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Work Order Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedWorkOrder.status?.toLowerCase() === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : selectedWorkOrder.status?.toLowerCase() === 'in progress'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedWorkOrder.status?.toLowerCase() === 'pending'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedWorkOrder.status || 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">
                        {selectedWorkOrder.created_at ? new Date(selectedWorkOrder.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bay:</span>
                      <span className="text-gray-900">{selectedWorkOrder.bay || '—'}</span>
                    </div>
                    {selectedWorkOrder.priority && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className="text-gray-900 capitalize">{selectedWorkOrder.priority}</span>
                      </div>
                    )}
                    {selectedWorkOrder.estimated_hours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Hours:</span>
                        <span className="text-gray-900">{selectedWorkOrder.estimated_hours.toFixed(2)}h</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Truck Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Truck Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedWorkOrder.truck_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Truck #:</span>
                      <span className="text-gray-900">{selectedWorkOrder.truck_number}</span>
                    </div>
                  )}
                  {selectedWorkOrder.truck && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Make/Model:</span>
                      <span className="text-gray-900">{selectedWorkOrder.truck}</span>
                    </div>
                  )}
                  {selectedWorkOrder.make && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Make:</span>
                      <span className="text-gray-900">{selectedWorkOrder.make}</span>
                    </div>
                  )}
                  {selectedWorkOrder.model && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Model:</span>
                      <span className="text-gray-900">{selectedWorkOrder.model}</span>
                    </div>
                  )}
                  {selectedWorkOrder.year && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Year:</span>
                      <span className="text-gray-900">{selectedWorkOrder.year}</span>
                    </div>
                  )}
                  {selectedWorkOrder.vin && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">VIN:</span>
                      <span className="text-gray-900 font-mono text-sm">{selectedWorkOrder.vin}</span>
                    </div>
                  )}
                  {selectedWorkOrder.trailer_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Trailer Number:</span>
                      <span className="text-gray-900">{selectedWorkOrder.trailer_number}</span>
                    </div>
                  )}
                  {selectedWorkOrder.engine_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Engine Type:</span>
                      <span className="text-gray-900">{selectedWorkOrder.engine_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Service Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedWorkOrder.service_title && (
                    <div>
                      <span className="text-gray-600 font-medium">Service Title:</span>
                      <div className="text-gray-900 mt-1">{selectedWorkOrder.service_title}</div>
                    </div>
                  )}
                  {selectedWorkOrder.description && (
                    <div>
                      <span className="text-gray-600 font-medium">Description:</span>
                      <div className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedWorkOrder.description}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedWorkOrder.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-900 whitespace-pre-wrap">{selectedWorkOrder.notes}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => handlePrintWorkOrder(selectedWorkOrder)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => {
                  handleSendWorkOrder(selectedWorkOrder);
                  setShowViewWorkOrderModal(false);
                  setSelectedWorkOrder(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send to Customer</span>
              </button>
              <button
                onClick={() => {
                  setShowViewWorkOrderModal(false);
                  setSelectedWorkOrder(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Waitlist Modal */}
      {showAddToWaitlistModal && selectedBayForWaitlist && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add to {selectedBayForWaitlist} Waitlist</h2>
                <button
                  onClick={() => {
                    setShowAddToWaitlistModal(false);
                    setSelectedBayForWaitlist(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-2">
                {workOrders
                  .filter(order => {
                    // Exclude work orders that are:
                    // 1. Already assigned to any bay (have a bay_id or bay property)
                    // 2. In progress or completed
                    // 3. Already assigned to the selected bay
                    const hasBay = order.bay_id || order.bay;
                    const isInProgress = order.status?.toLowerCase() === 'in_progress' || order.status?.toLowerCase() === 'in progress';
                    const isCompleted = order.status?.toLowerCase() === 'completed';
                    const isAssignedToSelectedBay = order.bay === selectedBayForWaitlist;
                    
                    // Only show work orders that are:
                    // - Not assigned to any bay
                    // - Not in progress or completed
                    // - Not already assigned to the selected bay
                    return !hasBay && !isInProgress && !isCompleted && !isAssignedToSelectedBay;
                  })
                  .map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddToWaitlist(selectedBayForWaitlist!, order)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{order.work_order_number || order.id}</div>
                          <div className="text-sm text-gray-600">{order.customer} - {order.truck}</div>
                          {order.status && (
                            <div className="text-xs text-gray-500 mt-1">
                              Status: {order.status}
                            </div>
                          )}
                        </div>
                        <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                {workOrders.filter(order => {
                  const hasBay = order.bay_id || order.bay;
                  const isInProgress = order.status?.toLowerCase() === 'in_progress' || order.status?.toLowerCase() === 'in progress';
                  const isCompleted = order.status?.toLowerCase() === 'completed';
                  const isAssignedToSelectedBay = order.bay === selectedBayForWaitlist;
                  return !hasBay && !isInProgress && !isCompleted && !isAssignedToSelectedBay;
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available work orders to add to waitlist.</p>
                    <p className="text-sm mt-2">All work orders are either assigned to a bay or already completed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Customer</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your customers and their contact details.</p>
              </div>
              <button onClick={() => {
                setShowAddCustomerModal(false);
                setCustomerForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', is_fleet: false, company: '', fleet_name: '', enable_fleet_discounts: false });
                setCustomerNotes([]);
                setAddCustomerFleetTrucks([]);
                setAddCustomerFleetDiscounts([]);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Type Selection */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-3">Customer Type</p>
                <div className="flex items-center gap-6 text-sm text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="customer-type"
                      checked={!Boolean(customerForm.is_fleet)}
                      onChange={()=> setCustomerForm(prev=>({...prev, is_fleet:false}))}
                    />
                    Individual
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="customer-type"
                      checked={Boolean(customerForm.is_fleet)}
                      onChange={()=> setCustomerForm(prev=>({...prev, is_fleet:true}))}
                    />
                    Fleet
                  </label>
                </div>
              </div>
              {/* Basic Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {customerForm.is_fleet ? 'Company Name *' : 'Name *'}
                  </label>
                  <input 
                    value={customerForm.is_fleet ? customerForm.company : customerForm.name} 
                    onChange={(e)=>setCustomerForm(prev=>({...prev, [prev.is_fleet ? 'company' : 'name']: e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder={customerForm.is_fleet ? "ABC Trucking LLC" : "Customer name"} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input value={customerForm.email} onChange={(e)=>setCustomerForm(prev=>({...prev,email:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="email@example.com" />
                </div>
              </div>

              {/* Fleet-specific fields */}
              {customerForm.is_fleet && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fleet Name (Optional)</label>
                    <input 
                      value={customerForm.fleet_name} 
                      onChange={(e)=>setCustomerForm(prev=>({...prev,fleet_name:e.target.value}))} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                      placeholder="e.g., ABC Logistics Fleet" 
                    />
                    <p className="text-xs text-gray-500 mt-1">A friendly name to identify this fleet</p>
                  </div>

                  {/* Enable Fleet Discounts */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Enable Fleet Discounts</p>
                      <p className="text-xs text-gray-600 mt-1">Allow automatic discount application on invoices</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerForm.enable_fleet_discounts}
                        onChange={(e)=>setCustomerForm(prev=>({...prev,enable_fleet_discounts:e.target.checked}))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </>
              )}

              {/* Contact Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input value={customerForm.phone} onChange={(e)=>setCustomerForm(prev=>({...prev,phone:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input value={customerForm.address} onChange={(e)=>setCustomerForm(prev=>({...prev,address:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input value={customerForm.city} onChange={(e)=>setCustomerForm(prev=>({...prev,city:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="City" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input value={customerForm.state} onChange={(e)=>setCustomerForm(prev=>({...prev,state:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="State" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input value={customerForm.zip_code} onChange={(e)=>setCustomerForm(prev=>({...prev,zip_code:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="12345" />
                </div>
              </div>

              {/* Fleet Trucks Section (when Fleet selected) */}
              {customerForm.is_fleet && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Fleet Trucks</h3>
                      <p className="text-xs text-gray-600 mt-1">Add trucks to this fleet (optional)</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewTruckForm({ unit_no: '', vin: '', year: '', make: '', model: '', notes: '' });
                        setShowAddTruckModal(true);
                      }}
                      className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Truck
                    </button>
                  </div>
                  {addCustomerFleetTrucks.length === 0 && (
                    <p className="text-sm text-gray-600 py-4">No trucks added yet. You can add them now or later.</p>
                  )}
                  {addCustomerFleetTrucks.map((t, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 relative">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Truck Details</h4>
                        <button
                          onClick={() => setAddCustomerFleetTrucks(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                          <input value={t.unit_no || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                          <input value={t.vin || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="Vehicle identification number" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                          <input value={t.year || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                          <input value={t.make || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <input value={t.model || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Discount Rules Section (when Fleet selected and discounts enabled) */}
              {customerForm.is_fleet && customerForm.enable_fleet_discounts && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Discount Rules</h3>
                      <p className="text-xs text-gray-600 mt-1">Configure automatic labor discounts (optional)</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewDiscountForm({ scope: 'labor' as 'labor'|'labor_type', labor_item_id: '', labor_type: '', discount_type: 'percentage' as 'percentage'|'fixed', percent_off: 0, fixed_amount: 0, notes: '' });
                        setShowAddDiscountModal(true);
                      }}
                      className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Discount
                    </button>
                  </div>
                  {addCustomerFleetDiscounts.length === 0 && (
                    <p className="text-sm text-gray-600 py-4">No discount rules added yet. You can add them now or later.</p>
                  )}
                  {addCustomerFleetDiscounts.map((d, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <h4 className="font-semibold text-gray-900">Discount Rule</h4>
                        </div>
                        <button
                          onClick={() => setAddCustomerFleetDiscounts(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input type="radio" checked={d.scope === 'labor'} readOnly className="text-primary-500" />
                              <span className="text-sm">Labor Category</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" checked={d.scope === 'labor_type'} readOnly className="text-primary-500" />
                              <span className="text-sm">Specific Labor Item</span>
                            </label>
                          </div>
                        </div>
                        {d.scope === 'labor' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Labor Item</label>
                            <input value={laborItems.find(li => li.id === d.labor_item_id)?.service_name || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Labor Type</label>
                            <input value={d.labor_type || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                          <input value={d.discount_type === 'percentage' ? '% Percentage' : 'Fixed Amount'} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {d.discount_type === 'percentage' ? 'Value (%)' : 'Value ($)'}
                          </label>
                          <input value={d.discount_type === 'percentage' ? d.percent_off : (d.fixed_amount || 0)} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                        {d.notes && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea value={d.notes || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Notes & Alerts Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Notes & Alerts</h3>
                  <button
                    onClick={() => {
                      setNewNote({ category: 'General', note: '' });
                      setShowAddNoteModal(true);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Note</span>
                  </button>
                </div>
                {customerNotes.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No notes yet. Add one to get started!</p>
                ) : (
                  <div className="space-y-3">
                    {customerNotes.map((note) => {
                      const getCategoryIcon = () => {
                        switch (note.category) {
                          case 'General':
                            return <MessageCircle className="h-4 w-4" />;
                          case 'Warning':
                            return <AlertCircle className="h-4 w-4" />;
                          case 'Compliment':
                            return <ThumbsUp className="h-4 w-4" />;
                          case 'Payment Issue':
                            return <DollarSign className="h-4 w-4" />;
                          case 'Loyalty':
                            return <Heart className="h-4 w-4" />;
                          default:
                            return <MessageCircle className="h-4 w-4" />;
                        }
                      };
                      
                      return (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="mt-0.5">{getCategoryIcon()}</div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">{note.category}</span>
                                </div>
                                <p className="text-sm text-gray-600">{note.note}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setCustomerNotes(prev => prev.filter(n => n.id !== note.id))}
                              className="text-gray-400 hover:text-red-600 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={()=>{
                setShowAddCustomerModal(false);
                setCustomerForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', is_fleet: false, company: '', fleet_name: '', enable_fleet_discounts: false });
                setCustomerNotes([]);
                setAddCustomerFleetTrucks([]);
                setAddCustomerFleetDiscounts([]);
              }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={async ()=>{
                const nameToCheck = customerForm.is_fleet ? customerForm.company.trim() : customerForm.name.trim();
                if(!nameToCheck){ 
                  console.warn(customerForm.is_fleet ? 'Company name is required' : 'Name is required'); 
                  return; 
                }
                
                const parts = customerForm.is_fleet 
                  ? [customerForm.company] 
                  : customerForm.name.trim().split(/\s+/);
                const first = parts[0] || '';
                // Use empty string instead of null for last_name to satisfy NOT NULL constraint
                const last = parts.slice(1).join(' ') || '';
                
                // For fleet customers, ensure company is set properly
                const companyName = customerForm.is_fleet ? (customerForm.company || first || '') : null;
                
                // Get shop_id before creating customer
                const shopId = await getShopId();
                if (!shopId) {
                  alert('Error: Could not find shop. Please ensure you are logged in.');
                  return;
                }
                
                const { data: insertData, error: insertError } = await supabase.from('customers').insert({
                  shop_id: shopId,
                  first_name: first, 
                  last_name: last,
                  company: companyName,
                  email: customerForm.email || null,
                  phone: customerForm.phone || null,
                  address: customerForm.address || null,
                  city: customerForm.city || null,
                  state: customerForm.state || null,
                  zip_code: customerForm.zip_code || null,
                  is_fleet: customerForm.is_fleet
                }).select('*');
                
                if(insertError){ 
                  const isEmptyError = !insertError || 
                    (typeof insertError === 'object' && 
                     Object.keys(insertError).length === 0) ||
                    JSON.stringify(insertError) === '{}';
                  const errorCode = (insertError as any)?.code || '';
                  const errorMessage = (insertError as any)?.message || '';
                  const errorDetails = (insertError as any)?.details || '';
                  const errorHint = (insertError as any)?.hint || '';
                  
                  // Only log non-empty errors to console
                  if (!isEmptyError && (errorCode || errorMessage || errorDetails || errorHint)) {
                    console.error('Insert customer error:', insertError);
                  }
                  
                  if (isEmptyError || errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('RLS') || errorDetails?.includes('RLS') || errorHint?.includes('RLS')) {
                    console.error('❌ Failed to create customer: Row-level security (RLS) policy is blocking this operation.\n\n✅ SOLUTION: Go to your Supabase SQL Editor and run the contents of fix-rls-policies.sql file to create the necessary RLS policies.\n\nThe file is located at: ez2invoice/fix-rls-policies.sql');
                  } else if (errorMessage?.includes('customers_fleet_required_fields_chk') || errorMessage?.includes('check constraint') || errorDetails?.includes('fleet_required_fields') || errorMessage?.includes('violates check constraint')) {
                    console.error('❌ Failed to create fleet customer: Check constraint violation.\n\n✅ SOLUTION: Run the fix-fleet-constraint.sql file in your Supabase SQL Editor to fix the constraint.\n\nThe file is located at: ez2invoice/fix-fleet-constraint.sql\n\nThis usually means the company field is required for fleet customers.');
                  } else {
                    const errorMsg = errorMessage || errorDetails || errorHint || JSON.stringify(insertError);
                    console.error(`Failed to create customer: ${errorMsg || 'Unknown error'}`); 
                  }
                  return;
                }
                
                const newCustomer = insertData && insertData.length > 0 ? insertData[0] : null;
                
                if(!newCustomer) {
                  console.error('Customer created but no data returned');
                  console.warn('Customer created but failed to retrieve customer data. Please refresh the page.');
                  setShowAddCustomerModal(false);
                  fetchCustomers();
                  return;
                }
                
                // Add fleet trucks if any
                if(customerForm.is_fleet && addCustomerFleetTrucks.length > 0 && newCustomer) {
                  await supabase.from('fleet_trucks').insert(
                    addCustomerFleetTrucks.map(t => ({
                      customer_id: newCustomer.id,
                      unit_no: t.unit_no || null,
                      vin: t.vin || null,
                      year: t.year ? Number(t.year) : null,
                      make: t.make || null,
                      model: t.model || null,
                      notes: t.notes || null
                    }))
                  );
                }
                
                // Add customer notes if any
                if (customerNotes.length > 0 && newCustomer) {
                  // Ensure we have shop_id - use the one we set or get from newCustomer
                  const customerShopId = newCustomer.shop_id || shopId;
                  
                  if (!customerShopId) {
                    console.warn('Cannot save customer notes: no shop_id available', newCustomer);
                  } else {
                    try {
                      console.log('Attempting to save customer notes:', {
                        customer_id: newCustomer.id,
                        shop_id: customerShopId,
                        notes_count: customerNotes.length,
                        notes: customerNotes
                      });
                      
                      const { data: notesData, error: notesError } = await supabase
                        .from('customer_notes')
                        .insert(
                          customerNotes.map(note => ({
                            customer_id: newCustomer.id,
                            category: note.category,
                            note: note.note
                          }))
                        )
                        .select();
                      
                      if (notesError) {
                        console.error('Error saving customer notes:', notesError);
                        console.error('Error details:', {
                          message: notesError.message,
                          details: notesError.details,
                          hint: notesError.hint,
                          code: notesError.code,
                          customer_id: newCustomer.id,
                          shop_id: customerShopId,
                          customer_shop_id: newCustomer.shop_id
                        });
                        alert(`Note: Customer created successfully, but there was an error saving notes: ${notesError.message || 'RLS policy may be blocking'}. Please add notes manually in Edit Customer.`);
                      } else {
                        console.log('Successfully saved customer notes:', notesData);
                      }
                    } catch (error) {
                      console.error('Exception saving customer notes:', error);
                      alert('Note: Customer created successfully, but there was an error saving notes. Please add notes manually in Edit Customer.');
                    }
                  }
                }
                
                // Add fleet discounts if any
                if(customerForm.is_fleet && customerForm.enable_fleet_discounts && addCustomerFleetDiscounts.length > 0 && newCustomer) {
                  await supabase.from('fleet_discounts').insert(
                    addCustomerFleetDiscounts.map(d => ({
                      customer_id: newCustomer.id,
                      scope: d.scope,
                      labor_item_id: d.scope === 'labor' ? d.labor_item_id || null : null,
                      labor_type: d.scope === 'labor_type' ? d.labor_type || null : null,
                      percent_off: d.discount_type === 'percentage' ? d.percent_off : 0
                    }))
                  );
                }
                
                setShowAddCustomerModal(false);
                setCustomerForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', is_fleet: false, company: '', fleet_name: '', enable_fleet_discounts: false });
                setCustomerNotes([]);
                setAddCustomerFleetTrucks([]);
                setAddCustomerFleetDiscounts([]);
                fetchCustomers();
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Create Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingNote ? 'Edit Note' : 'Add Note'}</h2>
              <button
                onClick={() => {
                  setShowAddNoteModal(false);
                  setNewNote({ category: 'General', note: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="relative">
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value as CustomerNote['category'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white pr-10"
                  >
                    <option value="General">General</option>
                    <option value="Warning">Warning</option>
                    <option value="Compliment">Compliment</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="Loyalty">Loyalty</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea
                  value={newNote.note}
                  onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Enter note details..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddNoteModal(false);
                  setNewNote({ category: 'General', note: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newNote.note.trim()) {
                    // If editing a customer, save directly to database
                    if (showEditCustomerModal) {
                      try {
                        const { data: savedNote, error: saveError } = await supabase
                          .from('customer_notes')
                          .insert({
                            customer_id: showEditCustomerModal.id,
                            category: newNote.category,
                            note: newNote.note.trim()
                          })
                          .select()
                          .single();
                        
                        if (saveError) {
                          console.error('Error saving note:', saveError);
                          alert('Error saving note. Please try again.');
                        } else if (savedNote) {
                          setEditCustomerNotes(prev => [...prev, {
                            id: savedNote.id,
                            category: savedNote.category,
                            note: savedNote.note
                          }]);
                          setNewNote({ category: 'General', note: '' });
                          setShowAddNoteModal(false);
                        }
                      } catch (error) {
                        console.error('Exception saving note:', error);
                        alert('Error saving note. Please try again.');
                      }
                    } else {
                      // If creating a customer, add to state
                      setCustomerNotes(prev => [...prev, {
                        id: Date.now().toString(),
                        category: newNote.category,
                        note: newNote.note.trim()
                      }]);
                      setNewNote({ category: 'General', note: '' });
                      setShowAddNoteModal(false);
                    }
                  }
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Truck Modal */}
      {showAddTruckModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Truck Details</h2>
              <button onClick={() => setShowAddTruckModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Number *</label>
                  <input 
                    value={newTruckForm.unit_no} 
                    onChange={(e) => setNewTruckForm(prev => ({...prev, unit_no: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="e.g., TRUCK-001" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
                  <input 
                    value={newTruckForm.vin} 
                    onChange={(e) => setNewTruckForm(prev => ({...prev, vin: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="Vehicle identification number" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input 
                    type="number"
                    value={newTruckForm.year} 
                    onChange={(e) => setNewTruckForm(prev => ({...prev, year: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                  <input 
                    value={newTruckForm.make} 
                    onChange={(e) => setNewTruckForm(prev => ({...prev, make: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="Ford"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                  <input 
                    value={newTruckForm.model} 
                    onChange={(e) => setNewTruckForm(prev => ({...prev, model: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="F-150"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddTruckModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                if (!newTruckForm.unit_no.trim()) {
                  console.warn('Unit Number is required');
                  return;
                }
                setAddCustomerFleetTrucks(prev => [...prev, { ...newTruckForm }]);
                setNewTruckForm({ unit_no: '', vin: '', year: '', make: '', model: '', notes: '' });
                setShowAddTruckModal(false);
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Add Truck</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Discount Modal */}
      {showAddDiscountModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900">Discount Rule</h2>
              </div>
              <button onClick={() => setShowAddDiscountModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="discount-scope"
                      checked={newDiscountForm.scope === 'labor'}
                      onChange={() => setNewDiscountForm(prev => ({...prev, scope: 'labor'}))}
                      className="text-primary-500"
                    />
                    <span className="text-sm text-gray-700">Labor Category</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="discount-scope"
                      checked={newDiscountForm.scope === 'labor_type'}
                      onChange={() => setNewDiscountForm(prev => ({...prev, scope: 'labor_type'}))}
                      className="text-primary-500"
                    />
                    <span className="text-sm text-gray-700">Specific Labor Item</span>
                  </label>
                </div>
              </div>

              {newDiscountForm.scope === 'labor' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Item</label>
                  <select
                    value={newDiscountForm.labor_item_id}
                    onChange={(e) => setNewDiscountForm(prev => ({...prev, labor_item_id: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select labor item...</option>
                    {laborItems.map(li => (
                      <option key={li.id} value={li.id}>{li.service_name} ({li.category || 'General'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Type</label>
                  <input 
                    value={newDiscountForm.labor_type} 
                    onChange={(e) => setNewDiscountForm(prev => ({...prev, labor_type: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                    placeholder="e.g., Brakes"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  value={newDiscountForm.discount_type}
                  onChange={(e) => setNewDiscountForm(prev => ({...prev, discount_type: e.target.value as 'percentage'|'fixed'}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="percentage">% Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {newDiscountForm.discount_type === 'percentage' ? 'Value (%)' : 'Value ($)'}
                </label>
                <input 
                  type="number"
                  value={newDiscountForm.discount_type === 'percentage' ? newDiscountForm.percent_off : newDiscountForm.fixed_amount} 
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    if (newDiscountForm.discount_type === 'percentage') {
                      setNewDiscountForm(prev => ({...prev, percent_off: val}));
                    } else {
                      setNewDiscountForm(prev => ({...prev, fixed_amount: val}));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  placeholder={newDiscountForm.discount_type === 'percentage' ? '10' : '10.00'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea 
                  value={newDiscountForm.notes} 
                  onChange={(e) => setNewDiscountForm(prev => ({...prev, notes: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  placeholder="e.g., VIP discount for bulk services"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddDiscountModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                if (newDiscountForm.scope === 'labor' && !newDiscountForm.labor_item_id) {
                  console.warn('Please select a labor item');
                  return;
                }
                if (newDiscountForm.scope === 'labor_type' && !newDiscountForm.labor_type.trim()) {
                  console.warn('Please enter a labor type');
                  return;
                }
                const value = newDiscountForm.discount_type === 'percentage' ? newDiscountForm.percent_off : newDiscountForm.fixed_amount;
                if (value <= 0) {
                  console.warn('Please enter a valid discount value');
                  return;
                }
                setAddCustomerFleetDiscounts(prev => [...prev, { ...newDiscountForm }]);
                setNewDiscountForm({ scope: 'labor' as 'labor'|'labor_type', labor_item_id: '', labor_type: '', discount_type: 'percentage' as 'percentage'|'fixed', percent_off: 0, fixed_amount: 0, notes: '' });
                setShowAddDiscountModal(false);
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Add Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
              <button onClick={() => setShowEditCustomerModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input defaultValue={[showEditCustomerModal.first_name, showEditCustomerModal.last_name].filter(Boolean).join(' ')} onChange={(e)=>setCustomerForm(prev=>({...prev,name:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input defaultValue={showEditCustomerModal.email || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,email:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Customer Type</p>
                  <div className="flex items-center gap-6 text-sm text-gray-700">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="customer-type-edit"
                        defaultChecked={!Boolean(showEditCustomerModal.is_fleet)}
                        onChange={()=> setCustomerForm(prev=>({...prev, is_fleet:false}))}
                      />
                      Individual
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="customer-type-edit"
                        defaultChecked={Boolean(showEditCustomerModal.is_fleet)}
                        onChange={()=> setCustomerForm(prev=>({...prev, is_fleet:true}))}
                      />
                      Fleet
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input defaultValue={showEditCustomerModal.phone || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,phone:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input defaultValue={showEditCustomerModal.address || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,address:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input defaultValue={showEditCustomerModal.city || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,city:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input defaultValue={showEditCustomerModal.state || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,state:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input defaultValue={showEditCustomerModal.zip_code || ''} onChange={(e)=>setCustomerForm(prev=>({...prev,zip_code:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>

              {/* Customer Notes & Alerts Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Notes & Alerts</h3>
                  <button
                    onClick={() => {
                      setNewNote({ category: 'General', note: '' });
                      setEditingNote(null);
                      setShowAddNoteModal(true);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Note</span>
                  </button>
                </div>
                {editCustomerNotes.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No notes yet. Add one to get started!</p>
                ) : (
                  <div className="space-y-3">
                    {editCustomerNotes.map((note) => {
                      const getCategoryIcon = () => {
                        switch (note.category) {
                          case 'General':
                            return <MessageCircle className="h-4 w-4" />;
                          case 'Warning':
                            return <AlertCircle className="h-4 w-4" />;
                          case 'Compliment':
                            return <ThumbsUp className="h-4 w-4" />;
                          case 'Payment Issue':
                            return <DollarSign className="h-4 w-4" />;
                          case 'Loyalty':
                            return <Heart className="h-4 w-4" />;
                          default:
                            return <MessageCircle className="h-4 w-4" />;
                        }
                      };
                      
                      return (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="mt-0.5">{getCategoryIcon()}</div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">{note.category}</span>
                                </div>
                                <p className="text-sm text-gray-600">{note.note}</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('customer_notes')
                                    .delete()
                                    .eq('id', note.id);
                                  
                                  if (error) {
                                    console.error('Error deleting note:', error);
                                    alert('Error deleting note. Please try again.');
                                  } else {
                                    setEditCustomerNotes(prev => prev.filter(n => n.id !== note.id));
                                  }
                                } catch (error) {
                                  console.error('Exception deleting note:', error);
                                  alert('Error deleting note. Please try again.');
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={()=>{
                setShowEditCustomerModal(null);
                setEditCustomerNotes([]);
              }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={async ()=>{
                const name = customerForm.name.trim() || [showEditCustomerModal.first_name, showEditCustomerModal.last_name].filter(Boolean).join(' ');
                const parts = name.split(/\s+/);
                const first = parts.shift() || '';
                // Use empty string instead of null for last_name to satisfy NOT NULL constraint
                const last = parts.join(' ') || '';
                const { error } = await supabase.from('customers').update({
                  first_name: first, last_name: last,
                  email: customerForm.email || showEditCustomerModal.email || null,
                  phone: customerForm.phone || showEditCustomerModal.phone || null,
                  address: customerForm.address || showEditCustomerModal.address || null,
                  city: customerForm.city || showEditCustomerModal.city || null,
                  state: customerForm.state || showEditCustomerModal.state || null,
                  zip_code: customerForm.zip_code || showEditCustomerModal.zip_code || null,
                  is_fleet: (typeof customerForm.is_fleet === 'boolean') ? customerForm.is_fleet : showEditCustomerModal.is_fleet || false
                }).eq('id', showEditCustomerModal.id);
                if(error){ console.error('Update customer error:', error); return; }
                setShowEditCustomerModal(null);
                fetchCustomers();
              }} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Management Modal */}
      {showFleetModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Fleet Management</h2>
                <p className="text-sm text-gray-600">{[showFleetModal.first_name, showFleetModal.last_name].filter(Boolean).join(' ')}</p>
              </div>
              <button onClick={()=> setShowFleetModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>

            <div className="p-6 space-y-8">
              {/* Trucks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Trucks ({fleetTrucks.length})</h3>
                  <button onClick={()=> setTruckForm({ unit_no:'', vin:'', year:'', make:'', model:'', notes:'' })} className="hidden" />
                  <button onClick={()=> setTruckForm({ unit_no:'', vin:'', year:'', make:'', model:'', notes:'' })} className="px-3 py-1 bg-gray-900 text-white rounded" onMouseDown={async ()=>{}}></button>
                </div>
                <div className="mb-4 grid grid-cols-6 gap-2">
                  <input placeholder="Unit #" value={truckForm.unit_no} onChange={(e)=> setTruckForm(prev=>({...prev,unit_no:e.target.value}))} className="px-2 py-2 border rounded" />
                  <input placeholder="VIN #" value={truckForm.vin} onChange={(e)=> setTruckForm(prev=>({...prev,vin:e.target.value}))} className="px-2 py-2 border rounded col-span-2" />
                  <input placeholder="Year" value={truckForm.year} onChange={(e)=> setTruckForm(prev=>({...prev,year:e.target.value}))} className="px-2 py-2 border rounded" />
                  <input placeholder="Make" value={truckForm.make} onChange={(e)=> setTruckForm(prev=>({...prev,make:e.target.value}))} className="px-2 py-2 border rounded" />
                  <input placeholder="Model" value={truckForm.model} onChange={(e)=> setTruckForm(prev=>({...prev,model:e.target.value}))} className="px-2 py-2 border rounded" />
                  <div className="col-span-6 flex justify-end">
                    <button onClick={async ()=>{ if(!showFleetModal) return; await supabase.from('fleet_trucks').insert({ customer_id: showFleetModal.id, unit_no: truckForm.unit_no||null, vin: truckForm.vin||null, year: truckForm.year? Number(truckForm.year): null, make: truckForm.make||null, model: truckForm.model||null, notes: truckForm.notes||null }); const { data } = await supabase.from('fleet_trucks').select('*').eq('customer_id', showFleetModal.id); setFleetTrucks(data||[]); setTruckForm({ unit_no:'', vin:'', year:'', make:'', model:'', notes:'' }); }} className="px-3 py-2 bg-primary-500 text-white rounded">Add Truck</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {fleetTrucks.map((t)=> (
                    <div key={t.id} className="grid grid-cols-6 gap-2 items-center p-3 bg-gray-50 rounded">
                      <div>{t.unit_no||'—'}</div>
                      <div className="col-span-2 text-xs text-gray-600">{t.vin||'—'}</div>
                      <div>{t.year||'—'}</div>
                      <div>{t.make||'—'}</div>
                      <div>{t.model||'—'}</div>
                      <div className="col-span-6 text-right">
                        <button onClick={async ()=>{ await supabase.from('fleet_trucks').delete().eq('id', t.id); const { data } = await supabase.from('fleet_trucks').select('*').eq('customer_id', showFleetModal!.id); setFleetTrucks(data||[]); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">Delete</button>
                      </div>
                    </div>
                  ))}
                  {fleetTrucks.length===0 && <div className="text-center text-gray-600 py-6">No trucks yet</div>}
                </div>
              </div>

              {/* Discounts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Fleet Discounts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
                  <select value={discountForm.scope} onChange={(e)=> setDiscountForm(prev=>({...prev, scope: e.target.value as any}))} className="px-2 py-2 border rounded">
                    <option value="labor">By Labor Item</option>
                    <option value="labor_type">By Labor Type</option>
                  </select>
                  {discountForm.scope==='labor' ? (
                    <select value={discountForm.labor_item_id} onChange={(e)=> setDiscountForm(prev=>({...prev,labor_item_id:e.target.value}))} className="px-2 py-2 border rounded col-span-2">
                      <option value="">Select labor</option>
                      {laborItems.map(li => (<option key={li.id} value={li.id}>{li.service_name}</option>))}
                    </select>
                  ) : (
                    <input placeholder="Labor type (e.g., Brakes)" value={discountForm.labor_type} onChange={(e)=> setDiscountForm(prev=>({...prev,labor_type:e.target.value}))} className="px-2 py-2 border rounded col-span-2" />
                  )}
                  <input type="number" placeholder="% Off" value={discountForm.percent_off} onChange={(e)=> setDiscountForm(prev=>({...prev,percent_off:Number(e.target.value)||0}))} className="px-2 py-2 border rounded" />
                  <button onClick={async ()=>{ if(!showFleetModal) return; await supabase.from('fleet_discounts').insert({ customer_id: showFleetModal.id, scope: discountForm.scope, labor_item_id: discountForm.scope==='labor'? discountForm.labor_item_id || null : null, labor_type: discountForm.scope==='labor_type'? discountForm.labor_type || null : null, percent_off: discountForm.percent_off }); const { data } = await supabase.from('fleet_discounts').select('*').eq('customer_id', showFleetModal.id); setFleetDiscounts(data||[]); setDiscountForm({ scope:'labor', labor_item_id:'', labor_type:'', percent_off:0 }); }} className="px-3 py-2 bg-primary-500 text-white rounded">Add Discount</button>
                </div>
                <div className="space-y-2">
                  {fleetDiscounts.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-800">{d.scope==='labor' ? `Labor: ${laborItems.find(li=>li.id===d.labor_item_id)?.service_name || d.labor_item_id}` : `Labor Type: ${d.labor_type}`}</div>
                      <div className="font-medium">{d.percent_off}% off</div>
                      <div>
                        <button onClick={async ()=>{ await supabase.from('fleet_discounts').delete().eq('id', d.id); const { data } = await supabase.from('fleet_discounts').select('*').eq('customer_id', showFleetModal!.id); setFleetDiscounts(data||[]); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">Delete</button>
                      </div>
                    </div>
                  ))}
                  {fleetDiscounts.length===0 && <div className="text-center text-gray-600 py-6">No discounts yet</div>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t text-right">
              <button onClick={()=> setShowFleetModal(null)} className="px-4 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Work Order History Modal */}
      {showWorkOrderHistoryModal && selectedWorkOrderForHistory && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Work Order History</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete history for {selectedWorkOrderForHistory.work_order_number || selectedWorkOrderForHistory.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowWorkOrderHistoryModal(false);
                    setSelectedWorkOrderForHistory(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Customer</span>
                    <span className="text-sm text-gray-900">{selectedWorkOrderForHistory.customer}</span>
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Service Type</span>
                    <span className="text-sm text-gray-900">{selectedWorkOrderForHistory.service_title || '—'}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Status</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedWorkOrderForHistory.status?.toLowerCase() === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : selectedWorkOrderForHistory.status?.toLowerCase() === 'in progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedWorkOrderForHistory.status || 'Pending'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Sitting for {selectedWorkOrderForHistory.created_at ? '1 day' : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* History Entries */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">History</h3>
                  <div className="space-y-4">
                    {/* History Entry */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Started in {selectedWorkOrderForHistory.bay || 'Bay'}</p>
                        <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Work Order Modal */}
      {showMoveWorkOrderModal && selectedWorkOrderForMove && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Move Work Order</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Move {selectedWorkOrderForMove.workOrder.work_order_number || selectedWorkOrderForMove.workOrder.id} to a different bay
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMoveWorkOrderModal(false);
                    setSelectedWorkOrderForMove(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Current Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Location
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="font-medium text-gray-900">{selectedWorkOrderForMove.currentBay}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedWorkOrderForMove.workOrder.customer} - {selectedWorkOrderForMove.workOrder.service_title || '—'}
                    </div>
                  </div>
                </div>

                {/* Select Destination Bay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Destination Bay
                  </label>
                  <div className="space-y-2">
                    {Object.entries(bayStatus)
                      .filter(([bayName]) => 
                        bayName !== selectedWorkOrderForMove.currentBay
                      )
                      .map(([bayName, bayInfo]) => (
                        <button
                          key={bayName}
                          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{bayName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bayInfo.status === 'Available' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {bayInfo.status === 'Available' ? 'Available' : 'Add to Waitlist'}
                          </span>
                        </button>
                      ))}
                    {Object.entries(bayStatus).filter(([bayName]) => 
                      bayName !== selectedWorkOrderForMove.currentBay
                    ).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No other bays available</p>
                    )}
                  </div>
                </div>

                {/* Reason for Move */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Move (Optional)
                  </label>
                  <textarea
                    placeholder="e.g., Need specialized equipment, customer request, etc."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowMoveWorkOrderModal(false);
                  setSelectedWorkOrderForMove(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement move work order functionality
                  setShowMoveWorkOrderModal(false);
                  setSelectedWorkOrderForMove(null);
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Move Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
