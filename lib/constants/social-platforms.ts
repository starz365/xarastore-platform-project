export const socialPlatforms = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    url: 'https://facebook.com/xarastore',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php?u=',
    isEnabled: true,
    sortOrder: 1,
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    url: 'https://twitter.com/xarastore',
    shareUrl: 'https://twitter.com/intent/tweet?url=',
    isEnabled: true,
    sortOrder: 2,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    url: 'https://instagram.com/xarastore',
    shareUrl: 'https://www.instagram.com/',
    isEnabled: true,
    sortOrder: 3,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    url: 'https://wa.me/254700000000',
    shareUrl: 'https://wa.me/?text=',
    isEnabled: true,
    sortOrder: 4,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    url: 'https://youtube.com/xarastore',
    shareUrl: 'https://www.youtube.com/',
    isEnabled: true,
    sortOrder: 5,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    url: 'https://linkedin.com/company/xarastore',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/?url=',
    isEnabled: true,
    sortOrder: 6,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    url: 'https://tiktok.com/@xarastore',
    shareUrl: 'https://www.tiktok.com/',
    isEnabled: true,
    sortOrder: 7,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#E60023',
    url: 'https://pinterest.com/xarastore',
    shareUrl: 'https://pinterest.com/pin/create/button/?url=',
    isEnabled: true,
    sortOrder: 8,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'telegram',
    color: '#0088CC',
    url: 'https://t.me/xarastore',
    shareUrl: 'https://t.me/share/url?url=',
    isEnabled: true,
    sortOrder: 9,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    url: 'https://reddit.com/r/xarastore',
    shareUrl: 'https://reddit.com/submit?url=',
    isEnabled: true,
    sortOrder: 10,
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: 'snapchat',
    color: '#FFFC00',
    url: 'https://snapchat.com/add/xarastore',
    shareUrl: 'https://www.snapchat.com/',
    isEnabled: true,
    sortOrder: 11,
  },
] as const;

export type SocialPlatformId = typeof socialPlatforms[number]['id'];

export const socialPlatformMap = socialPlatforms.reduce((acc, platform) => {
  acc[platform.id] = platform;
  return acc;
}, {} as Record<SocialPlatformId, typeof socialPlatforms[number]>);

export function getEnabledSocialPlatforms() {
  return socialPlatforms.filter(platform => platform.isEnabled);
}

export function getShareUrl(platformId: SocialPlatformId, url: string, text?: string): string {
  const platform = socialPlatformMap[platformId];
  if (!platform) return url;
  
  const encodedUrl = encodeURIComponent(url);
  const encodedText = text ? encodeURIComponent(text) : '';
  
  switch (platformId) {
    case 'facebook':
      return `${platform.shareUrl}${encodedUrl}`;
    case 'twitter':
      return `${platform.shareUrl}${encodedUrl}&text=${encodedText}`;
    case 'whatsapp':
      return `${platform.shareUrl}${encodedText}%20${encodedUrl}`;
    case 'linkedin':
      return `${platform.shareUrl}${encodedUrl}`;
    case 'pinterest':
      return `${platform.shareUrl}${encodedUrl}&description=${encodedText}`;
    case 'telegram':
      return `${platform.shareUrl}${encodedUrl}&text=${encodedText}`;
    case 'reddit':
      return `${platform.shareUrl}${encodedUrl}&title=${encodedText}`;
    default:
      return platform.url;
  }
}

export const socialLoginProviders = [
  {
    id: 'google',
    name: 'Google',
    icon: 'google',
    color: '#4285F4',
    scopes: ['email', 'profile'],
    isEnabled: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    scopes: ['email', 'public_profile'],
    isEnabled: true,
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: 'apple',
    color: '#000000',
    scopes: ['email', 'name'],
    isEnabled: true,
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    scopes: ['tweet.read', 'users.read'],
    isEnabled: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    color: '#181717',
    scopes: ['user:email', 'read:user'],
    isEnabled: true,
  },
] as const;

export type SocialLoginProviderId = typeof socialLoginProviders[number]['id'];

export const socialLoginProviderMap = socialLoginProviders.reduce((acc, provider) => {
  acc[provider.id] = provider;
  return acc;
}, {} as Record<SocialLoginProviderId, typeof socialLoginProviders[number]>);

export function getEnabledSocialLoginProviders() {
  return socialLoginProviders.filter(provider => provider.isEnabled);
}

export const socialMetrics = {
  facebook: {
    followers: 125000,
    engagementRate: 4.2,
    growthRate: 2.1,
  },
  twitter: {
    followers: 89000,
    engagementRate: 3.8,
    growthRate: 1.8,
  },
  instagram: {
    followers: 215000,
    engagementRate: 5.6,
    growthRate: 3.2,
  },
  youtube: {
    subscribers: 45000,
    views: 1250000,
    growthRate: 2.5,
  },
  tiktok: {
    followers: 185000,
    likes: 3200000,
    growthRate: 8.5,
  },
} as const;

export function getSocialMetrics(platformId: SocialPlatformId) {
  return socialMetrics[platformId as keyof typeof socialMetrics] || null;
}

export const socialContentTypes = {
  facebook: ['post', 'video', 'story', 'reel'],
  twitter: ['tweet', 'thread', 'poll', 'space'],
  instagram: ['post', 'story', 'reel', 'live'],
  youtube: ['video', 'short', 'live'],
  tiktok: ['video', 'live'],
  linkedin: ['post', 'article', 'video'],
  pinterest: ['pin', 'board'],
} as const;

export function getContentTypes(platformId: SocialPlatformId) {
  return socialContentTypes[platformId as keyof typeof socialContentTypes] || [];
}

export const socialScheduling = {
  facebook: {
    bestTimes: ['09:00', '13:00', '19:00'],
    maxPostsPerDay: 3,
    optimalLength: 200,
  },
  twitter: {
    bestTimes: ['08:00', '12:00', '16:00', '20:00'],
    maxPostsPerDay: 5,
    optimalLength: 280,
  },
  instagram: {
    bestTimes: ['11:00', '15:00', '19:00'],
    maxPostsPerDay: 2,
    optimalLength: 150,
  },
  linkedin: {
    bestTimes: ['08:00', '12:00', '17:00'],
    maxPostsPerDay: 1,
    optimalLength: 300,
  },
} as const;

export function getSchedulingInfo(platformId: SocialPlatformId) {
  return socialScheduling[platformId as keyof typeof socialScheduling] || null;
}
