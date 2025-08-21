import type { BaseGameState } from "@volley/vgf/types"

// Football match state following PRD/TDD specifications
export interface GameState extends BaseGameState {
    // Match metadata
    matchId: string
    matchSeed: number // For deterministic simulation
    gameTime: number  // Seconds elapsed
    footballTime: string // "23:45", "90+2" etc
    footballHalf: 1 | 2
    
    // Team and player data
    homeTeam: Team
    awayTeam: Team
    score: { home: number; away: number }
    
    // Ball state
    ball: Ball
    ballPossession: 'HOME' | 'AWAY' | null
    
    // Match statistics
    stats: MatchStats
    
    // Game flow control
    matchPhase: MatchPhase
    lastTouchTeam?: 'HOME' | 'AWAY' | null
    
    // Voice command processing (Phase 2)
    lastCommand?: TacticalCommand
    commandTimestamp?: number
}

export interface Team {
    id: string
    name: string
    players: Player[]
    formation: string
    tacticalStyle: 'ATTACK' | 'DEFEND' | 'BALANCE'
    captain?: string
}

export interface Player {
    id: string
    name: string
    squadNumber: number
    position: Vector2
    targetPosition: Vector2
    team: 'HOME' | 'AWAY'
    playerType: 'OUTFIELD' | 'GOALKEEPER'
    hasBall: boolean
    attributes: PlayerAttributes
}

export interface Ball {
    position: Vector2
    velocity: Vector2
    isMoving: boolean
    possessor: string | null
    height?: number // For 3D physics simulation
}

export interface Vector2 {
    x: number
    y: number
}

export interface PlayerAttributes {
    pace: number
    passing: number
    shooting: number
    positioning: number
}

export interface MatchStats {
    possessionSeconds: { HOME: number; AWAY: number }
    shots: { HOME: number; AWAY: number }
    corners: { HOME: number; AWAY: number }
}

export interface TacticalCommand {
    type: 'ATTACK' | 'DEFEND' | 'BALANCE' | 'SHOOT' | 'CLOSE_DOWN' | 'LONG_BALL'
    team: 'HOME' | 'AWAY'
    timestamp: number
}

export enum MatchPhase {
    PRE_MATCH = 'pre_match',
    KICKOFF = 'kickoff', 
    FIRST_HALF = 'first_half',
    HALF_TIME = 'half_time',
    SECOND_HALF = 'second_half',
    FULL_TIME = 'full_time'
}
