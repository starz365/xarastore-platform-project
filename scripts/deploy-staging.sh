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
ENVIRONMENT="staging"
DEPLOY_LOG="$PROJECT_ROOT/logs/deploy-$(date '+%Y%m%d-%H%M%S').log"

# Logging functions
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${level}${timestamp} - ${message}${NC}" | tee -a "$DEPLOY_LOG"
}

log_info() { log "${BLUE}[INFO] " "$1"; }
log_success() { log "${GREEN}[SUCCESS] " "$1"; }
log_warning() { log "${YELLOW}[WARNING] " "$1"; }
log_error() { log "${RED}[ERROR] " "$1"; }

# Load environment
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    log_info "Loading $ENVIRONMENT environment"
    export $(grep -v '^#' "$env_file" | xargs)
}

# Validate deployment prerequisites
validate_prerequisites() {
    log_info "Validating deployment prerequisites..."
    
    # Check for required tools
    local required_tools=("docker" "docker-compose" "node" "npm" "git")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check git status
    if [ -d "$PROJECT_ROOT/.git" ]; then
        if ! git -C "$PROJECT_ROOT" diff --quiet; then
            log_warning "There are uncommitted changes in the repository"
            read -p "Continue anyway? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    log_success "Prerequisites validated"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    if ! npm test -- --passWithNoTests 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_error "Unit tests failed"
        return 1
    fi
    
    # Run type checking
    if ! npx tsc --noEmit 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_error "TypeScript compilation failed"
        return 1
    fi
    
    # Run linting
    if ! npm run lint 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_warning "Linting issues found"
    fi
    
    log_success "Tests completed"
    return 0
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    rm -rf "$PROJECT_ROOT/.next" "$PROJECT_ROOT/dist"
    
    # Install dependencies
    if ! npm ci --only=production 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_error "Dependency installation failed"
        return 1
    fi
    
    # Build application
    if ! npm run build 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_error "Build failed"
        return 1
    fi
    
    # Generate sitemap
    if [ -f "$PROJECT_ROOT/scripts/generate-sitemap.ts" ]; then
        log_info "Generating sitemap..."
        npx tsx scripts/generate-sitemap.ts 2>&1 | tee -a "$DEPLOY_LOG"
    fi
    
    log_success "Application built successfully"
    return 0
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    if [ -f "$PROJECT_ROOT/scripts/apply-migrations.sh" ]; then
        if ! "$PROJECT_ROOT/scripts/apply-migrations.sh" migrate "$ENVIRONMENT" 2>&1 | tee -a "$DEPLOY_LOG"; then
            log_error "Database migrations failed"
            return 1
        fi
    else
        log_warning "Migration script not found, skipping migrations"
    fi
    
    log_success "Database migrations completed"
    return 0
}

# Deploy to staging environment
deploy_staging() {
    log_info "Deploying to staging environment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.staging.yml down --remove-orphans 2>&1 | tee -a "$DEPLOY_LOG" || true
    
    # Build Docker images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.staging.yml build 2>&1 | tee -a "$DEPLOY_LOG"
    
    # Start containers
    log_info "Starting containers..."
    docker-compose -f docker-compose.staging.yml up -d 2>&1 | tee -a "$DEPLOY_LOG"
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    log_info "Checking service health..."
    if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_error "Application health check failed"
        docker-compose -f docker-compose.staging.yml logs 2>&1 | tail -50 | tee -a "$DEPLOY_LOG"
        return 1
    fi
    
    log_success "Deployment completed successfully"
    return 0
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local smoke_tests=(
        "http://localhost:8080/"
        "http://localhost:8080/health"
        "http://localhost:8080/api/health"
    )
    
    local failed_tests=()
    
    for url in "${smoke_tests[@]}"; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
            log_info "  ✓ $url"
        else
            log_error "  ✗ $url"
            failed_tests+=("$url")
        fi
        sleep 1
    done
    
    if [ ${#failed_tests[@]} -gt 0 ]; then
        log_error "Smoke tests failed: ${failed_tests[*]}"
        return 1
    fi
    
    log_success "Smoke tests passed"
    return 0
}

# Cleanup old deployments
cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."
    
    # Keep last 5 deployment logs
    find "$PROJECT_ROOT/logs" -name "deploy-*.log" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    # Clean Docker resources
    docker system prune -f --filter "until=72h" 2>&1 | tee -a "$DEPLOY_LOG"
    
    log_success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    log_info "Sending deployment notification..."
    
    # This would integrate with your notification system (Slack, Email, etc.)
    # Example for Slack webhook:
    # if [ -n "$SLACK_WEBHOOK_URL" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"Deployment ${status}: ${message}\"}" \
    #     "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    # fi
    
    log_info "Notification: Deployment $status - $message"
}

# Main deployment process
main() {
    local start_time=$(date +%s)
    
    log_info "Starting $ENVIRONMENT deployment"
    log_info "Deployment log: $DEPLOY_LOG"
    
    # Create logs directory
    mkdir -p "$(dirname "$DEPLOY_LOG")"
    
    # Load environment
    load_environment
    
    # Validate prerequisites
    validate_prerequisites
    
    # Run tests
    if ! run_tests; then
        send_notification "FAILED" "Tests failed"
        exit 1
    fi
    
    # Build application
    if ! build_application; then
        send_notification "FAILED" "Build failed"
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        send_notification "FAILED" "Migrations failed"
        exit 1
    fi
    
    # Deploy to staging
    if ! deploy_staging; then
        send_notification "FAILED" "Deployment failed"
        exit 1
    fi
    
    # Run smoke tests
    if ! run_smoke_tests; then
        send_notification "FAILED" "Smoke tests failed"
        exit 1
    fi
    
    # Cleanup
    cleanup_old_deployments
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Deployment completed successfully in ${duration}s"
    
    # Send success notification
    send_notification "SUCCESS" "Deployed to $ENVIRONMENT in ${duration}s"
    
    # Print deployment information
    echo ""
    echo "========================================"
    echo "DEPLOYMENT COMPLETE"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Duration: ${duration}s"
    echo "Timestamp: $(date)"
    echo "Application URL: http://localhost:8080"
    echo "Health Check: http://localhost:8080/health"
    echo "Log File: $DEPLOY_LOG"
    echo "========================================"
}

# Error handling
trap 'log_error "Deployment interrupted"; send_notification "FAILED" "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
