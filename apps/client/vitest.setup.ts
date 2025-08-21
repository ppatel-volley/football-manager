import { beforeAll, vi } from "vitest"

beforeAll((): void =>
{
    const GLOBAL_TIMEOUT = 10_000 // 10 seconds

    setTimeout((): void =>
    {
        console.error("\n❌ Test suite exceeded global timeout of 10 seconds")
        process.exit(1)
    }, GLOBAL_TIMEOUT)
    
    // Set up default environment variables for tests
    vi.stubEnv('VITE_BACKEND_SERVER_ENDPOINT', 'http://localhost:8080')
    vi.stubEnv('VITE_STAGE', 'test')
    vi.stubEnv('VITE_SEGMENT_WRITE_KEY', 'test-segment-key')
    
    // Mock console.log/info for cleaner test output unless explicitly testing
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    
    // Mock localStorage to prevent "Storage quota exceeded" errors
    const mockStorage = {
        storage: new Map<string, string>(),
        getItem: vi.fn((key: string) => mockStorage.storage.get(key) || null),
        setItem: vi.fn((key: string, value: string): void =>
        {
            mockStorage.storage.set(key, value)
        }),
        removeItem: vi.fn((key: string): void =>
        {
            mockStorage.storage.delete(key)
        }),
        clear: vi.fn((): void =>
        {
            mockStorage.storage.clear()
        }),
        get length(): number
        {
            return mockStorage.storage.size
        },
        key: vi.fn((index: number): string | null =>
        {
            const keys = Array.from(mockStorage.storage.keys())
            return keys[index] || null
        })
    }
    
    Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true
    })
})
