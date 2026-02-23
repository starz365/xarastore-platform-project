xarastore/lib/supabase/schemas/reviews.ts
export const reviewsSchema = `
-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_media ENABLE ROW LEVEL SECURITY;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  
  -- Media attachments
  media_count INTEGER DEFAULT 0,
  
  -- Review metadata
  is_verified_purchase BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  helpful_votes INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  is_edited BOOLEAN DEFAULT false,
  
  -- Moderation
  moderation_status TEXT DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes TEXT,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(product_id, user_id),
  
  -- Indexes for performance
  INDEX idx_reviews_product_id (product_id),
  INDEX idx_reviews_user_id (user_id),
  INDEX idx_reviews_rating (rating),
  INDEX idx_reviews_created_at (created_at),
  INDEX idx_reviews_moderation_status (moderation_status),
  INDEX idx_reviews_is_verified (is_verified_purchase),
  INDEX idx_reviews_is_featured (is_featured)
);

-- Review media attachments
CREATE TABLE IF NOT EXISTS review_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_review_media_review_id (review_id),
  INDEX idx_review_media_media_type (media_type)
);

-- Helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(review_id, user_id),
  
  -- Indexes
  INDEX idx_review_helpful_votes_review_id (review_id),
  INDEX idx_review_helpful_votes_user_id (user_id)
);

-- Review reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_reason TEXT NOT NULL CHECK (report_reason IN (
    'spam', 'inappropriate', 'false_information', 'harassment', 'other'
  )),
  report_details TEXT,
  report_status TEXT DEFAULT 'pending'
    CHECK (report_status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(review_id, user_id),
  
  -- Indexes
  INDEX idx_review_reports_review_id (review_id),
  INDEX idx_review_reports_user_id (user_id),
  INDEX idx_review_reports_report_status (report_status)
);

-- Review responses (from sellers/merchants)
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  response_text TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_review_responses_review_id (review_id),
  INDEX idx_review_responses_user_id (user_id)
);

-- RLS Policies

-- Public can view approved reviews
CREATE POLICY "Public can view approved reviews"
ON reviews FOR SELECT
USING (is_approved = true AND moderation_status = 'approved');

-- Users can view their own reviews regardless of status
CREATE POLICY "Users can view own reviews"
ON reviews FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reviews
CREATE POLICY "Users can create reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
USING (auth.uid() = user_id);

-- Admins and moderators can view all reviews
CREATE POLICY "Admins can view all reviews"
ON reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
);

-- Admins and moderators can update all reviews
CREATE POLICY "Admins can update all reviews"
ON reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
);

-- Public can view review media for approved reviews
CREATE POLICY "Public can view review media"
ON review_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reviews
    WHERE reviews.id = review_media.review_id
    AND reviews.is_approved = true
    AND reviews.moderation_status = 'approved'
  )
);

-- Users can manage their own review media
CREATE POLICY "Users can manage own review media"
ON review_media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM reviews
    WHERE reviews.id = review_media.review_id
    AND reviews.user_id = auth.uid()
  )
);

-- Admins can manage all review media
CREATE POLICY "Admins can manage all review media"
ON review_media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
);

-- Public can view helpful votes
CREATE POLICY "Public can view helpful votes"
ON review_helpful_votes FOR SELECT
USING (true);

-- Users can manage their own helpful votes
CREATE POLICY "Users can manage own helpful votes"
ON review_helpful_votes FOR ALL
USING (auth.uid() = user_id);

-- Admins can view all review reports
CREATE POLICY "Admins can view all review reports"
ON review_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
);

-- Users can create reports
CREATE POLICY "Users can create reports"
ON review_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON review_reports FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage reports
CREATE POLICY "Admins can manage reports"
ON review_reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'moderator')
  )
);

-- Public can view review responses
CREATE POLICY "Public can view review responses"
ON review_responses FOR SELECT
USING (true);

-- Sellers/admins can create responses
CREATE POLICY "Sellers can create responses"
ON review_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'seller', 'moderator')
  )
);

-- Sellers/admins can update their responses
CREATE POLICY "Sellers can update own responses"
ON review_responses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Functions

-- Function to update product rating when review is created/updated/deleted
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product rating and review count
  UPDATE products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_approved = true
      AND moderation_status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_approved = true
      AND moderation_status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product rating
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Function to update review media count
CREATE OR REPLACE FUNCTION update_review_media_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET media_count = media_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET media_count = GREATEST(0, media_count - 1)
    WHERE id = OLD.review_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update review media count
CREATE TRIGGER update_review_media_count_trigger
AFTER INSERT OR DELETE ON review_media
FOR EACH ROW EXECUTE FUNCTION update_review_media_count();

-- Function to update helpful votes count
CREATE OR REPLACE FUNCTION update_helpful_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET helpful_votes = helpful_votes + 1
    WHERE id = NEW.review_id AND NEW.is_helpful = true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change
    IF OLD.is_helpful != NEW.is_helpful THEN
      IF NEW.is_helpful = true THEN
        UPDATE reviews
        SET helpful_votes = helpful_votes + 1
        WHERE id = NEW.review_id;
      ELSE
        UPDATE reviews
        SET helpful_votes = GREATEST(0, helpful_votes - 1)
        WHERE id = NEW.review_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET helpful_votes = GREATEST(0, helpful_votes - 1)
    WHERE id = OLD.review_id AND OLD.is_helpful = true;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update helpful votes count
CREATE TRIGGER update_helpful_votes_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
FOR EACH ROW EXECUTE FUNCTION update_helpful_votes_count();

-- Function to update report count
CREATE OR REPLACE FUNCTION update_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET report_count = report_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET report_count = GREATEST(0, report_count - 1)
    WHERE id = OLD.review_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update report count
CREATE TRIGGER update_report_count_trigger
AFTER INSERT OR DELETE ON review_reports
FOR EACH ROW EXECUTE FUNCTION update_report_count();

-- Function to check if user can review product
CREATE OR REPLACE FUNCTION can_review_product(
  user_id_to_check UUID,
  product_id_to_check UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_purchased BOOLEAN;
  has_reviewed BOOLEAN;
  review_count INTEGER;
BEGIN
  -- Check if user has purchased the product
  SELECT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = user_id_to_check
    AND oi.product_id = product_id_to_check
    AND o.status = 'delivered'
  ) INTO has_purchased;
  
  -- Check if user has already reviewed
  SELECT EXISTS (
    SELECT 1 FROM reviews
    WHERE user_id = user_id_to_check
    AND product_id = product_id_to_check
  ) INTO has_reviewed;
  
  -- User can review if they have purchased and haven't reviewed yet
  RETURN has_purchased AND NOT has_reviewed;
END;
$$ LANGUAGE plpgsql;

-- Function to get product review statistics
CREATE OR REPLACE FUNCTION get_product_review_stats(product_id_to_check UUID)
RETURNS TABLE (
  total_reviews BIGINT,
  average_rating DECIMAL(3,2),
  rating_1_count BIGINT,
  rating_2_count BIGINT,
  rating_3_count BIGINT,
  rating_4_count BIGINT,
  rating_5_count BIGINT,
  verified_purchases_count BIGINT,
  with_media_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_reviews,
    COALESCE(AVG(rating), 0) as average_rating,
    COUNT(*) FILTER (WHERE rating = 1) as rating_1_count,
    COUNT(*) FILTER (WHERE rating = 2) as rating_2_count,
    COUNT(*) FILTER (WHERE rating = 3) as rating_3_count,
    COUNT(*) FILTER (WHERE rating = 4) as rating_4_count,
    COUNT(*) FILTER (WHERE rating = 5) as rating_5_count,
    COUNT(*) FILTER (WHERE is_verified_purchase = true) as verified_purchases_count,
    COUNT(*) FILTER (WHERE media_count > 0) as with_media_count
  FROM reviews
  WHERE product_id = product_id_to_check
  AND is_approved = true
  AND moderation_status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Function to mark review as verified purchase
CREATE OR REPLACE FUNCTION mark_review_as_verified(
  review_id_to_verify UUID
)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET 
    is_verified_purchase = true,
    updated_at = NOW()
  WHERE id = review_id_to_verify;
END;
$$ LANGUAGE plpgsql;

-- Function to flag review for moderation
CREATE OR REPLACE FUNCTION flag_review_for_moderation(
  review_id_to_flag UUID,
  flag_reason TEXT DEFAULT 'reported'
)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET 
    moderation_status = 'flagged',
    updated_at = NOW(),
    moderation_notes = CONCAT(COALESCE(moderation_notes, ''), E'\n', 
      'Flagged: ', flag_reason, ' at ', NOW()::TEXT)
  WHERE id = review_id_to_flag;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's review history
CREATE OR REPLACE FUNCTION get_user_review_history(
  user_id_to_check UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  review_id UUID,
  product_id UUID,
  product_name TEXT,
  product_image TEXT,
  rating INTEGER,
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN,
  helpful_votes INTEGER,
  media_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as review_id,
    r.product_id,
    p.name as product_name,
    p.images[1] as product_image,
    r.rating,
    r.title,
    r.comment,
    r.is_verified_purchase,
    r.helpful_votes,
    r.media_count,
    r.created_at,
    r.updated_at
  FROM reviews r
  JOIN products p ON p.id = r.product_id
  WHERE r.user_id = user_id_to_check
  AND r.is_approved = true
  ORDER BY r.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent reviews with pagination
CREATE OR REPLACE FUNCTION get_recent_reviews(
  product_id_filter UUID DEFAULT NULL,
  min_rating_filter INTEGER DEFAULT NULL,
  verified_only BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  review_id UUID,
  product_id UUID,
  product_name TEXT,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  rating INTEGER,
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN,
  helpful_votes INTEGER,
  media_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  has_response BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as review_id,
    r.product_id,
    p.name as product_name,
    r.user_id,
    u.full_name as user_name,
    u.avatar_url as user_avatar,
    r.rating,
    r.title,
    r.comment,
    r.is_verified_purchase,
    r.helpful_votes,
    r.media_count,
    r.created_at,
    EXISTS (SELECT 1 FROM review_responses rr WHERE rr.review_id = r.id) as has_response
  FROM reviews r
  JOIN products p ON p.id = r.product_id
  JOIN users u ON u.id = r.user_id
  WHERE r.is_approved = true
  AND r.moderation_status = 'approved'
  AND (product_id_filter IS NULL OR r.product_id = product_id_filter)
  AND (min_rating_filter IS NULL OR r.rating >= min_rating_filter)
  AND (NOT verified_only OR r.is_verified_purchase = true)
  ORDER BY 
    CASE 
      WHEN r.is_verified_purchase = true THEN 0 
      ELSE 1 
    END,
    r.helpful_votes DESC,
    r.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate review helpfulness score
CREATE OR REPLACE FUNCTION calculate_review_helpfulness_score(review_id_to_score UUID)
RETURNS DECIMAL AS $$
DECLARE
  helpful_votes INTEGER;
  total_votes INTEGER;
  helpfulness_score DECIMAL;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE is_helpful = true),
    COUNT(*)
  INTO helpful_votes, total_votes
  FROM review_helpful_votes
  WHERE review_id = review_id_to_score;
  
  IF total_votes = 0 THEN
    helpfulness_score := 0;
  ELSE
    helpfulness_score := (helpful_votes::DECIMAL / total_votes) * 100;
  END IF;
  
  RETURN helpfulness_score;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_reviews_product_rating ON reviews(product_id, rating);
CREATE INDEX idx_reviews_created_at_desc ON reviews(created_at DESC);
CREATE INDEX idx_reviews_helpful_votes_desc ON reviews(helpful_votes DESC);

CREATE INDEX idx_review_media_created_at ON review_media(created_at);

CREATE INDEX idx_review_helpful_votes_created_at ON review_helpful_votes(created_at);

CREATE INDEX idx_review_reports_created_at ON review_reports(created_at);
CREATE INDEX idx_review_reports_report_reason ON review_reports(report_reason);

CREATE INDEX idx_review_responses_created_at ON review_responses(created_at);

-- Create materialized view for product review summaries (updated daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS product_review_summaries AS
SELECT
  p.id as product_id,
  p.name as product_name,
  COUNT(r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) FILTER (WHERE r.rating = 5) as five_star_count,
  COUNT(r.id) FILTER (WHERE r.rating = 4) as four_star_count,
  COUNT(r.id) FILTER (WHERE r.rating = 3) as three_star_count,
  COUNT(r.id) FILTER (WHERE r.rating = 2) as two_star_count,
  COUNT(r.id) FILTER (WHERE r.rating = 1) as one_star_count,
  COUNT(r.id) FILTER (WHERE r.is_verified_purchase = true) as verified_reviews_count,
  COUNT(r.id) FILTER (WHERE r.media_count > 0) as reviews_with_media_count,
  MAX(r.created_at) as latest_review_date
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
WHERE r.is_approved = true AND r.moderation_status = 'approved'
GROUP BY p.id, p.name;

CREATE UNIQUE INDEX idx_product_review_summaries_product_id 
ON product_review_summaries(product_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_product_review_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_review_summaries;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily refresh
SELECT cron.schedule(
  'refresh-review-summaries',
  '0 3 * * *', -- Run daily at 3 AM
  'SELECT refresh_product_review_summaries()'
);
