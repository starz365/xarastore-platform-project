export const orderConfirmationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Xarastore</title>
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
            margin-bottom: 8px;
        }
        
        .order-number {
            color: #dc2626;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            background-color: #fef2f2;
            padding: 12px 20px;
            border-radius: 6px;
            display: inline-block;
        }
        
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 32px;
        }
        
        .highlight {
            color: #dc2626;
            font-weight: 600;
        }
        
        .order-summary {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .summary-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 24px;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-label {
            color: #6b7280;
            font-size: 14px;
        }
        
        .summary-value {
            color: #111827;
            font-weight: 500;
            font-size: 14px;
        }
        
        .summary-total {
            display: flex;
            justify-content: space-between;
            padding: 16px 0;
            border-top: 2px solid #e5e7eb;
            font-size: 18px;
            font-weight: bold;
            color: #111827;
        }
        
        .total-amount {
            color: #dc2626;
            font-size: 24px;
        }
        
        .order-items {
            margin: 40px 0;
        }
        
        .items-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
        }
        
        .item {
            display: flex;
            align-items: center;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 16px;
            background-color: #ffffff;
        }
        
        .item-image {
            width: 80px;
            height: 80px;
            background-color: #f3f4f6;
            border-radius: 6px;
            margin-right: 20px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 12px;
        }
        
        .item-details {
            flex: 1;
        }
        
        .item-name {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
            font-size: 16px;
        }
        
        .item-sku {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 8px;
        }
        
        .item-price {
            color: #dc2626;
            font-weight: 600;
            font-size: 16px;
        }
        
        .item-quantity {
            color: #6b7280;
            font-size: 14px;
        }
        
        .shipping-info {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .shipping-title {
            font-size: 18px;
            font-weight: 600;
            color: #0369a1;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .shipping-address {
            color: #374151;
            line-height: 1.8;
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
        
        .support-section {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
        }
        
        .support-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
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
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            .item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .item-image {
                margin-right: 0;
                margin-bottom: 16px;
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
            <h1 class="greeting">Thank you for your order, {{customerName}}!</h1>
            <div class="order-number">Order #{{orderNumber}}</div>
            
            <p class="message">
                We've received your order and are preparing it for shipment. 
                You'll receive another email when your items are on their way.
            </p>
            
            <div class="order-summary">
                <h2 class="summary-title">Order Summary</h2>
                
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Order Date</span>
                        <span class="summary-value">{{orderDate}}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Payment Method</span>
                        <span class="summary-value">{{paymentMethod}}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Order Status</span>
                        <span class="summary-value" style="color: #059669; font-weight: 600;">{{orderStatus}}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Estimated Delivery</span>
                        <span class="summary-value">{{estimatedDelivery}}</span>
                    </div>
                </div>
                
                <div class="summary-item">
                    <span class="summary-label">Subtotal</span>
                    <span class="summary-value">KES {{subtotal}}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Shipping</span>
                    <span class="summary-value">KES {{shipping}}</span>
                </div>
                {% if discount > 0 %}
                <div class="summary-item">
                    <span class="summary-label">Discount</span>
                    <span class="summary-value" style="color: #059669;">-KES {{discount}}</span>
                </div>
                {% endif %}
                <div class="summary-item">
                    <span class="summary-label">Tax</span>
                    <span class="summary-value">KES {{tax}}</span>
                </div>
                
                <div class="summary-total">
                    <span>Total Amount</span>
                    <span class="total-amount">KES {{total}}</span>
                </div>
            </div>
            
            <div class="order-items">
                <h2 class="items-title">Order Items ({{itemCount}})</h2>
                
                {% for item in items %}
                <div class="item">
                    <div class="item-image">
                        {% if item.image %}
                        <img src="{{item.image}}" alt="{{item.name}}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
                        {% else %}
                        Image
                        {% endif %}
                    </div>
                    <div class="item-details">
                        <div class="item-name">{{item.name}}</div>
                        <div class="item-sku">SKU: {{item.sku}}</div>
                        <div class="item-price">KES {{item.price}} × {{item.quantity}}</div>
                        <div class="item-quantity">Quantity: {{item.quantity}}</div>
                    </div>
                </div>
                {% endfor %}
            </div>
            
            <div class="shipping-info">
                <h2 class="shipping-title">🚚 Shipping Information</h2>
                <div class="shipping-address">
                    <strong>Shipping to:</strong><br>
                    {{shippingAddress.name}}<br>
                    {{shippingAddress.street}}<br>
                    {{shippingAddress.city}}, {{shippingAddress.state}} {{shippingAddress.postalCode}}<br>
                    {{shippingAddress.country}}<br>
                    📞 {{shippingAddress.phone}}
                </div>
            </div>
            
            {% if trackingNumber %}
            <div class="tracking-section">
                <h2 class="tracking-title">📦 Track Your Order</h2>
                <p>Your order has been shipped! Use the tracking number below to monitor delivery:</p>
                <div class="tracking-number">{{trackingNumber}}</div>
                <a href="{{trackingUrl}}" class="tracking-link">
                    Track Your Package →
                </a>
            </div>
            {% endif %}
            
            <div class="button-group">
                <a href="{{orderDetailsUrl}}" class="cta-button">View Order Details</a>
                <a href="{{shopUrl}}" class="secondary-button">Continue Shopping</a>
            </div>
            
            <div class="support-section">
                <h3 class="support-title">Need Help?</h3>
                <p class="support-contact">
                    Our customer support team is here to help you with any questions about your order.
                </p>
                <p class="support-contact">
                    Email: <a href="mailto:support@xarastore.com" class="support-email">support@xarastore.com</a><br>
                    Phone: <strong>+254 700 000 000</strong><br>
                    Hours: 24/7
                </p>
            </div>
            
            <p class="message" style="text-align: center; font-size: 14px; color: #6b7280;">
                This is an automated message. Please do not reply to this email.<br>
                If you have any questions, please contact our support team.
            </p>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="{{helpUrl}}" class="footer-link">Help Center</a>
                <a href="{{returnsUrl}}" class="footer-link">Returns & Refunds</a>
                <a href="{{contactUrl}}" class="footer-link">Contact Us</a>
                <a href="{{accountUrl}}" class="footer-link">My Account</a>
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
