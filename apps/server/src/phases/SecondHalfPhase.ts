import type { Phase } from "@volley/vgf/server"

import type { GameState } from "../shared/types/GameState"
import { MatchPhase } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

export const SecondHalfPhase = {
    actions: {},
    thunks: {},
    
    reducers: {
        // Same actions as first half
        shootBall: (state: GameState, team: 'HOME' | 'AWAY'): GameState => 
        {
            console.info(`SecondHalfPhase.shootBall - ${team} team shoots`)
            
            // Simulate shot attempt
            const isGoal = Math.random() < 0.1 // 10% chance of goal
            
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
        
        simulateGameplay: (state: GameState): GameState => 
        {
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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBegin: (ctx: any): GameState => 
{
        console.info("SecondHalfPhase.onBegin - Second half active gameplay")
        
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...ctx.session.state as GameState,
            matchPhase: MatchPhase.SECOND_HALF,
            ballPossession: 'AWAY' // Away team gets possession for second half
        }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEnd: (ctx: any): GameState => 
{
        console.info("SecondHalfPhase.onEnd - Match complete")
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state as GameState
    },
    
    // End after full 90 minutes + stoppage time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endIf: (ctx: any): boolean => 
{
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return ctx.session.state.gameTime >= 5400 // 90 minutes * 60 seconds
    },
    
    next: PhaseName.FullTime,
} as const satisfies Phase<GameState>

function formatSecondHalfTime(gameTimeSeconds: number): string 
{
    const totalMinutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (totalMinutes <= 90) 
{
        return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`
    }
 else 
{
        return `90+${totalMinutes - 90}`
    }
}