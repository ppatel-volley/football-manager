#!/bin/bash

# Redis Setup Script for Football Manager VGF Deployment
# This script sets up Redis for different deployment environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    print_status "Detected OS: $OS"
}

# Check if Redis is already installed
check_redis_installed() {
    if command -v redis-server &> /dev/null; then
        REDIS_VERSION=$(redis-server --version | grep -o 'v=[0-9.]*' | cut -d'=' -f2)
        print_success "Redis is already installed (version $REDIS_VERSION)"
        return 0
    else
        print_status "Redis not found, will install"
        return 1
    fi
}

# Install Redis on macOS
install_redis_macos() {
    print_status "Installing Redis on macOS via Homebrew..."
    
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew not found. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    brew install redis
    print_success "Redis installed via Homebrew"
}

# Install Redis on Linux (Ubuntu/Debian)
install_redis_linux() {
    print_status "Installing Redis on Linux..."
    
    # Detect distribution
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y redis-server
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y epel-release
        sudo yum install -y redis
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y redis
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        sudo pacman -S redis
    else
        print_error "Unsupported Linux distribution. Please install Redis manually."
        exit 1
    fi
    
    print_success "Redis installed via package manager"
}

# Install Redis on Windows
install_redis_windows() {
    print_error "Windows Redis installation not automated in this script."
    print_status "For Windows, please:"
    echo "  1. Download Redis from: https://github.com/microsoftarchive/redis/releases"
    echo "  2. Or use WSL2 with Ubuntu and run this script"
    echo "  3. Or use Docker: docker run -d -p 6379:6379 redis:alpine"
    exit 1
}

# Install Redis based on OS
install_redis() {
    case $OS in
        "macos")
            install_redis_macos
            ;;
        "linux")
            install_redis_linux
            ;;
        "windows")
            install_redis_windows
            ;;
        *)
            print_error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac
}

# Configure Redis for development
configure_redis_dev() {
    print_status "Configuring Redis for development environment..."
    
    # Create config directory if it doesn't exist
    CONFIG_DIR="$HOME/.redis"
    mkdir -p "$CONFIG_DIR"
    
    # Create development Redis configuration
    cat > "$CONFIG_DIR/redis-dev.conf" << EOF
# Redis Development Configuration for Football Manager VGF
# Based on Redis 7.x/8.x defaults with VGF optimizations

# Network
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300

# General
daemonize no
pidfile /tmp/redis-dev.pid
loglevel notice
logfile ""

# Persistence (disabled for development)
save ""
stop-writes-on-bgsave-error no

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# VGF Session optimizations
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Disable dangerous commands in dev
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG ""

# Client timeout
timeout 0
client-query-buffer-limit 1gb
proto-max-bulk-len 512mb
EOF
    
    print_success "Development Redis configuration created at $CONFIG_DIR/redis-dev.conf"
}

# Configure Redis for production
configure_redis_prod() {
    print_status "Configuring Redis for production environment..."
    
    # Create config directory if it doesn't exist
    CONFIG_DIR="$HOME/.redis"
    mkdir -p "$CONFIG_DIR"
    
    # Create production Redis configuration
    cat > "$CONFIG_DIR/redis-prod.conf" << EOF
# Redis Production Configuration for Football Manager VGF
# Optimized for high-performance multiplayer gaming

# Network - bind to all interfaces in production
bind 0.0.0.0
port 6379
timeout 300
tcp-keepalive 300
tcp-backlog 511

# General
daemonize yes
pidfile /var/run/redis/redis.pid
loglevel notice
logfile /var/log/redis/redis.log

# Persistence - enabled for production
dir /var/lib/redis/
dbfilename football-manager.rdb
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes

# AOF persistence for durability
appendonly yes
appendfilename "football-manager.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Memory management (adjust based on server specs)
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Security
requirepass your_secure_password_here
# Note: Change the password above before production deployment!

# Performance tuning for VGF
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Client management
maxclients 10000
timeout 300

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_b835729b4b4c5b5e"
rename-command SHUTDOWN "SHUTDOWN_b835729b4b4c5b5e"
rename-command EVAL ""

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Advanced config
notify-keyspace-events ""
lua-time-limit 5000
EOF
    
    print_success "Production Redis configuration created at $CONFIG_DIR/redis-prod.conf"
    print_warning "IMPORTANT: Change the requirepass value in $CONFIG_DIR/redis-prod.conf before deployment!"
}

