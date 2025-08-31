#!/bin/bash

# Win5x Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="/backups/win5x"
LOG_FILE="/var/log/win5x-deploy.log"

print_status "🚀 Starting Win5x deployment for $ENVIRONMENT environment..."

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if required environment variables are set
required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    print_warning "Disk usage is ${DISK_USAGE}%. Consider cleaning up before deployment."
fi

# Check if services are running
if ! pgrep -f "postgres" > /dev/null; then
    print_error "PostgreSQL is not running"
    exit 1
fi

if ! pgrep -f "redis" > /dev/null; then
    print_error "Redis is not running"
    exit 1
fi

print_status "Pre-deployment checks passed ✓"

# Create backup
print_status "Creating database backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/win5x_$(date +%Y%m%d_%H%M%S).sql"

if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    print_status "Database backup created: ${BACKUP_FILE}.gz"
else
    print_warning "pg_dump not found. Skipping database backup."
fi

# Install dependencies
print_status "Installing dependencies..."
pnpm install --frozen-lockfile --prod

# Build all packages
print_status "Building packages..."
pnpm --filter common build
pnpm --filter backend build
pnpm --filter admin build
pnpm --filter user build

# Run tests
if [ "$ENVIRONMENT" != "production" ]; then
    print_status "Running tests..."
    pnpm test
    
    if [ $? -ne 0 ]; then
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
    print_status "All tests passed ✓"
fi

# Database migrations
print_status "Running database migrations..."
cd packages/backend
pnpm db:migrate deploy

if [ $? -ne 0 ]; then
    print_error "Database migration failed. Deployment aborted."
    exit 1
fi

# Generate Prisma client
pnpm db:generate
cd ../..

# Security checks
print_status "Running security checks..."

# Check for sensitive files
if [ -f ".env" ]; then
    print_warning "Found .env file in production. Ensure it contains production values."
fi

# Check file permissions
find . -name "*.sh" -exec chmod +x {} \;

# Start/restart services
print_status "Starting services..."

if command -v pm2 &> /dev/null; then
    # Using PM2 for process management
    pm2 stop win5x-backend || true
    pm2 start packages/backend/dist/server.js --name win5x-backend
    
    pm2 stop win5x-admin || true
    pm2 serve packages/admin/dist --name win5x-admin --port 3000
    
    pm2 stop win5x-user || true
    pm2 serve packages/user/dist --name win5x-user --port 3002
    
    pm2 save
    print_status "Services started with PM2"
else
    print_warning "PM2 not found. Please start services manually:"
    print_warning "Backend: cd packages/backend && npm start"
    print_warning "Admin: serve packages/admin/dist -l 3000"
    print_warning "User: serve packages/user/dist -l 3002"
fi

# Health checks
print_status "Running health checks..."
sleep 5

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend health check passed ✓"
else
    print_error "Backend health check failed ✗"
fi

# Check admin panel
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "Admin panel health check passed ✓"
else
    print_warning "Admin panel health check failed ✗"
fi

# Check user panel
if curl -f http://localhost:3002 > /dev/null 2>&1; then
    print_status "User panel health check passed ✓"
else
    print_warning "User panel health check failed ✗"
fi

# Setup monitoring
print_status "Setting up monitoring..."

# Create log rotation config
cat > /etc/logrotate.d/win5x << EOF
/var/log/win5x/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reload win5x-backend || true
    endscript
}
EOF

# Setup automated backups
cat > /etc/cron.d/win5x-backup << EOF
# Win5x automated backups
0 2 * * * root /opt/win5x/scripts/backup.sh >> /var/log/win5x-backup.log 2>&1
EOF

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true

# Final status
print_status "🎉 Deployment completed successfully!"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "• Environment: $ENVIRONMENT"
echo "• Backend: http://localhost:3001"
echo "• Admin Panel: http://localhost:3000"
echo "• User Panel: http://localhost:3002"
echo "• Database backup: ${BACKUP_FILE}.gz"
echo "• Log file: $LOG_FILE"
echo ""
echo -e "${GREEN}🎰 Win5x is now live!${NC}"

# Log deployment
echo "$(date): Win5x deployed successfully to $ENVIRONMENT" >> "$LOG_FILE"