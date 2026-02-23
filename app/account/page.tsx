'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: 0,
    wishlist: 0,
    addresses: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchUserStats();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      const { data: wishlist } = await supabase
        .from('wishlist')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      const { data: addresses } = await supabase
        .from('user_addresses')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      setStats({
        orders: orders?.length || 0,
        wishlist: wishlist?.length || 0,
        addresses: addresses?.length || 0,
        pendingOrders: 0, // You'd calculate this from orders
      });
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return <AccountSkeleton />;
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    {
      title: 'My Orders',
      description: 'View and track your orders',
      icon: Package,
      count: stats.orders,
      href: '/account/orders',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Wishlist',
      description: 'Your saved items',
      icon: Heart,
      count: stats.wishlist,
      href: '/account/wishlist',
      color: 'bg-red-100 text-red-600',
    },
    {
      title: 'My Wardrobe',
      description: 'Your saved outfits',
      icon: User,
      count: 0,
      href: '/account/wardrobe',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Addresses',
      description: 'Manage delivery addresses',
      icon: MapPin,
      count: stats.addresses,
      href: '/account/addresses',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Payment Methods',
      description: 'Manage saved payment methods',
      icon: CreditCard,
      count: 0,
      href: '/account/payments',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Account Settings',
      description: 'Update your profile and preferences',
      icon: Settings,
      href: '/account/profile',
      color: 'bg-gray-100 text-gray-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h1>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">
                    Member since {new Date(user.created_at).getFullYear()}
                  </span>
                  <span className="flex items-center text-sm text-green-600">
                    <Shield className="w-4 h-4 mr-1" />
                    Verified
                  </span>
                </div>
              </div>
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{stats.orders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wishlist Items</p>
                <p className="text-2xl font-bold mt-1">{stats.wishlist}</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saved Addresses</p>
                <p className="text-2xl font-bold mt-1">{stats.addresses}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.title}
                href={item.href}
                className="group block bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`${item.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                        {item.count}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {stats.orders > 0 ? (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Order #ORD-2023-001</p>
                    <p className="text-sm text-gray-600">Delivered 2 days ago</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  Track
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No recent activity</p>
                <Button variant="primary" className="mt-4" href="/shop">
                  Start Shopping
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        <div className="space-y-8">
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
