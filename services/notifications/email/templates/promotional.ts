export const promotionalTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}} - Xarastore</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            padding: 40px 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==');
            opacity: 0.1;
        }
        
        .logo {
            font-size: 42px;
            font-weight: bold;
            color: white;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }
        
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
        }
        
        .promo-badge {
            display: inline-block;
            background-color: #fbbf24;
            color: #92400e;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 16px;
            position: relative;
            z-index: 1;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .hero {
            text-align: center;
            padding: 48px 32px;
            background: linear-gradient(to bottom, #fef2f2, #ffffff);
        }
        
        .hero-title {
            font-size: 36px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 16px;
            line-height: 1.2;
        }
        
        .hero-subtitle {
            font-size: 20px;
            color: #6b7280;
            margin-bottom: 32px;
        }
        
        .highlight {
            color: #dc2626;
            font-weight: 600;
        }
        
        .countdown {
            background-color: #1f2937;
            color: white;
            padding: 24px;
            border-radius: 12px;
            display: inline-flex;
            gap: 24px;
            margin: 32px 0;
        }
        
        .countdown-item {
            text-align: center;
        }
        
        .countdown-value {
            font-size: 32px;
            font-weight: bold;
            color: #fbbf24;
            font-family: monospace;
        }
        
        .countdown-label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin: 48px 32px;
        }
        
        .product-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
            background-color: white;
        }
        
        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .product-image {
            height: 200px;
            background-color: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 14px;
            position: relative;
        }
        
        .product-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background-color: #dc2626;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .product-content {
            padding: 20px;
        }
        
        .product-category {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .product-name {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        
        .product-price {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .price-current {
            font-size: 20px;
            font-weight: bold;
            color: #dc2626;
        }
        
        .price-original {
            font-size: 14px;
            color: #9ca3af;
            text-decoration: line-through;
        }
        
        .price-discount {
            background-color: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .product-button {
            display: block;
            text-align: center;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .product-button:hover {
            background-color: #b91c1c;
            text-decoration: none;
        }
        
        .benefits {
            background-color: #f0f9ff;
            padding: 48px 32px;
            margin: 32px 0;
        }
        
        .benefits-title {
            font-size: 28px;
            font-weight: bold;
            color: #0369a1;
            text-align: center;
            margin-bottom: 40px;
        }
        
        .benefits-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
        }
        
        .benefit-item {
            text-align: center;
        }
        
        .benefit-icon {
            width: 64px;
            height: 64px;
            background-color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
            color: #dc2626;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .benefit-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .benefit-description {
            color: #6b7280;
            font-size: 14px;
        }
        
        .cta-section {
            text-align: center;
            padding: 60px 32px;
            background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
        }
        
        .cta-title {
            font-size: 32px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .cta-subtitle {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 40px;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            padding: 18px 48px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
            transition: all 0.3s;
            box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3);
        }
        
        .cta-button:hover {
            background-color: #b91c1c;
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(220, 38, 38, 0.4);
            text-decoration: none;
        }
        
        .testimonial {
            background-color: #f9fafb;
            padding: 48px 32px;
            margin: 32px 0;
            border-radius: 12px;
            text-align: center;
        }
        
        .testimonial-quote {
            font-size: 20px;
            color: #4b5563;
            font-style: italic;
            margin-bottom: 24px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .testimonial-author {
            font-weight: 600;
            color: #111827;
        }
        
        .testimonial-role {
            font-size: 14px;
            color: #6b7280;
        }
        
        .guarantee {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin: 32px 0;
            padding: 24px;
            background-color: #fef2f2;
            border-radius: 12px;
        }
        
        .guarantee-icon {
            width: 48px;
            height: 48px;
            background-color: #dc2626;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .guarantee-text {
            font-size: 16px;
            color: #111827;
            font-weight: 500;
        }
        
        .footer {
            background-color: #1f2937;
            color: white;
            padding: 48px 32px;
            text-align: center;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin-bottom: 32px;
            flex-wrap: wrap;
        }
        
        .footer-link {
            color: #d1d5db;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }
        
        .footer-link:hover {
            color: white;
        }
        
        .social-icons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 32px 0;
        }
        
        .social-icon {
            width: 40px;
            height: 40px;
            background-color: #374151;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .social-icon:hover {
            background-color: #dc2626;
        }
        
        .unsubscribe {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #374151;
        }
        
        .unsubscribe-link {
            color: #d1d5db;
            text-decoration: underline;
        }
        
        .contact-info {
            font-size: 14px;
            color: #9ca3af;
            margin-top: 24px;
        }
        
        @media (max-width: 640px) {
            .container {
                border-radius: 0;
            }
            
            .hero-title {
                font-size: 28px;
            }
            
            .hero-subtitle {
                font-size: 18px;
            }
            
            .countdown {
                flex-direction: column;
                gap: 16px;
            }
            
            .products-grid {
                grid-template-columns: 1fr;
                margin: 32px 20px;
            }
            
            .benefits-grid {
                grid-template-columns: 1fr;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 16px;
            }
            
            .cta-button {
                padding: 16px 32px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Xarastore</div>
            <div class="tagline">it's a deal</div>
            <div class="promo-badge">LIMITED TIME OFFER</div>
        </div>
        
        <div class="hero">
            <h1 class="hero-title">{{campaignTitle}}</h1>
            <p class="hero-subtitle">
                {{campaignSubtitle}} <span class="highlight">{{highlightText}}</span>
            </p>
            
            <div class="countdown">
                <div class="countdown-item">
                    <div class="countdown-value">{{days}}</div>
                    <div class="countdown-label">Days</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value">{{hours}}</div>
                    <div class="countdown-label">Hours</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value">{{minutes}}</div>
                    <div class="countdown-label">Minutes</div>
                </div>
                <div class="countdown-item">
                    <div class="countdown-value">{{seconds}}</div>
                    <div class="countdown-label">Seconds</div>
                </div>
            </div>
        </div>
        
        {% if featuredProducts.length > 0 %}
        <div class="products-grid">
            {% for product in featuredProducts %}
            <div class="product-card">
                <div class="product-image">
                    <div class="product-badge">-{{product.discount}}%</div>
                    {% if product.image %}
                    <img src="{{product.image}}" alt="{{product.name}}" style="width: 100%; height: 100%; object-fit: cover;">
                    {% else %}
                    Product Image
                    {% endif %}
                </div>
                <div class="product-content">
                    <div class="product-category">{{product.category}}</div>
                    <h3 class="product-name">{{product.name}}</h3>
                    <div class="product-price">
                        <span class="price-current">KES {{product.currentPrice}}</span>
                        <span class="price-original">KES {{product.originalPrice}}</span>
                        <span class="price-discount">Save {{product.discount}}%</span>
                    </div>
                    <a href="{{product.link}}" class="product-button">Shop Now</a>
                </div>
            </div>
            {% endfor %}
        </div>
        {% endif %}
        
        <div class="benefits">
            <h2 class="benefits-title">Why Shop With Xarastore?</h2>
            <div class="benefits-grid">
                <div class="benefit-item">
                    <div class="benefit-icon">🚚</div>
                    <h3 class="benefit-title">Free Delivery</h3>
                    <p class="benefit-description">Free shipping on orders over KES 2,000 across Kenya</p>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">🔒</div>
                    <h3 class="benefit-title">Secure Payments</h3>
                    <p class="benefit-description">Bank-level encryption and multiple payment options</p>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">🔄</div>
                    <h3 class="benefit-title">Easy Returns</h3>
                    <p class="benefit-description">30-day return policy with free return shipping</p>
                </div>
            </div>
        </div>
        
        {% if testimonial %}
        <div class="testimonial">
            <p class="testimonial-quote">"{{testimonial.quote}}"</p>
            <div>
                <div class="testimonial-author">{{testimonial.author}}</div>
                <div class="testimonial-role">{{testimonial.role}}</div>
            </div>
        </div>
        {% endif %}
        
        <div class="guarantee">
            <div class="guarantee-icon">✓</div>
            <div class="guarantee-text">Best Price Guarantee - We'll match any lower price you find</div>
        </div>
        
        <div class="cta-section">
            <h2 class="cta-title">Don't Miss Out on These Deals!</h2>
            <p class="cta-subtitle">
                Shop now before these exclusive offers expire. Limited quantities available.
            </p>
            <a href="{{shopUrl}}" class="cta-button">Shop All Deals →</a>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="{{helpUrl}}" class="footer-link">Help Center</a>
                <a href="{{trackingUrl}}" class="footer-link">Track Order</a>
                <a href="{{returnsUrl}}" class="footer-link">Returns & Refunds</a>
                <a href="{{contactUrl}}" class="footer-link">Contact Us</a>
                <a href="{{accountUrl}}" class="footer-link">My Account</a>
            </div>
            
            <div class="social-icons">
                <a href="https://facebook.com/xarastore" class="social-icon">f</a>
                <a href="https://twitter.com/xarastore" class="social-icon">𝕏</a>
                <a href="https://instagram.com/xarastore" class="social-icon">📷</a>
                <a href="https://linkedin.com/company/xarastore" class="social-icon">in</a>
            </div>
            
            <div class="contact-info">
                Xarastore Ltd.<br>
                Nairobi, Kenya<br>
                Email: support@xarastore.com | Phone: +254 700 000 000
            </div>
            
            <div class="unsubscribe">
                You received this email because you're subscribed to promotional emails from Xarastore.<br>
                <a href="{{unsubscribeUrl}}" class="unsubscribe-link">Unsubscribe from these emails</a> | 
                <a href="{{preferencesUrl}}" class="unsubscribe-link">Update email preferences</a>
            </div>
            
            <div class="unsubscribe" style="margin-top: 16px; font-size: 11px;">
                © {{currentYear}} Xarastore Ltd. All rights reserved.<br>
                This is an automated promotional email. Please do not reply.
            </div>
        </div>
    </div>
</body>
</html>
`;
