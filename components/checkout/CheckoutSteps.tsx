'use client';

import { Check, Package, Truck, CreditCard, User } from 'lucide-react';

interface CheckoutStepsProps {
  currentStep: 'cart' | 'address' | 'delivery' | 'payment' | 'review';
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const steps = [
    {
      id: 'cart',
      label: 'Cart',
      icon: Package,
    },
    {
      id: 'address',
      label: 'Address',
      icon: User,
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: Truck,
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: CreditCard,
    },
    {
      id: 'review',
      label: 'Review',
      icon: Check,
    },
  ];

  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Connection Line */}
              {index > 0 && (
                <div
                  className={`absolute left-[-50%] top-4 w-full h-0.5 ${
                    isCompleted ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-red-600 text-white'
                    : isCurrent
                    ? 'bg-red-600 text-white ring-4 ring-red-600/20'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={`mt-2 text-sm font-medium ${
                  isCompleted || isCurrent
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>

              {/* Step Number */}
              <span
                className={`text-xs mt-1 ${
                  isCompleted || isCurrent
                    ? 'text-red-600'
                    : 'text-gray-400'
                }`}
              >
                Step {index + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-300"
            style={{
              width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
