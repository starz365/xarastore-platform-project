'use client';

import { useState } from 'react';
import { MapPin, Home, Building, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/Button';
import { Button } from '@/components/ui/Button';

interface CheckoutAddressFormProps {
  onAddressSelect?: (address: any) => void;
}

export function CheckoutAddressForm({ onAddressSelect }: CheckoutAddressFormProps) {
  const [formData, setFormData] = useState({
    street: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Kenya',
    landmark: '',
    instructions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(response => response.json())
          .then(data => {
            const address = data.address;
            setFormData({
              ...formData,
              street: `${address.road || ''} ${address.house_number || ''}`.trim(),
              city: address.city || address.town || address.village || '',
              state: address.state || '',
              postalCode: address.postcode || '',
              country: address.country || 'Kenya',
            });
            setUseCurrentLocation(true);
          })
          .catch(error => {
            console.error('Geocoding error:', error);
            alert('Could not get your location. Please enter manually.');
          })
          .finally(() => {
            setIsGettingLocation(false);
          });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enter manually.');
        setIsGettingLocation(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State/County is required';
    }
    
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0 && onAddressSelect) {
      onAddressSelect(formData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Location Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Location</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
        >
          <Navigation className="w-4 h-4 mr-2" />
          {isGettingLocation ? 'Getting location...' : 'Use current location'}
        </Button>
      </div>

      {/* Street Address */}
      <div>
        <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
          Street Address *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            className={`pl-10 ${errors.street ? 'border-red-500' : ''}`}
            placeholder="123 Main Street"
            required
          />
        </div>
        {errors.street && (
          <p className="mt-1 text-sm text-red-600">{errors.street}</p>
        )}
      </div>

      {/* Apartment/Suite */}
      <div>
        <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
          Apartment, suite, unit (optional)
        </label>
        <Input
          id="apartment"
          value={formData.apartment}
          onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
          placeholder="Apt 4B, Floor 2"
        />
      </div>

      {/* City, State, Postal Code */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className={errors.city ? 'border-red-500' : ''}
            placeholder="Nairobi"
            required
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
            State/County *
          </label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className={errors.state ? 'border-red-500' : ''}
            placeholder="Nairobi County"
            required
          />
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state}</p>
          )}
        </div>
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code *
          </label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })}
            className={errors.postalCode ? 'border-red-500' : ''}
            placeholder="00100"
            maxLength={5}
            required
          />
          {errors.postalCode && (
            <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
          )}
        </div>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
          Country
        </label>
        <select
          id="country"
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all outline-none"
        >
          <option value="Kenya">Kenya</option>
          <option value="Uganda">Uganda</option>
          <option value="Tanzania">Tanzania</option>
          <option value="Rwanda">Rwanda</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Landmark */}
      <div>
        <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-2">
          Nearby Landmark (optional)
        </label>
        <Input
          id="landmark"
          value={formData.landmark}
          onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
          placeholder="Opposite ABC Mall, next to petrol station"
        />
        <p className="mt-1 text-sm text-gray-500">
          Helps delivery drivers find your location
        </p>
      </div>

      {/* Delivery Instructions */}
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Instructions (optional)
        </label>
        <textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all outline-none resize-none"
          rows={3}
          placeholder="Leave at the gate, call before delivery, etc."
          maxLength={500}
        />
        <div className="flex justify-between mt-1">
          <p className="text-sm text-gray-500">
            Max 500 characters
          </p>
          <p className="text-sm text-gray-500">
            {formData.instructions.length}/500
          </p>
        </div>
      </div>

      {/* Save Address Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="saveAddress"
          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
        />
        <label htmlFor="saveAddress" className="ml-2 text-sm text-gray-700">
          Save this address for future orders
        </label>
      </div>
    </div>
  );
}
