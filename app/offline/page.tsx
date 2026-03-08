'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WifiOff, ShoppingBag, Clock, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getRecentlyVisited } from '@/lib/utils/offline';
import { ProductCard } from '@/components/product/ProductCard';

export default function OfflinePage() {
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    loadRecentProducts();
  }, []);

  const loadRecentProducts = async () => {
    const recent = await getRecentlyVisited(4);
    setRecentProducts(recent);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              You're currently offline!
            </h1>
            <p className="text-gray-600 text-lg">
              Don't worry! You can still browse products you've recently viewed.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-semibold mb-2">Browse Products</h3>
              <p className="text-gray-600 text-sm">
                View recently visited products
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-semibold mb-2">Access Cart</h3>
              <p className="text-gray-600 text-sm">
                Your cart is saved locally
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-semibold mb-2">Homepage Access</h3>
              <p className="text-gray-600 text-sm">
                Browse cached homepage content
              </p>
            </div>
          </div>

          {/* Recently Viewed Products */}
          {recentProducts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Recently Viewed Products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg border border-gray-200">
                    <div className="aspect-square bg-gray-100 relative">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2">
                        {product.name}
                      </h3>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-brand-red">
                          KES {product.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="text-center space-y-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.reload()}
            >
              Try to Reconnect
            </Button>
            <p className="text-gray-500 text-sm">
              When you're back online, your cart will sync automatically.
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/cart">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View Cart
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
