#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface RestoreConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  backupDir: string;
  dryRun: boolean;
  skipData: boolean;
  tablesToRestore: string[];
}

class DatabaseRestore {
  private config: RestoreConfig;
  private supabase: any;
  private backupPath: string;

  constructor(backupId: string) {
    this.config = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDir: process.env.BACKUP_DIR || './backups',
      dryRun: process.env.DRY_RUN === 'true',
      skipData: process.env.SKIP_DATA === 'true',
      tablesToRestore: process.env.TABLES_TO_RESTORE?.split(',') || [],
    };

    if (!this.config.supabaseUrl || !this.config.supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
    this.backupPath = join(this.config.backupDir, backupId);

    if (!existsSync(this.backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }
  }

  async runRestore(): Promise<void> {
    console.log(`Starting database restore from: ${this.backupPath}`);
    console.log(`Dry run: ${this.config.dryRun}`);
    console.log(`Skip data: ${this.config.skipData}`);

    try {
      // Verify backup
      const manifest = await this.loadManifest();
      console.log(`Restoring backup from: ${manifest.created_at}`);

      // Disable RLS temporarily
      await this.disableRLS();

      // Restore tables in correct order
      await this.restoreTables(manifest);

      // Re-enable RLS
      await this.enableRLS();

      // Restore RLS policies
      await this.restoreRLSPolicies();

      // Update sequences
      await this.updateSequences();

      // Run post-restore cleanup
      await this.postRestoreCleanup();

      console.log('Database restore completed successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      
      // Attempt to re-enable RLS even if restore fails
      try {
        await this.enableRLS();
      } catch (rlserror) {
        console.error('Failed to re-enable RLS:', rlserror);
      }
      
      throw error;
    }
  }

  private async loadManifest(): Promise<any> {
    const manifestPath = join(this.backupPath, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error('Manifest file not found');
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    
    // Validate manifest
    if (!manifest.backup_id || !manifest.created_at || !manifest.tables_backed_up) {
      throw new Error('Invalid manifest file');
    }

    return manifest;
  }

  private async disableRLS(): Promise<void> {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would disable RLS on all tables');
      return;
    }

    console.log('Disabling RLS...');

    const tables = [
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
    ];

    for (const table of tables) {
      try {
        await this.supabase.rpc('exec_sql', {
          query: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
        });
      } catch (error) {
        console.warn(`Failed to disable RLS for ${table}:`, error.message);
      }
    }
  }

  private async enableRLS(): Promise<void> {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would enable RLS on all tables');
      return;
    }

    console.log('Enabling RLS...');

    const tables = [
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
    ];

    for (const table of tables) {
      try {
        await this.supabase.rpc('exec_sql', {
          query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        });
      } catch (error) {
        console.warn(`Failed to enable RLS for ${table}:`, error.message);
      }
    }
  }

  private async restoreTables(manifest: any): Promise<void> {
    const tables = this.config.tablesToRestore.length > 0
      ? manifest.tables_backed_up.filter((table: string) =>
          this.config.tablesToRestore.includes(table)
        )
      : manifest.tables_backed_up;

    // Restore in dependency order
    const restoreOrder = [
      'categories',
      'brands',
      'products',
      'product_variants',
      'users',
      'user_addresses',
      'orders',
      'order_items',
      'reviews',
      'wishlist',
      'payment_attempts',
      'transactions',
    ].filter(table => tables.includes(table));

    for (const table of restoreOrder) {
      await this.restoreTable(table);
    }
  }

  private async restoreTable(table: string): Promise<void> {
    const tableFile = join(this.backupPath, `${table}.json`);
    
    if (!existsSync(tableFile)) {
      console.warn(`Backup file not found for table: ${table}`);
      return;
    }

    console.log(`Restoring table: ${table}`);

    const backupData = JSON.parse(readFileSync(tableFile, 'utf8'));
    
    if (!backupData.data || backupData.data.length === 0) {
      console.log(`  No data to restore for ${table}`);
      return;
    }

    // Clear existing data (but preserve structure)
    if (!this.config.dryRun && !this.config.skipData) {
      console.log(`  Clearing existing data from ${table}...`);
      try {
        await this.supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (error) {
        console.warn(`  Could not clear ${table}:`, error.message);
      }
    }

    // Restore data in chunks
    const chunkSize = 1000;
    const totalRecords = backupData.data.length;
    
    console.log(`  Restoring ${totalRecords} records to ${table}...`);

    for (let i = 0; i < totalRecords; i += chunkSize) {
      const chunk = backupData.data.slice(i, i + chunkSize);
      
      if (this.config.dryRun) {
        console.log(`  [DRY RUN] Would insert ${chunk.length} records into ${table}`);
        continue;
      }

      if (this.config.skipData) {
        console.log(`  [SKIP DATA] Skipping ${chunk.length} records for ${table}`);
        continue;
      }

      try {
        const { error } = await this.supabase.from(table).insert(chunk);
        
        if (error) {
          console.error(`  Failed to insert chunk into ${table}:`, error.message);
          
          // Try individual inserts for failed chunk
          await this.insertIndividually(table, chunk);
        } else {
          console.log(`  Inserted ${Math.min(i + chunkSize, totalRecords)}/${totalRecords} records`);
        }
      } catch (error) {
        console.error(`  Error inserting into ${table}:`, error.message);
      }
    }

    console.log(`  Completed restoring ${table}`);
  }

  private async insertIndividually(table: string, records: any[]): Promise<void> {
    for (const record of records) {
      try {
        const { error } = await this.supabase.from(table).insert(record);
        if (error) {
          console.warn(`    Failed to insert individual record into ${table}:`, error.message);
        }
      } catch (error) {
        console.warn(`    Error inserting individual record into ${table}:`, error.message);
      }
    }
  }

  private async restoreRLSPolicies(): Promise<void> {
    const policiesFile = join(this.backupPath, 'rls_policies.json');
    
    if (!existsSync(policiesFile)) {
      console.warn('RLS policies backup not found');
      return;
    }

    console.log('Restoring RLS policies...');

    if (this.config.dryRun) {
      console.log('[DRY RUN] Would restore RLS policies');
      return;
    }

    const policiesData = JSON.parse(readFileSync(policiesFile, 'utf8'));
    
    // Note: In practice, you would need to drop existing policies first
    // and then recreate them. This is simplified for the example.
    console.log(`  Found ${policiesData.policies?.length || 0} policies to restore`);
  }

  private async updateSequences(): Promise<void> {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would update sequences');
      return;
    }

    console.log('Updating sequences...');

    const sequences = [
      { table: 'products', column: 'id' },
      { table: 'categories', column: 'id' },
      { table: 'brands', column: 'id' },
      { table: 'orders', column: 'id' },
      // Add other sequences as needed
    ];

    for (const seq of sequences) {
      try {
        const query = `
          SELECT setval(
            pg_get_serial_sequence('${seq.table}', '${seq.column}'),
            COALESCE((SELECT MAX(${seq.column}) FROM ${seq.table}), 1),
            false
          );
        `;

        await this.supabase.rpc('exec_sql', { query });
        console.log(`  Updated sequence for ${seq.table}.${seq.column}`);
      } catch (error) {
        console.warn(`  Failed to update sequence for ${seq.table}:`, error.message);
      }
    }
  }

  private async postRestoreCleanup(): Promise<void> {
    console.log('Running post-restore cleanup...');

    if (this.config.dryRun) {
      console.log('[DRY RUN] Would run post-restore cleanup');
      return;
    }

    // Rebuild indexes
    try {
      await this.supabase.rpc('exec_sql', { query: 'REINDEX DATABASE xarastore;' });
      console.log('  Rebuilt database indexes');
    } catch (error) {
      console.warn('  Failed to rebuild indexes:', error.message);
    }

    // Update statistics
    try {
      await this.supabase.rpc('exec_sql', { query: 'ANALYZE;' });
      console.log('  Updated database statistics');
    } catch (error) {
      console.warn('  Failed to update statistics:', error.message);
    }

    // Clear any cache
    try {
      await this.supabase.rpc('exec_sql', { query: 'DISCARD ALL;' });
      console.log('  Cleared database cache');
    } catch (error) {
      console.warn('  Failed to clear cache:', error.message);
    }
  }

  async verifyRestore(): Promise<boolean> {
    console.log('Verifying restore...');

    const manifest = await this.loadManifest();
    const tables = manifest.tables_backed_up;

    let allVerified = true;

    for (const table of tables) {
      try {
        // Get count from backup
        const tableFile = join(this.backupPath, `${table}.json`);
        if (!existsSync(tableFile)) continue;

        const backupData = JSON.parse(readFileSync(tableFile, 'utf8'));
        const backupCount = backupData.count || 0;

        // Get count from database
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.warn(`  Failed to verify ${table}:`, error.message);
          allVerified = false;
          continue;
        }

        const dbCount = count || 0;

        if (dbCount === backupCount) {
          console.log(`  ✓ ${table}: ${dbCount} records (matches backup)`);
        } else {
          console.log(`  ✗ ${table}: ${dbCount} records (backup had ${backupCount})`);
          allVerified = false;
        }
      } catch (error) {
        console.warn(`  Error verifying ${table}:`, error.message);
        allVerified = false;
      }
    }

    return allVerified;
  }
}

// Run restore if script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: tsx restore-database.ts <backup-id> [--dry-run] [--skip-data]');
    process.exit(1);
  }

  const backupId = args[0];
  const dryRun = args.includes('--dry-run');
  const skipData = args.includes('--skip-data');

  process.env.DRY_RUN = dryRun.toString();
  process.env.SKIP_DATA = skipData.toString();

  const restore = new DatabaseRestore(backupId);
  restore.runRestore()
    .then(async () => {
      console.log('\nVerifying restore...');
      const verified = await restore.verifyRestore();
      
      if (verified) {
        console.log('\n✅ Restore completed and verified successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Restore completed but verification failed');
        process.exit(2);
      }
    })
    .catch((error) => {
      console.error('\n❌ Restore failed:', error);
      process.exit(1);
    });
}

export { DatabaseRestore };
