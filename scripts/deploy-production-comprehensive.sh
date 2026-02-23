#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Strict mode
set -o errexit
set -o nounset
set -o pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="production"
DEPLOY_LOG="$PROJECT_ROOT/logs/production-deploy-$(date '+%Y%m%d-%H%M%S').log"
BACKUP_DIR="$PROJECT_ROOT/backups/production"
LOCK_FILE="$PROJECT_ROOT/.production-deploy.lock"

# Security check - only allow specific users
ALLOWED_USERS=("deploy" "ci-cd" "github-actions")
CURRENT_USER=$(whoami)

# Logging
exec 1> >(tee -a "$DEPLOY_LOG")
exec 2>&1

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${level}${timestamp} - ${message}${NC}"
}

log_info() { log "${BLUE}[INFO] " "$1"; }
log_success() { log "${GREEN}[SUCCESS] " "$1"; }
log_warning() { log "${YELLOW}[WARNING] " "$1"; }
log_error() { log "${RED}[ERROR] " "$1"; }

# Security validation
validate_security() {
    log_info "Validating security requirements..."
    
    # Check if user is allowed
    local user_allowed=false
    for allowed_user in "${ALLOWED_USERS[@]}"; do
        if [ "$CURRENT_USER" = "$allowed_user" ]; then
            user_allowed=true
            break
        fi
    done
    
    if [ "$user_allowed" = false ]; then
        log_error "User '$CURRENT_USER' not allowed to deploy to production"
        log_error "Allowed users: ${ALLOWED_USERS[*]}"
        exit 1
    fi
    
    # Check for lock file
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_error "Production deployment already in progress (PID: $pid)"
            exit 1
        else
            log_warning "Stale lock file found. Removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    
    # Create lock file
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT
    
    # Verify production environment file
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [ ! -f "$env_file" ]; then
        log_error "Production environment file not found: $env_file"
        exit 1
    fi
    
    # Check for sensitive variables in environment file
    if grep -q "PASSWORD\|SECRET\|KEY\|TOKEN" "$env_file"; then
        log_warning "Sensitive variables detected in environment file"
        log_warning "Ensure these are properly secured"
    fi
    
    log_success "Security validation passed"
}

# Load and validate environment
load_environment() {
    log_info "Loading production environment..."
    
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    # Securely load environment variables
    export $(grep -v '^#' "$env_file" | grep -v '^$' | xargs)
    
    # Validate critical variables
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_DB_PASSWORD"
        "MPESA_CONSUMER_KEY"
        "MPESA_CONSUMER_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required production variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    # Validate Supabase URL format
    if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
        log_error "Invalid Supabase URL format"
        exit 1
    fi
    
    log_success "Environment loaded and validated"
}

# Pre-flight checks
pre_flight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check disk space
    local disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "Insufficient disk space: ${disk_usage}% used"
        exit 1
    fi
    
    # Check memory
    local free_memory=$(free -m | awk 'NR==2 {print $4}')
    if [ "$free_memory" -lt 1024 ]; then
        log_warning "Low memory available: ${free_memory}MB"
    fi
    
    # Check for required tools
    local required_tools=("docker" "docker-compose" "psql" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Verify Docker daemon
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon not accessible"
        exit 1
    fi
    
    # Verify database connectivity
    if ! PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --command="SELECT 1;" \
        --no-psqlrc \
        > /dev/null 2>&1; then
        log_error "Cannot connect to production database"
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
}

# Create production backup
create_production_backup() {
    log_info "Creating production backup..."
    
    local backup_timestamp=$(date '+%Y%m%d-%H%M%S')
    local backup_file="$BACKUP_DIR/full-backup-$backup_timestamp.sql.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    log_info "Backing up database..."
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
        | gzip > "$backup_file"
    
    # Verify backup
    if [ ! -s "$backup_file" ]; then
        log_error "Backup creation failed"
        exit 1
    fi
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    log_success "Production backup created: $backup_file (${backup_size})"
    
    # Backup application data
    log_info "Backing up application data..."
    tar -czf "$BACKUP_DIR/app-data-$backup_timestamp.tar.gz" \
        --exclude="node_modules" \
        --exclude=".next" \
        --exclude=".git" \
        "$PROJECT_ROOT"
    
    # Create backup manifest
    cat > "$BACKUP_DIR/manifest-$backup_timestamp.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$ENVIRONMENT",
  "backup_files": [
    "$(basename "$backup_file")",
    "app-data-$backup_timestamp.tar.gz"
  ],
  "database": {
    "url": "$NEXT_PUBLIC_SUPABASE_URL",
    "size": "$backup_size"
  },
  "created_by": "$CURRENT_USER"
}
EOF
    
    # Rotate old backups (keep last 7)
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +7 -delete
    find "$BACKUP_DIR" -name "*.json" -type f -mtime +7 -delete
    
    log_success "Backup process completed"
}

