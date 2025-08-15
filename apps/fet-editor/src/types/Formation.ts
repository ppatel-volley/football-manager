// Base position types for flexible formations
export type BasePosition = 
    | "GK"      // Goalkeeper
    | "CB"      // Centre Back
    | "LB"      // Left Back  
    | "RB"      // Right Back
    | "LWB"     // Left Wing Back
    | "RWB"     // Right Wing Back
    | "DM"      // Defensive Midfielder
    | "CM"      // Central Midfielder
    | "AM"      // Attacking Midfielder
    | "LM"      // Left Midfielder
    | "RM"      // Right Midfielder
    | "LW"      // Left Winger
    | "RW"      // Right Winger
    | "CF"      // Centre Forward
    | "ST"      // Striker

// Dynamic player role that can be numbered (e.g., CB_1, CB_2, CB_3)
export type PlayerRole = string

// Helper functions to create numbered positions
export const createPlayerRole = (position: BasePosition, index?: number): PlayerRole =>
{
    return index !== undefined ? `${position}_${index}` : position
}

export const parsePlayerRole = (role: PlayerRole): { position: BasePosition; index?: number } =>
{
    const parts = role.split('_')
    const position = parts[0] as BasePosition
    const index = parts[1] ? parseInt(parts[1], 10) : undefined
    return { position, index }
}

export type Posture = "ATTACK" | "BALANCE" | "DEFEND"

export interface Vector2
{
    x: number // normalised 0..1 across field width
    y: number // normalised 0..1 across field height
}

export interface FormationData
{
    formationId: string
    name: string
    roles: Record<PlayerRole, Vector2>
    // Optional multi-posture base roles. When present, the UI uses these as posture presets.
    postures?: Record<Posture, Record<PlayerRole, Vector2>>
    metadata?: { [k: string]: unknown }
}

// New uber formation data structure
export interface UberFormationData
{
    version: string
    lastModified: string
    formations: Record<string, FormationDefinition>
    kickoffPositions: Record<string, KickoffPositionSet>
}

export interface FormationDefinition
{
    formationId: string
    name: string
    category: FormationCategory
    playerComposition: PlayerRole[] // Defines exactly which players this formation uses
    postures: Record<string, PostureData>
    metadata?: FormationMetadata
}

// Formation templates define the standard player compositions
export const FORMATION_TEMPLATES: Record<string, PlayerRole[]> = {
    "4-4-2": ["GK", "LB", "CB_1", "CB_2", "RB", "LM", "CM_1", "CM_2", "RM", "ST_1", "ST_2"],
    "4-3-3": ["GK", "LB", "CB_1", "CB_2", "RB", "DM", "CM_1", "CM_2", "LW", "RW", "ST"],
    "5-3-2": ["GK", "LWB", "CB_1", "CB_2", "CB_3", "RWB", "CM_1", "CM_2", "CM_3", "ST_1", "ST_2"],
    "3-5-2": ["GK", "CB_1", "CB_2", "CB_3", "LWB", "RWB", "CM_1", "CM_2", "CM_3", "ST_1", "ST_2"],
    "4-2-3-1": ["GK", "LB", "CB_1", "CB_2", "RB", "DM_1", "DM_2", "LW", "AM", "RW", "ST"],
    "3-4-3": ["GK", "CB_1", "CB_2", "CB_3", "LM", "CM_1", "CM_2", "RM", "LW", "ST", "RW"],
}

export interface PostureData
{
    phases: Record<GamePhase, PhaseData>
}

export interface PhaseData
{
    positions: Record<string, ZonePlayerData> // "x12_y8" format
}

export interface ZonePlayerData
{
    players: Record<PlayerRole, PlayerPositionData>
}

export interface PlayerPositionData
{
    x: number // 0.0-1.0 normalised
    y: number // 0.0-1.0 normalised
    priority: number // 1-10 positioning importance
    flexibility: number // 0.0-1.0 deviation allowed
    contextualModifiers?: ContextualModifier[]
}

export interface KickoffPositionSet
{
    formationId: string
    positions: Record<PlayerRole, Vector2>
}

export interface ContextualModifier
{
    condition: ModifierCondition
    positionDelta: { x: number; y: number }
    priorityMultiplier: number
}

export interface ModifierCondition
{
    opponentFormation?: string
    matchSituation?: 'winning' | 'losing' | 'drawing'
    timeRemaining?: number
    playerStamina?: number
}

export interface FormationMetadata
{
    author?: string
    description?: string
    tags?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    effectiveness?: Record<string, number>
}

export type FormationCategory = 'Defensive' | 'Balanced' | 'Attacking'

export type GamePhase = 
    | 'ATTACK'
    | 'DEFEND' 
    | 'TRANSITION_ATTACK'
    | 'TRANSITION_DEFEND'
    | 'SET_PIECE_FOR'
    | 'SET_PIECE_AGAINST'


