export interface PageViewEvent {
  id: string;
  sessionId: string;
  userId?: string;
  page: string;
  referrer?: string;
  timestamp: string;
  duration?: number;
  scrollDepth?: number;
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenSize: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    ip?: string;
  };
}

export interface UserEvent {
  id: string;
  sessionId: string;
  userId?: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface EcommerceEvent {
  id: string;
  sessionId: string;
  userId?: string;
  type: 'view_item' | 'add_to_cart' | 'remove_from_cart' | 'begin_checkout' | 'add_payment_info' | 'purchase' | 'refund';
  currency: string;
  value?: number;
  items?: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    item_variant?: string;
    price: number;
    quantity: number;
  }>;
  transaction_id?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  timestamp: string;
}

export interface Session {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  events: number;
  conversions: number;
  device: {
    type: string;
    os: string;
    browser: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
  };
  trafficSource: {
    medium: string;
    source: string;
    campaign?: string;
    term?: string;
  };
}

export interface AnalyticsDashboard {
  overview: {
    totalSessions: number;
    totalUsers: number;
    totalPageviews: number;
    totalEvents: number;
    totalConversions: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
  };
  traffic: {
    bySource: Array<{
      source: string;
      sessions: number;
      users: number;
      bounceRate: number;
      avgDuration: number;
    }>;
    byMedium: Array<{
      medium: string;
      sessions: number;
      conversions: number;
      conversionRate: number;
    }>;
    byDevice: Array<{
      device: string;
      sessions: number;
      pageviews: number;
      avgDuration: number;
    }>;
    byLocation: Array<{
      country: string;
      sessions: number;
      users: number;
      conversions: number;
    }>;
  };
  behavior: {
    topPages: Array<{
      page: string;
      views: number;
      uniqueViews: number;
      avgDuration: number;
      bounceRate: number;
    }>;
    entryPages: Array<{
      page: string;
      entries: number;
    }>;
    exitPages: Array<{
      page: string;
      exits: number;
      exitRate: number;
    }>;
  };
  ecommerce: {
    revenue: {
      total: number;
      today: number;
      yesterday: number;
      change: number;
    };
    orders: {
      total: number;
      averageOrderValue: number;
      conversionRate: number;
    };
    topProducts: Array<{
      productId: string;
      productName: string;
      views: number;
      addToCarts: number;
      purchases: number;
      revenue: number;
    }>;
    salesFunnel: {
      productViews: number;
      addToCarts: number;
      checkouts: number;
      purchases: number;
    };
  };
  realtime: {
    activeUsers: number;
    activeSessions: number;
    currentPageviews: Array<{
      page: string;
      users: number;
    }>;
    recentEvents: Array<{
      type: string;
      count: number;
      timestamp: string;
    }>;
  };
}

export interface AnalyticsFilter {
  dateRange: {
    start: string;
    end: string;
  };
  compareWithPrevious?: boolean;
  segment?: {
    deviceType?: string[];
    country?: string[];
    trafficSource?: string[];
    userType?: 'new' | 'returning';
  };
  metrics?: string[];
  dimensions?: string[];
  limit?: number;
  offset?: number;
}

export interface CohortAnalysis {
  cohort: {
    period: string;
    size: number;
    retention: Array<{
      period: number;
      retained: number;
      retentionRate: number;
    }>;
    revenue: Array<{
      period: number;
      revenue: number;
      averageRevenue: number;
    }>;
  };
}

export interface FunnelAnalysis {
  name: string;
  steps: Array<{
    name: string;
    type: string;
    value: string;
  }>;
  conversionRates: Array<{
    fromStep: string;
    toStep: string;
    rate: number;
    dropoff: number;
  }>;
  users: Array<{
    userId: string;
    stepsCompleted: number;
    converted: boolean;
    duration: number;
  }>;
}

export interface UserJourney {
  userId: string;
  sessions: Array<{
    sessionId: string;
    startTime: string;
    events: Array<{
      timestamp: string;
      type: string;
      page?: string;
      action?: string;
    }>;
  }>;
  conversionPath?: Array<{
    type: string;
    timestamp: string;
    value?: any;
  }>;
  lifetimeValue: number;
  acquisitionChannel: string;
  firstSeen: string;
  lastSeen: string;
}

export interface PerformanceMetrics {
  pageLoad: {
    average: number;
    p75: number;
    p95: number;
  };
  firstContentfulPaint: {
    average: number;
    p75: number;
    p95: number;
  };
  largestContentfulPaint: {
    average: number;
    p75: number;
    p95: number;
  };
  cumulativeLayoutShift: {
    average: number;
    p75: number;
    p95: number;
  };
  firstInputDelay: {
    average: number;
    p75: number;
    p95: number;
  };
  coreWebVitals: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
}

export interface A/BTestResult {
  testId: string;
  name: string;
  status: 'running' | 'completed' | 'stopped';
  variantA: {
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
  };
  variantB: {
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
  };
  confidence: number;
  winner?: string;
  improvement: number;
  startedAt: string;
  endedAt?: string;
}
