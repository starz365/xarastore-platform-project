'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { searchProducts } from '@/lib/supabase/queries/products';
import { Product } from '@/types';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Button } from '@/components/ui/Button';

interface SearchBarProps {
  onClose?: () => void;
  className?: string;
}

export function SearchBar({ onClose, className = '' }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([
    'Smartphone',
    'Laptop',
    'Headphones',
    'Smart Watch',
    'Shoes',
    'T-shirt',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('xarastore-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const { products } = await searchProducts(debouncedQuery, {}, 1, 5);
        setSuggestions(products);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSearch = useCallback((searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery),
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('xarastore-recent-searches', JSON.stringify(updated));

    // Navigate to search results
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setShowSuggestions(false);
    onClose?.();
  }, [query, recentSearches, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      onClose?.();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (product: Product) => {
    router.push(`/product/${product.slug}`);
    setShowSuggestions(false);
    onClose?.();
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm);
    handleSearch(searchTerm);
  };

  const handleTrendingSearchClick = (trend: string) => {
    setQuery(trend);
    handleSearch(trend);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for products, brands, or categories..."
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all outline-none"
          autoComplete="off"
          aria-label="Search"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <Clock className="w-4 h-4 mr-2" />
                <span>Recent Searches</span>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleRecentSearchClick(search)}
                    className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-50 text-left"
                  >
                    <span>{search}</span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {!query && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>Trending Now</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((trend) => (
                  <button
                    key={trend}
                    onClick={() => handleTrendingSearchClick(trend)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <>
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Searching...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-3">
                    {suggestions.length} results for "{query}"
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSuggestionClick(product)}
                        className="flex items-center space-x-3 w-full p-2 rounded hover:bg-gray-50 text-left"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {product.images[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            <span className="font-bold text-red-600">
                              KES {product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && (
                              <span className="ml-2 text-gray-400 line-through">
                                KES {product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => handleSearch()}
                    >
                      View All Results
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No results found for "{query}"</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try different keywords or browse categories
                  </p>
                </div>
              )}
            </>
          )}

          {/* Popular Categories */}
          <div className="p-4 bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-600 mb-3">Popular Categories</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Electronics', href: '/category/electronics' },
                { name: 'Fashion', href: '/category/fashion' },
                { name: 'Home & Garden', href: '/category/home-garden' },
                { name: 'Beauty', href: '/category/beauty' },
              ].map((category) => (
                <a
                  key={category.name}
                  href={category.href}
                  className="px-3 py-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded text-sm text-center transition-colors"
                  onClick={() => setShowSuggestions(false)}
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
