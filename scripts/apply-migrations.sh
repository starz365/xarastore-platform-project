#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
SCHEMAS_DIR="$PROJECT_ROOT/supabase/schemas"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/logs"
LOCK_FILE="$PROJECT_ROOT/.migration-lock"

# Ensure required directories exist
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check for required tools
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for psql
    if ! command -v psql &> /dev/null; then
        missing_deps+=("PostgreSQL client (psql)")
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq (JSON processor)")
    fi
    
    # Check for supabase CLI
    if ! command -v supabase &> /dev/null; then
        log_warning "Supabase CLI not found. Some features may be limited."
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Install missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies available"
}

# Load environment configuration
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$1"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    log_info "Loading environment: $1"
    
    # Load environment variables
    export $(grep -v '^#' "$env_file" | xargs)
    
    # Validate required variables
    validate_environment_variables
}

validate_environment_variables() {
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "SUPABASE_DB_PASSWORD"
        "SUPABASE_PROJECT_ID"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    log_success "Environment variables validated"
}

# Acquire migration lock
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_error "Migration is already running (PID: $pid)"
            exit 1
        else
            log_warning "Stale lock file found. Removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
    log_info "Acquired migration lock"
}

# Release migration lock
release_lock() {
    rm -f "$LOCK_FILE"
    log_info "Released migration lock"
}

# Backup database before migration
backup_database() {
    local backup_file="$BACKUP_DIR/backup-$(date '+%Y%m%d-%H%M%S').sql"
    local backup_log="$LOG_DIR/backup-$(date '+%Y%m%d-%H%M%S').log"
    
    log_info "Creating database backup..."
    
    # Create backup using pg_dump
    PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --clean \
        --if-exists \
        --format=plain \
        --no-owner \
        --no-privileges \
        --exclude-table-data='_prisma_migrations' \
        --exclude-table-data='migration_log' \
        --exclude-table-data='audit_log' \
        --file="$backup_file" \
        2>"$backup_log" || {
            log_error "Backup failed. Check log: $backup_log"
            return 1
        }
    
    # Compress backup
    gzip -f "$backup_file"
    
    log_success "Backup created: ${backup_file}.gz"
    
    # Cleanup old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +7 -delete
}

