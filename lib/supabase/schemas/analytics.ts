xarastore/lib/supabase/schemas/analytics.ts
export const analyticsSchema = `
-- Enable Row Level Security
ALTER TABLE analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_metrics ENABLE ROW LEVEL SECURITY;

-- Pageviews table
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  
  -- Page information
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_referrer TEXT,
  page_path TEXT NOT NULL,
  page_query JSONB,
  
  -- Device information
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'bot')),
  device_vendor TEXT,
  device_model TEXT,
  
  -- Location information
  ip_address INET,
  country_code CHAR(2),
  country_name TEXT,
  region_name TEXT,
  city_name TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  
  -- Network information
  connection_type TEXT,
  effective_connection_type TEXT,
  
  -- Performance metrics
  page_load_time INTEGER,
  dom_content_loaded_time INTEGER,
  first_contentful_paint INTEGER,
  largest_contentful_paint INTEGER,
  first_input_delay INTEGER,
  cumulative_layout_shift DECIMAL(5,3),
  
  -- Engagement metrics
  time_on_page INTEGER,
  scroll_depth_percentage INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_pageviews_session_id (session_id),
  INDEX idx_analytics_pageviews_user_id (user_id),
  INDEX idx_analytics_pageviews_created_at (created_at),
  INDEX idx_analytics_pageviews_page_path (page_path),
  INDEX idx_analytics_pageviews_country_code (country_code),
  INDEX idx_analytics_pageviews_device_type (device_type)
);

-- Events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  pageview_id UUID REFERENCES analytics_pageviews(id),
  
  -- Event information
  event_category TEXT NOT NULL,
  event_action TEXT NOT NULL,
  event_label TEXT,
  event_value DECIMAL(10,2),
  
  -- Event-specific data
  event_data JSONB,
  
  -- Device information (duplicated for query performance)
  user_agent TEXT,
  device_type TEXT,
  country_code CHAR(2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_events_session_id (session_id),
  INDEX idx_analytics_events_user_id (user_id),
  INDEX idx_analytics_events_created_at (created_at),
  INDEX idx_analytics_events_category_action (event_category, event_action),
  INDEX idx_analytics_events_pageview_id (pageview_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  
  -- Session information
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  session_duration INTEGER,
  
  -- Session metrics
  pageview_count INTEGER DEFAULT 1,
  event_count INTEGER DEFAULT 0,
  
  -- Device information
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT,
  device_vendor TEXT,
  device_model TEXT,
  
  -- Location information
  ip_address INET,
  country_code CHAR(2),
  country_name TEXT,
  region_name TEXT,
  city_name TEXT,
  
  -- Acquisition information
  traffic_source TEXT,
  traffic_medium TEXT,
  traffic_campaign TEXT,
  traffic_content TEXT,
  traffic_term TEXT,
  
  -- Engagement metrics
  is_bounce BOOLEAN DEFAULT true,
  is_converted BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_sessions_user_id (user_id),
  INDEX idx_analytics_sessions_session_start (session_start),
  INDEX idx_analytics_sessions_country_code (country_code),
  INDEX idx_analytics_sessions_traffic_source (traffic_source),
  INDEX idx_analytics_sessions_is_converted (is_converted)
);

-- Conversions table
CREATE TABLE IF NOT EXISTS analytics_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  user_id UUID REFERENCES users(id),
  
  -- Conversion information
  conversion_type TEXT NOT NULL CHECK (conversion_type IN (
    'purchase', 'signup', 'newsletter', 'contact', 'download', 'lead', 'other'
  )),
  conversion_value DECIMAL(10,2),
  conversion_data JSONB,
  
  -- Funnel information
  funnel_stage TEXT,
  funnel_name TEXT,
  
  -- Attribution
  attribution_source TEXT,
  attribution_medium TEXT,
  attribution_campaign TEXT,
  attribution_content TEXT,
  attribution_term TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_conversions_session_id (session_id),
  INDEX idx_analytics_conversions_user_id (user_id),
  INDEX idx_analytics_conversions_created_at (created_at),
  INDEX idx_analytics_conversions_conversion_type (conversion_type),
  INDEX idx_analytics_conversions_funnel_name (funnel_name)
);

-- User metrics table (aggregated metrics per user)
CREATE TABLE IF NOT EXISTS analytics_user_metrics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  total_pageviews INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  
  -- Conversion metrics
  total_conversions INTEGER DEFAULT 0,
  total_conversion_value DECIMAL(15,2) DEFAULT 0,
  
  -- Purchase metrics
  total_purchases INTEGER DEFAULT 0,
  total_purchase_value DECIMAL(15,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- Engagement metrics
  last_session_start TIMESTAMP WITH TIME ZONE,
  days_since_last_visit INTEGER,
  visit_frequency_days DECIMAL(5,2),
  
  -- Device preferences
  primary_device_type TEXT,
  primary_browser TEXT,
  primary_country_code CHAR(2),
  
  -- User segmentation
  user_segment TEXT CHECK (user_segment IN (
    'new', 'active', 'at_risk', 'churned', 'loyal', 'vip'
  )),
  lifetime_value_tier TEXT CHECK (lifetime_value_tier IN (
    'low', 'medium', 'high', 'vip'
  )),
  
  -- Calculated scores
  engagement_score INTEGER DEFAULT 0,
  loyalty_score INTEGER DEFAULT 0,
  predicted_churn_score INTEGER DEFAULT 0,
  
  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_user_metrics_user_segment (user_segment),
  INDEX idx_analytics_user_metrics_last_seen_at (last_seen_at),
  INDEX idx_analytics_user_metrics_lifetime_value_tier (lifetime_value_tier),
  INDEX idx_analytics_user_metrics_engagement_score (engagement_score)
);

-- E-commerce events table
CREATE TABLE IF NOT EXISTS analytics_ecommerce_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  
  -- Event information
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view_item', 'view_item_list', 'select_item', 'add_to_cart',
    'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info',
    'add_payment_info', 'purchase', 'refund', 'add_to_wishlist',
    'remove_from_wishlist', 'view_wishlist'
  )),
  
  -- Product information
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  product_category TEXT,
  product_brand TEXT,
  product_variant TEXT,
  product_price DECIMAL(10,2),
  
  -- Event-specific data
  items JSONB, -- Array of items for cart/checkout events
  value DECIMAL(10,2),
  currency TEXT DEFAULT 'KES',
  coupon TEXT,
  transaction_id TEXT,
  
  -- Funnel stage
  funnel_stage TEXT,
  funnel_position INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_analytics_ecommerce_events_session_id (session_id),
  INDEX idx_analytics_ecommerce_events_user_id (user_id),
  INDEX idx_analytics_ecommerce_events_created_at (created_at),
  INDEX idx_analytics_ecommerce_events_event_type (event_type),
  INDEX idx_analytics_ecommerce_events_product_id (product_id),
  INDEX idx_analytics_ecommerce_events_transaction_id (transaction_id)
);

-- RLS Policies

-- Only admins can view analytics data
CREATE POLICY "Only admins can view analytics"
ON analytics_pageviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can view analytics events"
ON analytics_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can view analytics sessions"
ON analytics_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can view conversions"
ON analytics_conversions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can view user metrics"
ON analytics_user_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can view ecommerce events"
ON analytics_ecommerce_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Public can insert analytics data (for tracking)
CREATE POLICY "Public can insert pageviews"
ON analytics_pageviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert events"
ON analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert sessions"
ON analytics_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert conversions"
ON analytics_conversions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert ecommerce events"
ON analytics_ecommerce_events FOR INSERT
WITH CHECK (true);

-- Functions

-- Function to update session end time and duration
CREATE OR REPLACE FUNCTION update_session_end_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session end time when new pageview is added
  UPDATE analytics_sessions
  SET 
    session_end = NEW.created_at,
    session_duration = EXTRACT(EPOCH FROM (NEW.created_at - session_start)),
    pageview_count = pageview_count + 1,
    updated_at = NOW(),
    is_bounce = false
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session on pageview
CREATE TRIGGER update_session_on_pageview
AFTER INSERT ON analytics_pageviews
FOR EACH ROW EXECUTE FUNCTION update_session_end_time();

-- Function to update event count in session
CREATE OR REPLACE FUNCTION update_session_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analytics_sessions
  SET 
    event_count = event_count + 1,
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session on event
CREATE TRIGGER update_session_on_event
AFTER INSERT ON analytics_events
FOR EACH ROW EXECUTE FUNCTION update_session_event_count();

-- Function to mark session as converted
CREATE OR REPLACE FUNCTION mark_session_as_converted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analytics_sessions
  SET 
    is_converted = true,
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark session converted
CREATE TRIGGER mark_session_converted
AFTER INSERT ON analytics_conversions
FOR EACH ROW EXECUTE FUNCTION mark_session_as_converted();

-- Function to update user metrics
CREATE OR REPLACE FUNCTION update_user_metrics()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
  days_since_last INTEGER;
  avg_frequency DECIMAL;
BEGIN
  -- Check if user metrics record exists
  SELECT EXISTS (
    SELECT 1 FROM analytics_user_metrics WHERE user_id = NEW.user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Create new user metrics record
    INSERT INTO analytics_user_metrics (
      user_id,
      first_seen_at,
      last_seen_at,
      total_sessions,
      user_segment
    ) VALUES (
      NEW.user_id,
      NEW.created_at,
      NEW.created_at,
      1,
      'new'
    );
  ELSE
    -- Update existing user metrics
    SELECT 
      EXTRACT(DAYS FROM (NEW.created_at - last_seen_at)),
      CASE 
        WHEN total_sessions > 0 
        THEN EXTRACT(DAYS FROM (NOW() - first_seen_at))::DECIMAL / total_sessions 
        ELSE 0 
      END
    INTO days_since_last, avg_frequency
    FROM analytics_user_metrics
    WHERE user_id = NEW.user_id;
    
    UPDATE analytics_user_metrics
    SET 
      total_sessions = total_sessions + 1,
      last_seen_at = NEW.created_at,
      days_since_last_visit = days_since_last,
      visit_frequency_days = avg_frequency,
      updated_at = NOW(),
      user_segment = CASE 
        WHEN days_since_last > 30 THEN 'churned'
        WHEN days_since_last > 7 THEN 'at_risk'
        WHEN total_sessions + 1 > 10 THEN 'loyal'
        ELSE 'active'
      END
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user metrics on session
CREATE TRIGGER update_user_metrics_on_session
AFTER INSERT ON analytics_sessions
FOR EACH ROW EXECUTE FUNCTION update_user_metrics();

-- Function to update ecommerce metrics
CREATE OR REPLACE FUNCTION update_ecommerce_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'purchase' AND NEW.value > 0 THEN
    -- Update user metrics with purchase
    UPDATE analytics_user_metrics
    SET 
      total_purchases = COALESCE(total_purchases, 0) + 1,
      total_purchase_value = COALESCE(total_purchase_value, 0) + NEW.value,
      total_conversions = COALESCE(total_conversions, 0) + 1,
      total_conversion_value = COALESCE(total_conversion_value, 0) + NEW.value,
      avg_order_value = CASE 
        WHEN COALESCE(total_purchases, 0) + 1 > 0 
        THEN (COALESCE(total_purchase_value, 0) + NEW.value) / (COALESCE(total_purchases, 0) + 1)
        ELSE NEW.value
      END,
      lifetime_value_tier = CASE 
        WHEN COALESCE(total_purchase_value, 0) + NEW.value > 50000 THEN 'vip'
        WHEN COALESCE(total_purchase_value, 0) + NEW.value > 10000 THEN 'high'
        WHEN COALESCE(total_purchase_value, 0) + NEW.value > 1000 THEN 'medium'
        ELSE 'low'
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ecommerce metrics
CREATE TRIGGER update_ecommerce_metrics_trigger
AFTER INSERT ON analytics_ecommerce_events
FOR EACH ROW EXECUTE FUNCTION update_ecommerce_metrics();

-- Function to get daily analytics summary
CREATE OR REPLACE FUNCTION get_daily_analytics_summary(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_sessions BIGINT,
  total_pageviews BIGINT,
  total_users BIGINT,
  new_users BIGINT,
  returning_users BIGINT,
  bounce_rate DECIMAL(5,2),
  avg_session_duration DECIMAL(10,2),
  total_conversions BIGINT,
  conversion_rate DECIMAL(5,2),
  total_revenue DECIMAL(15,2),
  avg_order_value DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(s.session_start) as date,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(p.id) as total_pageviews,
    COUNT(DISTINCT s.user_id) as total_users,
    COUNT(DISTINCT CASE 
      WHEN um.first_seen_at::DATE = DATE(s.session_start) 
      THEN s.user_id 
    END) as new_users,
    COUNT(DISTINCT CASE 
      WHEN um.first_seen_at::DATE < DATE(s.session_start) 
      THEN s.user_id 
    END) as returning_users,
    ROUND(
      COUNT(DISTINCT CASE WHEN s.pageview_count = 1 THEN s.id END)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) as bounce_rate,
    ROUND(AVG(s.session_duration)::DECIMAL, 2) as avg_session_duration,
    COUNT(DISTINCT c.id) as total_conversions,
    ROUND(
      COUNT(DISTINCT c.id)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) as conversion_rate,
    COALESCE(SUM(c.conversion_value), 0) as total_revenue,
    ROUND(
      AVG(CASE 
        WHEN c.conversion_value > 0 
        THEN c.conversion_value 
      END)::DECIMAL, 
      2
    ) as avg_order_value
  FROM analytics_sessions s
  LEFT JOIN analytics_pageviews p ON p.session_id = s.id
  LEFT JOIN analytics_user_metrics um ON um.user_id = s.user_id
  LEFT JOIN analytics_conversions c ON c.session_id = s.id
  WHERE DATE(s.session_start) BETWEEN start_date AND end_date
  GROUP BY DATE(s.session_start)
  ORDER BY DATE(s.session_start) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get traffic sources report
CREATE OR REPLACE FUNCTION get_traffic_sources_report(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  traffic_source TEXT,
  traffic_medium TEXT,
  traffic_campaign TEXT,
  total_sessions BIGINT,
  total_users BIGINT,
  new_users BIGINT,
  bounce_rate DECIMAL(5,2),
  avg_session_duration DECIMAL(10,2),
  total_conversions BIGINT,
  conversion_rate DECIMAL(5,2),
  total_revenue DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.traffic_source, 'direct') as traffic_source,
    COALESCE(s.traffic_medium, '(none)') as traffic_medium,
    COALESCE(s.traffic_campaign, '(none)') as traffic_campaign,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT s.user_id) as total_users,
    COUNT(DISTINCT CASE 
      WHEN um.first_seen_at::DATE BETWEEN start_date AND end_date 
      THEN s.user_id 
    END) as new_users,
    ROUND(
      COUNT(DISTINCT CASE WHEN s.pageview_count = 1 THEN s.id END)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) as bounce_rate,
    ROUND(AVG(s.session_duration)::DECIMAL, 2) as avg_session_duration,
    COUNT(DISTINCT c.id) as total_conversions,
    ROUND(
      COUNT(DISTINCT c.id)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) as conversion_rate,
    COALESCE(SUM(c.conversion_value), 0) as total_revenue
  FROM analytics_sessions s
  LEFT JOIN analytics_user_metrics um ON um.user_id = s.user_id
  LEFT JOIN analytics_conversions c ON c.session_id = s.id
  WHERE DATE(s.session_start) BETWEEN start_date AND end_date
  GROUP BY s.traffic_source, s.traffic_medium, s.traffic_campaign
  ORDER BY total_sessions DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get ecommerce funnel analysis
CREATE OR REPLACE FUNCTION get_ecommerce_funnel_analysis(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  funnel_stage TEXT,
  total_sessions BIGINT,
  stage_sessions BIGINT,
  dropoff_sessions BIGINT,
  dropoff_rate DECIMAL(5,2),
  conversion_rate_to_next DECIMAL(5,2),
  avg_time_to_next_stage INTEGER
) AS $$
WITH funnel_stages AS (
  SELECT 'view_item' as stage, 1 as position
  UNION SELECT 'add_to_cart', 2
  UNION SELECT 'begin_checkout', 3
  UNION SELECT 'add_payment_info', 4
  UNION SELECT 'purchase', 5
),
stage_events AS (
  SELECT
    e.session_id,
    e.event_type,
    e.created_at,
    fs.position
  FROM analytics_ecommerce_events e
  JOIN funnel_stages fs ON fs.stage = e.event_type
  WHERE DATE(e.created_at) BETWEEN start_date AND end_date
  AND e.event_type IN (SELECT stage FROM funnel_stages)
),
session_first_stage AS (
  SELECT
    session_id,
    MIN(position) as first_position
  FROM stage_events
  GROUP BY session_id
),
stage_counts AS (
  SELECT
    fs.stage,
    fs.position,
    COUNT(DISTINCT sfs.session_id) as total_to_stage,
    COUNT(DISTINCT se.session_id) as reached_stage,
    COUNT(DISTINCT CASE 
      WHEN se_next.session_id IS NOT NULL 
      THEN se.session_id 
    END) as moved_to_next,
    AVG(
      EXTRACT(EPOCH FROM (se_next.created_at - se.created_at))
    ) as avg_time_to_next
  FROM funnel_stages fs
  CROSS JOIN session_first_stage sfs
  LEFT JOIN stage_events se ON se.session_id = sfs.session_id AND se.position = fs.position
  LEFT JOIN stage_events se_next ON se_next.session_id = se.session_id AND se_next.position = fs.position + 1
  WHERE sfs.first_position <= fs.position
  GROUP BY fs.stage, fs.position
)
SELECT
  stage as funnel_stage,
  MAX(total_to_stage) as total_sessions,
  reached_stage as stage_sessions,
  total_to_stage - reached_stage as dropoff_sessions,
  ROUND(
    (total_to_stage - reached_stage)::DECIMAL / 
    NULLIF(total_to_stage, 0) * 100, 
    2
  ) as dropoff_rate,
  ROUND(
    moved_to_next::DECIMAL / 
    NULLIF(reached_stage, 0) * 100, 
    2
  ) as conversion_rate_to_next,
  COALESCE(avg_time_to_next::INTEGER, 0) as avg_time_to_next_stage
FROM stage_counts
ORDER BY position;
$$ LANGUAGE plpgsql;

-- Function to get user segmentation report
CREATE OR REPLACE FUNCTION get_user_segmentation_report()
RETURNS TABLE (
  user_segment TEXT,
  total_users BIGINT,
  avg_sessions_per_user DECIMAL(10,2),
  avg_session_duration DECIMAL(10,2),
  avg_days_since_last_visit DECIMAL(10,2),
  avg_purchases_per_user DECIMAL(10,2),
  avg_lifetime_value DECIMAL(15,2),
  purchase_rate DECIMAL(5,2),
  churn_risk_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.user_segment,
    COUNT(DISTINCT um.user_id) as total_users,
    ROUND(AVG(um.total_sessions)::DECIMAL, 2) as avg_sessions_per_user,
    ROUND(AVG(
      SELECT AVG(s.session_duration)
      FROM analytics_sessions s
      WHERE s.user_id = um.user_id
    )::DECIMAL, 2) as avg_session_duration,
    ROUND(AVG(um.days_since_last_visit)::DECIMAL, 2) as avg_days_since_last_visit,
    ROUND(AVG(um.total_purchases)::DECIMAL, 2) as avg_purchases_per_user,
    ROUND(AVG(um.total_purchase_value)::DECIMAL, 2) as avg_lifetime_value,
    ROUND(
      COUNT(DISTINCT CASE WHEN um.total_purchases > 0 THEN um.user_id END)::DECIMAL / 
      NULLIF(COUNT(DISTINCT um.user_id), 0) * 100, 
      2
    ) as purchase_rate,
    ROUND(AVG(um.predicted_churn_score)::DECIMAL, 2) as churn_risk_score
  FROM analytics_user_metrics um
  WHERE um.user_segment IS NOT NULL
  GROUP BY um.user_segment
  ORDER BY 
    CASE um.user_segment
      WHEN 'vip' THEN 1
      WHEN 'loyal' THEN 2
      WHEN 'active' THEN 3
      WHEN 'at_risk' THEN 4
      WHEN 'churned' THEN 5
      WHEN 'new' THEN 6
      ELSE 7
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time active users
CREATE OR REPLACE FUNCTION get_real_time_active_users(
  minutes_ago INTEGER DEFAULT 5
)
RETURNS TABLE (
  total_active_users BIGINT,
  total_active_sessions BIGINT,
  by_device_type JSONB,
  by_country JSONB,
  by_page JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.user_id) as total_active_users,
    COUNT(DISTINCT s.id) as total_active_sessions,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'device_type', s.device_type,
        'count', COUNT(DISTINCT s.id)
      )
    ) FILTER (WHERE s.device_type IS NOT NULL) as by_device_type,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'country', s.country_code,
        'count', COUNT(DISTINCT s.id)
      )
    ) FILTER (WHERE s.country_code IS NOT NULL) as by_country,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'page', p.page_path,
        'count', COUNT(DISTINCT p.id)
      )
    ) FILTER (WHERE p.page_path IS NOT NULL) as by_page
  FROM analytics_sessions s
  LEFT JOIN analytics_pageviews p ON p.session_id = s.id
  WHERE s.session_start >= NOW() - (minutes_ago || ' minutes')::INTERVAL
  AND (s.session_end IS NULL OR s.session_end >= NOW() - (minutes_ago || ' minutes')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old analytics data (retain 13 months)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
  -- Delete data older than 13 months
  DELETE FROM analytics_pageviews
  WHERE created_at < NOW() - INTERVAL '13 months';
  
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '13 months';
  
  DELETE FROM analytics_ecommerce_events
  WHERE created_at < NOW() - INTERVAL '13 months';
  
  DELETE FROM analytics_conversions
  WHERE created_at < NOW() - INTERVAL '13 months';
  
  DELETE FROM analytics_sessions
  WHERE session_start < NOW() - INTERVAL '13 months';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_analytics_pageviews_performance ON analytics_pageviews(created_at, page_load_time, first_contentful_paint);
CREATE INDEX idx_analytics_events_category_created ON analytics_events(event_category, created_at);
CREATE INDEX idx_analytics_sessions_converted ON analytics_sessions(is_converted, session_start);
CREATE INDEX idx_analytics_ecommerce_events_value ON analytics_ecommerce_events(value DESC);
CREATE INDEX idx_analytics_user_metrics_updated ON analytics_user_metrics(updated_at DESC);

-- Create materialized view for daily aggregates (updated hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_aggregates AS
SELECT
  DATE(s.session_start) as date,
  s.traffic_source,
  s.traffic_medium,
  s.country_code,
  s.device_type,
  COUNT(DISTINCT s.id) as sessions,
  COUNT(DISTINCT s.user_id) as users,
  COUNT(DISTINCT p.id) as pageviews,
  AVG(s.session_duration) as avg_session_duration,
  COUNT(DISTINCT CASE WHEN s.pageview_count = 1 THEN s.id END) as bounce_sessions,
  COUNT(DISTINCT c.id) as conversions,
  COALESCE(SUM(c.conversion_value), 0) as revenue,
  COUNT(DISTINCT e.id) as ecommerce_events,
  COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.id END) as purchases
FROM analytics_sessions s
LEFT JOIN analytics_pageviews p ON p.session_id = s.id
LEFT JOIN analytics_conversions c ON c.session_id = s.id
LEFT JOIN analytics_ecommerce_events e ON e.session_id = s.id
WHERE s.session_start >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 
  DATE(s.session_start),
  s.traffic_source,
  s.traffic_medium,
  s.country_code,
  s.device_type;

CREATE UNIQUE INDEX idx_analytics_daily_aggregates 
ON analytics_daily_aggregates(date, traffic_source, traffic_medium, country_code, device_type);

-- Function to refresh daily aggregates
CREATE OR REPLACE FUNCTION refresh_analytics_daily_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_aggregates;
END;
$$ LANGUAGE plpgsql;

-- Schedule hourly refresh during business hours
SELECT cron.schedule(
  'refresh-analytics-aggregates',
  '0 * * * *', -- Run hourly
  'SELECT refresh_analytics_daily_aggregates()'
);

-- Schedule monthly cleanup
SELECT cron.schedule(
  'cleanup-analytics-data',
  '0 2 1 * *', -- Run on 1st day of month at 2 AM
  'SELECT cleanup_old_analytics_data()'
);
