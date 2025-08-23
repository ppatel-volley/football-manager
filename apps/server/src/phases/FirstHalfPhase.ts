 
import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { MatchPhase } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const FirstHalfPhase = {
    actions: {},
    thunks: {},
    
    reducers: {
        // Actions specific to active gameplay
        shootBall: (state: GameState, team: 'HOME' | 'AWAY'): GameState => 
        {
            console.info(`FirstHalfPhase.shootBall - ${team} team shoots`)
            
            // Simulate shot attempt
            const isGoal = Math.random() < 0.1 // 10% chance of goal for simplicity
            
            if (isGoal) 
            {
                return {
                    ...state,
                    score: {
                        ...state.score,
                        [team === 'HOME' ? 'home' : 'away']: state.score[team === 'HOME' ? 'home' : 'away'] + 1
                    }
                }
            }
            
            // Update stats for shot attempt
            return {
                ...state,
                stats: {
                    ...state.stats,
                    shots: {
                        ...state.stats.shots,
                        [team]: state.stats.shots[team] + 1
                    }
                }
            }
        },
        
        // Phase-specific reducers for match simulation
        simulateGameplay: (state: GameState): GameState => 
        {
            // Increment game time
            const newGameTime = state.gameTime + 1
            
            // Basic possession simulation
            const possessionTeam = Math.random() < 0.5 ? 'HOME' : 'AWAY'
            
            return {
                ...state,
                gameTime: newGameTime,
                footballTime: formatFirstHalfTime(newGameTime),
                ballPossession: possessionTeam,
                stats: {
                    ...state.stats,
                    possessionSeconds: {
                        ...state.stats.possessionSeconds,
                        [possessionTeam]: state.stats.possessionSeconds[possessionTeam] + 1
                    }
                }
            }
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
    {
        console.info("FirstHalfPhase.onBegin - First half active gameplay")
        
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            matchPhase: MatchPhase.FIRST_HALF,
            ballPossession: 'HOME' // Home team gets first possession after kickoff
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
    {
        console.info("FirstHalfPhase.onEnd - Half time break")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // End after 45 minutes (2.25 minutes real time in PRD)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endIf: (ctx: any): boolean => 
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state.gameTime >= 2700 // 45 minutes * 60 seconds
    },
    
    next: PhaseName.HalfTime,
} as const satisfies Phase<GameState>

// Helper function for first half time formatting
function formatFirstHalfTime(gameTimeSeconds: number): string 
{
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (minutes <= 45) 
{
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
 else 
{
        return `45+${minutes - 45}`
    }
}