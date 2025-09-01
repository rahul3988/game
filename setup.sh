#!/bin/bash

# Win5x Simple Setup Script (Vanilla HTML/CSS/JS)

echo "🎰 Setting up Win5x Casino Game (Vanilla Version)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not detected. Please ensure PostgreSQL 13+ is installed and running."
    print_warning "Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    print_warning "macOS: brew install postgresql"
    print_warning "Windows: Download from https://www.postgresql.org/download/"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis is not detected. Please ensure Redis 6+ is installed and running."
    print_warning "Ubuntu/Debian: sudo apt install redis-server"
    print_warning "macOS: brew install redis"
    print_warning "Windows: Download from https://redis.io/download"
fi

print_status "Prerequisites check completed."

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies."
    exit 1
fi

cd ..

# Setup environment
print_status "Setting up environment..."
if [ ! -f backend/.env ]; then
    print_warning "Backend .env file not found. Please configure your database and Redis URLs in backend/.env"
else
    print_status "Backend .env file exists."
fi

# Setup database
print_status "Setting up database..."
print_warning "Please ensure PostgreSQL is running and create the database manually:"
echo "1. Connect to PostgreSQL: psql -U postgres"
echo "2. Create database: CREATE DATABASE win5x;"
echo "3. Create user: CREATE USER win5x_user WITH PASSWORD 'your_password';"
echo "4. Grant privileges: GRANT ALL PRIVILEGES ON DATABASE win5x TO win5x_user;"
echo "5. Run schema: psql -U win5x_user -d win5x -f database/schema.sql"

read -p "Press Enter after setting up the database..."

# Test database connection
print_status "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" 2>/dev/null; then
    print_status "Database connection successful."
    
    # Run schema
    print_status "Setting up database schema..."
    psql "$DATABASE_URL" -f database/schema.sql
    
    if [ $? -eq 0 ]; then
        print_status "Database schema created successfully."
    else
        print_warning "Database schema setup failed. You may need to run it manually."
    fi
else
    print_warning "Could not connect to database. Please check your DATABASE_URL."
fi

print_status "Setup completed! 🎉"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo "1. Start PostgreSQL and Redis services"
echo "2. Update backend/.env with your database and Redis URLs"
echo "3. Start backend: ${GREEN}cd backend && npm run dev${NC}"
echo "4. Open user panel: ${BLUE}frontend/user/index.html${NC}"
echo "5. Open admin panel: ${BLUE}frontend/admin/index.html${NC}"
echo ""
echo -e "${BLUE}📚 Default Credentials:${NC}"
echo "   • Admin: ${GREEN}admin / Admin123!${NC}"
echo "   • User: ${GREEN}testuser1 / Test123!${NC} (after registration)"
echo ""
echo -e "${GREEN}🎰 Win5x Casino Game is ready to run!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Configure your database connection in backend/.env"
echo "2. Add real QR codes for payment methods in admin panel"
echo "3. Test the complete user flow: register → deposit → bet → win"
echo "4. Monitor admin panel for deposit approvals"