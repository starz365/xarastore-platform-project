'use client';

import { Star, Users, Award, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SocialProofData {
  totalCustomers: number;
  averageRating: number;
  totalReviews: number;
  happyCustomers: number;
}

export function SocialProof() {
  const [data, setData] = useState<SocialProofData>({
    totalCustomers: 124856,
    averageRating: 4.8,
    totalReviews: 89234,
    happyCustomers: 98,
  });

  const [animatedValues, setAnimatedValues] = useState({
    customers: 0,
    rating: 0,
    reviews: 0,
    happy: 0,
  });

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const animateValue = (
      start: number,
      end: number,
      setter: (value: number) => void
    ) => {
      let current = start;
      const increment = (end - start) / steps;
      const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          current = end;
          clearInterval(timer);
        }
        setter(Math.round(current * 10) / 10);
      }, interval);
    };

    animateValue(0, data.totalCustomers, (value) =>
      setAnimatedValues(prev => ({ ...prev, customers: Math.floor(value) }))
    );
    animateValue(0, data.averageRating, (value) =>
      setAnimatedValues(prev => ({ ...prev, rating: value }))
    );
    animateValue(0, data.totalReviews, (value) =>
      setAnimatedValues(prev => ({ ...prev, reviews: Math.floor(value) }))
    );
    animateValue(0, data.happyCustomers, (value) =>
      setAnimatedValues(prev => ({ ...prev, happy: value }))
    );
  }, [data]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {animatedValues.customers.toLocaleString()}+
        </div>
        <p className="text-gray-600">Happy Customers</p>
      </div>

      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-yellow-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {animatedValues.rating.toFixed(1)}
          <span className="text-lg text-gray-500">/5</span>
        </div>
        <p className="text-gray-600">Average Rating</p>
      </div>

      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-blue-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {animatedValues.reviews.toLocaleString()}+
        </div>
        <p className="text-gray-600">Verified Reviews</p>
      </div>

      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {animatedValues.happy}%
        </div>
        <p className="text-gray-600">Happy Customers</p>
      </div>
    </div>
  );
}
