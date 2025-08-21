import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const PreMatchPhase = {
    actions: {
        startMatch: (ctx) => {
            console.info("PreMatchPhase.startMatch - transitioning to kickoff")
            
            return {
                ...ctx.session.state,
                matchPhase: 'kickoff' as any
            }
        }
    },
    
    onBegin: (ctx) => {
        console.info("PreMatchPhase.onBegin - Teams entering pitch")
        
        // Initialize pre-match state
        return {
            ...ctx.session.state,
            gameTime: 0,
            footballTime: "00:00",
            footballHalf: 1,
            matchPhase: 'pre_match' as any
        }
    },
    
    onEnd: (ctx) => {
        console.info("PreMatchPhase.onEnd - Moving to kickoff")
        return ctx.session.state
    },
    
    // Auto-transition after 30 seconds (for demo purposes)
    endIf: (ctx) => {
        return ctx.session.state.gameTime >= 30 // 30 seconds
    },
    
    next: PhaseName.Kickoff,
} as const satisfies Phase<GameState>