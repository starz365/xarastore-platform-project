'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  CreditCard,
  Key,
  Settings,
  AlertTriangle,
  Bell,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Globe,
  Mail,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  LogOut,
  Clock,
  Calendar,
  Fingerprint,
} from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { QRCode } from '@/components/ui/QRCode';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

// ---------- Type Definitions ---------- //

interface UserData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastLoginIp: string;
  lastLoginUserAgent: string;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  lastTriggered: string | null;
  enabled: boolean;
}

// ---------- Skeleton Loader Component ---------- //

const ProfileSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="w-32 h-32 rounded-full mx-auto" />
    <Skeleton className="w-48 h-6 mx-auto" />
    <Skeleton className="w-full h-6" />
    <Skeleton className="w-full h-6" />
  </div>
);

// ---------- Main Profile Client ---------- //

export default function ProfileClient() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  // ---------- State Management ---------- //
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState({
    marketing: true,
    security: true,
    billing: true,
    updates: false,
  });

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    avatar: null as File | null,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState({
    profile: false,
    password: false,
    twoFA: false,
    apiKey: false,
  });

  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQRCode, setTwoFAQRCode] = useState('');
  const [twoFAVerificationCode, setTwoFAVerificationCode] = useState('');
  const [newApiKey, setNewApiKey] = useState<{ key: string; id: string } | null>(null);

  // ---------- Session & Data Fetch ---------- //
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/auth/login?redirect=/account/profile');
      return;
    }

    if (session) fetchAllUserData();
  }, [session, sessionLoading]);

  const fetchAllUserData = async () => {
    setIsLoading(true);
    try {
      const [
        userRes,
        sessionsRes,
        apiKeysRes,
        invoicesRes,
        webhooksRes,
        preferencesRes,
      ] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/sessions'),
        fetch('/api/user/api-keys'),
        fetch('/api/user/invoices'),
        fetch('/api/user/webhooks'),
        fetch('/api/user/preferences'),
      ]);

      if (!userRes.ok) throw new Error('Failed to fetch profile data');
      const userJson: UserData = await userRes.json();
      setUserData(userJson);
      setProfileForm({
        fullName: userJson.fullName,
        email: userJson.email,
        avatar: null,
      });

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (apiKeysRes.ok) setApiKeys(await apiKeysRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (webhooksRes.ok) setWebhooks(await webhooksRes.json());
      if (preferencesRes.ok) {
        const prefs = await preferencesRes.json();
        setTheme(prefs.theme);
        setNotifications(prefs.notifications);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load profile data', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Profile Update ---------- //
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(prev => ({ ...prev, profile: true }));
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('fullName', profileForm.fullName);
      formData.append('email', profileForm.email);
      if (profileForm.avatar) formData.append('avatar', profileForm.avatar);

      const res = await fetch('/api/user/profile', { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.message || 'Profile update failed');
      }

      setUserData(prev => ({ ...prev!, ...data.user }));
      toast({ title: 'Success', description: 'Profile updated', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update profile', variant: 'error' });
    } finally {
      setFormLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // ---------- Password Update ---------- //
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(prev => ({ ...prev, password: true }));
    setErrors({});

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      setFormLoading(prev => ({ ...prev, password: false }));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters' });
      setFormLoading(prev => ({ ...prev, password: false }));
      return;
    }

    try {
      const res = await fetch('/api/user/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password change failed');

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Success', description: 'Password updated', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to change password', variant: 'error' });
    } finally {
      setFormLoading(prev => ({ ...prev, password: false }));
    }
  };

  // ---------- 2FA Handlers ---------- //
  const handleEnable2FA = async () => {
    setFormLoading(prev => ({ ...prev, twoFA: true }));
    try {
      const res = await fetch('/api/user/security/2fa/enable', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to enable 2FA');

      setTwoFASecret(data.secret);
      setTwoFAQRCode(data.qrCode);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to enable 2FA', variant: 'error' });
    } finally {
      setFormLoading(prev => ({ ...prev, twoFA: false }));
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Disable 2FA?')) return;
    try {
      const res = await fetch('/api/user/security/2fa/disable', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to disable 2FA');
      }
      setUserData(prev => ({ ...prev!, twoFactorEnabled: false }));
      toast({ title: 'Success', description: '2FA disabled', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to disable 2FA', variant: 'error' });
    }
  };

  // ---------- Theme & Notification ---------- //
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    try {
      await fetch('/api/user/preferences/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update theme', variant: 'error' });
    }
  };

  const handleUpdateNotification = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await fetch('/api/user/preferences/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      setNotifications(notifications);
      toast({ title: 'Error', description: 'Failed to update notifications', variant: 'error' });
    }
  };

  // ---------- Data Export ---------- //
  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/data/export');
      if (!res.ok) throw new Error('Failed to export data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xarastore-data-${new Date().toISOString()}.zip`;
      a.click();
      toast({ title: 'Success', description: 'Download started', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'error' });
    }
  };

  // ---------- Render ---------- //
  if (isLoading || !userData) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-responsive max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account, security, and preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <TabsTrigger value="overview"><User className="w-4 h-4 mr-2" /> Overview</TabsTrigger>
            <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" /> Security</TabsTrigger>
            <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-2" /> Billing</TabsTrigger>
            <TabsTrigger value="api"><Key className="w-4 h-4 mr-2" /> API</TabsTrigger>
            <TabsTrigger value="preferences"><Settings className="w-4 h-4 mr-2" /> Preferences</TabsTrigger>
            <TabsTrigger value="danger" className="text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4 mr-2" /> Danger</TabsTrigger>
          </TabsList>

          {/* Tabs content placeholders */}
          <TabsContent value="overview">{/* ...Overview content (Profile + Account Details) ... */}</TabsContent>
          <TabsContent value="security">{/* ...Security content (Password + 2FA + Sessions) ... */}</TabsContent>
          <TabsContent value="billing">{/* ...Billing content (Plans + Invoices) ... */}</TabsContent>
          <TabsContent value="api">{/* ...API content (Keys + Webhooks) ... */}</TabsContent>
          <TabsContent value="preferences">{/* ...Preferences content (Theme + Notifications + Export Data) ... */}</TabsContent>
          <TabsContent value="danger">{/* ...Danger content (Delete Account) ... */}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
