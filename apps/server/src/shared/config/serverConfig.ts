/**
 * Server configuration for VGF Football Manager
 */

export const serverConfig = {
    port: parseInt(process.env.PORT || '8000', 10),
    stage: process.env.NODE_ENV || 'development',
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true
    }
}

export const socketIOConfig = {
    cors: {
        origin: true, // Allow all origins for development
        credentials: serverConfig.cors.credentials,
        methods: ['GET', 'POST'],
        allowedHeaders: ['*']
    },
    allowEIO3: true
}

export const HEALTH_CHECK_CONFIG = {
    enabled: true,
    endpoint: '/health',
    checks: {
        memory: true,
        vgf: true
    }
}