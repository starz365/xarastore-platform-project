#!/usr/bin/env node

import { readdirSync, statSync, unlinkSync, rmdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface LogCleanupConfig {
  logDirectories: string[];
  retentionDays: number;
  maxTotalSizeMB: number;
  patternsToKeep: RegExp[];
  patternsToDelete: RegExp[];
  compressionEnabled: boolean;
  archiveEnabled: boolean;
  archiveDir: string;
  cleanupSchedule: 'daily' | 'weekly' | 'monthly';
}

interface LogFileInfo {
  path: string;
  size: number;
  modified: Date;
  ageDays: number;
  matchesPattern: boolean;
  shouldCompress: boolean;
  shouldDelete: boolean;
  shouldArchive: boolean;
}

interface CleanupStats {
  startTime: Date;
  endTime: Date;
  totalFilesScanned: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
  filesDeleted: number;
  filesCompressed: number;
  filesArchived: number;
  errors: string[];
}

class LogCleanup {
  private config: LogCleanupConfig;
  private stats: CleanupStats;

  constructor() {
    this.config = {
      logDirectories: [
        './logs',
        './tmp',
        process.env.LOG_DIR || '/var/log/xarastore',
        './performance-reports',
        './security-reports',
        './audit-reports',
        './backups', // Cleanup old backup files
      ],
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
      maxTotalSizeMB: parseInt(process.env.MAX_LOG_SIZE_MB || '1024'),
      patternsToKeep: [
        /error\.log$/,
        /access\.log$/,
        /app\.log$/,
        /security\-scan\.log$/,
        /audit\.log$/,
        /backup\-.*\.json$/,
        /manifest\.json$/,
      ],
      patternsToDelete: [
        /\.tmp$/,
        /\.cache$/,
        /\.swp$/,
        /\.old$/,
        /\.bak$/,
        /debug\.log$/,
        /test\-.*\.log$/,
        /node_modules\/.*\.log$/,
      ],
      compressionEnabled: process.env.COMPRESS_LOGS !== 'false',
      archiveEnabled: process.env.ARCHIVE_LOGS === 'true',
      archiveDir: process.env.ARCHIVE_DIR || './logs/archive',
      cleanupSchedule: (process.env.CLEANUP_SCHEDULE as any) || 'daily',
    };

    this.stats = {
      startTime: new Date(),
      endTime: new Date(),
      totalFilesScanned: 0,
      totalSizeBefore: 0,
      totalSizeAfter: 0,
      filesDeleted: 0,
      filesCompressed: 0,
      filesArchived: 0,
      errors: [],
    };
  }

  async runCleanup(): Promise<CleanupStats> {
    console.log('🧹 Starting log cleanup process...');
    console.log(`📅 Retention: ${this.config.retentionDays} days`);
    console.log(`💾 Max size: ${this.config.maxTotalSizeMB} MB`);
    console.log(`📂 Directories: ${this.config.logDirectories.join(', ')}`);

    try {
      // Scan all log files
      const allLogFiles = await this.scanLogFiles();
      
      // Analyze files and decide actions
      const fileActions = await this.analyzeFiles(allLogFiles);
      
      // Execute actions in order
      await this.executeActions(fileActions);
      
      // Clean empty directories
      await this.cleanEmptyDirectories();
      
      // Update database logs if configured
      await this.cleanupDatabaseLogs();
      
      // Generate cleanup report
      await this.generateReport();
      
      console.log('\n✅ Cleanup completed successfully');
      
    } catch (error: any) {
      console.error('❌ Cleanup failed:', error.message);
      this.stats.errors.push(error.message);
    }

    this.stats.endTime = new Date();
    return this.stats;
  }

  private async scanLogFiles(): Promise<LogFileInfo[]> {
    console.log('\n🔍 Scanning for log files...');
    
    const allFiles: LogFileInfo[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    for (const dir of this.config.logDirectories) {
      if (!existsSync(dir)) {
        console.log(`  Skipping non-existent directory: ${dir}`);
        continue;
      }

      try {
        const files = this.scanDirectoryRecursive(dir);
        files.forEach(filePath => {
          try {
            const stats = statSync(filePath);
            const fileInfo: LogFileInfo = {
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              ageDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
              matchesPattern: this.matchesPattern(filePath),
              shouldCompress: false,
              shouldDelete: false,
              shouldArchive: false,
            };

            this.stats.totalSizeBefore += stats.size;
            allFiles.push(fileInfo);
            
          } catch (error: any) {
            console.warn(`  Could not stat ${filePath}: ${error.message}`);
          }
        });

        console.log(`  Found ${files.length} files in ${dir}`);
      } catch (error: any) {
        console.error(`  Error scanning ${dir}:`, error.message);
        this.stats.errors.push(`Scan error in ${dir}: ${error.message}`);
      }
    }

    this.stats.totalFilesScanned = allFiles.length;
    console.log(`  Total files scanned: ${allFiles.length}`);
    console.log(`  Total size: ${(this.stats.totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);

    return allFiles;
  }

  private scanDirectoryRecursive(dir: string): string[] {
    const files: string[] = [];
    
    const scan = (currentDir: string) => {
      const items = readdirSync(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = join(currentDir, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and other excluded directories
          if (!this.shouldSkipDirectory(item.name)) {
            scan(fullPath);
          }
        } else if (item.isFile()) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipPatterns = [
      /^node_modules$/,
      /^\.git$/,
      /^\.next$/,
      /^dist$/,
      /^build$/,
      /^coverage$/,
    ];
    
    return skipPatterns.some(pattern => pattern.test(dirName));
  }

  private matchesPattern(filePath: string): boolean {
    const fileName = basename(filePath);
    
    // Check if file matches any keep pattern
    const shouldKeep = this.config.patternsToKeep.some(pattern => pattern.test(filePath));
    
    // Check if file matches any delete pattern
    const shouldDelete = this.config.patternsToDelete.some(pattern => pattern.test(filePath));
    
    return shouldKeep || shouldDelete;
  }

  private async analyzeFiles(files: LogFileInfo[]): Promise<LogFileInfo[]> {
    console.log('\n📊 Analyzing files...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const totalSizeMB = this.stats.totalSizeBefore / 1024 / 1024;
    const needsCleanup = totalSizeMB > this.config.maxTotalSizeMB;

    files.forEach(file => {
      // Files older than retention period should be deleted or archived
      if (file.modified < cutoffDate) {
        if (this.config.archiveEnabled && file.size > 1024 * 1024) { // Archive files > 1MB
          file.shouldArchive = true;
        } else {
          file.shouldDelete = true;
        }
      }
      
      // Files matching delete patterns should be deleted
      const matchesDeletePattern = this.config.patternsToDelete.some(pattern => 
        pattern.test(file.path)
      );
      if (matchesDeletePattern && file.ageDays > 7) {
        file.shouldDelete = true;
      }
      
      // Large log files should be compressed
      if (this.config.compressionEnabled && file.size > 10 * 1024 * 1024) { // > 10MB
        const isAlreadyCompressed = /\.(gz|zip|bz2|xz)$/i.test(file.path);
        if (!isAlreadyCompressed) {
          file.shouldCompress = true;
        }
      }
      
      // If we're over size limit, delete more aggressively
      if (needsCleanup && file.ageDays > 14) {
        file.shouldDelete = true;
      }
    });

    // Count actions
    const toDelete = files.filter(f => f.shouldDelete).length;
    const toCompress = files.filter(f => f.shouldCompress).length;
    const toArchive = files.filter(f => f.shouldArchive).length;

    console.log(`  Files to delete: ${toDelete}`);
    console.log(`  Files to compress: ${toCompress}`);
    console.log(`  Files to archive: ${toArchive}`);

    return files;
  }

  private async executeActions(files: LogFileInfo[]): Promise<void> {
    console.log('\n⚡ Executing cleanup actions...');

    // First, compress large files
    for (const file of files.filter(f => f.shouldCompress)) {
      await this.compressFile(file);
    }

    // Then, archive old files
    for (const file of files.filter(f => f.shouldArchive)) {
      await this.archiveFile(file);
    }

    // Finally, delete files
    for (const file of files.filter(f => f.shouldDelete)) {
      await this.deleteFile(file);
    }

    console.log(`  Actions completed`);
  }

  private async compressFile(file: LogFileInfo): Promise<void> {
    try {
      console.log(`  Compressing: ${file.path}`);
      
      const compressedPath = `${file.path}.gz`;
      await execAsync(`gzip -c "${file.path}" > "${compressedPath}"`);
      
      // Verify compression was successful
      if (existsSync(compressedPath)) {
        const compressedSize = statSync(compressedPath).size;
        const ratio = ((file.size - compressedSize) / file.size * 100).toFixed(1);
        
        console.log(`    ✓ Compressed: ${ratio}% reduction`);
        
        // Delete original file
        unlinkSync(file.path);
        this.stats.filesCompressed++;
        this.stats.totalSizeAfter += compressedSize;
      } else {
        throw new Error('Compressed file not created');
      }
    } catch (error: any) {
      console.warn(`    ✗ Failed to compress: ${error.message}`);
      this.stats.errors.push(`Compression failed for ${file.path}: ${error.message}`);
    }
  }

  private async archiveFile(file: LogFileInfo): Promise<void> {
    try {
      // Create archive directory if it doesn't exist
      if (!existsSync(this.config.archiveDir)) {
        execAsync(`mkdir -p "${this.config.archiveDir}"`);
      }

      const archiveDate = new Date().toISOString().split('T')[0];
      const archiveSubDir = join(this.config.archiveDir, archiveDate);
      
      if (!existsSync(archiveSubDir)) {
        execAsync(`mkdir -p "${archiveSubDir}"`);
      }

      const archivePath = join(archiveSubDir, basename(file.path));
      console.log(`  Archiving: ${file.path} → ${archivePath}`);

      await execAsync(`cp "${file.path}" "${archivePath}"`);
      
      // Verify copy was successful
      if (existsSync(archivePath)) {
        // Delete original file
        unlinkSync(file.path);
        this.stats.filesArchived++;
        console.log(`    ✓ Archived successfully`);
      }
    } catch (error: any) {
      console.warn(`    ✗ Failed to archive: ${error.message}`);
      this.stats.errors.push(`Archive failed for ${file.path}: ${error.message}`);
    }
  }

  private async deleteFile(file: LogFileInfo): Promise<void> {
    try {
      console.log(`  Deleting: ${file.path}`);
      unlinkSync(file.path);
      this.stats.filesDeleted++;
      console.log(`    ✓ Deleted`);
    } catch (error: any) {
      console.warn(`    ✗ Failed to delete: ${error.message}`);
      this.stats.errors.push(`Delete failed for ${file.path}: ${error.message}`);
    }
  }

  private async cleanEmptyDirectories(): Promise<void> {
    console.log('\n📁 Cleaning empty directories...');
    
    let directoriesCleaned = 0;
    
    for (const dir of this.config.logDirectories) {
      if (!existsSync(dir)) continue;
      
      try {
        const emptyDirs = this.findEmptyDirectories(dir);
        
        for (const emptyDir of emptyDirs) {
          // Don't delete the root log directories
          if (emptyDir !== dir && !this.shouldSkipDirectory(basename(emptyDir))) {
            console.log(`  Removing empty directory: ${emptyDir}`);
            rmdirSync(emptyDir);
            directoriesCleaned++;
          }
        }
      } catch (error: any) {
        console.warn(`  Error cleaning directories in ${dir}: ${error.message}`);
      }
    }
    
    console.log(`  Removed ${directoriesCleaned} empty directories`);
  }

  private findEmptyDirectories(dir: string): string[] {
    const emptyDirs: string[] = [];
    
    const checkDir = (currentDir: string): boolean => {
      const items = readdirSync(currentDir, { withFileTypes: true });
      
      if (items.length === 0) {
        emptyDirs.push(currentDir);
        return true;
      }
      
      let allSubdirsEmpty = true;
      const subdirs = items.filter(item => item.isDirectory());
      
      for (const subdir of subdirs) {
        const subdirPath = join(currentDir, subdir.name);
        if (!this.shouldSkipDirectory(subdir.name)) {
          const isEmpty = checkDir(subdirPath);
          allSubdirsEmpty = allSubdirsEmpty && isEmpty;
        }
      }
      
      // If all subdirectories are empty and there are no files, this directory is empty
      const hasFiles = items.some(item => item.isFile());
      if (allSubdirsEmpty && !hasFiles && currentDir !== dir) {
        emptyDirs.push(currentDir);
        return true;
      }
      
      return false;
    };

    checkDir(dir);
    return emptyDirs;
  }

  private async cleanupDatabaseLogs(): Promise<void> {
    console.log('\n🗄️  Cleaning up database logs...');
    
    try {
      // Clean old audit logs
      const auditLogsDir = './logs/audit';
      if (existsSync(auditLogsDir)) {
        const files = readdirSync(auditLogsDir)
          .map(file => join(auditLogsDir, file))
          .filter(file => {
            try {
              const stats = statSync(file);
              const ageDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
              return ageDays > 90; // Keep audit logs for 90 days
            } catch {
              return false;
            }
          });

        for (const file of files) {
          unlinkSync(file);
          console.log(`  Deleted old audit log: ${basename(file)}`);
        }
      }

      // Clean old performance reports
      const perfReportsDir = './performance-reports';
      if (existsSync(perfReportsDir)) {
        const reports = readdirSync(perfReportsDir, { withFileTypes: true })
          .filter(item => item.isDirectory())
          .map(dir => join(perfReportsDir, dir.name))
          .filter(dir => {
            try {
              const stats = statSync(dir);
              const ageDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
              return ageDays > 30; // Keep performance reports for 30 days
            } catch {
              return false;
            }
          });

        for (const reportDir of reports) {
          await execAsync(`rm -rf "${reportDir}"`);
          console.log(`  Deleted old performance report: ${basename(reportDir)}`);
        }
      }

      // Clean old backup files (keep only last 7 days of daily backups)
      const backupDir = './backups';
      if (existsSync(backupDir)) {
        const backups = readdirSync(backupDir, { withFileTypes: true })
          .filter(item => item.isDirectory() && item.name.startsWith('backup-'))
          .map(dir => join(backupDir, dir.name))
          .sort() // Sort by name (which includes timestamp)
          .slice(0, -7); // Keep last 7, delete older

        for (const backup of backups) {
          await execAsync(`rm -rf "${backup}"`);
          console.log(`  Deleted old backup: ${basename(backup)}`);
        }
      }

    } catch (error: any) {
      console.warn(`  Database log cleanup failed: ${error.message}`);
      this.stats.errors.push(`Database log cleanup error: ${error.message}`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating cleanup report...');

    const report = {
      cleanup_run: {
        start_time: this.stats.startTime.toISOString(),
        end_time: this.stats.endTime.toISOString(),
        duration_seconds: Math.round(
          (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
        ),
      },
      statistics: {
        files_scanned: this.stats.totalFilesScanned,
        size_before_mb: (this.stats.totalSizeBefore / 1024 / 1024).toFixed(2),
        size_after_mb: (this.stats.totalSizeAfter / 1024 / 1024).toFixed(2),
        space_saved_mb: (
          (this.stats.totalSizeBefore - this.stats.totalSizeAfter) / 1024 / 1024
        ).toFixed(2),
        files_deleted: this.stats.filesDeleted,
        files_compressed: this.stats.filesCompressed,
        files_archived: this.stats.filesArchived,
      },
      configuration: {
        retention_days: this.config.retentionDays,
        max_size_mb: this.config.maxTotalSizeMB,
        directories: this.config.logDirectories,
        compression_enabled: this.config.compressionEnabled,
        archive_enabled: this.config.archiveEnabled,
      },
      errors: this.stats.errors.length > 0 ? this.stats.errors : 'No errors',
      recommendations: this.generateRecommendations(),
    };

    // Save report
    const reportDir = './logs/cleanup';
    if (!existsSync(reportDir)) {
      execAsync(`mkdir -p "${reportDir}"`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportDir, `cleanup-${timestamp}.json`);

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  Report saved: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log(`Duration: ${report.cleanup_run.duration_seconds}s`);
    console.log(`Files scanned: ${report.statistics.files_scanned}`);
    console.log(`Space saved: ${report.statistics.space_saved_mb} MB`);
    console.log(`Files deleted: ${report.statistics.files_deleted}`);
    console.log(`Files compressed: ${report.statistics.files_compressed}`);
    console.log(`Files archived: ${report.statistics.files_archived}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`Errors: ${this.stats.errors.length}`);
      this.stats.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const totalSizeMB = this.stats.totalSizeBefore / 1024 / 1024;

    if (totalSizeMB > this.config.maxTotalSizeMB) {
      recommendations.push(
        `Log size (${totalSizeMB.toFixed(2)} MB) exceeds limit (${this.config.maxTotalSizeMB} MB). Consider reducing retention period or increasing limit.`
      );
    }

    if (this.stats.filesDeleted > 100) {
      recommendations.push(
        `Large number of files deleted (${this.stats.filesDeleted}). Consider implementing log rotation to manage log files more effectively.`
      );
    }

    if (!this.config.compressionEnabled && totalSizeMB > 500) {
      recommendations.push(
        'Enable log compression to save disk space for large log files.'
      );
    }

    if (!this.config.archiveEnabled && this.config.retentionDays < 90) {
      recommendations.push(
        'Consider enabling log archiving for long-term retention of important logs.'
      );
    }

    if (this.stats.errors.length > 0) {
      recommendations.push(
        'Review and fix errors reported during cleanup to ensure complete log management.'
      );
    }

    return recommendations;
  }

  async scheduleCleanup(): Promise<void> {
    console.log('📅 Scheduling automatic log cleanup...');

    const cronExpression = this.getCronExpression();
    const scriptPath = join(process.cwd(), 'scripts/cleanup-logs.ts');
    
    const cronJob = `
# Xarastore Log Cleanup
${cronExpression} cd ${process.cwd()} && npm run cleanup:logs >> ./logs/cleanup-cron.log 2>&1
`;

    console.log(`Cron job to add:\n${cronJob}`);
    console.log('\nTo schedule automatically, run:');
    console.log(`echo '${cronJob.trim()}' | crontab -`);
    
    // For Docker/container environments
    console.log('\nFor Docker containers, add to Dockerfile:');
    console.log('RUN echo "' + cronJob.trim().replace(/\n/g, '\\n') + '" > /etc/cron.d/xarastore-cleanup');
    console.log('RUN chmod 0644 /etc/cron.d/xarastore-cleanup');
  }

  private getCronExpression(): string {
    switch (this.config.cleanupSchedule) {
      case 'daily':
        return '0 2 * * *'; // 2 AM daily
      case 'weekly':
        return '0 2 * * 0'; // 2 AM every Sunday
      case 'monthly':
        return '0 2 1 * *'; // 2 AM on 1st of every month
      default:
        return '0 2 * * *';
    }
  }

  async analyzeDiskUsage(): Promise<void> {
    console.log('\n💾 Analyzing disk usage...');

    try {
      // Get disk usage for log directories
      for (const dir of this.config.logDirectories) {
        if (existsSync(dir)) {
          const { stdout } = await execAsync(`du -sh "${dir}"`);
          console.log(`  ${stdout.trim()}`);
        }
      }

      // Get overall disk usage
      const { stdout: dfOutput } = await execAsync('df -h .');
      console.log('\n📊 Current disk usage:');
      console.log(dfOutput);

      // Check inode usage (important for systems with many small files)
      const { stdout: inodeOutput } = await execAsync('df -i .');
      console.log('📈 Inode usage:');
      console.log(inodeOutput);

    } catch (error: any) {
      console.warn(`  Disk usage analysis failed: ${error.message}`);
    }
  }
}

// Run cleanup if script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const schedule = args.includes('--schedule');
  const analyze = args.includes('--analyze');
  const dryRun = args.includes('--dry-run');

  const cleanup = new LogCleanup();

  if (dryRun) {
    console.log('🚧 DRY RUN MODE - No files will be modified');
    process.env.COMPRESS_LOGS = 'false';
    process.env.ARCHIVE_LOGS = 'false';
  }

  if (schedule) {
    cleanup.scheduleCleanup()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Scheduling failed:', error);
        process.exit(1);
      });
  } else if (analyze) {
    cleanup.analyzeDiskUsage()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Analysis failed:', error);
        process.exit(1);
      });
  } else {
    cleanup.runCleanup()
      .then(stats => {
        const spaceSaved = (
          (stats.totalSizeBefore - stats.totalSizeAfter) / 1024 / 1024
        ).toFixed(2);
        
        console.log(`\n🎉 Cleanup saved ${spaceSaved} MB of disk space`);
        
        if (dryRun) {
          console.log('\n⚠️  This was a dry run. To actually clean files, run without --dry-run flag');
        }
        
        process.exit(stats.errors.length > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  }
}

export { LogCleanup };
