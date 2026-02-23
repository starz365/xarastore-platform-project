'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Package, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SearchSuggestionsProps {
  query: string;
  onSuggestionSelect: (suggestion: string) => void;
  onTrendingSelect: (trend: string) => void;
  onRecentSelect: (recent: string) => void;
}

export function SearchSuggestions({
  query,
  onSuggestionSelect,
  onTrendingSelect,
  onRecentSelect,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([
    'Smartphone',
    'Laptop',
    'Headphones',
    'Smart Watch',
    'Shoes',
    'T-shirt',
    'Sunglasses',
    'Backpack',
  ]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularCategories, setPopularCategories] = useState<
    { name: string; count: number; icon: string }[]
  >([
    { name: 'Electronics', count: 1240, icon: '💻' },
    { name: 'Fashion', count: 856, icon: '👕' },
    { name: 'Home & Garden', count: 720, icon: '🏠' },
    { name: 'Beauty', count: 430, icon: '💄' },
  ]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('xarastore-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }

    // Fetch trending searches from API
    fetchTrendingSearches();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    // Debounce the search suggestions
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchTrendingSearches = async () => {
    try {
      const response = await fetch('/api/search/trending');
      if (response.ok) {
        const data = await response.json();
        setTrendingSearches(data.trending || trendingSearches);
      }
    } catch (error) {
      console.error('Failed to fetch trending searches:', error);
    }
  };

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleRecentSearchRemove = (searchToRemove: string) => {
    const updated = recentSearches.filter(s => s !== searchToRemove);
    setRecentSearches(updated);
    localStorage.setItem('xarastore-recent-searches', JSON.stringify(updated));
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('xarastore-recent-searches');
  };

  const saveToRecentSearches = (search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('xarastore-recent-searches', JSON.stringify(updated));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-h-[500px] overflow-y-auto">
      {/* Recent Searches */}
      {recentSearches.length > 0 && !query && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Recent Searches</span>
            </div>
            <button
              onClick={handleClearRecentSearches}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center justify-between group p-2 rounded-lg hover:bg-gray-50"
              >
                <button
                  onClick={() => {
                    saveToRecentSearches(search);
                    onRecentSelect(search);
                  }}
                  className="flex items-center space-x-3 flex-1 text-left"
                >
                  <Clock className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-gray-900 group-hover:text-red-600">{search}</span>
                </button>
                <button
                  onClick={() => handleRecentSearchRemove(search)}
                  className="p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove search"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {!query && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span className="font-medium text-gray-900">Trending Now</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((trend, index) => (
              <button
                key={index}
                onClick={() => {
                  saveToRecentSearches(trend);
                  onTrendingSelect(trend);
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-700 rounded-full text-sm transition-colors"
              >
                {trend}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      {query && suggestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Search className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">Suggestions for "{query}"</span>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  saveToRecentSearches(suggestion);
                  onSuggestionSelect(suggestion);
                }}
                className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-50 text-left"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Categories */}
      {!query && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Package className="w-4 h-4 text-red-600" />
            <span className="font-medium text-gray-900">Popular Categories</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {popularCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => onSuggestionSelect(category.name)}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-red-600">
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500">{category.count} products</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Deals & Offers */}
      {!query && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Tag className="w-4 h-4 text-red-600" />
            <span className="font-medium text-gray-900">Top Deals</span>
          </div>
          <div className="space-y-2">
            {[
              'Up to 60% off on Electronics',
              'Buy 1 Get 1 Free on Fashion',
              'Free Delivery over KES 2,000',
              'Flash Sale: Today Only',
            ].map((deal, index) => (
              <button
                key={index}
                onClick={() => onSuggestionSelect(deal)}
                className="flex items-center space-x-3 w-full p-3 bg-red-50 hover:bg-red-100 rounded-lg text-left group"
              >
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Tag className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-red-900">{deal}</div>
                  <div className="text-xs text-red-700">Limited time offer</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">Search Tips:</div>
          <ul className="space-y-1">
            <li>• Use specific keywords (e.g., "iPhone 15 Pro Max")</li>
            <li>• Try brand names (e.g., "Samsung", "Nike")</li>
            <li>• Use filters to narrow down results</li>
            <li>• Check spelling or try similar terms</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
