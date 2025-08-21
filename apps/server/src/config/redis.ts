/**
 * Redis Configuration for Football Manager VGF
 * Handles different environments and connection strategies
 */
import type { RedisOptions, ClusterOptions } from "ioredis"
import { STAGE, REDIS_HOST, REDIS_PORT } from "../constants/Environment"

export interface RedisConfig {
    host: string
    port: number
    password?: string
    db?: number
    retryDelayOnFailover?: number
    retryDelayOnClusterDown?: number
    maxRetriesPerRequest?: number
    lazyConnect?: boolean
    keepAlive?: number
    connectTimeout?: number
    commandTimeout?: number
}

export interface RedisClusterConfig {
    enabled: boolean
    nodes?: Array<{ host: string; port: number }>
    options?: ClusterOptions
}

/**
 * Get Redis configuration based on environment
 */
export function getRedisConfig(): RedisConfig & { cluster: RedisClusterConfig } {
    const baseConfig: RedisConfig = {
        host: REDIS_HOST || "127.0.0.1",
        port: REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
    }

    // Environment-specific configurations
    switch (STAGE) {
        case "local":
        case "development":
            return {
                ...baseConfig,
                db: 0, // Use database 0 for development
                cluster: {
                    enabled: false
                }
            }

        case "staging":
            return {
                ...baseConfig,
                host: process.env.REDIS_STAGING_HOST || baseConfig.host,
                port: parseInt(process.env.REDIS_STAGING_PORT || String(baseConfig.port)),
                password: process.env.REDIS_STAGING_PASSWORD,
                db: 1, // Use database 1 for staging
                maxRetriesPerRequest: 5,
                cluster: {
                    enabled: false
                }
            }

        case "production":
            return {
                ...baseConfig,
                host: process.env.REDIS_PROD_HOST || baseConfig.host,
                port: parseInt(process.env.REDIS_PROD_PORT || String(baseConfig.port)),
                password: process.env.REDIS_PROD_PASSWORD,
                db: 0,
                maxRetriesPerRequest: 10,
                retryDelayOnFailover: 200,
                commandTimeout: 10000,
                cluster: {
                    enabled: process.env.REDIS_CLUSTER_ENABLED === "true",
                    nodes: process.env.REDIS_CLUSTER_NODES 
                        ? process.env.REDIS_CLUSTER_NODES.split(",").map(node => {
                            const [host, port] = node.split(":")
                            return { host, port: parseInt(port) }
                        })
                        : undefined,
                    options: {
                        redisOptions: {
                            password: process.env.REDIS_PROD_PASSWORD,
                            connectTimeout: 10000,
                            commandTimeout: 5000,
                        },
                        clusterRetryDelayOnFailover: 100,
                        clusterRetryDelayOnClusterDown: 300,
                        maxRetriesPerRequest: 10,
                        scaleReads: "slave"
                    }
                }
            }

        default:
            console.warn(`Unknown STAGE: ${STAGE}, using development config`)
            return {
                ...baseConfig,
                db: 0,
                cluster: {
                    enabled: false
                }
            }
    }
}

/**
 * Redis connection health check configuration
 */
export const REDIS_HEALTH_CHECK = {
    pingInterval: 30000,      // Ping every 30 seconds
    maxFailures: 3,           // Max consecutive failures before marking unhealthy
    timeoutMs: 5000,          // Ping timeout
}

/**
 * VGF-specific Redis key patterns
 */
export const REDIS_KEYS = {
    // VGF Session keys
    session: (sessionId: string) => `vgf:session:${sessionId}`,
    sessionState: (sessionId: string) => `vgf:session:${sessionId}:state`,
    sessionPlayers: (sessionId: string) => `vgf:session:${sessionId}:players`,
    
    // Football Manager specific keys
    match: (matchId: string) => `fm:match:${matchId}`,
    player: (playerId: string) => `fm:player:${playerId}`,
    team: (teamId: string) => `fm:team:${teamId}`,
    
    // Temporary data
    temp: (key: string) => `fm:temp:${key}`,
    
    // Statistics and analytics
    stats: (type: string) => `fm:stats:${type}`,
    
    // Cache keys
    cache: (key: string) => `fm:cache:${key}`,
} as const

/**
 * Redis TTL configurations (in seconds)
 */
export const REDIS_TTL = {
    session: 24 * 60 * 60,        // 24 hours
    tempData: 60 * 60,            // 1 hour
    cache: 30 * 60,               // 30 minutes
    playerStats: 7 * 24 * 60 * 60, // 7 days
} as const

/**
 * Connection retry configuration
 */
export const REDIS_RETRY_CONFIG = {
    retries: 10,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    maxRetriesPerRequest: 3,
}

/**
 * Development utilities for Redis debugging
 */
export const REDIS_DEBUG = {
    enabled: STAGE === "local" || STAGE === "development",
    logCommands: process.env.REDIS_LOG_COMMANDS === "true",
    logConnections: process.env.REDIS_LOG_CONNECTIONS === "true",
}