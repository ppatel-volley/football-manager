import type { PlayerRole, Vector2 } from "../types/Formation";

export function mirrorPointAcrossVerticalMidline(p: Vector2): Vector2
{
    return { x: 1 - p.x, y: p.y };
}

export function mirrorRolesAcrossVerticalMidline(roles: Record<PlayerRole, Vector2>): Record<PlayerRole, Vector2>
{
    const out: Record<PlayerRole, Vector2> = { ...roles } as Record<PlayerRole, Vector2>;
    const keys = Object.keys(out) as PlayerRole[];
    for (const k of keys)
    {
        out[k] = mirrorPointAcrossVerticalMidline(out[k]);
    }
    return out;
}

export function mirrorCellAcrossVertical(gridCols: number, c: number, r: number): { c: number; r: number }
{
    return { c: Math.max(0, Math.min(gridCols - 1, gridCols - 1 - c)), r };
}

export function mirrorPointAcrossHalfway(p: Vector2): Vector2
{
    return { x: p.x, y: 1 - p.y };
}

export function mirrorRolesAcrossHalfway(roles: Record<PlayerRole, Vector2>): Record<PlayerRole, Vector2>
{
    const out: Record<PlayerRole, Vector2> = { ...roles } as Record<PlayerRole, Vector2>;
    const keys = Object.keys(out) as PlayerRole[];
    for (const k of keys)
    {
        out[k] = mirrorPointAcrossHalfway(out[k]);
    }
    return out;
}

export function mirrorCellAcrossHalfway(gridRows: number, c: number, r: number): { c: number; r: number }
{
    return { c, r: Math.max(0, Math.min(gridRows - 1, gridRows - 1 - r)) };
}


