# Database Migrations

## Manual Execution (Recommended for First Time)

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/nglrobuvqexkyykzgusj/sql/new

2. Run migrations in this order:
   - `001_initial_schema.sql` - Creates all tables
   - `002_add_indexes.sql` - Adds performance indexes
   - `003_rls_policies.sql` - Sets up Row Level Security
   - `004_seed_data.sql` - Adds initial data

3. Copy and paste each file's content into the SQL Editor and click "Run"

## Automated Execution

### Option 1: Node.js Script
```bash
npm run migrate
```

### Option 2: Shell Script
```bash
npm run migrate:sh
# or
./scripts/run-migrations.sh
```

## Migration Files

- `001_initial_schema.sql` - Core database schema (tables, enums, extensions)
- `002_add_indexes.sql` - Performance indexes for queries
- `003_rls_policies.sql` - Row Level Security policies
- `004_seed_data.sql` - Initial seed data (categories, brands, etc.)

## Troubleshooting

If you get "already exists" errors, that's normal - it means those objects are already in your database.

If you get permission errors, make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` not the anon key.

## Verification

After running migrations, verify in Supabase Dashboard:
1. Go to Table Editor - you should see all tables
2. Go to Database → Tables - check table structure
3. Go to Database → Policies - verify RLS policies are active
