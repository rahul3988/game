# Win5x Deployment Guide

## 🚀 Quick Start Development Setup

### Prerequisites
- **Node.js** 18+ 
- **PNPM** 8+
- **PostgreSQL** 13+
- **Redis** 6+

### 1. Clone and Install
```bash
git clone <repository-url>
cd win5x-monorepo
pnpm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your database credentials
nano .env
```

### 3. Database Setup
```bash
cd packages/backend

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

### 4. Start Development Servers
```bash
# From root - starts all services
pnpm dev

# Or individually:
pnpm dev:backend   # API + Game Engine (port 3001)
pnpm dev:admin     # Admin Panel (port 3000) 
pnpm dev:user      # User Panel (port 3002)
```

### 5. Access Applications
- **User Panel**: http://localhost:3002
- **Admin Panel**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 6. Default Login Credentials
**Admin Panel:**
- Username: `admin`
- Password: `Admin123!`

**User Panel (Demo Users):**
- Username: `testuser1` / Password: `Test123!`
- Username: `testuser2` / Password: `Test123!`
- Username: `testuser3` / Password: `Test123!`

---

## 🏗️ Production Deployment

### Docker Deployment (Recommended)

#### 1. Create Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: win5x
      POSTGRES_USER: win5x_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: 
      context: .
      dockerfile: packages/backend/Dockerfile
    environment:
      - DATABASE_URL=postgresql://win5x_user:${DB_PASSWORD}@postgres:5432/win5x
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - NODE_ENV=production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: packages/admin/Dockerfile
    environment:
      - VITE_API_URL=https://api.yourdomain.com
    ports:
      - "3000:3000"
    restart: unless-stopped

  user:
    build:
      context: .
      dockerfile: packages/user/Dockerfile
    environment:
      - VITE_API_URL=https://api.yourdomain.com
    ports:
      - "3002:3002"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - admin
      - user
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 2. Create Dockerfiles

**Backend Dockerfile:**
```dockerfile
# packages/backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/common/package.json ./packages/common/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/common ./packages/common

# Build
RUN pnpm --filter backend build
RUN pnpm --filter common build

EXPOSE 3001

CMD ["pnpm", "--filter", "backend", "start"]
```

**Frontend Dockerfile (Admin/User):**
```dockerfile
# packages/admin/Dockerfile & packages/user/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/admin/package.json ./packages/admin/
COPY packages/common/package.json ./packages/common/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY packages/admin ./packages/admin
COPY packages/common ./packages/common

RUN pnpm --filter common build
RUN pnpm --filter admin build

FROM nginx:alpine
COPY --from=builder /app/packages/admin/dist /usr/share/nginx/html
COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream admin {
        server admin:3000;
    }

    upstream user {
        server user:3002;
    }

    # Admin Panel
    server {
        listen 80;
        server_name admin.yourdomain.com;

        location / {
            proxy_pass http://admin;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # User Panel  
    server {
        listen 80;
        server_name play.yourdomain.com;

        location / {
            proxy_pass http://user;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # Backend API
    server {
        listen 80;
        server_name api.yourdomain.com;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
```

#### 4. Deploy
```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export JWT_SECRET=your_jwt_secret_key
export JWT_REFRESH_SECRET=your_refresh_secret_key

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend pnpm db:migrate
docker-compose -f docker-compose.prod.yml exec backend pnpm db:seed
```

---

## 🔒 Security Checklist

### Environment Variables
```bash
# Required for production
DATABASE_URL=postgresql://user:pass@host:5432/win5x
REDIS_URL=redis://host:6379
JWT_SECRET=256-bit-random-key
JWT_REFRESH_SECRET=256-bit-random-key
NODE_ENV=production

# Optional security enhancements
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

### SSL/TLS Setup
- Use Let's Encrypt for free SSL certificates
- Configure HTTPS redirects in Nginx
- Set secure cookie flags in production
- Enable HSTS headers

### Database Security
- Use strong passwords
- Enable connection encryption
- Regular backups with encryption
- Network isolation for database access

### Application Security
- Regular dependency updates
- Input validation on all endpoints
- Rate limiting on authentication routes
- Audit logging for admin actions
- CORS configuration for production domains

---

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# API health check
curl http://localhost:3001/health

# Database connection test
docker-compose exec backend pnpm db:status

# Redis connection test
docker-compose exec redis redis-cli ping
```

### Log Management
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f admin
docker-compose logs -f user

# Log rotation setup in production
# Configure logrotate for application logs
```

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U win5x_user win5x > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U win5x_user win5x | gzip > $BACKUP_DIR/win5x_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

---

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => console.log('Connected')).catch(console.error);
"
```

**Redis Connection Failed:**
```bash
# Check Redis status
docker-compose ps redis
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

**WebSocket Connection Issues:**
```bash
# Check if Socket.IO is working
curl -I http://localhost:3001/socket.io/

# Verify WebSocket headers in Nginx
# Ensure Upgrade and Connection headers are set
```

**Build Failures:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install

# Clear build cache
pnpm clean
pnpm build
```

### Performance Optimization

**Database:**
- Add indexes for frequently queried fields
- Enable query logging to identify slow queries
- Consider connection pooling for high traffic

**Redis:**
- Monitor memory usage
- Set appropriate TTL for cached data
- Consider Redis Cluster for scaling

**Application:**
- Enable gzip compression in Nginx
- Use CDN for static assets
- Implement application-level caching

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer for multiple backend instances
- Session affinity for WebSocket connections
- Database read replicas for analytics queries
- Redis Cluster for distributed caching

### Monitoring Tools
- **Application**: PM2, New Relic, DataDog
- **Infrastructure**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime**: Pingdom, UptimeRobot

### Performance Metrics
- Response time < 200ms for API calls
- WebSocket latency < 50ms
- Database query time < 100ms
- 99.9% uptime target

---

## 🎯 Go-Live Checklist

### Pre-Launch
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Database backups automated
- [ ] Monitoring tools configured
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Admin accounts created
- [ ] Payment gateway configured (when ready)

### Launch Day
- [ ] Deploy to production environment
- [ ] Run database migrations
- [ ] Seed initial admin account
- [ ] Test all critical user flows
- [ ] Monitor error rates and performance
- [ ] Verify WebSocket connections
- [ ] Test admin panel functionality

### Post-Launch
- [ ] Monitor user registrations
- [ ] Track game performance metrics
- [ ] Monitor server resources
- [ ] Set up automated backups
- [ ] Plan regular security updates

The Win5x platform is ready for development and testing. Follow this guide to get your environment running quickly and deploy to production when ready!