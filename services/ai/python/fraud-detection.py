import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import pickle
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import hashlib
import ipaddress
import re
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class OrderFeatures:
    order_id: str
    user_id: str
    total_amount: float
    item_count: int
    avg_item_price: float
    shipping_address: Dict[str, Any]
    billing_address: Dict[str, Any]
    payment_method: str
    device_fingerprint: Optional[str]
    ip_address: str
    user_agent: str
    created_at: datetime
    previous_order_count: int
    account_age_days: int
    avg_order_value: float
    location_velocity: float  # Distance/time between orders
    time_of_day: int  # Hour of day
    day_of_week: int
    email_domain: str
    phone_carrier: Optional[str]

@dataclass
class UserBehaviorProfile:
    user_id: str
    normal_order_hours: List[int]
    typical_order_value_range: Tuple[float, float]
    common_shipping_locations: List[Dict[str, Any]]
    common_payment_methods: List[str]
    avg_items_per_order: float
    order_frequency_days: float
    account_creation_date: datetime
    total_orders: int
    total_spent: float
    chargeback_history: int
    refund_rate: float

class FraudRiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudType(Enum):
    IDENTITY_THEFT = "identity_theft"
    PAYMENT_FRAUD = "payment_fraud"
    ACCOUNT_TAKEOVER = "account_takeover"
    FRIENDLY_FRAUD = "friendly_fraud"
    TRIANGULATION = "triangulation"
    PROMOTION_ABUSE = "promotion_abuse"

