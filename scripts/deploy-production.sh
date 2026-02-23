#!/bin/bash

set -e

echo "🚀 Starting Xarastore Production Deployment"
echo "=========================================="

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✓ Loaded production environment variables"
else
    echo "⚠️  Warning: .env.production not found"
fi

# Check required environment variables
required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

echo "✓ All required environment variables are set"

# Build the application
echo "📦 Building application..."
npm ci --only=production
npm run build

# Run database migrations
echo "🗄️  Running database migrations..."
if [ -f "supabase/migrations.sql" ]; then
    psql $NEXT_PUBLIC_SUPABASE_URL -f supabase/migrations.sql
    echo "✓ Database migrations completed"
else
    echo "⚠️  No migrations file found"
fi

# Generate sitemap
echo "🗺️  Generating sitemap..."
npm run generate:sitemap

# Optimize images
echo "🖼️  Optimizing images..."
npm run optimize:images

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t xarastore:latest .

# Stop and remove existing containers
echo "🔄 Stopping existing containers..."
docker-compose down || true

# Start new containers
echo "🚀 Starting new containers..."
docker-compose up -d

# Run health check
echo "🏥 Running health check..."
sleep 10
if curl -f http://localhost:80/health > /dev/null 2>&1; then
    echo "✅ Deployment successful! Application is healthy."
    
    # Run tests
    echo "🧪 Running tests..."
    npm test -- --passWithNoTests
    
    # Cleanup old images
    echo "🧹 Cleaning up old images..."
    docker image prune -f
    
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Application is running at: https://xarastore.com"
else
    echo "❌ Health check failed. Application may not be running correctly."
    echo "📋 Checking container logs..."
    docker-compose logs app
    exit 1
fi