# Start Redis service
start_redis() {
    local ENV=${1:-"dev"}
    CONFIG_DIR="$HOME/.redis"
    
    print_status "Starting Redis in $ENV environment..."
    
    case $OS in
        "macos")
            if [ "$ENV" == "dev" ]; then
                # Start with custom dev config
                redis-server "$CONFIG_DIR/redis-dev.conf" &
                REDIS_PID=$!
                echo $REDIS_PID > /tmp/redis-dev.pid
                print_success "Redis started with development configuration (PID: $REDIS_PID)"
            else
                # Use brew services for production-like setup
                brew services start redis
                print_success "Redis started as system service"
            fi
            ;;
        "linux")
            if [ "$ENV" == "dev" ]; then
                # Start with custom dev config
                redis-server "$CONFIG_DIR/redis-dev.conf" &
                REDIS_PID=$!
                echo $REDIS_PID > /tmp/redis-dev.pid
                print_success "Redis started with development configuration (PID: $REDIS_PID)"
            else
                # Use systemctl for production
                sudo systemctl start redis-server
                sudo systemctl enable redis-server
                print_success "Redis started and enabled as system service"
            fi
            ;;
    esac
}

# Stop Redis service
stop_redis() {
    print_status "Stopping Redis..."
    
    case $OS in
        "macos")
            # Try to stop brew service first
            brew services stop redis 2>/dev/null || true
            
            # Kill development Redis if running
            if [ -f /tmp/redis-dev.pid ]; then
                REDIS_PID=$(cat /tmp/redis-dev.pid)
                kill $REDIS_PID 2>/dev/null || true
                rm -f /tmp/redis-dev.pid
            fi
            ;;
        "linux")
            # Stop system service
            sudo systemctl stop redis-server 2>/dev/null || true
            
            # Kill development Redis if running
            if [ -f /tmp/redis-dev.pid ]; then
                REDIS_PID=$(cat /tmp/redis-dev.pid)
                kill $REDIS_PID 2>/dev/null || true
                rm -f /tmp/redis-dev.pid
            fi
            ;;
    esac
    
    print_success "Redis stopped"
}

