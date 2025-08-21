/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameState, PhaseName } from "@game/server"
import { getVGFHooks } from "@volley/vgf/client"

/**
 * VGF Hooks for Football Manager
 * Properly wrapped VGF hooks that maintain React context
 */

// Get VGF hooks instance
const vgfHooks = getVGFHooks<any, GameState, PhaseName>()

// Export hooks as proper React hooks using the same pattern as VGF example
export const useStateSync = vgfHooks.useStateSync
export const useDispatchAction = vgfHooks.useDispatchAction  
export const useDispatch = vgfHooks.useDispatch
export const usePhase = vgfHooks.usePhase
export const useEvents = vgfHooks.useEvents