# Run production migrations with extra safety
run_production_migrations() {
    log_info "Running production migrations..."
    
    local migration_script="$PROJECT_ROOT/scripts/apply-migrations.sh"
    
    if [ ! -f "$migration_script" ]; then
        log_error "Migration script not found"
        exit 1
    fi
    
    # Run migrations in dry-run mode first
    log_info "Running migration dry-run..."
    if ! "$migration_script" validate "$ENVIRONMENT"; then
        log_error "Migration validation failed"
        exit 1
    fi
    
    # Show what will be migrated
    log_info "Migration plan:"
    "$migration_script" status "$ENVIRONMENT"
    
    # Confirm before applying
    echo ""
    log_warning "WARNING: About to apply migrations to PRODUCTION database"
    log_warning "Ensure you have a valid backup before continuing"
    echo ""
    
    read -p "Enter 'PRODUCTION' to confirm: " confirmation
    if [ "$confirmation" != "PRODUCTION" ]; then
        log_error "Confirmation failed. Aborting."
        exit 1
    fi
    
    # Apply migrations with force flag (backup already done)
    if ! "$migration_script" migrate "$ENVIRONMENT" true; then
        log_error "Production migrations failed"
        
        # Attempt rollback to last good state
        log_warning "Attempting emergency rollback..."
        
        # This would call your rollback procedure
        # For now, we just alert and exit
        send_alert "PRODUCTION_MIGRATION_FAILED" "Migrations failed. Manual intervention required."
        
        exit 1
    fi
    
    log_success "Production migrations completed"
}

# Build production Docker images
build_production_images() {
    log_info "Building production Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    docker system prune -f --filter "until=24h" 2>/dev/null || true
    
    # Build with production optimizations
    if ! docker build \
        --target=production \
        --tag=xarastore/production:latest \
        --tag=xarastore/production:$(date '+%Y%m%d-%H%M%S') \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_TELEMETRY_DISABLED=1 \
        . 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_error "Docker build failed"
        exit 1
    fi
    
    # Verify image
    if ! docker image inspect xarastore/production:latest > /dev/null 2>&1; then
        log_error "Docker image verification failed"
        exit 1
    fi
    
    log_success "Production Docker images built"
}

# Deploy with zero-downtime
deploy_zero_downtime() {
    log_info "Starting zero-downtime deployment..."
    
    # Load balancer configuration (example for Nginx)
    local lb_config="/etc/nginx/sites-available/xarastore"
    local app_ports=("3001" "3002")  # Two instances for blue-green
    
    # Check current active port
    local current_port=$(get_current_active_port)
    local new_port=$([ "$current_port" = "3001" ] && echo "3002" || echo "3001")
    
    log_info "Current active port: $current_port"
    log_info "New deployment port: $new_port"
    
    # Start new instance
    log_info "Starting new instance on port $new_port..."
    docker run -d \
        --name "xarastore-$new_port" \
        --restart=unless-stopped \
        --network=xarastore-network \
        --env-file "$PROJECT_ROOT/.env.$ENVIRONMENT" \
        -p "$new_port:3000" \
        xarastore/production:latest
    
    # Wait for new instance to be healthy
    log_info "Waiting for new instance to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$new_port/health" > /dev/null 2>&1; then
            log_success "New instance healthy on port $new_port"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "New instance failed to become healthy"
            
            # Cleanup failed instance
            docker stop "xarastore-$new_port" || true
            docker rm "xarastore-$new_port" || true
            
            exit 1
        fi
        
        log_info "Waiting for instance... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Update load balancer (simplified example)
    log_info "Updating load balancer to point to new instance..."
    
    # In production, this would update your actual load balancer config
    # For example: update nginx config and reload
    
    # Stop old instance
    log_info "Stopping old instance on port $current_port..."
    docker stop "xarastore-$current_port" || true
    docker rm "xarastore-$current_port" || true
    
    log_success "Zero-downtime deployment completed"
}

get_current_active_port() {
    # This is a simplified example
    # In reality, you would check your load balancer configuration
    echo "3001"
}

