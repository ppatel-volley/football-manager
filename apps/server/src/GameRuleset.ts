import type { GameRuleset } from "@volley/vgf/server"

import { FirstHalfPhase } from "./phases/FirstHalfPhase"
import { FullTimePhase } from "./phases/FullTimePhase"
import { HalfTimePhase } from "./phases/HalfTimePhase"
import { KickoffPhase } from "./phases/KickoffPhase"
import { PreMatchPhase } from "./phases/PreMatchPhase"
import { SecondHalfPhase } from "./phases/SecondHalfPhase"
import type { GameState } from "./shared/types/GameState"
import { PhaseName } from "./shared/types/PhaseName"
import { setupGameState } from "./utils/setupGame"
import { processMatchSimulation, setupTacticalChange, processAdvancedShoot, setupMatchRestart, processSubstitution, updateMatchStatistics } from "./thunks/MatchThunks"

export const FootballManagerRuleset = {
    setup: setupGameState,
    
    // Actions that can be called during any phase
    actions: {
        // Tactical commands from voice/button input
        tacticalCommand: (ctx, command: { type: string, team: 'HOME' | 'AWAY' }) => {
            console.log(`Tactical command: ${command.type} for ${command.team}`)
            
            // Update team tactical style
            const updatedState = { ...ctx.session.state }
            
            if (command.team === 'HOME') {
                updatedState.homeTeam = {
                    ...updatedState.homeTeam,
                    tacticalStyle: command.type as 'ATTACK' | 'DEFEND' | 'BALANCE'
                }
            } else {
                updatedState.awayTeam = {
                    ...updatedState.awayTeam, 
                    tacticalStyle: command.type as 'ATTACK' | 'DEFEND' | 'BALANCE'
                }
            }
            
            // Record command for commentary system
            updatedState.lastCommand = {
                type: command.type as any,
                team: command.team,
                timestamp: Date.now()
            }
            
            return updatedState
        },

        // Start match action
        startMatch: (ctx) => {
            console.log('Starting match')
            return {
                ...ctx.session.state,
                matchPhase: 'kickoff' as any
            }
        },

        // Take kickoff action  
        takeKickoff: (ctx) => {
            console.log('Taking kickoff')
            return {
                ...ctx.session.state,
                matchPhase: 'first_half' as any
            }
        },

        // Shoot ball action
        shootBall: (ctx, team: 'HOME' | 'AWAY') => {
            console.log(`${team} team shoots`)
            
            // Simple goal simulation - 10% chance
            const isGoal = Math.random() < 0.1
            
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
        },

        // Restart match action
        restartMatch: (ctx) => {
            console.log('Restarting match')
            return {
                ...ctx.session.state,
                matchPhase: 'pre_match' as any,
                score: { home: 0, away: 0 },
                gameTime: 0,
                footballTime: "00:00",
                footballHalf: 1
            }
        }
    },
    
    // Thunks for complex async operations
    thunks: {
        processMatchSimulation,
        setupTacticalChange,
        processAdvancedShoot,
        setupMatchRestart,
        processSubstitution,
        updateMatchStatistics
    },
    
    // Reducers for simple state updates
    reducers: {
        updateGameTime: (state, newTime: number) => ({
            ...state,
            gameTime: newTime,
            footballTime: formatFootballTime(newTime, state.footballHalf)
        }),
        
        updateScore: (state, team: 'HOME' | 'AWAY') => ({
            ...state,
            score: {
                ...state.score,
                [team === 'HOME' ? 'home' : 'away']: state.score[team === 'HOME' ? 'home' : 'away'] + 1
            }
        }),
        
        updateBallPossession: (state, team: 'HOME' | 'AWAY' | null) => ({
            ...state,
            ballPossession: team
        })
    },
    
    // Game phases following PRD/TDD match flow
    phases: {
        [PhaseName.PreMatch]: PreMatchPhase,
        [PhaseName.Kickoff]: KickoffPhase,
        [PhaseName.FirstHalf]: FirstHalfPhase,
        [PhaseName.HalfTime]: HalfTimePhase,
        [PhaseName.SecondHalf]: SecondHalfPhase,
        [PhaseName.FullTime]: FullTimePhase,
    },
} as const satisfies GameRuleset<GameState>

// Helper function to format game time as football time
function formatFootballTime(gameTimeSeconds: number, half: 1 | 2): string {
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (half === 1) {
        if (minutes <= 45) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`
        } else {
            return `45+${minutes - 45}`
        }
    } else {
        const secondHalfMinutes = minutes - 45 // Assuming first half was exactly 45 minutes
        if (secondHalfMinutes <= 45) {
            return `${45 + secondHalfMinutes}:${seconds.toString().padStart(2, '0')}`
        } else {
            return `90+${secondHalfMinutes - 45}`
        }
    }
}

// Export as both names for compatibility during transition
export const DemoGameRuleset = FootballManagerRuleset
