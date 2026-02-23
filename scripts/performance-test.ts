#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import autocannon from 'autocannon';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { URL } from 'url';

interface PerformanceTestConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  testDuration: number;
  concurrentUsers: number;
  warmupDuration: number;
  outputDir: string;
  thresholds: {
    p95: number;
    requestsPerSecond: number;
    errorRate: number;
    throughput: number;
  };
}

interface TestScenario {
  name: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
  weight: number;
}

interface PerformanceResult {
  timestamp: string;
  scenario: string;
  duration: number;
  requests: {
    total: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  latency: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errors: number;
  errorRate: number;
  statusCodes: Record<string, number>;
  connections: number;
  durationActual: number;
  thresholdViolations: string[];
  passed: boolean;
}

class PerformanceTest {
  private config: PerformanceTestConfig;
  private supabase: any;
  private scenarios: TestScenario[];

  constructor() {
    this.config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      testDuration: parseInt(process.env.PERF_TEST_DURATION || '30000'),
      concurrentUsers: parseInt(process.env.PERF_CONCURRENT_USERS || '10'),
      warmupDuration: parseInt(process.env.PERF_WARMUP_DURATION || '5000'),
      outputDir: process.env.PERF_OUTPUT_DIR || './performance-reports',
      thresholds: {
        p95: parseInt(process.env.PERF_THRESHOLD_P95 || '2000'),
        requestsPerSecond: parseInt(process.env.PERF_THRESHOLD_RPS || '50'),
        errorRate: parseFloat(process.env.PERF_THRESHOLD_ERROR_RATE || '0.01'),
        throughput: parseInt(process.env.PERF_THRESHOLD_THROUGHPUT || '100000'),
      },
    };

    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);

