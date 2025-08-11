import { RedisStorage, SocketIOTransport, VGFServer } from "@volley/vgf/server"
import cors from "cors"
import type { Express } from "express"
import express from "express"
import { createServer } from "http"
import Redis from "ioredis"

import { PORT, REDIS_HOST, REDIS_PORT } from "./constants/Environment"
import { DemoGameRuleset } from "./GameRuleset"

export const redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
})

redisClient.on("error", (error) => console.error("Redis client error:", error))

const storage = new RedisStorage({ redisClient })

export const app: Express = express()

app.use(cors({ origin: "*" }))

// eslint-disable-next-line @typescript-eslint/no-misused-promises
export const httpServer = createServer(app)

const transport = new SocketIOTransport({
    httpServer,
    redisClient,
    storage,
})

export const server = new VGFServer({
    port: PORT,
    httpServer,
    app,
    transport,
    storage,
    game: DemoGameRuleset,
})
