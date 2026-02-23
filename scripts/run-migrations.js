#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Parse URL
const urlParts = new URL(supabaseUrl);
const projectRef = urlParts.hostname.split('.')[0];

console.log('🚀 Supabase Migration Runner');
console.log('📦 Project:', projectRef);
console.log('🔗 URL:', supabaseUrl);
console.log('');

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: urlParts.hostname,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, body });
        } else {
          resolve({ success: false, error: body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runMigration(filePath) {
  const filename = path.basename(filePath);
  console.log(`📄 Running: ${filename}`);
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    // For initial approach, try running the whole file
    const result = await executeSql(sql);
    
    if (result.success) {
      console.log(`✅ Success: ${filename}\n`);
      return true;
    } else {
      // If whole file fails, try statement by statement
      console.log(`⚠️  Trying statement-by-statement for: ${filename}`);
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        const stmtResult = await executeSql(stmt);
        
        if (stmtResult.success || 
            (stmtResult.error && stmtResult.error.includes('already exists'))) {
          successCount++;
        } else {
          errorCount++;
          console.log(`   ❌ Statement ${i + 1} failed:`, stmtResult.error?.substring(0, 100));
        }
      }

      console.log(`   ✅ ${successCount} statements succeeded`);
      if (errorCount > 0) {
        console.log(`   ⚠️  ${errorCount} statements failed (may be ok if objects already exist)\n`);
      }
      
      return errorCount === 0;
    }
  } catch (error) {
    console.log(`❌ Error: ${filename}`);
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, '../lib/supabase/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No migration files found');
    return;
  }

  console.log(`📚 Found ${files.length} migration file(s)\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const success = await runMigration(filePath);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`✅ Completed: ${successCount} succeeded, ${failCount} failed`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. This may be ok if objects already exist.');
    console.log('   Check the Supabase dashboard to verify your schema.');
  }
}

// Run migrations
runAllMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
