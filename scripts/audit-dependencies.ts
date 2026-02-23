#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import https from 'https';
import { createInterface } from 'readline';

const execAsync = promisify(exec);

interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  license: string;
  vulnerabilities: Vulnerability[];
  outdated: boolean;
  latestVersion?: string;
  deprecated?: boolean;
  deprecatedMessage?: string;
  size?: number;
  maintainers: string[];
  repository?: string;
  description?: string;
}

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  cve?: string;
  cvss?: number;
  affectedVersions: string;
  patchedVersions: string;
  references: string[];
  disclosureDate?: string;
}

interface AuditReport {
  timestamp: string;
  summary: {
    totalDependencies: number;
    productionDependencies: number;
    developmentDependencies: number;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    outdated: number;
    deprecated: number;
    licenseIssues: number;
  };
  dependencies: Dependency[];
  recommendations: string[];
  licenseCompliance: LicenseCompliance[];
  securityAdvisories: SecurityAdvisory[];
}

interface LicenseCompliance {
  name: string;
  license: string;
  compliant: boolean;
  risk: 'high' | 'medium' | 'low';
  reason?: string;
  alternative?: string;
}

interface SecurityAdvisory {
  id: string;
  severity: string;
  title: string;
  affectedPackages: string[];
  published: string;
  updated: string;
  overview: string;
  recommendation: string;
}

class DependencyAuditor {
  private packageJson: any;
  private dependencies: Dependency[] = [];
  private outputDir: string;
  private licenseWhitelist: string[];
  private licenseBlacklist: string[];

  constructor() {
    this.outputDir = process.env.AUDIT_OUTPUT_DIR || './audit-reports';
    this.licenseWhitelist = [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'Unlicense',
      '0BSD',
    ];
    this.licenseBlacklist = [
      'GPL-1.0-only',
      'GPL-1.0-or-later',
      'GPL-2.0-only',
      'GPL-2.0-or-later',
      'GPL-3.0-only',
      'GPL-3.0-or-later',
      'AGPL-3.0-only',
      'AGPL-3.0-or-later',
    ];
    
    this.loadPackageJson();
  }

  private loadPackageJson(): void {
    try {
      const packageJsonContent = readFileSync('package.json', 'utf8');
      this.packageJson = JSON.parse(packageJsonContent);
    } catch (error) {
      throw new Error('Failed to load package.json');
    }
  }

  async runFullAudit(): Promise<AuditReport> {
    console.log('🔍 Starting dependency audit...');
    console.log(`📦 Project: ${this.packageJson.name} v${this.packageJson.version}`);

    // Collect all dependencies
    await this.collectDependencies();

    // Run security audit
    await this.runSecurityAudit();

    // Check for outdated packages
    await this.checkOutdatedPackages();

    // Check licenses
    await this.checkLicenses();

    // Check for deprecated packages
    await this.checkDeprecatedPackages();

    // Generate report
    const report = this.generateReport();
    await this.saveReport(report);

    return report;
  }

  private async collectDependencies(): Promise<void> {
    console.log('\n📊 Collecting dependencies...');

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    const depEntries = Object.entries(allDeps);
    console.log(`  Found ${depEntries.length} total dependencies`);

    // Get detailed information for each dependency
    for (const [name, version] of depEntries) {
      const type = name in (this.packageJson.dependencies || {}) ? 'production' : 'development';
      
      console.log(`  Processing: ${name}@${version}`);
      
      try {
        // Get package info from npm
        const packageInfo = await this.getPackageInfo(name);
        
        const dependency: Dependency = {
          name,
          version: version as string,
          type,
          license: packageInfo.license || 'Unknown',
          vulnerabilities: [],
          outdated: false,
          maintainers: packageInfo.maintainers || [],
          repository: packageInfo.repository?.url || '',
          description: packageInfo.description || '',
        };

        this.dependencies.push(dependency);
      } catch (error: any) {
        console.warn(`  ⚠️  Failed to get info for ${name}: ${error.message}`);
        
        // Add with minimal info
        this.dependencies.push({
          name,
          version: version as string,
          type,
          license: 'Unknown',
          vulnerabilities: [],
          outdated: false,
          maintainers: [],
        });
      }
    }
  }

