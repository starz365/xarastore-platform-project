'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  DollarSign,
  TrendingUp,
  Users,
  BarChart,
  ShoppingBag,
  AlertCircle,
  Upload,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

export default function SellerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    visitors: 0,
  });

  useEffect(() => {
    checkAuth();
    loadSellerStats();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/seller/dashboard');
        return;
      }
      
      // Check if user is a seller
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!seller) {
        router.push('/sell/onboarding');
        return;
      }

      setUser({ ...session.user, seller });
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSellerStats = async () => {
    try {
      // This would typically fetch from API
      // For now, using mock data
      setStats({
        totalProducts: 24,
        activeProducts: 18,
        totalSales: 156,
        totalRevenue: 1250000,
        pendingOrders: 8,
        visitors: 1245,
      });
    } catch (error) {
      console.error('Failed to load seller stats:', error);
    }
  };

  const recentOrders = [
    {
      id: 'ORD-2023-001',
      customer: 'John Doe',
      amount: 'KES 25,500',
      status: 'processing',
      date: '2023-12-15',
    },
    {
      id: 'ORD-2023-002',
      customer: 'Jane Smith',
      amount: 'KES 12,800',
      status: 'shipped',
      date: '2023-12-14',
    },
    {
      id: 'ORD-2023-003',
      customer: 'Mike Johnson',
      amount: 'KES 8,400',
      status: 'delivered',
      date: '2023-12-13',
    },
  ];

  const quickActions = [
    {
      icon: Upload,
      title: 'Add New Product',
      description: 'Upload new products to your store',
      href: '/seller/products/new',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: BarChart,
      title: 'View Analytics',
      description: 'Check your sales and performance',
      href: '/seller/analytics',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Settings,
      title: 'Store Settings',
      description: 'Manage your store preferences',
      href: '/seller/settings',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: DollarSign,
      title: 'Withdraw Earnings',
      description: 'Transfer funds to your account',
      href: '/seller/withdraw',
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-responsive py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.seller?.store_name || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="secondary">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="primary">
                <Upload className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold mt-1">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold mt-1">{stats.activeProducts}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold mt-1">{stats.totalSales}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">KES {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Store Visitors</p>
                <p className="text-2xl font-bold mt-1">{stats.visitors}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className="group flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                    >
                      <div className={`${action.color} p-3 rounded-lg mr-4`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-red-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Recent Orders</h2>
                <Button variant="link" href="/seller/orders">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{order.id}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Customer: {order.customer}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{order.amount}</p>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {order.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Performance Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Performance Summary</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                    <span className="font-semibold">3.2%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '3.2%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Customer Rating</span>
                    <span className="font-semibold">4.8 ★</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Order Completion</span>
                    <span className="font-semibold">98%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Store Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Store Verified</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Verified ✓
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Payment Method</span>
                  <span className="text-sm font-medium">M-Pesa</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Next Payout</span>
                  <span className="text-sm font-medium">KES 45,200</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Payout Date</span>
                  <span className="text-sm font-medium">Dec 31, 2023</span>
                </div>
              </div>
              <Button variant="primary" className="w-full mt-6">
                View Earnings
              </Button>
            </div>

            {/* Tips & Updates */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-lg mb-4">Tips & Updates</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs mr-3 flex-shrink-0">
                    1
                  </div>
                  <span className="text-sm">Optimize your product titles for better search results</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs mr-3 flex-shrink-0">
                    2
                  </div>
                  <span className="text-sm">Add high-quality images to increase conversions</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs mr-3 flex-shrink-0">
                    3
                  </div>
                  <span className="text-sm">Holiday season sale starts next week</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
