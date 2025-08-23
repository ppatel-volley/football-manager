import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { MatchPhase } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const PreMatchPhase = {
    actions: {},
    thunks: {},
    reducers: {
        startMatch: (state: GameState): GameState => 
        {
            console.info("PreMatchPhase.startMatch - transitioning to kickoff")
            
            return {
                ...state,
                matchPhase: MatchPhase.KICKOFF
            }
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
    {
        console.info("PreMatchPhase.onBegin - Teams entering pitch")
        
        // Initialize pre-match state
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            gameTime: 0,
            footballTime: "00:00",
            footballHalf: 1,
            matchPhase: MatchPhase.PRE_MATCH
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
    {
        console.info("PreMatchPhase.onEnd - Moving to kickoff")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // Auto-transition after 30 seconds (for demo purposes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endIf: (ctx: any): boolean => 
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state.gameTime >= 30 // 30 seconds
    },
    
    next: PhaseName.Kickoff,
} as const satisfies Phase<GameState>