-- Product search function with full-text search and filters
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT '',
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  category_ids UUID[] DEFAULT NULL,
  brand_ids UUID[] DEFAULT NULL,
  min_rating DECIMAL DEFAULT NULL,
  in_stock BOOLEAN DEFAULT NULL,
  is_deal BOOLEAN DEFAULT NULL,
  is_featured BOOLEAN DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  description TEXT,
  price DECIMAL,
  original_price DECIMAL,
  images TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  stock INTEGER,
  is_featured BOOLEAN,
  is_deal BOOLEAN,
  deal_ends_at TIMESTAMP,
  brand_id UUID,
  brand_name VARCHAR,
  brand_slug VARCHAR,
  brand_logo TEXT,
  brand_product_count INTEGER,
  category_id UUID,
  category_name VARCHAR,
  category_slug VARCHAR,
  category_product_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  relevance_score DECIMAL
) AS $$
DECLARE
  query_text TEXT;
  ts_query tsquery;
BEGIN
  -- Prepare full-text search query
  IF search_term <> '' THEN
    -- Remove accents and prepare for search
    search_term := unaccent(lower(search_term));
    
    -- Create tsquery for full-text search
    ts_query := to_tsquery('english', 
      regexp_replace(
        regexp_replace(search_term, '\s+', ' & ', 'g'),
        '[^a-zA-Z0-9&|!()'' ]', '', 'g'
      ) || ':*'
    );
  END IF;

  -- Build the dynamic query
  query_text := '
    WITH search_results AS (
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.images,
        p.rating,
        p.review_count,
        p.stock,
        p.is_featured,
        p.is_deal,
        p.deal_ends_at,
        p.brand_id,
        p.category_id,
        p.created_at,
        p.updated_at,
        b.name as brand_name,
        b.slug as brand_slug,
        b.logo as brand_logo,
        b.product_count as brand_product_count,
        c.name as category_name,
        c.slug as category_slug,
        c.product_count as category_product_count,
        CASE 
          WHEN $1 = '''' THEN 1.0
          ELSE 
            ts_rank(to_tsvector(''english'', unaccent(coalesce(p.name, ''''))), $2) * 3 +
            ts_rank(to_tsvector(''english'', unaccent(coalesce(p.description, ''''))), $2) * 1 +
            similarity(unaccent(lower(p.name)), unaccent(lower($1))) * 2 +
            similarity(unaccent(lower(p.description)), unaccent(lower($1))) * 0.5
        END as relevance_score
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
  ';

  -- Add search term condition
  IF search_term <> '' THEN
    query_text := query_text || '
        AND (
          to_tsvector(''english'', unaccent(coalesce(p.name, ''''))) @@ $2
          OR to_tsvector(''english'', unaccent(coalesce(p.description, ''''))) @@ $2
          OR unaccent(lower(p.name)) LIKE unaccent(lower(''%'' || $1 || ''%''))
          OR unaccent(lower(p.description)) LIKE unaccent(lower(''%'' || $1 || ''%''))
          OR unaccent(lower(p.sku)) LIKE unaccent(lower(''%'' || $1 || ''%''))
        )
    ';
  END IF;

  -- Add price filter
  IF min_price IS NOT NULL THEN
    query_text := query_text || ' AND p.price >= $3 ';
  END IF;

  IF max_price IS NOT NULL THEN
    query_text := query_text || ' AND p.price <= $4 ';
  END IF;

  -- Add category filter
  IF category_ids IS NOT NULL AND array_length(category_ids, 1) > 0 THEN
    query_text := query_text || ' AND p.category_id = ANY($5) ';
  END IF;

  -- Add brand filter
  IF brand_ids IS NOT NULL AND array_length(brand_ids, 1) > 0 THEN
    query_text := query_text || ' AND p.brand_id = ANY($6) ';
  END IF;

  -- Add rating filter
  IF min_rating IS NOT NULL THEN
    query_text := query_text || ' AND p.rating >= $7 ';
  END IF;

  -- Add stock filter
  IF in_stock IS NOT NULL THEN
    IF in_stock THEN
      query_text := query_text || ' AND p.stock > 0 ';
    ELSE
      query_text := query_text || ' AND p.stock <= 0 ';
    END IF;
  END IF;

  -- Add deal filter
  IF is_deal IS NOT NULL THEN
    IF is_deal THEN
      query_text := query_text || ' AND p.is_deal = true AND (p.deal_ends_at IS NULL OR p.deal_ends_at > NOW()) ';
    ELSE
      query_text := query_text || ' AND p.is_deal = false ';
    END IF;
  END IF;

  -- Add featured filter
  IF is_featured IS NOT NULL THEN
    query_text := query_text || ' AND p.is_featured = $8 ';
  END IF;

  -- Close CTE and apply sorting
  query_text := query_text || '
    )
    SELECT * FROM search_results
  ';

  -- Apply sorting
  CASE sort_by
    WHEN 'price-low' THEN
      query_text := query_text || ' ORDER BY price ASC, relevance_score DESC ';
    WHEN 'price-high' THEN
      query_text := query_text || ' ORDER BY price DESC, relevance_score DESC ';
    WHEN 'rating' THEN
      query_text := query_text || ' ORDER BY rating DESC, review_count DESC, relevance_score DESC ';
    WHEN 'newest' THEN
      query_text := query_text || ' ORDER BY created_at DESC, relevance_score DESC ';
    WHEN 'popular' THEN
      query_text := query_text || ' ORDER BY review_count DESC, rating DESC, relevance_score DESC ';
    ELSE -- 'relevance'
      query_text := query_text || ' ORDER BY relevance_score DESC, review_count DESC, rating DESC ';
  END CASE;

  -- Apply pagination
  query_text := query_text || ' OFFSET $9 LIMIT $10 ';

  -- Execute the dynamic query
  RETURN QUERY EXECUTE query_text
  USING 
    search_term,
    ts_query,
    min_price,
    max_price,
    category_ids,
    brand_ids,
    min_rating,
    is_featured,
    page_offset,
    page_limit;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search price range
CREATE OR REPLACE FUNCTION get_search_price_range(
  p_query TEXT DEFAULT '',
  p_filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
  min_price DECIMAL,
  max_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
  FROM products p
  WHERE p.is_active = true
  AND (
    p_query = ''
    OR to_tsvector('english', unaccent(coalesce(p.name, ''))) @@ plainto_tsquery('english', unaccent(p_query))
    OR to_tsvector('english', unaccent(coalesce(p.description, ''))) @@ plainto_tsquery('english', unaccent(p_query))
    OR unaccent(lower(p.name)) LIKE unaccent(lower('%' || p_query || '%'))
    OR unaccent(lower(p.description)) LIKE unaccent(lower('%' || p_query || '%'))
  )
  AND (
    NOT (p_filters ? 'categories') 
    OR p.category_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'categories')::UUID))
  )
  AND (
    NOT (p_filters ? 'brands') 
    OR p.brand_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'brands')::UUID))
  )
  AND (
    NOT (p_filters ? 'inStock') 
    OR (p_filters->>'inStock')::BOOLEAN = false 
    OR p.stock > 0
  )
  AND (
    NOT (p_filters ? 'isDeal') 
    OR (p_filters->>'isDeal')::BOOLEAN = false 
    OR (p.is_deal = true AND (p.deal_ends_at IS NULL OR p.deal_ends_at > NOW()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search categories with counts
CREATE OR REPLACE FUNCTION get_search_categories(
  p_query TEXT DEFAULT '',
  p_filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) as count
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
    AND p.is_active = true
    AND (
      p_query = ''
      OR to_tsvector('english', unaccent(coalesce(p.name, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR to_tsvector('english', unaccent(coalesce(p.description, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR unaccent(lower(p.name)) LIKE unaccent(lower('%' || p_query || '%'))
      OR unaccent(lower(p.description)) LIKE unaccent(lower('%' || p_query || '%'))
    )
    AND (
      NOT (p_filters ? 'minPrice') 
      OR p.price >= (p_filters->>'minPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'maxPrice') 
      OR p.price <= (p_filters->>'maxPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'brands') 
      OR p.brand_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'brands')::UUID))
    )
    AND (
      NOT (p_filters ? 'ratings') 
      OR p.rating >= ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'ratings')::DECIMAL))
    )
    AND (
      NOT (p_filters ? 'inStock') 
      OR (p_filters->>'inStock')::BOOLEAN = false 
      OR p.stock > 0
    )
    AND (
      NOT (p_filters ? 'isDeal') 
      OR (p_filters->>'isDeal')::BOOLEAN = false 
      OR (p.is_deal = true AND (p.deal_ends_at IS NULL OR p.deal_ends_at > NOW()))
    )
  WHERE c.is_active = true
  GROUP BY c.id, c.name, c.slug
  HAVING COUNT(p.id) > 0
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search brands with counts
CREATE OR REPLACE FUNCTION get_search_brands(
  p_query TEXT DEFAULT '',
  p_filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    COUNT(p.id) as count
  FROM brands b
  LEFT JOIN products p ON p.brand_id = b.id
    AND p.is_active = true
    AND (
      p_query = ''
      OR to_tsvector('english', unaccent(coalesce(p.name, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR to_tsvector('english', unaccent(coalesce(p.description, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR unaccent(lower(p.name)) LIKE unaccent(lower('%' || p_query || '%'))
      OR unaccent(lower(p.description)) LIKE unaccent(lower('%' || p_query || '%'))
    )
    AND (
      NOT (p_filters ? 'minPrice') 
      OR p.price >= (p_filters->>'minPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'maxPrice') 
      OR p.price <= (p_filters->>'maxPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'categories') 
      OR p.category_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'categories')::UUID))
    )
    AND (
      NOT (p_filters ? 'ratings') 
      OR p.rating >= ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'ratings')::DECIMAL))
    )
    AND (
      NOT (p_filters ? 'inStock') 
      OR (p_filters->>'inStock')::BOOLEAN = false 
      OR p.stock > 0
    )
    AND (
      NOT (p_filters ? 'isDeal') 
      OR (p_filters->>'isDeal')::BOOLEAN = false 
      OR (p.is_deal = true AND (p.deal_ends_at IS NULL OR p.deal_ends_at > NOW()))
    )
  WHERE b.is_active = true
  GROUP BY b.id, b.name, b.slug
  HAVING COUNT(p.id) > 0
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search ratings distribution
CREATE OR REPLACE FUNCTION get_search_ratings(
  p_query TEXT DEFAULT '',
  p_filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
  rating DECIMAL,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    FLOOR(p.rating) as rating,
    COUNT(*) as count
  FROM products p
  WHERE p.is_active = true
    AND p.rating > 0
    AND (
      p_query = ''
      OR to_tsvector('english', unaccent(coalesce(p.name, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR to_tsvector('english', unaccent(coalesce(p.description, ''))) @@ plainto_tsquery('english', unaccent(p_query))
      OR unaccent(lower(p.name)) LIKE unaccent(lower('%' || p_query || '%'))
      OR unaccent(lower(p.description)) LIKE unaccent(lower('%' || p_query || '%'))
    )
    AND (
      NOT (p_filters ? 'minPrice') 
      OR p.price >= (p_filters->>'minPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'maxPrice') 
      OR p.price <= (p_filters->>'maxPrice')::DECIMAL
    )
    AND (
      NOT (p_filters ? 'categories') 
      OR p.category_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'categories')::UUID))
    )
    AND (
      NOT (p_filters ? 'brands') 
      OR p.brand_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filters->'brands')::UUID))
    )
    AND (
      NOT (p_filters ? 'inStock') 
      OR (p_filters->>'inStock')::BOOLEAN = false 
      OR p.stock > 0
    )
    AND (
      NOT (p_filters ? 'isDeal') 
      OR (p_filters->>'isDeal')::BOOLEAN = false 
      OR (p.is_deal = true AND (p.deal_ends_at IS NULL OR p.deal_ends_at > NOW()))
    )
  GROUP BY FLOOR(p.rating)
  ORDER BY rating DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log search queries
CREATE OR REPLACE FUNCTION log_search_query(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_filters JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO search_logs (
    user_id,
    session_id,
    query,
    filters,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    p_session_id,
    p_query,
    p_filters,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent',
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search conversion rate
CREATE OR REPLACE FUNCTION get_search_conversion_rate(
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH search_stats AS (
    SELECT 
      COUNT(DISTINCT sl.id) as total_searches,
      COUNT(DISTINCT o.id) as converted_searches
    FROM search_logs sl
    LEFT JOIN orders o ON o.user_id = sl.user_id
      AND o.created_at BETWEEN sl.created_at AND sl.created_at + INTERVAL '1 hour'
      AND o.created_at >= p_start_date
    WHERE sl.created_at >= p_start_date
      AND sl.query <> ''
  )
  SELECT 
    CASE 
      WHEN total_searches > 0 
      THEN (converted_searches::DECIMAL / total_searches) * 100 
      ELSE 0 
    END as conversion_rate
  FROM search_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
