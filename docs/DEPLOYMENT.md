# Football Manager VGF - Deployment Guide

This guide covers deploying the Football Manager VGF application in different environments.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React Client  │◄──►│  VGF Server     │◄──►│  Redis Storage  │
│   (Vite/Vercel) │    │  (Node.js)      │    │  (Session Data) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static CDN    │    │   Load Balancer │    │   Redis Cluster │
│   (Assets)      │    │   (AWS ALB/GCP) │    │   (Production)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.6.5+
- Redis 7+ (see Redis setup below)
- Git

### 1. Clone and Install

```bash
git clone <your-repo>
cd football-manager
pnpm install
```

### 2. Setup Redis

Run our automated Redis setup script:

```bash
# For development
./scripts/setup-redis.sh setup dev

# For production
./scripts/setup-redis.sh setup prod
```

Or manually install Redis:

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Configure Environment

Copy the environment template and customize:

```bash
cp .env.template .env.local
# Edit .env.local with your settings
```

### 4. Build and Test

```bash
# Build everything
pnpm build

# Start development
pnpm dev
```

## 📋 Environment Setup

### Development Environment

```bash
# Use development configuration
cp .env.development .env.local

# Start Redis for development
./scripts/setup-redis.sh start dev

# Start the application
pnpm dev
```

**Development URLs:**
- Client: http://localhost:5173
- Server: http://localhost:8000
- Health Check: http://localhost:8000/health

### Staging Environment

1. **Setup Environment File:**
   ```bash
   cp .env.template .env.staging
   # Edit .env.staging with staging values
   ```

2. **Configure Redis:**
   ```bash
   # Production Redis setup
   ./scripts/setup-redis.sh setup prod
   
   # Or use managed Redis service
   export REDIS_STAGING_HOST=your-staging-redis.amazonaws.com
   export REDIS_STAGING_PASSWORD=your-staging-password
   ```

3. **Deploy:**
   ```bash
   NODE_ENV=staging STAGE=staging pnpm build
   NODE_ENV=staging STAGE=staging pnpm start
   ```

### Production Environment

1. **Setup Environment File:**
   ```bash
   cp .env.template .env.production
   # Fill in all production values - see .env.template comments
   ```

2. **Configure Redis:**
   
   **Option A: Managed Redis Service**
   ```bash
   export REDIS_PROD_HOST=your-redis-cluster.cache.amazonaws.com
   export REDIS_PROD_PASSWORD=your-secure-password
   export REDIS_CLUSTER_ENABLED=true
   export REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
   ```

   **Option B: Self-Hosted Redis**
   ```bash
   ./scripts/setup-redis.sh setup prod
   ```

3. **Build and Deploy:**
   ```bash
   NODE_ENV=production STAGE=production pnpm build
   NODE_ENV=production STAGE=production pnpm start
   ```

## 🗄️ Redis Configuration

### Redis Connection Settings

The server automatically configures Redis based on your environment:

| Environment | Default Host | Default Port | Auth Required |
|------------|--------------|--------------|---------------|
| Development | 127.0.0.1 | 6379 | No |
| Staging | Set via `REDIS_STAGING_HOST` | 6379 | Recommended |
| Production | Set via `REDIS_PROD_HOST` | 6379 | **Required** |

### Redis Memory Configuration

Our Redis setup automatically configures memory limits:

- **Development:** 256MB limit, LRU eviction
- **Staging:** 1GB limit, optimized for testing
- **Production:** 2GB+ limit, cluster-aware

### Redis Security

**Development:**
- No authentication required
- Dangerous commands disabled
- Memory limits enforced

**Production:**
- Password authentication **required**
- SSL/TLS recommended
- Firewall rules configured
- Monitoring enabled

## 🐳 Docker Deployment

### Using Docker Compose

1. **Generate Docker Configuration:**
   ```bash
   ./scripts/setup-redis.sh docker
   ```

2. **Start Redis:**
   ```bash
   docker-compose -f docker-compose.redis.yml up -d
   ```

3. **Run the Application:**
   ```bash
   docker-compose up -d
   ```

### Docker Environment

Set these environment variables in your Docker setup:

```dockerfile
ENV NODE_ENV=production
ENV STAGE=production
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=your_secure_password
```

## ☁️ Cloud Provider Setup

### AWS Deployment

