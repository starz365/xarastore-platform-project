'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  Home,
  Briefcase,
  Star,
} from 'lucide-react';
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

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
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
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/account/addresses');
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
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses', {
        description: 'Please try again later.',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from('user_addresses')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAddress.id);

        if (error) throw error;

        toast.success('Address updated successfully');
      } else {
        // Create new address
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            ...formData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast.success('Address added successfully');
      }

      // If this is set as default, update other addresses
      if (formData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', editingAddress?.id || '');
      }

      // Reset form and reload addresses
      resetForm();
      loadAddresses();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address', {
        description: 'Please try again.',
      });
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    try {
      // Update all addresses to not default
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set selected address as default
      await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      toast.success('Default address updated');
      loadAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
      toast.error('Failed to update default address');
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast.success('Address deleted');
      loadAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address');
    }
  };

  const editAddress = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      type: address.type || 'home',
      is_default: address.is_default,
    });
    setShowForm(true);
  };

  const resetForm = () => {
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
    setEditingAddress(null);
    setShowForm(false);
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
        <div className="container-responsive">
          <div className="space-y-8">
            <div className="h-12 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
            <p className="text-gray-600 mt-2">
              Manage your delivery addresses for faster checkout
            </p>
          </div>
          
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Address
          </Button>
        </div>

        {/* Address Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    Set as default shipping address
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses Grid */}
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                  address.is_default
                    ? 'border-red-600 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Address Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(address.type)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {address.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {getTypeLabel(address.type)}
                          </span>
                          {address.is_default && (
                            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => editAddress(address)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Edit address"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAddress(address.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-2 text-gray-700">
                    <p className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{address.street}</span>
                    </p>
                    <p>{address.city}, {address.state}</p>
                    <p>{address.postal_code}, {address.country}</p>
                    <p className="font-medium">{address.phone}</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {!address.is_default && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDefaultAddress(address.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => editAddress(address)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No addresses saved
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Add your delivery addresses for faster checkout and order tracking.
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Address
            </Button>
          </div>
        )}

        {/* Address Tips */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Address Tips</h2>
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
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold mb-2">Fast Checkout</h3>
              <p className="text-sm opacity-90">
                Set a default address for faster checkout experience
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
