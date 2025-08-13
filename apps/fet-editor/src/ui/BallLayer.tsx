import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import type { GridSize } from "../types/EditorDoc"
import type { Vector2 } from "../types/Formation"

interface BallLayerProps
{
    size: { w: number; h: number }
    grid: GridSize
    value: Vector2
    onChange: (v: Vector2) => void
}

export const BallLayer = ({ size, grid, value, onChange }: BallLayerProps): ReactNode =>
{
    const ref = useRef<HTMLDivElement>(null)

    const toPx = (v: Vector2) => ({ x: v.x * size.w, y: v.y * size.h })
    const toNorm = (p: Vector2) => ({ x: Math.min(1, Math.max(0, p.x / size.w)), y: Math.min(1, Math.max(0, p.y / size.h)) })

    const pos = toPx(value)

    const startDrag = (e: React.MouseEvent<HTMLDivElement>) =>
    {
        const container = e.currentTarget.parentElement as HTMLDivElement
        const rect = container.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const localOffset = { x: mx - pos.x, y: my - pos.y }

        const onMove = (me: MouseEvent) =>
        {
            const r = container.getBoundingClientRect()
            const mx2 = me.clientX - r.left
            const my2 = me.clientY - r.top
            const nx = mx2 - localOffset.x
            const ny = my2 - localOffset.y
            onChange(toNorm({ x: nx, y: ny }))
        }
        const onUp = () =>
        {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
        }
        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
    }

    // Draw marker
    useEffect(() =>
    {
        const el = ref.current
        if (!el) return
        el.style.left = `${pos.x - 5}px`
        el.style.top = `${pos.y - 5}px`
    }, [pos.x, pos.y])

    return (
        <div style={{ position: "relative", width: size.w, height: size.h }}>
            <div
                ref={ref}
                onMouseDown={startDrag}
                style={{ position: "absolute", width: 14, height: 14, borderRadius: 7, background: "#fff", border: "2px solid #000", cursor: "grab", zIndex: 100 }}
                title="Ball"
            />
        </div>
    )
}


