import type { GameState, Player, Team } from '@game/server'
import { PhaseName } from '@game/server'

// Mock player data
const createMockPlayer = (
    id: string,
    name: string,
    squadNumber: number,
    team: 'HOME' | 'AWAY',
    x: number = 0.5,
    y: number = 0.5,
    playerType: 'OUTFIELD' | 'GOALKEEPER' = 'OUTFIELD'
): Player => ({
    id,
    name,
    squadNumber,
    position: { x, y },
    targetPosition: { x, y },
    team,
    playerType,
    hasBall: false,
    attributes: {
        pace: 75,
        passing: 70,
        shooting: 65,
        positioning: 72
    }
})

// Mock team data
const createMockTeam = (id: string, name: string, teamSide: 'HOME' | 'AWAY'): Team => ({
    id,
    name,
    formation: '4-4-2',
    tacticalStyle: 'BALANCE',
    captain: `${id}-captain`,
    players: [
        // Goalkeeper
        createMockPlayer(`${id}-gk`, `${name} GK`, 1, teamSide, 0.1, 0.5, 'GOALKEEPER'),
        // Defenders
        createMockPlayer(`${id}-def1`, `${name} Def 1`, 2, teamSide, 0.2, 0.2),
        createMockPlayer(`${id}-def2`, `${name} Def 2`, 3, teamSide, 0.2, 0.4),
        createMockPlayer(`${id}-def3`, `${name} Def 3`, 4, teamSide, 0.2, 0.6),
        createMockPlayer(`${id}-def4`, `${name} Def 4`, 5, teamSide, 0.2, 0.8),
        // Midfielders
        createMockPlayer(`${id}-mid1`, `${name} Mid 1`, 6, teamSide, 0.4, 0.3),
        createMockPlayer(`${id}-mid2`, `${name} Mid 2`, 7, teamSide, 0.4, 0.5),
        createMockPlayer(`${id}-mid3`, `${name} Mid 3`, 8, teamSide, 0.4, 0.7),
        createMockPlayer(`${id}-mid4`, `${name} Mid 4`, 9, teamSide, 0.4, 0.9),
        // Forwards
        createMockPlayer(`${id}-fw1`, `${name} FW 1`, 10, teamSide, 0.7, 0.4),
        createMockPlayer(`${id}-fw2`, `${name} FW 2`, 11, teamSide, 0.7, 0.6),
    ]
})

// Base mock game state
export const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    matchId: 'test-match-123',
    matchSeed: 12345,
    gameTime: 0,
    footballTime: '00:00',
    footballHalf: 1,
    homeTeam: createMockTeam('home', 'Manchester United', 'HOME'),
    awayTeam: createMockTeam('away', 'Liverpool FC', 'AWAY'),
    score: { home: 0, away: 0 },
    ball: {
        position: { x: 0.5, y: 0.5 },
        velocity: { x: 0, y: 0 },
        isMoving: false,
        possessor: null
    },
    ballPossession: null,
    stats: {
        possessionSeconds: { HOME: 0, AWAY: 0 },
        shots: { HOME: 0, AWAY: 0 },
        corners: { HOME: 0, AWAY: 0 }
    },
    matchPhase: 'pre_match',
    phase: PhaseName.PreMatch,
    ...overrides
})

// Phase-specific mock states
export const mockGameStates = {
    preMatch: createMockGameState(),
    kickoff: createMockGameState({
        matchPhase: 'kickoff',
        phase: PhaseName.Kickoff
    }),
    firstHalf: createMockGameState({
        matchPhase: 'first_half',
        phase: PhaseName.FirstHalf,
        gameTime: 1200, // 20 minutes
        footballTime: '20:00',
        ballPossession: 'HOME'
    }),
    halfTime: createMockGameState({
        matchPhase: 'half_time',
        phase: PhaseName.HalfTime,
        gameTime: 2700, // 45 minutes
        footballTime: '45:00',
        score: { home: 1, away: 0 }
    }),
    secondHalf: createMockGameState({
        matchPhase: 'second_half',
        phase: PhaseName.SecondHalf,
        gameTime: 3600, // 60 minutes total
        footballTime: '60:00',
        footballHalf: 2,
        score: { home: 1, away: 1 }
    }),
    fullTime: createMockGameState({
        matchPhase: 'full_time',
        phase: PhaseName.FullTime,
        gameTime: 5400, // 90 minutes
        footballTime: '90:00',
        footballHalf: 2,
        score: { home: 2, away: 1 }
    })
}