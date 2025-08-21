/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameState, PhaseName } from "@game/server"
import { getVGFHooks } from "@volley/vgf/client"

/**
 * VGF Hooks for Football Manager
 * Using runtime-focused approach to bypass TypeScript inference issues
 */

// Create VGF hooks - using any to bypass type inference problems
const vgfHooks = getVGFHooks<any, any, any>()

// Export hooks with proper runtime functionality
export const useDispatchAction = () => {
    const dispatch = vgfHooks.useDispatchAction as any
    return (action: string, payload?: any) => dispatch(action, payload)
}

export const useStateSync = () => {
    const sync = vgfHooks.useStateSync as any
    return sync() || {}
}

export const usePhase = () => {
    const phase = vgfHooks.usePhase as any
    return phase() || "PRE_MATCH"
}

export const useEvents = vgfHooks.useEvents
