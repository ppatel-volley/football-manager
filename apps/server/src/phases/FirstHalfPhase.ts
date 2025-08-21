import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const FirstHalfPhase = {
    actions: {
        // Actions specific to active gameplay
        shootBall: (ctx, team: 'HOME' | 'AWAY') => {
            console.info(`FirstHalfPhase.shootBall - ${team} team shoots`)
            
            // Simulate shot attempt
            const isGoal = Math.random() < 0.1 // 10% chance of goal for simplicity
            
            if (isGoal) {
                return {
                    ...ctx.session.state,
                    score: {
                        ...ctx.session.state.score,
                        [team === 'HOME' ? 'home' : 'away']: ctx.session.state.score[team === 'HOME' ? 'home' : 'away'] + 1
                    }
                }
            }
            
            // Update stats for shot attempt
            return {
                ...ctx.session.state,
                stats: {
                    ...ctx.session.state.stats,
                    shots: {
                        ...ctx.session.state.stats.shots,
                        [team]: ctx.session.state.stats.shots[team] + 1
                    }
                }
            }
        }
    },
    
    reducers: {
        // Phase-specific reducers for match simulation
        simulateGameplay: (state) => {
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
    
    onBegin: (ctx) => {
        console.info("FirstHalfPhase.onBegin - First half active gameplay")
        
        return {
            ...ctx.session.state,
            matchPhase: 'first_half' as any,
            ballPossession: 'HOME' // Home team gets first possession after kickoff
        }
    },
    
    onEnd: (ctx) => {
        console.info("FirstHalfPhase.onEnd - Half time break")
        return ctx.session.state
    },
    
    // End after 45 minutes (2.25 minutes real time in PRD)
    endIf: (ctx) => {
        return ctx.session.state.gameTime >= 2700 // 45 minutes * 60 seconds
    },
    
    next: PhaseName.HalfTime,
} as const satisfies Phase<GameState>

// Helper function for first half time formatting
function formatFirstHalfTime(gameTimeSeconds: number): string {
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (minutes <= 45) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    } else {
        return `45+${minutes - 45}`
    }
}