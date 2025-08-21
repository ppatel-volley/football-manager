import type { GameRuleset as VGFGameRuleset } from "@volley/vgf/server"
import type { GameState } from "./GameState"
import type { PhaseName } from "./PhaseName"

// Re-export the actual ruleset for runtime use
export { FootballManagerRuleset } from "../../GameRuleset"

// Define the TypeScript type for the ruleset
export type GameRuleset = VGFGameRuleset<GameState, PhaseName>
