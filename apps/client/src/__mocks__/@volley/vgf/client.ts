import type { ReactNode } from 'react'
import { vi } from 'vitest'

// Mock VGF client types and functions
export interface MockTransport
{
    url: string
    query: Record<string, string>
    onConnect: () => void
    onDisconnect: () => void
    useIncoming: (event: string, handler: (args: unknown[]) => void) => void
    useOutgoing: (event: string, handler: (args: unknown[]) => void) => void
}

// Mock function type for vi.fn() to avoid unsafe assignments
type MockFunction = ReturnType<typeof vi.fn>

export class SocketIOTransportClient implements MockTransport
{
    public onConnect: () => void

    public onDisconnect: () => void

    public query: Record<string, string>

    public url: string

    public useIncoming: MockFunction

    public useOutgoing: MockFunction

    constructor(options: {
        url: string
        query: Record<string, string>
        onConnect: () => void
        onDisconnect: () => void
    })
    {
        this.url = options.url
        this.query = options.query
        this.onConnect = options.onConnect
        this.onDisconnect = options.onDisconnect
        this.useIncoming = vi.fn()
        this.useOutgoing = vi.fn()
    }
}

// Mock VGF hooks
const mockUseDispatchAction: MockFunction = vi.fn()
const mockUseStateSync: MockFunction = vi.fn()
const mockUsePhase: MockFunction = vi.fn()
const mockUseEvents: MockFunction = vi.fn()

export const getVGFHooks = vi.fn((): {
    useDispatchAction: MockFunction
    useStateSync: MockFunction
    usePhase: MockFunction
    useEvents: MockFunction
} => ({
    useDispatchAction: mockUseDispatchAction,
    useStateSync: mockUseStateSync,
    usePhase: mockUsePhase,
    useEvents: mockUseEvents,
}))

// Mock VGF Provider
export const VGFProvider = ({ children, transport: _transport }: { children: ReactNode, transport: MockTransport }): ReactNode =>
{
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