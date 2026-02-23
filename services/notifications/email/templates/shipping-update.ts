export const shippingUpdateTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shipping Update - Order #{{orderNumber}}</title>
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
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 24px;
        }
        
        .status-shipped {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .status-out-for-delivery {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .status-delivered {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .status-delayed {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .greeting {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .order-number {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 24px;
        }
        
        .highlight {
            color: #dc2626;
            font-weight: 600;
        }
        
        .update-message {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 32px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .update-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 12px;
        }
        
        .timeline {
            position: relative;
            margin: 40px 0;
            padding-left: 30px;
        }
        
        .timeline:before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: #e5e7eb;
        }
        
        .timeline-step {
            position: relative;
            margin-bottom: 32px;
        }
        
        .timeline-step:last-child {
            margin-bottom: 0;
        }
        
        .timeline-step:before {
            content: '';
            position: absolute;
            left: -36px;
            top: 0;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #9ca3af;
            border: 3px solid #ffffff;
            box-shadow: 0 0 0 3px #e5e7eb;
        }
        
        .timeline-step.active:before {
            background-color: #dc2626;
            box-shadow: 0 0 0 3px #fecaca;
        }
        
        .timeline-step.completed:before {
            background-color: #10b981;
            box-shadow: 0 0 0 3px #a7f3d0;
        }
        
        .step-time {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .step-title {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .step-description {
            color: #6b7280;
            font-size: 14px;
        }
        
        .tracking-section {
            background-color: #fefce8;
            border: 1px solid #fde047;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .tracking-title {
            font-size: 18px;
            font-weight: 600;
            color: #ca8a04;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .tracking-number {
            font-family: monospace;
            background-color: #1f2937;
            color: #fbbf24;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 16px;
            letter-spacing: 1px;
            margin: 16px 0;
            display: inline-block;
        }
        
        .tracking-link {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
        }
        
        .tracking-link:hover {
            text-decoration: underline;
        }
        
        .delivery-info {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .delivery-title {
            font-size: 18px;
            font-weight: 600;
            color: #0369a1;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .delivery-address {
            color: #374151;
            line-height: 1.8;
        }
        
        .delivery-estimate {
            margin-top: 16px;
            padding: 12px;
            background-color: #ffffff;
            border-radius: 6px;
            border-left: 4px solid #10b981;
        }
        
        .estimate-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .estimate-value {
            font-weight: 600;
            color: #065f46;
            font-size: 16px;
        }
        
        .package-info {
            margin: 32px 0;
        }
        
        .package-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
        }
        
        .package-item {
            display: flex;
            align-items: center;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
            background-color: #ffffff;
        }
        
        .package-image {
            width: 60px;
            height: 60px;
            background-color: #f3f4f6;
            border-radius: 6px;
            margin-right: 16px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 12px;
        }
        
        .package-details {
            flex: 1;
        }
        
        .package-name {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .package-quantity {
            color: #6b7280;
            font-size: 12px;
        }
        
        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 40px 0;
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
            transition: background-color 0.2s;
        }
        
        .secondary-button:hover {
            background-color: #e5e7eb;
        }
        
        .instructions {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .instructions-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .instruction-list {
            list-style: none;
        }
        
        .instruction-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            color: #4b5563;
        }
        
        .instruction-item:before {
            content: "•";
            color: #dc2626;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .support-section {
            text-align: center;
            margin: 32px 0;
            padding: 24px;
            background-color: #fef2f2;
            border-radius: 8px;
        }
        
        .support-title {
            font-size: 18px;
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 12px;
        }
        
        .support-contact {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .support-email {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
        }
        
        .support-email:hover {
            text-decoration: underline;
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
            
            .timeline {
                padding-left: 20px;
            }
            
            .timeline-step:before {
                left: -26px;
            }
            
            .button-group {
                flex-direction: column;
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
            <div class="status-badge status-{{statusClass}}">
                {{statusIcon}} {{statusText}}
            </div>
            
            <h1 class="greeting">Your order is {{statusVerb}}, {{customerName}}!</h1>
            <div class="order-number">Order #{{orderNumber}}</div>
            
            <div class="update-message">
                <h2 class="update-title">{{updateTitle}}</h2>
                <p>{{updateMessage}}</p>
                {% if additionalInfo %}
                <p style="margin-top: 12px; font-size: 14px; color: #4b5563;">{{additionalInfo}}</p>
                {% endif %}
            </div>
            
            <div class="timeline">
                {% for step in timeline %}
                <div class="timeline-step {{step.status}}">
                    <div class="step-time">{{step.time}}</div>
                    <div class="step-title">{{step.title}}</div>
                    <div class="step-description">{{step.description}}</div>
                </div>
                {% endfor %}
            </div>
            
            <div class="tracking-section">
                <h2 class="tracking-title">📦 Tracking Information</h2>
                <p>You can track your package in real-time using the following information:</p>
                <div class="tracking-number">{{trackingNumber}}</div>
                <p>Carrier: <strong>{{carrierName}}</strong></p>
                <a href="{{trackingUrl}}" class="tracking-link">
                    Track Your Package Now →
                </a>
            </div>
            
            <div class="delivery-info">
                <h2 class="delivery-title">🚚 Delivery Information</h2>
                <div class="delivery-address">
                    <strong>Delivering to:</strong><br>
                    {{deliveryAddress.name}}<br>
                    {{deliveryAddress.street}}<br>
                    {{deliveryAddress.city}}, {{deliveryAddress.state}} {{deliveryAddress.postalCode}}<br>
                    {{deliveryAddress.country}}<br>
                    📞 {{deliveryAddress.phone}}
                </div>
                
                <div class="delivery-estimate">
                    <div class="estimate-label">Estimated Delivery</div>
                    <div class="estimate-value">{{estimatedDelivery}}</div>
                </div>
            </div>
            
            <div class="package-info">
                <h2 class="package-title">Package Contents</h2>
                {% for item in packageItems %}
                <div class="package-item">
                    <div class="package-image">
                        {% if item.image %}
                        <img src="{{item.image}}" alt="{{item.name}}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
                        {% else %}
                        📦
                        {% endif %}
                    </div>
                    <div class="package-details">
                        <div class="package-name">{{item.name}}</div>
                        <div class="package-quantity">Quantity: {{item.quantity}}</div>
                    </div>
                </div>
                {% endfor %}
            </div>
            
            <div class="instructions">
                <h2 class="instructions-title">Delivery Instructions</h2>
                <ul class="instruction-list">
                    <li class="instruction-item">Please ensure someone is available to receive the package at the delivery address</li>
                    <li class="instruction-item">A signature may be required upon delivery</li>
                    <li class="instruction-item">If you won't be available, consider providing alternative delivery instructions</li>
                    <li class="instruction-item">Packages are typically delivered between 9 AM and 6 PM</li>
                    <li class="instruction-item">You can request a delivery time window through the carrier's website</li>
                </ul>
            </div>
            
            <div class="button-group">
                <a href="{{trackingUrl}}" class="cta-button">Track Package</a>
                <a href="{{orderDetailsUrl}}" class="secondary-button">View Order Details</a>
                <a href="{{contactUrl}}" class="secondary-button">Contact Support</a>
            </div>
            
            <div class="support-section">
                <h3 class="support-title">Need to make changes?</h3>
                <p class="support-contact">
                    If you need to change your delivery address or schedule, please contact us immediately.
                </p>
                <p class="support-contact">
                    Email: <a href="mailto:support@xarastore.com" class="support-email">support@xarastore.com</a><br>
                    Phone: <strong>+254 700 000 000</strong><br>
                    Hours: 24/7
                </p>
            </div>
            
            <p class="step-description" style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 32px;">
                This is an automated shipping update. Please do not reply to this email.<br>
                For questions about your delivery, use the tracking link above or contact support.
            </p>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="{{helpUrl}}" class="footer-link">Help Center</a>
                <a href="{{trackingHelpUrl}}" class="footer-link">Tracking Help</a>
                <a href="{{deliveryPolicyUrl}}" class="footer-link">Delivery Policy</a>
                <a href="{{contactUrl}}" class="footer-link">Contact Us</a>
            </div>
            
            <p class="copyright">
                © {{currentYear}} Xarastore Ltd. All rights reserved.<br>
                Nairobi, Kenya
            </p>
        </div>
    </div>
</body>
</html>
`;
