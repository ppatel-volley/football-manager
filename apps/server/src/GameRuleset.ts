import type { GameRuleset } from "@volley/vgf/server"

import { FirstHalfPhase } from "./phases/FirstHalfPhase"
import { FullTimePhase } from "./phases/FullTimePhase"
import { HalfTimePhase } from "./phases/HalfTimePhase"
import { KickoffPhase } from "./phases/KickoffPhase"
import { PreMatchPhase } from "./phases/PreMatchPhase"
import { SecondHalfPhase } from "./phases/SecondHalfPhase"
import type { GameState } from "./shared/types/GameState"
import { MatchPhase } from "./shared/types/GameState"
import { PhaseName } from "./shared/types/PhaseName"
import {
    processAdvancedShoot,
    processMatchSimulation,
    processSubstitution,
    setupMatchRestart,
    setupTacticalChange,
    updateMatchStatistics,
} from "./thunks/MatchThunks"
import { setupGameState } from "./utils/setupGame"

export const FootballManagerRuleset = {
    setup: setupGameState,
    
    // Actions are empty in new VGF - use reducers instead
    actions: {},
    
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
        // Tactical commands from voice/button input
        tacticalCommand: (state: GameState, command: { type: string; team: 'HOME' | 'AWAY' }): GameState => 
        {
            console.log(`Tactical command: ${command.type} for ${command.team}`)
            
            const updatedState = { ...state }
            
            if (command.team === 'HOME') 
            {
                updatedState.homeTeam = {
                    ...updatedState.homeTeam,
                    tacticalStyle: command.type as 'ATTACK' | 'DEFEND' | 'BALANCE'
                }
            } 
            else 
            {
                updatedState.awayTeam = {
                    ...updatedState.awayTeam, 
                    tacticalStyle: command.type as 'ATTACK' | 'DEFEND' | 'BALANCE'
                }
            }
            
            // Record command for commentary system
            updatedState.lastCommand = {
                type: command.type as 'ATTACK' | 'DEFEND' | 'BALANCE',
                team: command.team,
                timestamp: Date.now()
            }
            
            return updatedState
        },

        // Start match
        startMatch: (state: GameState): GameState => 
        {
            console.log('Starting match')
            return {
                ...state,
                matchPhase: MatchPhase.KICKOFF
            }
        },

        // Take kickoff
        takeKickoff: (state: GameState): GameState => 
        {
            console.log('Taking kickoff')
            return {
                ...state,
                matchPhase: MatchPhase.FIRST_HALF
            }
        },

        // Shoot ball
        shootBall: (state: GameState, team: 'HOME' | 'AWAY'): GameState => 
        {
            console.log(`${team} team shoots`)
            
            // Simple goal simulation - 10% chance
            const isGoal = Math.random() < 0.1
            
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

        // Restart match
        restartMatch: (state: GameState): GameState => 
        {
            console.log('Restarting match')
            return {
                ...state,
                matchPhase: MatchPhase.PRE_MATCH,
                score: { home: 0, away: 0 },
                gameTime: 0,
                footballTime: "00:00",
                footballHalf: 1
            }
        },

        updateGameTime: (state: GameState, newTime: number): GameState => ({
            ...state,
            gameTime: newTime,
            footballTime: formatFootballTime(newTime, state.footballHalf)
        }),
        
        updateScore: (state: GameState, team: 'HOME' | 'AWAY'): GameState => ({
            ...state,
            score: {
                ...state.score,
                [team === 'HOME' ? 'home' : 'away']: state.score[team === 'HOME' ? 'home' : 'away'] + 1
            }
        }),
        
        updateBallPossession: (state: GameState, team: 'HOME' | 'AWAY' | null): GameState => ({
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
function formatFootballTime(gameTimeSeconds: number, half: 1 | 2): string
{
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    
    if (half === 1)
    {
        if (minutes <= 45)
        {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
        else
        {
            return `45+${minutes - 45}`
        }
    }
    else
    {
        const secondHalfMinutes = minutes - 45 // Assuming first half was exactly 45 minutes
        if (secondHalfMinutes <= 45)
        {
            return `${45 + secondHalfMinutes}:${seconds.toString().padStart(2, '0')}`
        }
        else
        {
            return `90+${secondHalfMinutes - 45}`
        }
    }
}

// Export as both names for compatibility during transition
export const DemoGameRuleset = FootballManagerRuleset
