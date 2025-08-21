import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const HalfTimePhase = {
    actions: {},
    
    onBegin: (ctx) => {
        console.info("HalfTimePhase.onBegin - Half time statistics and team switching")
        
        // Switch team sides and prepare for second half
        return {
            ...ctx.session.state,
            footballHalf: 2,
            matchPhase: 'half_time' as any,
            // Reset ball for second half kickoff
            ball: {
                position: { x: 0.5, y: 0.5 },
                velocity: { x: 0, y: 0 },
                isMoving: false,
                possessor: null
            },
            ballPossession: null
        }
    },
    
    onEnd: (ctx) => {
        console.info("HalfTimePhase.onEnd - Second half begins")
        return ctx.session.state
    },
    
    // Half time lasts 60 seconds (1 minute as per PRD)
    endIf: (ctx) => {
        const halfTimeStart = 2700 // When first half ended
        return ctx.session.state.gameTime >= halfTimeStart + 60
    },
    
    next: PhaseName.SecondHalf,
} as const satisfies Phase<GameState>