  private async getPackageInfo(packageName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `https://registry.npmjs.org/${packageName}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const packageData = JSON.parse(data);
            
            // Get latest version info
            const latestVersion = packageData['dist-tags']?.latest;
            const latest = packageData.versions[latestVersion];
            
            resolve({
              license: latest?.license || packageData.license,
              maintainers: packageData.maintainers?.map((m: any) => m.name) || [],
              repository: latest?.repository,
              description: latest?.description,
              latestVersion,
            });
          } catch (error) {
            reject(new Error('Failed to parse package info'));
          }
        });
      }).on('error', reject);
    });
  }

  private async runSecurityAudit(): Promise<void> {
    console.log('\n🛡️  Running security audit...');

    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);

      if (auditResult.vulnerabilities) {
        Object.entries(auditResult.vulnerabilities).forEach(([name, vulnData]: [string, any]) => {
          const dependency = this.dependencies.find(dep => dep.name === name);
          if (dependency) {
            dependency.vulnerabilities.push({
              severity: vulnData.severity,
              title: vulnData.name || 'Unknown vulnerability',
              description: vulnData.description || 'No description available',
              cve: vulnData.cve,
              cvss: vulnData.cvss?.score,
              affectedVersions: vulnData.range,
              patchedVersions: vulnData.fixAvailable?.name || 'None',
              references: vulnData.via?.filter((v: any) => typeof v === 'string') || [],
              disclosureDate: vulnData.published,
            });
          }
        });

        console.log(`  Found ${Object.keys(auditResult.vulnerabilities).length} vulnerable packages`);
      } else {
        console.log('  No vulnerabilities found via npm audit');
      }

      // Additional security checks
      await this.checkForKnownVulnerabilities();
      
    } catch (error: any) {
      console.error('  Security audit failed:', error.message);
      
      // Fallback: Check npm advisory database
      await this.checkNpmAdvisories();
    }
  }

  private async checkForKnownVulnerabilities(): Promise<void> {
    // Check specific known vulnerable packages
    const knownVulnerablePackages = [
      // Add known vulnerable packages here
    ];

    for (const dep of this.dependencies) {
      const isKnownVulnerable = knownVulnerablePackages.some(
        ([name, version]) => name === dep.name && this.versionMatches(dep.version, version)
      );

      if (isKnownVulnerable && !dep.vulnerabilities.some(v => v.title.includes('known'))) {
        dep.vulnerabilities.push({
          severity: 'high',
          title: 'Known Vulnerable Package',
          description: 'This package version is known to have security vulnerabilities',
          affectedVersions: dep.version,
          patchedVersions: 'Upgrade to latest',
          references: ['https://snyk.io/vuln', 'https://npmjs.com/advisories'],
        });
      }
    }
  }

  private async checkNpmAdvisories(): Promise<void> {
    console.log('  Checking npm security advisories...');

    // This would integrate with npm advisory API
    // For now, we'll just note that this check would be performed
    this.dependencies.forEach(dep => {
      if (dep.name.includes('lodash') && dep.version.startsWith('4.17.')) {
        dep.vulnerabilities.push({
          severity: 'high',
          title: 'Prototype Pollution in lodash',
          description: 'Versions before 4.17.21 are vulnerable to prototype pollution',
          cve: 'CVE-2021-23337',
          cvss: 7.5,
          affectedVersions: '<4.17.21',
          patchedVersions: '>=4.17.21',
          references: ['https://npmjs.com/advisories/1673'],
        });
      }
    });
  }

  private async checkOutdatedPackages(): Promise<void> {
    console.log('\n🔄 Checking for outdated packages...');

    try {
      const { stdout } = await execAsync('npm outdated --json');
      const outdated = JSON.parse(stdout || '{}');

      Object.entries(outdated).forEach(([name, data]: [string, any]) => {
        const dependency = this.dependencies.find(dep => dep.name === name);
        if (dependency) {
          dependency.outdated = true;
          dependency.latestVersion = data.latest;
        }
      });

      const outdatedCount = Object.keys(outdated).length;
      console.log(`  Found ${outdatedCount} outdated packages`);
    } catch (error: any) {
      console.error('  Outdated check failed:', error.message);
    }
  }

  private async checkLicenses(): Promise<void> {
    console.log('\n📜 Checking licenses...');

    // Check each dependency's license against whitelist/blacklist
    this.dependencies.forEach(dep => {
      if (dep.license === 'Unknown') {
        console.warn(`  ⚠️  Unknown license for ${dep.name}`);
      } else if (this.licenseBlacklist.includes(dep.license)) {
        dep.vulnerabilities.push({
          severity: 'high',
          title: 'Restricted License',
          description: `Package uses ${dep.license} which may have licensing restrictions`,
          affectedVersions: dep.version,
          patchedVersions: 'Find alternative package',
          references: ['https://choosealicense.com/licenses/'],
        });
        console.log(`  ⚠️  Restricted license found: ${dep.name} (${dep.license})`);
      } else if (!this.licenseWhitelist.includes(dep.license)) {
        console.log(`  ℹ️  Non-standard license: ${dep.name} (${dep.license})`);
      }
    });
  }

  private async checkDeprecatedPackages(): Promise<void> {
    console.log('\n🗑️  Checking for deprecated packages...');

    // Check each package for deprecation
    for (const dep of this.dependencies) {
      try {
        const { stdout } = await execAsync(`npm view ${dep.name} deprecated --json`);
        const deprecated = JSON.parse(stdout);
        
        if (deprecated && deprecated !== '') {
          dep.deprecated = true;
          dep.deprecatedMessage = deprecated;
          console.log(`  ⚠️  Deprecated: ${dep.name} - ${deprecated}`);
        }
      } catch (error) {
        // Package might not exist or other error
      }
    }
  }

  private versionMatches(installedVersion: string, vulnerableRange: string): boolean {
    // Simplified version matching
    // In production, use a proper semver library
    try {
      const cleanedInstalled = installedVersion.replace(/^[\^~]/, '');
      return vulnerableRange.includes(cleanedInstalled);
    } catch {
      return false;
    }
  }

  private generateReport(): AuditReport {
    const vulnerabilities = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    this.dependencies.forEach(dep => {
      dep.vulnerabilities.forEach(vuln => {
        vulnerabilities[vuln.severity]++;
      });
    });

    const totalVulnerabilities = Object.values(vulnerabilities).reduce((a, b) => a + b, 0);
    const outdatedCount = this.dependencies.filter(dep => dep.outdated).length;
    const deprecatedCount = this.dependencies.filter(dep => dep.deprecated).length;

    const summary = {
      totalDependencies: this.dependencies.length,
      productionDependencies: this.dependencies.filter(dep => dep.type === 'production').length,
      developmentDependencies: this.dependencies.filter(dep => dep.type === 'development').length,
      vulnerabilities,
      outdated: outdatedCount,
      deprecated: deprecatedCount,
      licenseIssues: this.dependencies.filter(dep => 
        this.licenseBlacklist.includes(dep.license) || dep.license === 'Unknown'
      ).length,
    };

    const recommendations = this.generateRecommendations(summary);
    const licenseCompliance = this.generateLicenseCompliance();
    const securityAdvisories = this.generateSecurityAdvisories();

    return {
      timestamp: new Date().toISOString(),
      summary,
      dependencies: this.dependencies,
      recommendations,
      licenseCompliance,
      securityAdvisories,
    };
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    // Critical vulnerabilities
    if (summary.vulnerabilities.critical > 0) {
      recommendations.push(
        `Immediately address ${summary.vulnerabilities.critical} critical vulnerabilities`
      );
    }

    // High vulnerabilities
    if (summary.vulnerabilities.high > 0) {
      recommendations.push(
        `Address ${summary.vulnerabilities.high} high severity vulnerabilities within 7 days`
      );
    }

    // Outdated packages
    if (summary.outdated > 0) {
      const percentage = (summary.outdated / summary.totalDependencies * 100).toFixed(1);
      recommendations.push(
        `Update ${summary.outdated} outdated packages (${percentage}% of total)`
      );
    }

    // Deprecated packages
    if (summary.deprecated > 0) {
      recommendations.push(
        `Replace ${summary.deprecated} deprecated packages with maintained alternatives`
      );
    }

    // License issues
    if (summary.licenseIssues > 0) {
      recommendations.push(
        `Review licenses of ${summary.licenseIssues} packages for compliance`
      );
    }

    // General recommendations
    recommendations.push('Implement automated dependency updates (e.g., Dependabot, Renovate)');
    recommendations.push('Regularly run security audits in CI/CD pipeline');
    recommendations.push('Maintain an approved package list/whitelist');
    recommendations.push('Consider using lockfiles (package-lock.json) for reproducible builds');

    return recommendations;
  }

  private generateLicenseCompliance(): LicenseCompliance[] {
    const compliance: LicenseCompliance[] = [];

    this.dependencies.forEach(dep => {
      let compliant = true;
      let risk: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      let alternative = '';

      if (this.licenseBlacklist.includes(dep.license)) {
        compliant = false;
        risk = 'high';
        reason = `Uses restricted license: ${dep.license}`;
        alternative = 'Find alternative package with permissive license';
      } else if (dep.license === 'Unknown') {
        compliant = false;
        risk = 'medium';
        reason = 'License information not available';
        alternative = 'Contact package maintainer or find alternative';
      } else if (!this.licenseWhitelist.includes(dep.license)) {
        compliant = false;
        risk = 'medium';
        reason = `Uses non-standard license: ${dep.license}`;
        alternative = 'Review license terms carefully';
      }

      if (!compliant) {
        compliance.push({
          name: dep.name,
          license: dep.license,
          compliant,
          risk,
          reason,
          alternative,
        });
      }
    });

    return compliance;
  }

  private generateSecurityAdvisories(): SecurityAdvisory[] {
    const advisories: SecurityAdvisory[] = [];

    // Group vulnerabilities by type/package
    const vulnerabilityMap = new Map<string, Vulnerability[]>();

    this.dependencies.forEach(dep => {
      dep.vulnerabilities.forEach(vuln => {
        const key = vuln.cve || vuln.title;
        if (!vulnerabilityMap.has(key)) {
          vulnerabilityMap.set(key, []);
        }
        vulnerabilityMap.get(key)!.push(vuln);
      });
    });

    vulnerabilityMap.forEach((vulns, key) => {
      const firstVuln = vulns[0];
      advisories.push({
        id: firstVuln.cve || `ADV-${Date.now()}`,
        severity: firstVuln.severity,
        title: firstVuln.title,
        affectedPackages: vulns.map(v => 
          this.dependencies.find(dep => 
            dep.vulnerabilities.some(depVuln => depVuln === v)
          )?.name || 'Unknown'
        ).filter((name, index, arr) => arr.indexOf(name) === index),
        published: firstVuln.disclosureDate || new Date().toISOString(),
        updated: new Date().toISOString(),
        overview: firstVuln.description,
        recommendation: `Upgrade affected packages to patched versions`,
      });
    });

    return advisories;
  }

  private async saveReport(report: AuditReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = join(this.outputDir, timestamp);

    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    // Save full report
    writeFileSync(
      join(reportDir, 'dependency-audit.json'),
      JSON.stringify(report, null, 2)
    );

    // Save summary
    const summary = {
      generated: report.timestamp,
      project: this.packageJson.name,
      version: this.packageJson.version,
      risk_score: this.calculateRiskScore(report),
      vulnerabilities: report.summary.vulnerabilities,
      outdated: report.summary.outdated,
      deprecated: report.summary.deprecated,
      top_recommendations: report.recommendations.slice(0, 5),
    };

    writeFileSync(
      join(reportDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    writeFileSync(
      join(reportDir, 'report.html'),
      htmlReport
    );

    console.log(`\n📊 Audit report generated: ${reportDir}`);
    console.log(`   Risk Score: ${this.calculateRiskScore(report)}/10`);
    
    if (report.summary.vulnerabilities.critical > 0) {
      console.log(`   🚨 CRITICAL: ${report.summary.vulnerabilities.critical} vulnerabilities found!`);
    }
  }

  private calculateRiskScore(report: AuditReport): number {
    const weights = {
      critical: 10,
      high: 7.5,
      medium: 5,
      low: 2.5,
      info: 1,
    };

    let score = 0;
    
    Object.entries(weights).forEach(([severity, weight]) => {
      const count = report.summary.vulnerabilities[severity as keyof typeof report.summary.vulnerabilities];
      score += count * weight;
    });

    // Add points for outdated and deprecated packages
    score += report.summary.outdated * 0.5;
    score += report.summary.deprecated * 1;

    // Normalize to 0-10 scale
    const maxScore = report.summary.totalDependencies * 10;
    const normalizedScore = (score / maxScore) * 10;
    
    return Math.min(10, Math.max(0, normalizedScore));
  }

  private generateHtmlReport(report: AuditReport): string {
    const riskScore = this.calculateRiskScore(report);
    const riskColor = riskScore >= 7.5 ? '#dc2626' : riskScore >= 5 ? '#f59e0b' : riskScore >= 2.5 ? '#3b82f6' : '#10b981';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dependency Audit Report - ${this.packageJson.name}</title>
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
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
        }
        .risk-score {
            display: inline-block;
            background: ${riskColor};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-weight: bold;
            font-size: 1.5rem;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .summary-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
        }
        .summary-card.critical { border-left: 4px solid #dc2626; }
        .summary-card.high { border-left: 4px solid #f97316; }
        .summary-card.medium { border-left: 4px solid #eab308; }
        .summary-card.low { border-left: 4px solid #3b82f6; }
        .summary-card.info { border-left: 4px solid #6b7280; }
        
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .metric-label {
            color: #6b7280;
            font-size: 0.875rem;
        }
        .vulnerability-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
        }
        .vulnerability-table th,
        .vulnerability-table td {
            border: 1px solid #e5e7eb;
            padding: 0.75rem;
            text-align: left;
        }
        .vulnerability-table th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        .severity-critical { background-color: #fee2e2; color: #991b1b; }
        .severity-high { background-color: #fed7aa; color: #9a3412; }
        .severity-medium { background-color: #fef3c7; color: #92400e; }
        .severity-low { background-color: #dbeafe; color: #1e40af; }
        
        .severity-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            display: inline-block;
        }
        .recommendations {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-radius: 8px;
            padding: 1.5rem;
            margin: 2rem 0;
        }
        .chart-container {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .dependency-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .dependency-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .dependency-name {
            font-weight: bold;
            font-size: 1.1rem;
        }
        .dependency-version {
            color: #6b7280;
            font-family: monospace;
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-right: 0.5rem;
        }
        .badge-production { background-color: #10b981; color: white; }
        .badge-development { background-color: #3b82f6; color: white; }
        .badge-outdated { background-color: #f59e0b; color: white; }
        .badge-deprecated { background-color: #ef4444; color: white; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>📦 Dependency Audit Report</h1>
        <p>Project: ${this.packageJson.name} v${this.packageJson.version}</p>
        <p>Generated: ${report.timestamp}</p>
        <div class="risk-score">Risk Score: ${riskScore.toFixed(1)}/10</div>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="metric-value">${report.summary.totalDependencies}</div>
            <div class="metric-label">Total Dependencies</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${report.summary.productionDependencies}</div>
            <div class="metric-label">Production</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${report.summary.developmentDependencies}</div>
            <div class="metric-label">Development</div>
        </div>
        <div class="summary-card critical">
            <div class="metric-value">${report.summary.vulnerabilities.critical}</div>
            <div class="metric-label">Critical</div>
        </div>
        <div class="summary-card high">
            <div class="metric-value">${report.summary.vulnerabilities.high}</div>
            <div class="metric-label">High</div>
        </div>
        <div class="summary-card medium">
            <div class="metric-value">${report.summary.vulnerabilities.medium}</div>
            <div class="metric-label">Medium</div>
        </div>
        <div class="summary-card low">
            <div class="metric-value">${report.summary.vulnerabilities.low}</div>
            <div class="metric-label">Low</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${report.summary.outdated}</div>
            <div class="metric-label">Outdated</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${report.summary.deprecated}</div>
            <div class="metric-label">Deprecated</div>
        </div>
    </div>

    <div class="chart-container">
        <canvas id="vulnerabilityChart"></canvas>
    </div>

    <h2>🚨 Critical & High Severity Vulnerabilities</h2>
    <table class="vulnerability-table">
        <thead>
            <tr>
                <th>Package</th>
                <th>Severity</th>
                <th>Title</th>
                <th>Affected Version</th>
                <th>Patched Version</th>
                <th>Recommendation</th>
            </tr>
        </thead>
        <tbody>
            ${report.dependencies
              .filter(dep => dep.vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high'))
              .flatMap(dep => 
                dep.vulnerabilities
                  .filter(v => v.severity === 'critical' || v.severity === 'high')
                  .map(vuln => `
                    <tr>
                        <td><strong>${dep.name}</strong></td>
                        <td>
                            <span class="severity-badge severity-${vuln.severity}">
                                ${vuln.severity.toUpperCase()}
                            </span>
                        </td>
                        <td>${vuln.title}</td>
                        <td><code>${vuln.affectedVersions}</code></td>
                        <td><code>${vuln.patchedVersions}</code></td>
                        <td>Upgrade to ${dep.latestVersion || 'latest version'}</td>
                    </tr>
                  `)
              ).join('')}
        </tbody>
    </table>

    <h2>📋 Dependency Details</h2>
    ${report.dependencies.map(dep => `
        <div class="dependency-card">
            <div class="dependency-header">
                <div>
                    <span class="dependency-name">${dep.name}</span>
                    <span class="dependency-version">${dep.version}</span>
                    ${dep.latestVersion ? `<span class="dependency-version">→ ${dep.latestVersion}</span>` : ''}
                </div>
                <div>
                    <span class="badge badge-${dep.type}">${dep.type}</span>
                    ${dep.outdated ? '<span class="badge badge-outdated">Outdated</span>' : ''}
                    ${dep.deprecated ? '<span class="badge badge-deprecated">Deprecated</span>' : ''}
                    ${dep.vulnerabilities.length > 0 ? 
                      `<span class="badge severity-${dep.vulnerabilities[0].severity}">
                        ${dep.vulnerabilities.length} vuln${dep.vulnerabilities.length > 1 ? 's' : ''}
                      </span>` : 
                      '<span class="badge" style="background-color: #10b981;">Secure</span>'
                    }
                </div>
            </div>
            ${dep.description ? `<p>${dep.description}</p>` : ''}
            ${dep.vulnerabilities.length > 0 ? `
                <div style="margin-top: 0.5rem;">
                    <strong>Vulnerabilities:</strong>
                    <ul>
                        ${dep.vulnerabilities.map(v => `
                            <li>
                                <span class="severity-badge severity-${v.severity}" style="margin-right: 0.5rem;">
                                    ${v.severity}
                                </span>
                                ${v.title}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('')}

    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ol>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ol>
    </div>

    <script>
        const ctx = document.getElementById('vulnerabilityChart').getContext('2d');
        const severityData = {
            critical: ${report.summary.vulnerabilities.critical},
            high: ${report.summary.vulnerabilities.high},
            medium: ${report.summary.vulnerabilities.medium},
            low: ${report.summary.vulnerabilities.low},
            info: ${report.summary.vulnerabilities.info},
            secure: ${report.summary.totalDependencies - Object.values(report.summary.vulnerabilities).reduce((a, b) => a + b, 0)}
        };
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low', 'Info', 'Secure'],
                datasets: [{
                    data: [
                        severityData.critical,
                        severityData.high,
                        severityData.medium,
                        severityData.low,
                        severityData.info,
                        severityData.secure
                    ],
                    backgroundColor: [
                        '#dc2626',
                        '#f97316',
                        '#eab308',
                        '#3b82f6',
                        '#6b7280',
                        '#10b981'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Dependency Security Status'
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  async generateFixCommands(): Promise<string[]> {
    const commands: string[] = [];

    // Check for packages with critical/high vulnerabilities
    const criticalPackages = this.dependencies.filter(dep =>
      dep.vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high')
    );

    if (criticalPackages.length > 0) {
      commands.push('# Fix critical/high vulnerabilities:');
      criticalPackages.forEach(dep => {
        commands.push(`npm install ${dep.name}@${dep.latestVersion || 'latest'}`);
      });
      commands.push('');
    }

    // Update all outdated packages
    const outdatedPackages = this.dependencies.filter(dep => dep.outdated);
    if (outdatedPackages.length > 0) {
      commands.push('# Update outdated packages:');
      outdatedPackages.forEach(dep => {
        commands.push(`npm install ${dep.name}@${dep.latestVersion || 'latest'}`);
      });
      commands.push('');
    }

    // Replace deprecated packages
    const deprecatedPackages = this.dependencies.filter(dep => dep.deprecated);
    if (deprecatedPackages.length > 0) {
      commands.push('# Replace deprecated packages:');
      deprecatedPackages.forEach(dep => {
        commands.push(`# ${dep.name} is deprecated: ${dep.deprecatedMessage}`);
        commands.push('# Find alternative at: https://www.npmjs.com/package/' + dep.name);
        commands.push('');
      });
    }

    return commands;
  }

  async interactiveFix(): Promise<void> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n🔧 Interactive Fix Mode');
    console.log('='.repeat(50));

    const questions = [
      {
        type: 'critical',
        message: 'Fix critical vulnerabilities? (y/n) ',
        packages: this.dependencies.filter(dep =>
          dep.vulnerabilities.some(v => v.severity === 'critical')
        ),
      },
      {
        type: 'high',
        message: 'Fix high severity vulnerabilities? (y/n) ',
        packages: this.dependencies.filter(dep =>
          dep.vulnerabilities.some(v => v.severity === 'high')
        ),
      },
      {
        type: 'outdated',
        message: 'Update outdated packages? (y/n) ',
        packages: this.dependencies.filter(dep => dep.outdated),
      },
    ];

    const commands: string[] = [];

    for (const question of questions) {
      if (question.packages.length === 0) continue;

      const answer = await new Promise<string>(resolve => {
        rl.question(
          `${question.message} (${question.packages.length} packages) `,
          resolve
        );
      });

      if (answer.toLowerCase() === 'y') {
        question.packages.forEach(dep => {
          commands.push(`npm install ${dep.name}@${dep.latestVersion || 'latest'}`);
        });
      }
    }

    rl.close();

    if (commands.length > 0) {
      console.log('\n📝 Generated commands:');
      console.log(commands.join('\n'));
      
      const execute = await new Promise<string>(resolve => {
        const rl2 = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl2.question('\nExecute these commands? (y/n) ', resolve);
        rl2.close();
      });

      if (execute.toLowerCase() === 'y') {
        console.log('\n🚀 Executing commands...');
        for (const command of commands) {
          try {
            console.log(`Running: ${command}`);
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
          } catch (error: any) {
            console.error(`Failed: ${error.message}`);
          }
        }
        console.log('\n✅ Updates completed');
      }
    } else {
      console.log('\nNo updates selected');
    }
  }
}

// Run audit if script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const generateCommands = args.includes('--generate-commands');

  const auditor = new DependencyAuditor();

  auditor.runFullAudit()
    .then(async (report) => {
      const riskScore = auditor.calculateRiskScore(report);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log('DEPENDENCY AUDIT COMPLETE');
      console.log('='.repeat(80));
      console.log(`Risk Score: ${riskScore.toFixed(1)}/10`);
      console.log(`Total Dependencies: ${report.summary.totalDependencies}`);
      console.log(`Vulnerabilities: ${Object.values(report.summary.vulnerabilities).reduce((a, b) => a + b, 0)}`);
      console.log(`  Critical: ${report.summary.vulnerabilities.critical}`);
      console.log(`  High: ${report.summary.vulnerabilities.high}`);
      console.log(`Outdated: ${report.summary.outdated}`);
      console.log(`Deprecated: ${report.summary.deprecated}`);
      
      if (generateCommands) {
        const commands = await auditor.generateFixCommands();
        console.log('\n💻 Generated fix commands:');
        console.log(commands.join('\n'));
      }

      if (interactive) {
        await auditor.interactiveFix();
      }

      // Exit with appropriate code
      if (report.summary.vulnerabilities.critical > 0) {
        process.exit(1);
      } else if (report.summary.vulnerabilities.high > 0) {
        process.exit(2);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Dependency audit failed:', error);
      process.exit(1);
    });
}

export { DependencyAuditor };
