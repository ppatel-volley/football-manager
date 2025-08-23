import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { MatchPhase } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const KickoffPhase = {
    actions: {},
    thunks: {},
    reducers: {
        takeKickoff: (state: GameState): GameState => 
        {
            console.info("KickoffPhase.takeKickoff - Ball is in play")
            
            return {
                ...state,
                ball: {
                    ...state.ball,
                    isMoving: true,
                    possessor: null // Ball is loose after kickoff
                },
                ballPossession: null
            }
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
    {
        console.info("KickoffPhase.onBegin - Preparing for kickoff")
        
        // Set up kickoff positions
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            ball: {
                position: { x: 0.5, y: 0.5 }, // Center of pitch
                velocity: { x: 0, y: 0 },
                isMoving: false,
                possessor: null
            },
            matchPhase: MatchPhase.KICKOFF
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
    {
        console.info("KickoffPhase.onEnd - First half begins")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // Transition after kickoff is taken or timeout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endIf: (ctx: any): boolean => 
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return ctx.session.state.ball.isMoving || ctx.session.state.gameTime >= 35
    },
    
    next: PhaseName.FirstHalf,
} as const satisfies Phase<GameState>