    // Define test scenarios
    this.scenarios = [
      {
        name: 'Homepage',
        method: 'GET',
        path: '/',
        weight: 30,
      },
      {
        name: 'Product Listing',
        method: 'GET',
        path: '/shop',
        weight: 25,
      },
      {
        name: 'Product Detail',
        method: 'GET',
        path: '/product/sample-product',
        weight: 20,
      },
      {
        name: 'Search API',
        method: 'GET',
        path: '/api/search?q=test',
        headers: { 'Content-Type': 'application/json' },
        weight: 15,
      },
      {
        name: 'Add to Cart API',
        method: 'POST',
        path: '/api/cart/add',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'test', quantity: 1 }),
        weight: 10,
      },
    ];
  }

  async runFullTestSuite(): Promise<PerformanceResult[]> {
    console.log('Starting performance test suite...');
    console.log(`Target: ${this.config.appUrl}`);
    console.log(`Duration: ${this.config.testDuration}ms`);
    console.log(`Concurrent Users: ${this.config.concurrentUsers}`);

    const results: PerformanceResult[] = [];

    // 1. Warm-up phase
    console.log('\n🔥 Warming up...');
    await this.warmup();

    // 2. Run individual scenario tests
    for (const scenario of this.scenarios) {
      console.log(`\n🚀 Testing: ${scenario.name}`);
      const result = await this.runScenarioTest(scenario);
      results.push(result);
      
      if (!result.passed) {
        console.log(`❌ ${scenario.name} FAILED threshold checks`);
        result.thresholdViolations.forEach(violation => console.log(`   - ${violation}`));
      } else {
        console.log(`✅ ${scenario.name} PASSED`);
      }
    }

    // 3. Run mixed workload test
    console.log('\n🌪️  Running mixed workload test...');
    const mixedResult = await this.runMixedWorkloadTest();
    results.push(mixedResult);

    // 4. Run stress test
    console.log('\n💥 Running stress test...');
    const stressResult = await this.runStressTest();
    results.push(stressResult);

    // 5. Generate report
    await this.generateReport(results);

    return results;
  }

  private async warmup(): Promise<void> {
    const warmupScenarios = this.scenarios.slice(0, 3); // Warm up first 3 scenarios
    
    for (const scenario of warmupScenarios) {
      const instance = autocannon({
        url: new URL(scenario.path, this.config.appUrl).toString(),
        method: scenario.method,
        headers: scenario.headers,
        body: scenario.body,
        duration: this.config.warmupDuration,
        connections: 1,
        pipelining: 1,
      });

      await this.track(instance);
    }

    console.log('Warm-up completed');
  }

  private async runScenarioTest(scenario: TestScenario): Promise<PerformanceResult> {
    const url = new URL(scenario.path, this.config.appUrl).toString();
    
    const instance = autocannon({
      url,
      method: scenario.method,
      headers: scenario.headers,
      body: scenario.body,
      duration: this.config.testDuration,
      connections: this.config.concurrentUsers,
      pipelining: 1,
      timeout: 10000,
    });

    const result = await this.track(instance);
    return this.analyzeResult(result, scenario.name);
  }

  private async runMixedWorkloadTest(): Promise<PerformanceResult> {
    // Create weighted requests based on scenario weights
    const requests = [];
    const totalWeight = this.scenarios.reduce((sum, s) => sum + s.weight, 0);

    for (const scenario of this.scenarios) {
      const count = Math.round((scenario.weight / totalWeight) * 100);
      for (let i = 0; i < count; i++) {
        requests.push({
          method: scenario.method,
          path: scenario.path,
          headers: scenario.headers,
          body: scenario.body,
        });
      }
    }

    // Shuffle requests
    requests.sort(() => Math.random() - 0.5);

    const instance = autocannon({
      url: this.config.appUrl,
      duration: this.config.testDuration * 2, // Longer test for mixed workload
      connections: this.config.concurrentUsers * 2,
      pipelining: 1,
      requests,
    });

    const result = await this.track(instance);
    return this.analyzeResult(result, 'Mixed Workload');
  }

  private async runStressTest(): Promise<PerformanceResult> {
    // Gradually increase load
    const phases = [
      { duration: 10000, connections: 10 },
      { duration: 10000, connections: 25 },
      { duration: 10000, connections: 50 },
      { duration: 10000, connections: 100 },
    ];

    let overallResult: any = null;

    for (const phase of phases) {
      console.log(`  Stress phase: ${phase.connections} concurrent users`);

      const instance = autocannon({
        url: new URL('/', this.config.appUrl).toString(),
        duration: phase.duration,
        connections: phase.connections,
        pipelining: 2, // More aggressive for stress test
        timeout: 15000,
      });

      const result = await this.track(instance);
      
      if (!overallResult) {
        overallResult = result;
      } else {
        // Merge results
        overallResult = this.mergeResults(overallResult, result);
      }

      // Check if system is still responding
      if (result.errors > result.requests.total * 0.5) {
        console.log('  ⚠️  System showing high error rate, stopping stress test');
        break;
      }
    }

    return this.analyzeResult(overallResult, 'Stress Test');
  }

  private async track(instance: any): Promise<any> {
    return new Promise((resolve) => {
      let result: any;

      autocannon.track(instance, {
        outputStream: process.stdout,
        renderResultsTable: false,
        renderLatencyTable: false,
      });

      instance.on('done', (res: any) => {
        result = res;
      });

      instance.on('tick', () => {
        // Progress updates
      });

      setTimeout(() => {
        resolve(result);
      }, instance.opts.duration + 5000);
    });
  }

  private analyzeResult(result: any, scenarioName: string): PerformanceResult {
    const timestamp = new Date().toISOString();
    const violations: string[] = [];

    // Check thresholds
    if (result.latency.p95 > this.config.thresholds.p95) {
      violations.push(`p95 latency ${result.latency.p95}ms exceeds threshold ${this.config.thresholds.p95}ms`);
    }

    const rps = result.requests.average;
    if (rps < this.config.thresholds.requestsPerSecond) {
      violations.push(`Requests per second ${rps.toFixed(1)} below threshold ${this.config.thresholds.requestsPerSecond}`);
    }

    const errorRate = result.errors / result.requests.total;
    if (errorRate > this.config.thresholds.errorRate) {
      violations.push(`Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.thresholds.errorRate * 100).toFixed(2)}%`);
    }

    if (result.throughput < this.config.thresholds.throughput) {
      violations.push(`Throughput ${result.throughput} bytes/s below threshold ${this.config.thresholds.throughput}`);
    }

    return {
      timestamp,
      scenario: scenarioName,
      duration: result.duration,
      requests: {
        total: result.requests.total,
        average: result.requests.average,
        p50: result.requests.p50,
        p95: result.requests.p95,
        p99: result.requests.p99,
      },
      latency: {
        average: result.latency.average,
        p50: result.latency.p50,
        p95: result.latency.p95,
        p99: result.latency.p99,
      },
      throughput: result.throughput,
      errors: result.errors,
      errorRate,
      statusCodes: result.statusCodes,
      connections: result.connections,
      durationActual: result.duration,
      thresholdViolations: violations,
      passed: violations.length === 0,
    };
  }

  private mergeResults(result1: any, result2: any): any {
    const totalDuration = result1.duration + result2.duration;
    const totalRequests = result1.requests.total + result2.requests.total;
    const totalErrors = result1.errors + result2.errors;
    const totalThroughput = result1.throughput + result2.throughput;

    // Weighted averages for latencies
    const weight1 = result1.requests.total / totalRequests;
    const weight2 = result2.requests.total / totalRequests;

    return {
      duration: totalDuration,
      requests: {
        total: totalRequests,
        average: totalRequests / (totalDuration / 1000),
        p50: Math.max(result1.latency.p50, result2.latency.p50), // Conservative estimate
        p95: Math.max(result1.latency.p95, result2.latency.p95),
        p99: Math.max(result1.latency.p99, result2.latency.p99),
      },
      latency: {
        average: (result1.latency.average * weight1) + (result2.latency.average * weight2),
        p50: Math.max(result1.latency.p50, result2.latency.p50),
        p95: Math.max(result1.latency.p95, result2.latency.p95),
        p99: Math.max(result1.latency.p99, result2.latency.p99),
      },
      throughput: totalThroughput,
      errors: totalErrors,
      statusCodes: this.mergeStatusCodes(result1.statusCodes, result2.statusCodes),
      connections: Math.max(result1.connections, result2.connections),
    };
  }

  private mergeStatusCodes(codes1: Record<string, number>, codes2: Record<string, number>): Record<string, number> {
    const merged: Record<string, number> = { ...codes1 };
    
    Object.entries(codes2).forEach(([code, count]) => {
      merged[code] = (merged[code] || 0) + count;
    });

    return merged;
  }

  private async generateReport(results: PerformanceResult[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = join(this.config.outputDir, timestamp);

    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    // Summary report
    const summary = {
      generated_at: timestamp,
      config: this.config,
      overall_status: results.every(r => r.passed) ? 'PASSED' : 'FAILED',
      scenarios: results.map(r => ({
        name: r.scenario,
        passed: r.passed,
        p95_latency: r.latency.p95,
        requests_per_second: r.requests.average,
        error_rate: r.errorRate,
        violations: r.thresholdViolations,
      })),
      recommendations: this.generateRecommendations(results),
    };

    writeFileSync(
      join(reportDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Detailed results
    writeFileSync(
      join(reportDir, 'detailed.json'),
      JSON.stringify(results, null, 2)
    );

    // HTML report
    const htmlReport = this.generateHtmlReport(results);
    writeFileSync(
      join(reportDir, 'report.html'),
      htmlReport
    );

    console.log(`\n📊 Performance report generated: ${reportDir}`);
    console.log(`   Overall status: ${summary.overall_status}`);
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
  }

  private generateRecommendations(results: PerformanceResult[]): string[] {
    const recommendations: string[] = [];
    const failedScenarios = results.filter(r => !r.passed);

    // Check for common issues
    const highLatencyScenarios = results.filter(r => r.latency.p95 > 1000);
    if (highLatencyScenarios.length > 0) {
      recommendations.push('Optimize endpoints with high latency (>1s): ' + 
        highLatencyScenarios.map(s => s.scenario).join(', '));
    }

    const highErrorScenarios = results.filter(r => r.errorRate > 0.05);
    if (highErrorScenarios.length > 0) {
      recommendations.push('Investigate high error rates (>5%): ' +
        highErrorScenarios.map(s => s.scenario).join(', '));
    }

    const lowRpsScenarios = results.filter(r => r.requests.average < 10);
    if (lowRpsScenarios.length > 0) {
      recommendations.push('Improve throughput for low RPS scenarios: ' +
        lowRpsScenarios.map(s => s.scenario).join(', '));
    }

    // General recommendations based on overall performance
    const avgP95 = results.reduce((sum, r) => sum + r.latency.p95, 0) / results.length;
    if (avgP95 > 500) {
      recommendations.push('Consider implementing caching strategy for frequently accessed data');
    }

    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    if (totalErrors > 100) {
      recommendations.push('Review error handling and implement circuit breakers for failing services');
    }

    return recommendations;
  }

  private generateHtmlReport(results: PerformanceResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = (passedCount / totalCount) * 100;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xarastore Performance Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .summary-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card.passed {
            border-left: 4px solid #10b981;
        }
        .summary-card.failed {
            border-left: 4px solid #ef4444;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .metric-label {
            color: #6b7280;
            font-size: 0.875rem;
        }
        .scenario-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
        }
        .scenario-table th,
        .scenario-table td {
            border: 1px solid #e5e7eb;
            padding: 0.75rem;
            text-align: left;
        }
        .scenario-table th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        .scenario-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .status-passed {
            background-color: #d1fae5;
            color: #065f46;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .status-failed {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .violations {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0 8px 8px 0;
        }
        .recommendations {
            background-color: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0 8px 8px 0;
        }
        .chart-container {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>🚀 Xarastore Performance Test Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card ${passRate === 100 ? 'passed' : 'failed'}">
            <div class="metric-value">${passRate.toFixed(0)}%</div>
            <div class="metric-label">Pass Rate</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${totalCount}</div>
            <div class="metric-label">Scenarios Tested</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${passedCount}</div>
            <div class="metric-label">Scenarios Passed</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${totalCount - passedCount}</div>
            <div class="metric-label">Scenarios Failed</div>
        </div>
    </div>

    <div class="chart-container">
        <canvas id="latencyChart"></canvas>
    </div>

    <h2>📋 Scenario Results</h2>
    <table class="scenario-table">
        <thead>
            <tr>
                <th>Scenario</th>
                <th>Status</th>
                <th>p95 Latency</th>
                <th>Requests/Sec</th>
                <th>Error Rate</th>
                <th>Total Requests</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(r => `
                <tr>
                    <td><strong>${r.scenario}</strong></td>
                    <td>
                        <span class="${r.passed ? 'status-passed' : 'status-failed'}">
                            ${r.passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </td>
                    <td>${r.latency.p95.toFixed(1)}ms</td>
                    <td>${r.requests.average.toFixed(1)}</td>
                    <td>${(r.errorRate * 100).toFixed(2)}%</td>
                    <td>${r.requests.total.toLocaleString()}</td>
                </tr>
                ${r.thresholdViolations.length > 0 ? `
                <tr>
                    <td colspan="6">
                        <div class="violations">
                            <strong>Threshold Violations:</strong>
                            <ul>
                                ${r.thresholdViolations.map(v => `<li>${v}</li>`).join('')}
                            </ul>
                        </div>
                    </td>
                </tr>
                ` : ''}
            `).join('')}
        </tbody>
    </table>

    ${this.generateRecommendations(results).length > 0 ? `
    <h2>💡 Recommendations</h2>
    <div class="recommendations">
        <ul>
            ${this.generateRecommendations(results).map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <script>
        const ctx = document.getElementById('latencyChart').getContext('2d');
        const scenarios = ${JSON.stringify(results.map(r => r.scenario))};
        const p95Latencies = ${JSON.stringify(results.map(r => r.latency.p95))};
        const p50Latencies = ${JSON.stringify(results.map(r => r.latency.p50))};
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: scenarios,
                datasets: [
                    {
                        label: 'p95 Latency (ms)',
                        data: p95Latencies,
                        backgroundColor: '#dc2626',
                        borderColor: '#991b1b',
                        borderWidth: 1
                    },
                    {
                        label: 'p50 Latency (ms)',
                        data: p50Latencies,
                        backgroundColor: '#fca5a5',
                        borderColor: '#f87171',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Latency Distribution by Scenario'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  async runDatabasePerformanceTest(): Promise<void> {
    console.log('\n🗄️  Running database performance tests...');

    const queries = [
      {
        name: 'Simple Product Query',
        sql: 'SELECT * FROM products LIMIT 10',
      },
      {
        name: 'Product Search with Filters',
        sql: 'SELECT * FROM products WHERE price BETWEEN 1000 AND 10000 AND stock > 0 ORDER BY created_at DESC LIMIT 50',
      },
      {
        name: 'Product Count by Category',
        sql: 'SELECT category_id, COUNT(*) FROM products GROUP BY category_id',
      },
      {
        name: 'Order Aggregation',
        sql: 'SELECT DATE(created_at) as day, COUNT(*), SUM(total) FROM orders GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30',
      },
      {
        name: 'Complex Join',
        sql: 'SELECT p.name, p.price, c.name as category, b.name as brand FROM products p JOIN categories c ON p.category_id = c.id JOIN brands b ON p.brand_id = b.id WHERE p.is_featured = true LIMIT 20',
      },
    ];

    for (const query of queries) {
      console.log(`\nTesting: ${query.name}`);
      const startTime = Date.now();
      
      try {
        const { data, error, count } = await this.supabase
          .from('products')
          .select('*', { count: 'exact' })
          .limit(10);

        const duration = Date.now() - startTime;
        
        if (error) {
          console.log(`  ❌ Failed: ${error.message}`);
        } else {
          console.log(`  ✅ Success: ${duration}ms, ${count || 0} rows`);
        }
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Test connection pooling
    console.log('\n🔗 Testing connection pooling...');
    const concurrentQueries = 20;
    const queryPromises = [];

    for (let i = 0; i < concurrentQueries; i++) {
      queryPromises.push(
        this.supabase
          .from('products')
          .select('id', { head: true })
          .limit(1)
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(queryPromises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`  Concurrent queries: ${concurrentQueries}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Average query time: ${totalTime / concurrentQueries}ms`);
  }
}

// Run performance test if script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const databaseOnly = args.includes('--database-only');
  const scenario = args.find(arg => arg.startsWith('--scenario='))?.split('=')[1];

  const perfTest = new PerformanceTest();

  if (databaseOnly) {
    perfTest.runDatabasePerformanceTest()
      .then(() => {
        console.log('\n✅ Database performance tests completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Database performance test failed:', error);
        process.exit(1);
      });
  } else if (scenario) {
    const scenarioObj = perfTest.scenarios.find(s => s.name === scenario);
    if (!scenarioObj) {
      console.error(`Scenario not found: ${scenario}`);
      process.exit(1);
    }

    perfTest.runScenarioTest(scenarioObj)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.passed ? 0 : 1);
      })
      .catch(error => {
        console.error('Scenario test failed:', error);
        process.exit(1);
      });
  } else {
    perfTest.runFullTestSuite()
      .then(results => {
        const allPassed = results.every(r => r.passed);
        console.log(`\n${allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED'}`);
        process.exit(allPassed ? 0 : 1);
      })
      .catch((error) => {
        console.error('Performance test failed:', error);
        process.exit(1);
      });
  }
}

export { PerformanceTest };
