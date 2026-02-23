'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  User, 
  Phone, 
  Home, 
  Building, 
  Globe,
  Save,
  Trash2,
  Star,
  Plus
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
  instructions?: string;
}

interface AddressFormProps {
  addressId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddressForm({ addressId, onSuccess, onCancel }: AddressFormProps) {
  const [address, setAddress] = useState<Address>({
    id: '',
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Kenya',
    is_default: false,
    type: 'home',
    instructions: '',
  });
  
  const [isLoading, setIsLoading] = useState(!!addressId);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addressId) {
      fetchAddress();
    }
  }, [addressId]);

  const fetchAddress = async () => {
    try {
      setIsLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data: addressData } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', session.session.user.id)
        .single();

      if (addressData) {
        setAddress(addressData);
      }
    } catch (err) {
      console.error('Failed to fetch address:', err);
      toast.error('Failed to load address');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!address.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!address.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,15}$/.test(address.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!address.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!address.state.trim()) {
      newErrors.state = 'State/County is required';
    }

    if (!address.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    if (!address.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const addressData = {
        user_id: session.session.user.id,
        name: address.name.trim(),
        phone: address.phone.trim(),
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        postal_code: address.postal_code.trim(),
        country: address.country.trim(),
        type: address.type,
        instructions: address.instructions?.trim(),
        is_default: address.is_default,
        updated_at: new Date().toISOString(),
      };

      let result;
      
      if (addressId) {
        // Update existing address
        result = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', addressId)
          .eq('user_id', session.session.user.id);
      } else {
        // Create new address
        result = await supabase
          .from('user_addresses')
          .insert([{
            ...addressData,
            created_at: new Date().toISOString(),
          }]);
      }

      if (result.error) throw result.error;

      // If this is set as default, update other addresses
      if (address.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', session.session.user.id)
          .neq('id', addressId || result.data?.[0]?.id);
      }

      toast.success(
        addressId ? 'Address updated successfully' : 'Address added successfully'
      );
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to save address:', err);
      toast.error('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!addressId || !confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', session.session.user.id);

      if (error) throw error;

      toast.success('Address deleted successfully');
      onSuccess?.();
    } catch (err) {
      console.error('Failed to delete address:', err);
      toast.error('Failed to delete address');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Address Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Address Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'home', label: 'Home', icon: Home },
            { value: 'work', label: 'Work', icon: Building },
            { value: 'other', label: 'Other', icon: MapPin },
          ].map((type) => {
            const Icon = type.icon;
            return (
              <label
                key={type.value}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                  address.type === type.value
                    ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="addressType"
                  value={type.value}
                  checked={address.type === type.value}
                  onChange={(e) => setAddress(prev => ({ ...prev, type: e.target.value as any }))}
                  className="sr-only"
                />
                <Icon className={`w-6 h-6 mb-2 ${
                  address.type === type.value ? 'text-red-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium">{type.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Contact Information</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={address.name}
                onChange={(e) => setAddress(prev => ({ ...prev, name: e.target.value }))}
                className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                placeholder="John Doe"
                required
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress(prev => ({ ...prev, phone: e.target.value }))}
                className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="+254 712 345 678"
                required
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Used for delivery notifications
            </p>
          </div>
        </div>
      </div>

      {/* Address Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Address Details</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={address.street}
                onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                className={`pl-10 ${errors.street ? 'border-red-500' : ''}`}
                placeholder="123 Main Street, Building Name"
                required
              />
            </div>
            {errors.street && (
              <p className="mt-1 text-sm text-red-600">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <Input
                type="text"
                value={address.city}
                onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                className={errors.city ? 'border-red-500' : ''}
                placeholder="Nairobi"
                required
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/County *
              </label>
              <Input
                type="text"
                value={address.state}
                onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                className={errors.state ? 'border-red-500' : ''}
                placeholder="Nairobi County"
                required
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code *
              </label>
              <Input
                type="text"
                value={address.postal_code}
                onChange={(e) => setAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                className={errors.postal_code ? 'border-red-500' : ''}
                placeholder="00100"
                required
              />
              {errors.postal_code && (
                <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={address.country}
                  onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
                  className={`w-full px-3 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Rwanda">Rwanda</option>
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Instructions (Optional)
            </label>
            <textarea
              value={address.instructions || ''}
              onChange={(e) => setAddress(prev => ({ ...prev, instructions: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none resize-none"
              rows={3}
              placeholder="e.g., Leave at gate, Call before delivery, etc."
            />
            <p className="mt-1 text-sm text-gray-500">
              Additional instructions for the delivery person
            </p>
          </div>
        </div>
      </div>

      {/* Default Address */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={address.is_default}
            onChange={(e) => setAddress(prev => ({ ...prev, is_default: e.target.checked }))}
            className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
          />
          <div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-gray-900">Set as default address</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              This address will be used as the default for all future orders
            </p>
          </div>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {addressId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Address
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
        
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // Reset form
              setAddress({
                id: '',
                name: '',
                phone: '',
                street: '',
                city: '',
                state: '',
                postal_code: '',
                country: 'Kenya',
                is_default: false,
                type: 'home',
                instructions: '',
              });
              setErrors({});
            }}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {addressId ? 'Update Address' : 'Save Address'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Example Format */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-medium text-gray-900 mb-3">Example Format</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Name:</strong> John Doe</p>
          <p><strong>Phone:</strong> +254 712 345 678</p>
          <p><strong>Street:</strong> 123 Main Street, ABC Apartments, Floor 3</p>
          <p><strong>City:</strong> Nairobi</p>
          <p><strong>County:</strong> Nairobi County</p>
          <p><strong>Postal Code:</strong> 00100</p>
          <p><strong>Instructions:</strong> Leave at reception</p>
        </div>
      </div>
    </form>
  );
}
