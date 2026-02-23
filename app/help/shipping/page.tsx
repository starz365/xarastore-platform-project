import { ShippingInfo } from '@/components/help/ShippingInfo';

export const metadata = {
  title: 'Shipping Information | Xarastore Help',
  description: 'Shipping times, costs, tracking, and delivery information for Xarastore orders.',
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Shipping Information
            </h1>
            <p className="text-xl opacity-90">
              Everything you need to know about shipping, delivery, and tracking your orders.
            </p>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        <ShippingInfo />
      </div>
    </div>
  );
}
