import openai
import anthropic
import cohere
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta
import json
import pickle
import re
import asyncio
import aiohttp
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import hashlib
from concurrent.futures import ThreadPoolExecutor
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter, deque
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

@dataclass
class CustomerMessage:
    message_id: str
    session_id: str
    user_id: Optional[str]
    message: str
    timestamp: datetime
    message_type: str  # text, image, file
    metadata: Dict[str, Any]
    sentiment: Optional[float] = None
    intent: Optional[str] = None
    entities: List[Dict[str, Any]] = None

@dataclass
class AssistantResponse:
    response_id: str
    session_id: str
    message: str
    timestamp: datetime
    confidence: float
    sources: List[Dict[str, Any]]
    suggested_actions: List[str]
    metadata: Dict[str, Any]

@dataclass
class ConversationContext:
    session_id: str
    user_id: Optional[str]
    conversation_history: List[Dict[str, Any]]
    user_profile: Dict[str, Any]
    conversation_state: Dict[str, Any]
    started_at: datetime
    last_activity: datetime
    message_count: int
    sentiment_trend: float

class ChatIntent(Enum):
    PRODUCT_INQUIRY = "product_inquiry"
    ORDER_STATUS = "order_status"
    RETURN_REFUND = "return_refund"
    ACCOUNT_HELP = "account_help"
    PAYMENT_ISSUE = "payment_issue"
    DELIVERY_QUERY = "delivery_query"
    TECHNICAL_SUPPORT = "technical_support"
    COMPLAINT = "complaint"
    GENERAL_QUESTION = "general_question"
    PRICING_QUESTION = "pricing_question"

class ResponseSource(Enum):
    KNOWLEDGE_BASE = "knowledge_base"
    ORDER_HISTORY = "order_history"
    PRODUCT_CATALOG = "product_catalog"
    POLICY_DOCS = "policy_docs"
    AI_GENERATED = "ai_generated"
    HUMAN_AGENT = "human_agent"

