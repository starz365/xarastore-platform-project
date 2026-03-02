'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, CheckCircle, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Container } from '@/components/layout/Container';
import { cn } from '@/lib/utils/cn';
import { logger } from '@/lib/utils/logger';

interface NewsletterSectionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'hero' | 'sidebar';
  onSubscribe?: (email: string) => Promise<void>;
  showName?: boolean;
  consentText?: string;
  successMessage?: string;
  errorMessage?: string;
  backgroundImage?: string;
  theme?: 'light' | 'dark' | 'brand';
}

interface SubscriptionState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  email?: string;
}

export function NewsletterSection({
  title = 'Stay Updated',
  description = 'Subscribe to our newsletter for exclusive deals, new arrivals, and special offers.',
  buttonText = 'Subscribe',
  placeholder = 'Enter your email address',
  className,
  variant = 'default',
  onSubscribe,
  showName = false,
  consentText = 'I agree to receive marketing emails and accept the privacy policy.',
  successMessage = 'Thanks for subscribing! Check your inbox for confirmation.',
  errorMessage = 'Something went wrong. Please try again.',
  backgroundImage,
  theme = 'brand',
}: NewsletterSectionProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    status: 'idle',
  });
  const [isVisible, setIsVisible] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email format
  const validateEmail = useCallback((email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }, []);

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  // Handle subscription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate consent
    if (!consent) {
      setSubscriptionState({
        status: 'error',
        message: 'Please accept the privacy policy to subscribe.',
      });
      return;
    }

    setSubscriptionState({ status: 'loading' });

    try {
      if (onSubscribe) {
        // Use custom subscription handler
        await onSubscribe(email);
      } else {
        // Default subscription handler
        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name: showName ? name : undefined,
            source: window.location.pathname,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Subscription failed');
        }
      }

      setSubscriptionState({
        status: 'success',
        message: successMessage,
        email,
      });

      // Log successful subscription
      logger.info('Newsletter subscription successful', { 
        email: email.substring(0, 3) + '***' // Privacy-safe logging
      });

      // Reset form
      setEmail('');
      setName('');
      setConsent(false);
    } catch (error) {
      logger.error('Newsletter subscription failed', { error });
      
      setSubscriptionState({
        status: 'error',
        message: errorMessage,
      });
    }
  };

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (subscriptionState.status === 'success') {
      const timer = setTimeout(() => {
        setSubscriptionState({ status: 'idle' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [subscriptionState.status]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  // Theme classes
  const themeClasses = {
    light: {
      container: 'bg-white border border-gray-200',
      title: 'text-gray-900',
      description: 'text-gray-600',
      icon: 'text-gray-400',
      input: 'border-gray-300 focus:border-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    dark: {
      container: 'bg-gray-900 border border-gray-800',
      title: 'text-white',
      description: 'text-gray-300',
      icon: 'text-gray-600',
      input: 'bg-gray-800 border-gray-700 text-white focus:border-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    brand: {
      container: 'bg-gradient-to-br from-red-600 to-red-800 text-white border-0',
      title: 'text-white',
      description: 'text-red-100',
      icon: 'text-red-200',
      input: 'bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:border-white',
      button: 'bg-white text-red-600 hover:bg-gray-100',
    },
  };

  // Variant classes
  const variantClasses = {
    default: 'rounded-2xl shadow-xl p-8 md:p-12',
    compact: 'rounded-xl shadow-lg p-6',
    hero: 'rounded-none shadow-2xl p-12 md:p-16',
    sidebar: 'rounded-lg shadow-md p-4',
  };

  // Don't render if dismissed
  if (!isVisible) return null;

  if (variant === 'sidebar') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Newsletter</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">{description}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder={placeholder}
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              disabled={subscriptionState.status === 'loading'}
              className="text-sm"
            />

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="consent-sidebar"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="consent-sidebar" className="text-xs text-gray-500">
                {consentText}
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={subscriptionState.status === 'loading'}
              className="w-full"
            >
              {subscriptionState.status === 'loading' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Subscribing...
                </span>
              ) : (
                buttonText
              )}
            </Button>
          </form>

          {/* Status messages */}
          <AnimatePresence>
            {subscriptionState.status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2"
              >
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-green-700">{subscriptionState.message}</span>
              </motion.div>
            )}

            {subscriptionState.status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-700">{subscriptionState.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        backgroundImage && 'bg-cover bg-center',
        className
      )}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {/* Background overlay for image */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className={cn(
            themeClasses[theme].container,
            variantClasses[variant],
            'relative z-10'
          )}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 bg-red-100/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Sparkles className={cn('w-4 h-4', themeClasses[theme].icon)} />
                <span className={cn('text-sm font-medium', themeClasses[theme].description)}>
                  EXCLUSIVE OFFERS
                </span>
              </motion.div>

              <motion.h2
                variants={itemVariants}
                className={cn(
                  'text-3xl md:text-4xl font-bold mb-4',
                  themeClasses[theme].title
                )}
              >
                {title}
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className={cn('text-lg mb-6 max-w-lg mx-auto lg:mx-0', themeClasses[theme].description)}
              >
                {description}
              </motion.p>

              {/* Benefits */}
              <motion.ul
                variants={itemVariants}
                className="space-y-2 text-left max-w-md mx-auto lg:mx-0"
              >
                <li className="flex items-center space-x-2">
                  <CheckCircle className={cn('w-5 h-5', themeClasses[theme].icon)} />
                  <span className={cn('text-sm', themeClasses[theme].description)}>
                    10% off your first purchase
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className={cn('w-5 h-5', themeClasses[theme].icon)} />
                  <span className={cn('text-sm', themeClasses[theme].description)}>
                    Early access to sales & new arrivals
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className={cn('w-5 h-5', themeClasses[theme].icon)} />
                  <span className={cn('text-sm', themeClasses[theme].description)}>
                    Weekly curated picks just for you
                  </span>
                </li>
              </motion.ul>
            </div>

            {/* Form */}
            <motion.div variants={itemVariants} className="flex-1 w-full max-w-md">
              <form onSubmit={handleSubmit} className="space-y-4">
                {showName && (
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={subscriptionState.status === 'loading'}
                    className={themeClasses[theme].input}
                  />
                )}

                <div>
                  <Input
                    type="email"
                    placeholder={placeholder}
                    value={email}
                    onChange={handleEmailChange}
                    error={emailError}
                    disabled={subscriptionState.status === 'loading'}
                    className={themeClasses[theme].input}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="consent" className={cn('text-sm', themeClasses[theme].description)}>
                    {consentText}
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={subscriptionState.status === 'loading'}
                  className={cn('w-full group', themeClasses[theme].button)}
                >
                  {subscriptionState.status === 'loading' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Subscribing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {buttonText}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Status messages */}
              <AnimatePresence>
                {subscriptionState.status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Success!</p>
                      <p className="text-sm text-green-700">{subscriptionState.message}</p>
                    </div>
                  </motion.div>
                )}

                {subscriptionState.status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700">{subscriptionState.message}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Privacy note */}
              <p className={cn('text-xs mt-4', themeClasses[theme].description)}>
                We respect your privacy. Unsubscribe at any time.
              </p>
            </motion.div>
          </div>

          {/* Dismiss button for non-essential placements */}
          {variant !== 'hero' && (
            <button
              onClick={() => setIsVisible(false)}
              className={cn(
                'absolute top-4 right-4 p-1 rounded-full transition-colors',
                theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              )}
              aria-label="Dismiss newsletter"
            >
              <X className={cn('w-5 h-5', themeClasses[theme].icon)} />
            </button>
          )}
        </motion.div>
      </Container>
    </section>
  );
}

// Newsletter popup/modal variant
export function NewsletterPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative max-w-md w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        <NewsletterSection
          variant="compact"
          title="Don't Miss Out! 🎉"
          description="Subscribe to get 10% off your first order and exclusive deals!"
          buttonText="Get My Discount"
          className="bg-white"
        />
      </motion.div>
    </div>
  );
}

// Newsletter banner for top of page
export function NewsletterBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
      <Container>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5" />
            <p className="text-sm font-medium">
              Subscribe to our newsletter and get 10% off your first order!
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <form className="flex items-center space-x-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 text-sm h-8"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="bg-white text-red-600 hover:bg-gray-100 h-8"
              >
                Subscribe
              </Button>
            </form>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/70 hover:text-white"
              aria-label="Close banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
