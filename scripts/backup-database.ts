#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

const execAsync = promisify(exec);

interface BackupConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  backupDir: string;
  retentionDays: number;
  tablesToBackup: string[];
  excludeTables: string[];
}

class DatabaseBackup {
  private config: BackupConfig;
  private supabase: any;

  constructor() {
    this.config = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDir: process.env.BACKUP_DIR || './backups',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      tablesToBackup: [
        'products',
        'product_variants',
        'categories',
        'brands',
        'users',
        'orders',
        'order_items',
        'reviews',
        'wishlist',
        'user_addresses',
        'payment_attempts',
        'transactions',
      ],
      excludeTables: ['auth.users', 'auth.sessions', 'auth.audit_log_entries'],
    };

    if (!this.config.supabaseUrl || !this.config.supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
  }

  async runBackup(): Promise<void> {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const backupPath = join(this.config.backupDir, `backup-${timestamp}`);

    try {
      console.log(`Starting database backup: ${timestamp}`);

      // Create backup directory
      if (!existsSync(backupPath)) {
        mkdirSync(backupPath, { recursive: true });
      }

      // Export schema
      await this.exportSchema(backupPath);

      // Export data for each table
      await this.exportTables(backupPath);

      // Export RLS policies
      await this.exportRLSPolicies(backupPath);

      // Create manifest
      await this.createManifest(backupPath, timestamp);

      // Cleanup old backups
      await this.cleanupOldBackups();

      console.log(`Backup completed successfully: ${backupPath}`);
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  private async exportSchema(backupPath: string): Promise<void> {
    console.log('Exporting schema...');

    const schemaQuery = `
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'auth')
      ORDER BY table_schema, table_name, ordinal_position;
    `;

    const { data, error } = await this.supabase.rpc('exec_sql', { query: schemaQuery });

    if (error) throw error;

    const schema = {
      timestamp: new Date().toISOString(),
      tables: data,
    };

    writeFileSync(
      join(backupPath, 'schema.json'),
      JSON.stringify(schema, null, 2)
    );
  }

  private async exportTables(backupPath: string): Promise<void> {
    console.log('Exporting table data...');

    for (const table of this.config.tablesToBackup) {
      console.log(`Exporting ${table}...`);

      // Get table structure
      const { data: structure, error: structureError } = await this.supabase
        .from(table)
        .select('*')
        .limit(1);

      if (structureError) {
        console.error(`Failed to get structure for ${table}:`, structureError);
        continue;
      }

      if (!structure || structure.length === 0) {
        console.log(`Table ${table} is empty, skipping...`);
        continue;
      }

      // Export data in chunks
      const chunkSize = 10000;
      let offset = 0;
      let allData: any[] = [];

      while (true) {
        const { data, error, count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact' })
          .range(offset, offset + chunkSize - 1);

        if (error) {
          console.error(`Failed to fetch data from ${table}:`, error);
          break;
        }

        if (!data || data.length === 0) break;

        allData = [...allData, ...data];
        offset += chunkSize;

        console.log(`  Fetched ${allData.length} records from ${table}...`);

        if (allData.length >= (count || 0)) break;
      }

      // Write to file
      if (allData.length > 0) {
        const tableBackup = {
          table,
          count: allData.length,
          exported_at: new Date().toISOString(),
          data: allData,
        };

        writeFileSync(
          join(backupPath, `${table}.json`),
          JSON.stringify(tableBackup, null, 2)
        );

        console.log(`  Exported ${allData.length} records from ${table}`);
      }
    }
  }

  private async exportRLSPolicies(backupPath: string): Promise<void> {
    console.log('Exporting RLS policies...');

    const policiesQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname IN ('public', 'auth')
      ORDER BY schemaname, tablename, policyname;
    `;

    const { data, error } = await this.supabase.rpc('exec_sql', { query: policiesQuery });

    if (error) throw error;

    writeFileSync(
      join(backupPath, 'rls_policies.json'),
      JSON.stringify({ policies: data }, null, 2)
    );
  }

  private async createManifest(backupPath: string, timestamp: string): Promise<void> {
    const manifest = {
      backup_id: timestamp,
      created_at: new Date().toISOString(),
      supabase_url: this.config.supabaseUrl,
      version: '1.0.0',
      tables_backed_up: this.config.tablesToBackup,
      exclude_tables: this.config.excludeTables,
      retention_days: this.config.retentionDays,
      size: await this.calculateBackupSize(backupPath),
    };

    writeFileSync(
      join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  private async calculateBackupSize(backupPath: string): Promise<number> {
    const { stdout } = await execAsync(`du -sb ${backupPath} | cut -f1`);
    return parseInt(stdout.trim());
  }

  private async cleanupOldBackups(): Promise<void> {
    console.log('Cleaning up old backups...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    try {
      const { stdout } = await execAsync(`find ${this.config.backupDir} -name "backup-*" -type d`);
      const backups = stdout.split('\n').filter(Boolean);

      for (const backup of backups) {
        const backupDate = this.extractDateFromBackupPath(backup);
        if (backupDate && backupDate < cutoffDate) {
          await execAsync(`rm -rf ${backup}`);
          console.log(`Removed old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private extractDateFromBackupPath(path: string): Date | null {
    const match = path.match(/backup-(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
    if (match) {
      const [_, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return null;
  }

  async verifyBackup(backupPath: string): Promise<boolean> {
    console.log('Verifying backup...');

    try {
      // Check manifest exists
      const manifestPath = join(backupPath, 'manifest.json');
      if (!existsSync(manifestPath)) {
        throw new Error('Manifest file missing');
      }

      const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf8'));

      // Check all table files exist
      for (const table of manifest.tables_backed_up) {
        const tableFile = join(backupPath, `${table}.json`);
        if (!existsSync(tableFile)) {
          throw new Error(`Table file missing: ${table}`);
        }
      }

      // Verify schema file
      const schemaFile = join(backupPath, 'schema.json');
      if (!existsSync(schemaFile)) {
        throw new Error('Schema file missing');
      }

      console.log('Backup verification successful');
      return true;
    } catch (error) {
      console.error('Backup verification failed:', error);
      return false;
    }
  }
}

// Run backup if script is executed directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.runBackup()
    .then(() => {
      console.log('Backup process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup process failed:', error);
      process.exit(1);
    });
}

export { DatabaseBackup };
