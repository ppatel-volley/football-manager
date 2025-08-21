import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock UUID
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-123')
}))

import { useUserId } from '../useUserId'

describe('useUserId', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Clear the global localStorage mock
        localStorage.clear()
        vi.clearAllMocks()
    })

    it('should return existing userId from localStorage', async () => {
        const existingUserId = 'existing-user-123'
        vi.mocked(localStorage.getItem).mockReturnValue(existingUserId)

        const { result } = renderHook(() => useUserId())

        await waitFor(() => {
            expect(result.current).toBe(existingUserId)
        })

        expect(localStorage.getItem).toHaveBeenCalledWith('userId')
        expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should generate and store new userId when not in localStorage', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null)

        const { result } = renderHook(() => useUserId())

        await waitFor(() => {
            expect(result.current).toBe('mock-uuid-123')
        })

        expect(localStorage.getItem).toHaveBeenCalledWith('userId')
        expect(localStorage.setItem).toHaveBeenCalledWith('userId', 'mock-uuid-123')
    })

    it('should handle localStorage setItem errors gracefully', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null)
        vi.mocked(localStorage.setItem).mockImplementation(() => {
            throw new Error('Storage quota exceeded')
        })

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useUserId())

        await waitFor(() => {
            expect(result.current).toBe('mock-uuid-123')
        })

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error setting user ID', 
            expect.any(Error)
        )
        expect(result.current).toBe('mock-uuid-123') // Should still set userId even if storage fails

        consoleSpy.mockRestore()
    })

    it('should eventually set userId when not in localStorage', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null)

        const { result } = renderHook(() => useUserId())
        
        // Should eventually get the UUID
        await waitFor(() => {
            expect(result.current).toBe('mock-uuid-123')
        })
        
        expect(localStorage.setItem).toHaveBeenCalledWith('userId', 'mock-uuid-123')
    })

    it('should handle empty string from localStorage', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('')

        const { result } = renderHook(() => useUserId())

        await waitFor(() => {
            expect(result.current).toBe('mock-uuid-123')
        })

        expect(localStorage.setItem).toHaveBeenCalledWith('userId', 'mock-uuid-123')
    })

    it('should only call useEffect once on mount', async () => {
        const existingUserId = 'stable-user-id'
        localStorage.getItem.mockReturnValue(existingUserId)

        const { result, rerender } = renderHook(() => useUserId())

        await waitFor(() => {
            expect(result.current).toBe(existingUserId)
        })

        const callCount = localStorage.getItem.mock.calls.length

        // Rerender shouldn't trigger additional calls
        rerender()
        rerender()

        expect(localStorage.getItem).toHaveBeenCalledTimes(callCount)
    })
})