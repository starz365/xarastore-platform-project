import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import pickle
import re
import nltk
from dataclasses import dataclass
from enum import Enum
import logging
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
import matplotlib.pyplot as plt
import seaborn as sns
from wordcloud import WordCloud
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
class ReviewSentiment:
    review_id: str
    product_id: str
    user_id: str
    rating: int
    title: str
    text: str
    verified_purchase: bool
    helpful_votes: int
    created_at: datetime
    sentiment_score: float
    sentiment_label: str
    confidence: float
    key_phrases: List[str]
    aspects: Dict[str, float]
    emotion_scores: Dict[str, float]

@dataclass
class ProductSentimentSummary:
    product_id: str
    average_sentiment: float
    sentiment_distribution: Dict[str, int]
    aspect_sentiments: Dict[str, float]
    trending_sentiment: float  # Change over time
    top_positive_reviews: List[str]
    top_negative_reviews: List[str]
    word_frequency: Dict[str, int]
    sentiment_consistency: float
    last_updated: datetime

class SentimentLabel(Enum):
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"

class EmotionType(Enum):
    JOY = "joy"
    TRUST = "trust"
    FEAR = "fear"
    SURPRISE = "surprise"
    SADNESS = "sadness"
    DISGUST = "disgust"
    ANTICIPATION = "anticipation"
    ANGER = "anger"

