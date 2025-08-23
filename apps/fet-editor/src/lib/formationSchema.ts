import type { 
    FormationData, 
    PlayerRole, 
    Posture, 
    Vector2, 
    UberFormationData,
    FormationDefinition,
    KickoffPositionSet,
    PostureData,
    PhaseData,
    FormationCategory
} from "../types/Formation"
import { GamePhase } from "../types/Formation"

function isNumber(v: unknown): v is number
{
    return typeof v === "number" && Number.isFinite(v)
}

function isVector2(v: unknown): v is Vector2
{
    if (!v || typeof v !== "object") return false
    const vv = v as { x?: unknown; y?: unknown }
    return isNumber(vv.x) && isNumber(vv.y) && vv.x >= 0 && vv.x <= 1 && vv.y >= 0 && vv.y <= 1
}

// Flexible role validation - any string is now valid for PlayerRole
function isValidPlayerRole(role: string): role is PlayerRole {
    return typeof role === "string" && role.length > 0
}
const validPostures: Posture[] = ["ATTACK", "BALANCE", "DEFEND"]
const validGamePhases: GamePhase[] = [
    GamePhase.DEFENDING, GamePhase.NEUTRAL, GamePhase.ATTACKING, GamePhase.SET_PIECE
]
const validFormationCategories: FormationCategory[] = ["Defensive", "Balanced", "Attacking"]

export function validateFormationData(input: unknown): FormationData | null
{
    if (!input || typeof input !== "object") return null
    const f = input as Partial<FormationData>
    if (typeof f.formationId !== "string" || typeof f.name !== "string") return null
    if (!f.roles || typeof f.roles !== "object") return null
    // Validate that all roles are valid and have Vector2 positions
    for (const [role, position] of Object.entries(f.roles as Record<string, unknown>))
    {
        if (!isValidPlayerRole(role) || !isVector2(position)) return null
    }
    if (f.postures)
    {
        if (typeof f.postures !== "object") return null
        for (const p of validPostures)
        {
            const set = (f.postures as Record<string, unknown>)[p]
            if (!set || typeof set !== "object") continue
            const rec = set as Record<PlayerRole, unknown>
            // Validate posture roles flexibly
            for (const [role, position] of Object.entries(rec))
            {
                if (!isValidPlayerRole(role) || !isVector2(position)) return null
            }
        }
    }
    return f as FormationData
}

export function validateEditorDoc(input: unknown): boolean
{
    if (!input || typeof input !== "object") return false
    const d = input as { grid?: unknown; formation?: unknown; mapping?: unknown; posture?: unknown; ball?: unknown }
    const grid = d.grid as { cols?: unknown; rows?: unknown }
    if (!grid || !isNumber(grid.cols) || !isNumber(grid.rows)) return false
    if (!validateFormationData(d.formation)) return false
    if (d.ball && !isVector2(d.ball)) return false
    if (!d.mapping || typeof d.mapping !== "object") return false
    return true
}

export function validateUberFormationData(input: unknown): UberFormationData | null
{
    if (!input || typeof input !== "object") return null
    const uber = input as Partial<UberFormationData>
    
    // Check required top-level fields
    if (typeof uber.version !== "string" || typeof uber.lastModified !== "string") return null
    if (!uber.formations || typeof uber.formations !== "object") return null
    if (!uber.kickoffPositions || typeof uber.kickoffPositions !== "object") return null
    
    // Validate each formation
    for (const [formationId, formation] of Object.entries(uber.formations))
    {
        if (!validateFormationDefinition(formation)) {
            console.error(`Failed to validate formation: ${formationId}`, formation)
            return null
        }
        if (formation.formationId !== formationId) {
            console.error(`Formation ID mismatch: ${formationId} !== ${formation.formationId}`)
            return null
        }
    }
    
    // Validate each kickoff position set
    for (const [formationId, kickoffSet] of Object.entries(uber.kickoffPositions))
    {
        if (!validateKickoffPositionSet(kickoffSet)) return null
        if (kickoffSet.formationId !== formationId) return null
    }
    
    return uber as UberFormationData
}

export function validateFormationDefinition(input: unknown): FormationDefinition | null
{
    if (!input || typeof input !== "object") return null
    const def = input as Partial<FormationDefinition>
    
    if (typeof def.formationId !== "string" || typeof def.name !== "string") return null
    if (!validFormationCategories.includes(def.category as FormationCategory)) return null
    if (!def.postures || typeof def.postures !== "object") return null
    
    // Validate playerComposition (optional field for backwards compatibility)
    if (def.playerComposition) {
        if (!Array.isArray(def.playerComposition)) return null
        for (const role of def.playerComposition) {
            if (!isValidPlayerRole(role)) return null
        }
    }
    
    // Validate postures
    for (const [postureName, postureData] of Object.entries(def.postures))
    {
        if (!validatePostureData(postureData)) return null
    }
    
    return def as FormationDefinition
}

export function validateKickoffPositionSet(input: unknown): KickoffPositionSet | null
{
    if (!input || typeof input !== "object") return null
    const kickoff = input as Partial<KickoffPositionSet>
    
    if (typeof kickoff.formationId !== "string") return null
    if (!kickoff.positions || typeof kickoff.positions !== "object") return null
    
    // Validate all player roles have positions (flexible validation)
    for (const [role, position] of Object.entries(kickoff.positions as Record<string, unknown>))
    {
        if (!isValidPlayerRole(role) || !isVector2(position)) return null
    }
    
    return kickoff as KickoffPositionSet
}

function validatePostureData(input: unknown): PostureData | null
{
    if (!input || typeof input !== "object") return null
    const posture = input as Partial<PostureData>
    
    if (!posture.phases || typeof posture.phases !== "object") return null
    
    // Validate phases
    for (const [phaseName, phaseData] of Object.entries(posture.phases))
    {
        if (!validGamePhases.includes(phaseName as GamePhase)) return null
        if (!validatePhaseData(phaseData)) return null
    }
    
    return posture as PostureData
}

function validatePhaseData(input: unknown): PhaseData | null
{
    if (!input || typeof input !== "object") return null
    const phase = input as Partial<PhaseData>
    
    if (!phase.positions || typeof phase.positions !== "object") return null
    
    // Validate zone data - each zone should have valid player positions
    for (const [zoneId, zoneData] of Object.entries(phase.positions))
    {
        // Zone ID should match pattern "x##_y##"
        if (!/^x\d+_y\d+$/.test(zoneId)) return null
        
        if (!zoneData || typeof zoneData !== "object") return null
        const zone = zoneData as { players?: unknown }
        
        if (!zone.players || typeof zone.players !== "object") return null
        
        // Validate player positions in this zone (flexible roles)
        for (const [playerRole, positionData] of Object.entries(zone.players))
        {
            if (!isValidPlayerRole(playerRole)) return null
            
            const pos = positionData as any
            if (!isVector2({ x: pos.x, y: pos.y })) return null
            if (!isNumber(pos.priority) || pos.priority < 1 || pos.priority > 10) return null
            if (!isNumber(pos.flexibility) || pos.flexibility < 0 || pos.flexibility > 1) return null
        }
    }
    
    return phase as PhaseData
}


