import type { ReactNode } from 'react'

// Mock VGF client types and functions
export interface MockTransport {
    url: string
    query: Record<string, string>
    onConnect: () => void
    onDisconnect: () => void
    useIncoming: (event: string, handler: (args: unknown[]) => void) => void
    useOutgoing: (event: string, handler: (args: unknown[]) => void) => void
}

export class SocketIOTransportClient implements MockTransport {
    url: string
    query: Record<string, string>
    onConnect: () => void
    onDisconnect: () => void
    
    constructor(options: {
        url: string
        query: Record<string, string>
        onConnect: () => void
        onDisconnect: () => void
    }) {
        this.url = options.url
        this.query = options.query
        this.onConnect = options.onConnect
        this.onDisconnect = options.onDisconnect
    }
    
    useIncoming = vi.fn()
    useOutgoing = vi.fn()
}

// Mock VGF hooks
const mockUseDispatchAction = vi.fn()
const mockUseStateSync = vi.fn()
const mockUsePhase = vi.fn()
const mockUseEvents = vi.fn()

export const getVGFHooks = vi.fn(() => ({
    useDispatchAction: mockUseDispatchAction,
    useStateSync: mockUseStateSync,
    usePhase: mockUsePhase,
    useEvents: mockUseEvents,
}))

// Mock VGF Provider
export const VGFProvider = ({ children, transport }: { children: ReactNode, transport: MockTransport }) => {
    // Mock provider that just renders children
    return children
}

// Export mock functions for test access
export const mockVGFHooks = {
    useDispatchAction: mockUseDispatchAction,
    useStateSync: mockUseStateSync,
    usePhase: mockUsePhase,
    useEvents: mockUseEvents,
}