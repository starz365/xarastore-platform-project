'use client';

import { useEffect, useState } from 'react';
import { 
  Download, 
  Printer, 
  Mail, 
  FileText,
  Calendar,
  Hash,
  MapPin,
  Package,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, calculateTax } from '@/lib/utils/currency';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
}

interface OrderInvoiceProps {
  orderId: string;
}

export function OrderInvoice({ orderId }: OrderInvoiceProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchOrderInvoice();
  }, [orderId]);

  const fetchOrderInvoice = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', session.session.user.id)
        .single();

      if (orderError) throw orderError;

      setOrder(orderData);
      setItems(Array.isArray(orderData.items) ? orderData.items : []);
    } catch (err: any) {
      console.error('Failed to fetch invoice:', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      const invoiceElement = document.getElementById('invoice-content');
      if (!invoiceElement) return;

      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order?.order_number}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const printInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${order?.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const sendEmailInvoice = async () => {
    try {
      const response = await fetch('/api/invoice/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          email: order?.shipping_address?.email,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      alert('Invoice sent to your email successfully!');
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Failed to send email. Please try again.');
    }
  };

  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Loading invoice..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">
          {error || 'Invoice not found'}
        </p>
        <Button variant="primary" onClick={fetchOrderInvoice}>
          Try Again
        </Button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = calculateTax(subtotal);
  const shipping = order.shipping || 0;
  const total = subtotal + tax + shipping;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-red-600" />
            <div>
              <h1 className="font-semibold text-gray-900">
                Invoice #{order.order_number}
              </h1>
              <p className="text-sm text-gray-600">
                Generated on {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={printInvoice}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={sendEmailInvoice}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div id="invoice-content" className="bg-white rounded-xl border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-8 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">X</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Xarastore</h1>
                <p className="text-gray-600">it's a deal</p>
              </div>
            </div>
            <p className="text-gray-600">Nairobi, Kenya</p>
            <p className="text-gray-600">support@xarastore.com</p>
            <p className="text-gray-600">+254 700 000 000</p>
          </div>
          
          <div className="mt-4 md:mt-0 text-right">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-end space-x-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{order.order_number}</span>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing & Shipping */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-400" />
              Billed To
            </h3>
            <div className="space-y-2">
              {order.billing_address ? (
                <>
                  <p className="font-medium">{order.billing_address.name}</p>
                  <p>{order.billing_address.street}</p>
                  <p>{order.billing_address.city}, {order.billing_address.state}</p>
                  <p>{order.billing_address.postal_code}</p>
                  <p>{order.billing_address.country}</p>
                  <p className="text-gray-600">📱 {order.billing_address.phone}</p>
                </>
              ) : (
                <p className="text-gray-500">Same as shipping address</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-400" />
              Shipped To
            </h3>
            <div className="space-y-2">
              {order.shipping_address && (
                <>
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.street}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                  <p className="text-gray-600">📱 {order.shipping_address.phone}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">Qty</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{item.sku}</td>
                    <td className="py-4 px-4">{formatCurrency(item.price)}</td>
                    <td className="py-4 px-4">{item.quantity}</td>
                    <td className="py-4 px-4 font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
              Payment Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium capitalize">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-medium ${
                  order.payment_status === 'paid' 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                }`}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </span>
              </div>
              {order.mpesa_receipt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">M-Pesa Receipt:</span>
                  <span className="font-mono">{order.mpesa_receipt}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>{formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (16%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-xl text-red-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p className="mb-2">Thank you for shopping with Xarastore!</p>
            <p className="text-sm">
              For any questions about this invoice, please contact our support team.
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <span>support@xarastore.com</span>
              <span>•</span>
              <span>+254 700 000 000</span>
              <span>•</span>
              <span>www.xarastore.com</span>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              This is a computer-generated invoice. No signature required.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Actions */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            If you have questions about your invoice or need assistance, 
            our support team is ready to help.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" href="/help">
              Contact Support
            </Button>
            <Button variant="secondary" href="/account/orders">
              View All Orders
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
