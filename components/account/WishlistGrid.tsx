'use client';

import { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Rating } from '@/components/ui/Rating';
import { supabase } from '@/lib/supabase/client';
import { Product } from '@/types';
import { toast } from '@/components/shared/Toast';

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: Product;
}

export function WishlistGrid() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          created_at,
          product:products (
            id,
            slug,
            name,
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
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedItems: WishlistItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        created_at: item.created_at,
        product: {
          id: item.product.id,
          slug: item.product.slug,
          name: item.product.name,
          price: item.product.price,
          originalPrice: item.product.original_price,
          images: item.product.images || [],
          rating: item.product.rating || 0,
          reviewCount: item.product.review_count || 0,
          stock: item.product.stock || 0,
          brand: item.product.brand,
          category: item.product.category,
        },
      }));

      setWishlistItems(formattedItems);
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);
      setError(err.message || 'Failed to load wishlist');
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

      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
      
      toast.success('Removed from wishlist');
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      toast.error('Failed to remove item');
    }
  };

  const removeSelectedItems = async () => {
    if (selectedItems.length === 0) return;

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      setWishlistItems(prev => 
        prev.filter(item => !selectedItems.includes(item.id))
      );
      setSelectedItems([]);
      
      toast.success(`Removed ${selectedItems.length} items from wishlist`);
    } catch (err) {
      console.error('Failed to remove selected items:', err);
      toast.error('Failed to remove items');
    }
  };

  const addToCart = async (productId: string) => {
    try {
      // In production, this would add to cart
      console.log('Add to cart:', productId);
      toast.success('Added to cart');
    } catch (err) {
      console.error('Failed to add to cart:', err);
      toast.error('Failed to add to cart');
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    if (selectedItems.length === wishlistItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(wishlistItems.map(item => item.id));
    }
  };

  const shareWishlist = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user.id;
      
      if (userId) {
        const shareUrl = `${window.location.origin}/wishlist/${userId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Wishlist link copied to clipboard');
      }
    } catch (err) {
      console.error('Failed to share wishlist:', err);
      toast.error('Failed to share wishlist');
    }
  };

  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Loading wishlist..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <Button variant="primary" onClick={fetchWishlist}>
          Try Again
        </Button>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Your wishlist is empty
        </h3>
        <p className="text-gray-600 mb-6">
          Save items you love to your wishlist
        </p>
        <Button variant="primary" href="/shop">
          Start Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedItems.length === wishlistItems.length && wishlistItems.length > 0}
                onChange={selectAllItems}
                className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">
                Select all ({wishlistItems.length} items)
              </span>
            </label>
            
            {selectedItems.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={removeSelectedItems}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Selected
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={shareWishlist}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Wishlist
            </Button>
          </div>
        </div>
      </div>

      {/* Wishlist Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-600">Select</span>
                </label>
                
                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </button>
              </div>
            </div>

            {/* Product Image */}
            <a href={`/product/${item.product.slug}`} className="block">
              <div className="relative aspect-square bg-gray-100">
                {item.product.images[0] && (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
            </a>

            {/* Product Info */}
            <div className="p-4">
              <a 
                href={`/product/${item.product.slug}`}
                className="block mb-2"
              >
                <h3 className="font-medium text-gray-900 hover:text-red-600 transition-colors line-clamp-2">
                  {item.product.name}
                </h3>
              </a>
              
              {item.product.brand && (
                <a
                  href={`/brands/${item.product.brand.slug}`}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors mb-2 inline-block"
                >
                  {item.product.brand.name}
                </a>
              )}

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-3">
                <Rating value={item.product.rating} />
                <span className="text-sm text-gray-500">
                  ({item.product.reviewCount})
                </span>
              </div>

              {/* Price */}
              <div className="mb-4">
                <PriceDisplay
                  price={item.product.price}
                  originalPrice={item.product.originalPrice}
                  currency="KES"
                />
              </div>

              {/* Stock Status */}
              <div className="mb-4">
                {item.product.stock > 10 ? (
                  <span className="text-sm text-green-600">In stock</span>
                ) : item.product.stock > 0 ? (
                  <span className="text-sm text-yellow-600">
                    Only {item.product.stock} left
                  </span>
                ) : (
                  <span className="text-sm text-red-600">Out of stock</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => addToCart(item.product.id)}
                  disabled={item.product.stock === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                >
                  <a href={`/product/${item.product.slug}`}>
                    <Eye className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Added Date */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Added {new Date(item.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600">
              {wishlistItems.length} items in your wishlist
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={selectAllItems}>
              {selectedItems.length === wishlistItems.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedItems.length > 0 && (
              <Button variant="primary" onClick={removeSelectedItems}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Selected
              </Button>
            )}
            <Button variant="primary" href="/shop">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
