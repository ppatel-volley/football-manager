// Import VGF components from the actual package
import { MemoryStorage, SocketIOTransport } from "@volley/vgf/server"

// Use MemoryStorage for development to avoid Redis dependency
export const storage = new MemoryStorage()

export { SocketIOTransport }