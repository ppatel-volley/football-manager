/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-misused-promises */
import { VGFServer } from "@volley/vgf/server"
import cors from "cors"
import express from "express"
import { createServer } from "http"

import { FootballManagerRuleset } from "./GameRuleset"
import { redisClient } from "./shared/config/redisConfig"
import { HEALTH_CHECK_CONFIG, serverConfig, socketIOConfig } from "./shared/config/serverConfig"
import { SocketIOTransport } from "./shared/config/vgfConfig"
import { RedisStorage } from '@volley/vgf/server'

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

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log('🌐 HTTP Request:', req.method, req.url, req.body ? Object.keys(req.body) : 'no body')
    next()
})

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

// Override VGF's session creation to use our game setup
app.post('/api/session', async (req, res, next) => {
    try {
        const requestBody = req.body
        
        // If request body is empty or minimal, use our game setup
        if (!requestBody || Object.keys(requestBody).length === 0 || !requestBody.phase) {
            console.log('Creating session with game setup state')
            const { setupGameState } = await import('./utils/setupGame')
            req.body = setupGameState()
        } else {
            console.log('Using provided session state')
        }
        
        // Continue to VGF's session handler
        next()
    } catch (error) {
        console.error('Failed to setup game state for session:', error)
        res.status(500).json({ error: 'Failed to create session' })
    }
})

// Create HTTP server
export const httpServer = createServer(app)

// Create VGF storage using official RedisStorage
const storage = new RedisStorage({ redisClient })

// Create VGF transport with configuration
const transport = new SocketIOTransport({
    httpServer,
    redisClient,
    storage,
    socketOptions: socketIOConfig
})

// Debug VGF action processing
console.log('Creating VGF server with game ruleset')
console.log('Game ruleset actions:', Object.keys(FootballManagerRuleset.actions))
console.log('Game ruleset phases:', Object.keys(FootballManagerRuleset.phases))

// Debug VGF action dispatch mechanism
console.log('🚀 VGF Server creating with:', {
    port: serverConfig.port,
    hasHttpServer: !!httpServer,
    hasApp: !!app,
    hasTransport: !!transport,
    hasStorage: !!storage,
    hasGame: !!FootballManagerRuleset,
    gameActionsCount: Object.keys(FootballManagerRuleset.actions).length
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

// Add debugging for action dispatch
console.log('🚀 VGF Server instance created, adding action debugging...')

// Override or wrap the action dispatch if possible
if (server) {
    console.log('🚀 VGF Server available for action debugging')
}