class ChatSupportEngine:
    def __init__(
        self, 
        db_config: Dict[str, Any], 
        redis_config: Dict[str, Any],
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        cohere_api_key: Optional[str] = None
    ):
        self.db_config = db_config
        self.redis_config = redis_config
        self.openai_api_key = openai_api_key
        self.anthropic_api_key = anthropic_api_key
        self.cohere_api_key = cohere_api_key
        
        # Initialize API clients
        if openai_api_key:
            openai.api_key = openai_api_key
        if anthropic_api_key:
            self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
        if cohere_api_key:
            self.cohere_client = cohere.Client(cohere_api_key)
        
        # Conversation management
        self.active_sessions = {}
        self.conversation_timeout = 1800  # 30 minutes
        
        # Knowledge base cache
        self.knowledge_base = {}
        self.faq_embeddings = {}
        
        # Stop words for text processing
        self.stop_words = set(stopwords.words('english'))
        
        # Intent keywords
        self.intent_keywords = {
            ChatIntent.PRODUCT_INQUIRY: [
                'product', 'item', 'buy', 'purchase', 'available', 'stock', 'price',
                'specifications', 'features', 'compare', 'recommend', 'looking for'
            ],
            ChatIntent.ORDER_STATUS: [
                'order', 'status', 'tracking', 'where is', 'when will', 'delivery',
                'shipped', 'dispatched', 'track', 'order number', 'confirmation'
            ],
            ChatIntent.RETURN_REFUND: [
                'return', 'refund', 'exchange', 'damaged', 'broken', 'not working',
                'wrong item', 'size', 'color', 'cancel', 'refund policy', 'return policy'
            ],
            ChatIntent.ACCOUNT_HELP: [
                'account', 'login', 'password', 'sign up', 'register', 'profile',
                'email', 'phone', 'verification', 'security', 'delete account'
            ],
            ChatIntent.PAYMENT_ISSUE: [
                'payment', 'paid', 'charge', 'transaction', 'failed', 'declined',
                'refund', 'mpesa', 'card', 'payment method', 'invoice', 'receipt'
            ],
            ChatIntent.DELIVERY_QUERY: [
                'delivery', 'shipping', 'arrive', 'time', 'date', 'address',
                'location', 'pickup', 'courier', 'shipment', 'delivery charge'
            ],
            ChatIntent.TECHNICAL_SUPPORT: [
                'technical', 'problem', 'issue', 'error', 'bug', 'not working',
                'website', 'app', 'mobile', 'slow', 'crash', 'technical support'
            ],
            ChatIntent.COMPLAINT: [
                'complaint', 'angry', 'disappointed', 'bad', 'poor', 'terrible',
                'awful', 'never again', 'worst', 'horrible', 'unhappy', 'dissatisfied'
            ],
            ChatIntent.PRICING_QUESTION: [
                'price', 'cost', 'expensive', 'cheap', 'discount', 'offer',
                'sale', 'promotion', 'coupon', 'voucher', 'deal', 'price match'
            ]
        }
        
        # Response templates
        self.response_templates = {
            'greeting': [
                "Hello! Welcome to Xarastore support. How can I help you today?",
                "Hi there! I'm here to assist you with anything about Xarastore. What can I do for you?",
                "Welcome to Xarastore customer support! How may I assist you today?"
            ],
            'product_inquiry': [
                "I can help you with product information. Could you tell me which product you're interested in?",
                "I'd be happy to provide product details. Do you have a specific product in mind?",
                "Let me help you find information about our products. What product are you looking for?"
            ],
            'order_status': [
                "I can check your order status for you. Please provide your order number.",
                "To look up your order status, I'll need your order number.",
                "I'll help you track your order. Could you share your order number with me?"
            ],
            'escalation': [
                "I understand this is important. Let me connect you with a human agent who can help further.",
                "This requires specialized attention. I'll transfer you to one of our support agents.",
                "For this specific issue, I recommend speaking with our support team directly."
            ],
            'fallback': [
                "I'm not sure I understand. Could you provide more details?",
                "Let me make sure I understand correctly. Could you rephrase your question?",
                "I want to make sure I help you properly. Could you elaborate on what you need?"
            ]
        }
        
        self.initialize_connections()
        self.load_knowledge_base()
    
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
            
            logger.info("Chat support engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    async def load_knowledge_base(self):
        """Load knowledge base from database"""
        try:
            conn = self.db_pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Load FAQs
                cur.execute("""
                    SELECT 
                        id, question, answer, category, 
                        tags, helpful_count, updated_at
                    FROM faqs
                    WHERE is_active = true
                    ORDER BY helpful_count DESC
                """)
                
                faqs = cur.fetchall()
                self.knowledge_base['faqs'] = [dict(faq) for faq in faqs]
                
                # Load policies
                cur.execute("""
                    SELECT 
                        id, title, content, category,
                        effective_date, updated_at
                    FROM policies
                    WHERE is_active = true
                    ORDER BY updated_at DESC
                """)
                
                policies = cur.fetchall()
                self.knowledge_base['policies'] = [dict(policy) for policy in policies]
                
                # Load product categories
                cur.execute("""
                    SELECT id, name, description, product_count
                    FROM categories
                    WHERE product_count > 0
                    ORDER BY product_count DESC
                """)
                
                categories = cur.fetchall()
                self.knowledge_base['categories'] = [dict(cat) for cat in categories]
                
                logger.info(f"Loaded knowledge base: {len(faqs)} FAQs, {len(policies)} policies")
                
            # Cache in Redis
            self.redis_client.setex(
                'knowledge_base',
                3600,  # 1 hour
                json.dumps(self.knowledge_base)
            )
            
        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")
        finally:
            self.db_pool.putconn(conn)
    
    def preprocess_message(self, message: str) -> str:
        """Preprocess chat message for analysis"""
        if not message:
            return ""
        
        # Convert to lowercase
        message = message.lower()
        
        # Remove URLs
        message = re.sub(r'https?://\S+|www\.\S+', '', message)
        
        # Remove special characters (keep basic punctuation)
        message = re.sub(r'[^\w\s.,!?]', '', message)
        
        # Remove extra whitespace
        message = re.sub(r'\s+', ' ', message).strip()
        
        return message
    
    def extract_entities(self, message: str) -> List[Dict[str, Any]]:
        """Extract entities from message"""
        entities = []
        
        # Extract order numbers (patterns like ORD-1234, #1234, order 1234)
        order_patterns = [
            r'ORD[_-]?(\d+)',
            r'#(\d+)',
            r'order\s+(\d+)',
            r'order\s+number\s+(\d+)'
        ]
        
        for pattern in order_patterns:
            matches = re.finditer(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'order_number',
                    'value': match.group(1),
                    'confidence': 0.9,
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Extract product IDs (patterns like PROD-123, SKU-123)
        product_patterns = [
            r'PROD[_-]?(\w+)',
            r'SKU[_-]?(\w+)',
            r'product\s+(\w+)'
        ]
        
        for pattern in product_patterns:
            matches = re.finditer(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'product_id',
                    'value': match.group(1),
                    'confidence': 0.8,
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Extract amounts (KES 1000, 1000 KES, $100)
        amount_patterns = [
            r'KES\s*(\d+(?:\.\d{1,2})?)',
            r'(\d+(?:\.\d{1,2})?)\s*KES',
            r'\$(\d+(?:\.\d{1,2})?)',
            r'(\d+(?:\.\d{1,2})?)\s*dollars'
        ]
        
        for pattern in amount_patterns:
            matches = re.finditer(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'amount',
                    'value': float(match.group(1)),
                    'currency': 'KES' if 'KES' in match.group(0) else 'USD',
                    'confidence': 0.85,
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Extract dates (today, tomorrow, 2024-01-01)
        date_patterns = [
            r'today|tomorrow|yesterday',
            r'\d{4}-\d{2}-\d{2}',
            r'\d{2}/\d{2}/\d{4}'
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'date',
                    'value': match.group(0),
                    'confidence': 0.7,
                    'start': match.start(),
                    'end': match.end()
                })
        
        return entities
    
    def detect_intent(self, message: str, entities: List[Dict[str, Any]]) -> Tuple[str, float]:
        """Detect intent from message"""
        message_lower = message.lower()
        
        # Score each intent
        intent_scores = {}
        
        for intent, keywords in self.intent_keywords.items():
            score = 0.0
            
            # Keyword matching
            for keyword in keywords:
                if keyword in message_lower:
                    score += 1.0
            
            # Entity-based scoring
            for entity in entities:
                if entity['type'] == 'order_number' and intent == ChatIntent.ORDER_STATUS:
                    score += 2.0
                elif entity['type'] == 'product_id' and intent == ChatIntent.PRODUCT_INQUIRY:
                    score += 1.5
                elif entity['type'] == 'amount' and intent == ChatIntent.PRICING_QUESTION:
                    score += 1.0
            
            # Normalize score
            intent_scores[intent.value] = min(score / 5, 1.0)  # Cap at 1.0
        
        # Get highest scoring intent
        if intent_scores:
            best_intent = max(intent_scores.items(), key=lambda x: x[1])
            if best_intent[1] > 0.3:
                return best_intent[0], best_intent[1]
        
        # Default to general question
        return ChatIntent.GENERAL_QUESTION.value, 0.3
    
    def analyze_sentiment(self, message: str) -> float:
        """Analyze sentiment of message (-1 to 1)"""
        message_lower = message.lower()
        
        # Sentiment keywords
        positive_words = [
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect',
            'happy', 'satisfied', 'pleased', 'thanks', 'thank you', 'helpful',
            'quick', 'fast', 'easy', 'love', 'awesome', 'fantastic'
        ]
        
        negative_words = [
            'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor',
            'angry', 'upset', 'disappointed', 'frustrated', 'annoyed',
            'slow', 'difficult', 'complicated', 'hate', 'useless',
            'broken', 'damaged', 'wrong', 'error', 'failed'
        ]
        
        # Count occurrences
        positive_count = sum(1 for word in positive_words if word in message_lower)
        negative_count = sum(1 for word in negative_words if word in message_lower)
        
        # Calculate sentiment score
        total_words = len(message_lower.split())
        if total_words > 0:
            sentiment = (positive_count - negative_count) / total_words
        else:
            sentiment = 0.0
        
        # Normalize to [-1, 1]
        return max(-1.0, min(1.0, sentiment))
    
    async def get_or_create_context(self, session_id: str, user_id: Optional[str] = None) -> ConversationContext:
        """Get or create conversation context"""
        cache_key = f"chat_context:{session_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['started_at'] = datetime.fromisoformat(data['started_at'])
            data['last_activity'] = datetime.fromisoformat(data['last_activity'])
            return ConversationContext(**data)
        
        # Load user profile if user_id provided
        user_profile = {}
        if user_id:
            user_profile = await self.load_user_profile(user_id)
        
        # Create new context
        now = datetime.now()
        context = ConversationContext(
            session_id=session_id,
            user_id=user_id,
            conversation_history=[],
            user_profile=user_profile,
            conversation_state={
                'current_intent': None,
                'awaiting_input': None,
                'retry_count': 0,
                'escalation_level': 0
            },
            started_at=now,
            last_activity=now,
            message_count=0,
            sentiment_trend=0.0
        )
        
        # Cache context
        self._cache_context(context)
        
        return context
    
    async def load_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Load user profile for personalized responses"""
        cache_key = f"user_profile:{user_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user details
                cur.execute("""
                    SELECT 
                        u.id, u.email, u.full_name, u.phone,
                        u.created_at, COUNT(DISTINCT o.id) as order_count,
                        COALESCE(SUM(o.total_amount), 0) as total_spent,
                        COUNT(DISTINCT r.id) as review_count,
                        COUNT(DISTINCT w.id) as wishlist_count
                    FROM users u
                    LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'delivered'
                    LEFT JOIN reviews r ON u.id = r.user_id
                    LEFT JOIN wishlist w ON u.id = w.user_id
                    WHERE u.id = %s
                    GROUP BY u.id
                """, (user_id,))
                
                user_data = cur.fetchone()
                
                if user_data:
                    profile = dict(user_data)
                    
                    # Get recent orders
                    cur.execute("""
                        SELECT 
                            id, order_number, total_amount, status,
                            created_at, estimated_delivery
                        FROM orders
                        WHERE user_id = %s
                        ORDER BY created_at DESC
                        LIMIT 5
                    """, (user_id,))
                    
                    recent_orders = [dict(row) for row in cur.fetchall()]
                    profile['recent_orders'] = recent_orders
                    
                    # Get frequently purchased categories
                    cur.execute("""
                        SELECT 
                            c.name as category,
                            COUNT(DISTINCT oi.product_id) as product_count
                        FROM order_items oi
                        JOIN orders o ON oi.order_id = o.id
                        JOIN products p ON oi.product_id = p.id
                        JOIN categories c ON p.category_id = c.id
                        WHERE o.user_id = %s
                        GROUP BY c.name
                        ORDER BY product_count DESC
                        LIMIT 3
                    """, (user_id,))
                    
                    frequent_categories = [dict(row) for row in cur.fetchall()]
                    profile['frequent_categories'] = frequent_categories
                    
                    # Cache for 1 hour
                    self.redis_client.setex(cache_key, 3600, json.dumps(profile))
                    
                    return profile
                else:
                    return {}
        finally:
            self.db_pool.putconn(conn)
    
    def _cache_context(self, context: ConversationContext):
        """Cache conversation context"""
        cache_key = f"chat_context:{context.session_id}"
        
        context_data = asdict(context)
        context_data['started_at'] = context_data['started_at'].isoformat()
        context_data['last_activity'] = context_data['last_activity'].isoformat()
        
        self.redis_client.setex(cache_key, self.conversation_timeout, json.dumps(context_data))
    
    async def search_knowledge_base(self, query: str, intent: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search knowledge base for relevant information"""
        results = []
        
        # Search FAQs
        if 'faqs' in self.knowledge_base:
            for faq in self.knowledge_base['faqs']:
                # Simple keyword matching
                query_words = set(query.lower().split())
                faq_text = f"{faq['question']} {faq['answer']}".lower()
                faq_words = set(faq_text.split())
                
                # Calculate overlap
                overlap = len(query_words.intersection(faq_words))
                if overlap > 0:
                    score = overlap / len(query_words)
                    if score > 0.3:  # Relevance threshold
                        results.append({
                            'source': ResponseSource.KNOWLEDGE_BASE.value,
                            'type': 'faq',
                            'content': faq['answer'],
                            'question': faq['question'],
                            'category': faq.get('category'),
                            'score': score,
                            'metadata': {
                                'helpful_count': faq.get('helpful_count', 0),
                                'updated_at': faq.get('updated_at')
                            }
                        })
        
        # Search policies based on intent
        if 'policies' in self.knowledge_base:
            intent_to_policy_category = {
                ChatIntent.RETURN_REFUND.value: ['returns', 'refunds'],
                ChatIntent.PAYMENT_ISSUE.value: ['payments', 'refunds'],
                ChatIntent.DELIVERY_QUERY.value: ['shipping', 'delivery'],
                ChatIntent.ACCOUNT_HELP.value: ['account', 'privacy']
            }
            
            relevant_categories = intent_to_policy_category.get(intent, [])
            
            for policy in self.knowledge_base['policies']:
                if any(cat in policy.get('category', '').lower() for cat in relevant_categories):
                    # Check for keyword matches
                    query_lower = query.lower()
                    policy_text = policy['content'].lower()
                    
                    if any(word in policy_text for word in query_lower.split()[:5]):
                        results.append({
                            'source': ResponseSource.KNOWLEDGE_BASE.value,
                            'type': 'policy',
                            'content': policy['content'][:500],  # Truncate
                            'title': policy['title'],
                            'category': policy.get('category'),
                            'score': 0.7,  # High score for policy matches
                            'metadata': {
                                'effective_date': policy.get('effective_date'),
                                'updated_at': policy.get('updated_at')
                            }
                        })
        
        # Sort by score and limit results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
    
    async def search_product_catalog(self, query: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Search product catalog based on query"""
        results = []
        
        # Extract product-related entities
        product_entities = [e for e in entities if e['type'] == 'product_id']
        product_keywords = query.lower().split()
        
        if not product_entities and len(product_keywords) < 2:
            return results
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build search query
                search_conditions = []
                search_params = []
                
                # Search by product ID
                for entity in product_entities:
                    search_conditions.append("p.id = %s")
                    search_params.append(entity['value'])
                
                # Search by keywords
                for keyword in product_keywords:
                    if len(keyword) > 2:  # Ignore very short words
                        search_conditions.append("(p.name ILIKE %s OR p.description ILIKE %s)")
                        search_params.append(f"%{keyword}%")
                        search_params.append(f"%{keyword}%")
                
                if search_conditions:
                    where_clause = " OR ".join(search_conditions)
                    
                    cur.execute(f"""
                        SELECT 
                            p.id, p.name, p.description, p.price,
                            p.rating, p.review_count, p.stock,
                            c.name as category, b.name as brand,
                            p.images[1] as image_url
                        FROM products p
                        LEFT JOIN categories c ON p.category_id = c.id
                        LEFT JOIN brands b ON p.brand_id = b.id
                        WHERE ({where_clause})
                        AND p.stock > 0
                        LIMIT 5
                    """, search_params)
                    
                    products = cur.fetchall()
                    
                    for product in products:
                        results.append({
                            'source': ResponseSource.PRODUCT_CATALOG.value,
                            'type': 'product',
                            'content': product['description'][:300] if product['description'] else '',
                            'title': product['name'],
                            'price': float(product['price']),
                            'rating': float(product['rating']),
                            'stock': product['stock'],
                            'category': product['category'],
                            'brand': product['brand'],
                            'image_url': product['image_url'],
                            'score': 0.8,
                            'metadata': {
                                'product_id': product['id'],
                                'review_count': product['review_count']
                            }
                        })
        
        finally:
            self.db_pool.putconn(conn)
        
        return results
    
    async def check_order_status(self, order_number: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Check order status"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT 
                        o.id, o.order_number, o.total_amount, o.status,
                        o.created_at, o.estimated_delivery,
                        o.shipping_address, o.payment_method,
                        COUNT(oi.id) as item_count,
                        ARRAY_AGG(DISTINCT p.name) as product_names
                    FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE o.order_number = %s
                """
                params = [order_number]
                
                if user_id:
                    query += " AND o.user_id = %s"
                    params.append(user_id)
                
                query += " GROUP BY o.id LIMIT 1"
                
                cur.execute(query, params)
                order = cur.fetchone()
                
                if order:
                    return dict(order)
                else:
                    return None
        finally:
            self.db_pool.putconn(conn)
    
    async def generate_ai_response(
        self, 
        query: str, 
        context: ConversationContext, 
        sources: List[Dict[str, Any]]
    ) -> str:
        """Generate AI-powered response"""
        # Prepare conversation history
        history_text = ""
        for msg in context.conversation_history[-5:]:  # Last 5 messages
            role = "User" if msg['type'] == 'user' else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
        
        # Prepare source information
        source_text = ""
        for source in sources:
            if source['type'] == 'faq':
                source_text += f"FAQ: {source['question']}\nAnswer: {source['content'][:200]}\n\n"
            elif source['type'] == 'policy':
                source_text += f"Policy: {source['title']}\nContent: {source['content'][:200]}\n\n"
            elif source['type'] == 'product':
                source_text += f"Product: {source['title']}\nDescription: {source['content'][:200]}\n"
                source_text += f"Price: KES {source['price']:,}\n"
                if source.get('stock', 0) > 0:
                    source_text += f"Stock: Available ({source['stock']} units)\n\n"
                else:
                    source_text += "Stock: Out of stock\n\n"
            elif source['type'] == 'order':
                source_text += f"Order: {source['order_number']}\n"
                source_text += f"Status: {source['status']}\n"
                source_text += f"Items: {', '.join(source['product_names'][:3])}\n"
                source_text += f"Total: KES {source['total_amount']:,}\n\n"
        
        # Prepare system prompt
        system_prompt = f"""You are Xarastore AI Assistant, a helpful customer support chatbot for Xarastore e-commerce platform in Kenya.

Context:
- Platform: Xarastore ("it's a deal")
- Currency: Kenyan Shillings (KES)
- Location: Kenya

Instructions:
1. Be helpful, friendly, and professional
2. Use natural, conversational language
3. Reference provided sources when relevant
4. If unsure, ask for clarification
5. Keep responses concise (2-3 sentences typically)
6. Use Kenyan English and local context when appropriate
7. Always maintain brand voice: helpful, trustworthy, deal-focused

Previous conversation:
{history_text}

Available information:
{source_text}

User's current query: {query}

Generate a helpful response:"""
        
        try:
            # Try OpenAI first
            if self.openai_api_key:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": query}
                    ],
                    temperature=0.7,
                    max_tokens=200
                )
                return response.choices[0].message.content.strip()
            
            # Try Anthropic
            elif hasattr(self, 'anthropic_client'):
                response = self.anthropic_client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": query}
                    ]
                )
                return response.content[0].text
            
            # Try Cohere
            elif hasattr(self, 'cohere_client'):
                response = self.cohere_client.generate(
                    model='command',
                    prompt=f"{system_prompt}\n\nQuery: {query}\n\nResponse:",
                    max_tokens=200,
                    temperature=0.7
                )
                return response.generations[0].text.strip()
            
            # Fallback to rule-based response
            else:
                return self._generate_fallback_response(query, context, sources)
                
        except Exception as e:
            logger.error(f"AI response generation failed: {e}")
            return self._generate_fallback_response(query, context, sources)
    
    def _generate_fallback_response(self, query: str, context: ConversationContext, sources: List[Dict[str, Any]]) -> str:
        """Generate fallback response when AI fails"""
        current_intent = context.conversation_state.get('current_intent')
        
        if current_intent == ChatIntent.ORDER_STATUS.value:
            return "I can check your order status. Please provide your order number."
        elif current_intent == ChatIntent.PRODUCT_INQUIRY.value:
            return "I can help you find product information. Could you tell me which product you're looking for?"
        elif current_intent == ChatIntent.RETURN_REFUND.value:
            return "I can help with returns and refunds. Please provide your order number or describe the issue."
        elif sources:
            # Use the best source
            best_source = sources[0]
            if best_source['type'] == 'faq':
                return best_source['content'][:200]
            elif best_source['type'] == 'policy':
                return f"According to our {best_source['title']} policy: {best_source['content'][:150]}"
            elif best_source['type'] == 'product':
                return f"{best_source['title']} is available for KES {best_source['price']:,}. {best_source['content'][:100]}"
        
        # Generic fallback
        return "Thank you for your message. I'm here to help. Could you provide more details about what you need assistance with?"
    
    async def process_message(
        self, 
        session_id: str, 
        user_id: Optional[str], 
        message: str,
        message_type: str = "text"
    ) -> AssistantResponse:
        """Process incoming message and generate response"""
        start_time = datetime.now()
        
        try:
            # Get or create conversation context
            context = await self.get_or_create_context(session_id, user_id)
            
            # Update context activity
            context.last_activity = datetime.now()
            context.message_count += 1
            
            # Preprocess message
            cleaned_message = self.preprocess_message(message)
            
            # Extract entities
            entities = self.extract_entities(message)
            
            # Detect intent
            intent, intent_confidence = self.detect_intent(cleaned_message, entities)
            
            # Analyze sentiment
            sentiment = self.analyze_sentiment(message)
            
            # Update sentiment trend
            context.sentiment_trend = (context.sentiment_trend * 0.7) + (sentiment * 0.3)
            
            # Create customer message object
            customer_message = CustomerMessage(
                message_id=hashlib.md5(f"{session_id}:{message}:{start_time.isoformat()}".encode()).hexdigest(),
                session_id=session_id,
                user_id=user_id,
                message=message,
                timestamp=start_time,
                message_type=message_type,
                metadata={
                    'cleaned_message': cleaned_message,
                    'word_count': len(message.split())
                },
                sentiment=sentiment,
                intent=intent,
                entities=entities
            )
            
            # Add to conversation history
            context.conversation_history.append({
                'type': 'user',
                'content': message,
                'timestamp': start_time.isoformat(),
                'intent': intent,
                'sentiment': sentiment
            })
            
            # Update conversation state
            context.conversation_state['current_intent'] = intent
            
            # Check for escalation triggers
            should_escalate = self._should_escalate(context, customer_message)
            
            # Gather information from various sources
            sources = []
            
            # Search knowledge base
            kb_results = await self.search_knowledge_base(cleaned_message, intent)
            sources.extend(kb_results)
            
            # Search product catalog for product inquiries
            if intent == ChatIntent.PRODUCT_INQUIRY.value:
                product_results = await self.search_product_catalog(cleaned_message, entities)
                sources.extend(product_results)
            
            # Check order status for order inquiries
            if intent == ChatIntent.ORDER_STATUS.value:
                order_entities = [e for e in entities if e['type'] == 'order_number']
                if order_entities:
                    order_info = await self.check_order_status(
                        order_entities[0]['value'], 
                        user_id
                    )
                    if order_info:
                        sources.append({
                            'source': ResponseSource.ORDER_HISTORY.value,
                            'type': 'order',
                            'content': f"Order {order_info['order_number']} is {order_info['status']}",
                            'order_number': order_info['order_number'],
                            'status': order_info['status'],
                            'total_amount': float(order_info['total_amount']),
                            'product_names': order_info['product_names'],
                            'score': 0.9,
                            'metadata': {
                                'item_count': order_info['item_count'],
                                'created_at': order_info['created_at'].isoformat() if order_info['created_at'] else None,
                                'estimated_delivery': order_info['estimated_delivery'].isoformat() if order_info['estimated_delivery'] else None
                            }
                        })
            
            # Generate response
            if should_escalate:
                response_text = "I understand this is important. Let me connect you with a human support agent who can provide more detailed assistance."
                confidence = 0.9
                
                # Create escalation ticket
                await self.create_escalation_ticket(context, customer_message, sources)
            else:
                response_text = await self.generate_ai_response(
                    message, 
                    context, 
                    sources
                )
                confidence = intent_confidence * 0.7 + (len(sources) > 0) * 0.3
            
            # Generate suggested actions
            suggested_actions = self._generate_suggested_actions(intent, sources)
            
            # Create response object
            response = AssistantResponse(
                response_id=hashlib.md5(f"{session_id}:{response_text}:{datetime.now().isoformat()}".encode()).hexdigest(),
                session_id=session_id,
                message=response_text,
                timestamp=datetime.now(),
                confidence=min(confidence, 0.95),  # Cap confidence
                sources=sources[:3],  # Limit to top 3 sources
                suggested_actions=suggested_actions,
                metadata={
                    'processing_time': (datetime.now() - start_time).total_seconds(),
                    'intent': intent,
                    'intent_confidence': intent_confidence,
                    'source_count': len(sources),
                    'should_escalate': should_escalate
                }
            )
            
            # Add response to conversation history
            context.conversation_history.append({
                'type': 'assistant',
                'content': response_text,
                'timestamp': response.timestamp.isoformat(),
                'response_id': response.response_id,
                'confidence': response.confidence
            })
            
            # Update context
            self._cache_context(context)
            
            # Store conversation in database
            await self.store_conversation(customer_message, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Message processing failed: {e}")
            # Return fallback response
            return AssistantResponse(
                response_id=hashlib.md5(f"{session_id}:error:{datetime.now().isoformat()}".encode()).hexdigest(),
                session_id=session_id,
                message="I apologize, but I'm having trouble processing your request. Please try again or contact our support team directly.",
                timestamp=datetime.now(),
                confidence=0.1,
                sources=[],
                suggested_actions=["Contact support", "Try again later"],
                metadata={'error': str(e), 'processing_time': (datetime.now() - start_time).total_seconds()}
            )
    
    def _should_escalate(self, context: ConversationContext, message: CustomerMessage) -> bool:
        """Determine if conversation should be escalated to human agent"""
        # Check sentiment
        if message.sentiment < -0.6:  # Very negative
            return True
        
        # Check retry count
        if context.conversation_state.get('retry_count', 0) >= 3:
            return True
        
        # Check for specific complaint keywords
        complaint_keywords = [
            'manager', 'supervisor', 'speak to human', 'real person',
            'not satisfied', 'escalate', 'serious issue', 'urgent'
        ]
        
        message_lower = message.message.lower()
        if any(keyword in message_lower for keyword in complaint_keywords):
            return True
        
        # Check conversation length
        if context.message_count > 20:
            return True
        
        # Check escalation level
        if context.conversation_state.get('escalation_level', 0) >= 2:
            return True
        
        return False
    
    def _generate_suggested_actions(self, intent: str, sources: List[Dict[str, Any]]) -> List[str]:
        """Generate suggested next actions"""
        actions = []
        
        if intent == ChatIntent.PRODUCT_INQUIRY.value:
            actions.append("View product details")
            actions.append("Check availability")
            actions.append("Compare similar products")
        
        elif intent == ChatIntent.ORDER_STATUS.value:
            actions.append("Track delivery")
            actions.append("View order details")
            actions.append("Contact delivery service")
        
        elif intent == ChatIntent.RETURN_REFUND.value:
            actions.append("Start return process")
            actions.append("Check refund status")
            actions.append("View return policy")
        
        elif intent == ChatIntent.PAYMENT_ISSUE.value:
            actions.append("View payment history")
            actions.append("Contact payment provider")
            actions.append("Update payment method")
        
        # Add general actions
        if len(actions) < 3:
            actions.extend(["Browse products", "Contact support", "View help center"])
        
        return actions[:3]
    
    async def create_escalation_ticket(
        self, 
        context: ConversationContext, 
        message: CustomerMessage,
        sources: List[Dict[str, Any]]
    ):
        """Create escalation ticket for human agent"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create ticket
                cur.execute("""
                    INSERT INTO support_tickets 
                    (session_id, user_id, subject, description, 
                     priority, category, status, metadata, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """, (
                    context.session_id,
                    context.user_id,
                    f"Chat escalation: {message.intent}",
                    f"User message: {message.message}\n\n"
                    f"Context: {json.dumps(context.conversation_state)}\n"
                    f"Sources: {json.dumps([s['type'] for s in sources])}",
                    'high' if message.sentiment < -0.5 else 'medium',
                    message.intent,
                    'open',
                    json.dumps({
                        'sentiment': message.sentiment,
                        'message_count': context.message_count,
                        'conversation_history': context.conversation_history[-3:],
                        'entities': message.entities
                    })
                ))
                
                ticket_id = cur.fetchone()[0]
                
                # Log escalation
                cur.execute("""
                    INSERT INTO escalation_logs 
                    (ticket_id, session_id, reason, created_at)
                    VALUES (%s, %s, %s, NOW())
                """, (
                    ticket_id,
                    context.session_id,
                    f"Sentiment: {message.sentiment}, Intent: {message.intent}"
                ))
                
                conn.commit()
                logger.info(f"Created escalation ticket {ticket_id}")
                
        except Exception as e:
            logger.error(f"Failed to create escalation ticket: {e}")
        finally:
            self.db_pool.putconn(conn)
    
    async def store_conversation(self, message: CustomerMessage, response: AssistantResponse):
        """Store conversation in database"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Store message
                cur.execute("""
                    INSERT INTO chat_messages 
                    (message_id, session_id, user_id, message_type,
                     content, intent, sentiment, entities, metadata, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    message.message_id,
                    message.session_id,
                    message.user_id,
                    message.message_type,
                    message.message,
                    message.intent,
                    message.sentiment,
                    json.dumps(message.entities),
                    json.dumps(message.metadata),
                    message.timestamp
                ))
                
                # Store response
                cur.execute("""
                    INSERT INTO chat_responses 
                    (response_id, message_id, session_id, content,
                     confidence, sources, suggested_actions, metadata, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    response.response_id,
                    message.message_id,
                    response.session_id,
                    response.message,
                    response.confidence,
                    json.dumps(response.sources),
                    json.dumps(response.suggested_actions),
                    json.dumps(response.metadata),
                    response.timestamp
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to store conversation: {e}")
        finally:
            self.db_pool.putconn(conn)
    
    async def get_conversation_history(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get conversation history"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        cm.message_id, cm.content as user_message,
                        cm.created_at as user_timestamp, cm.intent, cm.sentiment,
                        cr.content as assistant_response,
                        cr.created_at as response_timestamp,
                        cr.confidence, cr.sources
                    FROM chat_messages cm
                    LEFT JOIN chat_responses cr ON cm.message_id = cr.message_id
                    WHERE cm.session_id = %s
                    ORDER BY cm.created_at DESC
                    LIMIT %s
                """, (session_id, limit))
                
                history = []
                for row in cur.fetchall():
                    history.append({
                        'user': {
                            'message': row['user_message'],
                            'timestamp': row['user_timestamp'].isoformat() if row['user_timestamp'] else None,
                            'intent': row['intent'],
                            'sentiment': float(row['sentiment']) if row['sentiment'] is not None else None
                        },
                        'assistant': {
                            'response': row['assistant_response'],
                            'timestamp': row['response_timestamp'].isoformat() if row['response_timestamp'] else None,
                            'confidence': float(row['confidence']) if row['confidence'] is not None else None,
                            'sources': json.loads(row['sources']) if row['sources'] else []
                        }
                    })
                
                return list(reversed(history))  # Return in chronological order
        finally:
            self.db_pool.putconn(conn)
    
    async def analyze_conversation_metrics(self, session_id: str) -> Dict[str, Any]:
        """Analyze conversation metrics"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get basic metrics
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT cm.message_id) as total_messages,
                        AVG(cm.sentiment) as avg_sentiment,
                        MIN(cm.created_at) as started_at,
                        MAX(cm.created_at) as ended_at,
                        COUNT(DISTINCT cr.response_id) as total_responses,
                        AVG(cr.confidence) as avg_confidence
                    FROM chat_messages cm
                    LEFT JOIN chat_responses cr ON cm.message_id = cr.message_id
                    WHERE cm.session_id = %s
                """, (session_id,))
                
                metrics = dict(cur.fetchone())
                
                # Get intent distribution
                cur.execute("""
                    SELECT 
                        intent,
                        COUNT(*) as count,
                        AVG(sentiment) as avg_sentiment
                    FROM chat_messages
                    WHERE session_id = %s
                    AND intent IS NOT NULL
                    GROUP BY intent
                    ORDER BY count DESC
                """, (session_id,))
                
                intent_distribution = [dict(row) for row in cur.fetchall()]
                
                # Get response time metrics
                cur.execute("""
                    SELECT 
                        EXTRACT(EPOCH FROM (cr.created_at - cm.created_at)) as response_time
                    FROM chat_messages cm
                    JOIN chat_responses cr ON cm.message_id = cr.message_id
                    WHERE cm.session_id = %s
                    AND cr.created_at > cm.created_at
                """, (session_id,))
                
                response_times = [row['response_time'] for row in cur.fetchall()]
                
                metrics['intent_distribution'] = intent_distribution
                metrics['avg_response_time'] = float(np.mean(response_times)) if response_times else 0
                metrics['total_duration'] = 0
                
                if metrics['started_at'] and metrics['ended_at']:
                    metrics['total_duration'] = (metrics['ended_at'] - metrics['started_at']).total_seconds()
                
                return metrics
        finally:
            self.db_pool.putconn(conn)
    
    async def end_conversation(self, session_id: str, reason: str = "user_ended"):
        """End conversation and store final metrics"""
        try:
            # Get context
            context = await self.get_or_create_context(session_id)
            
            # Analyze metrics
            metrics = await self.analyze_conversation_metrics(session_id)
            
            # Store conversation summary
            conn = self.db_pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO conversation_summaries 
                        (session_id, user_id, message_count, avg_sentiment,
                         avg_confidence, total_duration, ended_reason, metrics, ended_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (
                        session_id,
                        context.user_id,
                        context.message_count,
                        context.sentiment_trend,
                        0.7,  # Placeholder for avg confidence
                        (datetime.now() - context.started_at).total_seconds(),
                        reason,
                        json.dumps(metrics)
                    ))
                    conn.commit()
            finally:
                self.db_pool.putconn(conn)
            
            # Clear context from cache
            self.redis_client.delete(f"chat_context:{session_id}")
            
            logger.info(f"Ended conversation {session_id}: {reason}")
            
        except Exception as e:
            logger.error(f"Failed to end conversation: {e}")

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
    
    # Initialize engine (without API keys for this example)
    engine = ChatSupportEngine(db_config, redis_config)
    
    try:
        # Example conversation
        session_id = "session_123456"
        user_id = "user_789"
        
        # Start conversation
        print("Starting chat session...")
        
        # User message 1
        user_message = "Hi, I need help with my order ORD-1234"
        print(f"\nUser: {user_message}")
        
        response = await engine.process_message(session_id, user_id, user_message)
        print(f"Assistant: {response.message}")
        print(f"Confidence: {response.confidence:.2f}")
        print(f"Intent: {response.metadata['intent']}")
        
        # User message 2
        user_message = "When will it be delivered?"
        print(f"\nUser: {user_message}")
        
        response = await engine.process_message(session_id, user_id, user_message)
        print(f"Assistant: {response.message}")
        
        # User message 3
        user_message = "I'm not happy with the delay, this is taking too long"
        print(f"\nUser: {user_message}")
        
        response = await engine.process_message(session_id, user_id, user_message)
        print(f"Assistant: {response.message}")
        print(f"Sentiment detected: {response.metadata.get('sentiment', 'N/A')}")
        
        # Get conversation history
        print(f"\nGetting conversation history...")
        history = await engine.get_conversation_history(session_id, limit=3)
        
        for entry in history:
            print(f"\nUser: {entry['user']['message'][:50]}...")
            print(f"Assistant: {entry['assistant']['response'][:50]}...")
        
        # Analyze conversation
        metrics = await engine.analyze_conversation_metrics(session_id)
        print(f"\nConversation Metrics:")
        print(f"Total Messages: {metrics.get('total_messages', 0)}")
        print(f"Average Sentiment: {metrics.get('avg_sentiment', 0):.2f}")
        print(f"Average Response Time: {metrics.get('avg_response_time', 0):.2f}s")
        
        # End conversation
        await engine.end_conversation(session_id, "example_complete")
        print("\nConversation ended.")
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
    
