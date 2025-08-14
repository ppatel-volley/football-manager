import type { FormationData, PlayerRole, Posture, Vector2 } from "./Formation"

export interface GridSize
{
    cols: number
    rows: number
}

export interface EditorDoc
{
    grid: GridSize
    formation: FormationData
    // Current editing posture
    posture: Posture
    // Mapping from grid cell key "c_r" to role positions at that ball location, per posture
    mapping: Record<Posture, Record<string, Record<PlayerRole, Vector2>>>
    // Current ball position (normalised)
    ball?: Vector2
}


