xarastore/app/checkout/address/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Check, Home, Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';
import { useCart } from '@/lib/hooks/useCart';

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
  const { items } = useCart();
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
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
    save_for_later: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.setItem('redirectAfterAuth', '/checkout/address');
        router.push('/auth/login?checkout=true');
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateAddress = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Full name is required');
    if (!formData.phone.trim()) errors.push('Phone number is required');
    if (!formData.street.trim()) errors.push('Street address is required');
    if (!formData.city.trim()) errors.push('City is required');
    if (!formData.state.trim()) errors.push('County is required');
    if (!formData.postal_code.trim()) errors.push('Postal code is required');

    if (errors.length > 0) {
      toast.error('Please fill in all required fields', {
        description: errors.join(', '),
      });
      return false;
    }

    if (formData.phone.length < 10) {
      toast.error('Invalid phone number', {
        description: 'Please enter a valid Kenyan phone number',
      });
      return false;
    }

    return true;
  };

  const handleCreateAddress = async () => {
    if (!validateAddress()) return;

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          ...formData,
          user_id: user.id,
          is_default: addresses.length === 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Address added successfully');
      
      if (formData.save_for_later) {
        setAddresses(prev => [data, ...prev]);
        setSelectedAddressId(data.id);
      } else {
        // Use address only for this checkout
        await proceedToDelivery(data);
        return;
      }

      setShowNewAddressForm(false);
      setFormData({
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Kenya',
        type: 'home',
        save_for_later: true,
      });
    } catch (error) {
      console.error('Failed to create address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleUseSelectedAddress = async () => {
    if (!selectedAddressId) {
      toast.error('Please select an address');
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error('Selected address not found');
      return;
    }

    await proceedToDelivery(selectedAddress);
  };

  const proceedToDelivery = async (address: Address) => {
    try {
      // Save selected address to session storage for checkout flow
      sessionStorage.setItem('checkout_address', JSON.stringify(address));

      // Save to Supabase for order tracking
      const { error } = await supabase
        .from('checkout_sessions')
        .upsert({
          user_id: user.id,
          shipping_address: address,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      router.push('/checkout/delivery');
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to proceed to delivery');
    }
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
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-responsive">
          <div className="max-w-2xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
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
        {/* Checkout Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <div className="font-semibold text-red-600">Address</div>
                <div className="text-sm text-gray-600">Shipping details</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className="font-semibold text-gray-600">Delivery</div>
                <div className="text-sm text-gray-500">Shipping method</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-600">Payment</div>
                <div className="text-sm text-gray-500">Secure checkout</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Shipping Address
              </h1>

              {/* Saved Addresses */}
              {addresses.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Select a saved address</h2>
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedAddressId === address.id
                                  ? 'border-red-600 bg-red-600'
                                  : 'border-gray-300'
                              }`}>
                                {selectedAddressId === address.id && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                {getTypeIcon(address.type)}
                                <h3 className="font-semibold">{address.name}</h3>
                                {address.is_default && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
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
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {getTypeLabel(address.type)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Address Form or Button */}
              {!showNewAddressForm ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Add a new address</h3>
                  <p className="text-gray-600 mb-4">
                    Enter a new shipping address for this order
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewAddressForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Address
                  </Button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Enter new address</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <Input
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        placeholder="123 Main Street, Building, Floor"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                        >
                          <option value="Kenya">Kenya</option>
                          <option value="Uganda">Uganda</option>
                          <option value="Tanzania">Tanzania</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                onChange={(e) => handleInputChange('type', e.target.value as any)}
                                className="text-red-600 focus:ring-red-600"
                              />
                              <span className="text-sm text-gray-700 capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="save_for_later"
                          checked={formData.save_for_later}
                          onChange={(e) => handleInputChange('save_for_later', e.target.checked)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
                        />
                        <label htmlFor="save_for_later" className="ml-2 text-sm text-gray-700">
                          Save for future orders
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                      <Button
                        variant="secondary"
                        onClick={() => setShowNewAddressForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleCreateAddress}
                      >
                        Save Address
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items ({items.length})</span>
                  <span className="font-medium">KES {items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-600">Calculated at next step</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-600">Calculated at next step</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>KES {items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleUseSelectedAddress}
                  disabled={!selectedAddressId && addresses.length > 0}
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

              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Delivery in 1-3 days</h3>
                    <p className="text-xs text-gray-600">Across Kenya</p>
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
