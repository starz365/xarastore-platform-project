'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface ProductWishlistButtonProps {
  productId: string;
  productName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'full';
  className?: string;
  onAddToWishlist?: () => void;
  onRemoveFromWishlist?: () => void;
}

export function ProductWishlistButton({
  productId,
  productName,
  size = 'md',
  variant = 'icon',
  className,
  onAddToWishlist,
  onRemoveFromWishlist,
}: ProductWishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkWishlistStatus();
  }, [productId]);

  const checkWishlistStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthChecked(true);
      
      if (!session) {
        // Check localStorage for guest wishlist
        const guestWishlist = JSON.parse(localStorage.getItem('xarastore-guest-wishlist') || '[]');
        setIsWishlisted(guestWishlist.includes(productId));
        return;
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setIsWishlisted(!!data);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleWishlistToggle = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Handle guest wishlist
        const guestWishlist = JSON.parse(localStorage.getItem('xarastore-guest-wishlist') || '[]');
        
        if (isWishlisted) {
          const updated = guestWishlist.filter((id: string) => id !== productId);
          localStorage.setItem('xarastore-guest-wishlist', JSON.stringify(updated));
          setIsWishlisted(false);
          onRemoveFromWishlist?.();
          
          toast.info('Removed from wishlist', {
            description: `Sign in to sync your wishlist across devices`,
          });
        } else {
          const updated = [...guestWishlist, productId];
          localStorage.setItem('xarastore-guest-wishlist', JSON.stringify(updated));
          setIsWishlisted(true);
          onAddToWishlist?.();
          
          toast.success('Added to wishlist!', {
            description: `Sign in to sync your wishlist across devices`,
          });
        }
        
        setLoading(false);
        return;
      }

      if (isWishlisted) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId);

        if (error) throw error;

        setIsWishlisted(false);
        onRemoveFromWishlist?.();
        
        toast.success('Removed from wishlist');
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: session.user.id,
            product_id: productId,
          });

        if (error) throw error;

        setIsWishlisted(true);
        onAddToWishlist?.();
        
        toast.success('Added to wishlist!', {
          description: `${productName} added to your wishlist`,
        });
      }

      // Update wishlist count in real-time
      window.dispatchEvent(new CustomEvent('wishlist-updated'));
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      
      toast.error('Failed to update wishlist', {
        description: 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: {
      icon: 'w-4 h-4',
      button: 'p-2',
      text: 'text-sm',
    },
    md: {
      icon: 'w-5 h-5',
      button: 'p-2.5',
      text: 'text-base',
    },
    lg: {
      icon: 'w-6 h-6',
      button: 'p-3',
      text: 'text-lg',
    },
  };

  const variantClasses = {
    icon: 'rounded-full',
    text: 'rounded-lg px-4 py-2',
    full: 'rounded-lg px-4 py-2 w-full justify-center',
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      onClick={handleWishlistToggle}
      disabled={loading || !authChecked}
      className={cn(
        'flex items-center justify-center transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        isWishlisted
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
        variantClasses[variant],
        currentSize.button,
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={isWishlisted ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
    >
      <Heart
        className={cn(
          currentSize.icon,
          isWishlisted && 'fill-current',
          variant !== 'icon' && 'mr-2'
        )}
      />
      
      {variant !== 'icon' && (
        <span className={cn('font-medium', currentSize.text)}>
          {loading ? (
            '...'
          ) : isWishlisted ? (
            'Saved'
          ) : (
            'Save'
          )}
        </span>
      )}
      
      {loading && (
        <div className="ml-2">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </button>
  );
}

// Wishlist count badge component
export function WishlistCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          const guestWishlist = JSON.parse(localStorage.getItem('xarastore-guest-wishlist') || '[]');
          setCount(guestWishlist.length);
          return;
        }

        const { count, error } = await supabase
          .from('wishlist')
          .select('id', { count: 'exact' })
          .eq('user_id', session.user.id);

        if (error) throw error;

        setCount(count || 0);
      } catch (error) {
        console.error('Error fetching wishlist count:', error);
      }
    };

    updateCount();

    // Listen for wishlist updates
    const handleWishlistUpdate = () => updateCount();
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    
    // Also check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      updateCount();
    });

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      subscription.unsubscribe();
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-xs rounded-full flex items-center justify-center px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}
