import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import type { PlayerRole, Vector2 } from "../types/Formation"

interface MarkersLayerProps
{
    size: { w: number; h: number }
    grid: { cols: number; rows: number }
    snapToGrid: boolean
    roles: Record<PlayerRole, Vector2>
    onChange: (roles: Record<PlayerRole, Vector2>) => void
}

const roleOrder: PlayerRole[] = ["GK", "LB", "CB_L", "CB_R", "RB", "CM_L", "CM_R", "LW", "RW", "ST_L", "ST_R"]

export const MarkersLayer = ({ size, grid, snapToGrid, roles, onChange }: MarkersLayerProps): ReactNode =>
{
    const [drag, setDrag] = useState<{ role: PlayerRole; offset: Vector2 } | null>(null)

    const px = (v: Vector2) => ({ x: v.x * size.w, y: v.y * size.h })
    const norm = (p: Vector2) => ({ x: Math.min(1, Math.max(0, p.x / size.w)), y: Math.min(1, Math.max(0, p.y / size.h)) })

    const items = useMemo(() => roleOrder.map((r) => ({ role: r, p: roles[r] })), [roles])

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) =>
    {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        for (const { role, p } of items)
        {
            const { x, y } = px(p)
            const dx = mx - x
            const dy = my - y
            if (dx * dx + dy * dy <= 18 * 18)
            {
                setDrag({ role, offset: { x: dx, y: dy } })
                return
            }
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) =>
    {
        if (!drag) return
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const nx = mx - drag.offset.x
        const ny = my - drag.offset.y
        const updatedRoles = { ...roles }
        const target = norm({ x: nx, y: ny })
        updatedRoles[drag.role] = { x: target.x, y: target.y }
        onChange(updatedRoles)
    }

    const handleMouseUp = () =>
    {
        if (drag && snapToGrid)
        {
            const updated = { ...roles }
            const p = updated[drag.role]
            if (p)
            {
                const kx = Math.max(0, Math.min(grid.cols - 1, Math.round(p.x * grid.cols - 0.5)))
                const ky = Math.max(0, Math.min(grid.rows - 1, Math.round(p.y * grid.rows - 0.5)))
                updated[drag.role] = { x: (kx + 0.5) / grid.cols, y: (ky + 0.5) / grid.rows }
                onChange(updated)
            }
        }
        setDrag(null)
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ position: "relative", width: size.w, height: size.h }}
        >
            {items.map(({ role, p }) =>
            {
                const pos = px(p)
                return (
                    <div key={role} style={{ position: "absolute", left: pos.x - 9, top: pos.y - 9 }}>
                        <div
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                background: "#111",
                                border: "2px solid #fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                userSelect: "none",
                                cursor: "grab",
                            }}
                            title={role}
                        >
                            {role}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}


