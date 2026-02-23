'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    orderNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save contact form submission
      const { error } = await supabase.from('contact_submissions').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        order_number: formData.orderNumber || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Send email notification (in production, use email service)
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setSuccess(true);
      toast.success('Message sent successfully!', {
        description: 'We will get back to you within 24 hours.',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        orderNumber: '',
      });

    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message', {
        description: 'Please try again or call our support line.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      details: '+254 711 123 456',
      description: 'Monday to Friday, 8AM - 8PM EAT',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Mail,
      title: 'Email Support',
      details: 'support@xarastore.com',
      description: 'Response within 24 hours',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: MapPin,
      title: 'Head Office',
      details: 'Westlands, Nairobi',
      description: 'Xarastore Plaza, 5th Floor',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Mon - Sun: 8AM - 10PM',
      description: 'Including weekends and holidays',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 3-5 business days within Kenya. Express delivery available in 1-2 days.',
    },
    {
      question: 'Can I change my delivery address?',
      answer: 'Yes, you can change your address before the order is shipped. Contact support immediately.',
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer 30-day returns for most items. Items must be unused and in original packaging.',
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Currently, we only ship within Kenya. International shipping coming soon.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl opacity-90 max-w-3xl">
            We're here to help. Get in touch with our team for any questions or support.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Send us a message</h2>
                {success && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Message sent!</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="0712 345 678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Number (if applicable)
                    </label>
                    <Input
                      value={formData.orderNumber}
                      onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                      placeholder="ORD-123456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Inquiry</option>
                    <option value="delivery">Delivery Issue</option>
                    <option value="return">Return/Exchange</option>
                    <option value="product">Product Question</option>
                    <option value="payment">Payment Issue</option>
                    <option value="account">Account Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Please describe your issue or question in detail..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-600">
                      Our average response time is 2 hours during business hours.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            {/* Contact Methods */}
            <div className="space-y-6">
              {contactMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div key={method.title} className="flex items-start space-x-4">
                    <div className={`${method.color} p-3 rounded-lg flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{method.title}</h3>
                      <p className="text-gray-900 font-medium">{method.details}</p>
                      <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FAQ */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Frequently Asked</h3>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <details key={index} className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                        {faq.question}
                      </span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <p className="mt-2 text-gray-600 text-sm">{faq.answer}</p>
                  </details>
                ))}
              </div>
              <Button variant="link" className="mt-4 text-red-600" href="/help">
                View all FAQs →
              </Button>
            </div>

            {/* Emergency Notice */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">Urgent Support</h4>
                  <p className="text-sm text-red-700">
                    For order cancellation or payment issues, call us immediately at{' '}
                    <a href="tel:+254711123456" className="font-bold hover:underline">
                      +254 711 123 456
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Visit Our Office</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Xarastore Head Office</h3>
                <div className="space-y-3 text-gray-700">
                  <p>Xarastore Plaza, 5th Floor</p>
                  <p>Westlands Road</p>
                  <p>Nairobi, Kenya</p>
                  <p>P.O. Box 12345-00100</p>
                  <p className="font-medium">+254 711 123 456</p>
                </div>
                <div className="mt-6 space-y-2">
                  <h4 className="font-semibold text-gray-900">Parking Available</h4>
                  <p className="text-sm text-gray-600">Secure underground parking with 24/7 security</p>
                </div>
              </div>
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Interactive map coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
