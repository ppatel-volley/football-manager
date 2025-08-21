import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const FullTimePhase = {
    actions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        restartMatch: (ctx: any): GameState => 
{
            console.info("FullTimePhase.restartMatch - Starting new match")
            
            // Reset to pre-match phase
            return {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                ...ctx.session.state as GameState,
                gameTime: 0,
                footballTime: "00:00",
                footballHalf: 1,
                score: { home: 0, away: 0 },
                ballPossession: null,
                matchPhase: 'pre_match' as GameState['matchPhase'],
                stats: {
                    possessionSeconds: { HOME: 0, AWAY: 0 },
                    shots: { HOME: 0, AWAY: 0 },
                    corners: { HOME: 0, AWAY: 0 }
                }
            }
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
{
        console.info("FullTimePhase.onBegin - Match finished, showing final statistics")
        
        const finalState = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            matchPhase: 'full_time' as GameState['matchPhase'],
            ballPossession: null
        }
        
        // Log final match statistics
        console.info("Final Score:", finalState.score)
        console.info("Final Stats:", finalState.stats)
        
        return finalState
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
{
        console.info("FullTimePhase.onEnd")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // Terminal phase - no automatic transitions
    endIf: () => false,
    
    next: PhaseName.PreMatch, // Can manually restart
} as const satisfies Phase<GameState>