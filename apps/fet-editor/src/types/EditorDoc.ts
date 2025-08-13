import type { FormationData, PlayerRole, Vector2 } from "./Formation"

export interface GridSize
{
    cols: number
    rows: number
}

export interface EditorDoc
{
    grid: GridSize
    formation: FormationData
    // Mapping from grid cell key "c_r" to role positions at that ball location
    mapping: Record<string, Record<PlayerRole, Vector2>>
    // Current ball position (normalised)
    ball?: Vector2
}


