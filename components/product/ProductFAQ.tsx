'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
  helpful?: number;
  notHelpful?: number;
}

interface ProductFAQProps {
  productId: string;
  productName: string;
  faqs?: FAQItem[];
  loading?: boolean;
  className?: string;
}

export function ProductFAQ({
  productId,
  productName,
  faqs = [],
  loading = false,
  className,
}: ProductFAQProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [helpfulVotes, setHelpfulVotes] = useState<Set<number>>(new Set());
  const [notHelpfulVotes, setNotHelpfulVotes] = useState<Set<number>>(new Set());
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Default FAQs if none provided
  const defaultFAQs: FAQItem[] = [
    {
      question: 'What is included in the box?',
      answer: 'The package includes the main product, user manual, warranty card, and all necessary accessories. For specific contents, please check the product description or contact customer support.',
      category: 'Shipping & Delivery',
      helpful: 42,
      notHelpful: 3,
    },
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 3-5 business days within Kenya. Express shipping (1-2 days) is available at checkout. Delivery times may vary based on location and product availability.',
      category: 'Shipping & Delivery',
      helpful: 38,
      notHelpful: 2,
    },
    {
      question: 'What is the return policy?',
      answer: 'We offer a 30-day return policy for unused products in original packaging. Returns are free for defective items. Customized or personalized items may not be returnable. Please contact support for return authorization.',
      category: 'Returns & Warranty',
      helpful: 56,
      notHelpful: 1,
    },
    {
      question: 'Is there a warranty?',
      answer: 'Yes, all products come with a minimum 1-year manufacturer warranty. Extended warranties may be available at purchase. Warranty covers manufacturing defects but not accidental damage or normal wear and tear.',
      category: 'Returns & Warranty',
      helpful: 47,
      notHelpful: 4,
    },
    {
      question: 'How do I set up this product?',
      answer: 'Detailed setup instructions are included in the user manual. You can also find video tutorials on our YouTube channel or contact our technical support team for assistance.',
      category: 'Product Usage',
      helpful: 31,
      notHelpful: 5,
    },
    {
      question: 'Can I get spare parts or accessories?',
      answer: 'Yes, spare parts and accessories are available. Please visit the accessories section on the product page or contact customer support with the specific part you need.',
      category: 'Product Usage',
      helpful: 29,
      notHelpful: 3,
    },
    {
      question: 'Do you offer installation services?',
      answer: 'Professional installation services are available for select products. Please check the product page for installation options or contact us for more information.',
      category: 'Services',
      helpful: 24,
      notHelpful: 2,
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach our customer support team via phone at +254 700 123 456, email at support@xarastore.com, or through the live chat on our website. We\'re available 24/7.',
      category: 'Support',
      helpful: 63,
      notHelpful: 1,
    },
  ];

  const displayFAQs = faqs.length > 0 ? faqs : defaultFAQs;

  const categories = [
    { id: 'all', label: 'All Questions' },
    ...Array.from(new Set(displayFAQs.map(faq => faq.category))).map(category => ({
      id: category!,
      label: category!,
    })),
  ];

  const filteredFAQs = activeCategory === 'all'
    ? displayFAQs
    : displayFAQs.filter(faq => faq.category === activeCategory);

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleHelpful = (index: number, isHelpful: boolean) => {
    if (isHelpful) {
      const newHelpful = new Set(helpfulVotes);
      const newNotHelpful = new Set(notHelpfulVotes);
      
      if (newHelpful.has(index)) {
        newHelpful.delete(index);
      } else {
        newHelpful.add(index);
        newNotHelpful.delete(index);
      }
      
      setHelpfulVotes(newHelpful);
      setNotHelpfulVotes(newNotHelpful);
    } else {
      const newHelpful = new Set(helpfulVotes);
      const newNotHelpful = new Set(notHelpfulVotes);
      
      if (newNotHelpful.has(index)) {
        newNotHelpful.delete(index);
      } else {
        newNotHelpful.add(index);
        newHelpful.delete(index);
      }
      
      setHelpfulVotes(newHelpful);
      setNotHelpfulVotes(newNotHelpful);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      // In production, submit to your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to FAQs
      displayFAQs.unshift({
        question: newQuestion,
        answer: 'Our team will answer this question soon.',
        category: 'New Questions',
      });
      
      setNewQuestion('');
      setShowQuestionForm(false);
      
      // Show success message
      alert('Question submitted successfully! Our team will respond soon.');
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Failed to submit question. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
        <p className="text-gray-600 mt-2">
          Find answers to common questions about {productName}
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activeCategory === category.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Ask Question Button */}
      <div className="text-center">
        <Button
          variant="primary"
          onClick={() => setShowQuestionForm(!showQuestionForm)}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Ask a Question
        </Button>
      </div>

      {/* Question Form */}
      {showQuestionForm && (
        <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ask About {productName}
          </h3>
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Type your question here..."
              rows={4}
              required
            />
            <div className="flex space-x-3">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !newQuestion.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Question'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowQuestionForm(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Your question will be answered by our team and may be added to this FAQ section.
            </p>
          </form>
        </div>
      )}

      {/* FAQs List */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No questions found for this category</p>
          </div>
        ) : (
          filteredFAQs.map((faq, index) => {
            const isExpanded = expandedItems.has(index);
            const hasVotedHelpful = helpfulVotes.has(index);
            const hasVotedNotHelpful = notHelpfulVotes.has(index);
            
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-sm"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {faq.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      {faq.question}
                    </h3>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                    
                    {/* Helpful Feedback */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Was this helpful?
                        </p>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleHelpful(index, true)}
                            className={cn(
                              'flex items-center space-x-1 text-sm',
                              hasVotedHelpful
                                ? 'text-green-600 font-medium'
                                : 'text-gray-600 hover:text-green-600'
                            )}
                          >
                            <span>👍</span>
                            <span>Yes</span>
                            <span className="text-gray-400">
                              ({faq.helpful || 0})
                            </span>
                          </button>
                          <button
                            onClick={() => handleHelpful(index, false)}
                            className={cn(
                              'flex items-center space-x-1 text-sm',
                              hasVotedNotHelpful
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600 hover:text-red-600'
                            )}
                          >
                            <span>👎</span>
                            <span>No</span>
                            <span className="text-gray-400">
                              ({faq.notHelpful || 0})
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support Contact */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Still Have Questions?
        </h3>
        <p className="text-gray-600 mb-6">
          Contact our customer support team for personalized assistance.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Call Us</h4>
            <p className="text-gray-600 mt-1">+254 700 123 456</p>
            <p className="text-sm text-gray-500">24/7 Support</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Email Us</h4>
            <p className="text-gray-600 mt-1">support@xarastore.com</p>
            <p className="text-sm text-gray-500">Response within 24 hours</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Live Chat</h4>
            <p className="text-gray-600 mt-1">Available Now</p>
            <p className="text-sm text-gray-500">Click the chat icon below</p>
          </div>
        </div>
      </div>
    </div>
  );
}
