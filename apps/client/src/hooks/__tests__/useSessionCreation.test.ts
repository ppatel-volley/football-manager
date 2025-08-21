import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock useUserId hook
vi.mock('../useUserId', () => ({
    useUserId: vi.fn(() => 'mock-user-id-123')
}))

// Mock VGF SocketIOTransportClient
const mockTransport = {
    url: '',
    query: {},
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    useIncoming: vi.fn(),
    useOutgoing: vi.fn(),
}

vi.mock('@volley/vgf/client', () => ({
    SocketIOTransportClient: vi.fn(() => mockTransport)
}))

// Mock fetch
global.fetch = vi.fn()

// Mock window methods
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost:3000',
        search: '',
    },
    writable: true,
})

Object.defineProperty(window, 'history', {
    value: {
        replaceState: vi.fn(),
    },
    writable: true,
})

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
    private params: Record<string, string> = {}
    
    constructor(search: string = '') {
        if (search.startsWith('?')) {
            search = search.substring(1)
        }
        if (search) {
            const pairs = search.split('&')
            pairs.forEach(pair => {
                const [key, value] = pair.split('=')
                if (key && value) {
                    this.params[decodeURIComponent(key)] = decodeURIComponent(value)
                }
            })
        }
    }
    
    get(key: string) {
        return this.params[key] || null
    }
    
    set(key: string, value: string) {
        this.params[key] = value
    }
}

// Mock URL constructor
global.URL = class URL {
    searchParams: URLSearchParams
    href: string
    
    constructor(url: string) {
        this.href = url
        const [base, search] = url.split('?')
        this.searchParams = new URLSearchParams(search || '')
    }
    
    toString() {
        const params = []
        for (const [key, value] of Object.entries((this.searchParams as any).params)) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        }
        const queryString = params.length > 0 ? `?${params.join('&')}` : ''
        return `${this.href.split('?')[0]}${queryString}`
    }
}

// Mock environment variables
vi.stubEnv('VITE_BACKEND_SERVER_ENDPOINT', 'http://localhost:8080')
vi.stubEnv('VITE_STAGE', 'test')

import { useSessionCreation } from '../useSessionCreation'
import { useUserId } from '../useUserId'
import { SocketIOTransportClient } from '@volley/vgf/client'

const mockUseUserId = vi.mocked(useUserId)
const MockSocketIOTransportClient = vi.mocked(SocketIOTransportClient)

describe('useSessionCreation', () => {
    const mockSetSessionId = vi.fn()
    const mockFetch = vi.mocked(fetch)
    
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockClear()
        MockSocketIOTransportClient.mockClear()
        mockSetSessionId.mockClear()
        window.location.search = ''
        vi.clearAllTimers()
    })

    it('should return undefined when sessionId is not provided', () => {
        const { result } = renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(result.current).toBeUndefined()
    })

    it('should return undefined when userId is not available', () => {
        mockUseUserId.mockReturnValue(undefined)
        
        const { result } = renderHook(() => 
            useSessionCreation({ 
                sessionId: 'test-session-123', 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(result.current).toBeUndefined()
    })

    it('should create SocketIO transport when sessionId and userId are available', () => {
        mockUseUserId.mockReturnValue('test-user-123')
        
        const { result } = renderHook(() => 
            useSessionCreation({ 
                sessionId: 'test-session-123', 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(MockSocketIOTransportClient).toHaveBeenCalledWith({
            url: 'http://localhost:8080',
            query: {
                sessionId: 'test-session-123',
                userId: 'test-user-123',
            },
            onConnect: expect.any(Function),
            onDisconnect: expect.any(Function),
        })
        
        expect(result.current).toBe(mockTransport)
    })

    it('should extract sessionId from URL parameters on mount', () => {
        window.location.search = '?sessionId=url-session-123'
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(mockSetSessionId).toHaveBeenCalledWith('url-session-123')
    })

    it('should create new session in local development environment', async () => {
        vi.stubEnv('VITE_STAGE', 'local')
        
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ sessionId: 'new-session-123' }),
        } as Response)
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/session',
                { method: 'POST' }
            )
        })
        
        expect(mockSetSessionId).toHaveBeenCalledWith('new-session-123')
        expect(window.history.replaceState).toHaveBeenCalledWith(
            {},
            '',
            'http://localhost:3000?sessionId=new-session-123'
        )
    })

    it('should not create session in non-local environments', () => {
        vi.stubEnv('VITE_STAGE', 'production')
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle session creation API errors gracefully', async () => {
        vi.stubEnv('VITE_STAGE', 'local')
        
        mockFetch.mockRejectedValueOnce(new Error('Network error'))
        
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Unable to create game and set party ID',
                { error: expect.any(Error) }
            )
        })
        
        consoleSpy.mockRestore()
    })

    it('should handle non-Error thrown objects in session creation', async () => {
        vi.stubEnv('VITE_STAGE', 'local')
        
        mockFetch.mockRejectedValueOnce('String error')
        
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: null, 
                setSessionId: mockSetSessionId 
            })
        )
        
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Unable to create game and set party ID',
                { error: expect.any(Error) }
            )
        })
        
        consoleSpy.mockRestore()
    })

    it('should configure transport event handlers', () => {
        mockUseUserId.mockReturnValue('test-user-123')
        
        renderHook(() => 
            useSessionCreation({ 
                sessionId: 'test-session-123', 
                setSessionId: mockSetSessionId 
            })
        )
        
        expect(mockTransport.useIncoming).toHaveBeenCalledWith(
            'message',
            expect.any(Function)
        )
        expect(mockTransport.useOutgoing).toHaveBeenCalledWith(
            'message',
            expect.any(Function)
        )
    })

    it('should recreate transport when sessionId or userId changes', () => {
        mockUseUserId.mockReturnValue('test-user-123')
        
        const { rerender } = renderHook(
            ({ sessionId }) => useSessionCreation({ 
                sessionId, 
                setSessionId: mockSetSessionId 
            }),
            { initialProps: { sessionId: 'session-1' } }
        )
        
        expect(MockSocketIOTransportClient).toHaveBeenCalledTimes(1)
        
        rerender({ sessionId: 'session-2' })
        
        expect(MockSocketIOTransportClient).toHaveBeenCalledTimes(2)
    })

    it('should not recreate transport when other props change', () => {
        mockUseUserId.mockReturnValue('test-user-123')
        
        const { rerender } = renderHook(
            ({ setSessionId }) => useSessionCreation({ 
                sessionId: 'test-session-123', 
                setSessionId 
            }),
            { initialProps: { setSessionId: mockSetSessionId } }
        )
        
        expect(MockSocketIOTransportClient).toHaveBeenCalledTimes(1)
        
        const newSetSessionId = vi.fn()
        rerender({ setSessionId: newSetSessionId })
        
        // Should not recreate transport since sessionId and userId haven't changed
        expect(MockSocketIOTransportClient).toHaveBeenCalledTimes(1)
    })
})