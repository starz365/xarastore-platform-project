'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Search, Clock, Filter, X, PieChart, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SearchAnalyticsProps {
  timeRange?: 'day' | 'week' | 'month' | 'year';
  onTimeRangeChange?: (range: 'day' | 'week' | 'month' | 'year') => void;
}

export function SearchAnalytics({ timeRange = 'week', onTimeRangeChange }: SearchAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState({
    totalSearches: 0,
    uniqueSearches: 0,
    popularQueries: [] as Array<{ query: string; count: number; conversionRate: number }>,
    searchCategories: [] as Array<{ category: string; count: number; percentage: number }>,
    searchTrends: [] as Array<{ date: string; searches: number }>,
    searchPerformance: {
      avgResults: 0,
      avgTimeSpent: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    },
    searchIssues: {
      zeroResultQueries: [] as string[],
      lowCTRQueries: [] as string[],
    },
  });

  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchAnalyticsData(timeRange);
  }, [timeRange]);

  const fetchAnalyticsData = async (range: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search/analytics?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch search analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'home', name: 'Home & Garden' },
    { id: 'beauty', name: 'Beauty' },
    { id: 'sports', name: 'Sports' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Search Analytics</h2>
            <p className="text-sm text-gray-600">Insights into search behavior and performance</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange?.(range.value as any)}
                className={`px-3 py-2 text-sm ${
                  timeRange === range.value
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Searches</span>
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analyticsData.totalSearches.toLocaleString()}
          </div>
          <div className="text-sm text-green-600 mt-1">
            +12% from last period
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Unique Queries</span>
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analyticsData.uniqueSearches.toLocaleString()}
          </div>
          <div className="text-sm text-green-600 mt-1">
            +8% from last period
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg. Results</span>
            <PieChart className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(analyticsData.searchPerformance.avgResults).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">per search</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Click-Through Rate</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(analyticsData.searchPerformance.clickThroughRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-600 mt-1">
            +2.4% from last period
          </div>
        </div>
      </div>

      {/* Popular Queries */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Top Search Queries</h3>
            </div>
            <span className="text-sm text-gray-600">
              {timeRange === 'day' ? 'Today' : `This ${timeRange}`}
            </span>
          </div>

          <div className="space-y-4">
            {analyticsData.popularQueries.slice(0, 5).map((query, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-gray-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{query.query}</div>
                    <div className="text-sm text-gray-600">
                      {query.count.toLocaleString()} searches • {(query.conversionRate * 100).toFixed(1)}% conversion
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>

          {analyticsData.popularQueries.length > 5 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button variant="secondary" className="w-full">
                View All Queries
              </Button>
            </div>
          )}
        </div>

        {/* Search Categories */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Search by Category</h3>
            </div>
            <span className="text-sm text-gray-600">Distribution</span>
          </div>

          <div className="space-y-4">
            {analyticsData.searchCategories.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{category.category}</span>
                  <span className="text-sm text-gray-600">{category.count.toLocaleString()} searches</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <div className="text-right text-sm text-gray-600 mt-1">
                  {category.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Trends Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-gray-900">Search Trends</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Searches</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Clicks</span>
            </div>
          </div>
        </div>

        <div className="h-64 flex items-end space-x-1">
          {analyticsData.searchTrends.map((trend, index) => {
            const maxSearches = Math.max(...analyticsData.searchTrends.map(t => t.searches));
            const height = (trend.searches / maxSearches) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="flex items-end space-x-1 mb-2">
                  <div
                    className="w-6 bg-red-600 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 -rotate-45 origin-top-left h-8">
                  {trend.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Issues */}
      {(analyticsData.searchIssues.zeroResultQueries.length > 0 ||
        analyticsData.searchIssues.lowCTRQueries.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Zero Results */}
          {analyticsData.searchIssues.zeroResultQueries.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <X className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-yellow-900">Zero Result Queries</h3>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  {analyticsData.searchIssues.zeroResultQueries.length}
                </span>
              </div>

              <div className="space-y-3">
                {analyticsData.searchIssues.zeroResultQueries.slice(0, 3).map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="font-medium">{query}</span>
                    <Button variant="ghost" size="sm">
                      Add products
                    </Button>
                  </div>
                ))}
              </div>

              {analyticsData.searchIssues.zeroResultQueries.length > 3 && (
                <div className="mt-4">
                  <Button variant="secondary" className="w-full">
                    View All Issues
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Low CTR */}
          {analyticsData.searchIssues.lowCTRQueries.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-900">Low CTR Queries</h3>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  {analyticsData.searchIssues.lowCTRQueries.length}
                </span>
              </div>

              <div className="space-y-3">
                {analyticsData.searchIssues.lowCTRQueries.slice(0, 3).map((query, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg">
                    <div className="font-medium mb-2">{query}</div>
                    <div className="text-sm text-gray-600">
                      CTR: <span className="font-medium">{(analyticsData.searchPerformance.clickThroughRate * 100).toFixed(1)}%</span>
                      <span className="mx-2">•</span>
                      Needs optimization
                    </div>
                  </div>
                ))}
              </div>

              {analyticsData.searchIssues.lowCTRQueries.length > 3 && (
                <div className="mt-4">
                  <Button variant="secondary" className="w-full">
                    Optimize All
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Search Optimization Recommendations</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Improve Search Synonyms</h4>
                <p className="text-sm text-gray-600">Add common misspellings and synonyms</p>
              </div>
            </div>
            <Button size="sm">Add Synonyms</Button>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Optimize Filters</h4>
                <p className="text-sm text-gray-600">Improve filter accuracy and relevance</p>
              </div>
            </div>
            <Button size="sm">Review Filters</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
