'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useWishlist() {
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Load from localStorage for guest users
        const localWishlist = localStorage.getItem('xarastore-wishlist');
        if (localWishlist) {
          setWishlistItems(JSON.parse(localWishlist));
        }
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', session.user.id);

      if (error) throw error;

      setWishlistItems(data.map(item => item.product_id));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWishlist = async (productId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Store in localStorage for guest users
        const newWishlist = [...new Set([...wishlistItems, productId])];
        localStorage.setItem('xarastore-wishlist', JSON.stringify(newWishlist));
        setWishlistItems(newWishlist);
        return;
      }

      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: session.user.id,
          product_id: productId,
        });

      if (error) throw error;

      setWishlistItems(prev => [...prev, productId]);

      // Log analytics
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          data: {
            category: 'user',
            action: 'add_to_wishlist',
            label: productId,
          },
        }),
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Remove from localStorage for guest users
        const newWishlist = wishlistItems.filter(id => id !== productId);
        localStorage.setItem('xarastore-wishlist', JSON.stringify(newWishlist));
        setWishlistItems(newWishlist);
        return;
      }

      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', session.user.id)
        .eq('product_id', productId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(id => id !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.includes(productId);
  };

  return {
    wishlistItems,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  };
}
