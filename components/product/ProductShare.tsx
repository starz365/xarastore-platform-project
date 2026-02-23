'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Link, 
  Mail, 
  MessageCircle,
  Copy,
  Check,
  Whatsapp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ProductShareProps {
  productId: string;
  productName: string;
  productImage?: string;
  productPrice?: number;
  productUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'dropdown';
}

export function ProductShare({
  productId,
  productName,
  productImage = '',
  productPrice,
  productUrl,
  className,
  size = 'md',
  variant = 'button',
}: ProductShareProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentUrl = productUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = `Check out ${productName} on Xarastore! ${productPrice ? `KES ${productPrice.toLocaleString('en-KE')}` : ''}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(currentUrl);

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      action: () => copyToClipboard(),
    },
    {
      name: 'WhatsApp',
      icon: Whatsapp,
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
      action: () => shareOnWhatsApp(),
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      action: () => shareOnFacebook(),
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
      action: () => shareOnTwitter(),
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-red-100 text-red-700 hover:bg-red-200',
      action: () => shareViaEmail(),
    },
    {
      name: 'SMS',
      icon: MessageCircle,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      action: () => shareViaSMS(),
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current && 
        !shareMenuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showSuccessToast('Link copied to clipboard!');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      showSuccessToast('Link copied to clipboard!');
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    window.open(url, '_blank', 'width=600,height=400');
    trackShare('facebook');
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    window.open(url, '_blank', 'width=600,height=400');
    trackShare('twitter');
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    window.open(url, '_blank', 'width=600,height=400');
    trackShare('whatsapp');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out ${productName} on Xarastore`);
    const body = encodeURIComponent(`${shareText}\n\n${currentUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackShare('email');
  };

  const shareViaSMS = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = `sms:?body=${encodedText}%20${encodedUrl}`;
    } else {
      window.open(`sms:?body=${encodedText}%20${encodedUrl}`, '_blank');
    }
    trackShare('sms');
  };

  const shareViaWebShare = () => {
    if (navigator.share) {
      navigator.share({
        title: productName,
        text: shareText,
        url: currentUrl,
      })
      .then(() => trackShare('native'))
      .catch(error => {
        console.log('Error sharing:', error);
        // Fallback to custom share menu
        setShowShareMenu(true);
      });
    } else {
      setShowShareMenu(true);
    }
  };

  const trackShare = (platform: string) => {
    // Track share event for analytics
    console.log(`Shared on ${platform}: ${productId}`);
    
    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: 'product',
        item_id: productId,
      });
    }
  };

  const showSuccessToast = (message: string) => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const sizeClasses = {
    sm: {
      icon: 'w-4 h-4',
      button: 'px-3 py-1.5 text-sm',
      menu: 'w-48',
    },
    md: {
      icon: 'w-5 h-5',
      button: 'px-4 py-2 text-sm',
      menu: 'w-56',
    },
    lg: {
      icon: 'w-6 h-6',
      button: 'px-6 py-3 text-base',
      menu: 'w-64',
    },
  };

  const currentSize = sizeClasses[size];

  const renderButton = () => (
    <Button
      ref={buttonRef}
      variant="secondary"
      size={size}
      onClick={shareViaWebShare}
      className={cn(
        variant === 'button' && 'w-full justify-center',
        className
      )}
    >
      <Share2 className={cn(currentSize.icon, variant === 'button' && 'mr-2')} />
      {variant === 'button' && 'Share'}
    </Button>
  );

  const renderIcon = () => (
    <button
      ref={buttonRef}
      onClick={shareViaWebShare}
      className={cn(
        'p-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        className
      )}
      aria-label="Share product"
    >
      <Share2 className={currentSize.icon} />
    </button>
  );

  const renderDropdown = () => (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowShareMenu(!showShareMenu)}
        className={cn(
          'flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg',
          'bg-white hover:bg-gray-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
          currentSize.button,
          className
        )}
      >
        <Share2 className={cn(currentSize.icon, 'mr-2')} />
        Share
      </button>
    </div>
  );

  return (
    <div className="relative">
      {variant === 'icon' && renderIcon()}
      {variant === 'button' && renderButton()}
      {variant === 'dropdown' && renderDropdown()}

      {/* Share Menu */}
      {showShareMenu && (
        <div
          ref={shareMenuRef}
          className={cn(
            'absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2',
            currentSize.menu,
            variant === 'dropdown' ? 'left-0' : 'right-0'
          )}
          style={{
            top: '100%',
          }}
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Share this product</p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 p-3">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={option.action}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg transition-colors',
                    option.color
                  )}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <span className="text-xs font-medium">{option.name}</span>
                </button>
              );
            })}
          </div>
          
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-600 truncate block">{currentUrl}</span>
              </div>
              <button
                onClick={copyToClipboard}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              <span>Link copied to clipboard!</span>
            </div>
          </div>
        </div>
      )}

      {/* Share Statistics (hidden by default) */}
      <div className="hidden">
        <div className="text-xs text-gray-500 mt-2">
          <span id="share-count">0</span> shares
        </div>
      </div>
    </div>
  );
}

// QR Code sharing component
export function ProductQRCode({ url, size = 128 }: { url: string; size?: number }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Generate QR code URL using a QR code service
    const encodedUrl = encodeURIComponent(url);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&format=svg`;
    setQrCodeUrl(qrUrl);
  }, [url, size]);

  if (!qrCodeUrl) return null;

  return (
    <div className="text-center">
      <img
        src={qrCodeUrl}
        alt="QR Code"
        className="mx-auto border border-gray-200 rounded-lg"
        width={size}
        height={size}
      />
      <p className="text-sm text-gray-600 mt-2">
        Scan to view product
      </p>
    </div>
  );
}

// Social share counts component
export function ProductShareStats({ productId }: { productId: string }) {
  const [stats, setStats] = useState({
    total: 0,
    facebook: 0,
    twitter: 0,
    whatsapp: 0,
  });

  useEffect(() => {
    // Fetch share statistics from API
    const fetchStats = async () => {
      try {
        // In production, this would call your analytics API
        // For now, return mock data
        setStats({
          total: 124,
          facebook: 45,
          twitter: 32,
          whatsapp: 47,
        });
      } catch (error) {
        console.error('Error fetching share stats:', error);
      }
    };

    fetchStats();
  }, [productId]);

  if (stats.total === 0) return null;

  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <div className="flex items-center space-x-1">
        <Share2 className="w-4 h-4" />
        <span>{stats.total} shares</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Facebook className="w-4 h-4 text-blue-600" />
          <span>{stats.facebook}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Twitter className="w-4 h-4 text-sky-500" />
          <span>{stats.twitter}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Whatsapp className="w-4 h-4 text-green-600" />
          <span>{stats.whatsapp}</span>
        </div>
      </div>
    </div>
  );
}
