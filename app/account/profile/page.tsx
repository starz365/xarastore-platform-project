'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Camera,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface ProfileData {
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData>({
    email: '',
    full_name: '',
    phone: '',
    avatar_url: '',
    created_at: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });
      setAvatarPreview(data.avatar_url || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File too large', {
          description: 'Please select an image under 5MB.',
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File, userId: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const errors = [];

    if (formData.full_name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    if (formData.phone.trim() && !/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      errors.push('Please enter a valid phone number');
    }

    if (errors.length > 0) {
      toast.error('Validation Error', {
        description: errors.join(', '),
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    try {
      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          avatar_url: avatarUrl,
        },
      });

      // Refresh profile data
      await loadProfile(user.id);
      setIsEditing(false);
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error('Update Failed', {
        description: error.message || 'Please try again.',
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
    });
    setAvatarFile(null);
    setAvatarPreview(profile.avatar_url || '');
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-8">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your personal information and account settings
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Profile Header */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt={profile.full_name || 'Profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-red-100 flex items-center justify-center">
                          <User className="w-12 h-12 text-red-600" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 p-2 bg-red-600 text-white rounded-full cursor-pointer hover:bg-red-700 transition-colors">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profile.full_name || 'Your Name'}
                    </h2>
                    <p className="text-gray-600">{profile.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Verified Account</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {isEditing ? (
                    <>
                      <Button variant="secondary" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleSubmit}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-8">
              <form className="space-y-6">
                {/* Email (Read-only) */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Address
                  </label>
                  <Input
                    value={profile.email}
                    readOnly
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {profile.full_name || 'Not set'}
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="0712 345 678"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {profile.phone || 'Not set'}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    For delivery notifications and M-Pesa payments
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Member Since
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {formatDate(profile.created_at)}
                  </div>
                </div>

                {/* User ID */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 mr-2" />
                    User ID
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <code className="text-sm text-gray-600">{user.id}</code>
                  </div>
                </div>
              </form>
            </div>

            {/* Account Actions */}
            <div className="p-8 border-t border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4">Account Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="secondary" asChild>
                  <a href="/account/password">Change Password</a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href="/account/privacy">Privacy Settings</a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href="/account/notifications">Notification Preferences</a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href="/account/delete">Delete Account</a>
                </Button>
              </div>
            </div>
          </div>

          {/* Security Tips */}
          <div className="mt-8 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6">Security Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Strong Password</h4>
                <p className="text-sm opacity-90">
                  Use a unique password with letters, numbers, and symbols
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Secure Email</h4>
                <p className="text-sm opacity-90">
                  Keep your email account secure with 2FA enabled
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Phone Verification</h4>
                <p className="text-sm opacity-90">
                  Add your phone number for account recovery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
