import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Shield, Truck, CreditCard, RefreshCw } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    shop: [
      { name: 'All Categories', href: '/shop' },
      { name: 'New Arrivals', href: '/shop?sort=newest' },
      { name: 'Best Sellers', href: '/shop?sort=popular' },
      { name: 'Deals', href: '/deals' },
      { name: 'Flash Sales', href: '/deals/flash' },
    ],
    help: [
      { name: 'Help Center', href: '/help' },
      { name: 'Track Your Order', href: '/account/orders' },
      { name: 'Returns & Refunds', href: '/help/returns' },
      { name: 'Shipping Info', href: '/help/shipping' },
      { name: 'FAQs', href: '/help/faq' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Blog', href: '/blog' },
      { name: 'Affiliate Program', href: '/affiliate' },
    ],
    legal: [
      { name: 'Terms of Service', href: '/legal/terms' },
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Cookie Policy', href: '/legal/cookies' },
      { name: 'Copyright Policy', href: '/legal/copyright' },
      { name: 'Payment Policy', href: '/legal/payment' },
    ],
  };

  const paymentMethods = [
    { name: 'Visa', icon: '💳' },
    { name: 'Mastercard', icon: '💳' },
    { name: 'M-Pesa', icon: '📱' },
    { name: 'PayPal', icon: '💰' },
    { name: 'Bank Transfer', icon: '🏦' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Trust Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container-responsive">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Truck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Free Delivery</h4>
                <p className="text-sm">Over KES 2,000</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Secure Payment</h4>
                <p className="text-sm">100% Protected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Best Price</h4>
                <p className="text-sm">Guaranteed</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Easy Returns</h4>
                <p className="text-sm">30 Days Policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-responsive py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">X</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Xarastore</h2>
                <p className="text-sm text-gray-400">it's a deal</p>
              </div>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Kenya's fastest-growing online marketplace. Discover amazing products at unbeatable prices. Shop electronics, fashion, home goods, and more.
            </p>
            
            {/* Newsletter */}
            <div className="mb-8">
              <h3 className="text-white font-semibold mb-3">Stay Updated</h3>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:border-red-500"
                />
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-r-lg transition-colors">
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Subscribe for exclusive deals and updates</p>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-white font-semibold mb-3">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="https://facebook.com/xarastore" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://twitter.com/xarastore" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://instagram.com/xarastore" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://youtube.com/xarastore" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Help & Support</h3>
            <ul className="space-y-2">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="text-white font-medium">Call Us</h4>
                <p className="text-gray-400">+254 700 000 000</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="text-white font-medium">Email Us</h4>
                <p className="text-gray-400">support@xarastore.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="text-white font-medium">Visit Us</h4>
                <p className="text-gray-400">Nairobi, Kenya</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <h3 className="text-white font-semibold mb-4">Accepted Payment Methods</h3>
          <div className="flex flex-wrap items-center gap-4">
            {paymentMethods.map((method) => (
              <div key={method.name} className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
                <span>{method.icon}</span>
                <span className="text-sm">{method.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © {currentYear} Xarastore. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-4">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
