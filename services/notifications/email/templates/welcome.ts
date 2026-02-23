export const welcomeEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Xarastore!</title>
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
            background-color: #dc2626;
            padding: 32px 24px;
            text-align: center;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: white;
            margin-bottom: 8px;
        }
        
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            letter-spacing: 0.5px;
        }
        
        .content {
            padding: 40px 32px;
        }
        
        .greeting {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 24px;
        }
        
        .highlight {
            color: #dc2626;
            font-weight: 600;
        }
        
        .features {
            background-color: #fef2f2;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .feature-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .feature-list {
            list-style: none;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: #4b5563;
        }
        
        .feature-item:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 12px;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s;
        }
        
        .cta-button:hover {
            background-color: #b91c1c;
        }
        
        .secondary-button {
            display: inline-block;
            background-color: #f3f4f6;
            color: #374151;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin-left: 12px;
            transition: background-color 0.2s;
        }
        
        .secondary-button:hover {
            background-color: #e5e7eb;
        }
        
        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 32px 0;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 40px 0;
            text-align: center;
        }
        
        .stat-item {
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
        }
        
        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #6b7280;
        }
        
        .security-note {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 16px;
            margin: 32px 0;
            color: #0369a1;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 20px;
        }
        
        .footer-link {
            color: #6b7280;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }
        
        .footer-link:hover {
            color: #dc2626;
        }
        
        .copyright {
            color: #9ca3af;
            font-size: 12px;
            margin-top: 16px;
        }
        
        .social-icons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 20px 0;
        }
        
        .social-icon {
            width: 32px;
            height: 32px;
            background-color: #e5e7eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            text-decoration: none;
            transition: all 0.2s;
        }
        
        .social-icon:hover {
            background-color: #dc2626;
            color: white;
        }
        
        @media (max-width: 640px) {
            .container {
                border-radius: 0;
            }
            
            .content {
                padding: 24px 20px;
            }
            
            .greeting {
                font-size: 24px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .secondary-button {
                margin-left: 0;
                margin-top: 12px;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Xarastore</div>
            <div class="tagline">it's a deal</div>
        </div>
        
        <div class="content">
            <h1 class="greeting">Welcome to Xarastore, {{name}}! 🎉</h1>
            
            <p class="message">
                Thank you for joining Kenya's fastest-growing online marketplace. 
                We're excited to have you on board and can't wait to help you discover amazing deals.
            </p>
            
            <div class="features">
                <h2 class="feature-title">Get Started with Xarastore</h2>
                <ul class="feature-list">
                    <li class="feature-item">Browse millions of products across all categories</li>
                    <li class="feature-item">Enjoy exclusive member-only deals and discounts</li>
                    <li class="feature-item">Fast and secure checkout with multiple payment options</li>
                    <li class="feature-item">Free delivery on orders over KES 2,000</li>
                    <li class="feature-item">Easy returns and 24/7 customer support</li>
                </ul>
            </div>
            
            <div class="button-group">
                <a href="{{shopUrl}}" class="cta-button">Start Shopping Now</a>
                <a href="{{accountUrl}}" class="secondary-button">Complete Your Profile</a>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">1M+</div>
                    <div class="stat-label">Happy Customers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">50K+</div>
                    <div class="stat-label">Products</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">24/7</div>
                    <div class="stat-label">Support</div>
                </div>
            </div>
            
            <div class="security-note">
                🔒 <strong>Your account security is our priority.</strong> 
                We use bank-level encryption to protect your data and never share your information with third parties.
            </div>
            
            <p class="message">
                Need help? Our customer support team is available 24/7 at 
                <a href="mailto:support@xarastore.com" style="color: #dc2626;">support@xarastore.com</a> 
                or call us at <strong>+254 700 000 000</strong>.
            </p>
            
            <p class="message">
                Happy shopping!<br>
                <strong>The Xarastore Team</strong>
            </p>
        </div>
        
        <div class="footer">
            <div class="social-icons">
                <a href="https://facebook.com/xarastore" class="social-icon">f</a>
                <a href="https://twitter.com/xarastore" class="social-icon">𝕏</a>
                <a href="https://instagram.com/xarastore" class="social-icon">📷</a>
                <a href="https://linkedin.com/company/xarastore" class="social-icon">in</a>
            </div>
            
            <div class="footer-links">
                <a href="{{helpUrl}}" class="footer-link">Help Center</a>
                <a href="{{termsUrl}}" class="footer-link">Terms of Service</a>
                <a href="{{privacyUrl}}" class="footer-link">Privacy Policy</a>
                <a href="{{contactUrl}}" class="footer-link">Contact Us</a>
                <a href="{{unsubscribeUrl}}" class="footer-link">Unsubscribe</a>
            </div>
            
            <p class="copyright">
                © {{currentYear}} Xarastore Ltd. All rights reserved.<br>
                Nairobi, Kenya
            </p>
            
            <p class="copyright" style="font-size: 11px; margin-top: 8px;">
                This email was sent to {{email}}. 
                Please do not reply to this email. 
                To contact us, please visit our website.
            </p>
        </div>
    </div>
</body>
</html>
`;