1. **ElastiCache Redis:**
   ```bash
   # Create Redis cluster
   aws elasticache create-cache-cluster \
     --cache-cluster-id football-manager \
     --engine redis \
     --cache-node-type cache.r6g.large \
     --num-cache-nodes 1
   ```

2. **Environment Configuration:**
   ```bash
   export REDIS_PROD_HOST=football-manager.abc123.cache.amazonaws.com
   export REDIS_PROD_PORT=6379
   export AWS_REGION=us-east-1
   ```

### Google Cloud Platform

1. **Memorystore Redis:**
   ```bash
   gcloud redis instances create football-manager \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7_0
   ```

2. **Environment Configuration:**
   ```bash
   export REDIS_PROD_HOST=10.x.x.x  # Internal IP from GCP
   export REDIS_PROD_PORT=6379
   ```

### Vercel/Netlify (Client Only)

For client-only deployments (POC mode):

1. **Build Configuration:**
   ```bash
   # Vercel
   vercel --env NODE_ENV=production

   # Netlify
   npm run build
   ```

2. **Environment Variables:**
   Set in your platform dashboard:
   - `NODE_ENV=production`
   - `VITE_SERVER_URL=https://your-api-server.com`

## 🔍 Health Monitoring

### Health Check Endpoint

The server provides a comprehensive health check:

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T04:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "redis": "connected",
    "memory": "245MB",
    "vgf": "operational"
  }
}
```

### Monitoring Redis

**Development:**
```bash
# Monitor Redis
redis-cli monitor

# Check Redis info
redis-cli info
```

**Production:**
- Use Redis monitoring tools (Redis Insight, DataDog, etc.)
- Set up alerts for memory usage, connection count
- Monitor key expiration and eviction rates

## 🛠️ Troubleshooting

### Common Issues

1. **Redis Connection Failed:**
   ```bash
   # Check Redis status
   ./scripts/setup-redis.sh test
   
   # Restart Redis
   ./scripts/setup-redis.sh stop
   ./scripts/setup-redis.sh start
   ```

2. **Port Already in Use:**
   ```bash
   # Kill process using port 8000
   lsof -ti:8000 | xargs kill -9
   
   # Or change port in .env file
   echo "PORT=8001" >> .env.local
   ```

3. **Memory Issues:**
   ```bash
   # Check Redis memory usage
   redis-cli info memory
   
   # Clear Redis cache (development only!)
   redis-cli flushall
   ```

### Performance Tuning

**Redis Optimization:**
- Enable Redis persistence for production
- Configure appropriate memory limits
- Use Redis Cluster for high availability
- Monitor slow queries with `SLOWLOG`

**Node.js Optimization:**
- Set `NODE_ENV=production`
- Enable clustering for multiple cores
- Configure appropriate memory limits
- Use PM2 for process management

## 📊 Scaling

### Horizontal Scaling

1. **Load Balancer Setup:**
   - Use AWS ALB, GCP Load Balancer, or nginx
   - Configure sticky sessions for VGF
   - Health check: `GET /health`

2. **Redis Scaling:**
   - Use Redis Cluster for high availability
   - Configure read replicas for scaling reads
   - Monitor memory usage and scale accordingly

3. **Application Scaling:**
   ```bash
   # Using PM2
   pm2 start ecosystem.config.js
   pm2 scale football-manager +2
   ```

### Vertical Scaling

**Recommended Specs:**

| Environment | CPU | Memory | Redis Memory |
|------------|-----|---------|-------------|
| Development | 2 cores | 4GB | 256MB |
| Staging | 4 cores | 8GB | 1GB |
| Production | 8+ cores | 16GB+ | 4GB+ |

## 🔒 Security Checklist

- [ ] Change default Redis password
- [ ] Configure Redis AUTH
- [ ] Enable Redis SSL/TLS (production)
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable CORS for specific origins
- [ ] Set secure session secrets
- [ ] Enable request logging
- [ ] Set up error monitoring
- [ ] Configure backup strategy

## 📞 Support

For deployment issues:

1. Check the health endpoint: `/health`
2. Review server logs
3. Test Redis connectivity: `./scripts/setup-redis.sh test`
4. Check environment configuration
5. Review this deployment guide

**Need Help?**
- Create an issue in the repository
- Check the troubleshooting section
- Review the Redis setup script output