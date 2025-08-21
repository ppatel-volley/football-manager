import "./constants/Environment"

import { server } from "./VGFServer"

async function startServer() {
    console.log("🚀 Starting VGF server...")
    try {
        await server.start()
        console.log("🚀 VGF server started successfully!")
        console.log("Node version:", process.version)
    } catch (error) {
        console.error("🚨 VGF server failed to start:", error)
        process.exit(1)
    }
}

startServer()

process.on("uncaughtException", (err) => 
{
    console.error("UNCAUGHT EX:", err.stack)
})
