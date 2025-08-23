import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { MatchPhase } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const HalfTimePhase = {
    actions: {},
    thunks: {},
    reducers: {},
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
{
        console.info("HalfTimePhase.onBegin - Half time statistics and team switching")
        
        // Switch team sides and prepare for second half
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            footballHalf: 2,
            matchPhase: MatchPhase.HALF_TIME,
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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
{
        console.info("HalfTimePhase.onEnd - Second half begins")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // Half time lasts 60 seconds (1 minute as per PRD)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endIf: (ctx: any): boolean => 
{
        const halfTimeStart = 2700 // When first half ended
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state.gameTime >= halfTimeStart + 60
    },
    
    next: PhaseName.SecondHalf,
} as const satisfies Phase<GameState>