# Validate SQL files
validate_sql_files() {
    log_info "Validating SQL files..."
    
    local invalid_files=()
    
    for sql_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$sql_file" ]; then
            # Check for destructive operations
            if grep -q -i "DROP TABLE\|DROP SCHEMA\|TRUNCATE\|DELETE FROM" "$sql_file"; then
                log_warning "Potentially destructive operation found in: $(basename "$sql_file")"
                echo "  Lines containing destructive operations:"
                grep -n -i "DROP TABLE\|DROP SCHEMA\|TRUNCATE\|DELETE FROM" "$sql_file"
                echo ""
            fi
            
            # Validate SQL syntax (basic check)
            if ! PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
                --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
                --port=5432 \
                --username=postgres \
                --dbname=postgres \
                --command="\q" \
                --file="$sql_file" \
                --set ON_ERROR_STOP=1 \
                --no-psqlrc \
                >/dev/null 2>&1; then
                invalid_files+=("$(basename "$sql_file")")
            fi
        fi
    done
    
    if [ ${#invalid_files[@]} -gt 0 ]; then
        log_error "Invalid SQL files found:"
        for file in "${invalid_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
    
    log_success "SQL files validated"
}

# Check for applied migrations
check_applied_migrations() {
    log_info "Checking applied migrations..."
    
    # Create migration log table if it doesn't exist
    local create_log_table=$(cat <<-SQL
        CREATE TABLE IF NOT EXISTS migration_log (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR(64) NOT NULL,
            status VARCHAR(20) NOT NULL,
            execution_time INTERVAL,
            error_message TEXT
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_migration_name 
        ON migration_log (migration_name);
        
        CREATE TABLE IF NOT EXISTS migration_history (
            id SERIAL PRIMARY KEY,
            migration_file VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            environment VARCHAR(50) NOT NULL,
            applied_by VARCHAR(100) NOT NULL
        );
    SQL
    )
    
    echo "$create_log_table" | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --quiet \
        --no-psqlrc
    
    log_success "Migration tracking tables ready"
}

# Apply a single migration
apply_migration() {
    local migration_file="$1"
    local migration_name="$(basename "$migration_file")"
    local checksum="$(sha256sum "$migration_file" | cut -d' ' -f1)"
    local start_time=$(date +%s)
    local log_file="$LOG_DIR/migration-$(date '+%Y%m%d-%H%M%S').log"
    
    log_info "Applying migration: $migration_name"
    
    # Check if already applied
    local already_applied=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --quiet \
        --no-psqlrc \
        --tuples-only \
        --command="SELECT COUNT(*) FROM migration_log WHERE migration_name = '$migration_name' AND checksum = '$checksum' AND status = 'success';")
    
    if [ "$already_applied" -eq 1 ]; then
        log_success "Migration already applied: $migration_name"
        return 0
    fi
    
    # Log migration start
    local start_log=$(cat <<-SQL
        INSERT INTO migration_log (migration_name, checksum, status, applied_at)
        VALUES ('$migration_name', '$checksum', 'started', NOW())
        ON CONFLICT (migration_name) 
        DO UPDATE SET 
            checksum = EXCLUDED.checksum,
            status = EXCLUDED.status,
            applied_at = EXCLUDED.applied_at,
            error_message = NULL;
    SQL
    )
    
    echo "$start_log" | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --quiet \
        --no-psqlrc
    
    # Apply migration
    if PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --file="$migration_file" \
        --set ON_ERROR_STOP=1 \
        --no-psqlrc \
        >>"$log_file" 2>&1; then
        
        local end_time=$(date +%s)
        local execution_time=$((end_time - start_time))
        
        # Log success
        local success_log=$(cat <<-SQL
            UPDATE migration_log 
            SET status = 'success',
                execution_time = '$execution_time seconds'::interval,
                applied_at = NOW()
            WHERE migration_name = '$migration_name';
            
            INSERT INTO migration_history (migration_file, environment, applied_by)
            VALUES ('$migration_name', '$ENVIRONMENT', '$USER');
        SQL
        )
        
        echo "$success_log" | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
            --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
            --port=5432 \
            --username=postgres \
            --dbname=postgres \
            --quiet \
            --no-psqlrc
        
        log_success "Migration applied successfully: $migration_name (${execution_time}s)"
        
        # Validate migration
        validate_migration "$migration_file"
        
    else
        local error_message="$(tail -20 "$log_file" | tr '\n' ' ')"
        
        # Log failure
        local error_log=$(cat <<-SQL
            UPDATE migration_log 
            SET status = 'failed',
                error_message = '$error_message',
                applied_at = NOW()
            WHERE migration_name = '$migration_name';
        SQL
        )
        
        echo "$error_log" | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
            --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
            --port=5432 \
            --username=postgres \
            --dbname=postgres \
            --quiet \
            --no-psqlrc
        
        log_error "Migration failed: $migration_name"
        log_error "Check log file: $log_file"
        return 1
    fi
}

# Validate migration results
validate_migration() {
    local migration_file="$1"
    local validation_log="$LOG_DIR/validation-$(date '+%Y%m%d-%H%M%S').log"
    
    log_info "Validating migration results..."
    
    # Run validation queries based on migration type
    if [[ "$migration_file" == *"schema"* ]]; then
        # Schema validation
        PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
            --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
            --port=5432 \
            --username=postgres \
            --dbname=postgres \
            --command="
                SELECT 
                    schemaname,
                    tablename,
                    tableowner
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY schemaname, tablename;
            " \
            --no-psqlrc \
            >>"$validation_log" 2>&1
    fi
    
    # Check for any errors
    if [ $? -eq 0 ]; then
        log_success "Migration validation passed"
    else
        log_warning "Migration validation warnings - check log: $validation_log"
    fi
}

# Run health check after migrations
run_health_check() {
    log_info "Running health checks..."
    
    local health_log="$LOG_DIR/health-check-$(date '+%Y%m%d-%H%M%S').log"
    
    # Check database connectivity
    if ! PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --command="SELECT 1;" \
        --no-psqlrc \
        >>"$health_log" 2>&1; then
        log_error "Health check failed: Database connectivity"
        return 1
    fi
    
    # Check critical tables
    local critical_tables=("products" "users" "orders" "categories")
    for table in "${critical_tables[@]}"; do
        local count=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
            --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
            --port=5432 \
            --username=postgres \
            --dbname=postgres \
            --quiet \
            --tuples-only \
            --command="SELECT COUNT(*) FROM $table;" \
            --no-psqlrc)
        
        if [ $? -ne 0 ]; then
            log_error "Health check failed: Table $table not accessible"
            return 1
        fi
        
        log_info "  Table $table: $count rows"
    done
    
    # Check RLS policies
    local rls_count=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --quiet \
        --tuples-only \
        --command="
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE schemaname = 'public';
        " \
        --no-psqlrc)
    
    log_info "  RLS Policies: $rls_count active"
    
    log_success "Health checks passed"
    return 0
}

# Main migration function
run_migrations() {
    local environment="$1"
    local force="${2:-false}"
    
    # Set environment
    export ENVIRONMENT="$environment"
    
    log_info "Starting migrations for environment: $environment"
    log_info "Project Root: $PROJECT_ROOT"
    
    # Load environment
    load_environment "$environment"
    
    # Check dependencies
    check_dependencies
    
    # Acquire lock
    acquire_lock
    
    # Trap to ensure lock is released
    trap 'release_lock; exit' INT TERM EXIT
    
    # Backup database
    if [ "$force" != "true" ]; then
        backup_database || {
            log_error "Backup failed. Aborting migrations."
            release_lock
            exit 1
        }
    else
        log_warning "Force mode enabled - skipping backup"
    fi
    
    # Validate SQL files
    validate_sql_files || {
        log_error "SQL validation failed. Aborting migrations."
        release_lock
        exit 1
    }
    
    # Check migration tracking
    check_applied_migrations
    
    # Apply migrations
    local migration_files=($(find "$MIGRATIONS_DIR" -name "*.sql" | sort))
    local failed_migrations=()
    
    for migration_file in "${migration_files[@]}"; do
        apply_migration "$migration_file" || {
            failed_migrations+=("$(basename "$migration_file")")
            
            if [ "$force" != "true" ]; then
                log_error "Migration failed. Stopping."
                break
            else
                log_warning "Force mode - continuing despite failure"
            fi
        }
        
        # Small delay between migrations
        sleep 1
    done
    
    # Check for failures
    if [ ${#failed_migrations[@]} -gt 0 ]; then
        log_error "Failed migrations:"
        for migration in "${failed_migrations[@]}"; do
            echo "  - $migration"
        done
        
        if [ "$force" != "true" ]; then
            log_error "Migrations partially applied. Check logs and restore backup if needed."
            release_lock
            exit 1
        fi
    fi
    
    # Run health check
    run_health_check || {
        log_error "Health check failed after migrations"
        if [ "$force" != "true" ]; then
            release_lock
            exit 1
        fi
    }
    
    # Generate migration report
    generate_migration_report
    
    log_success "Migrations completed successfully for $environment"
    
    # Release lock
    release_lock
}

# Generate migration report
generate_migration_report() {
    local report_file="$LOG_DIR/migration-report-$(date '+%Y%m%d-%H%M%S').json"
    
    log_info "Generating migration report..."
    
    # Get migration statistics
    local report_json=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --quiet \
        --tuples-only \
        --no-psqlrc \
        --command="
            SELECT json_build_object(
                'environment', '$ENVIRONMENT',
                'timestamp', NOW(),
                'migration_count', COUNT(*),
                'successful_migrations', COUNT(*) FILTER (WHERE status = 'success'),
                'failed_migrations', COUNT(*) FILTER (WHERE status = 'failed'),
                'pending_migrations', COUNT(*) FILTER (WHERE status = 'started'),
                'last_migration', MAX(applied_at),
                'migration_details', json_agg(
                    json_build_object(
                        'name', migration_name,
                        'status', status,
                        'applied_at', applied_at,
                        'execution_time', execution_time
                    ) ORDER BY applied_at DESC
                )
            )
            FROM migration_log;
        ")
    
    echo "$report_json" | jq '.' > "$report_file"
    
    log_success "Migration report generated: $report_file"
    
    # Print summary
    echo ""
    echo "========================================"
    echo "MIGRATION SUMMARY"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Total Migrations: $(echo "$report_json" | jq -r '.migration_count')"
    echo "Successful: $(echo "$report_json" | jq -r '.successful_migrations')"
    echo "Failed: $(echo "$report_json" | jq -r '.failed_migrations')"
    echo "Last Migration: $(echo "$report_json" | jq -r '.last_migration')"
    echo "========================================"
}

# Rollback function (emergency use only)
rollback_migration() {
    local environment="$1"
    local migration_name="$2"
    
    log_warning "WARNING: This will attempt to rollback migration: $migration_name"
    log_warning "This is a destructive operation and should only be used in emergencies."
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    load_environment "$environment"
    
    # Check if rollback script exists
    local rollback_file="$MIGRATIONS_DIR/rollback/${migration_name%.sql}_rollback.sql"
    
    if [ ! -f "$rollback_file" ]; then
        log_error "Rollback script not found: $rollback_file"
        log_error "Manual rollback required"
        exit 1
    fi
    
    log_info "Executing rollback: $migration_name"
    
    # Backup before rollback
    backup_database || {
        log_error "Backup failed. Aborting rollback."
        exit 1
    }
    
    # Apply rollback
    if PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --file="$rollback_file" \
        --set ON_ERROR_STOP=1 \
        --no-psqlrc; then
        
        # Update migration log
        local rollback_log=$(cat <<-SQL
            UPDATE migration_log 
            SET status = 'rolled_back',
                applied_at = NOW()
            WHERE migration_name = '$migration_name';
        SQL
        )
        
        echo "$rollback_log" | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
            --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
            --port=5432 \
            --username=postgres \
            --dbname=postgres \
            --quiet \
            --no-psqlrc
        
        log_success "Rollback completed: $migration_name"
        
        # Run health check
        run_health_check || {
            log_error "Health check failed after rollback"
            exit 1
        }
    else
        log_error "Rollback failed: $migration_name"
        exit 1
    fi
}

# Show migration status
show_migration_status() {
    local environment="$1"
    
    load_environment "$environment"
    
    log_info "Migration status for environment: $environment"
    
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --command="
            SELECT 
                migration_name,
                status,
                applied_at,
                execution_time,
                error_message
            FROM migration_log
            ORDER BY applied_at DESC
            LIMIT 10;
        " \
        --no-psqlrc
}

# Main script
main() {
    local command="${1:-help}"
    
    case "$command" in
        "migrate")
            local environment="${2:-development}"
            local force="${3:-false}"
            run_migrations "$environment" "$force"
            ;;
        "rollback")
            local environment="${2:-development}"
            local migration_name="${3:-}"
            if [ -z "$migration_name" ]; then
                log_error "Migration name required for rollback"
                exit 1
            fi
            rollback_migration "$environment" "$migration_name"
            ;;
        "status")
            local environment="${2:-development}"
            show_migration_status "$environment"
            ;;
        "validate")
            local environment="${2:-development}"
            load_environment "$environment"
            validate_sql_files
            ;;
        "health")
            local environment="${2:-development}"
            load_environment "$environment"
            run_health_check
            ;;
        "backup")
            local environment="${2:-development}"
            load_environment "$environment"
            backup_database
            ;;
        "help"|*)
            echo "Usage: $0 <command> [environment] [options]"
            echo ""
            echo "Commands:"
            echo "  migrate [environment] [force]    Apply migrations (force=true to skip backup)"
            echo "  rollback [environment] [name]    Rollback specific migration (emergency)"
            echo "  status [environment]             Show migration status"
            echo "  validate [environment]           Validate SQL files"
            echo "  health [environment]             Run health checks"
            echo "  backup [environment]             Create database backup"
            echo "  help                             Show this help"
            echo ""
            echo "Environments: development, staging, production"
            echo ""
            echo "Examples:"
            echo "  $0 migrate development"
            echo "  $0 migrate production true"
            echo "  $0 status production"
            echo "  $0 rollback production 001_initial.sql"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
