'use client';

import { useState, useEffect } from 'react';
import { Clock, Trash2, Search, X, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SearchHistoryProps {
  onSearchSelect: (query: string) => void;
  onClearHistory: () => void;
}

export function SearchHistory({ onSearchSelect, onClearHistory }: SearchHistoryProps) {
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    timestamp: number;
    count: number;
    results?: number;
  }>>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<{
    totalSearches: number;
    popularSearches: Array<{ query: string; count: number }>;
    searchFrequency: Record<string, number>;
  }>({
    totalSearches: 0,
    popularSearches: [],
    searchFrequency: {},
  });

  useEffect(() => {
    loadSearchHistory();
    loadSearchAnalytics();
  }, []);

  const loadSearchHistory = () => {
    try {
      const saved = localStorage.getItem('xarastore-search-history');
      if (saved) {
        const history = JSON.parse(saved);
        setSearchHistory(history);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadSearchAnalytics = async () => {
    try {
      // In production, this would fetch from an analytics API
      const response = await fetch('/api/search/analytics');
      if (response.ok) {
        const data = await response.json();
        setSearchAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load search analytics:', error);
    }
  };

  const handleSearchClick = (query: string) => {
    // Update search count
    const updatedHistory = searchHistory.map(item =>
      item.query === query
        ? { ...item, count: item.count + 1, timestamp: Date.now() }
        : item
    ).sort((a, b) => b.timestamp - a.timestamp);

    setSearchHistory(updatedHistory);
    localStorage.setItem('xarastore-search-history', JSON.stringify(updatedHistory));
    
    onSearchSelect(query);
  };

  const handleRemoveSearch = (query: string) => {
    const updatedHistory = searchHistory.filter(item => item.query !== query);
    setSearchHistory(updatedHistory);
    localStorage.setItem('xarastore-search-history', JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('xarastore-search-history');
    onClearHistory();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  if (searchHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Search History</h3>
        <p className="text-gray-600 mb-6">
          Your search history will appear here as you browse Xarastore.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Try searching for:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Smartphone', 'Laptop', 'Headphones', 'Shoes'].map((term) => (
              <button
                key={term}
                onClick={() => handleSearchClick(term)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">Search History</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {searchHistory.length} searches
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>

      {/* Search History List */}
      <div className="space-y-3">
        {searchHistory.slice(0, 10).map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 group transition-all"
          >
            <button
              onClick={() => handleSearchClick(item.query)}
              className="flex items-center space-x-3 flex-1 text-left"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-red-100">
                <Search className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-red-600">
                  {item.query}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>{formatTimeAgo(item.timestamp)}</span>
                  {item.results && (
                    <>
                      <span>•</span>
                      <span>{item.results.toLocaleString()} results</span>
                    </>
                  )}
                  {item.count > 1 && (
                    <>
                      <span>•</span>
                      <span>Searched {item.count} times</span>
                    </>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => handleRemoveSearch(item.query)}
              className="p-2 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Search Analytics */}
      {searchAnalytics.popularSearches.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <h4 className="font-bold text-gray-900">Your Search Patterns</h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Most Searched */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-600" />
                <span className="font-medium">Most Searched</span>
              </div>
              <div className="space-y-2">
                {searchAnalytics.popularSearches.slice(0, 3).map((search, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <button
                      onClick={() => handleSearchClick(search.query)}
                      className="text-gray-900 hover:text-red-600"
                    >
                      {search.query}
                    </button>
                    <span className="text-sm text-gray-500">{search.count} times</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="font-medium">Search Statistics</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Searches</span>
                  <span className="font-medium">{searchAnalytics.totalSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unique Searches</span>
                  <span className="font-medium">{searchHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Active Day</span>
                  <span className="font-medium">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Search className="w-3 h-3 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Improve Your Search</h4>
            <p className="text-sm text-blue-700 mt-1">
              Use specific keywords, check spelling, and try different combinations 
              to find exactly what you're looking for.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Your search history is stored locally and never shared. 
          <button
            onClick={handleClearHistory}
            className="text-red-600 hover:text-red-700 ml-1"
          >
            Clear history anytime.
          </button>
        </p>
      </div>
    </div>
  );
}
