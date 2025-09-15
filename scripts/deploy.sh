#!/bin/bash

# Avanti Booking System - Advanced Deployment Script
# Supports staging, production, and rollback deployments with comprehensive checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/avanti-deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
Avanti Booking System Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT

ENVIRONMENTS:
    staging     Deploy to staging environment
    production  Deploy to production environment
    rollback    Rollback production to previous version

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose logging
    -d, --dry-run       Show what would be done without executing
    -f, --force         Skip confirmation prompts
    --skip-tests        Skip running tests before deployment
    --skip-build        Skip building the application
    --skip-cache-warm   Skip cache warming after deployment

EXAMPLES:
    $0 staging
    $0 production --verbose
    $0 rollback --force
    $0 staging --dry-run --skip-tests

EOF
}

# Default values
ENVIRONMENT=""
VERBOSE=false
DRY_RUN=false
FORCE=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_CACHE_WARM=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-cache-warm)
            SKIP_CACHE_WARM=true
            shift
            ;;
        staging|production|rollback)
            ENVIRONMENT=$1
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    show_help
    exit 1
fi

# Set verbose mode
if [[ "$VERBOSE" == true ]]; then
    set -x
fi

# Environment-specific configuration
case $ENVIRONMENT in
    staging)
        VERCEL_PROJECT="avanti-staging"
        FIREBASE_PROJECT="avanti-staging"
        DOMAIN="staging.avanti-app.se"
        ;;
    production)
        VERCEL_PROJECT="avanti-production"
        FIREBASE_PROJECT="avanti-production"
        DOMAIN="avanti-app.se"
        ;;
    rollback)
        VERCEL_PROJECT="avanti-production"
        FIREBASE_PROJECT="avanti-production"
        DOMAIN="avanti-app.se"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

