'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Trash2, Eye, Share2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/product/ProductCard';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/shared/Toast';

interface WishlistItem {
  id: string;
  product: any;
  created_at: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/account/wishlist');
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadWishlist = async () => {
    if (!user) return;

    try {
      const { data: wishlistItems, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          created_at,
          product:products (
            id,
            slug,
            name,
            description,
            price,
            original_price,
            images,
            rating,
            review_count,
            stock,
            brand:brands (name, slug),
            category:categories (name, slug)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWishlist(wishlistItems || []);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toast.error('Failed to load wishlist', {
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setWishlist(prev => prev.filter(item => item.id !== itemId));
      
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove item', {
        description: 'Please try again.',
      });
    }
  };

  const addAllToCart = async () => {
    // This would add all wishlist items to cart
    toast.info('Feature coming soon', {
      description: 'Adding all items to cart will be available soon.',
    });
  };

  const shareWishlist = async () => {
    try {
      const shareData = {
        title: 'My Xarastore Wishlist',
        text: 'Check out my wishlist on Xarastore!',
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const createWishlistCollection = async () => {
    const name = prompt('Enter a name for your new wishlist collection:');
    if (name) {
      toast.success(`Created collection: ${name}`);
    }
  };

  if (isLoading) {
    return <WishlistSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-responsive">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Your wishlist is empty
            </h1>
            <p className="text-gray-600 mb-8">
              Save items you love to your wishlist. Review them anytime and easily move to cart.
            </p>
            <div className="space-y-4">
              <Button asChild variant="primary" size="lg" className="w-full">
                <a href="/shop">
                  Start Shopping
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full">
                <a href="/deals">
                  View Deals
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-2">
              {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} saved for later
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={shareWishlist}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="secondary"
              onClick={createWishlistCollection}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
            <Button
              variant="primary"
              onClick={addAllToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add All to Cart
            </Button>
          </div>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <div key={item.id} className="group relative">
              {/* Remove Button */}
              <button
                onClick={() => removeFromWishlist(item.id)}
                className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>

              {/* Product Card */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <a href={`/product/${item.product.slug}`} className="block">
                  <div className="aspect-square bg-gray-100 relative">
                    {item.product.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </a>
                
                <div className="p-4">
                  <a href={`/product/${item.product.slug}`}>
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-red-600 transition-colors">
                      {item.product.name}
                    </h3>
                  </a>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-red-600 text-lg">
                        KES {item.product.price.toLocaleString()}
                      </span>
                      {item.product.original_price && (
                        <span className="ml-2 text-gray-400 line-through text-sm">
                          KES {item.product.original_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // Add to cart functionality
                        toast.success('Added to cart!');
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="flex-shrink-0"
                    >
                      <a href={`/product/${item.product.slug}`}>
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Wishlist Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-6">Wishlist Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{wishlist.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                KES {wishlist.reduce((sum, item) => sum + item.product.price, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {Math.round(wishlist.reduce((sum, item) => sum + item.product.rating, 0) / wishlist.length) || 0}
              </div>
              <div className="text-sm text-gray-600">Avg. Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {new Set(wishlist.map(item => item.product.brand?.name)).size}
              </div>
              <div className="text-sm text-gray-600">Unique Brands</div>
            </div>
          </div>
        </div>

        {/* Price Alert */}
        <div className="mt-8 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Get Price Drop Alerts</h3>
              <p className="opacity-90">
                We'll notify you when items in your wishlist go on sale
              </p>
            </div>
            <Button variant="secondary" className="text-red-600">
              Enable Alerts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
