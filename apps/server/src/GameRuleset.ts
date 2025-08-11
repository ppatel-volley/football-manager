import type { GameRuleset } from "@volley/vgf/server"

import { HomePhase } from "./phases/HomePhase"
import type { GameState } from "./shared/types/GameState"
import { PhaseName } from "./shared/types/PhaseName"
import { setupGameState } from "./utils/setupGame"

export const DemoGameRuleset = {
    setup: setupGameState,
    actions: {},
    phases: {
        [PhaseName.Home]: HomePhase,
    },
} as const satisfies GameRuleset<GameState>
