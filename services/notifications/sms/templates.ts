export const smsTemplates = {
  // Authentication
  OTP: {
    name: 'otp_verification',
    content: 'Your Xarastore verification code is {{code}}. Valid for {{minutes}} minutes.',
    description: 'One-time password verification',
    maxLength: 160,
    variables: ['code', 'minutes'],
  },

  WELCOME: {
    name: 'welcome',
    content: 'Welcome to Xarastore, {{name}}! Start shopping amazing deals at https://xarastore.com',
    description: 'Welcome message for new users',
    maxLength: 160,
    variables: ['name'],
  },

  // Orders
  ORDER_CONFIRMED: {
    name: 'order_confirmed',
    content: 'Order #{{orderNumber}} confirmed! Total: KES {{total}}. View details: {{orderLink}}',
    description: 'Order confirmation',
    maxLength: 160,
    variables: ['orderNumber', 'total', 'orderLink'],
  },

  ORDER_SHIPPED: {
    name: 'order_shipped',
    content: 'Your order #{{orderNumber}} has been shipped! Track: {{trackingLink}}',
    description: 'Order shipped notification',
    maxLength: 160,
    variables: ['orderNumber', 'trackingLink'],
  },

  ORDER_DELIVERED: {
    name: 'order_delivered',
    content: 'Your order #{{orderNumber}} has been delivered! Rate your experience: {{reviewLink}}',
    description: 'Order delivered notification',
    maxLength: 160,
    variables: ['orderNumber', 'reviewLink'],
  },

  // Payments
  PAYMENT_SUCCESS: {
    name: 'payment_success',
    content: 'Payment of KES {{amount}} for order #{{orderNumber}} successful. Thank you!',
    description: 'Payment success notification',
    maxLength: 160,
    variables: ['amount', 'orderNumber'],
  },

  PAYMENT_FAILED: {
    name: 'payment_failed',
    content: 'Payment for order #{{orderNumber}} failed. Please update payment: {{paymentLink}}',
    description: 'Payment failure notification',
    maxLength: 160,
    variables: ['orderNumber', 'paymentLink'],
  },

  // Account
  PASSWORD_RESET: {
    name: 'password_reset',
    content: 'Reset your Xarastore password: {{resetLink}}. Code: {{code}}. Expires in {{minutes}} min.',
    description: 'Password reset notification',
    maxLength: 160,
    variables: ['resetLink', 'code', 'minutes'],
  },

  ACCOUNT_VERIFIED: {
    name: 'account_verified',
    content: 'Your Xarastore account has been verified! Start shopping: https://xarastore.com',
    description: 'Account verification confirmation',
    maxLength: 160,
    variables: [],
  },

  // Promotional
  FLASH_SALE: {
    name: 'flash_sale',
    content: '🔥 FLASH SALE! {{discount}}% off {{category}}. Ends {{time}}. Shop now: {{saleLink}}',
    description: 'Flash sale announcement',
    maxLength: 160,
    variables: ['discount', 'category', 'time', 'saleLink'],
  },

  CART_REMINDER: {
    name: 'cart_reminder',
    content: 'You have {{count}} items in your cart worth KES {{total}}. Complete purchase: {{cartLink}}',
    description: 'Cart abandonment reminder',
    maxLength: 160,
    variables: ['count', 'total', 'cartLink'],
  },

  PRICE_DROP: {
    name: 'price_drop',
    content: 'Price dropped on {{productName}}! Was KES {{oldPrice}}, now KES {{newPrice}}. Shop: {{productLink}}',
    description: 'Price drop notification',
    maxLength: 160,
    variables: ['productName', 'oldPrice', 'newPrice', 'productLink'],
  },

  // Security
  LOGIN_ALERT: {
    name: 'login_alert',
    content: 'New login to your Xarastore account from {{device}} at {{time}}. Not you? Secure account: {{securityLink}}',
    description: 'Login alert',
    maxLength: 160,
    variables: ['device', 'time', 'securityLink'],
  },

  SUSPICIOUS_ACTIVITY: {
    name: 'suspicious_activity',
    content: 'Suspicious activity detected on your account. Secure now: {{securityLink}} or call {{supportPhone}}',
    description: 'Suspicious activity alert',
    maxLength: 160,
    variables: ['securityLink', 'supportPhone'],
  },

  // Delivery
  DELIVERY_UPDATE: {
    name: 'delivery_update',
    content: 'Your package #{{trackingNumber}} is {{status}}. Estimated delivery: {{date}}. Track: {{trackingLink}}',
    description: 'Delivery status update',
    maxLength: 160,
    variables: ['trackingNumber', 'status', 'date', 'trackingLink'],
  },

  DELIVERY_ATTEMPT: {
    name: 'delivery_attempt',
    content: 'Delivery attempt failed for order #{{orderNumber}}. Schedule redelivery: {{scheduleLink}}',
    description: 'Failed delivery attempt',
    maxLength: 160,
    variables: ['orderNumber', 'scheduleLink'],
  },

  // Customer Service
  SUPPORT_TICKET: {
    name: 'support_ticket',
    content: 'Support ticket #{{ticketId}} created. We\'ll respond within {{time}}. Track: {{ticketLink}}',
    description: 'Support ticket confirmation',
    maxLength: 160,
    variables: ['ticketId', 'time', 'ticketLink'],
  },

  SUPPORT_REPLY: {
    name: 'support_reply',
    content: 'New reply to ticket #{{ticketId}}: {{message}}. View: {{ticketLink}}',
    description: 'Support ticket reply',
    maxLength: 160,
    variables: ['ticketId', 'message', 'ticketLink'],
  },

  // Loyalty & Rewards
  REWARDS_EARNED: {
    name: 'rewards_earned',
    content: 'You earned {{points}} points! Total: {{totalPoints}}. Redeem: {{rewardsLink}}',
    description: 'Rewards points earned',
    maxLength: 160,
    variables: ['points', 'totalPoints', 'rewardsLink'],
  },

  BIRTHDAY_WISHES: {
    name: 'birthday_wishes',
    content: 'Happy Birthday, {{name}}! Enjoy {{discount}}% off your next purchase with code {{code}}. Expires {{date}}.',
    description: 'Birthday greeting with discount',
    maxLength: 160,
    variables: ['name', 'discount', 'code', 'date'],
  },

  // System
  MAINTENANCE_ALERT: {
    name: 'maintenance_alert',
    content: 'Xarastore will be down for maintenance {{date}} {{time}} for {{duration}}. We apologize for any inconvenience.',
    description: 'System maintenance notification',
    maxLength: 160,
    variables: ['date', 'time', 'duration'],
  },

  SERVICE_RESUMED: {
    name: 'service_resumed',
    content: 'Maintenance complete! Xarastore is back online. Thank you for your patience.',
    description: 'Service resumed notification',
    maxLength: 160,
    variables: [],
  },
};

