xarastore/app/checkout/payment/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Smartphone, Building2, Lock, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/lib/hooks/useCart';
import { toast } from '@/components/shared/Toast';
import { PaymentProcessor } from '@/services/payment/processor';

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<string>('mpesa');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [formData, setFormData] = useState({
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
    bankAccount: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.setItem('redirectAfterAuth', '/checkout/payment');
        router.push('/auth/login?checkout=true');
        return;
      }
      setUser(session.user);
      loadCheckoutData();
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadCheckoutData = async () => {
    try {
      const shippingAddress = sessionStorage.getItem('checkout_address');
      const deliveryMethod = sessionStorage.getItem('checkout_delivery');

      if (!shippingAddress || !deliveryMethod) {
        router.push('/checkout/address');
        return;
      }

      const { data } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCheckoutData({
        shippingAddress: JSON.parse(shippingAddress),
        deliveryMethod: JSON.parse(deliveryMethod),
        ...data,
      });

      // Pre-fill phone from shipping address
      const address = JSON.parse(shippingAddress);
      setFormData(prev => ({ ...prev, phone: address.phone || '' }));
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      router.push('/checkout/address');
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
  };

  const calculateTax = (subtotal: number) => {
    return Math.round(subtotal * 0.16);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const shipping = checkoutData?.deliveryMethod?.cost || 0;
    
    return subtotal + tax + shipping;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validatePaymentDetails = (): boolean => {
    switch (selectedMethod) {
      case 'mpesa':
        if (!formData.phone.trim() || formData.phone.length < 10) {
          toast.error('Valid phone number required', {
            description: 'Please enter a valid M-Pesa registered phone number',
          });
          return false;
        }
        break;

      case 'card':
        if (!formData.cardNumber.trim() || formData.cardNumber.replace(/\s/g, '').length !== 16) {
          toast.error('Valid card number required', {
            description: 'Please enter a valid 16-digit card number',
          });
          return false;
        }
        if (!formData.cardExpiry.trim() || !formData.cardExpiry.includes('/')) {
          toast.error('Valid expiry date required', {
            description: 'Please enter expiry date in MM/YY format',
          });
          return false;
        }
        if (!formData.cardCVC.trim() || formData.cardCVC.length !== 3) {
          toast.error('Valid CVC required', {
            description: 'Please enter a 3-digit CVC code',
          });
          return false;
        }
        if (!formData.cardName.trim()) {
          toast.error('Cardholder name required', {
            description: 'Please enter the name on the card',
          });
          return false;
        }
        break;

      case 'bank':
        if (!formData.bankAccount.trim()) {
          toast.error('Bank account required', {
            description: 'Please enter your bank account details',
          });
          return false;
        }
        break;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validatePaymentDetails()) return;

    setIsLoading(true);

    try {
      // Generate order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const totalAmount = calculateTotal();

      // Prepare payment request
      const paymentRequest = {
        orderId,
        amount: totalAmount,
        currency: 'KES',
        paymentMethod: selectedMethod as 'mpesa' | 'card' | 'bank',
        metadata: {
          phoneNumber: formData.phone,
          cardToken: formData.cardNumber ? `card_${formData.cardNumber.slice(-4)}` : undefined,
          bankAccount: formData.bankAccount,
        },
        customer: {
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          phone: formData.phone,
        },
      };

      // Process payment
      const paymentProcessor = PaymentProcessor.getInstance();
      const result = await paymentProcessor.processPayment(paymentRequest);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Create order in database
      const orderItems = items.map(item => ({
        product_id: item.productId,
        variant_id: item.variant.id,
        name: item.variant.name,
        price: item.variant.price,
        quantity: item.quantity,
        image: item.variant.attributes?.image || '/placeholder.jpg',
      }));

      const orderData = {
        id: orderId,
        order_number: orderId,
        user_id: user.id,
        items: orderItems,
        subtotal: calculateSubtotal(),
        shipping: checkoutData?.deliveryMethod?.cost || 0,
        tax: calculateTax(calculateSubtotal()),
        total: totalAmount,
        status: 'processing',
        shipping_address: checkoutData?.shippingAddress,
        delivery_method: checkoutData?.deliveryMethod,
        payment_method: selectedMethod,
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      // Clear cart and session storage
      clearCart();
      sessionStorage.removeItem('checkout_address');
      sessionStorage.removeItem('checkout_delivery');

      // Delete checkout session
      await supabase
        .from('checkout_sessions')
        .delete()
        .eq('user_id', user.id);

      // Redirect to confirmation
      router.push(`/checkout/confirmation?order=${orderId}&payment=${result.transactionId}`);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error('Payment Failed', {
        description: error.message || 'Please try again or use a different payment method',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Pay instantly via M-Pesa',
      icon: Smartphone,
      color: 'from-green-500 to-green-600',
      requirements: ['M-Pesa registered phone number', 'Sufficient balance', 'Enter your PIN when prompted'],
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express',
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      requirements: ['16-digit card number', 'Expiry date (MM/YY)', 'CVC code', 'Cardholder name'],
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: Building2,
      color: 'from-purple-500 to-purple-600',
      requirements: ['Bank account details', 'Use order number as reference', 'Complete within 24 hours'],
    },
  ];

  const renderPaymentForm = () => {
    switch (selectedMethod) {
      case 'mpesa':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                M-Pesa Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">+254</span>
                </div>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="712 345 678"
                  className="pl-16"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enter the 10-digit number registered with M-Pesa (e.g., 712345678)
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">How to pay with M-Pesa</h4>
                  <ol className="text-sm text-green-700 mt-2 space-y-1">
                    <li>1. Enter your M-Pesa registered phone number</li>
                    <li>2. Click "Pay with M-Pesa"</li>
                    <li>3. Check your phone for STK Push prompt</li>
                    <li>4. Enter your M-Pesa PIN when prompted</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                    handleInputChange('cardNumber', formatted);
                  }}
                  placeholder="4242 4242 4242 4242"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date *
                </label>
                <Input
                  type="text"
                  value={formData.cardExpiry}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    const formatted = value.replace(/(\d{2})(?=\d{2})/, '$1/');
                    handleInputChange('cardExpiry', formatted);
                  }}
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVC *
                </label>
                <Input
                  type="text"
                  value={formData.cardCVC}
                  onChange={(e) => handleInputChange('cardCVC', e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name *
              </label>
              <Input
                type="text"
                value={formData.cardName}
                onChange={(e) => handleInputChange('cardName', e.target.value)}
                placeholder="Name on card"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Secure Payment</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your card details are encrypted and secure. We never store your full card information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Account Details *
              </label>
              <textarea
                value={formData.bankAccount}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                placeholder="Enter your bank account number, bank name, and account name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none min-h-[100px]"
                required
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Building2 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900">Bank Transfer Instructions</h4>
                  <div className="text-sm text-purple-700 mt-2 space-y-2">
                    <p><strong>Bank:</strong> Co-operative Bank of Kenya</p>
                    <p><strong>Account Name:</strong> Xarastore Limited</p>
                    <p><strong>Account Number:</strong> 0112345678900</p>
                    <p><strong>Branch:</strong> Nairobi Main Branch</p>
                    <p><strong>Swift Code:</strong> KCOOKENA</p>
                    <p className="mt-3">
                      <strong>Important:</strong> Use your order number as the payment reference. 
                      Orders will be processed once payment is confirmed (within 24 hours).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        {/* Checkout Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-600">Address</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-green-600"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-600">Delivery</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-green-600"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className="font-semibold text-red-600">Payment</div>
                <div className="text-sm text-gray-600">Secure checkout</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Payment Method
              </h1>

              {/* Payment Method Selection */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        selectedMethod === method.id
                          ? 'border-red-600 ring-2 ring-red-600/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 bg-gradient-to-r ${method.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1">{method.name}</h3>
                      <p className="text-xs text-gray-600">{method.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Payment Form */}
              {renderPaymentForm()}

              {/* Terms and Conditions */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-600 focus:ring-2"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="/legal/terms" className="text-red-600 hover:text-red-700 font-medium">
                      Terms of Service
                    </a>{' '}
                    and authorize Xarastore to charge my selected payment method for the total amount shown.
                  </label>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-red-600" />
                <h2 className="text-lg font-semibold">Secure Payment Guarantee</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-medium mb-1">SSL Encrypted</h3>
                  <p className="text-sm text-gray-600">
                    All transactions are protected by 256-bit encryption
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-medium mb-1">PCI Compliant</h3>
                  <p className="text-sm text-gray-600">
                    We meet the highest security standards for payment processing
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-medium mb-1">Money Back Guarantee</h3>
                  <p className="text-sm text-gray-600">
                    30-day return policy for all purchases
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {checkoutData?.deliveryMethod?.cost === 0 
                      ? 'FREE' 
                      : `KES ${checkoutData?.deliveryMethod?.cost?.toLocaleString() || 0}`
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (16% VAT)</span>
                  <span className="font-medium">
                    KES {calculateTax(calculateSubtotal()).toLocaleString()}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-red-600">
                      KES {calculateTotal().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Includes KES {calculateTax(calculateSubtotal()).toLocaleString()} VAT
                  </p>
                </div>
              </div>

              {/* Order Details */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-3">Order Details</h3>
                <div className="space-y-3">
                  {items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <div className="w-full h-full bg-gray-300"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.variant.name}</p>
                        <p className="text-xs text-gray-600">
                          Qty: {item.quantity} × KES {item.variant.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        KES {(item.variant.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        +{items.length - 3} more item{items.length - 3 !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Button */}
              <div className="mt-8 space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePayment}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay KES {calculateTotal().toLocaleString()}
                    </>
                  )}
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/checkout/delivery')}
                  disabled={isLoading}
                >
                  Back to Delivery
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-600 mb-1">Secure</div>
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-600 mb-1">Trusted</div>
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
