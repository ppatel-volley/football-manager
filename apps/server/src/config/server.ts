/**
 * Server Configuration for Football Manager VGF
 * Central configuration management for all server settings
 */
import { STAGE, PORT, AWS_REGION } from "../constants/Environment"

export interface ServerConfig {
    port: number
    stage: string
    cors: {
        origin: string | string[]
        credentials: boolean
    }
    rateLimit: {
        windowMs: number
        maxRequests: number
    }
    logging: {
        level: string
        format: string
        enableRequestLogging: boolean
    }
    vgf: {
        sessionTimeout: number
        maxPlayersPerSession: number
        enableHeartbeat: boolean
        heartbeatInterval: number
    }
    football: {
        matchDuration: number
        maxSimultaneousMatches: number
        enableDeterministicSimulation: boolean
        simulationTickRate: number
    }
    aws: {
        region: string
        enableMetrics: boolean
        enableLogs: boolean
    }
}

/**
 * Get server configuration based on environment
 */
export function getServerConfig(): ServerConfig {
    const baseConfig: ServerConfig = {
        port: PORT || 8000,
        stage: STAGE || "local",
        cors: {
            origin: "*",
            credentials: false
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 100
        },
        logging: {
            level: "info",
            format: "combined",
            enableRequestLogging: true
        },
        vgf: {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxPlayersPerSession: 8,
            enableHeartbeat: true,
            heartbeatInterval: 30000 // 30 seconds
        },
        football: {
            matchDuration: 90 * 60, // 90 minutes in seconds
            maxSimultaneousMatches: 100,
            enableDeterministicSimulation: true,
            simulationTickRate: 60 // 60 FPS
        },
        aws: {
            region: AWS_REGION || "us-east-1",
            enableMetrics: false,
            enableLogs: false
        }
    }

    // Environment-specific overrides
    switch (STAGE) {
        case "local":
        case "development":
            return {
                ...baseConfig,
                cors: {
                    origin: [
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "http://localhost:8080",
                        "http://127.0.0.1:5173"
                    ],
                    credentials: true
                },
                logging: {
                    level: "debug",
                    format: "dev",
                    enableRequestLogging: true
                },
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    maxRequests: 1000 // Higher limit for development
                },
                vgf: {
                    ...baseConfig.vgf,
                    sessionTimeout: 60 * 60 * 1000, // 1 hour for development
                },
                football: {
                    ...baseConfig.football,
                    maxSimultaneousMatches: 10 // Lower for development
                }
            }

        case "staging":
            return {
                ...baseConfig,
                cors: {
                    origin: [
                        process.env.STAGING_CLIENT_URL || "https://staging-football-manager.com",
                        "https://*.vercel.app",
                        "https://*.netlify.app"
                    ],
                    credentials: true
                },
                logging: {
                    level: "info",
                    format: "combined",
                    enableRequestLogging: true
                },
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    maxRequests: 500
                },
                aws: {
                    ...baseConfig.aws,
                    enableMetrics: true,
                    enableLogs: true
                }
            }

        case "production":
            return {
                ...baseConfig,
                cors: {
                    origin: [
                        process.env.PROD_CLIENT_URL || "https://football-manager.com",
                        process.env.ADDITIONAL_ORIGINS?.split(",") || []
                    ].flat().filter(Boolean),
                    credentials: true
                },
                logging: {
                    level: process.env.LOG_LEVEL || "warn",
                    format: "combined",
                    enableRequestLogging: false // Disable in production for performance
                },
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "200")
                },
                vgf: {
                    ...baseConfig.vgf,
                    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || String(baseConfig.vgf.sessionTimeout)),
                    maxPlayersPerSession: parseInt(process.env.MAX_PLAYERS || String(baseConfig.vgf.maxPlayersPerSession))
                },
                football: {
                    ...baseConfig.football,
                    maxSimultaneousMatches: parseInt(process.env.MAX_MATCHES || String(baseConfig.football.maxSimultaneousMatches)),
                    simulationTickRate: parseInt(process.env.SIMULATION_TICK_RATE || String(baseConfig.football.simulationTickRate))
                },
                aws: {
                    ...baseConfig.aws,
                    enableMetrics: true,
                    enableLogs: true
                }
            }

        default:
            console.warn(`Unknown STAGE: ${STAGE}, using base configuration`)
            return baseConfig
    }
}

/**
 * Socket.IO specific configuration
 */
export interface SocketIOConfig {
    pingTimeout: number
    pingInterval: number
    maxHttpBufferSize: number
    transports: string[]
    cors: {
        origin: string | string[]
        methods: string[]
        credentials: boolean
    }
    allowEIO3: boolean
}

export function getSocketIOConfig(): SocketIOConfig {
    const serverConfig = getServerConfig()
    
    return {
        pingTimeout: 20000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        transports: ["polling", "websocket"],
        cors: {
            origin: serverConfig.cors.origin,
            methods: ["GET", "POST"],
            credentials: serverConfig.cors.credentials
        },
        allowEIO3: true // For backward compatibility
    }
}

/**
 * Health check endpoints configuration
 */
export const HEALTH_CHECK_CONFIG = {
    enabled: true,
    endpoint: "/health",
    checks: {
        redis: true,
        vgf: true,
        memory: true,
        uptime: true
    },
    timeout: 5000 // 5 seconds
}

/**
 * Security configuration
 */
export interface SecurityConfig {
    enableHelmet: boolean
    enableRateLimit: boolean
    trustProxy: boolean
    sessionSecret: string
    jwtSecret?: string
}

export function getSecurityConfig(): SecurityConfig {
    return {
        enableHelmet: STAGE === "production",
        enableRateLimit: STAGE !== "local",
        trustProxy: STAGE === "production",
        sessionSecret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
        jwtSecret: process.env.JWT_SECRET
    }
}

/**
 * Monitoring and observability configuration
 */
export interface MonitoringConfig {
    enableMetrics: boolean
    enableTracing: boolean
    enableErrorReporting: boolean
    metricsPort?: number
    serviceName: string
    version: string
}

export function getMonitoringConfig(): MonitoringConfig {
    return {
        enableMetrics: STAGE === "production" || STAGE === "staging",
        enableTracing: STAGE === "production",
        enableErrorReporting: STAGE === "production",
        metricsPort: parseInt(process.env.METRICS_PORT || "9090"),
        serviceName: "football-manager-vgf-server",
        version: process.env.APP_VERSION || "1.0.0"
    }
}