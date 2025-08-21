// POC Basic Types for Football Manager

export interface Vector2 {
    x: number
    y: number
}

export interface ButtonCommand {
    type: "ATTACK" | "DEFEND" | "BALANCE" | "SHOOT" | "PASS_SHORT" | "CLEAR"
    timestamp: number
}

export interface BasicTacticalCommand {
    type: "ATTACK" | "DEFEND" | "BALANCE"
    team: "HUMAN" | "AI"
    timestamp: number
}

export enum PlayerState {
    SEEKING_BALL = "seeking_ball",
    MAINTAINING_POSITION = "maintaining_position",
    ATTACKING = "attacking",
    DEFENDING = "defending",
    WAITING_KICKOFF = "waiting_kickoff",
    SWEEPING = "sweeping", // Goalkeeper rushing out to intercept
}

export interface Player {
    id: string
    name: string
    squadNumber: number
    position: Vector2
    targetPosition: Vector2
    team: "RED" | "BLUE"
    playerType: "OUTFIELD" | "GOALKEEPER"
    state: PlayerState
    speed: number
    basePosition: Vector2 // Formation position
    hasBall: boolean
    attributes?: PlayerAttributes
}

export interface Ball {
    position: Vector2
    velocity: Vector2
    isMoving: boolean
    possessor: string | null // Player ID who has the ball
    // Goalkeeper handling (POC simplification)
    inGoalkeeperHands?: boolean
    goalkeeperPossessor?: string | null
    timeInHands?: number
}

export interface Team {
    name: string
    color: "RED" | "BLUE"
    players: Player[]
    tacticalStyle: "ATTACK" | "DEFEND" | "BALANCE"
    isHuman: boolean
}

export interface ScheduledEvent {
    id: string
    playerId: string
    action:
        | "PASS"
        | "PASS_LONG"
        | "CROSS"
        | "SHOOT"
        | "MOVE_FORWARD"
        | "GK_DISTRIBUTE_SHORT"
        | "GK_DISTRIBUTE_LONG"
    executeTime: number // Game time when to execute
}

export interface GameState {
    teams: [Team, Team]
    ball: Ball
    gameTime: number // Seconds elapsed
    isActive: boolean
    score: { home: number; away: number }
    half: 1 | 2
    phase:
        | "KICKOFF"
        | "PLAY"
        | "OUT_OF_PLAY"
        | "THROW_IN"
        | "CORNER_KICK"
        | "GOAL_KICK"
        | "GOAL_SCORED"
        | "HALF_TIME"
    kickoffTeam: "RED" | "BLUE" // Which team is taking kickoff
    initialKickoffTeam: "RED" | "BLUE" // Team that started the match
    scheduledEvents: ScheduledEvent[] // Game-time based events
    restartPosition?: Vector2 | null
    restartTeam?: "RED" | "BLUE" | null
    lastTouchTeam?: "RED" | "BLUE" | null
    stats: MatchStats
}

export interface SimplePassOption {
    targetPlayer: Player
    distance: number
    viability: number // 0-1 score
}

export interface PlayerAttributes {
    pace: number // 0-10
    passing: number // 0-10
    shooting: number // 0-10
    positioning: number // 0-10
}

export interface MatchStats {
    possessionSeconds: { RED: number; BLUE: number }
    shots: { RED: number; BLUE: number }
    corners: { RED: number; BLUE: number }
    throwIns: { RED: number; BLUE: number }
    goalKicks: { RED: number; BLUE: number }
}

// Constants for POC
export const POC_CONFIG = {
    MATCH_DURATION_SECONDS: 300, // 5 minutes real-time
    FIELD_WIDTH: 1600, // Scaled to fit in 1920px canvas (length)
    FIELD_HEIGHT: 1000, // Scaled to fit in 900px canvas with margins (width) - more realistic 1.6:1 ratio
    PLAYER_SPEED: 60, // pixels per second
    BALL_SPEED: 120, // pixels per second
    PLAYERS_PER_TEAM: 11,
    AI_UPDATE_INTERVAL_SECONDS: 1, // AI decisions every 1 second for more responsive play
    RENDER_FPS: 30,
} as const

// Formation positions for 4-4-2 (relative to team side - all players in own half)
export const FORMATION_4_4_2 = [
    // Goalkeeper
    { x: 0.05, y: 0.5, type: "GOALKEEPER" as const },
    // Defenders
    { x: 0.2, y: 0.2, type: "OUTFIELD" as const },
    { x: 0.2, y: 0.4, type: "OUTFIELD" as const },
    { x: 0.2, y: 0.6, type: "OUTFIELD" as const },
    { x: 0.2, y: 0.8, type: "OUTFIELD" as const },
    // Midfielders
    { x: 0.35, y: 0.25, type: "OUTFIELD" as const },
    { x: 0.35, y: 0.45, type: "OUTFIELD" as const },
    { x: 0.35, y: 0.55, type: "OUTFIELD" as const },
    { x: 0.35, y: 0.75, type: "OUTFIELD" as const },
    // Forwards (moved back to stay in own half)
    { x: 0.48, y: 0.35, type: "OUTFIELD" as const },
    { x: 0.48, y: 0.65, type: "OUTFIELD" as const },
] as const
