import type { FormationData, PlayerRole, Posture, Vector2 } from "../types/Formation"

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

const validRoles: PlayerRole[] = [
    "GK", "CB_L", "CB_R", "LB", "RB", "CM_L", "CM_R", "LW", "RW", "ST_L", "ST_R",
]
const validPostures: Posture[] = ["ATTACK", "BALANCE", "DEFEND"]

export function validateFormationData(input: unknown): FormationData | null
{
    if (!input || typeof input !== "object") return null
    const f = input as Partial<FormationData>
    if (typeof f.formationId !== "string" || typeof f.name !== "string") return null
    if (!f.roles || typeof f.roles !== "object") return null
    for (const role of validRoles)
    {
        if (!isVector2((f.roles as Record<string, unknown>)[role])) return null
    }
    if (f.postures)
    {
        if (typeof f.postures !== "object") return null
        for (const p of validPostures)
        {
            const set = (f.postures as Record<string, unknown>)[p]
            if (!set || typeof set !== "object") continue
            const rec = set as Record<PlayerRole, unknown>
            for (const role of validRoles)
            {
                if (!isVector2(rec[role])) return null
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


