import Redis from "ioredis"

import { getRedisConfig } from "../../config/redis"

const config = getRedisConfig()

export const redisClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    retryDelayOnFailover: config.retryDelayOnFailover,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    lazyConnect: config.lazyConnect,
    keepAlive: config.keepAlive,
    connectTimeout: config.connectTimeout,
    commandTimeout: config.commandTimeout,
})

// Handle connection events
redisClient.on('connect', () => 
{
    console.log(`✅ Redis connected to ${config.host}:${config.port}`)
})

redisClient.on('error', (err) => 
{
    console.error('❌ Redis connection error:', err)
})

redisClient.on('close', () => 
{
    console.log('🔌 Redis connection closed')
})