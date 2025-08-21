import Redis from 'ioredis'

/**
 * Redis client configuration for VGF storage
 */
export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err)
})

redisClient.on('connect', () => {
    console.log('Redis Client Connected')
})