# Test Redis connection
test_redis() {
    print_status "Testing Redis connection..."
    
    if redis-cli ping > /dev/null 2>&1; then
        REDIS_INFO=$(redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r\n')
        print_success "Redis is running (version: $REDIS_INFO)"
        
        # Test basic operations
        redis-cli set football-manager:test "VGF Ready" > /dev/null
        RESULT=$(redis-cli get football-manager:test)
        redis-cli del football-manager:test > /dev/null
        
        if [ "$RESULT" = "VGF Ready" ]; then
            print_success "Redis read/write operations working correctly"
        else
            print_error "Redis read/write test failed"
            return 1
        fi
    else
        print_error "Cannot connect to Redis. Make sure it's running on localhost:6379"
        return 1
    fi
}

# Create Docker Compose for Redis (alternative deployment)
create_docker_compose() {
    print_status "Creating Docker Compose configuration for Redis..."
    
    cat > "docker-compose.redis.yml" << EOF
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: football-manager-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis-prod.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - football-manager

  # Optional: Redis Commander for GUI management
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: football-manager-redis-gui
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=redis:redis:6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - football-manager

volumes:
  redis_data:
    driver: local

networks:
  football-manager:
    driver: bridge
EOF
    
    print_success "Docker Compose configuration created: docker-compose.redis.yml"
    print_status "To use Docker Redis: docker-compose -f docker-compose.redis.yml up -d"
}

# Create environment-specific .env files
create_env_files() {
    print_status "Creating environment-specific .env files..."
    
    # Development .env
    cat > ".env.development" << EOF
# Football Manager VGF - Development Environment
NODE_ENV=development
STAGE=local

# Server Configuration
PORT=8000

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# AWS Configuration (not needed for local dev)
AWS_REGION=us-east-1
EOF
    
    # Production .env template
    cat > ".env.production.template" << EOF
# Football Manager VGF - Production Environment Template
# Copy this to .env.production and fill in actual values

NODE_ENV=production
STAGE=production

# Server Configuration
PORT=8000

# Redis Configuration
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Optional: Redis Cluster Configuration
# REDIS_CLUSTER_ENABLED=true
# REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
EOF
    
    print_success "Environment files created:"
    echo "  - .env.development (ready to use)"
    echo "  - .env.production.template (copy and customize for production)"
}

# Main setup function
setup_redis() {
    local ENV=${1:-"dev"}
    
    echo "🎯⚽ Football Manager VGF - Redis Setup Script"
    echo "=============================================="
    
    detect_os
    
    # Install Redis if not present
    if ! check_redis_installed; then
        read -p "Redis not installed. Install now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_redis
        else
            print_error "Redis installation cancelled"
            exit 1
        fi
    fi
    
    # Configure based on environment
    if [ "$ENV" == "prod" ] || [ "$ENV" == "production" ]; then
        configure_redis_prod
        create_env_files
        print_warning "Production setup complete. Remember to:"
        echo "  1. Change Redis password in the config file"
        echo "  2. Configure firewall rules"
        echo "  3. Set up SSL/TLS if needed"
        echo "  4. Configure backup strategy"
    else
        configure_redis_dev
        create_env_files
    fi
    
    # Create Docker alternative
    create_docker_compose
    
    # Start Redis
    read -p "Start Redis now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_redis "$ENV"
        sleep 2
        test_redis
    fi
    
    print_success "Redis setup complete!"
    echo
    echo "📖 Usage:"
    echo "  Start Redis:  $0 start [dev|prod]"
    echo "  Stop Redis:   $0 stop"
    echo "  Test Redis:   $0 test"
    echo "  Help:         $0 help"
    echo
    echo "🐳 Docker Alternative:"
    echo "  docker-compose -f docker-compose.redis.yml up -d"
}

# Help function
show_help() {
    echo "🎯⚽ Football Manager VGF - Redis Setup Script"
    echo "=============================================="
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  setup [dev|prod]    Set up Redis for development or production"
    echo "  start [dev|prod]    Start Redis service"
    echo "  stop                Stop Redis service"
    echo "  test                Test Redis connection and functionality"
    echo "  install             Install Redis (interactive)"
    echo "  config-dev          Create development configuration only"
    echo "  config-prod         Create production configuration only"
    echo "  docker              Create Docker Compose configuration"
    echo "  env                 Create environment files"
    echo "  help                Show this help message"
    echo
    echo "Examples:"
    echo "  $0 setup dev        # Set up for development"
    echo "  $0 setup prod       # Set up for production"
    echo "  $0 start            # Start Redis in development mode"
    echo "  $0 test             # Test Redis connection"
    echo
    echo "Environment Variables:"
    echo "  REDIS_HOST          Redis host (default: 127.0.0.1)"
    echo "  REDIS_PORT          Redis port (default: 6379)"
    echo "  REDIS_PASSWORD      Redis password (production only)"
}

# Main script logic
case "${1:-setup}" in
    "setup")
        setup_redis "${2:-dev}"
        ;;
    "start")
        detect_os
        start_redis "${2:-dev}"
        test_redis
        ;;
    "stop")
        detect_os
        stop_redis
        ;;
    "test")
        test_redis
        ;;
    "install")
        detect_os
        install_redis
        ;;
    "config-dev")
        configure_redis_dev
        ;;
    "config-prod")
        configure_redis_prod
        ;;
    "docker")
        create_docker_compose
        ;;
    "env")
        create_env_files
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac