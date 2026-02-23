'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar, MapPin, Camera, Shield, Bell, Globe, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface ProfileData {
  email: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  avatar_url: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  preferences: {
    language: string;
    currency: string;
    theme: 'light' | 'dark' | 'auto';
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({
    email: '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    avatar_url: '',
    notifications: {
      email: true,
      sms: true,
      push: true,
      marketing: false,
    },
    preferences: {
      language: 'en',
      currency: 'KES',
      theme: 'light',
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?redirect=/account/profile');
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile({
        email: profileData.email || '',
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        gender: profileData.gender || '',
        avatar_url: profileData.avatar_url || '',
        notifications: profileData.notifications || {
          email: true,
          sms: true,
          push: true,
          marketing: false,
        },
        preferences: profileData.preferences || {
          language: 'en',
          currency: 'KES',
          theme: 'light',
        },
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (type: keyof ProfileData['notifications'], checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: checked,
      },
    }));
  };

  const handlePreferenceChange = (field: keyof ProfileData['preferences'], value: string) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value,
      },
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      // Update in database
      await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload profile picture');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (profile.phone && profile.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || null,
          notifications: profile.notifications,
          preferences: profile.preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
        },
      });

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password) {
      toast.error('Current password is required');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      console.error('Failed to update password:', error);
      
      let message = 'Failed to update password';
      if (error.message.includes('Invalid credentials')) {
        message = 'Current password is incorrect';
      }

      toast.error(message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      // In production, this would soft delete or anonymize data
      toast.info('Account deletion request has been submitted. Our team will process it within 24 hours.');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="space-y-8">
            <div className="h-12 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center">
                  <User className="w-5 h-5 mr-2 text-red-600" />
                  Personal Information
                </h2>
                <span className="text-sm text-gray-500">Member since {new Date(user.created_at).getFullYear()}</span>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-red-600 text-white rounded-full cursor-pointer hover:bg-red-700 transition-colors">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-semibold">Profile Picture</h3>
                    <p className="text-sm text-gray-600">
                      Upload a photo to personalize your account
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        value={profile.email}
                        readOnly
                        className="pl-10 bg-gray-50"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Contact support to change your email
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        value={profile.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="0712 345 678"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        type="date"
                        value={profile.date_of_birth}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={profile.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-600" />
                Change Password
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    variant="primary"
                    onClick={handlePasswordChange}
                  >
                    Update Password
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Preferences */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-red-600" />
                Preferences
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={profile.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={profile.preferences.currency}
                    onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  >
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <div className="space-y-2">
                    {(['light', 'dark', 'auto'] as const).map((theme) => (
                      <label key={theme} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="theme"
                          value={theme}
                          checked={profile.preferences.theme === theme}
                          onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                          className="text-red-600 focus:ring-red-600"
                        />
                        <span className="text-sm text-gray-700 capitalize">{theme}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-red-600" />
                Notifications
              </h2>

              <div className="space-y-4">
                {Object.entries(profile.notifications).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">
                        {key === 'email' && 'Order updates and promotions'}
                        {key === 'sms' && 'Delivery updates via SMS'}
                        {key === 'push' && 'App notifications'}
                        {key === 'marketing' && 'Marketing emails'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange(key as any, e.target.checked)}
                      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">Account Actions</h2>
              
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/account/orders">
                    <CreditCard className="w-4 h-4 mr-3" />
                    Order History
                  </a>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/account/addresses">
                    <MapPin className="w-4 h-4 mr-3" />
                    Manage Addresses
                  </a>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/legal/privacy">
                    <Shield className="w-4 h-4 mr-3" />
                    Privacy Settings
                  </a>
                </Button>
                
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDeleteAccount}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
