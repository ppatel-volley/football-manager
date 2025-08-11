import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared"
import { PhaseName } from "../shared/types/PhaseName"

export const HomePhase = {
    actions: {},
    onBegin: (ctx) => {
        console.info("HomePhase.onBegin", ctx.session.state)

        return ctx.session.state
    },
    onEnd: (ctx) => {
        console.info("HomePhase.onEnd", ctx.session.state)

        return ctx.session.state
    },
    endIf: () => false,
    next: PhaseName.Home,
} as const satisfies Phase<GameState>
