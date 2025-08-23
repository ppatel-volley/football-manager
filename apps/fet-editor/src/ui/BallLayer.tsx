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
    onDragStart?: () => void
    onDragEnd?: () => void
    containerRef?: React.RefObject<HTMLDivElement>
}

export const BallLayer = ({ size, grid: _grid, value, onChange, onDragStart, onDragEnd, containerRef }: BallLayerProps): ReactNode =>
{
    const ref = useRef<HTMLDivElement>(null)
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
    const DOT_SIZE = 22
    const DOT_RADIUS = DOT_SIZE / 2

    const toPx = (v: Vector2): { x: number; y: number } => ({ x: v.x * size.w, y: v.y * size.h })
    const toNorm = (p: { x: number; y: number }): { x: number; y: number } => ({ x: Math.min(1, Math.max(0, p.x / size.w)), y: Math.min(1, Math.max(0, p.y / size.h)) })

    const pos = toPx(value)

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void =>
    {
        e.stopPropagation()
        e.preventDefault()
        const container = (containerRef?.current ?? (e.currentTarget.parentElement as HTMLDivElement))
        const rect = container.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        setDragOffset({ x: mx - pos.x, y: my - pos.y })
        if (onDragStart) onDragStart()
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void =>
    {
        if (!dragOffset) return
        const container = (containerRef?.current ?? (e.currentTarget as HTMLDivElement))
        const rect = container.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const nx = mx - dragOffset.x
        const ny = my - dragOffset.y
        onChange(toNorm({ x: nx, y: ny }))
    }

    const handleMouseUp = (): void =>
    {
        if (!dragOffset) return
        setDragOffset(null)
        if (onDragEnd) onDragEnd()
    }

    // Draw marker
    useEffect(() =>
    {
        const el = ref.current
        if (!el) return
        el.style.left = `${pos.x - DOT_RADIUS}px`
        el.style.top = `${pos.y - DOT_RADIUS}px`
    }, [pos.x, pos.y, DOT_RADIUS])

    return (
        <div
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: dragOffset ? "auto" : "none" }}
        >
            <div
                ref={ref}
                onMouseDown={handleMouseDown}
                style={{ position: "absolute", width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_RADIUS, background: "#fff", border: "2px solid #000", cursor: dragOffset ? "grabbing" : "grab", zIndex: 100, pointerEvents: "auto" }}
                title="Ball"
            />
        </div>
    )
}


