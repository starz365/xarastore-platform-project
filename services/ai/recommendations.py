from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from collections import defaultdict
import redis
import os

class ProductRecommender:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=True
        )
        
    async def get_user_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get personalized product recommendations for a user
        """
        try:
            # Check cache first
            cache_key = f"recs:{user_id}"
            cached = self.redis_client.get(cache_key)
            
            if cached:
                return json.loads(cached)
            
            # Get user data
            user_data = await self.get_user_data(user_id)
            
            # Generate recommendations
            recommendations = await self.generate_recommendations(user_data, limit)
            
            # Cache results for 1 hour
            self.redis_client.setex(
                cache_key,
                3600,
                json.dumps(recommendations)
            )
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return await self.get_popular_products(limit)
    
    async def get_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Get user data for recommendation engine
        """
        # In production, this would query your database
        # This is a simplified implementation
        
        return {
            "user_id": user_id,
            "recent_views": await self.get_recent_views(user_id),
            "purchase_history": await self.get_purchase_history(user_id),
            "wishlist_items": await self.get_wishlist_items(user_id),
            "browsing_history": await self.get_browsing_history(user_id),
        }
    
    async def generate_recommendations(self, user_data: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
        """
        Generate personalized recommendations using multiple strategies
        """
        recommendations = []
        
        # Strategy 1: Based on recent views
        recent_recs = await self.get_similar_to_recent_views(
            user_data["recent_views"],
            limit=limit//3
        )
        recommendations.extend(recent_recs)
        
        # Strategy 2: Based on purchase history
        purchase_recs = await self.get_complementary_products(
            user_data["purchase_history"],
            limit=limit//3
        )
        recommendations.extend(purchase_recs)
        
        # Strategy 3: Based on wishlist
        wishlist_recs = await self.get_similar_to_wishlist(
            user_data["wishlist_items"],
            limit=limit//3
        )
        recommendations.extend(wishlist_recs)
        
        # Strategy 4: Popular in user's preferred categories
        category_recs = await self.get_popular_in_categories(
            user_data,
            limit=limit//3
        )
        recommendations.extend(category_recs)
        
        # Remove duplicates and rank
        unique_recs = self.remove_duplicates(recommendations)
        ranked_recs = self.rank_recommendations(unique_recs, user_data)
        
        return ranked_recs[:limit]
    
    async def get_similar_to_recent_views(self, recent_views: List[str], limit: int) -> List[Dict[str, Any]]:
        """
        Get products similar to recently viewed items
        """
        if not recent_views:
            return []
        
        # In production, this would use a machine learning model
        # or collaborative filtering
        
        similar_products = []
        for product_id in recent_views[:5]:  # Consider last 5 views
            # Get product details
            product = await self.get_product_details(product_id)
            if not product:
                continue
            
            # Find similar products by category, brand, price range
            similar = await self.find_similar_products(
                category_id=product["category_id"],
                brand_id=product["brand_id"],
                price_range=(product["price"] * 0.5, product["price"] * 1.5),
                exclude_ids=[product_id] + recent_views,
                limit=3
            )
            similar_products.extend(similar)
        
        return similar_products[:limit]
    
    async def get_complementary_products(self, purchase_history: List[str], limit: int) -> List[Dict[str, Any]]:
        """
        Get products that complement purchased items
        """
        if not purchase_history:
            return []
        
        complementary = []
        for product_id in purchase_history[-10:]:  # Last 10 purchases
            product = await self.get_product_details(product_id)
            if not product:
                continue
            
            # Find complementary products (accessories, related items)
            complementary_items = await self.find_complementary_products(
                product_id=product_id,
                category_id=product["category_id"],
                limit=2
            )
            complementary.extend(complementary_items)
        
        return complementary[:limit]
    
    async def get_similar_to_wishlist(self, wishlist_items: List[str], limit: int) -> List[Dict[str, Any]]:
        """
        Get products similar to wishlist items
        """
        if not wishlist_items:
            return []
        
        similar = []
        for product_id in wishlist_items:
            product = await self.get_product_details(product_id)
            if not product:
                continue
            
            # Find similar but cheaper alternatives
            similar_items = await self.find_alternative_products(
                product_id=product_id,
                max_price=product["price"] * 0.8,  # 20% cheaper
                limit=2
            )
            similar.extend(similar_items)
        
        return similar[:limit]
    
    async def get_popular_in_categories(self, user_data: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
        """
        Get popular products in user's preferred categories
        """
        # Analyze user's preferred categories
        preferred_categories = self.analyze_preferred_categories(user_data)
        
        if not preferred_categories:
            return await self.get_trending_products(limit)
        
        popular_products = []
        for category_id, score in preferred_categories[:3]:  # Top 3 categories
            products = await self.get_popular_in_category(category_id, limit=2)
            popular_products.extend(products)
        
        return popular_products[:limit]
    
    def analyze_preferred_categories(self, user_data: Dict[str, Any]) -> List[tuple]:
        """
        Analyze user behavior to determine preferred categories
        """
        category_scores = defaultdict(int)
        
        # Score categories based on views
        for view in user_data.get("recent_views", []):
            category_scores[view.get("category_id")] += 1
        
        # Score categories based on purchases
        for purchase in user_data.get("purchase_history", []):
            category_scores[purchase.get("category_id")] += 3
        
        # Score categories based on wishlist
        for wish in user_data.get("wishlist_items", []):
            category_scores[wish.get("category_id")] += 2
        
        # Sort by score
        sorted_categories = sorted(
            category_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return sorted_categories
    
    async def get_popular_products(self, limit: int) -> List[Dict[str, Any]]:
        """
        Get currently popular products across the platform
        """
        # In production, this would query your database
        # This returns mock data for demonstration
        
        return [
            {
                "id": "popular_1",
                "name": "Popular Product 1",
                "price": 2999,
                "rating": 4.5,
                "image_url": "/products/popular1.jpg",
                "category": "Electronics",
                "reason": "Trending Now"
            },
            {
                "id": "popular_2",
                "name": "Popular Product 2",
                "price": 1499,
                "rating": 4.2,
                "image_url": "/products/popular2.jpg",
                "category": "Fashion",
                "reason": "Best Seller"
            }
        ][:limit]
    
    async def get_trending_products(self, limit: int) -> List[Dict[str, Any]]:
        """
        Get trending products (recently popular)
        """
        # This would analyze recent sales, views, and engagement
        return await self.get_popular_products(limit)
    
    def remove_duplicates(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate products from recommendations
        """
        seen = set()
        unique = []
        
        for product in products:
            product_id = product.get("id")
            if product_id and product_id not in seen:
                seen.add(product_id)
                unique.append(product)
        
        return unique
    
    def rank_recommendations(self, products: List[Dict[str, Any]], user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Rank recommendations based on relevance
        """
        scored_products = []
        
        for product in products:
            score = self.calculate_relevance_score(product, user_data)
            scored_products.append((score, product))
        
        # Sort by score descending
        scored_products.sort(key=lambda x: x[0], reverse=True)
        
        return [product for _, product in scored_products]
    
    def calculate_relevance_score(self, product: Dict[str, Any], user_data: Dict[str, Any]) -> float:
        """
        Calculate relevance score for a product
        """
        score = 0.0
        
        # Boost score if in user's preferred category
        preferred_categories = [cat[0] for cat in self.analyze_preferred_categories(user_data)[:3]]
        if product.get("category_id") in preferred_categories:
            score += 2.0
        
        # Boost score based on rating
        rating = product.get("rating", 0)
        score += rating * 0.5
        
        # Boost score if price is in user's typical range
        typical_price_range = self.get_user_price_range(user_data)
        price = product.get("price", 0)
        if typical_price_range[0] <= price <= typical_price_range[1]:
            score += 1.0
        
        # Penalize if user has recently viewed this
        recent_view_ids = [view.get("id") for view in user_data.get("recent_views", [])]
        if product.get("id") in recent_view_ids:
            score -= 0.5
        
        return score
    
    def get_user_price_range(self, user_data: Dict[str, Any]) -> tuple:
        """
        Determine user's typical price range
        """
        purchase_prices = [
            purchase.get("price", 0)
            for purchase in user_data.get("purchase_history", [])
        ]
        
        if purchase_prices:
            avg_price = sum(purchase_prices) / len(purchase_prices)
            return (avg_price * 0.5, avg_price * 1.5)
        
        # Default range for new users
        return (500, 5000)
    
    # Database query methods (simplified for demonstration)
    async def get_product_details(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product details from database"""
        # This would query your database in production
        return None
    
    async def find_similar_products(self, category_id: str, brand_id: str, 
                                   price_range: tuple, exclude_ids: List[str], 
                                   limit: int) -> List[Dict[str, Any]]:
        """Find similar products"""
        return []
    
    async def find_complementary_products(self, product_id: str, category_id: str, 
                                         limit: int) -> List[Dict[str, Any]]:
        """Find complementary products"""
        return []
    
    async def find_alternative_products(self, product_id: str, max_price: float, 
                                       limit: int) -> List[Dict[str, Any]]:
        """Find cheaper alternative products"""
        return []
    
    async def get_popular_in_category(self, category_id: str, limit: int) -> List[Dict[str, Any]]:
        """Get popular products in a category"""
        return []
    
    async def get_recent_views(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's recently viewed products"""
        return []
    
    async def get_purchase_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's purchase history"""
        return []
    
    async def get_wishlist_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's wishlist items"""
        return []
    
    async def get_browsing_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's browsing history"""
        return []


class SearchIntentAnalyzer:
    def __init__(self):
        self.intent_keywords = {
            "buy": ["buy", "purchase", "shop", "order", "get"],
            "compare": ["compare", "vs", "versus", "difference", "which"],
            "review": ["review", "rating", "opinion", "experience", "thoughts"],
            "price": ["price", "cost", "expensive", "cheap", "affordable", "discount"],
            "specs": ["specs", "specifications", "features", "details", "technical"],
            "availability": ["available", "stock", "in stock", "delivery", "shipping"],
        }
    
    def analyze_query(self, query: str) -> Dict[str, float]:
        """
        Analyze search query to determine user intent
        Returns intent scores for different categories
        """
        query_lower = query.lower()
        scores = {}
        
        for intent, keywords in self.intent_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in query_lower:
                    score += 1
            scores[intent] = score / len(keywords)  # Normalize
        
        return scores
    
    def get_primary_intent(self, query: str) -> str:
        """
        Get the primary intent of a search query
        """
        scores = self.analyze_query(query)
        
        if not scores:
            return "browse"
        
        # Return intent with highest score
        return max(scores.items(), key=lambda x: x[1])[0]
    
    def suggest_refinements(self, query: str, intent: str) -> List[str]:
        """
        Suggest search refinements based on intent
        """
        suggestions = []
        
        if intent == "buy":
            suggestions = [
                f"{query} best price",
                f"{query} on sale",
                f"{query} free delivery",
            ]
        elif intent == "compare":
            suggestions = [
                f"{query} vs alternatives",
                f"{query} comparison chart",
                f"best {query.split()[0]} 2024",
            ]
        elif intent == "review":
            suggestions = [
                f"{query} customer reviews",
                f"{query} pros and cons",
                f"is {query} worth it",
            ]
        elif intent == "price":
            suggestions = [
                f"{query} under 10000",
                f"{query} price in Kenya",
                f"cheap {query}",
            ]
        
        return suggestions[:3]p
