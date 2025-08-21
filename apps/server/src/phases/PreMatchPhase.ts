import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const PreMatchPhase = {
    actions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startMatch: (...args: any[]): GameState => 
{
            console.log("🚀 PreMatchPhase.startMatch - transitioning to kickoff")
            console.log("🚀 Arguments received:", args)
            console.log("🚀 Args length:", args.length)
            
            const ctx = args[0]
            console.log("🚀 Context:", ctx)
            console.log("🚀 Context type:", typeof ctx)
            console.log("🚀 Context keys:", Object.keys(ctx || {}))
            
            if (ctx?.session?.state) {
                console.log("🚀 Session state found:", JSON.stringify(ctx.session.state, null, 2))
                
                return {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                ...ctx.session.state as GameState,
                    matchPhase: 'kickoff' as GameState['matchPhase']
                }
            } else {
                console.log("🚀 ERROR: No valid context in PreMatchPhase!")
                throw new Error("Invalid context provided to PreMatchPhase.startMatch")
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
            matchPhase: 'pre_match' as GameState['matchPhase']
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