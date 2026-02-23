import numpy as np
import cv2
import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image, ImageOps, ImageEnhance
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
import pickle
from dataclasses import dataclass
from enum import Enum
import logging
import asyncio
import aiohttp
import aiofiles
from concurrent.futures import ThreadPoolExecutor
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import base64
import io
import hashlib
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ImageMetadata:
    image_id: str
    product_id: str
    image_url: str
    width: int
    height: int
    file_size: int
    format: str
    uploaded_at: datetime
    dominant_colors: List[Tuple[int, int, int]]
    average_color: Tuple[int, int, int]
    brightness: float
    contrast: float
    sharpness: float
    blur_score: float

@dataclass
class RecognitionResult:
    product_id: str
    image_id: str
    detected_objects: List[Dict[str, Any]]
    detected_tags: List[str]
    color_palette: Dict[str, List[Tuple[int, int, int]]]
    quality_score: float
    similarity_scores: Dict[str, float]
    metadata: Dict[str, Any]
    processing_time: float

class ImageQuality(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNUSABLE = "unusable"

class ObjectCategory(Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    HOME = "home"
    BEAUTY = "beauty"
    SPORTS = "sports"
    AUTOMOTIVE = "automotive"
    FOOD = "food"
    OTHER = "other"

class ImageRecognitionEngine:
    def __init__(self, db_config: Dict[str, Any], redis_config: Dict[str, Any]):
        self.db_config = db_config
        self.redis_config = redis_config
        self.redis_client = None
        self.db_pool = None
        
        # Initialize device (GPU if available)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Load pre-trained models
        self._load_models()
        
        # Image transformation pipeline
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        # COCO class names for object detection
        self.coco_classes = [
            'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
            'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
            'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
            'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
            'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
            'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
            'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
            'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
            'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
            'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
            'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
            'toothbrush'
        ]
        
        # Product-specific categories
        self.product_categories = {
            'electronics': ['laptop', 'cell phone', 'tv', 'keyboard', 'mouse', 'remote', 'clock'],
            'fashion': ['handbag', 'tie', 'suitcase', 'backpack', 'umbrella'],
            'home': ['chair', 'couch', 'bed', 'dining table', 'toilet', 'vase', 'clock'],
            'beauty': ['bottle', 'hair drier', 'toothbrush'],
            'sports': ['sports ball', 'baseball bat', 'tennis racket', 'skateboard', 'surfboard'],
            'automotive': ['car', 'motorcycle', 'bus', 'train', 'truck', 'bicycle'],
            'food': ['banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'pizza', 'donut']
        }
        
        self.initialize_connections()
    
    def _load_models(self):
        """Load pre-trained PyTorch models"""
        try:
            # Object detection model (Faster R-CNN)
            self.detection_model = models.detection.fasterrcnn_resnet50_fpn(
                pretrained=True,
                progress=True
            )
            self.detection_model.eval()
            self.detection_model.to(self.device)
            
            # Image classification model (ResNet)
            self.classification_model = models.resnet50(pretrained=True)
            self.classification_model.eval()
            self.classification_model.to(self.device)
            
            # Feature extraction model for similarity
            self.feature_model = models.resnet50(pretrained=True)
            # Remove final classification layer
            self.feature_model = torch.nn.Sequential(
                *(list(self.feature_model.children())[:-1])
            )
            self.feature_model.eval()
            self.feature_model.to(self.device)
            
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
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
                decode_responses=False  # Keep binary for image storage
            )
            
            logger.info("Image recognition engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connections: {e}")
            raise
    
    async def download_image(self, image_url: str) -> Optional[bytes]:
        """Download image from URL"""
        cache_key = f"image_cache:{hashlib.md5(image_url.encode()).hexdigest()}"
        
        # Try cache first
        cached = self.redis_client.get(cache_key)
        if cached:
            logger.info(f"Image cache hit: {image_url}")
            return cached
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(image_url) as response:
                    if response.status == 200:
                        image_data = await response.read()
                        
                        # Cache for 24 hours
                        self.redis_client.setex(cache_key, 86400, image_data)
                        
                        return image_data
                    else:
                        logger.error(f"Failed to download image: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Image download failed: {e}")
            return None
    
    def bytes_to_image(self, image_data: bytes) -> Optional[Image.Image]:
        """Convert bytes to PIL Image"""
        try:
            image = Image.open(io.BytesIO(image_data))
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            return image
        except Exception as e:
            logger.error(f"Failed to convert bytes to image: {e}")
            return None
    
    def extract_image_metadata(self, image: Image.Image) -> Dict[str, Any]:
        """Extract basic metadata from image"""
        width, height = image.size
        format = image.format or 'UNKNOWN'
        
        # Calculate image statistics
        image_array = np.array(image)
        
        # Dominant colors using k-means
        pixels = image_array.reshape(-1, 3)
        pixels = pixels.astype(np.float32)
        
        # Simple color quantization
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
        kmeans.fit(pixels[:10000])  # Sample for speed
        
        dominant_colors = kmeans.cluster_centers_.astype(int)
        dominant_colors = [tuple(color) for color in dominant_colors]
        
        # Average color
        average_color = tuple(np.mean(pixels, axis=0).astype(int))
        
        # Calculate image quality metrics
        gray_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        # Brightness
        brightness = np.mean(gray_image) / 255.0
        
        # Contrast (standard deviation)
        contrast = np.std(gray_image) / 128.0
        
        # Sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
        sharpness = np.var(laplacian)
        
        # Blur score (using Laplacian variance)
        blur_score = 1.0 / (1.0 + sharpness)
        
        return {
            'width': width,
            'height': height,
            'format': format,
            'dominant_colors': dominant_colors,
            'average_color': average_color,
            'brightness': float(brightness),
            'contrast': float(contrast),
            'sharpness': float(sharpness),
            'blur_score': float(blur_score),
            'aspect_ratio': width / height
        }
    
    def assess_image_quality(self, metadata: Dict[str, Any]) -> Tuple[ImageQuality, float]:
        """Assess image quality based on metadata"""
        score = 0.0
        reasons = []
        
        # Resolution score
        width, height = metadata['width'], metadata['height']
        megapixels = (width * height) / 1_000_000
        
        if megapixels >= 8:
            score += 0.3
        elif megapixels >= 2:
            score += 0.2
        elif megapixels >= 0.5:
            score += 0.1
        else:
            reasons.append("Low resolution")
        
        # Brightness score
        brightness = metadata['brightness']
        if 0.3 <= brightness <= 0.7:
            score += 0.2
        elif 0.2 <= brightness <= 0.8:
            score += 0.1
        else:
            reasons.append("Poor lighting")
        
        # Contrast score
        contrast = metadata['contrast']
        if contrast >= 0.3:
            score += 0.2
        elif contrast >= 0.2:
            score += 0.1
        else:
            reasons.append("Low contrast")
        
        # Sharpness score
        blur_score = metadata['blur_score']
        if blur_score <= 0.1:
            score += 0.3
        elif blur_score <= 0.3:
            score += 0.2
        elif blur_score <= 0.5:
            score += 0.1
        else:
            reasons.append("Image is blurry")
        
        # Determine quality level
        if score >= 0.8:
            quality = ImageQuality.EXCELLENT
        elif score >= 0.6:
            quality = ImageQuality.GOOD
        elif score >= 0.4:
            quality = ImageQuality.FAIR
        elif score >= 0.2:
            quality = ImageQuality.POOR
        else:
            quality = ImageQuality.UNUSABLE
        
        return quality, score
    
    def detect_objects(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Detect objects in image using Faster R-CNN"""
        try:
            # Convert PIL to tensor
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Run detection
            with torch.no_grad():
                predictions = self.detection_model(image_tensor)
            
            # Process predictions
            detections = []
            
            boxes = predictions[0]['boxes'].cpu().numpy()
            scores = predictions[0]['scores'].cpu().numpy()
            labels = predictions[0]['labels'].cpu().numpy()
            
            for box, score, label in zip(boxes, scores, labels):
                if score > 0.5:  # Confidence threshold
                    detection = {
                        'class_id': int(label),
                        'class_name': self.coco_classes[label] if label < len(self.coco_classes) else f'class_{label}',
                        'confidence': float(score),
                        'bounding_box': {
                            'x1': float(box[0]),
                            'y1': float(box[1]),
                            'x2': float(box[2]),
                            'y2': float(box[3]),
                            'width': float(box[2] - box[0]),
                            'height': float(box[3] - box[1])
                        }
                    }
                    detections.append(detection)
            
            return detections
        except Exception as e:
            logger.error(f"Object detection failed: {e}")
            return []
    
    def classify_image(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Classify image content using ResNet"""
        try:
            # Transform image
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Run classification
            with torch.no_grad():
                outputs = self.classification_model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
            # Get top predictions
            top_probs, top_indices = torch.topk(probabilities, 5)
            
            predictions = []
            for prob, idx in zip(top_probs, top_indices):
                predictions.append({
                    'class_id': int(idx),
                    'class_name': self.coco_classes[idx] if idx < len(self.coco_classes) else f'class_{idx}',
                    'confidence': float(prob)
                })
            
            return predictions
        except Exception as e:
            logger.error(f"Image classification failed: {e}")
            return []
    
    def extract_features(self, image: Image.Image) -> np.ndarray:
        """Extract feature vector for image similarity"""
        try:
            # Transform image
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Extract features
            with torch.no_grad():
                features = self.feature_model(image_tensor)
            
            # Flatten and normalize
            features = features.cpu().numpy().flatten()
            features = features / np.linalg.norm(features)
            
            return features
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            return np.zeros(2048)  # ResNet50 feature size
    
    def categorize_product(self, detections: List[Dict[str, Any]]) -> Tuple[str, float]:
        """Categorize product based on detected objects"""
        category_scores = {category.value: 0.0 for category in ObjectCategory}
        
        for detection in detections:
            class_name = detection['class_name']
            confidence = detection['confidence']
            
            for category, keywords in self.product_categories.items():
                if class_name in keywords:
                    category_scores[category] += confidence
        
        # Also check for other product-specific patterns
        for detection in detections:
            class_name = detection['class_name']
            
            # Electronics patterns
            if any(keyword in class_name for keyword in ['phone', 'laptop', 'tv', 'computer']):
                category_scores['electronics'] += 0.5
            
            # Fashion patterns
            if any(keyword in class_name for keyword in ['bag', 'shoe', 'dress', 'shirt']):
                category_scores['fashion'] += 0.5
        
        # Get best category
        best_category = max(category_scores.items(), key=lambda x: x[1])
        
        if best_category[1] > 0:
            return best_category[0], best_category[1]
        else:
            return ObjectCategory.OTHER.value, 0.0
    
    def generate_color_palette(self, image: Image.Image) -> Dict[str, List[Tuple[int, int, int]]]:
        """Generate color palette from image"""
        try:
            # Resize for faster processing
            image_small = image.resize((100, 100))
            pixels = np.array(image_small).reshape(-1, 3)
            
            # K-means clustering for palette
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=8, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            # Get cluster centers
            colors = kmeans.cluster_centers_.astype(int)
            
            # Sort by frequency
            labels = kmeans.labels_
            counts = np.bincount(labels)
            sorted_indices = np.argsort(counts)[::-1]
            
            # Get primary and secondary colors
            primary_colors = [tuple(colors[i]) for i in sorted_indices[:3]]
            secondary_colors = [tuple(colors[i]) for i in sorted_indices[3:6]]
            
            # Convert RGB to hex
            def rgb_to_hex(rgb):
                return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])
            
            return {
                'primary': primary_colors,
                'secondary': secondary_colors,
                'hex_primary': [rgb_to_hex(c) for c in primary_colors],
                'hex_secondary': [rgb_to_hex(c) for c in secondary_colors]
            }
        except Exception as e:
            logger.error(f"Color palette generation failed: {e}")
            return {
                'primary': [(255, 255, 255)],
                'secondary': [],
                'hex_primary': ['#ffffff'],
                'hex_secondary': []
            }
    
    def detect_tags(self, detections: List[Dict[str, Any]], category: str) -> List[str]:
        """Generate relevant tags based on detections and category"""
        tags = set()
        
        # Add category tag
        tags.add(category)
        
        # Add object tags with high confidence
        for detection in detections:
            if detection['confidence'] > 0.7:
                class_name = detection['class_name']
                tags.add(class_name.replace(' ', '_'))
                
                # Add related tags
                if 'phone' in class_name:
                    tags.add('mobile')
                    tags.add('smartphone')
                elif 'laptop' in class_name:
                    tags.add('computer')
                    tags.add('notebook')
                elif 'shirt' in class_name:
                    tags.add('clothing')
                    tags.add('apparel')
        
        # Add size-related tags based on bounding boxes
        if detections:
            avg_width = np.mean([d['bounding_box']['width'] for d in detections])
            avg_height = np.mean([d['bounding_box']['height'] for d in detections])
            
            if avg_width > 0.6:
                tags.add('large')
            elif avg_width < 0.3:
                tags.add('small')
            
            if avg_height > 0.6:
                tags.add('tall')
            elif avg_height < 0.3:
                tags.add('short')
        
        return list(tags)[:10]  # Limit to 10 tags
    
    async def process_product_image(self, product_id: str, image_url: str) -> Optional[RecognitionResult]:
        """Main image processing pipeline"""
        start_time = datetime.now()
        
        try:
            # Download image
            image_data = await self.download_image(image_url)
            if not image_data:
                logger.error(f"Failed to download image: {image_url}")
                return None
            
            # Convert to PIL Image
            image = self.bytes_to_image(image_data)
            if not image:
                return None
            
            # Extract metadata
            metadata = self.extract_image_metadata(image)
            
            # Assess quality
            quality, quality_score = self.assess_image_quality(metadata)
            
            # Skip processing for unusable images
            if quality == ImageQuality.UNUSABLE:
                logger.warning(f"Image quality too poor: {image_url}")
                return None
            
            # Detect objects
            detections = self.detect_objects(image)
            
            # Classify image
            classifications = self.classify_image(image)
            
            # Categorize product
            category, category_confidence = self.categorize_product(detections)
            
            # Generate color palette
            color_palette = self.generate_color_palette(image)
            
            # Generate tags
            tags = self.detect_tags(detections, category)
            
            # Extract features for similarity
            features = self.extract_features(image)
            
            # Calculate similarity with existing product images
            similarity_scores = await self.calculate_similarities(product_id, features)
            
            # Store features for future similarity search
            await self.store_image_features(product_id, image_url, features)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = RecognitionResult(
                product_id=product_id,
                image_id=hashlib.md5(image_data).hexdigest(),
                detected_objects=detections,
                detected_tags=tags,
                color_palette=color_palette,
                quality_score=quality_score,
                similarity_scores=similarity_scores,
                metadata={
                    'quality': quality.value,
                    'category': category,
                    'category_confidence': category_confidence,
                    'detection_count': len(detections),
                    'classification_top': classifications[0]['class_name'] if classifications else 'unknown',
                    **metadata
                },
                processing_time=processing_time
            )
            
            # Store result in database
            await self.store_recognition_result(result, image_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return None
    
    async def calculate_similarities(self, product_id: str, features: np.ndarray) -> Dict[str, float]:
        """Calculate similarity with other product images"""
        similarities = {}
        
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get features of other products in same category
                cur.execute("""
                    SELECT p.id, pif.feature_vector
                    FROM product_image_features pif
                    JOIN products p ON pif.product_id = p.id
                    WHERE p.id != %s
                    AND pif.feature_vector IS NOT NULL
                    LIMIT 50
                """, (product_id,))
                
                rows = cur.fetchall()
                
                for row in rows:
                    try:
                        other_features = pickle.loads(row['feature_vector'])
                        
                        # Calculate cosine similarity
                        similarity = np.dot(features, other_features)
                        
                        # Store if similarity is significant
                        if similarity > 0.7:
                            similarities[row['id']] = float(similarity)
                    except Exception as e:
                        logger.warning(f"Failed to calculate similarity: {e}")
                        continue
                
                # Sort by similarity
                sorted_similarities = dict(
                    sorted(similarities.items(), key=lambda x: x[1], reverse=True)[:10]
                )
                
                return sorted_similarities
        finally:
            self.db_pool.putconn(conn)
    
    async def store_image_features(self, product_id: str, image_url: str, features: np.ndarray):
        """Store image features for similarity search"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                feature_blob = pickle.dumps(features)
                
                cur.execute("""
                    INSERT INTO product_image_features 
                    (product_id, image_url, feature_vector, created_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (product_id, image_url) 
                    DO UPDATE SET 
                        feature_vector = EXCLUDED.feature_vector,
                        created_at = NOW()
                """, (product_id, image_url, psycopg2.Binary(feature_blob)))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store image features: {e}")
        finally:
            self.db_pool.putconn(conn)
    
    async def store_recognition_result(self, result: RecognitionResult, image_data: bytes):
        """Store recognition result in database"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Store image analysis
                cur.execute("""
                    INSERT INTO image_analysis 
                    (product_id, image_hash, detected_objects, detected_tags,
                     color_palette, quality_score, similarity_scores, metadata,
                     processing_time, analyzed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (product_id, image_hash) 
                    DO UPDATE SET 
                        detected_objects = EXCLUDED.detected_objects,
                        detected_tags = EXCLUDED.detected_tags,
                        color_palette = EXCLUDED.color_palette,
                        quality_score = EXCLUDED.quality_score,
                        similarity_scores = EXCLUDED.similarity_scores,
                        metadata = EXCLUDED.metadata,
                        processing_time = EXCLUDED.processing_time,
                        analyzed_at = NOW()
                """, (
                    result.product_id,
                    result.image_id,
                    json.dumps(result.detected_objects),
                    json.dumps(result.detected_tags),
                    json.dumps(result.color_palette),
                    result.quality_score,
                    json.dumps(result.similarity_scores),
                    json.dumps(result.metadata),
                    result.processing_time
                ))
                
                # Update product category if confident
                if result.metadata['category_confidence'] > 0.8:
                    cur.execute("""
                        UPDATE products 
                        SET ai_category = %s,
                            ai_category_confidence = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        AND (ai_category_confidence IS NULL OR ai_category_confidence < %s)
                    """, (
                        result.metadata['category'],
                        result.metadata['category_confidence'],
                        result.product_id,
                        result.metadata['category_confidence']
                    ))
                
                conn.commit()
                logger.info(f"Stored recognition result for product {result.product_id}")
        except Exception as e:
            logger.error(f"Failed to store recognition result: {e}")
        finally:
            self.db_pool.putconn(conn)
    
    async def batch_process_images(self, product_images: List[Dict[str, str]]) -> List[RecognitionResult]:
        """Process multiple images in batch"""
        results = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:  # Limit concurrent downloads
            futures = []
            for item in product_images:
                future = asyncio.get_event_loop().run_in_executor(
                    executor,
                    lambda pi=item: asyncio.run(self.process_product_image(pi['product_id'], pi['image_url']))
                )
                futures.append(future)
            
            for future in futures:
                try:
                    result = await future
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.error(f"Batch processing failed: {e}")
        
        return results
    
    async def search_similar_products(self, image_url: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar products using image"""
        try:
            # Process input image
            image_data = await self.download_image(image_url)
            if not image_data:
                return []
            
            image = self.bytes_to_image(image_data)
            if not image:
                return []
            
            # Extract features
            features = self.extract_features(image)
            
            # Search for similar products
            conn = self.db_pool.getconn()
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT 
                            p.id, p.name, p.price, p.rating, p.review_count,
                            pif.image_url, pif.feature_vector,
                            c.name as category, b.name as brand
                        FROM product_image_features pif
                        JOIN products p ON pif.product_id = p.id
                        LEFT JOIN categories c ON p.category_id = c.id
                        LEFT JOIN brands b ON p.brand_id = b.id
                        WHERE pif.feature_vector IS NOT NULL
                        AND p.stock > 0
                        ORDER BY pif.created_at DESC
                        LIMIT 1000
                    """)
                    
                    rows = cur.fetchall()
                    similar_products = []
                    
                    for row in rows:
                        try:
                            other_features = pickle.loads(row['feature_vector'])
                            similarity = np.dot(features, other_features)
                            
                            if similarity > 0.7:  # Similarity threshold
                                similar_products.append({
                                    'product_id': row['id'],
                                    'product_name': row['name'],
                                    'price': float(row['price']),
                                    'rating': float(row['rating']),
                                    'review_count': row['review_count'],
                                    'category': row['category'],
                                    'brand': row['brand'],
                                    'image_url': row['image_url'],
                                    'similarity_score': float(similarity)
                                })
                        except Exception as e:
                            continue
                    
                    # Sort by similarity and limit results
                    similar_products.sort(key=lambda x: x['similarity_score'], reverse=True)
                    return similar_products[:limit]
            finally:
                self.db_pool.putconn(conn)
                
        except Exception as e:
            logger.error(f"Similar product search failed: {e}")
            return []
    
    async def validate_product_images(self, product_id: str) -> Dict[str, Any]:
        """Validate all images for a product"""
        conn = self.db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get product images
                cur.execute("""
                    SELECT image_url
                    FROM products
                    WHERE id = %s
                    AND images IS NOT NULL
                    AND CARDINALITY(images) > 0
                """, (product_id,))
                
                product = cur.fetchone()
                if not product or not product['images']:
                    return {
                        'product_id': product_id,
                        'has_images': False,
                        'validation_results': [],
                        'summary': {}
                    }
                
                # Process each image
                validation_results = []
                for image_url in product['images'][:10]:  # Limit to first 10 images
                    try:
                        result = await self.process_product_image(product_id, image_url)
                        if result:
                            validation_results.append({
                                'image_url': image_url,
                                'quality_score': result.quality_score,
                                'detection_count': len(result.detected_objects),
                                'category': result.metadata['category'],
                                'tags': result.detected_tags
                            })
                    except Exception as e:
                        logger.error(f"Image validation failed: {e}")
                        validation_results.append({
                            'image_url': image_url,
                            'error': str(e),
                            'quality_score': 0.0
                        })
                
                # Generate summary
                if validation_results:
                    quality_scores = [r['quality_score'] for r in validation_results if 'quality_score' in r]
                    avg_quality = np.mean(quality_scores) if quality_scores else 0.0
                    
                    # Count by quality level
                    quality_counts = {
                        'excellent': sum(1 for r in validation_results if r.get('quality_score', 0) >= 0.8),
                        'good': sum(1 for r in validation_results if 0.6 <= r.get('quality_score', 0) < 0.8),
                        'fair': sum(1 for r in validation_results if 0.4 <= r.get('quality_score', 0) < 0.6),
                        'poor': sum(1 for r in validation_results if r.get('quality_score', 0) < 0.4)
                    }
                    
                    # Most common category
                    categories = [r.get('category') for r in validation_results if r.get('category')]
                    if categories:
                        most_common_category = max(set(categories), key=categories.count)
                    else:
                        most_common_category = 'unknown'
                    
                    summary = {
                        'total_images': len(validation_results),
                        'average_quality_score': float(avg_quality),
                        'quality_distribution': quality_counts,
                        'recommended_category': most_common_category,
                        'has_detections': any(r.get('detection_count', 0) > 0 for r in validation_results),
                        'recommendations': self._generate_image_recommendations(validation_results)
                    }
                else:
                    summary = {
                        'total_images': 0,
                        'average_quality_score': 0.0,
                        'quality_distribution': {},
                        'recommended_category': 'unknown',
                        'has_detections': False,
                        'recommendations': ['No valid images found']
                    }
                
                return {
                    'product_id': product_id,
                    'has_images': len(validation_results) > 0,
                    'validation_results': validation_results[:5],  # Limit results
                    'summary': summary
                }
        finally:
            self.db_pool.putconn(conn)
    
    def _generate_image_recommendations(self, validation_results: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations for image improvement"""
        recommendations = []
        
        # Check for quality issues
        poor_images = [r for r in validation_results if r.get('quality_score', 0) < 0.5]
        if poor_images:
            recommendations.append(f"Replace {len(poor_images)} low-quality images")
        
        # Check for missing detections
        no_detection_images = [r for r in validation_results if r.get('detection_count', 0) == 0]
        if no_detection_images:
            recommendations.append(f"{len(no_detection_images)} images show no recognizable objects")
        
        # Check for consistent category
        categories = [r.get('category') for r in validation_results if r.get('category')]
        if categories:
            unique_categories = set(categories)
            if len(unique_categories) > 1:
                recommendations.append(f"Images show {len(unique_categories)} different categories - consider consistency")
        
        # Check image count
        if len(validation_results) < 3:
            recommendations.append("Add more images (minimum 3 recommended)")
        elif len(validation_results) > 10:
            recommendations.append("Consider reducing number of images (10+ may be excessive)")
        
        return recommendations[:5]
    
    async def generate_alt_text(self, image_url: str) -> str:
        """Generate alt text for accessibility"""
        try:
            # Process image
            result = await self.process_product_image('temp', image_url)
            if not result:
                return "Product image"
            
            # Build alt text from detections
            objects = result.detected_objects[:3]  # Top 3 objects
            if objects:
                object_names = [obj['class_name'] for obj in objects]
                objects_text = ', '.join(object_names)
                
                # Add color information
                if result.color_palette['primary']:
                    color = result.color_palette['hex_primary'][0]
                    # Simple color name mapping
                    color_names = {
                        '#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue',
                        '#ffff00': 'yellow', '#ff00ff': 'magenta', '#00ffff': 'cyan',
                        '#000000': 'black', '#ffffff': 'white'
                    }
                    color_name = color_names.get(color, 'colored')
                else:
                    color_name = ''
                
                # Add quality indicator
                quality = result.metadata['quality']
                quality_text = 'high quality' if quality == 'excellent' else ''
                
                alt_text = f"{color_name} {objects_text} {quality_text}".strip()
                return alt_text.capitalize()
            else:
                return "Product photograph"
        except Exception as e:
            logger.error(f"Alt text generation failed: {e}")
            return "Product image"

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
    engine = ImageRecognitionEngine(db_config, redis_config)
    
    try:
        # Example: Process a product image
        product_id = "prod_123"
        image_url = "https://example.com/product-image.jpg"
        
        result = await engine.process_product_image(product_id, image_url)
        
        if result:
            print(f"Image Processing Results:")
            print(f"Quality Score: {result.quality_score:.2f}")
            print(f"Detected Objects: {len(result.detected_objects)}")
            print(f"Product Category: {result.metadata['category']}")
            print(f"Tags: {', '.join(result.detected_tags[:5])}")
            print(f"Processing Time: {result.processing_time:.2f}s")
            
            # Show top detected objects
            for obj in result.detected_objects[:3]:
                print(f"  - {obj['class_name']}: {obj['confidence']:.2%}")
        
        # Example: Search similar products
        print(f"\nSearching similar products...")
        similar = await engine.search_similar_products(image_url, limit=3)
        
        if similar:
            print(f"Found {len(similar)} similar products:")
            for prod in similar:
                print(f"  - {prod['product_name']}: {prod['similarity_score']:.2%}")
        
        # Example: Validate product images
        print(f"\nValidating product images...")
        validation = await engine.validate_product_images(product_id)
        
        if validation['has_images']:
            print(f"Image Quality: {validation['summary']['average_quality_score']:.2f}")
            print(f"Recommendations: {validation['summary']['recommendations']}")
        
        # Example: Generate alt text
        alt_text = await engine.generate_alt_text(image_url)
        print(f"\nGenerated Alt Text: {alt_text}")
        
    finally:
        # Cleanup
        if engine.db_pool:
            engine.db_pool.closeall()
        if engine.redis_client:
            engine.redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
