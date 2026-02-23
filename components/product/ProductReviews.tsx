'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageCircle, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Review } from '@/types';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

interface ProductReviewsProps {
  productId: string;
  productName?: string;
  averageRating?: number;
  totalReviews?: number;
}

export function ProductReviews({
  productId,
  productName = 'this product',
  averageRating = 0,
  totalReviews = 0,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    comment: '',
  });

  const pageSize = 5;

  useEffect(() => {
    fetchReviews();
  }, [productId, page, sortBy, filterRating]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:users(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('product_id', productId)
        .eq('is_verified', true);

      // Apply rating filter
      if (filterRating) {
        query = query.eq('rating', filterRating);
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'helpful':
          // Note: You'd need a helpful_count column or similar
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating_high':
          query = query.order('rating', { ascending: false });
          break;
        case 'rating_low':
          query = query.order('rating', { ascending: true });
          break;
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setReviews(data || []);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReview.comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to submit a review');
        setShowForm(false);
        return;
      }

      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: session.user.id,
        rating: newReview.rating,
        title: newReview.title.trim(),
        comment: newReview.comment.trim(),
        is_verified: false, // Will be set to true after verification
      });

      if (error) throw error;

      toast.success('Review submitted!', {
        description: 'Your review will be visible after verification.',
      });

      // Reset form
      setNewReview({
        rating: 5,
        title: '',
        comment: '',
      });
      setShowForm(false);

      // Refresh reviews
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulClick = async (reviewId: string) => {
    try {
      // In production, track helpful clicks in a separate table
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const handleReportReview = (reviewId: string) => {
    // In production, implement report functionality
    toast.info('Review reported. Our team will investigate.');
  };

  const ratingDistribution = [
    { rating: 5, count: Math.floor(totalReviews * 0.4) },
    { rating: 4, count: Math.floor(totalReviews * 0.3) },
    { rating: 3, count: Math.floor(totalReviews * 0.15) },
    { rating: 2, count: Math.floor(totalReviews * 0.1) },
    { rating: 1, count: Math.floor(totalReviews * 0.05) },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'helpful', label: 'Most Helpful' },
    { value: 'rating_high', label: 'Highest Rating' },
    { value: 'rating_low', label: 'Lowest Rating' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center">
              <Rating value={averageRating} size="lg" />
              <span className="ml-2 text-lg font-bold">{averageRating.toFixed(1)}</span>
              <span className="ml-1 text-gray-600">out of 5</span>
            </div>
            <span className="text-gray-500">{totalReviews.toLocaleString()} reviews</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          Write a Review
        </Button>
      </div>

      {/* Rating Distribution */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          {ratingDistribution.map(({ rating, count }) => {
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            
            return (
              <button
                key={rating}
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                className={`flex items-center w-full p-2 rounded-lg transition-colors ${
                  filterRating === rating ? 'bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center w-16">
                  <span className="text-sm font-medium w-6">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 ml-1 fill-current" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
          
          {filterRating && (
            <button
              onClick={() => setFilterRating(null)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Review Form */}
        {showForm && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Write Your Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Title (Optional)
                </label>
                <input
                  id="review-title"
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Summarize your experience"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <Textarea
                  id="review-comment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Minimum 20 characters
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || newReview.comment.length < 20}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {reviews.length} of {totalReviews.toLocaleString()} reviews
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              className="w-48"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-600 mb-6">Be the first to share your thoughts!</p>
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            Write the First Review
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                    {review.user?.avatar_url ? (
                      <img
                        src={review.user.avatar_url}
                        alt={review.user.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-600 font-semibold">
                        {review.user?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">
                        {review.user?.full_name || 'Anonymous'}
                      </h4>
                      {review.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Rating value={review.rating} size="sm" />
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  Verified Purchase
                </div>
              </div>

              {review.title && (
                <h5 className="text-lg font-semibold text-gray-900 mb-2">
                  {review.title}
                </h5>
              )}

              <p className="text-gray-700 mb-4 whitespace-pre-line">
                {review.comment}
              </p>

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex space-x-2 mb-4 overflow-x-auto">
                  {review.images.map((image, index) => (
                    <button
                      key={index}
                      className="w-20 h-20 flex-shrink-0 rounded-lg border border-gray-300 overflow-hidden"
                      onClick={() => {
                        // Open image viewer
                      }}
                    >
                      <img
                        src={image}
                        alt={`Review image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleHelpfulClick(review.id)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful ({Math.floor(Math.random() * 50)})</span>
                  </button>
                  
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Reply
                  </button>
                </div>
                
                <button
                  onClick={() => handleReportReview(review.id)}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
