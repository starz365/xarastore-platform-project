module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/shop',
        'http://localhost:3000/deals',
        'http://localhost:3000/cart',
        'http://localhost:3000/account',
        'http://localhost:3000/product/sample-product'
      ],
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage',
        preset: 'desktop',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: [
          'uses-http2',
          'is-on-https',
          'redirects-http',
          'canonical'
        ]
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Performance audits
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'speed-index': ['error', { maxNumericValue: 3300 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        
        // Best practices
        'errors-in-console': ['error', { maxLength: 0 }],
        'image-size-responsive': ['error', { minScore: 1 }],
        'render-blocking-resources': ['error', { maxLength: 0 }],
        'unused-css-rules': ['error', { maxLength: 0 }],
        'unused-javascript': ['error', { maxLength: 0 }],
        'modern-image-formats': ['error', { minScore: 1 }],
        'uses-responsive-images': ['error', { minScore: 1 }],
        'efficient-animated-content': ['error', { minScore: 1 }],
        
        // Accessibility
        'aria-allowed-attr': ['error', { minScore: 1 }],
        'aria-required-attr': ['error', { minScore: 1 }],
        'aria-roles': ['error', { minScore: 1 }],
        'aria-valid-attr-value': ['error', { minScore: 1 }],
        'button-name': ['error', { minScore: 1 }],
        'color-contrast': ['error', { minScore: 1 }],
        'document-title': ['error', { minScore: 1 }],
        'html-has-lang': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],
        'meta-viewport': ['error', { minScore: 1 }],
        
        // SEO
        'canonical': ['error', { minScore: 1 }],
        'crawlable-anchors': ['error', { minScore: 1 }],
        'http-status-code': ['error', { minScore: 1 }],
        'is-crawlable': ['error', { minScore: 1 }],
        'robots-txt': ['error', { minScore: 1 }],
        'structured-data': ['error', { minScore: 0.9 }],
        'meta-description': ['error', { minScore: 1 }],
        
        // PWA
        'installable-manifest': ['error', { minScore: 1 }],
        'service-worker': ['error', { minScore: 1 }],
        'splash-screen': ['error', { minScore: 1 }],
        'themed-omnibox': ['error', { minScore: 1 }],
        'content-width': ['error', { minScore: 1 }],
        'viewport': ['error', { minScore: 1 }],
        
        // Network
        'uses-long-cache-ttl': ['error', { minScore: 0.9 }],
        'total-byte-weight': ['error', { maxNumericValue: 500000 }],
        'critical-request-chains': ['error', { maxLength: 0 }],
        'offscreen-images': ['error', { minScore: 0.9 }],
        'unminified-css': ['error', { maxLength: 0 }],
        'unminified-javascript': ['error', { maxLength: 0 }],
        'unused-css-rules': ['error', { maxLength: 0 }],
        'unused-javascript': ['error', { maxLength: 0 }]
      }
    },
    upload: {
      target: 'temporary-public-storage',
      githubToken: process.env.LHCI_GITHUB_TOKEN,
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      serverBaseUrl: 'https://lhci-server.example.com',
      token: process.env.LHCI_TOKEN,
      basicAuth: {
        username: process.env.LHCI_BASIC_AUTH_USERNAME,
        password: process.env.LHCI_BASIC_AUTH_PASSWORD
      }
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './database.sqlite'
      }
    },
    wizard: {
      serverCommand: 'npm start',
      url: 'http://localhost:3000',
      numberOfRuns: 3,
      headful: false
    }
  }
};
