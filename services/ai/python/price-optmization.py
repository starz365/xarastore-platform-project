import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import pickle
from dataclasses import dataclass
from enum import Enum
import logging
from scipy import stats
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProductPricingData:
    product_id: str
    current_price: float
    cost_price: float
    competitor_prices: List[float]
    historical_prices: List[Dict[str, Any]]
    demand_metrics: Dict[str, float]
    stock_level: int
    category: str
    brand: str
    rating: float
    review_count: int

@dataclass
class MarketConditions:
    seasonality_factor: float
    competitor_activity: float
    market_demand: float
    economic_index: float
    holiday_effect: float

class PricingStrategy(Enum):
    COST_PLUS = "cost_plus"
    COMPETITIVE = "competitive"
    VALUE_BASED = "value_based"
    DEMAND_BASED = "demand_based"
    PENETRATION = "penetration"
    SKIMMING = "skimming"

class PriceOptimizationEngine:
    def __init__(self, db_config: Dict[str, Any], redis_config: Dict[str, Any]):
        self.db_config = db_config
        self.redis_config = redis_config
        self.redis_client = None
        self.db_pool = None
        self.pricing_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
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
            
            logger.info("Price optimization engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    async def load_product_pricing_data(self, product_id: str) -> Optional[ProductPricingData]:
        """Load comprehensive pricing data for a product"""
        cache_key = f"pricing_data:{product_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            return pickle.loads(cached.encode('latin1'))
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get product details
                cur.execute("""
                    SELECT 
                        p.id, p.price as current_price, p.cost_price,
                        p.stock, p.rating, p.review_count,
                        c.name as category, b.name as brand
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    WHERE p.id = %s
                """, (product_id,))
                
                product = cur.fetchone()
                if not product:
                    return None
                
                # Get historical prices
                cur.execute("""
                    SELECT price, effective_from, effective_to, reason
                    FROM price_history
                    WHERE product_id = %s
                    ORDER BY effective_from DESC
                    LIMIT 100
                """, (product_id,))
                
                historical_prices = [dict(row) for row in cur.fetchall()]
                
                # Get competitor prices (simulated - in production would come from competitor scraping)
                cur.execute("""
                    SELECT competitor_price
                    FROM competitor_prices
                    WHERE product_id = %s
                    AND scraped_at > NOW() - INTERVAL '7 days'
                    ORDER BY scraped_at DESC
                    LIMIT 10
                """, (product_id,))
                
                competitor_prices = [float(row['competitor_price']) for row in cur.fetchall()]
                
                # Get demand metrics
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT pv.id) as views_last_7d,
                        COUNT(DISTINCT oi.id) as purchases_last_7d,
                        COUNT(DISTINCT w.id) as wishlist_adds_last_7d,
                        AVG(oi.quantity) as avg_order_quantity
                    FROM products p
                    LEFT JOIN product_views pv ON p.id = pv.product_id 
                        AND pv.viewed_at > NOW() - INTERVAL '7 days'
                    LEFT JOIN order_items oi ON p.id = oi.product_id 
                        AND oi.created_at > NOW() - INTERVAL '7 days'
                    LEFT JOIN wishlist w ON p.id = w.product_id 
                        AND w.created_at > NOW() - INTERVAL '7 days'
                    WHERE p.id = %s
                    GROUP BY p.id
                """, (product_id,))
                
                demand_row = cur.fetchone()
                demand_metrics = {
                    'views': demand_row['views_last_7d'] or 0,
                    'purchases': demand_row['purchases_last_7d'] or 0,
                    'wishlist_adds': demand_row['wishlist_adds_last_7d'] or 0,
                    'avg_order_quantity': float(demand_row['avg_order_quantity'] or 1)
                }
                
                data = ProductPricingData(
                    product_id=product_id,
                    current_price=float(product['current_price']),
                    cost_price=float(product['cost_price']),
                    competitor_prices=competitor_prices,
                    historical_prices=historical_prices,
                    demand_metrics=demand_metrics,
                    stock_level=product['stock'],
                    category=product['category'],
                    brand=product['brand'],
                    rating=float(product['rating']),
                    review_count=product['review_count']
                )
                
                # Cache for 1 hour
                self.redis_client.setex(
                    cache_key,
                    3600,
                    pickle.dumps(data, protocol=0).decode('latin1')
                )
                
                return data
        finally:
            self.db_pool.putconn(conn)
    
    async def analyze_market_conditions(self) -> MarketConditions:
        """Analyze current market conditions"""
        cache_key = "market_conditions"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            return MarketConditions(**data)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Calculate seasonality factor based on month
                current_month = datetime.now().month
                seasonality_factor = self._calculate_seasonality(current_month)
                
                # Analyze competitor activity
                cur.execute("""
                    SELECT COUNT(*) as price_changes
                    FROM competitor_price_changes
                    WHERE changed_at > NOW() - INTERVAL '3 days'
                """)
                competitor_changes = cur.fetchone()['price_changes'] or 0
                competitor_activity = min(competitor_changes / 100, 1.0)
                
                # Calculate market demand
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT o.id) as total_orders,
                        COUNT(DISTINCT o.id) FILTER (WHERE o.created_at > NOW() - INTERVAL '7 days') as recent_orders
                    FROM orders o
                    WHERE o.status != 'cancelled'
                """)
                demand_row = cur.fetchone()
                total_orders = demand_row['total_orders'] or 1
                recent_orders = demand_row['recent_orders'] or 0
                market_demand = recent_orders / total_orders
                
                # Economic index (simplified - would integrate with economic APIs)
                economic_index = 0.8  # Placeholder
                
                # Holiday effect
                holiday_effect = self._calculate_holiday_effect()
                
                conditions = MarketConditions(
                    seasonality_factor=seasonality_factor,
                    competitor_activity=competitor_activity,
                    market_demand=market_demand,
                    economic_index=economic_index,
                    holiday_effect=holiday_effect
                )
                
                # Cache for 30 minutes
                self.redis_client.setex(cache_key, 1800, json.dumps(conditions.__dict__))
                return conditions
        finally:
            self.db_pool.putconn(conn)
    
    def _calculate_seasonality(self, month: int) -> float:
        """Calculate seasonality factor based on month"""
        # Seasonality multipliers by month (adjust based on product category)
        multipliers = {
            1: 1.1,   # January - post-holiday sales
            2: 0.9,   # February
            3: 1.0,   # March
            4: 1.2,   # April - spring
            5: 1.1,   # May
            6: 1.3,   # June - summer
            7: 1.2,   # July
            8: 0.8,   # August - holiday season
            9: 1.0,   # September - back to school
            10: 1.4,  # October - pre-holiday
            11: 1.5,  # November - holiday shopping
            12: 1.6   # December - peak holiday
        }
        return multipliers.get(month, 1.0)
    
    def _calculate_holiday_effect(self) -> float:
        """Calculate holiday effect multiplier"""
        today = datetime.now().date()
        
        # Major holidays with sales impact
        holidays = {
            (1, 1): 1.3,   # New Year
            (2, 14): 1.4,  # Valentine's
            (4, 1): 1.1,   # Easter
            (5, 1): 1.1,   # Labor Day
            (12, 25): 1.6, # Christmas
            (12, 31): 1.4  # New Year's Eve
        }
        
        for (month, day), multiplier in holidays.items():
            if today.month == month and today.day == day:
                return multiplier
        
        # Check for proximity to holidays (within 7 days)
        for (month, day), multiplier in holidays.items():
            holiday_date = datetime(today.year, month, day).date()
            days_diff = abs((holiday_date - today).days)
            if days_diff <= 7:
                # Linear decay of effect
                return 1.0 + (multiplier - 1.0) * (1 - days_diff / 7)
        
        return 1.0
    
    def calculate_price_elasticity(self, product_data: ProductPricingData) -> float:
        """Calculate price elasticity of demand"""
        # Simplified elasticity calculation
        # In production, would use historical price and sales data
        
        base_factors = {
            'rating': product_data.rating / 5.0,
            'review_count': min(product_data.review_count / 1000, 1.0),
            'demand_level': min(product_data.demand_metrics['views'] / 1000, 1.0),
            'category_competition': 0.7  # Would be calculated from category analysis
        }
        
        # Elasticity formula
        elasticity = 1.5 - sum(base_factors.values()) / len(base_factors)
        
        # Ensure reasonable bounds
        return max(0.5, min(elasticity, 3.0))
    
    async def calculate_optimal_price(
        self,
        product_id: str,
        strategy: PricingStrategy = PricingStrategy.VALUE_BASED,
        target_margin: float = 0.30,
        max_price_change: float = 0.20
    ) -> Dict[str, Any]:
        """Calculate optimal price for a product"""
        # Load product data
        product_data = await self.load_product_pricing_data(product_id)
        if not product_data:
            raise ValueError(f"Product {product_id} not found")
        
        # Load market conditions
        market = await self.analyze_market_conditions()
        
        # Calculate base price based on strategy
        base_price = 0.0
        
        if strategy == PricingStrategy.COST_PLUS:
            base_price = product_data.cost_price * (1 + target_margin)
        
        elif strategy == PricingStrategy.COMPETITIVE:
            if product_data.competitor_prices:
                base_price = np.median(product_data.competitor_prices)
            else:
                base_price = product_data.current_price
        
        elif strategy == PricingStrategy.VALUE_BASED:
            # Value-based pricing considering product quality and brand
            quality_score = (product_data.rating / 5.0) * 0.6 + (min(product_data.review_count / 500, 1.0) * 0.4)
            brand_premium = self._get_brand_premium(product_data.brand)
            
            base_price = product_data.cost_price * (1 + target_margin + (quality_score * 0.3) + brand_premium)
        
        elif strategy == PricingStrategy.DEMAND_BASED:
            # Demand-based pricing
            demand_factor = min(product_data.demand_metrics['views'] / 500, 2.0)
            conversion_rate = product_data.demand_metrics['purchases'] / max(product_data.demand_metrics['views'], 1)
            
            demand_multiplier = 1.0 + (demand_factor * 0.2) + (conversion_rate * 0.3)
            base_price = product_data.current_price * demand_multiplier
        
        elif strategy == PricingStrategy.PENETRATION:
            # Low price to gain market share
            base_price = product_data.cost_price * (1 + target_margin * 0.7)
        
        elif strategy == PricingStrategy.SKIMMING:
            # High price for new/unique products
            base_price = product_data.cost_price * (1 + target_margin * 1.5)
        
        # Apply market conditions
        adjusted_price = base_price * market.seasonality_factor * market.holiday_effect
        
        # Apply elasticity constraints
        elasticity = self.calculate_price_elasticity(product_data)
        
        # Calculate maximum reasonable price increase
        max_increase = product_data.current_price * (1 + max_price_change)
        min_decrease = product_data.current_price * (1 - max_price_change)
        
        # Ensure price is within bounds
        optimal_price = max(min_decrease, min(adjusted_price, max_increase))
        
        # Round to nearest 99 (psychological pricing)
        optimal_price = self._apply_psychological_pricing(optimal_price)
        
        # Calculate metrics
        current_margin = (product_data.current_price - product_data.cost_price) / product_data.current_price
        optimal_margin = (optimal_price - product_data.cost_price) / optimal_price
        
        price_change_pct = (optimal_price - product_data.current_price) / product_data.current_price
        
        # Estimate impact
        estimated_impact = self._estimate_price_impact(
            product_data,
            optimal_price,
            price_change_pct,
            elasticity
        )
        
        return {
            'product_id': product_id,
            'current_price': round(product_data.current_price, 2),
            'optimal_price': round(optimal_price, 2),
            'price_change_percent': round(price_change_pct * 100, 2),
            'current_margin': round(current_margin * 100, 2),
            'optimal_margin': round(optimal_margin * 100, 2),
            'cost_price': round(product_data.cost_price, 2),
            'strategy': strategy.value,
            'elasticity': round(elasticity, 2),
            'market_conditions': market.__dict__,
            'estimated_impact': estimated_impact,
            'confidence_score': self._calculate_confidence_score(product_data),
            'recommended_action': self._get_recommended_action(price_change_pct),
            'calculation_time': datetime.now().isoformat()
        }
    
    def _get_brand_premium(self, brand: str) -> float:
        """Get brand premium multiplier"""
        # In production, would come from brand analysis
        brand_premiums = {
            'Apple': 0.4,
            'Samsung': 0.3,
            'Sony': 0.25,
            'Nike': 0.35,
            'Adidas': 0.3,
            'Generic': 0.0
        }
        return brand_premiums.get(brand, 0.1)
    
    def _apply_psychological_pricing(self, price: float) -> float:
        """Apply psychological pricing principles"""
        if price < 10:
            return round(price, 2)
        elif price < 100:
            # Round to .99
            return np.floor(price) + 0.99
        elif price < 1000:
            # Round to nearest 9.99
            base = np.floor(price / 10) * 10
            return base + 9.99
        else:
            # Round to significant digits
            return round(price, -1)
    
    def _estimate_price_impact(
        self,
        product_data: ProductPricingData,
        new_price: float,
        price_change_pct: float,
        elasticity: float
    ) -> Dict[str, Any]:
        """Estimate impact of price change"""
        # Estimate demand change based on elasticity
        demand_change_pct = -elasticity * price_change_pct
        
        current_demand = product_data.demand_metrics['purchases']
        estimated_demand = current_demand * (1 + demand_change_pct)
        
        current_revenue = product_data.current_price * current_demand
        estimated_revenue = new_price * estimated_demand
        
        current_profit = (product_data.current_price - product_data.cost_price) * current_demand
        estimated_profit = (new_price - product_data.cost_price) * estimated_demand
        
        revenue_change_pct = (estimated_revenue - current_revenue) / current_revenue * 100
        profit_change_pct = (estimated_profit - current_profit) / current_profit * 100
        
        return {
            'demand_change_percent': round(demand_change_pct * 100, 2),
            'estimated_demand': round(estimated_demand, 2),
            'revenue_change_percent': round(revenue_change_pct, 2),
            'profit_change_percent': round(profit_change_pct, 2),
            'break_even_point': self._calculate_break_even(product_data, new_price)
        }
    
    def _calculate_break_even(
        self,
        product_data: ProductPricingData,
        new_price: float
    ) -> Dict[str, Any]:
        """Calculate break-even point for price change"""
        price_diff = new_price - product_data.current_price
        unit_contribution = new_price - product_data.cost_price
        
        if price_diff > 0:
            # Price increase
            lost_sales_tolerance = price_diff / unit_contribution
            break_even_sales_pct = 1 / (1 + lost_sales_tolerance)
        else:
            # Price decrease
            additional_sales_needed = -price_diff / unit_contribution
            break_even_sales_pct = 1 + additional_sales_needed
        
        return {
            'lost_sales_tolerance': round(lost_sales_tolerance if price_diff > 0 else 0, 2),
            'additional_sales_needed': round(additional_sales_needed if price_diff < 0 else 0, 2),
            'break_even_sales_percent': round(break_even_sales_pct * 100, 2)
        }
    
    def _calculate_confidence_score(self, product_data: ProductPricingData) -> float:
        """Calculate confidence score for price recommendation"""
        factors = []
        
        # Data completeness
        if len(product_data.historical_prices) >= 10:
            factors.append(0.9)
        elif len(product_data.historical_prices) >= 5:
            factors.append(0.7)
        else:
            factors.append(0.4)
        
        # Competitor data
        if len(product_data.competitor_prices) >= 5:
            factors.append(0.8)
        elif len(product_data.competitor_prices) >= 2:
            factors.append(0.6)
        else:
            factors.append(0.3)
        
        # Demand data quality
        total_views = product_data.demand_metrics['views']
        if total_views >= 1000:
            factors.append(0.9)
        elif total_views >= 100:
            factors.append(0.7)
        else:
            factors.append(0.4)
        
        # Rating and reviews
        if product_data.review_count >= 50:
            factors.append(0.8)
        elif product_data.review_count >= 10:
            factors.append(0.6)
        else:
            factors.append(0.3)
        
        return round(np.mean(factors) * 100, 2)
    
    def _get_recommended_action(self, price_change_pct: float) -> str:
        """Get recommended action based on price change"""
        if price_change_pct > 0.05:
            return "Increase price - strong positive impact expected"
        elif price_change_pct > 0.02:
            return "Slight price increase - moderate positive impact"
        elif price_change_pct < -0.05:
            return "Decrease price - competitive positioning needed"
        elif price_change_pct < -0.02:
            return "Slight price decrease - demand stimulation"
        else:
            return "Maintain current price - optimal balance achieved"
    
    async def batch_optimize_prices(
        self,
        product_ids: List[str],
        strategy: PricingStrategy = PricingStrategy.VALUE_BASED
    ) -> List[Dict[str, Any]]:
        """Optimize prices for multiple products"""
        results = []
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for product_id in product_ids:
                future = asyncio.get_event_loop().run_in_executor(
                    executor,
                    lambda pid=product_id: asyncio.run(self.calculate_optimal_price(pid, strategy))
                )
                futures.append(future)
            
            for future in futures:
                try:
                    result = await future
                    results.append(result)
                except Exception as e:
                    logger.error(f"Failed to optimize price: {e}")
        
        return results
    
    async def monitor_price_changes(self, days: int = 7) -> Dict[str, Any]:
        """Monitor recent price changes and their impact"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        ph.product_id,
                        p.name as product_name,
                        ph.old_price,
                        ph.new_price,
                        ph.change_percent,
                        ph.reason,
                        ph.changed_at,
                        COUNT(DISTINCT oi.id) FILTER (
                            WHERE oi.created_at BETWEEN ph.changed_at AND ph.changed_at + INTERVAL '7 days'
                        ) as sales_after,
                        COUNT(DISTINCT oi2.id) FILTER (
                            WHERE oi2.created_at BETWEEN ph.changed_at - INTERVAL '7 days' AND ph.changed_at
                        ) as sales_before
                    FROM price_history ph
                    JOIN products p ON ph.product_id = p.id
                    LEFT JOIN order_items oi ON p.id = oi.product_id
                    LEFT JOIN order_items oi2 ON p.id = oi2.product_id
                    WHERE ph.changed_at > NOW() - INTERVAL '%s days'
                    GROUP BY ph.id, p.name
                    ORDER BY ph.changed_at DESC
                """, (days,))
                
                changes = [dict(row) for row in cur.fetchall()]
                
                # Calculate impact metrics
                total_changes = len(changes)
                positive_impact = 0
                negative_impact = 0
                neutral_impact = 0
                
                for change in changes:
                    sales_before = change['sales_before'] or 0
                    sales_after = change['sales_after'] or 0
                    
                    if sales_before > 0:
                        change_pct = (sales_after - sales_before) / sales_before
                        
                        if change_pct > 0.1:
                            positive_impact += 1
                        elif change_pct < -0.1:
                            negative_impact += 1
                        else:
                            neutral_impact += 1
                
                return {
                    'total_changes': total_changes,
                    'positive_impact': positive_impact,
                    'negative_impact': negative_impact,
                    'neutral_impact': neutral_impact,
                    'success_rate': round(positive_impact / max(total_changes, 1) * 100, 2),
                    'changes': changes[:50]  # Limit response size
                }
        finally:
            self.db_pool.putconn(conn)
    
    async def train_prediction_model(self):
        """Train machine learning model for price prediction"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Load training data
                cur.execute("""
                    SELECT 
                        p.id,
                        p.price,
                        p.cost_price,
                        p.rating,
                        p.review_count,
                        c.name as category,
                        b.name as brand,
                        COUNT(DISTINCT pv.id) as views_30d,
                        COUNT(DISTINCT oi.id) as sales_30d,
                        AVG(pr.price) as avg_competitor_price
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN product_views pv ON p.id = pv.product_id 
                        AND pv.viewed_at > NOW() - INTERVAL '30 days'
                    LEFT JOIN order_items oi ON p.id = oi.product_id 
                        AND oi.created_at > NOW() - INTERVAL '30 days'
                    LEFT JOIN competitor_prices pr ON p.id = pr.product_id
                    WHERE p.stock > 0 AND p.price > 0
                    GROUP BY p.id, c.name, b.name
                    HAVING COUNT(DISTINCT oi.id) > 0
                    LIMIT 10000
                """)
                
                data = [dict(row) for row in cur.fetchall()]
                
                if not data:
                    logger.warning("Insufficient data for model training")
                    return
                
                # Prepare features and target
                df = pd.DataFrame(data)
                
                # Encode categorical variables
                df = pd.get_dummies(df, columns=['category', 'brand'], drop_first=True)
                
                # Define features and target
                feature_cols = [col for col in df.columns if col != 'price']
                X = df[feature_cols].fillna(0).values
                y = df['price'].values
                
                # Scale features
                X_scaled = self.scaler.fit_transform(X)
                
                # Train-test split
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42
                )
                
                # Train model
                self.pricing_model.fit(X_train, y_train)
                
                # Evaluate model
                train_score = self.pricing_model.score(X_train, y_train)
                test_score = self.pricing_model.score(X_test, y_test)
                
                logger.info(f"Model trained: Train R²={train_score:.3f}, Test R²={test_score:.3f}")
                
                # Save model
                model_path = '/tmp/price_prediction_model.pkl'
                with open(model_path, 'wb') as f:
                    pickle.dump({
                        'model': self.pricing_model,
                        'scaler': self.scaler,
                        'feature_cols': feature_cols
                    }, f)
                
                logger.info(f"Model saved to {model_path}")
                
        finally:
            self.db_pool.putconn(conn)

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
    engine = PriceOptimizationEngine(db_config, redis_config)
    
    try:
        # Example: Optimize price for a product
        result = await engine.calculate_optimal_price(
            product_id="prod_123",
            strategy=PricingStrategy.VALUE_BASED,
            target_margin=0.35,
            max_price_change=0.15
        )
        
        print(f"Current price: KES {result['current_price']}")
        print(f"Optimal price: KES {result['optimal_price']}")
        print(f"Recommended: {result['recommended_action']}")
        print(f"Confidence: {result['confidence_score']}%")
        
        # Batch optimization example
        products = ["prod_123", "prod_456", "prod_789"]
        batch_results = await engine.batch_optimize_prices(
            product_ids=products,
            strategy=PricingStrategy.COMPETITIVE
        )
        
        print(f"\nBatch optimized {len(batch_results)} products")
        
        # Monitor recent changes
        monitoring = await engine.monitor_price_changes(days=7)
        print(f"\nPrice change success rate: {monitoring['success_rate']}%")
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
