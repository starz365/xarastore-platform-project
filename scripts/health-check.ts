#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface HealthCheckConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  checkInterval: number;
  timeout: number;
  thresholds: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
}

interface HealthStatus {
  timestamp: string;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
    auth: ServiceStatus;
    app: ServiceStatus;
    api: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    errorCount: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  alerts: Alert[];
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  error?: string;
  details?: any;
}

interface Alert {
  level: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  timestamp: string;
}

class HealthCheck {
  private config: HealthCheckConfig;
  private supabase: any;
  private statusHistory: HealthStatus[] = [];
  private alerts: Alert[] = [];

  constructor() {
    this.config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000'),
      thresholds: {
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000'),
        errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
        uptime: parseFloat(process.env.UPTIME_THRESHOLD || '0.99'),
      },
    };

    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
  }

  async runCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    console.log(`Running health check at ${timestamp}`);

    // Run all checks in parallel
    const [databaseStatus, storageStatus, authStatus, appStatus, apiStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkAuth(),
      this.checkApp(),
      this.checkApi(),
    ]);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Calculate metrics
    const metrics = await this.calculateMetrics();

    // Check for alerts
    this.checkAlerts({
      database: databaseStatus,
      storage: storageStatus,
      auth: authStatus,
      app: appStatus,
      api: apiStatus,
    }, metrics);

    const healthStatus: HealthStatus = {
      timestamp,
      services: {
        database: databaseStatus,
        storage: storageStatus,
        auth: authStatus,
        app: appStatus,
        api: apiStatus,
      },
      metrics: {
        responseTime,
        errorCount: this.getErrorCount(),
        uptime: this.calculateUptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      alerts: [...this.alerts].slice(-10), // Last 10 alerts
    };

    // Store in history
    this.statusHistory.push(healthStatus);
    if (this.statusHistory.length > 100) {
      this.statusHistory.shift();
    }

    // Log status
    this.logStatus(healthStatus);

    return healthStatus;
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test basic query
      const { data, error, count } = await this.supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .limit(1)
        .timeout(this.config.timeout);

      const latency = Date.now() - startTime;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Test connection pooling
      const { data: poolData, error: poolError } = await this.supabase.rpc('exec_sql', {
        query: 'SELECT 1 as test, pg_sleep(0.1)',
      });

      if (poolError) {
        throw new Error(`Database connection pool test failed: ${poolError.message}`);
      }

      // Check database size
      const { data: sizeData, error: sizeError } = await this.supabase.rpc('exec_sql', {
        query: `
          SELECT 
            pg_database_size(current_database()) as db_size,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
            (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
        `,
      });

      return {
        status: 'healthy',
        latency,
        details: {
          query_successful: true,
          estimated_count: count || 0,
          database_size: sizeData?.[0]?.db_size,
          active_connections: sizeData?.[0]?.active_connections,
          max_connections: sizeData?.[0]?.max_connections,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkStorage(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test storage bucket listing
      const { data: buckets, error } = await this.supabase.storage.listBuckets();

      const latency = Date.now() - startTime;

      if (error) {
        throw new Error(`Storage bucket listing failed: ${error.message}`);
      }

      // Test file upload (small test file)
      const testContent = `health-check-${Date.now()}`;
      const testFile = new File([testContent], `test-${Date.now()}.txt`, {
        type: 'text/plain',
      });

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('health-checks')
        .upload(`test-${Date.now()}.txt`, testFile);

      if (uploadError) {
        // Bucket might not exist, try to create it
        const { error: createError } = await this.supabase.storage.createBucket('health-checks', {
          public: false,
        });

        if (createError) {
          throw new Error(`Storage test failed: ${createError.message}`);
        }
      }

      // Clean up test file if created
      if (uploadData) {
        await this.supabase.storage
          .from('health-checks')
          .remove([uploadData.path]);
      }

      return {
        status: 'healthy',
        latency,
        details: {
          bucket_count: buckets?.length || 0,
          buckets: buckets?.map((b: any) => b.name),
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkAuth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test anonymous auth
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();

      const latency = Date.now() - startTime;

      if (sessionError) {
        throw new Error(`Auth session check failed: ${sessionError.message}`);
      }

      // Test sign up (with test user)
      const testEmail = `health-check-${Date.now()}@xarastore.com`;
      const testPassword = 'TestPassword123!';

      const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw new Error(`Auth sign up test failed: ${signUpError.message}`);
      }

      // Clean up test user if created
      if (signUpData?.user) {
        // Note: In production, you would need admin privileges to delete users
        console.log(`Test user created: ${signUpData.user.id}`);
      }

      return {
        status: 'healthy',
        latency,
        details: {
          has_session: !!sessionData.session,
          user_count: 'N/A', // Would need admin query
          auth_providers: ['email'], // Configured providers
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkApp(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      const url = new URL('/health', this.config.appUrl);
      
      return new Promise((resolve) => {
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.get(url.toString(), (res) => {
          const latency = Date.now() - startTime;
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const healthData = JSON.parse(data);
                resolve({
                  status: 'healthy',
                  latency,
                  details: healthData,
                });
              } catch {
                resolve({
                  status: 'healthy',
                  latency,
                  details: { raw_response: data },
                });
              }
            } else {
              resolve({
                status: res.statusCode === 503 ? 'degraded' : 'unhealthy',
                latency,
                error: `HTTP ${res.statusCode}: ${res.statusMessage}`,
                details: { status_code: res.statusCode },
              });
            }
          });
        });

        req.on('error', (error) => {
          resolve({
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: error.message,
          });
        });

        req.setTimeout(this.config.timeout, () => {
          req.destroy();
          resolve({
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: 'Request timeout',
          });
        });
      });
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkApi(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test public API endpoint
      const url = new URL('/api/health', this.config.appUrl);
      
      return new Promise((resolve) => {
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.get(url.toString(), (res) => {
          const latency = Date.now() - startTime;
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const apiData = JSON.parse(data);
                resolve({
                  status: apiData.status === 'ok' ? 'healthy' : 'degraded',
                  latency,
                  details: apiData,
                });
              } catch {
                resolve({
                  status: 'healthy',
                  latency,
                  details: { raw_response: data },
                });
              }
            } else {
              resolve({
                status: 'unhealthy',
                latency,
                error: `API returned ${res.statusCode}`,
                details: { status_code: res.statusCode, response: data },
              });
            }
          });
        });

        req.on('error', (error) => {
          resolve({
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: error.message,
          });
        });

        req.setTimeout(this.config.timeout, () => {
          req.destroy();
          resolve({
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: 'API request timeout',
          });
        });
      });
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async calculateMetrics(): Promise<HealthStatus['metrics']> {
    const recentChecks = this.statusHistory.slice(-20); // Last 20 checks
    
    const responseTimes = recentChecks.map(check => check.metrics.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const errorCount = this.getErrorCount();
    const totalChecks = recentChecks.length;
    const errorRate = totalChecks > 0 ? errorCount / totalChecks : 0;

    const uptime = this.calculateUptime();

    return {
      responseTime: avgResponseTime,
      errorCount,
      uptime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  private getErrorCount(): number {
    const recentChecks = this.statusHistory.slice(-20);
    return recentChecks.filter(check => 
      Object.values(check.services).some(service => service.status !== 'healthy')
    ).length;
  }

  private calculateUptime(): number {
    if (this.statusHistory.length < 2) return 1.0;

    const totalChecks = this.statusHistory.length;
    const healthyChecks = this.statusHistory.filter(check =>
      Object.values(check.services).every(service => service.status === 'healthy')
    ).length;

    return healthyChecks / totalChecks;
  }

  private checkAlerts(services: HealthStatus['services'], metrics: HealthStatus['metrics']): void {
    const timestamp = new Date().toISOString();

    // Check response time threshold
    if (metrics.responseTime > this.config.thresholds.responseTime) {
      this.alerts.push({
        level: 'warning',
        service: 'system',
        message: `High response time: ${metrics.responseTime}ms`,
        timestamp,
      });
    }

    // Check error rate threshold
    if (metrics.errorRate > this.config.thresholds.errorRate) {
      this.alerts.push({
        level: 'critical',
        service: 'system',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
        timestamp,
      });
    }

    // Check uptime threshold
    if (metrics.uptime < this.config.thresholds.uptime) {
      this.alerts.push({
        level: 'critical',
        service: 'system',
        message: `Low uptime: ${(metrics.uptime * 100).toFixed(1)}%`,
        timestamp,
      });
    }

    // Check individual services
    Object.entries(services).forEach(([serviceName, service]) => {
      if (service.status === 'unhealthy') {
        this.alerts.push({
          level: 'critical',
          service: serviceName,
          message: `Service is unhealthy: ${service.error}`,
          timestamp,
        });
      } else if (service.status === 'degraded') {
        this.alerts.push({
          level: 'warning',
          service: serviceName,
          message: `Service is degraded: ${service.error}`,
          timestamp,
        });
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private logStatus(status: HealthStatus): void {
    console.log('\n' + '='.repeat(80));
    console.log(`Health Check Results - ${status.timestamp}`);
    console.log('='.repeat(80));

    console.log('\n📊 Services Status:');
    Object.entries(status.services).forEach(([service, details]) => {
      const emoji = details.status === 'healthy' ? '✅' : details.status === 'degraded' ? '⚠️' : '❌';
      console.log(`  ${emoji} ${service.padEnd(12)} ${details.latency}ms ${details.error ? `- ${details.error}` : ''}`);
    });

    console.log('\n📈 Metrics:');
    console.log(`  Response Time: ${status.metrics.responseTime.toFixed(2)}ms`);
    console.log(`  Error Count: ${status.metrics.errorCount}`);
    console.log(`  Uptime: ${(status.metrics.uptime * 100).toFixed(1)}%`);
    console.log(`  Memory Usage: ${Math.round(status.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);

    if (status.alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      status.alerts.forEach(alert => {
        const levelEmoji = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
        console.log(`  ${levelEmoji} [${alert.service}] ${alert.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  async startContinuousMonitoring(): Promise<void> {
    console.log('Starting continuous health monitoring...');
    console.log(`Check interval: ${this.config.checkInterval}ms`);
    console.log(`Thresholds - Response: ${this.config.thresholds.responseTime}ms, Error Rate: ${this.config.thresholds.errorRate}, Uptime: ${this.config.thresholds.uptime}`);

    // Initial check
    await this.runCheck();

    // Schedule periodic checks
    setInterval(async () => {
      try {
        await this.runCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.checkInterval);
  }

  generateReport(): any {
    const now = new Date();
    const lastHour = this.statusHistory.filter(check => 
      new Date(check.timestamp) > new Date(now.getTime() - 60 * 60 * 1000)
    );

    const lastDay = this.statusHistory.filter(check =>
      new Date(check.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    return {
      timestamp: now.toISOString(),
      summary: {
        current_status: this.statusHistory[this.statusHistory.length - 1],
        last_hour: this.calculateSummary(lastHour),
        last_day: this.calculateSummary(lastDay),
        all_time: this.calculateSummary(this.statusHistory),
      },
      alerts: this.alerts.slice(-50),
      recommendations: this.generateRecommendations(),
    };
  }

  private calculateSummary(checks: HealthStatus[]): any {
    if (checks.length === 0) return {};

    const serviceStatuses = ['database', 'storage', 'auth', 'app', 'api'] as const;
    const summary: any = {
      total_checks: checks.length,
      avg_response_time: 0,
      error_rate: 0,
      service_health: {},
    };

    serviceStatuses.forEach(service => {
      const serviceChecks = checks.map(check => check.services[service]);
      const healthy = serviceChecks.filter(s => s.status === 'healthy').length;
      const degraded = serviceChecks.filter(s => s.status === 'degraded').length;
      const unhealthy = serviceChecks.filter(s => s.status === 'unhealthy').length;

      summary.service_health[service] = {
        healthy,
        degraded,
        unhealthy,
        health_percentage: (healthy / checks.length) * 100,
        avg_latency: serviceChecks.reduce((sum, s) => sum + s.latency, 0) / checks.length,
      };
    });

    const responseTimes = checks.map(check => check.metrics.responseTime);
    summary.avg_response_time = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const errors = checks.filter(check =>
      Object.values(check.services).some(service => service.status !== 'healthy')
    ).length;
    summary.error_rate = (errors / checks.length) * 100;

    return summary;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const lastStatus = this.statusHistory[this.statusHistory.length - 1];

    if (!lastStatus) return recommendations;

    // Check database performance
    if (lastStatus.services.database.latency > 1000) {
      recommendations.push('Consider optimizing database queries or adding indexes');
    }

    // Check memory usage
    const memoryUsage = lastStatus.metrics.memoryUsage;
    const memoryPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;
    if (memoryPercentage > 0.8) {
      recommendations.push('High memory usage detected. Consider increasing memory or optimizing memory usage');
    }

    // Check error rate
    if (lastStatus.metrics.errorCount > 5) {
      recommendations.push('High error count detected. Review recent alerts and logs');
    }

    // Check uptime
    if (lastStatus.metrics.uptime < 0.95) {
      recommendations.push('Uptime below 95%. Consider implementing better error handling and redundancy');
    }

    return recommendations;
  }
}

// Run health check if script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  const report = args.includes('--report');

  const healthCheck = new HealthCheck();

  if (report) {
    const status = healthCheck.generateReport();
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }

  if (continuous) {
    healthCheck.startContinuousMonitoring().catch(error => {
      console.error('Failed to start monitoring:', error);
      process.exit(1);
    });
  } else {
    healthCheck.runCheck()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('Health check failed:', error);
        process.exit(1);
      });
  }
}

export { HealthCheck };
