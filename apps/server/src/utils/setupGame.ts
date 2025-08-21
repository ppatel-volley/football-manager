import { type GameState, PhaseName } from "../shared"

export const setupGameState = (
    setupData: Partial<GameState> = {}
): GameState => {
    // Generate a match seed for deterministic simulation
    const matchSeed = Math.floor(Math.random() * 1000000)
    
    const defaultState: GameState = {
        // Match metadata
        matchId: `match_${Date.now()}`,
        matchSeed,
        gameTime: 0,
        footballTime: "00:00",
        footballHalf: 1,
        
        // Team setup (basic default teams)
        homeTeam: createDefaultTeam('HOME', 'Team Red'),
        awayTeam: createDefaultTeam('AWAY', 'Team Blue'),
        score: { home: 0, away: 0 },
        
        // Ball state
        ball: {
            position: { x: 0.5, y: 0.5 },
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

// Helper function to create default teams
function createDefaultTeam(side: 'HOME' | 'AWAY', name: string) {
    const players = []
    
    // Create 11 players with basic setup
    for (let i = 1; i <= 11; i++) {
        players.push({
            id: `${side}_player_${i}`,
            name: `Player ${i}`,
            squadNumber: i,
            position: { x: side === 'HOME' ? 0.3 : 0.7, y: 0.1 + (i - 1) * 0.08 },
            targetPosition: { x: side === 'HOME' ? 0.3 : 0.7, y: 0.1 + (i - 1) * 0.08 },
            team: side,
            playerType: i === 1 ? 'GOALKEEPER' : 'OUTFIELD',
            hasBall: false,
            attributes: {
                pace: 7.0,
                passing: 7.0,
                shooting: 7.0,
                positioning: 7.0
            }
        })
    }
    
    return {
        id: side.toLowerCase(),
        name,
        players,
        formation: '4-4-2',
        tacticalStyle: 'BALANCE' as const
    }
}
