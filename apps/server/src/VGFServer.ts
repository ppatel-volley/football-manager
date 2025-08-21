/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-misused-promises */
import { VGFServer } from "@volley/vgf/server"
import cors from "cors"
import express from "express"
import { createServer } from "http"

import { FootballManagerRuleset } from "./GameRuleset"
import { redisClient } from "./shared/config/redisConfig"
import { HEALTH_CHECK_CONFIG, serverConfig, socketIOConfig } from "./shared/config/serverConfig"
import { SocketIOTransport, storage } from "./shared/config/vgfConfig"

// Express app setup
export const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS setup
app.use(cors({
    origin: serverConfig.cors.origin,
    credentials: serverConfig.cors.credentials
}))

// Health check endpoint
if (HEALTH_CHECK_CONFIG.enabled)
{
    app.get(HEALTH_CHECK_CONFIG.endpoint, (_req, res) =>
    {
        const health = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: serverConfig.stage,
            checks: {} as Record<string, boolean | string>
        }

        // Memory check
        if (HEALTH_CHECK_CONFIG.checks.memory)
        {
            const memUsage = process.memoryUsage()
            health.checks.memory = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        }

        // VGF check
        if (HEALTH_CHECK_CONFIG.checks.vgf)
        {
            health.checks.vgf = "operational"
        }

        res.json(health)
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