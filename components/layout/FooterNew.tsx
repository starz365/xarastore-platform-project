import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Heart, Mail, Phone, MapPin } from 'lucide-react';
import { AppStoreBadges } from '@/components/shared/AppStoreBadges';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Shop: [
      { name: 'All Products', href: '/shop' },
      { name: 'New Arrivals', href: '/shop?sort=newest' },
      { name: 'Best Sellers', href: '/shop?sort=popular' },
      { name: 'Deals', href: '/deals' },
      { name: 'Brands', href: '/brands' },
    ],
    Help: [
      { name: 'Track Order', href: '/track-order' },
      { name: 'FAQs', href: '/help/faq' },
      { name: 'Shipping Info', href: '/help/shipping' },
      { name: 'Returns & Exchanges', href: '/help/returns' },
      { name: 'Contact Us', href: '/help/contact' },
    ],
    Company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Sustainability', href: '/sustainability' },
      { name: 'Affiliate Program', href: '/affiliate' },
    ],
    Legal: [
      { name: 'Terms of Service', href: '/legal/terms' },
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Cookie Policy', href: '/legal/cookies' },
      { name: 'Accessibility', href: '/legal/accessibility' },
      { name: 'Sitemap', href: '/sitemap.xml' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/xarastore', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/xarastore', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/xarastore', label: 'Instagram' },
    { icon: Youtube, href: 'https://youtube.com/xarastore', label: 'YouTube' },
  ];

  const contactInfo = [
    { icon: Phone, text: '+254 700 123 456', href: 'tel:+254700123456' },
    { icon: Mail, text: 'support@xarastore.com', href: 'mailto:support@xarastore.com' },
    { icon: MapPin, text: 'Nairobi, Kenya', href: 'https://maps.google.com/?q=Nairobi+Kenya' },
  ];

  const paymentMethods = [
    '/images/payments/visa.svg',
    '/images/payments/mastercard.svg',
    '/images/payments/amex.svg',
    '/images/payments/mpesa.svg',
    '/images/payments/paypal.svg',
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-responsive">
        {/* Main Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 py-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Xarastore</h2>
                <p className="text-sm">it's a deal</p>
              </div>
            </Link>
            
            <p className="mb-6 max-w-md">
              Kenya's fastest-growing online marketplace. Discover amazing deals on electronics, 
              fashion, home goods, and more.
            </p>
            
            <div className="space-y-4 mb-8">
              <h3 className="text-white font-semibold">Download Our App</h3>
              <AppStoreBadges />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Contact Info</h3>
              <div className="space-y-3">
                {contactInfo.map((item) => (
                  <a
                    key={item.text}
                    href={item.href}
                    className="flex items-center space-x-3 hover:text-white transition-colors"
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.text}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Bottom Footer */}
        <div className="py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm">
                © {currentYear} Xarastore. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Made with <Heart className="w-3 h-3 inline text-red-500" /> in Kenya
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <span className="text-sm">Follow us:</span>
              <div className="flex items-center space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center space-x-3">
              <span className="text-sm">We accept:</span>
              <div className="flex items-center space-x-2">
                {paymentMethods.map((method, index) => (
                  <div
                    key={index}
                    className="w-8 h-6 bg-gray-800 rounded flex items-center justify-center"
                  >
                    <div className="text-xs font-medium">Pay</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Seals */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-8 pt-8 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">SSL Secured</div>
              <div className="w-16 h-8 bg-green-600 rounded flex items-center justify-center mx-auto">
                <span className="text-white text-xs font-bold">HTTPS</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Safe Payment</div>
              <div className="w-16 h-8 bg-blue-600 rounded flex items-center justify-center mx-auto">
                <span className="text-white text-xs font-bold">PCI DSS</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Data Protected</div>
              <div className="w-16 h-8 bg-purple-600 rounded flex items-center justify-center mx-auto">
                <span className="text-white text-xs font-bold">GDPR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
