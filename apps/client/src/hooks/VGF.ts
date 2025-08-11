import type { GameRuleset, GameState, PhaseName } from "@game/server"
import { getVGFHooks } from "@volley/vgf/client"

/**
 * NOTE: You should not need to update this file, it's purely to get type safety on the VGF Hooks.
 */

type VGFHooks = ReturnType<
    typeof getVGFHooks<GameRuleset, GameState, PhaseName>
>

type UseDispatchActionHook = VGFHooks["useDispatchAction"]
type UseStateSyncHook = VGFHooks["useStateSync"]
type UsePhaseHook = VGFHooks["usePhase"]
type UseEventsHook = VGFHooks["useEvents"]

const vgfHooks = getVGFHooks<GameRuleset, GameState, PhaseName>()

export const useDispatchAction: UseDispatchActionHook =
    vgfHooks.useDispatchAction
export const useStateSync: UseStateSyncHook = vgfHooks.useStateSync
export const usePhase: UsePhaseHook = vgfHooks.usePhase
export const useEvents: UseEventsHook = vgfHooks.useEvents
