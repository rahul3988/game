#!/bin/bash

# Win5x Setup Script
echo "🎰 Setting up Win5x Casino Game..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check PNPM
if ! command -v pnpm &> /dev/null; then
    print_warning "PNPM is not installed. Installing PNPM..."
    npm install -g pnpm
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not installed. Please install PostgreSQL 13+ manually."
    print_warning "Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    print_warning "macOS: brew install postgresql"
    print_warning "Windows: Download from https://www.postgresql.org/download/"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis is not installed. Please install Redis 6+ manually."
    print_warning "Ubuntu/Debian: sudo apt install redis-server"
    print_warning "macOS: brew install redis"
    print_warning "Windows: Download from https://redis.io/download"
fi

print_status "Prerequisites check completed."

# Install dependencies
print_status "Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies. Please check your package manager setup."
    exit 1
fi

# Setup environment
print_status "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning "Created .env file from template. Please update it with your database credentials."
else
    print_status ".env file already exists."
fi

if [ ! -f packages/backend/.env ]; then
    cp packages/backend/.env.example packages/backend/.env
    print_warning "Created backend .env file from template. Please update it with your credentials."
else
    print_status "Backend .env file already exists."
fi

# Build common package first
print_status "Building shared packages..."
pnpm --filter common build

# Setup database
print_status "Setting up database..."
cd packages/backend

# Generate Prisma client
print_status "Generating Prisma client..."
pnpm db:generate

# Check if database is accessible
print_status "Checking database connection..."
if pnpm exec prisma db push --accept-data-loss; then
    print_status "Database schema updated successfully."
    
    # Seed database
    print_status "Seeding database with initial data..."
    pnpm db:seed
    
    if [ $? -eq 0 ]; then
        print_status "Database seeded successfully."
    else
        print_warning "Database seeding failed. You may need to run 'pnpm db:seed' manually later."
    fi
else
    print_error "Failed to connect to database. Please check your DATABASE_URL in .env file."
    print_warning "Make sure PostgreSQL is running and the database exists."
    cd ..
    exit 1
fi

cd ..

print_status "Setup completed successfully! 🎉"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo "1. Update .env files with your database and Redis URLs"
echo "2. Start all services: ${GREEN}pnpm dev${NC}"
echo "3. Access applications:"
echo "   • User Panel: ${BLUE}http://localhost:3002${NC}"
echo "   • Admin Panel: ${BLUE}http://localhost:3000${NC} (admin/Admin123!)"
echo "   • Backend API: ${BLUE}http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   • README.md - Project overview"
echo "   • DEVELOPMENT_STATUS.md - Feature checklist"
echo "   • DEPLOYMENT_GUIDE.md - Production deployment"
echo ""
echo -e "${GREEN}🎰 Win5x Casino Game is ready to run!${NC}"