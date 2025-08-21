import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const SecondHalfPhase = {
    actions: {
        // Same actions as first half
        shootBall: (ctx, team: 'HOME' | 'AWAY') => {
            console.info(`SecondHalfPhase.shootBall - ${team} team shoots`)
            
            // Simulate shot attempt
            const isGoal = Math.random() < 0.1 // 10% chance of goal
            
            if (isGoal) {
                return {
                    ...ctx.session.state,
                    score: {
                        ...ctx.session.state.score,
                        [team === 'HOME' ? 'home' : 'away']: ctx.session.state.score[team === 'HOME' ? 'home' : 'away'] + 1
                    }
                }
            }
            
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
        simulateGameplay: (state) => {
            const newGameTime = state.gameTime + 1
            const possessionTeam = Math.random() < 0.5 ? 'HOME' : 'AWAY'
            
            return {
                ...state,
                gameTime: newGameTime,
                footballTime: formatSecondHalfTime(newGameTime),
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
        console.info("SecondHalfPhase.onBegin - Second half active gameplay")
        
        return {
            ...ctx.session.state,
            matchPhase: 'second_half' as any,
            ballPossession: 'AWAY' // Away team gets possession for second half
        }
    },
    
    onEnd: (ctx) => {
        console.info("SecondHalfPhase.onEnd - Match complete")
        return ctx.session.state
    },
    
    // End after full 90 minutes + stoppage time
    endIf: (ctx) => {
        return ctx.session.state.gameTime >= 5400 // 90 minutes * 60 seconds
    },
    
    next: PhaseName.FullTime,
} as const satisfies Phase<GameState>

function formatSecondHalfTime(gameTimeSeconds: number): string {
    const totalMinutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (totalMinutes <= 90) {
        return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`
    } else {
        return `90+${totalMinutes - 90}`
    }
}