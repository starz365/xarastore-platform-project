export const passwordResetTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Xarastore</title>
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
            margin-bottom: 32px;
        }
        
        .alert-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .alert-title {
            font-size: 18px;
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .alert-message {
            color: #b91c1c;
            font-size: 14px;
        }
        
        .reset-box {
            background-color: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 8px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
        }
        
        .reset-code {
            font-family: monospace;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #dc2626;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 2px solid #fecaca;
        }
        
        .reset-link {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 18px;
            text-align: center;
            transition: background-color 0.2s;
            margin: 20px 0;
        }
        
        .reset-link:hover {
            background-color: #b91c1c;
            text-decoration: none;
        }
        
        .instructions {
            margin: 32px 0;
        }
        
        .instructions-title {
            font-size: 20px;
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
            margin-bottom: 16px;
            color: #4b5563;
            font-size: 15px;
        }
        
        .instruction-number {
            background-color: #dc2626;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 16px;
            flex-shrink: 0;
        }
        
        .security-info {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .security-title {
            font-size: 18px;
            font-weight: 600;
            color: #0369a1;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .security-list {
            list-style: none;
        }
        
        .security-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            color: #374151;
            font-size: 14px;
        }
        
        .security-item:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .expiry-notice {
            background-color: #fefce8;
            border: 1px solid #fde047;
            border-radius: 8px;
            padding: 20px;
            margin: 32px 0;
            text-align: center;
        }
        
        .expiry-title {
            font-size: 16px;
            font-weight: 600;
            color: #ca8a04;
            margin-bottom: 8px;
        }
        
        .expiry-timer {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            font-family: monospace;
            margin: 12px 0;
        }
        
        .support-section {
            text-align: center;
            margin: 40px 0 24px 0;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
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
        
        .verification-note {
            font-size: 12px;
            color: #6b7280;
            text-align: center;
            margin-top: 24px;
            line-height: 1.5;
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
            
            .reset-code {
                font-size: 24px;
                letter-spacing: 4px;
                padding: 16px;
            }
            
            .reset-link {
                padding: 14px 32px;
                font-size: 16px;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 12px;
            }
            
            .instruction-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .instruction-number {
                margin-bottom: 8px;
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
            <h1 class="greeting">Reset Your Password</h1>
            
            <p class="message">
                We received a request to reset the password for your Xarastore account 
                associated with <strong>{{email}}</strong>. 
                If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div class="alert-box">
                <h2 class="alert-title">⚠️ Important Security Notice</h2>
                <p class="alert-message">
                    This password reset link is unique to you and will expire in {{expiryTime}}. 
                    Do not share this link or code with anyone. Xarastore will never ask for your password.
                </p>
            </div>
            
            <div class="reset-box">
                <h2 style="color: #111827; margin-bottom: 16px;">Your Password Reset Link</h2>
                <p style="color: #6b7280; margin-bottom: 24px;">
                    Click the button below to reset your password:
                </p>
                
                <a href="{{resetLink}}" class="reset-link">
                    Reset My Password
                </a>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="font-family: monospace; font-size: 12px; color: #4b5563; word-break: break-all;">
                        {{resetLink}}
                    </span>
                </p>
            </div>
            
            {% if resetCode %}
            <div class="reset-box">
                <h2 style="color: #111827; margin-bottom: 16px;">Your Verification Code</h2>
                <p style="color: #6b7280; margin-bottom: 16px;">
                    Enter this code on the password reset page:
                </p>
                <div class="reset-code">{{resetCode}}</div>
            </div>
            {% endif %}
            
            <div class="instructions">
                <h2 class="instructions-title">How to Reset Your Password</h2>
                <ul class="instruction-list">
                    <li class="instruction-item">
                        <div class="instruction-number">1</div>
                        <div>
                            <strong>Click the reset link</strong> above or copy it into your browser
                        </div>
                    </li>
                    <li class="instruction-item">
                        <div class="instruction-number">2</div>
                        <div>
                            <strong>Create a new password</strong> that's strong and unique
                        </div>
                    </li>
                    <li class="instruction-item">
                        <div class="instruction-number">3</div>
                        <div>
                            <strong>Confirm your new password</strong> by entering it again
                        </div>
                    </li>
                    <li class="instruction-item">
                        <div class="instruction-number">4</div>
                        <div>
                            <strong>Sign in</strong> to your account with your new password
                        </div>
                    </li>
                </ul>
            </div>
            
            <div class="expiry-notice">
                <div class="expiry-title">This link will expire in:</div>
                <div class="expiry-timer">{{expiryTimer}}</div>
                <p style="color: #92400e; font-size: 14px;">
                    After this time, you'll need to request a new password reset link.
                </p>
            </div>
            
            <div class="security-info">
                <h2 class="security-title">🔒 Password Security Tips</h2>
                <ul class="security-list">
                    <li class="security-item">Use a unique password that you don't use elsewhere</li>
                    <li class="security-item">Include a mix of uppercase, lowercase, numbers, and symbols</li>
                    <li class="security-item">Make it at least 12 characters long</li>
                    <li class="security-item">Avoid using personal information like birthdays or names</li>
                    <li class="security-item">Consider using a password manager to generate and store passwords</li>
                </ul>
            </div>
            
            <div class="support-section">
                <h3 class="support-title">Having trouble?</h3>
                <p class="support-contact">
                    If the link doesn't work or you need assistance, please contact our support team.
                </p>
                <p class="support-contact">
                    Email: <a href="mailto:support@xarastore.com" class="support-email">support@xarastore.com</a><br>
                    Phone: <strong>+254 700 000 000</strong><br>
                    Hours: 24/7
                </p>
            </div>
            
            <p class="verification-note">
                This is an automated security message from Xarastore.<br>
                For your protection, please do not reply to this email.<br>
                This message was sent to {{email}} because of a password reset request.
            </p>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="{{helpUrl}}" class="footer-link">Help Center</a>
                <a href="{{securityUrl}}" class="footer-link">Security Tips</a>
                <a href="{{privacyUrl}}" class="footer-link">Privacy Policy</a>
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
