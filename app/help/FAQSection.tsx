'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping within Kenya takes 3-5 business days. Express shipping takes 1-2 business days. International shipping times vary by destination.',
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 30-day return policy for most items in original condition. Some items like personalized products or underwear may not be eligible. Returns are free for defective items.',
    },
    {
      question: 'How do I track my order?',
      answer: 'Once your order ships, you will receive a tracking number via email. You can also track your order from your account dashboard under "My Orders".',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept M-Pesa, credit/debit cards (Visa, Mastercard, Amex), and bank transfers. All payments are securely processed.',
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location. Customs duties may apply for international orders.',
    },
    {
      question: 'How do I contact customer service?',
      answer: 'You can contact us via email at support@xarastore.com, phone at +254 700 123 456, or through the contact form on this page. Live chat is available Monday-Friday 8AM-6PM EAT.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Frequently Asked Questions
      </h3>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900">{faq.question}</span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-700">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
