import { ShoppingBag, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CartEmptyStateProps {
  onClose?: () => void;
}

export function CartEmptyState({ onClose }: CartEmptyStateProps) {
  const categories = [
    { name: 'Electronics', href: '/category/electronics', icon: '💻' },
    { name: 'Fashion', href: '/category/fashion', icon: '👕' },
    { name: 'Home & Garden', href: '/category/home-garden', icon: '🏠' },
    { name: 'Beauty', href: '/category/beauty', icon: '💄' },
  ];

  return (
    <div className="p-8 text-center">
      {/* Empty Cart Icon */}
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingBag className="w-12 h-12 text-gray-400" />
      </div>

      {/* Message */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        Your cart is empty
      </h3>
      <p className="text-gray-600 mb-8">
        Looks like you haven't added any items to your cart yet.
      </p>

      {/* Call to Action */}
      <div className="space-y-4 mb-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          href="/shop"
          onClick={onClose}
        >
          Start Shopping
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          href="/deals"
          onClick={onClose}
        >
          <Tag className="w-5 h-5 mr-2" />
          View Deals
        </Button>
      </div>

      {/* Popular Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-red-600" />
          <h4 className="font-semibold text-gray-900">Popular Categories</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <a
              key={category.name}
              href={category.href}
              className="group p-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-all"
              onClick={onClose}
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <span className="font-medium text-gray-900 group-hover:text-red-600">
                {category.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Trust Signals */}
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Free delivery on orders over KES 2,000</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Easy 30-day returns</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Secure payment & buyer protection</span>
        </div>
      </div>
    </div>
  );
}
