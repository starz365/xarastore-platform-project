'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Grid, List, Filter, Heart, Share2, Calendar, Tag, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface WardrobeItem {
  id: string;
  name: string;
  type: string;
  occasion: string[];
  image: string;
  products: any[];
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

export default function WardrobePage() {
  const router = useRouter();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    occasion: [] as string[],
    description: '',
  });

  const occasions = [
    'Work', 'Casual', 'Formal', 'Party', 'Wedding', 'Date Night', 'Travel', 'Sports', 'Beach', 'Winter'
  ];

  const clothingTypes = [
    'Top', 'Bottom', 'Dress', 'Outerwear', 'Footwear', 'Accessories', 'Set', 'Other'
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadWardrobe();
    }
  }, [user, selectedOccasion]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/account/wardrobe');
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadWardrobe = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('wardrobe')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedOccasion !== 'all') {
        query = query.contains('occasion', [selectedOccasion]);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWardrobe(data || []);
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
      toast.error('Failed to load wardrobe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOccasionToggle = (occasion: string) => {
    setFormData(prev => ({
      ...prev,
      occasion: prev.occasion.includes(occasion)
        ? prev.occasion.filter(o => o !== occasion)
        : [...prev.occasion, occasion],
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.type) {
      toast.error('Please select a clothing type');
      return false;
    }
    if (formData.occasion.length === 0) {
      toast.error('Please select at least one occasion');
      return false;
    }
    return true;
  };

  const handleCreateWardrobe = async () => {
    if (!validateForm()) return;

    try {
      const { error } = await supabase
        .from('wardrobe')
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          occasion: formData.occasion,
          description: formData.description,
          image: 'https://via.placeholder.com/300x400?text=Wardrobe+Item',
          products: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Wardrobe item created successfully');
      setShowCreateForm(false);
      resetForm();
      loadWardrobe();
    } catch (error) {
      console.error('Failed to create wardrobe item:', error);
      toast.error('Failed to create wardrobe item');
    }
  };

  const deleteWardrobeItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this wardrobe item?')) return;

    try {
      const { error } = await supabase
        .from('wardrobe')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Wardrobe item deleted');
      loadWardrobe();
    } catch (error) {
      console.error('Failed to delete wardrobe item:', error);
      toast.error('Failed to delete wardrobe item');
    }
  };

  const shareWardrobeItem = async (item: WardrobeItem) => {
    try {
      const shareData = {
        title: `My ${item.name} - Xarastore Wardrobe`,
        text: `Check out my ${item.name} in my Xarastore wardrobe!`,
        url: `${window.location.origin}/account/wardrobe/${item.id}`,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const downloadWardrobe = async () => {
    // In production, generate and download wardrobe PDF
    toast.info('Wardrobe download feature coming soon!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      occasion: [],
      description: '',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="space-y-8">
            <div className="h-12 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
    </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wardrobe</h1>
            <p className="text-gray-600 mt-2">
              Organize your favorite items and create outfits
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={downloadWardrobe}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                >
                  <option value="all">All Occasions</option>
                  {occasions.map((occasion) => (
                    <option key={occasion} value={occasion}>{occasion}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {wardrobe.length} item{wardrobe.length !== 1 ? 's' : ''} in wardrobe
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add to Wardrobe</h2>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  placeholder="e.g., Black Dress, Summer Outfit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clothing Type *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {clothingTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleInputChange('type', type)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        formData.type === type
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occasions *
                </label>
                <div className="flex flex-wrap gap-2">
                  {occasions.map((occasion) => (
                    <button
                      key={occasion}
                      type="button"
                      onClick={() => handleOccasionToggle(occasion)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        formData.occasion.includes(occasion)
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {occasion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none min-h-[100px]"
                  placeholder="Describe this item or outfit..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateWardrobe}>
                  Save to Wardrobe
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Wardrobe Grid */}
        {wardrobe.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {wardrobe.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Image */}
                <div className={`${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-[3/4]'}`}>
                  <div className="w-full h-full bg-gray-100 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={() => shareWardrobeItem(item)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                        aria-label="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWardrobeItem(item.id)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-sm text-gray-500 capitalize">{item.type}</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {item.description || 'No description'}
                  </p>

                  {/* Occasions */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Occasions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.occasion.slice(0, 3).map((occ) => (
                        <span
                          key={occ}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          {occ}
                        </span>
                      ))}
                      {item.occasion.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{item.occasion.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Tag className="w-4 h-4" />
                      <span>{item.products?.length || 0} linked items</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Heart className="w-4 h-4 mr-1" />
                        Like
                      </Button>
                      <Button variant="secondary" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Your wardrobe is empty
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start building your personal wardrobe by adding items you love or outfits you want to save.
            </p>
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Item
            </Button>
          </div>
        )}

        {/* Wardrobe Stats */}
        {wardrobe.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-6">Wardrobe Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{wardrobe.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {new Set(wardrobe.flatMap(item => item.occasion)).size}
                </div>
                <div className="text-sm text-gray-600">Unique Occasions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {new Set(wardrobe.map(item => item.type)).size}
                </div>
                <div className="text-sm text-gray-600">Item Types</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {wardrobe.reduce((sum, item) => sum + (item.products?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Linked Products</div>
              </div>
            </div>
          </div>
        )}

        {/* Wardrobe Tips */}
        <div className="mt-8 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Wardrobe Tips</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👕</span>
              </div>
              <h3 className="font-semibold mb-2">Organize by Occasion</h3>
              <p className="text-sm opacity-90">
                Tag items with occasions to easily find what to wear for any event
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="font-semibold mb-2">Create Outfits</h3>
              <p className="text-sm opacity-90">
                Combine multiple items to save complete outfits for quick reference
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🛍️</span>
              </div>
              <h3 className="font-semibold mb-2">Shop Smart</h3>
              <p className="text-sm opacity-90">
                Link products to easily re-order or find similar items
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