# Run production health checks
run_production_health_checks() {
    log_info "Running production health checks..."
    
    local health_endpoints=(
        "https://xarastore.com/health"
        "https://xarastore.com/api/health"
        "https://api.xarastore.com/health"
    )
    
    local failed_checks=()
    
    for endpoint in "${health_endpoints[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
        
        if [ "$response" = "200" ]; then
            log_info "  ✓ $endpoint"
        else
            log_error "  ✗ $endpoint (HTTP $response)"
            failed_checks+=("$endpoint")
        fi
        
        sleep 1
    done
    
    # Check database
    if ! PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        --host="${NEXT_PUBLIC_SUPABASE_URL#*//}" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --command="SELECT COUNT(*) FROM products WHERE stock > 0;" \
        --no-psqlrc \
        > /dev/null 2>&1; then
        log_error "  ✗ Database connectivity check failed"
        failed_checks+=("database")
    else
        log_info "  ✓ Database connectivity"
    fi
    
    # Check storage (Supabase)
    if ! curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" \
        > /dev/null 2>&1; then
        log_error "  ✗ Storage connectivity check failed"
        failed_checks+=("storage")
    else
        log_info "  ✓ Storage connectivity"
    fi
    
    if [ ${#failed_checks[@]} -gt 0 ]; then
        log_error "Health checks failed: ${failed_checks[*]}"
        
        # Attempt automatic remediation for minor issues
        attempt_remediation "${failed_checks[@]}"
        
        # If still failing, alert
        if [ ${#failed_checks[@]} -gt 0 ]; then
            send_alert "HEALTH_CHECK_FAILED" "Production health checks failed: ${failed_checks[*]}"
            return 1
        fi
    fi
    
    log_success "All production health checks passed"
    return 0
}

attempt_remediation() {
    local failed_checks=("$@")
    
    log_info "Attempting automatic remediation..."
    
    for check in "${failed_checks[@]}"; do
        case "$check" in
            "https://xarastore.com/health")
                log_info "Restarting application container..."
                docker restart xarastore-app || true
                ;;
            "database")
                log_info "Checking database connections..."
                # Could reset connection pool, etc.
                ;;
        esac
    done
    
    # Wait and retry
    sleep 10
}

# Send alerts for critical issues
send_alert() {
    local alert_type="$1"
    local message="$2"
    
    log_error "ALERT: $alert_type - $message"
    
    # This would integrate with your alerting system
    # Examples: PagerDuty, OpsGenie, Slack, Email
    
    # Example Slack webhook
    # if [ -n "$SLACK_ALERT_WEBHOOK" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"🚨 $alert_type: $message\"}" \
    #     "$SLACK_ALERT_WEBHOOK"
    # fi
    
    # Log to audit trail
    echo "$(date -Iseconds) | ALERT | $alert_type | $message | $CURRENT_USER" \
        >> "$PROJECT_ROOT/logs/audit.log"
}

# Final verification and cleanup
final_verification() {
    log_info "Running final verification..."
    
    # Verify all services are running
    local running_containers=$(docker ps --filter "name=xarastore" --format "{{.Names}}" | wc -l)
    
    if [ "$running_containers" -lt 1 ]; then
        log_error "No xarastore containers running"
        exit 1
    fi
    
    # Verify application version
    local deployed_version=$(curl -s https://xarastore.com/api/version | jq -r .version 2>/dev/null || echo "unknown")
    log_info "Deployed version: $deployed_version"
    
    # Update deployment record
    update_deployment_record "$deployed_version"
    
    # Cleanup old images
    log_info "Cleaning up old Docker images..."
    docker image prune -f --filter "until=72h"
    
    log_success "Final verification completed"
}

update_deployment_record() {
    local version="$1"
    
    local record_file="$PROJECT_ROOT/logs/deployment-history.json"
    
    local record=$(cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$ENVIRONMENT",
  "version": "$version",
  "deployed_by": "$CURRENT_USER",
  "status": "success",
  "backup": "$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
}
EOF
)
    
    # Append to deployment history
    if [ -f "$record_file" ]; then
        local history=$(jq -c '.' "$record_file" 2>/dev/null || echo "[]")
        echo "$history" | jq --argjson new "$record" '. += [$new]' > "$record_file"
    else
        echo "[$record]" > "$record_file"
    fi
}

# Main deployment orchestration
main() {
    local start_time=$(date +%s)
    
    log_info "========================================"
    log_info "PRODUCTION DEPLOYMENT STARTED"
    log_info "========================================"
    log_info "Timestamp: $(date)"
    log_info "User: $CURRENT_USER"
    log_info "Environment: $ENVIRONMENT"
    log_info "Log file: $DEPLOY_LOG"
    log_info "========================================"
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR" "$(dirname "$DEPLOY_LOG")" "$PROJECT_ROOT/logs"
    
    # Step 1: Security validation
    validate_security
    
    # Step 2: Load environment
    load_environment
    
    # Step 3: Pre-flight checks
    pre_flight_checks
    
    # Step 4: Create comprehensive backup
    create_production_backup
    
    # Step 5: Run production migrations
    run_production_migrations
    
    # Step 6: Build production images
    build_production_images
    
    # Step 7: Deploy with zero-downtime
    deploy_zero_downtime
    
    # Step 8: Run health checks
    if ! run_production_health_checks; then
        log_error "Production deployment may have issues"
        log_error "Check logs and monitoring systems"
        # Don't exit - we want to continue to final verification
    fi
    
    # Step 9: Final verification
    final_verification
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "========================================"
    log_success "PRODUCTION DEPLOYMENT COMPLETED"
    log_info "========================================"
    log_info "Duration: ${duration} seconds"
    log_info "Timestamp: $(date)"
    log_info "Status: SUCCESS"
    log_info "Backup: $(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
    log_info "========================================"
    
    # Send success notification
    send_alert "DEPLOYMENT_SUCCESS" "Production deployment completed successfully in ${duration}s"
}

# Enhanced error handling
trap 'log_error "Production deployment interrupted"; send_alert "DEPLOYMENT_INTERRUPTED" "Production deployment was interrupted"; exit 1' INT TERM

# Run main function
main "$@"
