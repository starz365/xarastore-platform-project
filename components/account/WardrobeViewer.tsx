'use client';

import { useState, useEffect } from 'react';
import { 
  Shirt, 
  Plus, 
  Grid, 
  List, 
  Filter,
  Search,
  Calendar,
  Tag,
  Heart,
  Share2,
  Edit3,
  Trash2,
  Download,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';
import { supabase } from '@/lib/supabase/client';

interface WardrobeItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  brand?: string;
  size?: string;
  price?: number;
  purchased_date?: string;
  images: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface WardrobeOutfit {
  id: string;
  name: string;
  description?: string;
  occasion: string;
  items: string[];
  images: string[];
  tags: string[];
  created_at: string;
}

export function WardrobeViewer() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<WardrobeOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchWardrobe();
  }, []);

  const fetchWardrobe = async () => {
    try {
      setIsLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      // Fetch wardrobe items
      const { data: itemsData } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      // Fetch outfits
      const { data: outfitsData } = await supabase
        .from('wardrobe_outfits')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      setItems(itemsData || []);
      setOutfits(outfitsData || []);
    } catch (err) {
      console.error('Failed to fetch wardrobe:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Items', count: items.length },
    { id: 'tops', name: 'Tops', count: items.filter(i => i.category === 'tops').length },
    { id: 'bottoms', name: 'Bottoms', count: items.filter(i => i.category === 'bottoms').length },
    { id: 'dresses', name: 'Dresses', count: items.filter(i => i.category === 'dresses').length },
    { id: 'outerwear', name: 'Outerwear', count: items.filter(i => i.category === 'outerwear').length },
    { id: 'shoes', name: 'Shoes', count: items.filter(i => i.category === 'shoes').length },
    { id: 'accessories', name: 'Accessories', count: items.filter(i => i.category === 'accessories').length },
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const addNewItem = () => {
    // In production, this would open a modal or form
    console.log('Add new item');
  };

  const createOutfit = () => {
    if (selectedItems.length === 0) return;
    
    // In production, this would open an outfit creation modal
    console.log('Create outfit with:', selectedItems);
  };

  const shareWardrobe = async () => {
    try {
      const shareData = {
        title: 'My Xarastore Wardrobe',
        text: `Check out my wardrobe with ${items.length} items and ${outfits.length} outfits!`,
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Wardrobe link copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to share wardrobe:', err);
    }
  };

  const exportWardrobe = () => {
    const wardrobeData = {
      items,
      outfits,
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      totalOutfits: outfits.length,
    };

    const dataStr = JSON.stringify(wardrobeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `xarastore-wardrobe-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Loading your wardrobe..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Wardrobe</h1>
            <p className="text-gray-600">
              {items.length} items • {outfits.length} outfits
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={shareWardrobe}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="secondary" onClick={exportWardrobe}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="primary" onClick={addNewItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search items, tags, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none bg-white"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                aria-label="Grid view"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Outfits Section */}
      {outfits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">My Outfits</h2>
            <Button variant="link" href="/account/wardrobe/outfits">
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.slice(0, 3).map(outfit => (
              <div
                key={outfit.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {outfit.images[0] && (
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={outfit.images[0]}
                      alt={outfit.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{outfit.name}</h3>
                      <p className="text-sm text-gray-600">{outfit.occasion}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 hover:bg-gray-100 rounded-full">
                        <Edit3 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded-full">
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {outfit.items.length} items
                      </span>
                      <span className="flex items-center text-sm text-gray-600">
                        <Heart className="w-4 h-4 mr-1" />
                        12
                      </span>
                    </div>
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Grid/List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedCategory === 'all' ? 'All Items' : 
              categories.find(c => c.id === selectedCategory)?.name}
            <span className="text-gray-600 text-lg font-normal ml-2">
              ({filteredItems.length})
            </span>
          </h2>
          
          {selectedItems.length > 0 && (
            <Button variant="primary" onClick={createOutfit}>
              <Plus className="w-4 h-4 mr-2" />
              Create Outfit ({selectedItems.length})
            </Button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Shirt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try a different search term' : 'Add items to your wardrobe'}
            </p>
            <Button variant="primary" onClick={addNewItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Item
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                  selectedItems.includes(item.id) ? 'border-red-600 ring-2 ring-red-600/20' : 'border-gray-200'
                }`}
                onClick={() => {
                  setSelectedItems(prev =>
                    prev.includes(item.id)
                      ? prev.filter(id => id !== item.id)
                      : [...prev, item.id]
                  );
                }}
              >
                {/* Item Image */}
                <div className="aspect-square bg-gray-100 relative">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shirt className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 right-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedItems.includes(item.id)
                        ? 'bg-red-600 text-white'
                        : 'bg-white/90 text-gray-400'
                    }`}>
                      {selectedItems.includes(item.id) ? '✓' : ''}
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                      {item.category}
                    </span>
                  </div>
                </div>
                
                {/* Item Info */}
                <div className="p-3">
                  <h4 className="font-medium text-gray-900 truncate mb-1">
                    {item.name}
                  </h4>
                  {item.brand && (
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {item.brand}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {item.color && (
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-600">{item.color}</span>
                      </div>
                    )}
                    
                    {item.price && (
                      <span className="text-sm font-semibold">
                        KES {item.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-400">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={() => {
                        if (selectedItems.length === filteredItems.length) {
                          setSelectedItems([]);
                        } else {
                          setSelectedItems(filteredItems.map(item => item.id));
                        }
                      }}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Color</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Brand</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date Added</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => {
                          setSelectedItems(prev =>
                            prev.includes(item.id)
                              ? prev.filter(id => id !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {item.images[0] && (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 truncate max-w-xs">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="capitalize">{item.color}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {item.brand || '-'}
                    </td>
                    <td className="py-4 px-4">
                      {new Date(item.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Edit3 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shirt className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-sm text-gray-600">Total Items</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Tag className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Array.from(new Set(items.flatMap(i => i.tags))).length}
          </p>
          <p className="text-sm text-gray-600">Unique Tags</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{outfits.length}</p>
          <p className="text-sm text-gray-600">Outfits</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {items.filter(i => i.images.length > 0).length}
          </p>
          <p className="text-sm text-gray-600">Items with Photos</p>
        </div>
      </div>
    </div>
  );
}
