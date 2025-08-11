import "./constants/Environment"

import { server } from "./VGFServer"

server.start()

console.log("Node version:", process.version)

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EX:", err.stack)
})
