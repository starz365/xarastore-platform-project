'use client';

import { useState } from 'react';
import {
  Gift,
  Sparkles,
  CreditCard,
  Smartphone,
  Mail,
  User,
  CheckCircle,
  Share2,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils/currency';

export default function GiftCardsClient() {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(1);
  const [design, setDesign] = useState<string>('classic');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<string>('');

  const predefinedAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  const totalAmount = isCustomAmount
    ? (parseInt(customAmount) || 0) * quantity
    : selectedAmount * quantity;

  const designs = [
    {
      id: 'classic',
      name: 'Classic Red',
      color: 'bg-red-600',
      description: 'Elegant red design',
    },
    {
      id: 'premium',
      name: 'Premium Gold',
      color: 'bg-yellow-500',
      description: 'Luxury gold theme',
    },
    {
      id: 'festive',
      name: 'Festive',
      color: 'bg-gradient-to-r from-red-600 to-pink-600',
      description: 'Celebration theme',
    },
    {
      id: 'corporate',
      name: 'Corporate',
      color: 'bg-gradient-to-r from-gray-800 to-gray-900',
      description: 'Professional design',
    },
  ];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustomAmount(false);
  };

  const handleCustomAmountFocus = () => {
    setIsCustomAmount(true);
  };

  const handleCheckout = () => {
    alert(
      `Proceeding to checkout for ${quantity} gift card${
        quantity > 1 ? 's' : ''
      } worth ${formatCurrency(totalAmount)}`
    );
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Xarastore Gift Card',
      text: `I'm sending you a ${formatCurrency(selectedAmount)} Xarastore Gift Card!`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-20">
          <div className="max-w-4xl">
            <div className="flex items-center space-x-3 mb-6">
              <Gift className="w-8 h-8" />
              <span className="text-lg font-semibold bg-white/20 px-4 py-1 rounded-full">
                THE PERFECT GIFT
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Give the Gift of
              <span className="block text-white">Choice</span>
            </h1>

            <p className="text-xl opacity-90 mb-8 max-w-2xl">
              Xarastore Gift Cards let them choose from millions of products.
              Instant delivery, never expires, and redeemable across all
              categories.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Instant Delivery</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">No Expiration</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Redeemable Everywhere</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-responsive py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-8">Create Your Gift Card</h2>

            {/* Amount Selection */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Select Amount</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {predefinedAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`py-4 rounded-lg border-2 transition ${
                      selectedAmount === amount && !isCustomAmount
                        ? 'border-red-600 bg-red-50 text-red-700 font-bold'
                        : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Input
                  type="number"
                  value={isCustomAmount ? customAmount : ''}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onFocus={handleCustomAmountFocus}
                  placeholder="Enter custom amount (KES 500 - 100,000)"
                  min="500"
                  max="100000"
                  className="pl-12"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  KES
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Quantity</h3>
              <div className="flex items-center space-x-4">
                <div className="flex border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3"
                  >
                    −
                  </button>
                  <span className="px-6 py-3 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-3"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Design */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Choose Design</h3>
              <div className="grid grid-cols-2 gap-4">
                {designs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDesign(d.id)}
                    className={`p-4 rounded-xl border-2 ${
                      design === d.id
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${d.color} rounded-lg`} />
                      <div className="text-left">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-sm text-gray-600">
                          {d.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Recipient Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Recipient Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Recipient Email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <textarea
                className="mt-4 w-full border rounded-lg p-3"
                placeholder="Personal message (optional)"
                maxLength={200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg border p-8 mb-8">
              <h3 className="text-xl font-bold mb-6">Order Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={!recipientEmail || totalAmount <= 0}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Buy Now
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Gift Card
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Orders */}
      <section className="py-16 bg-gray-50">
        <div className="container-responsive text-center">
          <h2 className="text-3xl font-bold mb-6">Need Bulk Gift Cards?</h2>
          <div className="flex justify-center gap-4">
            <Button>
              <Download className="w-5 h-5 mr-2" />
              Download Catalog
            </Button>
            <Button variant="secondary">Contact Sales</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
