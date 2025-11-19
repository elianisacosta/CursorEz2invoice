'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Calendar, User, FileText, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
}

export default function EstimateViewPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.id as string;
  
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEstimate();
  }, [estimateId]);

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      setError('');

      if (!estimateId) {
        setError('Invalid estimate ID.');
        setLoading(false);
        return;
      }

      // Fetch estimate with customer info
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone, company)
        `)
        .eq('id', estimateId)
        .single();

      if (estimateError) {
        console.error('Error fetching estimate:', estimateError);
        setError(`Estimate not found: ${estimateError.message}`);
        setLoading(false);
        return;
      }

      if (!estimateData) {
        setError('Estimate not found or has been removed.');
        setLoading(false);
        return;
      }

      setEstimate(estimateData as Estimate);

      // Fetch line items
      const { data: itemsData, error: itemsError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: true });

      if (itemsData) {
        setLineItems(itemsData as LineItem[]);
      }
    } catch (e: any) {
      console.error('Error fetching estimate:', e);
      setError('Failed to load estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptEstimate = async () => {
    if (!estimate) return;

    if (!confirm('Are you sure you want to accept this estimate? This action cannot be undone.')) {
      return;
    }

    try {
      setAccepting(true);
      setError('');

      // Update estimate status to accepted
      // Note: approved_at column needs to be added to database first
      // Run the SQL in add-approved-at-column.sql to add it
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
          // approved_at: new Date().toISOString(), // Uncomment after running migration SQL
        })
        .eq('id', estimate.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess('Estimate accepted successfully! We will contact you soon to proceed with the work.');
      setEstimate({ ...estimate, status: 'accepted' });
      
      // Refresh after 2 seconds
      setTimeout(() => {
        fetchEstimate();
      }, 2000);
    } catch (e: any) {
      console.error('Error accepting estimate:', e);
      setError(e.message || 'Failed to accept estimate. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectEstimate = async () => {
    if (!estimate) return;

    if (!confirm('Are you sure you want to reject this estimate?')) {
      return;
    }

    try {
      setAccepting(true);
      setError('');

      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', estimate.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess('Estimate rejected. We will contact you if you have any questions.');
      setEstimate({ ...estimate, status: 'rejected' });
    } catch (e: any) {
      console.error('Error rejecting estimate:', e);
      setError(e.message || 'Failed to reject estimate. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error && !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Estimate Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  const customerName = estimate.customer
    ? [estimate.customer.first_name, estimate.customer.last_name].filter(Boolean).join(' ') || estimate.customer.company || 'Customer'
    : 'Customer';

  const estimateNumber = estimate.estimate_number || estimate.id.slice(0, 8);
  const isAccepted = estimate.status === 'accepted';
  const isRejected = estimate.status === 'rejected';
  const isExpired = estimate.valid_until && new Date(estimate.valid_until) < new Date();
  const canAccept = estimate.status === 'sent' && !isExpired && !isAccepted && !isRejected;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Estimate #{estimateNumber}</h1>
              <p className="text-gray-600 mt-1">Review and accept your service estimate</p>
            </div>
            <div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isAccepted
                    ? 'bg-green-100 text-green-800'
                    : isRejected
                    ? 'bg-red-100 text-red-800'
                    : isExpired
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                {isExpired && ' (Expired)'}
              </span>
            </div>
          </div>

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Estimate Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estimate Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center text-gray-600 mb-2">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Created Date</span>
              </div>
              <p className="text-gray-900">
                {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : '—'}
              </p>
            </div>
            {estimate.valid_until && (
              <div>
                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Valid Until</span>
                </div>
                <p className="text-gray-900">
                  {new Date(estimate.valid_until).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center text-gray-600 mb-2">
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Customer</span>
              </div>
              <p className="text-gray-900">{customerName}</p>
              {estimate.customer?.email && (
                <p className="text-sm text-gray-600">{estimate.customer.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Line Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No line items
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${(item.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        ${(item.total_price || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900 font-medium">${(estimate.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Tax ({((estimate.tax_rate || 0) * 100).toFixed(2)}%):
              </span>
              <span className="text-gray-900 font-medium">${(estimate.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-3">
              <span>Total:</span>
              <span className="text-blue-600">${(estimate.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        {canAccept && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAcceptEstimate}
                disabled={accepting}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Estimate
                  </>
                )}
              </button>
              <button
                onClick={handleRejectEstimate}
                disabled={accepting}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject Estimate
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">Estimate Accepted</h3>
            <p className="text-green-700">
              Thank you for accepting this estimate. We will contact you soon to proceed with the work.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-900 mb-2">Estimate Rejected</h3>
            <p className="text-red-700">
              This estimate has been rejected. If you have any questions, please contact us.
            </p>
          </div>
        )}

        {isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-yellow-900 mb-2">Estimate Expired</h3>
            <p className="text-yellow-700">
              This estimate has expired. Please contact us if you would like a new estimate.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

