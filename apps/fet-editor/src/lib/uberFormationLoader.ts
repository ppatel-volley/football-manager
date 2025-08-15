import type { 
    UberFormationData, 
    FormationDefinition, 
    KickoffPositionSet,
    PlayerRole,
    Vector2 
} from "../types/Formation"
import { validateUberFormationData } from "./formationSchema"

// Import the uber formations data
import uberFormationsJson from "../formations.json"

let cachedUberData: UberFormationData | null = null

export function getUberFormationData(): UberFormationData | null
{
    if (cachedUberData) return cachedUberData
    
    const validated = validateUberFormationData(uberFormationsJson)
    if (!validated) 
    {
        console.error("Failed to validate uber formation data", uberFormationsJson)
        return null
    }
    
    console.log("Successfully loaded uber formation data:", validated)
    
    cachedUberData = validated
    return cachedUberData
}

export function getAvailableFormations(): Array<{ id: string; name: string; category: string }>
{
    const uberData = getUberFormationData()
    if (!uberData) return []
    
    return Object.values(uberData.formations).map(formation => ({
        id: formation.formationId,
        name: formation.name,
        category: formation.category
    }))
}

export function getFormationById(formationId: string): FormationDefinition | null
{
    const uberData = getUberFormationData()
    if (!uberData) return null
    
    return uberData.formations[formationId] || null
}

export function getKickoffPositions(formationId: string): Record<PlayerRole, Vector2> | null
{
    const uberData = getUberFormationData()
    if (!uberData) return null
    
    const kickoffSet = uberData.kickoffPositions[formationId]
    return kickoffSet?.positions || null
}

export function getFormationKickoffPositions(formationId: string): KickoffPositionSet | null
{
    const uberData = getUberFormationData()
    if (!uberData) return null
    
    return uberData.kickoffPositions[formationId] || null
}

// Convert simplified base roles from the old formation files to the new uber structure
export function convertLegacyFormationToKickoff(
    formationId: string,
    name: string,
    roles: Record<PlayerRole, Vector2>
): { formation: FormationDefinition; kickoff: KickoffPositionSet } | null
{
    // This is a utility for migration - creates basic formation data
    const formation: FormationDefinition = {
        formationId,
        name,
        category: "Balanced",
        postures: {
            BALANCE: {
                phases: {
                    ATTACK: {
                        positions: {
                            "x10_y7": { // Middle of the pitch
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: pos.x,
                                        y: pos.y,
                                        priority: 8,
                                        flexibility: 0.3
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    },
                    DEFEND: {
                        positions: {
                            "x5_y7": { // Defensive third
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: Math.max(0.05, pos.x - 0.05), // Pull back slightly
                                        y: pos.y,
                                        priority: 8,
                                        flexibility: 0.2
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    },
                    TRANSITION_ATTACK: {
                        positions: {
                            "x8_y7": {
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: pos.x,
                                        y: pos.y,
                                        priority: 7,
                                        flexibility: 0.4
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    },
                    TRANSITION_DEFEND: {
                        positions: {
                            "x7_y7": {
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: Math.max(0.05, pos.x - 0.02),
                                        y: pos.y,
                                        priority: 7,
                                        flexibility: 0.3
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    },
                    SET_PIECE_FOR: {
                        positions: {
                            "x15_y7": {
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: Math.min(0.95, pos.x + 0.1),
                                        y: pos.y,
                                        priority: 6,
                                        flexibility: 0.2
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    },
                    SET_PIECE_AGAINST: {
                        positions: {
                            "x3_y7": {
                                players: Object.entries(roles).reduce((acc, [role, pos]) => {
                                    acc[role as PlayerRole] = {
                                        x: Math.max(0.05, pos.x - 0.1),
                                        y: pos.y,
                                        priority: 9,
                                        flexibility: 0.1
                                    }
                                    return acc
                                }, {} as any)
                            }
                        }
                    }
                }
            }
        }
    }
    
    const kickoff: KickoffPositionSet = {
        formationId,
        positions: roles
    }
    
    return { formation, kickoff }
}