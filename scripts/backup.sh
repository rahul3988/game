#!/bin/bash

# Win5x Automated Backup Script

# Configuration
BACKUP_DIR="/backups/win5x"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

print_status "Starting Win5x backup process..."

# Database backup
if [ -n "$DATABASE_URL" ]; then
    print_status "Backing up PostgreSQL database..."
    
    DB_BACKUP_FILE="$BACKUP_DIR/database_$DATE.sql"
    
    if pg_dump "$DATABASE_URL" > "$DB_BACKUP_FILE"; then
        gzip "$DB_BACKUP_FILE"
        print_status "Database backup completed: ${DB_BACKUP_FILE}.gz"
    else
        print_error "Database backup failed"
        exit 1
    fi
else
    print_error "DATABASE_URL not set. Cannot backup database."
    exit 1
fi

# Redis backup (if Redis persistence is enabled)
if command -v redis-cli &> /dev/null && [ -n "$REDIS_URL" ]; then
    print_status "Backing up Redis data..."
    
    REDIS_BACKUP_FILE="$BACKUP_DIR/redis_$DATE.rdb"
    
    # Save Redis snapshot
    redis-cli BGSAVE
    sleep 5
    
    # Copy the dump file
    if [ -f /var/lib/redis/dump.rdb ]; then
        cp /var/lib/redis/dump.rdb "$REDIS_BACKUP_FILE"
        gzip "$REDIS_BACKUP_FILE"
        print_status "Redis backup completed: ${REDIS_BACKUP_FILE}.gz"
    else
        print_status "Redis dump file not found, skipping Redis backup"
    fi
fi

# Application files backup
print_status "Backing up application files..."
APP_BACKUP_FILE="$BACKUP_DIR/application_$DATE.tar"

tar -czf "${APP_BACKUP_FILE}.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=logs \
    --exclude=coverage \
    .

print_status "Application backup completed: ${APP_BACKUP_FILE}.gz"

# Cleanup old backups
print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
print_status "Cleanup completed"

# Backup verification
print_status "Verifying backups..."
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*$DATE*.gz" | wc -l)

if [ "$BACKUP_COUNT" -gt 0 ]; then
    print_status "✅ Backup verification passed. $BACKUP_COUNT files created."
    
    # Log backup success
    echo "$(date): Win5x backup completed successfully. Files: $BACKUP_COUNT" >> /var/log/win5x-backup.log
    
    # Optional: Upload to cloud storage
    # aws s3 cp "$BACKUP_DIR" s3://your-backup-bucket/win5x/ --recursive --exclude "*" --include "*$DATE*.gz"
    
else
    print_error "❌ Backup verification failed. No backup files created."
    exit 1
fi

print_status "🎉 Win5x backup process completed successfully!"

# Display backup summary
echo ""
echo "📊 Backup Summary:"
echo "• Date: $(date)"
echo "• Location: $BACKUP_DIR"
echo "• Files created: $BACKUP_COUNT"
echo "• Retention: $RETENTION_DAYS days"
echo "• Total backup size: $(du -sh $BACKUP_DIR | cut -f1)"