class SentimentAnalysisEngine:
    def __init__(self, db_config: Dict[str, Any], redis_config: Dict[str, Any]):
        self.db_config = db_config
        self.redis_config = redis_config
        self.redis_client = None
        self.db_pool = None
        self.vader_analyzer = SentimentIntensityAnalyzer()
        self.stop_words = set(nltk.corpus.stopwords.words('english'))
        
        # Custom sentiment lexicon for e-commerce
        self.custom_lexicon = {
            # Positive e-commerce terms
            'excellent': 2.0, 'perfect': 2.0, 'amazing': 1.8, 'great': 1.5,
            'good': 1.2, 'nice': 1.0, 'satisfied': 1.5, 'happy': 1.5,
            'love': 1.8, 'recommend': 1.3, 'worth': 1.2, 'value': 1.0,
            'fast': 1.2, 'quick': 1.1, 'easy': 1.1, 'simple': 1.0,
            'quality': 1.3, 'durable': 1.2, 'reliable': 1.3,
            
            # Negative e-commerce terms
            'terrible': -2.0, 'awful': -2.0, 'horrible': -2.0,
            'bad': -1.5, 'poor': -1.5, 'disappointed': -1.8,
            'waste': -1.8, 'useless': -2.0, 'broken': -2.0,
            'slow': -1.2, 'difficult': -1.1, 'complicated': -1.1,
            'cheap': -0.5, 'fake': -2.0, 'scam': -2.5,
            
            # Amplifiers
            'very': 0.5, 'extremely': 0.8, 'really': 0.3,
            'absolutely': 0.7, 'completely': 0.6,
            
            # Negators
            'not': -0.5, 'never': -0.8, 'no': -0.3,
            "don't": -0.5, "won't": -0.5, "can't": -0.5,
        }
        
        # Aspect keywords for e-commerce
        self.aspect_keywords = {
            'delivery': ['delivery', 'shipping', 'arrived', 'received', 'package'],
            'quality': ['quality', 'durable', 'material', 'build', 'construction'],
            'price': ['price', 'cost', 'value', 'expensive', 'cheap', 'affordable'],
            'performance': ['performance', 'speed', 'fast', 'slow', 'works', 'function'],
            'design': ['design', 'look', 'appearance', 'style', 'color', 'size'],
            'service': ['service', 'support', 'help', 'customer', 'response'],
            'packaging': ['packaging', 'box', 'wrap', 'protected', 'damaged']
        }
        
        # Emotion keywords
        self.emotion_keywords = {
            EmotionType.JOY: ['happy', 'joy', 'pleased', 'delighted', 'excited', 'love'],
            EmotionType.TRUST: ['trust', 'reliable', 'dependable', 'confidence', 'satisfied'],
            EmotionType.FEAR: ['worried', 'concerned', 'afraid', 'scared', 'nervous'],
            EmotionType.SURPRISE: ['surprised', 'amazed', 'shocked', 'unexpected', 'wow'],
            EmotionType.SADNESS: ['sad', 'disappointed', 'unhappy', 'regret', 'sorry'],
            EmotionType.DISGUST: ['disgusted', 'hate', 'awful', 'terrible', 'horrible'],
            EmotionType.ANTICIPATION: ['excited', 'looking forward', 'can\'t wait', 'eager'],
            EmotionType.ANGER: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated']
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
            
            logger.info("Sentiment analysis engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for sentiment analysis"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        
        # Remove special characters and numbers
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def extract_key_phrases(self, text: str, max_phrases: int = 5) -> List[str]:
        """Extract key phrases from text"""
        if not text:
            return []
        
        # Tokenize
        tokens = nltk.word_tokenize(text)
        
        # Remove stop words
        filtered_tokens = [word for word in tokens if word not in self.stop_words and len(word) > 2]
        
        # Get noun phrases (simplified)
        tagged = nltk.pos_tag(filtered_tokens)
        noun_phrases = []
        current_phrase = []
        
        for word, tag in tagged:
            if tag.startswith('NN'):  # Noun
                current_phrase.append(word)
            elif current_phrase:
                noun_phrases.append(' '.join(current_phrase))
                current_phrase = []
        
        if current_phrase:
            noun_phrases.append(' '.join(current_phrase))
        
        # Get most frequent phrases
        phrase_counts = Counter(noun_phrases)
        return [phrase for phrase, _ in phrase_counts.most_common(max_phrases)]
    
    def analyze_aspect_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment for different product aspects"""
        aspect_scores = {aspect: 0.0 for aspect in self.aspect_keywords.keys()}
        aspect_counts = {aspect: 0 for aspect in self.aspect_keywords.keys()}
        
        if not text:
            return aspect_scores
        
        # Tokenize and lowercase
        tokens = nltk.word_tokenize(text.lower())
        
        # Check each sentence for aspect mentions
        sentences = nltk.sent_tokenize(text)
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            for aspect, keywords in self.aspect_keywords.items():
                for keyword in keywords:
                    if keyword in sentence_lower:
                        # Analyze sentiment of this sentence
                        sentiment = self.vader_analyzer.polarity_scores(sentence)['compound']
                        aspect_scores[aspect] += sentiment
                        aspect_counts[aspect] += 1
                        break  # Only count once per sentence per aspect
        
        # Calculate average scores
        for aspect in aspect_scores:
            if aspect_counts[aspect] > 0:
                aspect_scores[aspect] /= aspect_counts[aspect]
        
        return aspect_scores
    
    def analyze_emotions(self, text: str) -> Dict[str, float]:
        """Analyze emotional content of text"""
        emotion_scores = {emotion.value: 0.0 for emotion in EmotionType}
        
        if not text:
            return emotion_scores
        
        text_lower = text.lower()
        
        for emotion_type, keywords in self.emotion_keywords.items():
            score = 0.0
            for keyword in keywords:
                # Count occurrences and weight by sentiment
                count = text_lower.count(keyword)
                if count > 0:
                    # Get sentiment of sentences containing this emotion word
                    sentences = nltk.sent_tokenize(text)
                    emotion_sentences = [s for s in sentences if keyword in s.lower()]
                    
                    if emotion_sentences:
                        avg_sentiment = np.mean([
                            self.vader_analyzer.polarity_scores(s)['compound']
                            for s in emotion_sentences
                        ])
                        score += count * (avg_sentiment + 1) / 2  # Normalize to 0-1
                    
            emotion_scores[emotion_type.value] = min(score, 1.0)
        
        # Normalize scores
        total = sum(emotion_scores.values())
        if total > 0:
            for emotion in emotion_scores:
                emotion_scores[emotion] /= total
        
        return emotion_scores
    
    def calculate_sentiment_score(self, text: str, rating: Optional[int] = None) -> Tuple[float, str, float]:
        """Calculate comprehensive sentiment score"""
        if not text:
            # Default based on rating if no text
            if rating is not None:
                score = (rating - 3) / 2  # Convert 1-5 to -1 to 1
                label = self._score_to_label(score)
                confidence = 0.7  # Moderate confidence for rating-only
                return score, label, confidence
            else:
                return 0.0, SentimentLabel.NEUTRAL.value, 0.0
        
        # Preprocess text
        cleaned_text = self.preprocess_text(text)
        
        # Use VADER sentiment analysis
        vader_scores = self.vader_analyzer.polarity_scores(text)
        vader_compound = vader_scores['compound']
        
        # Use TextBlob for additional analysis
        blob = TextBlob(text)
        blob_polarity = blob.sentiment.polarity
        blob_subjectivity = blob.sentiment.subjectivity
        
        # Apply custom lexicon adjustments
        custom_adjustment = self._apply_custom_lexicon(text)
        
        # Combine scores with weights
        weights = {
            'vader': 0.5,
            'textblob': 0.3,
            'custom': 0.2
        }
        
        combined_score = (
            vader_compound * weights['vader'] +
            blob_polarity * weights['textblob'] +
            custom_adjustment * weights['custom']
        )
        
        # Adjust based on rating if available
        if rating is not None:
            rating_adjustment = (rating - 3) / 2  # -1 to 1
            # Weighted average: 70% text, 30% rating
            final_score = combined_score * 0.7 + rating_adjustment * 0.3
        else:
            final_score = combined_score
        
        # Ensure score is in [-1, 1] range
        final_score = max(-1.0, min(1.0, final_score))
        
        # Calculate confidence
        confidence_factors = [
            abs(vader_scores['compound']),  # Vader confidence
            (1 - blob_subjectivity),  # Objectivity (less subjective = more confident)
            len(text.split()) / 100,  # Length factor (capped)
        ]
        
        confidence = np.mean([min(f, 1.0) for f in confidence_factors])
        
        # Get sentiment label
        label = self._score_to_label(final_score)
        
        return final_score, label, confidence
    
    def _apply_custom_lexicon(self, text: str) -> float:
        """Apply custom sentiment lexicon"""
        words = text.lower().split()
        total_score = 0.0
        word_count = 0
        
        for i, word in enumerate(words):
            if word in self.custom_lexicon:
                # Check for negators
                if i > 0 and words[i-1] in ['not', 'never', 'no']:
                    total_score -= self.custom_lexicon[word] * 0.5
                else:
                    total_score += self.custom_lexicon[word]
                word_count += 1
        
        # Normalize score
        if word_count > 0:
            return total_score / word_count
        return 0.0
    
    def _score_to_label(self, score: float) -> str:
        """Convert sentiment score to label"""
        if score <= -0.6:
            return SentimentLabel.VERY_NEGATIVE.value
        elif score <= -0.2:
            return SentimentLabel.NEGATIVE.value
        elif score < 0.2:
            return SentimentLabel.NEUTRAL.value
        elif score < 0.6:
            return SentimentLabel.POSITIVE.value
        else:
            return SentimentLabel.VERY_POSITIVE.value
    
    async def analyze_review(self, review_id: str) -> Optional[ReviewSentiment]:
        """Analyze sentiment of a single review"""
        cache_key = f"review_sentiment:{review_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['created_at'] = datetime.fromisoformat(data['created_at'])
            return ReviewSentiment(**data)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        r.id, r.product_id, r.user_id, r.rating,
                        r.title, r.comment as text, r.is_verified as verified_purchase,
                        r.helpful_votes, r.created_at
                    FROM reviews r
                    WHERE r.id = %s
                """, (review_id,))
                
                review = cur.fetchone()
                if not review:
                    return None
                
                # Combine title and text for analysis
                full_text = f"{review['title']}. {review['text']}"
                
                # Calculate sentiment
                sentiment_score, sentiment_label, confidence = self.calculate_sentiment_score(
                    full_text, review['rating']
                )
                
                # Extract key phrases
                key_phrases = self.extract_key_phrases(full_text)
                
                # Analyze aspect sentiments
                aspect_sentiments = self.analyze_aspect_sentiment(full_text)
                
                # Analyze emotions
                emotion_scores = self.analyze_emotions(full_text)
                
                result = ReviewSentiment(
                    review_id=review_id,
                    product_id=review['product_id'],
                    user_id=review['user_id'],
                    rating=review['rating'],
                    title=review['title'],
                    text=review['text'],
                    verified_purchase=review['verified_purchase'],
                    helpful_votes=review['helpful_votes'],
                    created_at=review['created_at'],
                    sentiment_score=sentiment_score,
                    sentiment_label=sentiment_label,
                    confidence=confidence,
                    key_phrases=key_phrases,
                    aspects=aspect_sentiments,
                    emotion_scores=emotion_scores
                )
                
                # Cache for 24 hours
                cache_data = asdict(result)
                cache_data['created_at'] = cache_data['created_at'].isoformat()
                self.redis_client.setex(cache_key, 86400, json.dumps(cache_data))
                
                # Store in database
                await self.store_sentiment_analysis(result)
                
                return result
        finally:
            self.db_pool.putconn(conn)
    
    async def store_sentiment_analysis(self, analysis: ReviewSentiment):
        """Store sentiment analysis in database"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO sentiment_analysis 
                    (review_id, sentiment_score, sentiment_label, confidence,
                     key_phrases, aspect_sentiments, emotion_scores, analyzed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (review_id) 
                    DO UPDATE SET 
                        sentiment_score = EXCLUDED.sentiment_score,
                        sentiment_label = EXCLUDED.sentiment_label,
                        confidence = EXCLUDED.confidence,
                        key_phrases = EXCLUDED.key_phrases,
                        aspect_sentiments = EXCLUDED.aspect_sentiments,
                        emotion_scores = EXCLUDED.emotion_scores,
                        analyzed_at = NOW()
                """, (
                    analysis.review_id,
                    analysis.sentiment_score,
                    analysis.sentiment_label,
                    analysis.confidence,
                    json.dumps(analysis.key_phrases),
                    json.dumps(analysis.aspects),
                    json.dumps(analysis.emotion_scores)
                ))
                conn.commit()
        finally:
            self.db_pool.putconn(conn)
    
    async def analyze_product_sentiment(self, product_id: str) -> ProductSentimentSummary:
        """Analyze overall sentiment for a product"""
        cache_key = f"product_sentiment:{product_id}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['last_updated'] = datetime.fromisoformat(data['last_updated'])
            return ProductSentimentSummary(**data)
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get all reviews for product
                cur.execute("""
                    SELECT r.id, r.rating, r.title, r.comment, r.created_at
                    FROM reviews r
                    WHERE r.product_id = %s
                    ORDER BY r.created_at DESC
                """, (product_id,))
                
                reviews = [dict(row) for row in cur.fetchall()]
                
                if not reviews:
                    # Return empty summary for products without reviews
                    return ProductSentimentSummary(
                        product_id=product_id,
                        average_sentiment=0.0,
                        sentiment_distribution={
                            label.value: 0 for label in SentimentLabel
                        },
                        aspect_sentiments={},
                        trending_sentiment=0.0,
                        top_positive_reviews=[],
                        top_negative_reviews=[],
                        word_frequency={},
                        sentiment_consistency=0.0,
                        last_updated=datetime.now()
                    )
                
                # Analyze each review
                sentiment_scores = []
                sentiment_labels = []
                all_aspect_scores = {aspect: [] for aspect in self.aspect_keywords.keys()}
                all_text = []
                
                for review in reviews:
                    full_text = f"{review['title']}. {review['comment']}"
                    all_text.append(full_text)
                    
                    # Calculate sentiment
                    score, label, _ = self.calculate_sentiment_score(full_text, review['rating'])
                    sentiment_scores.append(score)
                    sentiment_labels.append(label)
                    
                    # Analyze aspects
                    aspect_scores = self.analyze_aspect_sentiment(full_text)
                    for aspect, score in aspect_scores.items():
                        if score != 0:
                            all_aspect_scores[aspect].append(score)
                
                # Calculate average sentiment
                average_sentiment = np.mean(sentiment_scores)
                
                # Calculate sentiment distribution
                label_counts = Counter(sentiment_labels)
                sentiment_distribution = {
                    label.value: label_counts.get(label.value, 0)
                    for label in SentimentLabel
                }
                
                # Calculate aspect sentiments (average)
                aspect_sentiments = {}
                for aspect, scores in all_aspect_scores.items():
                    if scores:
                        aspect_sentiments[aspect] = float(np.mean(scores))
                    else:
                        aspect_sentiments[aspect] = 0.0
                
                # Calculate trending sentiment (change over last 30 days)
                cur.execute("""
                    SELECT 
                        AVG(sa.sentiment_score) as recent_sentiment,
                        AVG(sa2.sentiment_score) as previous_sentiment
                    FROM reviews r
                    JOIN sentiment_analysis sa ON r.id = sa.review_id
                    LEFT JOIN sentiment_analysis sa2 ON r.id = sa2.review_id
                    WHERE r.product_id = %s
                    AND r.created_at > NOW() - INTERVAL '30 days'
                    AND sa2.analyzed_at IS NOT NULL
                """, (product_id,))
                
                trend_data = cur.fetchone()
                if trend_data and trend_data['previous_sentiment']:
                    trending_sentiment = float(trend_data['recent_sentiment'] or 0) - float(trend_data['previous_sentiment'] or 0)
                else:
                    trending_sentiment = 0.0
                
                # Get top positive and negative reviews
                review_sentiments = list(zip([r['id'] for r in reviews], sentiment_scores))
                review_sentiments.sort(key=lambda x: x[1], reverse=True)
                
                top_positive = [rev_id for rev_id, score in review_sentiments[:3] if score > 0]
                top_negative = [rev_id for rev_id, score in review_sentiments[-3:] if score < 0]
                
                # Calculate word frequency
                all_words = ' '.join(all_text).lower().split()
                word_freq = Counter([word for word in all_words if word not in self.stop_words and len(word) > 2])
                word_frequency = dict(word_freq.most_common(20))
                
                # Calculate sentiment consistency (variance)
                if len(sentiment_scores) > 1:
                    sentiment_consistency = 1.0 - np.var(sentiment_scores)
                else:
                    sentiment_consistency = 1.0
                
                summary = ProductSentimentSummary(
                    product_id=product_id,
                    average_sentiment=float(average_sentiment),
                    sentiment_distribution=sentiment_distribution,
                    aspect_sentiments=aspect_sentiments,
                    trending_sentiment=float(trending_sentiment),
                    top_positive_reviews=top_positive[:5],
                    top_negative_reviews=top_negative[:5],
                    word_frequency=word_frequency,
                    sentiment_consistency=float(sentiment_consistency),
                    last_updated=datetime.now()
                )
                
                # Cache for 1 hour
                cache_data = asdict(summary)
                cache_data['last_updated'] = cache_data['last_updated'].isoformat()
                self.redis_client.setex(cache_key, 3600, json.dumps(cache_data))
                
                return summary
        finally:
            self.db_pool.putconn(conn)
    
    async def batch_analyze_reviews(self, review_ids: List[str]) -> List[ReviewSentiment]:
        """Analyze sentiment for multiple reviews in batch"""
        results = []
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for review_id in review_ids:
                future = asyncio.get_event_loop().run_in_executor(
                    executor,
                    lambda rid=review_id: asyncio.run(self.analyze_review(rid))
                )
                futures.append(future)
            
            for future in futures:
                try:
                    result = await future
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.error(f"Failed to analyze review: {e}")
        
        return results
    
    async def generate_sentiment_report(self, product_id: str) -> Dict[str, Any]:
        """Generate comprehensive sentiment report for a product"""
        # Get product sentiment summary
        summary = await self.analyze_product_sentiment(product_id)
        
        # Get recent reviews with sentiment
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        r.id, r.rating, r.title, r.comment, r.created_at,
                        sa.sentiment_score, sa.sentiment_label, sa.confidence
                    FROM reviews r
                    LEFT JOIN sentiment_analysis sa ON r.id = sa.review_id
                    WHERE r.product_id = %s
                    ORDER BY r.created_at DESC
                    LIMIT 50
                """, (product_id,))
                
                recent_reviews = [dict(row) for row in cur.fetchall()]
                
                # Get product details
                cur.execute("""
                    SELECT p.name, p.rating, p.review_count
                    FROM products p
                    WHERE p.id = %s
                """, (product_id,))
                
                product = cur.fetchone()
                
                # Calculate sentiment over time
                cur.execute("""
                    SELECT 
                        DATE_TRUNC('week', r.created_at) as week,
                        AVG(sa.sentiment_score) as avg_sentiment,
                        COUNT(*) as review_count
                    FROM reviews r
                    JOIN sentiment_analysis sa ON r.id = sa.review_id
                    WHERE r.product_id = %s
                    GROUP BY DATE_TRUNC('week', r.created_at)
                    ORDER BY week
                """, (product_id,))
                
                sentiment_timeline = [dict(row) for row in cur.fetchall()]
                
                # Calculate rating vs sentiment correlation
                rating_sentiment_data = []
                for review in recent_reviews:
                    if review['sentiment_score'] is not None:
                        rating_sentiment_data.append({
                            'rating': review['rating'],
                            'sentiment': review['sentiment_score']
                        })
                
                if rating_sentiment_data:
                    df = pd.DataFrame(rating_sentiment_data)
                    correlation = df['rating'].corr(df['sentiment'])
                else:
                    correlation = 0.0
                
                report = {
                    'product_id': product_id,
                    'product_name': product['name'] if product else 'Unknown',
                    'overall_rating': float(product['rating']) if product else 0.0,
                    'review_count': product['review_count'] if product else 0,
                    'summary': asdict(summary),
                    'recent_reviews': recent_reviews[:10],
                    'sentiment_timeline': sentiment_timeline,
                    'metrics': {
                        'average_sentiment': summary.average_sentiment,
                        'sentiment_variance': 1.0 - summary.sentiment_consistency,
                        'rating_sentiment_correlation': float(correlation),
                        'positive_review_ratio': (
                            summary.sentiment_distribution[SentimentLabel.POSITIVE.value] +
                            summary.sentiment_distribution[SentimentLabel.VERY_POSITIVE.value]
                        ) / max(sum(summary.sentiment_distribution.values()), 1),
                        'verified_review_sentiment': self._calculate_verified_sentiment(recent_reviews)
                    },
                    'recommendations': self._generate_recommendations(summary),
                    'generated_at': datetime.now().isoformat()
                }
                
                return report
        finally:
            self.db_pool.putconn(conn)
    
    def _calculate_verified_sentiment(self, reviews: List[Dict[str, Any]]) -> float:
        """Calculate average sentiment for verified purchases"""
        verified_scores = [
            r['sentiment_score'] for r in reviews 
            if r.get('sentiment_score') is not None
        ]
        
        if verified_scores:
            return float(np.mean(verified_scores))
        return 0.0
    
    def _generate_recommendations(self, summary: ProductSentimentSummary) -> List[str]:
        """Generate actionable recommendations based on sentiment analysis"""
        recommendations = []
        
        # Check overall sentiment
        if summary.average_sentiment < -0.3:
            recommendations.append(
                "Product has negative sentiment. Consider addressing common complaints."
            )
        elif summary.average_sentiment > 0.6:
            recommendations.append(
                "Product has excellent sentiment. Consider featuring positive reviews in marketing."
            )
        
        # Check aspect sentiments
        for aspect, score in summary.aspect_sentiments.items():
            if score < -0.4:
                recommendations.append(
                    f"Address {aspect} concerns: Customers are unhappy with this aspect."
                )
            elif score > 0.6:
                recommendations.append(
                    f"Highlight {aspect} strengths in product description: Customers love this aspect."
                )
        
        # Check sentiment consistency
        if summary.sentiment_consistency < 0.7:
            recommendations.append(
                "Sentiment is inconsistent. Consider standardizing product quality or managing expectations."
            )
        
        # Check trending sentiment
        if summary.trending_sentiment < -0.2:
            recommendations.append(
                "Sentiment is declining. Investigate recent changes or issues."
            )
        elif summary.trending_sentiment > 0.2:
            recommendations.append(
                "Sentiment is improving. Consider capitalizing on positive momentum."
            )
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    async def monitor_brand_sentiment(self, brand_id: str, days: int = 30) -> Dict[str, Any]:
        """Monitor sentiment across all products of a brand"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get brand products
                cur.execute("""
                    SELECT p.id, p.name, p.rating, p.review_count
                    FROM products p
                    WHERE p.brand_id = %s
                """, (brand_id,))
                
                products = [dict(row) for row in cur.fetchall()]
                
                # Analyze sentiment for each product
                product_sentiments = []
                
                for product in products:
                    try:
                        summary = await self.analyze_product_sentiment(product['id'])
                        product_sentiments.append({
                            'product_id': product['id'],
                            'product_name': product['name'],
                            'review_count': product['review_count'],
                            'average_sentiment': summary.average_sentiment,
                            'sentiment_label': self._score_to_label(summary.average_sentiment)
                        })
                    except Exception as e:
                        logger.error(f"Failed to analyze product {product['id']}: {e}")
                
                if not product_sentiments:
                    return {
                        'brand_id': brand_id,
                        'total_products': len(products),
                        'analyzed_products': 0,
                        'overall_sentiment': 0.0,
                        'product_sentiments': [],
                        'metrics': {},
                        'generated_at': datetime.now().isoformat()
                    }
                
                # Calculate overall metrics
                df = pd.DataFrame(product_sentiments)
                
                overall_sentiment = df['average_sentiment'].mean()
                sentiment_std = df['average_sentiment'].std()
                
                # Identify top and bottom performers
                top_performers = df.nlargest(5, 'average_sentiment').to_dict('records')
                bottom_performers = df.nsmallest(5, 'average_sentiment').to_dict('records')
                
                # Sentiment distribution
                sentiment_labels = df['sentiment_label'].value_counts().to_dict()
                
                return {
                    'brand_id': brand_id,
                    'total_products': len(products),
                    'analyzed_products': len(product_sentiments),
                    'overall_sentiment': float(overall_sentiment),
                    'sentiment_consistency': float(1 - sentiment_std) if len(product_sentiments) > 1 else 1.0,
                    'product_sentiments': product_sentiments,
                    'top_performers': top_performers,
                    'bottom_performers': bottom_performers,
                    'sentiment_distribution': sentiment_labels,
                    'metrics': {
                        'average_review_count': float(df['review_count'].mean()),
                        'sentiment_range': float(df['average_sentiment'].max() - df['average_sentiment'].min()),
                        'positive_product_ratio': len(df[df['average_sentiment'] > 0.2]) / len(df)
                    },
                    'generated_at': datetime.now().isoformat()
                }
        finally:
            self.db_pool.putconn(conn)
    
    async def detect_anomalous_reviews(self, product_id: str, threshold: float = 0.8) -> List[Dict[str, Any]]:
        """Detect potentially fake or anomalous reviews"""
        # Get all reviews for product
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        r.id, r.user_id, r.rating, r.title, r.comment,
                        r.created_at, r.is_verified, r.helpful_votes,
                        sa.sentiment_score, sa.sentiment_label
                    FROM reviews r
                    LEFT JOIN sentiment_analysis sa ON r.id = sa.review_id
                    WHERE r.product_id = %s
                    ORDER BY r.created_at DESC
                """, (product_id,))
                
                reviews = [dict(row) for row in cur.fetchall()]
                
                if len(reviews) < 10:
                    return []
                
                anomalous_reviews = []
                
                # Check for patterns indicating fake reviews
                for review in reviews:
                    anomaly_score = 0.0
                    anomaly_reasons = []
                    
                    # 1. Extreme rating with neutral/contradictory text
                    if review['sentiment_score'] is not None:
                        rating_sentiment_diff = abs((review['rating'] - 3) / 2 - review['sentiment_score'])
                        if rating_sentiment_diff > 0.7:
                            anomaly_score += 0.4
                            anomaly_reasons.append(f"Rating-text mismatch: rating={review['rating']}, sentiment={review['sentiment_score']:.2f}")
                    
                    # 2. Very short or very long reviews
                    text_length = len((review['title'] or '') + ' ' + (review['comment'] or ''))
                    if text_length < 20:
                        anomaly_score += 0.3
                        anomaly_reasons.append("Very short review")
                    elif text_length > 1000:
                        anomaly_score += 0.2
                        anomaly_reasons.append("Unusually long review")
                    
                    # 3. Generic language patterns
                    generic_phrases = [
                        'good product', 'nice item', 'works well', 'as described',
                        'fast delivery', 'recommend', 'happy with purchase'
                    ]
                    
                    review_text = (review['title'] or '').lower() + ' ' + (review['comment'] or '').lower()
                    generic_count = sum(phrase in review_text for phrase in generic_phrases)
                    
                    if generic_count >= 3:
                        anomaly_score += 0.3
                        anomaly_reasons.append(f"Contains {generic_count} generic phrases")
                    
                    # 4. Multiple reviews from same user in short time
                    # This would require additional user review history analysis
                    
                    # 5. Unverified purchase with extreme rating
                    if not review['is_verified'] and review['rating'] in [1, 5]:
                        anomaly_score += 0.2
                        anomaly_reasons.append("Extreme rating from unverified purchase")
                    
                    if anomaly_score >= threshold:
                        anomalous_reviews.append({
                            'review_id': review['id'],
                            'user_id': review['user_id'],
                            'rating': review['rating'],
                            'anomaly_score': anomaly_score,
                            'reasons': anomaly_reasons,
                            'created_at': review['created_at'].isoformat() if review['created_at'] else None
                        })
                
                return anomalous_reviews
        finally:
            self.db_pool.putconn(conn)
    
    async def create_sentiment_wordcloud(self, product_id: str) -> Optional[bytes]:
        """Create word cloud visualization for product sentiment"""
        # Get all review text for product
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT r.title, r.comment, sa.sentiment_score
                    FROM reviews r
                    LEFT JOIN sentiment_analysis sa ON r.id = sa.review_id
                    WHERE r.product_id = %s
                """, (product_id,))
                
                reviews = cur.fetchall()
                
                if not reviews:
                    return None
                
                # Separate positive and negative words
                positive_words = []
                negative_words = []
                
                for review in reviews:
                    text = f"{review['title']} {review['comment']}"
                    sentiment = review['sentiment_score'] or 0
                    
                    # Preprocess text
                    text = self.preprocess_text(text)
                    words = text.split()
                    
                    # Remove stop words
                    words = [word for word in words if word not in self.stop_words and len(word) > 2]
                    
                    if sentiment > 0.2:
                        positive_words.extend(words)
                    elif sentiment < -0.2:
                        negative_words.extend(words)
                
                # Create word cloud
                plt.figure(figsize=(15, 7))
                
                # Positive word cloud
                if positive_words:
                    plt.subplot(1, 2, 1)
                    wordcloud = WordCloud(
                        width=800, height=400,
                        background_color='white',
                        colormap='Greens',
                        max_words=100
                    ).generate(' '.join(positive_words))
                    
                    plt.imshow(wordcloud, interpolation='bilinear')
                    plt.axis('off')
                    plt.title('Positive Sentiment Words', fontsize=14, pad=20)
                
                # Negative word cloud
                if negative_words:
                    plt.subplot(1, 2, 2)
                    wordcloud = WordCloud(
                        width=800, height=400,
                        background_color='white',
                        colormap='Reds',
                        max_words=100
                    ).generate(' '.join(negative_words))
                    
                    plt.imshow(wordcloud, interpolation='bilinear')
                    plt.axis('off')
                    plt.title('Negative Sentiment Words', fontsize=14, pad=20)
                
                plt.tight_layout()
                
                # Save to bytes
                import io
                buf = io.BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
                plt.close()
                
                return buf.getvalue()
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
    engine = SentimentAnalysisEngine(db_config, redis_config)
    
    try:
        # Example: Analyze a single review
        review_id = "review_123456"
        analysis = await engine.analyze_review(review_id)
        
        if analysis:
            print(f"Review Analysis:")
            print(f"Sentiment Score: {analysis.sentiment_score:.4f}")
            print(f"Sentiment Label: {analysis.sentiment_label.upper()}")
            print(f"Confidence: {analysis.confidence:.1%}")
            print(f"Key Phrases: {', '.join(analysis.key_phrases[:3])}")
            print(f"Top Aspect: {max(analysis.aspects.items(), key=lambda x: abs(x[1]))}")
            print(f"Top Emotion: {max(analysis.emotion_scores.items(), key=lambda x: x[1])}")
        
        # Example: Analyze product sentiment
        product_id = "prod_123"
        summary = await engine.analyze_product_sentiment(product_id)
        
        print(f"\nProduct Sentiment Summary:")
        print(f"Average Sentiment: {summary.average_sentiment:.4f}")
        print(f"Sentiment Distribution: {summary.sentiment_distribution}")
        print(f"Trending: {'↑' if summary.trending_sentiment > 0 else '↓'} {abs(summary.trending_sentiment):.4f}")
        
        # Generate comprehensive report
        report = await engine.generate_sentiment_report(product_id)
        print(f"\nPositive Review Ratio: {report['metrics']['positive_review_ratio']:.1%}")
        print(f"Recommendations: {report['recommendations'][:2]}")
        
        # Detect anomalous reviews
        anomalies = await engine.detect_anomalous_reviews(product_id)
        print(f"\nDetected {len(anomalies)} potentially anomalous reviews")
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
