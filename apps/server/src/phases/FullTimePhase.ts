import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const FullTimePhase = {
    actions: {
        restartMatch: (ctx) => {
            console.info("FullTimePhase.restartMatch - Starting new match")
            
            // Reset to pre-match phase
            return {
                ...ctx.session.state,
                gameTime: 0,
                footballTime: "00:00",
                footballHalf: 1,
                score: { home: 0, away: 0 },
                ballPossession: null,
                matchPhase: 'pre_match' as any,
                stats: {
                    possessionSeconds: { HOME: 0, AWAY: 0 },
                    shots: { HOME: 0, AWAY: 0 },
                    corners: { HOME: 0, AWAY: 0 }
                }
            }
        }
    },
    
    onBegin: (ctx) => {
        console.info("FullTimePhase.onBegin - Match finished, showing final statistics")
        
        const finalState = {
            ...ctx.session.state,
            matchPhase: 'full_time' as any,
            ballPossession: null
        }
        
        // Log final match statistics
        console.info("Final Score:", finalState.score)
        console.info("Final Stats:", finalState.stats)
        
        return finalState
    },
    
    onEnd: (ctx) => {
        console.info("FullTimePhase.onEnd")
        return ctx.session.state
    },
    
    // Terminal phase - no automatic transitions
    endIf: () => false,
    
    next: PhaseName.PreMatch, // Can manually restart
} as const satisfies Phase<GameState>