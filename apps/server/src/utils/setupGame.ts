import { type GameState, PhaseName } from "../shared"
import { PlayerDatabaseManager } from "../database/PlayerDatabaseManager"

export const setupGameState = (
    setupData: Partial<GameState> = {}
): GameState => {
    // Generate a match seed for deterministic simulation
    const matchSeed = Math.floor(Math.random() * 1000000)
    
    // Initialize player database with match seed for deterministic generation
    const playerDB = new PlayerDatabaseManager(matchSeed)
    const homeTeamPlayers = playerDB.generateTeam('Team Red', 'HOME', '4-4-2')
    const awayTeamPlayers = playerDB.generateTeam('Team Blue', 'AWAY', '4-4-2')
    
    const defaultState: GameState = {
        // Match metadata
        matchId: `match_${Date.now()}`,
        matchSeed,
        gameTime: 0,
        footballTime: "00:00",
        footballHalf: 1,
        
        // Team setup using player database
        homeTeam: {
            id: 'home',
            name: 'Team Red',
            players: homeTeamPlayers,
            formation: '4-4-2',
            tacticalStyle: 'BALANCE'
        },
        awayTeam: {
            id: 'away', 
            name: 'Team Blue',
            players: awayTeamPlayers,
            formation: '4-4-2',
            tacticalStyle: 'BALANCE'
        },
        score: { home: 0, away: 0 },
        
        // Ball state using FIFA coordinates
        ball: {
            position: { x: 0.5, y: 0.5 }, // Centre spot
            velocity: { x: 0, y: 0 },
            isMoving: false,
            possessor: null
        },
        ballPossession: null,
        
        // Match statistics
        stats: {
            possessionSeconds: { HOME: 0, AWAY: 0 },
            shots: { HOME: 0, AWAY: 0 },
            corners: { HOME: 0, AWAY: 0 }
        },
        
        // Game flow
        matchPhase: 'pre_match' as any,
        phase: PhaseName.PreMatch,
    }

    return {
        ...defaultState,
        ...setupData,
    }
}

// Note: createDefaultTeam function removed - now using PlayerDatabaseManager
