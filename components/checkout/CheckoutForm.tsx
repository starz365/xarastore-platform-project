'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Home, Building } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';
import { CheckoutAddressForm } from './CheckoutAddressForm';

interface CheckoutFormProps {
  user: any;
  onContinue: () => void;
}

export function CheckoutForm({ user, onContinue }: CheckoutFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    addressType: 'home' as 'home' | 'office',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      // Save address to Supabase
      const { error } = await supabase.from('user_addresses').insert({
        user_id: user?.id,
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        email: formData.email,
        address_type: formData.addressType,
        is_default: true,
      });

      if (error) throw error;

      toast.success('Address saved successfully');
      onContinue();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (address: any) => {
    const [firstName, ...lastNameParts] = address.name.split(' ');
    setFormData({
      ...formData,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      email: address.email || formData.email,
      phone: address.phone || '',
      addressType: address.address_type || 'home',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Shipping Address</h2>
        <p className="text-gray-600 mt-1">
          Where should we deliver your order?
        </p>
      </div>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Saved Addresses</h3>
          <div className="grid gap-3">
            {savedAddresses.map((address) => (
              <button
                key={address.id}
                onClick={() => handleAddressSelect(address)}
                className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{address.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                    {address.email && (
                      <p className="text-sm text-gray-600">{address.email}</p>
                    )}
                  </div>
                  {address.address_type === 'home' ? (
                    <Home className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Building className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">
                Or enter a new address
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Address Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={errors.firstName ? 'border-red-500' : ''}
              placeholder="John"
              required
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={errors.lastName ? 'border-red-500' : ''}
              placeholder="Doe"
              required
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
              placeholder="you@example.com"
              required
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
              className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="0712 345 678"
              maxLength={10}
              required
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            We'll use this to contact you about delivery
          </p>
        </div>

        {/* Address Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, addressType: 'home' })}
              className={`p-4 border rounded-lg text-center transition-all ${
                formData.addressType === 'home'
                  ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Home className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Home</span>
              <p className="text-sm text-gray-600 mt-1">Residential address</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, addressType: 'office' })}
              className={`p-4 border rounded-lg text-center transition-all ${
                formData.addressType === 'office'
                  ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Office</span>
              <p className="text-sm text-gray-600 mt-1">Work or business address</p>
            </button>
          </div>
        </div>

        {/* Address Details */}
        <CheckoutAddressForm />

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1"
            >
              Back to Cart
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : 'Continue to Delivery'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