class FraudDetectionEngine:
    def __init__(self, db_config: Dict[str, Any], redis_config: Dict[str, Any]):
        self.db_config = db_config
        self.redis_config = redis_config
        self.redis_client = None
        self.db_pool = None
        self.isolation_forest = IsolationForest(
            contamination=0.01,
            random_state=42,
            n_estimators=100
        )
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            class_weight='balanced'
        )
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.thresholds = {
            'high_risk': 0.85,
            'medium_risk': 0.65,
            'low_risk': 0.35
        }
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
            
            logger.info("Fraud detection engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    async def extract_order_features(self, order_id: str) -> Optional[OrderFeatures]:
        """Extract comprehensive features from an order"""
        cache_key = f"order_features:{order_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['created_at'] = datetime.fromisoformat(data['created_at'])
            return OrderFeatures(**data)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get order details
                cur.execute("""
                    SELECT 
                        o.id, o.user_id, o.total_amount, 
                        o.shipping_address, o.billing_address,
                        o.payment_method, o.device_fingerprint,
                        o.ip_address, o.user_agent, o.created_at,
                        COUNT(oi.id) as item_count,
                        AVG(p.price) as avg_item_price
                    FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE o.id = %s
                    GROUP BY o.id
                """, (order_id,))
                
                order = cur.fetchone()
                if not order:
                    return None
                
                # Get user statistics
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT o2.id) as previous_order_count,
                        EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400 as account_age_days,
                        AVG(o2.total_amount) as avg_order_value
                    FROM users u
                    LEFT JOIN orders o2 ON u.id = o2.user_id AND o2.created_at < %s
                    WHERE u.id = %s
                    GROUP BY u.id, u.created_at
                """, (order['created_at'], order['user_id']))
                
                user_stats = cur.fetchone() or {
                    'previous_order_count': 0,
                    'account_age_days': 0,
                    'avg_order_value': 0
                }
                
                # Calculate location velocity (distance/time between recent orders)
                cur.execute("""
                    SELECT 
                        o2.shipping_address,
                        o2.created_at,
                        EXTRACT(EPOCH FROM (%s - o2.created_at)) / 3600 as hours_ago
                    FROM orders o2
                    WHERE o2.user_id = %s 
                    AND o2.created_at < %s
                    AND o2.shipping_address IS NOT NULL
                    ORDER BY o2.created_at DESC
                    LIMIT 3
                """, (order['created_at'], order['user_id'], order['created_at']))
                
                recent_orders = cur.fetchall()
                location_velocity = 0.0
                if len(recent_orders) >= 2:
                    # Simplified location distance calculation
                    # In production, use geolocation API
                    location_velocity = 1.0  # Placeholder
                
                # Extract email domain
                cur.execute("""
                    SELECT email FROM users WHERE id = %s
                """, (order['user_id'],))
                
                user_email = cur.fetchone()['email']
                email_domain = user_email.split('@')[-1] if '@' in user_email else 'unknown'
                
                # Extract time features
                created_at = order['created_at']
                time_of_day = created_at.hour
                day_of_week = created_at.weekday()
                
                # Phone carrier detection (simplified)
                phone_carrier = self._detect_phone_carrier(
                    order['shipping_address'].get('phone', '')
                )
                
                features = OrderFeatures(
                    order_id=order_id,
                    user_id=order['user_id'],
                    total_amount=float(order['total_amount']),
                    item_count=order['item_count'],
                    avg_item_price=float(order['avg_item_price'] or 0),
                    shipping_address=order['shipping_address'],
                    billing_address=order['billing_address'],
                    payment_method=order['payment_method'],
                    device_fingerprint=order['device_fingerprint'],
                    ip_address=order['ip_address'],
                    user_agent=order['user_agent'],
                    created_at=created_at,
                    previous_order_count=user_stats['previous_order_count'],
                    account_age_days=int(user_stats['account_age_days']),
                    avg_order_value=float(user_stats['avg_order_value'] or 0),
                    location_velocity=location_velocity,
                    time_of_day=time_of_day,
                    day_of_week=day_of_week,
                    email_domain=email_domain,
                    phone_carrier=phone_carrier
                )
                
                # Cache for 5 minutes
                cache_data = asdict(features)
                cache_data['created_at'] = cache_data['created_at'].isoformat()
                self.redis_client.setex(cache_key, 300, json.dumps(cache_data))
                
                return features
        finally:
            self.db_pool.putconn(conn)
    
    def _detect_phone_carrier(self, phone: str) -> Optional[str]:
        """Detect phone carrier from phone number"""
        if not phone:
            return None
        
        # Kenyan carrier prefixes
        carriers = {
            'safaricom': ['0701', '0702', '0703', '0704', '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719', '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729', '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'],
            'airtel': ['0730', '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739', '0750', '0751', '0752', '0753', '0754', '0755', '0756', '0757', '0758', '0759', '0740', '0741', '0742', '0743', '0744', '0745', '0746', '0747'],
            'telkom': ['0760', '0761', '0762', '0763', '0764', '0765', '0766', '0767', '0768', '0769', '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779'],
            'equitel': ['0748', '0749']
        }
        
        # Extract last 10 digits (remove country code)
        digits = ''.join(filter(str.isdigit, phone))
        if len(digits) >= 10:
            prefix = digits[-10:-6]  # First 4 digits of local number
            for carrier, prefixes in carriers.items():
                if prefix in prefixes:
                    return carrier
        
        return 'unknown'
    
    async def load_user_behavior_profile(self, user_id: str) -> Optional[UserBehaviorProfile]:
        """Load user's behavior profile for anomaly detection"""
        cache_key = f"user_behavior:{user_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['account_creation_date'] = datetime.fromisoformat(data['account_creation_date'])
            return UserBehaviorProfile(**data)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user account details
                cur.execute("""
                    SELECT 
                        u.id, u.created_at as account_creation_date,
                        COUNT(DISTINCT o.id) as total_orders,
                        COALESCE(SUM(o.total_amount), 0) as total_spent,
                        COUNT(DISTINCT cb.id) as chargeback_history
                    FROM users u
                    LEFT JOIN orders o ON u.id = o.user_id
                    LEFT JOIN chargebacks cb ON o.id = cb.order_id
                    WHERE u.id = %s
                    GROUP BY u.id
                """, (user_id,))
                
                user_data = cur.fetchone()
                if not user_data:
                    return None
                
                # Analyze order patterns
                cur.execute("""
                    SELECT 
                        EXTRACT(HOUR FROM created_at) as order_hour,
                        total_amount,
                        shipping_address,
                        payment_method,
                        COUNT(DISTINCT oi.product_id) as item_count,
                        EXTRACT(EPOCH FROM (created_at - LAG(created_at) 
                            OVER (ORDER BY created_at))) / 86400 as days_between_orders
                    FROM orders
                    WHERE user_id = %s
                    ORDER BY created_at
                """, (user_id,))
                
                orders = cur.fetchall()
                
                if not orders:
                    # New user with no orders
                    return UserBehaviorProfile(
                        user_id=user_id,
                        normal_order_hours=list(range(9, 18)),
                        typical_order_value_range=(0, 1000),
                        common_shipping_locations=[],
                        common_payment_methods=[],
                        avg_items_per_order=1.0,
                        order_frequency_days=30.0,
                        account_creation_date=user_data['account_creation_date'],
                        total_orders=0,
                        total_spent=0.0,
                        chargeback_history=user_data['chargeback_history'],
                        refund_rate=0.0
                    )
                
                # Calculate typical order hours (most frequent hours)
                order_hours = [int(o['order_hour']) for o in orders]
                hour_counts = pd.Series(order_hours).value_counts()
                normal_hours = hour_counts[hour_counts >= len(orders) * 0.1].index.tolist()
                
                # Calculate order value range
                order_values = [float(o['total_amount']) for o in orders]
                value_mean = np.mean(order_values)
                value_std = np.std(order_values)
                value_range = (
                    max(0, value_mean - 2 * value_std),
                    value_mean + 2 * value_std
                )
                
                # Extract common shipping locations
                locations = []
                for order in orders:
                    if order['shipping_address']:
                        loc = {
                            'city': order['shipping_address'].get('city'),
                            'country': order['shipping_address'].get('country')
                        }
                        if loc not in locations:
                            locations.append(loc)
                
                # Common payment methods
                payment_methods = [o['payment_method'] for o in orders]
                common_payments = pd.Series(payment_methods).value_counts().head(3).index.tolist()
                
                # Average items per order
                avg_items = np.mean([o['item_count'] for o in orders])
                
                # Order frequency
                days_between = [d for d in [o['days_between_orders'] for o in orders] if d]
                order_frequency = np.mean(days_between) if days_between else 30.0
                
                # Refund rate
                cur.execute("""
                    SELECT COUNT(DISTINCT r.id) as refund_count
                    FROM refunds r
                    JOIN orders o ON r.order_id = o.id
                    WHERE o.user_id = %s
                """, (user_id,))
                
                refund_count = cur.fetchone()['refund_count'] or 0
                refund_rate = refund_count / max(len(orders), 1)
                
                profile = UserBehaviorProfile(
                    user_id=user_id,
                    normal_order_hours=normal_hours,
                    typical_order_value_range=value_range,
                    common_shipping_locations=locations[:5],
                    common_payment_methods=common_payments,
                    avg_items_per_order=float(avg_items),
                    order_frequency_days=float(order_frequency),
                    account_creation_date=user_data['account_creation_date'],
                    total_orders=user_data['total_orders'],
                    total_spent=float(user_data['total_spent']),
                    chargeback_history=user_data['chargeback_history'],
                    refund_rate=float(refund_rate)
                )
                
                # Cache for 1 hour
                cache_data = asdict(profile)
                cache_data['account_creation_date'] = cache_data['account_creation_date'].isoformat()
                self.redis_client.setex(cache_key, 3600, json.dumps(cache_data))
                
                return profile
        finally:
            self.db_pool.putconn(conn)
    
    def calculate_risk_score(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate comprehensive fraud risk score"""
        risk_factors = []
        factor_details = []
        
        # 1. Transaction Value Risk
        value_risk = self._calculate_value_risk(features, profile)
        risk_factors.append(value_risk['score'])
        factor_details.append({
            'factor': 'transaction_value',
            'score': value_risk['score'],
            'reason': value_risk['reason']
        })
        
        # 2. Behavioral Anomaly Risk
        behavior_risk = self._calculate_behavioral_risk(features, profile)
        risk_factors.append(behavior_risk['score'])
        factor_details.append({
            'factor': 'behavioral_anomaly',
            'score': behavior_risk['score'],
            'reason': behavior_risk['reason']
        })
        
        # 3. Location Risk
        location_risk = self._calculate_location_risk(features, profile)
        risk_factors.append(location_risk['score'])
        factor_details.append({
            'factor': 'location_risk',
            'score': location_risk['score'],
            'reason': location_risk['reason']
        })
        
        # 4. Payment Risk
        payment_risk = self._calculate_payment_risk(features, profile)
        risk_factors.append(payment_risk['score'])
        factor_details.append({
            'factor': 'payment_risk',
            'score': payment_risk['score'],
            'reason': payment_risk['reason']
        })
        
        # 5. Device & Network Risk
        device_risk = self._calculate_device_risk(features)
        risk_factors.append(device_risk['score'])
        factor_details.append({
            'factor': 'device_network',
            'score': device_risk['score'],
            'reason': device_risk['reason']
        })
        
        # 6. Velocity Risk
        velocity_risk = self._calculate_velocity_risk(features, profile)
        risk_factors.append(velocity_risk['score'])
        factor_details.append({
            'factor': 'transaction_velocity',
            'score': velocity_risk['score'],
            'reason': velocity_risk['reason']
        })
        
        # 7. Account Risk
        account_risk = self._calculate_account_risk(features, profile)
        risk_factors.append(account_risk['score'])
        factor_details.append({
            'factor': 'account_risk',
            'score': account_risk['score'],
            'reason': account_risk['reason']
        })
        
        # Calculate weighted average score
        weights = [0.20, 0.15, 0.15, 0.15, 0.10, 0.15, 0.10]  # Sum to 1.0
        weighted_score = sum(s * w for s, w in zip(risk_factors, weights))
        
        # Determine risk level
        if weighted_score >= self.thresholds['high_risk']:
            risk_level = FraudRiskLevel.CRITICAL
            action = 'BLOCK'
        elif weighted_score >= self.thresholds['medium_risk']:
            risk_level = FraudRiskLevel.HIGH
            action = 'REVIEW'
        elif weighted_score >= self.thresholds['low_risk']:
            risk_level = FraudRiskLevel.MEDIUM
            action = 'VERIFY'
        else:
            risk_level = FraudRiskLevel.LOW
            action = 'APPROVE'
        
        # Identify fraud type patterns
        fraud_types = self._identify_fraud_type(features, profile, factor_details)
        
        return {
            'order_id': features.order_id,
            'user_id': features.user_id,
            'risk_score': round(weighted_score, 4),
            'risk_level': risk_level.value,
            'recommended_action': action,
            'fraud_types': [t.value for t in fraud_types],
            'factor_details': factor_details,
            'total_amount': features.total_amount,
            'timestamp': datetime.now().isoformat(),
            'confidence': self._calculate_confidence(features, profile)
        }
    
    def _calculate_value_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on transaction value"""
        typical_min, typical_max = profile.typical_order_value_range
        
        if features.total_amount == 0:
            return {'score': 0.1, 'reason': 'Zero-value transaction'}
        
        if features.total_amount > typical_max * 3:
            return {'score': 0.9, 'reason': f'Amount ({features.total_amount}) 3x above typical max ({typical_max})'}
        elif features.total_amount > typical_max * 2:
            return {'score': 0.7, 'reason': f'Amount ({features.total_amount}) 2x above typical max ({typical_max})'}
        elif features.total_amount > typical_max:
            return {'score': 0.5, 'reason': f'Amount ({features.total_amount}) above typical max ({typical_max})'}
        elif features.total_amount < typical_min * 0.5:
            return {'score': 0.3, 'reason': f'Amount ({features.total_amount}) 50% below typical min ({typical_min})'}
        else:
            return {'score': 0.1, 'reason': 'Amount within normal range'}
    
    def _calculate_behavioral_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on behavioral anomalies"""
        risk_score = 0.0
        reasons = []
        
        # Time of day anomaly
        if features.time_of_day not in profile.normal_order_hours:
            risk_score += 0.3
            reasons.append(f'Order at unusual hour: {features.time_of_day}:00')
        
        # Item count anomaly
        if features.item_count > profile.avg_items_per_order * 3:
            risk_score += 0.3
            reasons.append(f'High item count: {features.item_count} (avg: {profile.avg_items_per_order})')
        
        # New payment method
        if (profile.common_payment_methods and 
            features.payment_method not in profile.common_payment_methods):
            risk_score += 0.2
            reasons.append(f'Unusual payment method: {features.payment_method}')
        
        # High average item price
        if features.avg_item_price > 10000:  # KES 10,000 threshold
            risk_score += 0.2
            reasons.append(f'High average item price: {features.avg_item_price}')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Normal behavior pattern'
        
        return {'score': risk_score, 'reason': reason}
    
    def _calculate_location_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on location data"""
        risk_score = 0.0
        reasons = []
        
        shipping = features.shipping_address
        billing = features.billing_address
        
        # Check for mismatched addresses
        if shipping and billing:
            shipping_key = (shipping.get('city'), shipping.get('country'))
            billing_key = (billing.get('city'), billing.get('country'))
            
            if shipping_key != billing_key:
                risk_score += 0.4
                reasons.append('Shipping and billing addresses differ')
        
        # Check for new shipping location
        if shipping:
            shipping_location = {
                'city': shipping.get('city'),
                'country': shipping.get('country')
            }
            
            if (profile.common_shipping_locations and 
                shipping_location not in profile.common_shipping_locations):
                risk_score += 0.3
                reasons.append('New shipping location')
        
        # High-velocity location change
        if features.location_velocity > 100:  # km/h threshold
            risk_score += 0.3
            reasons.append(f'High location velocity: {features.location_velocity} km/h')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Location consistent with history'
        
        return {'score': risk_score, 'reason': reason}
    
    def _calculate_payment_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on payment characteristics"""
        risk_score = 0.0
        reasons = []
        
        # New payment method for high-value transaction
        if (profile.common_payment_methods and 
            features.payment_method not in profile.common_payment_methods and
            features.total_amount > 5000):
            risk_score += 0.4
            reasons.append(f'New payment method for large transaction: {features.payment_method}')
        
        # Multiple payment attempts
        # This would require checking payment attempt history
        
        # High-risk payment methods
        high_risk_methods = ['international_card', 'cryptocurrency', 'wire_transfer']
        if features.payment_method in high_risk_methods:
            risk_score += 0.3
            reasons.append(f'High-risk payment method: {features.payment_method}')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Payment method appears normal'
        
        return {'score': risk_score, 'reason': reason}
    
    def _calculate_device_risk(self, features: OrderFeatures) -> Dict[str, Any]:
        """Calculate risk based on device and network information"""
        risk_score = 0.0
        reasons = []
        
        # Check IP address
        try:
            ip = ipaddress.ip_address(features.ip_address)
            
            # Known proxy/VPN IP ranges (simplified)
            vpn_ranges = [
                ipaddress.ip_network('10.0.0.0/8'),
                ipaddress.ip_network('172.16.0.0/12'),
                ipaddress.ip_network('192.168.0.0/16')
            ]
            
            if any(ip in network for network in vpn_ranges):
                risk_score += 0.3
                reasons.append('Private IP address range')
            
            # Check for known data center IPs (simplified)
            # In production, use IP intelligence service
            
        except ValueError:
            risk_score += 0.2
            reasons.append('Invalid IP address format')
        
        # Check user agent
        user_agent = features.user_agent or ''
        
        # Suspicious user agent patterns
        suspicious_patterns = [
            'headless', 'phantom', 'selenium', 'puppeteer',
            'bot', 'crawler', 'spider', 'scraper'
        ]
        
        if any(pattern in user_agent.lower() for pattern in suspicious_patterns):
            risk_score += 0.4
            reasons.append('Suspicious user agent detected')
        
        # Missing device fingerprint
        if not features.device_fingerprint:
            risk_score += 0.2
            reasons.append('No device fingerprint')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Device and network appear normal'
        
        return {'score': risk_score, 'reason': reason}
    
    def _calculate_velocity_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on transaction velocity"""
        risk_score = 0.0
        reasons = []
        
        # New account with high spending
        if profile.account_age_days < 1 and features.total_amount > 10000:
            risk_score += 0.6
            reasons.append('High spending on new account')
        
        # Multiple orders in short time
        if features.previous_order_count == 0 and features.total_amount > 5000:
            risk_score += 0.3
            reasons.append('Large first-time purchase')
        
        # Unusually fast re-ordering
        if features.previous_order_count > 0:
            expected_frequency = profile.order_frequency_days
            if expected_frequency > 0 and features.account_age_days < 1:
                risk_score += 0.4
                reasons.append('Rapid ordering on new account')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Transaction velocity normal'
        
        return {'score': risk_score, 'reason': reason}
    
    def _calculate_account_risk(self, features: OrderFeatures, profile: UserBehaviorProfile) -> Dict[str, Any]:
        """Calculate risk based on account characteristics"""
        risk_score = 0.0
        reasons = []
        
        # Chargeback history
        if profile.chargeback_history > 0:
            risk_score += 0.4
            reasons.append(f'Account has {profile.chargeback_history} chargeback(s)')
        
        # High refund rate
        if profile.refund_rate > 0.3:  # 30% refund rate
            risk_score += 0.3
            reasons.append(f'High refund rate: {profile.refund_rate:.1%}')
        
        # Suspicious email domain
        suspicious_domains = [
            'tempmail.com', 'mailinator.com', 'guerrillamail.com',
            '10minutemail.com', 'throwawaymail.com', 'yopmail.com'
        ]
        
        if features.email_domain in suspicious_domains:
            risk_score += 0.5
            reasons.append(f'Suspicious email domain: {features.email_domain}')
        
        # Free email providers (moderate risk)
        free_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
        if features.email_domain in free_domains and profile.account_age_days < 7:
            risk_score += 0.2
            reasons.append('New account with free email')
        
        risk_score = min(risk_score, 0.9)
        reason = '; '.join(reasons) if reasons else 'Account appears legitimate'
        
        return {'score': risk_score, 'reason': reason}
    
    def _identify_fraud_type(
        self, 
        features: OrderFeatures, 
        profile: UserBehaviorProfile,
        factor_details: List[Dict[str, Any]]
    ) -> List[FraudType]:
        """Identify potential fraud types based on patterns"""
        fraud_types = []
        
        # Check for identity theft patterns
        identity_factors = ['location_risk', 'device_network', 'account_risk']
        identity_score = sum(
            f['score'] for f in factor_details 
            if f['factor'] in identity_factors
        ) / len(identity_factors)
        
        if identity_score > 0.6:
            fraud_types.append(FraudType.IDENTITY_THEFT)
        
        # Check for payment fraud
        if features.payment_method in ['stolen_card', 'fake_card']:
            fraud_types.append(FraudType.PAYMENT_FRAUD)
        
        # Check for account takeover
        if (profile.account_age_days > 30 and 
            features.time_of_day not in profile.normal_order_hours and
            features.payment_method not in profile.common_payment_methods):
            fraud_types.append(FraudType.ACCOUNT_TAKEOVER)
        
        # Check for friendly fraud
        if (profile.refund_rate > 0.5 or 
            profile.chargeback_history > 2):
            fraud_types.append(FraudType.FRIENDLY_FRAUD)
        
        # Check for promotion abuse
        if (features.total_amount < 1000 and 
            features.item_count > 10 and
            profile.account_age_days < 1):
            fraud_types.append(FraudType.PROMOTION_ABUSE)
        
        return fraud_types[:3]  # Limit to top 3 types
    
    def _calculate_confidence(self, features: OrderFeatures, profile: UserBehaviorProfile) -> float:
        """Calculate confidence level in risk assessment"""
        confidence_factors = []
        
        # Data completeness
        missing_fields = sum([
            1 for field in [
                features.device_fingerprint,
                features.shipping_address,
                features.billing_address,
                features.ip_address
            ] if not field
        ])
        
        completeness_score = 1.0 - (missing_fields / 4)
        confidence_factors.append(completeness_score)
        
        # Historical data availability
        if profile.total_orders >= 10:
            confidence_factors.append(0.9)
        elif profile.total_orders >= 3:
            confidence_factors.append(0.7)
        elif profile.total_orders >= 1:
            confidence_factors.append(0.5)
        else:
            confidence_factors.append(0.3)
        
        # Account age confidence
        if profile.account_age_days >= 90:
            confidence_factors.append(0.9)
        elif profile.account_age_days >= 30:
            confidence_factors.append(0.7)
        elif profile.account_age_days >= 7:
            confidence_factors.append(0.5)
        else:
            confidence_factors.append(0.3)
        
        return round(np.mean(confidence_factors) * 100, 2)
    
    async def assess_order_fraud_risk(self, order_id: str) -> Dict[str, Any]:
        """Main fraud risk assessment endpoint"""
        try:
            # Extract order features
            features = await self.extract_order_features(order_id)
            if not features:
                raise ValueError(f"Order {order_id} not found")
            
            # Load user behavior profile
            profile = await self.load_user_behavior_profile(features.user_id)
            if not profile:
                profile = await self._create_default_profile(features.user_id)
            
            # Calculate risk score
            risk_assessment = self.calculate_risk_score(features, profile)
            
            # Apply machine learning anomaly detection
            ml_score = await self.apply_ml_detection(features)
            risk_assessment['ml_anomaly_score'] = ml_score
            
            # Store assessment in database
            await self.store_assessment_result(order_id, risk_assessment)
            
            # Take automated action if needed
            if risk_assessment['recommended_action'] == 'BLOCK':
                await self.block_order(order_id, risk_assessment)
            elif risk_assessment['recommended_action'] == 'REVIEW':
                await self.flag_for_review(order_id, risk_assessment)
            
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Fraud assessment failed for order {order_id}: {e}")
            raise
    
    async def _create_default_profile(self, user_id: str) -> UserBehaviorProfile:
        """Create default profile for new users"""
        return UserBehaviorProfile(
            user_id=user_id,
            normal_order_hours=list(range(9, 18)),
            typical_order_value_range=(0, 1000),
            common_shipping_locations=[],
            common_payment_methods=[],
            avg_items_per_order=1.0,
            order_frequency_days=30.0,
            account_creation_date=datetime.now(),
            total_orders=0,
            total_spent=0.0,
            chargeback_history=0,
            refund_rate=0.0
        )
    
    async def apply_ml_detection(self, features: OrderFeatures) -> float:
        """Apply machine learning anomaly detection"""
        # Convert features to ML input format
        feature_vector = self._prepare_ml_features(features)
        
        if feature_vector is None:
            return 0.5  # Neutral score if insufficient data
        
        # Scale features
        try:
            feature_vector_scaled = self.scaler.transform([feature_vector])
            
            # Get anomaly score from isolation forest
            anomaly_score = self.isolation_forest.decision_function(feature_vector_scaled)[0]
            
            # Convert to probability-like score (0 to 1)
            ml_score = 1 / (1 + np.exp(-anomaly_score))
            
            return float(ml_score)
        except Exception as e:
            logger.warning(f"ML detection failed: {e}")
            return 0.5
    
    def _prepare_ml_features(self, features: OrderFeatures) -> Optional[List[float]]:
        """Prepare features for ML model"""
        try:
            feature_list = [
                float(features.total_amount),
                float(features.item_count),
                float(features.avg_item_price),
                float(features.previous_order_count),
                float(features.account_age_days),
                float(features.avg_order_value),
                float(features.location_velocity),
                float(features.time_of_day),
                float(features.day_of_week),
                1.0 if features.email_domain in ['gmail.com', 'yahoo.com'] else 0.0,
                1.0 if features.phone_carrier == 'safaricom' else 0.0,
                1.0 if features.payment_method == 'mpesa' else 0.0
            ]
            
            return feature_list
        except Exception as e:
            logger.error(f"Failed to prepare ML features: {e}")
            return None
    
    async def store_assessment_result(self, order_id: str, assessment: Dict[str, Any]):
        """Store fraud assessment result in database"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO fraud_assessments 
                    (order_id, risk_score, risk_level, recommended_action,
                     fraud_types, factor_details, ml_score, assessed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (order_id) 
                    DO UPDATE SET 
                        risk_score = EXCLUDED.risk_score,
                        risk_level = EXCLUDED.risk_level,
                        recommended_action = EXCLUDED.recommended_action,
                        fraud_types = EXCLUDED.fraud_types,
                        factor_details = EXCLUDED.factor_details,
                        ml_score = EXCLUDED.ml_score,
                        assessed_at = NOW()
                """, (
                    order_id,
                    assessment['risk_score'],
                    assessment['risk_level'],
                    assessment['recommended_action'],
                    json.dumps(assessment['fraud_types']),
                    json.dumps(assessment['factor_details']),
                    assessment.get('ml_anomaly_score', 0.5)
                ))
                conn.commit()
        finally:
            self.db_pool.putconn(conn)
    
    async def block_order(self, order_id: str, assessment: Dict[str, Any]):
        """Block a fraudulent order"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Update order status
                cur.execute("""
                    UPDATE orders 
                    SET status = 'blocked', 
                        fraud_reason = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    f"Fraud risk: {assessment['risk_level']} - {assessment['fraud_types'][0] if assessment['fraud_types'] else 'suspicious'}",
                    order_id
                ))
                
                # Log the block action
                cur.execute("""
                    INSERT INTO fraud_actions 
                    (order_id, action, reason, risk_score, performed_at)
                    VALUES (%s, 'BLOCK', %s, %s, NOW())
                """, (
                    order_id,
                    json.dumps(assessment['factor_details']),
                    assessment['risk_score']
                ))
                
                conn.commit()
                logger.warning(f"Order {order_id} blocked due to fraud risk")
        finally:
            self.db_pool.putconn(conn)
    
    async def flag_for_review(self, order_id: str, assessment: Dict[str, Any]):
        """Flag order for manual review"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Update order status
                cur.execute("""
                    UPDATE orders 
                    SET status = 'under_review', 
                        fraud_reason = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    f"Requires manual review: {assessment['risk_level']} risk",
                    order_id
                ))
                
                # Create review task
                cur.execute("""
                    INSERT INTO fraud_reviews 
                    (order_id, risk_score, priority, factors, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """, (
                    order_id,
                    assessment['risk_score'],
                    'HIGH' if assessment['risk_level'] == 'high' else 'MEDIUM',
                    json.dumps(assessment['factor_details'])
                ))
                
                conn.commit()
                logger.info(f"Order {order_id} flagged for review")
        finally:
            self.db_pool.putconn(conn)
    
    async def train_fraud_model(self, training_days: int = 90):
        """Train ML models on historical fraud data"""
        logger.info("Starting fraud model training...")
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Load labeled training data
                cur.execute("""
                    SELECT 
                        o.id as order_id,
                        o.total_amount,
                        o.item_count,
                        EXTRACT(EPOCH FROM (o.created_at - u.created_at)) / 86400 as account_age_days,
                        COUNT(DISTINCT o2.id) as previous_orders,
                        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_fraud
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN orders o2 ON u.id = o2.user_id AND o2.created_at < o.created_at
                    LEFT JOIN fraud_cases f ON o.id = f.order_id
                    WHERE o.created_at > NOW() - INTERVAL '%s days'
                    AND o.status NOT IN ('pending', 'cancelled')
                    GROUP BY o.id, u.created_at, f.id
                    HAVING COUNT(DISTINCT o2.id) >= 0
                    ORDER BY o.created_at
                """, (training_days,))
                
                data = [dict(row) for row in cur.fetchall()]
                
                if len(data) < 100:
                    logger.warning("Insufficient training data")
                    return
                
                df = pd.DataFrame(data)
                
                # Prepare features and labels
                feature_cols = ['total_amount', 'item_count', 'account_age_days', 'previous_orders']
                X = df[feature_cols].fillna(0).values
                y = df['is_fraud'].values
                
                # Scale features
                X_scaled = self.scaler.fit_transform(X)
                
                # Train isolation forest for anomaly detection
                self.isolation_forest.fit(X_scaled)
                
                # Train classifier if we have enough fraud cases
                fraud_count = sum(y)
                if fraud_count >= 50:
                    X_train, X_test, y_train, y_test = train_test_split(
                        X_scaled, y, test_size=0.2, random_state=42, stratify=y
                    )
                    
                    self.classifier.fit(X_train, y_train)
                    
                    # Evaluate
                    train_score = self.classifier.score(X_train, y_train)
                    test_score = self.classifier.score(X_test, y_test)
                    
                    logger.info(f"Classifier trained: Train acc={train_score:.3f}, Test acc={test_score:.3f}")
                    
                    # Save model
                    model_data = {
                        'isolation_forest': self.isolation_forest,
                        'classifier': self.classifier,
                        'scaler': self.scaler,
                        'feature_cols': feature_cols,
                        'trained_at': datetime.now().isoformat()
                    }
                    
                    with open('/tmp/fraud_detection_model.pkl', 'wb') as f:
                        pickle.dump(model_data, f)
                    
                    logger.info("Fraud detection model saved")
                else:
                    logger.info(f"Insufficient fraud cases ({fraud_count}) for classifier training")
                
        finally:
            self.db_pool.putconn(conn)
    
    async def generate_fraud_report(self, days: int = 30) -> Dict[str, Any]:
        """Generate fraud detection performance report"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get fraud statistics
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT o.id) as total_orders,
                        COUNT(DISTINCT f.order_id) as detected_fraud,
                        COUNT(DISTINCT cb.order_id) as chargebacks,
                        COUNT(DISTINCT r.order_id) as refunds,
                        AVG(fa.risk_score) as avg_risk_score
                    FROM orders o
                    LEFT JOIN fraud_assessments fa ON o.id = fa.order_id
                    LEFT JOIN fraud_cases f ON o.id = f.order_id
                    LEFT JOIN chargebacks cb ON o.id = cb.order_id
                    LEFT JOIN refunds r ON o.id = r.order_id
                    WHERE o.created_at > NOW() - INTERVAL '%s days'
                """, (days,))
                
                stats = dict(cur.fetchone())
                
                # Get detection performance
                cur.execute("""
                    SELECT 
                        fa.recommended_action,
                        COUNT(*) as count,
                        COUNT(DISTINCT f.order_id) as actual_fraud,
                        COUNT(DISTINCT cb.order_id) as chargebacks
                    FROM fraud_assessments fa
                    LEFT JOIN fraud_cases f ON fa.order_id = f.order_id
                    LEFT JOIN chargebacks cb ON fa.order_id = cb.order_id
                    WHERE fa.assessed_at > NOW() - INTERVAL '%s days'
                    GROUP BY fa.recommended_action
                """, (days,))
                
                performance = [dict(row) for row in cur.fetchall()]
                
                # Calculate metrics
                total_detected = sum(p['actual_fraud'] for p in performance)
                precision = total_detected / max(sum(p['count'] for p in performance if p['recommended_action'] != 'APPROVE'), 1)
                
                return {
                    'period_days': days,
                    'statistics': stats,
                    'performance': performance,
                    'metrics': {
                        'fraud_rate': stats['detected_fraud'] / max(stats['total_orders'], 1),
                        'chargeback_rate': stats['chargebacks'] / max(stats['total_orders'], 1),
                        'detection_precision': round(precision * 100, 2),
                        'avg_risk_score': round(float(stats['avg_risk_score'] or 0), 3)
                    },
                    'generated_at': datetime.now().isoformat()
                }
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
    engine = FraudDetectionEngine(db_config, redis_config)
    
    try:
        # Example: Assess fraud risk for an order
        order_id = "order_123456"
        assessment = await engine.assess_order_fraud_risk(order_id)
        
        print(f"Order: {assessment['order_id']}")
        print(f"Risk Score: {assessment['risk_score']:.4f}")
        print(f"Risk Level: {assessment['risk_level'].upper()}")
        print(f"Recommended Action: {assessment['recommended_action']}")
        print(f"Fraud Types: {', '.join(assessment['fraud_types'])}")
        print(f"Confidence: {assessment['confidence']}%")
        
        # Generate report
        report = await engine.generate_fraud_report(days=7)
        print(f"\nFraud Report (7 days):")
        print(f"Total Orders: {report['statistics']['total_orders']}")
        print(f"Detected Fraud: {report['statistics']['detected_fraud']}")
        print(f"Chargebacks: {report['statistics']['chargebacks']}")
        print(f"Detection Precision: {report['metrics']['detection_precision']}%")
        
        # Train model
        await engine.train_fraud_model(training_days=30)
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
