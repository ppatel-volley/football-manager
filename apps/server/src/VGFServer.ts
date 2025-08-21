import { RedisStorage, SocketIOTransport, VGFServer } from "@volley/vgf/server"
import cors from "cors"
import type { Express } from "express"
import express from "express"
import { createServer } from "http"
import Redis from "ioredis"

import { getRedisConfig, REDIS_HEALTH_CHECK } from "./config/redis"
import { getServerConfig, getSocketIOConfig, HEALTH_CHECK_CONFIG } from "./config/server"
import { FootballManagerRuleset } from "./GameRuleset"

// Get configurations
const redisConfig = getRedisConfig()
const serverConfig = getServerConfig()
const socketIOConfig = getSocketIOConfig()

// Create Redis client with configuration
export const redisClient = new Redis({
    ...redisConfig,
    retryDelayOnFailover: redisConfig.retryDelayOnFailover,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    lazyConnect: redisConfig.lazyConnect,
    keepAlive: redisConfig.keepAlive,
    connectTimeout: redisConfig.connectTimeout,
    commandTimeout: redisConfig.commandTimeout,
})

// Enhanced Redis error handling
redisClient.on("error", (error) => {
    console.error("Redis client error:", error)
})

redisClient.on("connect", () => {
    console.log(`✅ Connected to Redis at ${redisConfig.host}:${redisConfig.port}`)
})

redisClient.on("ready", () => {
    console.log("✅ Redis client is ready")
})

redisClient.on("reconnecting", () => {
    console.log("🔄 Reconnecting to Redis...")
})

// Redis health monitoring
let redisHealthFailures = 0
setInterval(async () => {
    try {
        await redisClient.ping()
        redisHealthFailures = 0
    } catch (error) {
        redisHealthFailures++
        console.error(`❌ Redis health check failed (${redisHealthFailures}/${REDIS_HEALTH_CHECK.maxFailures}):`, error)
        
        if (redisHealthFailures >= REDIS_HEALTH_CHECK.maxFailures) {
            console.error("🚨 Redis is unhealthy - consider restarting the server")
        }
    }
}, REDIS_HEALTH_CHECK.pingInterval)

const storage = new RedisStorage({ redisClient })

export const app: Express = express()

// Apply CORS with environment-specific configuration
app.use(cors({
    origin: serverConfig.cors.origin,
    credentials: serverConfig.cors.credentials
}))

// Health check endpoint
if (HEALTH_CHECK_CONFIG.enabled) {
    app.get(HEALTH_CHECK_CONFIG.endpoint, async (req, res) => {
        const health = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: serverConfig.stage,
            checks: {} as Record<string, boolean | string>
        }

        try {
            // Redis health check
            if (HEALTH_CHECK_CONFIG.checks.redis) {
                await redisClient.ping()
                health.checks.redis = "connected"
            }

            // Memory check
            if (HEALTH_CHECK_CONFIG.checks.memory) {
                const memUsage = process.memoryUsage()
                health.checks.memory = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
            }

            // VGF check
            if (HEALTH_CHECK_CONFIG.checks.vgf) {
                health.checks.vgf = "operational"
            }

            res.json(health)
        } catch (error) {
            health.status = "unhealthy"
            health.checks.error = String(error)
            res.status(500).json(health)
        }
    })
}

// Create HTTP server
export const httpServer = createServer(app)

// Create VGF transport with configuration
const transport = new SocketIOTransport({
    httpServer,
    redisClient,
    storage,
    socketIOConfig
})

// Create VGF server with configuration
export const server = new VGFServer({
    port: serverConfig.port,
    httpServer,
    app,
    transport,
    storage,
    game: FootballManagerRuleset,
})
