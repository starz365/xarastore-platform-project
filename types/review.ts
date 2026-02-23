export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  videos?: string[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    reviewCount: number;
  };
  product?: {
    id: string;
    name: string;
    image?: string;
    brand?: string;
  };
}

export interface ReviewMedia {
  id: string;
  reviewId: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  createdAt: string;
}

export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  type: 'helpful' | 'not_helpful';
  createdAt: string;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: 'spam' | 'inappropriate' | 'false_information' | 'hate_speech' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  actionTaken?: string;
  createdAt: string;
}

export interface ReviewMetrics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedReviews: number;
  withMedia: number;
  recentReviews: number;
  helpfulPercentage: number;
}

export interface ReviewFilter {
  rating?: number;
  verified?: boolean;
  withMedia?: boolean;
  helpful?: boolean;
  recent?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
}

export interface ReviewSummary {
  productId: string;
  metrics: ReviewMetrics;
  topReviews: ProductReview[];
  recentReviews: ProductReview[];
  mostHelpfulReviews: ProductReview[];
}

export interface ReviewAnalytics {
  period: string;
  totalReviews: number;
  averageRating: number;
  newReviews: number;
  pendingReviews: number;
  flaggedReviews: number;
  byRating: Record<number, number>;
  byProduct: Array<{
    productId: string;
    productName: string;
    reviewCount: number;
    averageRating: number;
  }>;
  byUser: Array<{
    userId: string;
    userName: string;
    reviewCount: number;
    averageRating: number;
  }>;
}

export interface ReviewSettings {
  moderationRequired: boolean;
  autoApproveThreshold: number;
  minimumRating: number;
  maximumRating: number;
  minimumCharacters: number;
  maximumCharacters: number;
  allowImages: boolean;
  allowVideos: boolean;
  maxImages: number;
  maxVideos: number;
  verifiedPurchaseOnly: boolean;
  cooldownPeriod: number;
  dailyLimit: number;
  prohibitedWords: string[];
  emailNotifications: {
    onNewReview: boolean;
    onFlaggedReview: boolean;
  };
}

export interface ReviewTemplate {
  id: string;
  name: string;
  questions: Array<{
    id: string;
    type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
    question: string;
    required: boolean;
    options?: string[];
    minLength?: number;
    maxLength?: number;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  userId: string;
  comment: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}