log "Starting deployment to $ENVIRONMENT environment"
log "Log file: $LOG_FILE"

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."

    # Check if required tools are installed
    local required_tools=("node" "npm" "firebase" "vercel" "git" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done

    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_node="18.0.0"
    if [[ "$(printf '%s\n' "$required_node" "$node_version" | sort -V | head -n1)" != "$required_node" ]]; then
        log_error "Node.js version $node_version is too old. Required: $required_node+"
        exit 1
    fi

    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi

    # Check if environment variables are set
    if [[ -z "${VERCEL_TOKEN:-}" ]]; then
        log_error "VERCEL_TOKEN environment variable is not set"
        exit 1
    fi

    if [[ -z "${FIREBASE_TOKEN:-}" ]]; then
        log_error "FIREBASE_TOKEN environment variable is not set"
        exit 1
    fi

    # Check git status
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warning "Working directory is not clean. Uncommitted changes detected."
        if [[ "$FORCE" != true ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    # Check current branch for production deployments
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local current_branch=$(git branch --show-current)
        if [[ "$current_branch" != "main" ]]; then
            log_error "Production deployments must be from 'main' branch. Current: $current_branch"
            exit 1
        fi
    fi

    log_success "Pre-flight checks completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run 'npm ci'"
        return
    fi

    cd "$PROJECT_ROOT"
    npm ci --production=false
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests"
        return
    fi

    log "Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run tests"
        return
    fi

    cd "$PROJECT_ROOT"
    
    # Run linting
    log "Running linter..."
    npm run lint
    
    # Run type checking
    log "Running type checking..."
    npm run type-check
    
    # Run unit tests
    log "Running unit tests..."
    npm run test:unit
    
    # Run integration tests for staging/production
    if [[ "$ENVIRONMENT" != "rollback" ]]; then
        log "Running integration tests..."
        npm run test:integration
    fi
    
    log_success "All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warning "Skipping build"
        return
    fi

    log "Building application..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would build application"
        return
    fi

    cd "$PROJECT_ROOT"
    
    # Set environment-specific variables
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    
    # Build the application
    npm run build
    
    # Generate static export if needed
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run export
    fi
    
    log_success "Application built successfully"
}

# Deploy to Vercel
deploy_vercel() {
    log "Deploying to Vercel..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would deploy to Vercel"
        return
    fi

    cd "$PROJECT_ROOT"
    
    local vercel_args="--prod --token $VERCEL_TOKEN"
    
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        vercel_args="--target staging $vercel_args"
    fi
    
    # Deploy to Vercel
    local deployment_url=$(vercel deploy $vercel_args --yes)
    
    # Set custom domain
    if [[ -n "$DOMAIN" ]]; then
        vercel alias set "$deployment_url" "$DOMAIN" --token "$VERCEL_TOKEN"
    fi
    
    log_success "Vercel deployment completed: $DOMAIN"
}

# Deploy Firebase Functions
deploy_firebase() {
    log "Deploying Firebase Functions..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would deploy Firebase Functions"
        return
    fi

    cd "$PROJECT_ROOT"
    
    # Deploy functions
    firebase deploy --only functions --project "$FIREBASE_PROJECT" --token "$FIREBASE_TOKEN"
    
    # Deploy Firestore rules and indexes
    firebase deploy --only firestore --project "$FIREBASE_PROJECT" --token "$FIREBASE_TOKEN"
    
    log_success "Firebase deployment completed"
}

# Run database migrations
run_migrations() {
    if [[ "$ENVIRONMENT" == "rollback" ]]; then
        log "Skipping migrations for rollback"
        return
    fi

    log "Running database migrations..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run database migrations"
        return
    fi

    cd "$PROJECT_ROOT"
    
    # Run Firestore data migrations
    npm run migrate:firestore
    
    log_success "Database migrations completed"
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run health checks"
        return
    fi

    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s "https://$DOMAIN/api/health" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Cache warming
warm_cache() {
    if [[ "$SKIP_CACHE_WARM" == true ]]; then
        log_warning "Skipping cache warming"
        return
    fi

    log "Warming cache..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would warm cache"
        return
    fi

    # Warm up critical endpoints
    local endpoints=(
        "/"
        "/api/health"
        "/booking"
        "/auth"
    )
    
    for endpoint in "${endpoints[@]}"; do
        curl -s "https://$DOMAIN$endpoint" > /dev/null || true
        log "Warmed: $endpoint"
    done
    
    log_success "Cache warming completed"
}

# Rollback function
rollback_deployment() {
    log "Rolling back deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would rollback deployment"
        return
    fi

    cd "$PROJECT_ROOT"
    
    # Rollback Vercel
    vercel rollback --token "$VERCEL_TOKEN" --yes
    
    # Rollback Firebase (restore from backup)
    firebase functions:config:clone --from "$FIREBASE_PROJECT-backup" --to "$FIREBASE_PROJECT"
    firebase deploy --only functions --project "$FIREBASE_PROJECT" --token "$FIREBASE_TOKEN"
    
    log_success "Rollback completed"
}

# Notification function
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" || true
    fi
    
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$DISCORD_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"content\":\"$message\"}" || true
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Clean up temporary files
    rm -f /tmp/avanti-deploy-*.log.old
    
    # Compress and archive log
    gzip "$LOG_FILE" || true
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    local start_time=$(date +%s)
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    try {
        # Confirmation for production
        if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true ]]; then
            echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION!${NC}"
            read -p "Are you sure you want to continue? (yes/no): " -r
            if [[ ! $REPLY =~ ^yes$ ]]; then
                log "Deployment cancelled by user"
                exit 0
            fi
        fi

        # Run deployment steps
        preflight_checks
        install_dependencies
        
        if [[ "$ENVIRONMENT" == "rollback" ]]; then
            rollback_deployment
        else
            run_tests
            build_application
            deploy_vercel
            deploy_firebase
            run_migrations
            health_checks
            warm_cache
        fi
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Deployment to $ENVIRONMENT completed successfully in ${duration}s"
        
        # Send success notification
        send_notification "success" "🚀 Avanti deployment to $ENVIRONMENT completed successfully! (${duration}s)"
        
    } catch {
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_error "Deployment to $ENVIRONMENT failed after ${duration}s"
        
        # Send failure notification
        send_notification "failure" "❌ Avanti deployment to $ENVIRONMENT failed after ${duration}s. Check logs: $LOG_FILE"
        
        exit 1
    }
}

# Error handling
try() {
    "$@"
}

catch() {
    case $? in
        0) ;;  # Success
        *) "$@" ;;  # Error occurred
    esac
}

# Run main function
main "$@"
