import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pickle
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import logging
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UserProfile:
    user_id: str
    viewed_products: List[str]
    purchased_products: List[str]
    search_history: List[str]
    categories_preferred: List[str]
    price_range: Dict[str, float]
    last_activity: datetime

@dataclass
class ProductFeatures:
    product_id: str
    title: str
    description: str
    category: str
    brand: str
    price: float
    rating: float
    review_count: int
    tags: List[str]
    specifications: Dict[str, Any]
    created_at: datetime

class RecommendationType(Enum):
    PERSONALIZED = "personalized"
    SIMILAR_PRODUCTS = "similar"
    TRENDING = "trending"
    FREQUENTLY_BOUGHT_TOGETHER = "fbt"
    NEW_ARRIVALS = "new"

class XarastoreRecommendationEngine:
    def __init__(self, db_config: Dict[str, Any], redis_config: Dict[str, Any]):
        self.db_config = db_config
        self.redis_config = redis_config
        self.redis_client = None
        self.db_pool = None
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.product_vectors = None
        self.user_profiles = {}
        self.scaler = MinMaxScaler()
        self.initialize_connections()
        
    def initialize_connections(self):
        """Initialize database and Redis connections"""
        try:
            # PostgreSQL connection
            self.db_pool = psycopg2.pool.ThreadedConnectionPool(
                1, 20,
                host=self.db_config['host'],
                port=self.db_config['port'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password']
            )
            
            # Redis connection
            self.redis_client = redis.Redis(
                host=self.redis_config['host'],
                port=self.redis_config['port'],
                password=self.redis_config.get('password'),
                decode_responses=True
            )
            
            logger.info("Connections initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    async def load_product_catalog(self) -> Dict[str, ProductFeatures]:
        """Load product catalog from database"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        p.id, p.slug, p.name as title, p.description,
                        c.name as category, b.name as brand,
                        p.price, p.rating, p.review_count,
                        p.images, p.specifications, p.created_at,
                        ARRAY_AGG(DISTINCT t.name) as tags
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN product_tags pt ON p.id = pt.product_id
                    LEFT JOIN tags t ON pt.tag_id = t.id
                    WHERE p.stock > 0
                    GROUP BY p.id, c.name, b.name
                    ORDER BY p.created_at DESC
                    LIMIT 10000
                """)
                
                products = {}
                for row in cur.fetchall():
                    features = ProductFeatures(
                        product_id=row['id'],
                        title=row['title'],
                        description=row['description'],
                        category=row['category'],
                        brand=row['brand'],
                        price=float(row['price']),
                        rating=float(row['rating']),
                        review_count=row['review_count'],
                        tags=row['tags'] if row['tags'][0] else [],
                        specifications=row['specifications'] or {},
                        created_at=row['created_at']
                    )
                    products[row['id']] = features
                
                logger.info(f"Loaded {len(products)} products")
                return products
        finally:
            self.db_pool.putconn(conn)
    
    async def build_product_vectors(self, products: Dict[str, ProductFeatures]):
        """Build TF-IDF vectors for product content"""
        product_texts = []
        product_ids = []
        
        for product_id, features in products.items():
            # Combine title, description, category, brand, and tags
            text = f"{features.title} {features.description} {features.category} {features.brand} {' '.join(features.tags)}"
            product_texts.append(text)
            product_ids.append(product_id)
        
        # Fit and transform text
        tfidf_matrix = self.vectorizer.fit_transform(product_texts)
        self.product_vectors = {
            pid: tfidf_matrix[i] for i, pid in enumerate(product_ids)
        }
        
        logger.info(f"Built vectors for {len(product_ids)} products")
    
    async def load_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Load user profile from database"""
        cache_key = f"user_profile:{user_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            return pickle.loads(cached.encode('latin1'))
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user activity
                cur.execute("""
                    SELECT 
                        u.id,
                        ARRAY_AGG(DISTINCT pv.product_id) as viewed_products,
                        ARRAY_AGG(DISTINCT oi.product_id) as purchased_products,
                        ARRAY_AGG(DISTINCT s.query) as search_history,
                        MAX(u.last_seen) as last_activity
                    FROM users u
                    LEFT JOIN product_views pv ON u.id = pv.user_id AND pv.viewed_at > NOW() - INTERVAL '30 days'
                    LEFT JOIN order_items oi ON u.id = oi.user_id AND oi.created_at > NOW() - INTERVAL '90 days'
                    LEFT JOIN searches s ON u.id = s.user_id AND s.searched_at > NOW() - INTERVAL '30 days'
                    WHERE u.id = %s
                    GROUP BY u.id
                """, (user_id,))
                
                row = cur.fetchone()
                if not row:
                    return None
                
                # Get preferred categories
                cur.execute("""
                    SELECT c.name, COUNT(*) as view_count
                    FROM product_views pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN categories c ON p.category_id = c.id
                    WHERE pv.user_id = %s
                    GROUP BY c.name
                    ORDER BY view_count DESC
                    LIMIT 5
                """, (user_id,))
                
                categories = [r['name'] for r in cur.fetchall()]
                
                # Get price range
                cur.execute("""
                    SELECT 
                        COALESCE(MIN(p.price), 0) as min_price,
                        COALESCE(MAX(p.price), 100000) as max_price
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.user_id = %s
                """, (user_id,))
                
                price_row = cur.fetchone()
                price_range = {
                    'min': float(price_row['min_price']) if price_row['min_price'] else 0,
                    'max': float(price_row['max_price']) if price_row['max_price'] else 100000
                }
                
                profile = UserProfile(
                    user_id=user_id,
                    viewed_products=row['viewed_products'] or [],
                    purchased_products=row['purchased_products'] or [],
                    search_history=row['search_history'] or [],
                    categories_preferred=categories,
                    price_range=price_range,
                    last_activity=row['last_activity']
                )
                
                # Cache for 1 hour
                self.redis_client.setex(
                    cache_key,
                    3600,
                    pickle.dumps(profile, protocol=0).decode('latin1')
                )
                
                return profile
        finally:
            self.db_pool.putconn(conn)
    
    def calculate_content_similarity(self, product_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Calculate content-based similarity"""
        if product_id not in self.product_vectors:
            return []
        
        similarities = []
        source_vector = self.product_vectors[product_id]
        
        for target_id, target_vector in self.product_vectors.items():
            if target_id == product_id:
                continue
            
            similarity = cosine_similarity(source_vector, target_vector)[0][0]
            similarities.append({
                'product_id': target_id,
                'similarity_score': float(similarity)
            })
        
        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
        return similarities[:limit]
    
    async def generate_collaborative_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Generate collaborative filtering recommendations"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Find users with similar purchase history
                cur.execute("""
                    WITH user_products AS (
                        SELECT DISTINCT product_id
                        FROM order_items
                        WHERE user_id = %s
                    ),
                    similar_users AS (
                        SELECT oi.user_id, COUNT(DISTINCT oi.product_id) as common_count
                        FROM order_items oi
                        JOIN user_products up ON oi.product_id = up.product_id
                        WHERE oi.user_id != %s
                        GROUP BY oi.user_id
                        ORDER BY common_count DESC
                        LIMIT 50
                    )
                    SELECT 
                        p.id as product_id,
                        COUNT(DISTINCT oi.user_id) as user_count,
                        AVG(p.rating) as avg_rating
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    JOIN similar_users su ON oi.user_id = su.user_id
                    WHERE p.id NOT IN (SELECT product_id FROM user_products)
                    GROUP BY p.id
                    ORDER BY user_count DESC, avg_rating DESC
                    LIMIT %s
                """, (user_id, user_id, limit))
                
                return [dict(row) for row in cur.fetchall()]
        finally:
            self.db_pool.putconn(conn)
    
    async def generate_personalized_recommendations(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Generate personalized recommendations for a user"""
        # Load user profile
        profile = await self.load_user_profile(user_id)
        if not profile:
            return await self.generate_trending_recommendations(limit)
        
        # Load product catalog
        products = await self.load_product_catalog()
        
        # Score products based on multiple factors
        scored_products = []
        
        for product_id, features in products.items():
            if product_id in profile.purchased_products:
                continue
            
            score = 0.0
            
            # 1. Category preference (40% weight)
            if features.category in profile.categories_preferred:
                category_index = profile.categories_preferred.index(features.category)
                category_score = 0.4 * (1.0 - (category_index * 0.2))
                score += category_score
            
            # 2. Price range match (20% weight)
            if profile.price_range['min'] <= features.price <= profile.price_range['max']:
                score += 0.2
            
            # 3. Product rating (15% weight)
            rating_score = 0.15 * (features.rating / 5.0)
            score += rating_score
            
            # 4. Review count (10% weight)
            review_score = 0.1 * min(features.review_count / 100, 1.0)
            score += review_score
            
            # 5. Recency (15% weight)
            days_old = (datetime.now() - features.created_at).days
            recency_score = 0.15 * max(0, 1.0 - (days_old / 90))
            score += recency_score
            
            # Add product with score
            if score > 0:
                scored_products.append({
                    'product_id': product_id,
                    'score': score,
                    'title': features.title,
                    'price': features.price,
                    'rating': features.rating,
                    'category': features.category
                })
        
        # Sort by score and return top results
        scored_products.sort(key=lambda x: x['score'], reverse=True)
        return scored_products[:limit]
    
    async def generate_trending_recommendations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Generate trending product recommendations"""
        cache_key = "trending_recommendations"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        p.id as product_id,
                        p.name as title,
                        p.price,
                        p.rating,
                        p.review_count,
                        c.name as category,
                        COUNT(DISTINCT pv.id) * 0.4 + 
                        COUNT(DISTINCT oi.id) * 0.6 as trending_score
                    FROM products p
                    JOIN categories c ON p.category_id = c.id
                    LEFT JOIN product_views pv ON p.id = pv.product_id 
                        AND pv.viewed_at > NOW() - INTERVAL '7 days'
                    LEFT JOIN order_items oi ON p.id = oi.product_id 
                        AND oi.created_at > NOW() - INTERVAL '3 days'
                    WHERE p.stock > 0
                    GROUP BY p.id, p.name, p.price, p.rating, p.review_count, c.name
                    ORDER BY trending_score DESC
                    LIMIT %s
                """, (limit,))
                
                results = [dict(row) for row in cur.fetchall()]
                
                # Cache for 15 minutes
                self.redis_client.setex(cache_key, 900, json.dumps(results))
                return results
        finally:
            self.db_pool.putconn(conn)
    
    async def generate_frequently_bought_together(self, product_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Generate frequently bought together recommendations"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    WITH target_orders AS (
                        SELECT DISTINCT order_id
                        FROM order_items
                        WHERE product_id = %s
                    ),
                    related_products AS (
                        SELECT 
                            oi.product_id,
                            COUNT(DISTINCT oi.order_id) as order_count,
                            AVG(p.rating) as avg_rating,
                            AVG(p.price) as avg_price
                        FROM order_items oi
                        JOIN target_orders to ON oi.order_id = to.order_id
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.product_id != %s
                        GROUP BY oi.product_id
                        HAVING COUNT(DISTINCT oi.order_id) >= 3
                    )
                    SELECT 
                        rp.product_id,
                        p.name as title,
                        p.price,
                        p.rating,
                        rp.order_count,
                        rp.order_count * p.rating as combined_score
                    FROM related_products rp
                    JOIN products p ON rp.product_id = p.id
                    WHERE p.stock > 0
                    ORDER BY combined_score DESC
                    LIMIT %s
                """, (product_id, product_id, limit))
                
                return [dict(row) for row in cur.fetchall()]
        finally:
            self.db_pool.putconn(conn)
    
    async def get_recommendations(
        self, 
        user_id: Optional[str] = None,
        product_id: Optional[str] = None,
        rec_type: RecommendationType = RecommendationType.PERSONALIZED,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Main recommendation generation endpoint"""
        try:
            recommendations = []
            
            if rec_type == RecommendationType.PERSONALIZED and user_id:
                recommendations = await self.generate_personalized_recommendations(user_id, limit)
            
            elif rec_type == RecommendationType.SIMILAR_PRODUCTS and product_id:
                similarities = self.calculate_content_similarity(product_id, limit)
                recommendations = [
                    {
                        'product_id': item['product_id'],
                        'score': item['similarity_score'],
                        'reason': 'Similar content'
                    }
                    for item in similarities
                ]
            
            elif rec_type == RecommendationType.TRENDING:
                recommendations = await self.generate_trending_recommendations(limit)
            
            elif rec_type == RecommendationType.FREQUENTLY_BOUGHT_TOGETHER and product_id:
                recommendations = await self.generate_frequently_bought_together(product_id, limit)
            
            elif rec_type == RecommendationType.NEW_ARRIVALS:
                conn = self.db_pool.getconn()
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("""
                            SELECT 
                                id as product_id,
                                name as title,
                                price,
                                rating,
                                review_count,
                                created_at
                            FROM products
                            WHERE stock > 0
                            ORDER BY created_at DESC
                            LIMIT %s
                        """, (limit,))
                        recommendations = [dict(row) for row in cur.fetchall()]
                finally:
                    self.db_pool.putconn(conn)
            
            # Add metadata and format response
            response = {
                'recommendations': recommendations[:limit],
                'count': len(recommendations),
                'type': rec_type.value,
                'generated_at': datetime.now().isoformat(),
                'user_id': user_id,
                'product_id': product_id
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            raise
    
    async def update_user_feedback(self, user_id: str, product_id: str, action: str):
        """Update user feedback for recommendation improvement"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO recommendation_feedback 
                    (user_id, product_id, action, created_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (user_id, product_id, action) 
                    DO UPDATE SET created_at = NOW()
                """, (user_id, product_id, action))
                conn.commit()
                
                # Invalidate user profile cache
                cache_key = f"user_profile:{user_id}"
                self.redis_client.delete(cache_key)
        finally:
            self.db_pool.putconn(conn)
    
    async def train_model(self):
        """Periodic model training and optimization"""
        logger.info("Starting model training...")
        
        # Load fresh data
        products = await self.load_product_catalog()
        
        # Rebuild vectors
        await self.build_product_vectors(products)
        
        # Calculate and store product similarities
        similarity_cache = {}
        for product_id in list(products.keys())[:100]:  # Sample for efficiency
            similarities = self.calculate_content_similarity(product_id, 20)
            similarity_cache[product_id] = similarities
        
        # Store in Redis
        for product_id, similarities in similarity_cache.items():
            cache_key = f"product_similarities:{product_id}"
            self.redis_client.setex(
                cache_key,
                86400,  # 24 hours
                json.dumps(similarities)
            )
        
        logger.info("Model training completed")

# Async main execution
async def main():
    # Configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'xarastore',
        'user': 'postgres',
        'password': 'your_password'
    }
    
    redis_config = {
        'host': 'localhost',
        'port': 6379
    }
    
    # Initialize engine
    engine = XarastoreRecommendationEngine(db_config, redis_config)
    
    # Example usage
    try:
        # Get personalized recommendations for user
        recommendations = await engine.get_recommendations(
            user_id="user_123",
            rec_type=RecommendationType.PERSONALIZED,
            limit=10
        )
        
        print(f"Generated {recommendations['count']} recommendations")
        
        # Get similar products
        similar = await engine.get_recommendations(
            product_id="prod_456",
            rec_type=RecommendationType.SIMILAR_PRODUCTS,
            limit=5
        )
        
        print(f"Found {similar['count']} similar products")
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
