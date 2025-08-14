export type PlayerRole =
    | "GK"
    | "CB_L"
    | "CB_R"
    | "LB"
    | "RB"
    | "CM_L"
    | "CM_R"
    | "LW"
    | "RW"
    | "ST_L"
    | "ST_R"

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


