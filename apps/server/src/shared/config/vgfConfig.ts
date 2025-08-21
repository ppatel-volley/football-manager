import { SocketIOTransport as BaseSocketIOTransport } from '@volley/vgf/server'

/**
 * VGF configuration for Football Manager
 */

// Export SocketIOTransport from VGF
export const SocketIOTransport = BaseSocketIOTransport

// VGF storage configuration - will be handled by the transport
export const storage = {
    type: 'redis' as const,
}