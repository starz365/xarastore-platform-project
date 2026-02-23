'use client';

import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Link as LinkIcon, 
  Mail, 
  Whatsapp,
  Share2
} from 'lucide-react';
import { useState } from 'react';

interface ShareButtonsProps {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  className?: string;
}

export function ShareButtons({ 
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = document.title,
  description = '',
  image = '',
  className = ''
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    title,
    text: description,
    url,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`,
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {navigator.share && (
        <button
          onClick={handleNativeShare}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Share using device"
        >
          <Share2 className="w-5 h-5" />
        </button>
      )}

      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
        aria-label="Share on Twitter"
      >
        <Twitter className="w-5 h-5" />
      </a>

      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-5 h-5" />
      </a>

      <a
        href={shareLinks.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-full transition-colors"
        aria-label="Share on WhatsApp"
      >
        <Whatsapp className="w-5 h-5" />
      </a>

      <button
        onClick={handleCopyLink}
        className={`p-2 rounded-full transition-colors ${
          copied 
            ? 'bg-green-50 text-green-600' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        }`}
        aria-label={copied ? 'Link copied' : 'Copy link'}
      >
        {copied ? (
          <span className="w-5 h-5 flex items-center justify-center">✓</span>
        ) : (
          <LinkIcon className="w-5 h-5" />
        )}
      </button>

      <a
        href={shareLinks.email}
        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
        aria-label="Share via email"
      >
        <Mail className="w-5 h-5" />
      </a>
    </div>
  );
}
