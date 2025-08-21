import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const KickoffPhase = {
    actions: {
        takeKickoff: (ctx) => {
            console.info("KickoffPhase.takeKickoff - Ball is in play")
            
            return {
                ...ctx.session.state,
                ball: {
                    ...ctx.session.state.ball,
                    isMoving: true,
                    possessor: null // Ball is loose after kickoff
                },
                ballPossession: null
            }
        }
    },
    
    onBegin: (ctx) => {
        console.info("KickoffPhase.onBegin - Preparing for kickoff")
        
        // Set up kickoff positions
        return {
            ...ctx.session.state,
            ball: {
                position: { x: 0.5, y: 0.5 }, // Center of pitch
                velocity: { x: 0, y: 0 },
                isMoving: false,
                possessor: null
            },
            matchPhase: 'kickoff' as any
        }
    },
    
    onEnd: (ctx) => {
        console.info("KickoffPhase.onEnd - First half begins")
        return ctx.session.state
    },
    
    // Transition after kickoff is taken or timeout
    endIf: (ctx) => {
        return ctx.session.state.ball.isMoving || ctx.session.state.gameTime >= 35
    },
    
    next: PhaseName.FirstHalf,
} as const satisfies Phase<GameState>