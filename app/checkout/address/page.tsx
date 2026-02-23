xarastore/app/checkout/address/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Edit2, Check, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  type?: 'home' | 'work' | 'other';
}

export default function CheckoutAddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Kenya',
    type: 'home' as 'home' | 'work' | 'other',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/checkout/address');
        return;
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      
      // Select default address if available
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      } else if (data && data.length > 0) {
        setSelectedAddress(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses', {
        description: 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.phone.trim()) errors.push('Phone number is required');
    if (!formData.street.trim()) errors.push('Street address is required');
    if (!formData.city.trim()) errors.push('City is required');
    if (!formData.state.trim()) errors.push('State/County is required');
    if (!formData.postal_code.trim()) errors.push('Postal code is required');
    
    if (errors.length > 0) {
      toast.error('Please fill in all required fields', {
        description: errors.join(', '),
      });
      return false;
    }
    
    return true;
  };

  const handleSubmitNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to save address');
        return;
      }

      const { error } = await supabase
        .from('user_addresses')
        .insert({
          ...formData,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // If this is set as default, update other addresses
      if (formData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', session.user.id);
      }

      toast.success('Address added successfully');
      
      // Reset form and reload addresses
      setFormData({
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Kenya',
        type: 'home',
        is_default: false,
      });
      setShowNewAddressForm(false);
      loadAddresses();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address', {
        description: 'Please try again.',
      });
    }
  };

  const handleContinue = () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    // Save selected address to checkout session
    localStorage.setItem('checkout_address', selectedAddress);
    router.push('/checkout/delivery');
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'home':
        return <Home className="w-5 h-5 text-blue-600" />;
      case 'work':
        return <Briefcase className="w-5 h-5 text-green-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      default:
        return 'Other';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive max-w-4xl">
          <div className="space-y-8">
            <div className="h-12 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {['Address', 'Delivery', 'Payment', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`text-sm mt-2 ${
                  index === 0 ? 'font-semibold text-red-600' : 'text-gray-600'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-200 rounded-full">
            <div className="h-full w-1/4 bg-red-600 rounded-full"></div>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Address</h1>
          <p className="text-gray-600 mt-2">
            Where should we deliver your order?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Address Selection */}
          <div className="lg:col-span-2">
            {/* Saved Addresses */}
            {addresses.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Select from saved addresses</h2>
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all ${
                        selectedAddress === address.id
                          ? 'border-red-600 ring-2 ring-red-600/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAddress(address.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="mt-1">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedAddress === address.id
                                ? 'border-red-600 bg-red-600'
                                : 'border-gray-300'
                            }`}>
                              {selectedAddress === address.id && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              {getTypeIcon(address.type)}
                              <h3 className="font-semibold text-gray-900">
                                {address.name}
                              </h3>
                              {address.is_default && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-gray-700">
                              <p>{address.street}</p>
                              <p>{address.city}, {address.state}</p>
                              <p>{address.postal_code}, {address.country}</p>
                              <p className="font-medium">{address.phone}</p>
                            </div>
                            <div className="mt-4">
                              <span className="text-sm text-gray-600">
                                {getTypeLabel(address.type)} Address
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Address Form */}
            {showNewAddressForm ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Add new address</h2>
                  <Button
                    variant="ghost"
                    onClick={() => setShowNewAddressForm(false)}
                  >
                    Cancel
                  </Button>
                </div>

                <form onSubmit={handleSubmitNewAddress} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="0712 345 678"
                        required
                      />
                    </div>

                    {/* Street */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <Input
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        placeholder="123 Main Street, Building Name, Floor"
                        required
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City/Town *
                      </label>
                      <Input
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Nairobi"
                        required
                      />
                    </div>

                    {/* State/County */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        County *
                      </label>
                      <Input
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Nairobi County"
                        required
                      />
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <Input
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        placeholder="00100"
                        required
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                      >
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Rwanda">Rwanda</option>
                      </select>
                    </div>

                    {/* Address Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address Type
                      </label>
                      <div className="flex space-x-4">
                        {(['home', 'work', 'other'] as const).map((type) => (
                          <label key={type} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="type"
                              value={type}
                              checked={formData.type === type}
                              onChange={(e) => handleInputChange('type', e.target.value)}
                              className="text-red-600 focus:ring-red-600"
                            />
                            <span className="text-sm text-gray-700 capitalize">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Set as Default */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => handleInputChange('is_default', e.target.checked)}
                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
                      />
                      <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                        Set as default address
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowNewAddressForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Save Address
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowNewAddressForm(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Address
              </Button>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">KES 0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">-</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-red-600">KES 0</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleContinue}
                  disabled={!selectedAddress}
                >
                  Continue to Delivery
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/cart')}
                >
                  Back to Cart
                </Button>
              </div>

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">🔒</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Secure Checkout</p>
                    <p className="text-xs text-gray-600">Your information is protected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Tips */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Delivery Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold mb-2">Accurate Phone Number</h3>
              <p className="text-sm opacity-90">
                Ensure your phone number is correct for delivery notifications
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏠</span>
              </div>
              <h3 className="font-semibold mb-2">Clear Directions</h3>
              <p className="text-sm opacity-90">
                Include landmarks or building names for easier delivery
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold mb-2">Delivery Times</h3>
              <p className="text-sm opacity-90">
                Standard delivery: 3-5 business days. Express: 1-2 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