export type SMSTemplateName = keyof typeof smsTemplates;

export function getTemplate(name: SMSTemplateName) {
  return smsTemplates[name];
}

export function getAllTemplates() {
  return Object.entries(smsTemplates).map(([key, template]) => ({
    id: key,
    ...template,
  }));
}

export function validateTemplateVariables(template: string, variables: Record<string, any>): boolean {
  const variableRegex = /{{([^}]+)}}/g;
  const matches = template.match(variableRegex);
  
  if (!matches) return true;

  const requiredVariables = matches.map(match => match.replace(/{{|}}/g, '').trim());
  
  return requiredVariables.every(variable => variables[variable] !== undefined);
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  // Remove any remaining template variables
  rendered = rendered.replace(/{{.*?}}/g, '');

  return rendered.trim();
}

export function estimateSMSCount(message: string): number {
  // GSM 7-bit encoding: 160 characters per SMS
  // If message contains non-GSM characters, switch to UCS-2: 70 characters per SMS
  const gsmRegex = /^[A-Za-z0-9 .,!?@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\[~\]|€]*$/;
  
  const isGSM = gsmRegex.test(message);
  const maxLength = isGSM ? 160 : 70;
  
  // Calculate segments for concatenated SMS
  if (message.length <= maxLength) {
    return 1;
  }
  
  // For concatenated SMS, each segment has reduced length for header
  const segmentLength = isGSM ? 153 : 67;
  return Math.ceil(message.length / segmentLength);
}

export function truncateForSMS(message: string, maxSegments: number = 1): string {
  const gsmRegex = /^[A-Za-z0-9 .,!?@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\[~\]|€]*$/;
  const isGSM = gsmRegex.test(message);
  const segmentLength = isGSM ? 153 : 67;
  const maxLength = segmentLength * maxSegments;
  
  if (message.length <= maxLength) {
    return message;
  }
  
  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}
