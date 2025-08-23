import type { ReactNode } from "react"
import { useEffect, useMemo, useRef } from "react"

import { drawPitch, PITCH_COLORS } from "./pitch"

export interface GridCell
{
    c: number
    r: number
}

export interface ColoredCell extends GridCell
{
    color: string
}

interface GridPitchProps
{
    cols: number
    rows: number
    cell: { w: number; h: number }
    highlightCell?: GridCell | null
    mappedCells?: GridCell[]
    pendingCells?: GridCell[]
    coloredCells?: ColoredCell[]
    showLabels?: boolean
    onCellClick?: (cell: GridCell) => void
    onCopyPaint?: (target: GridCell, source: GridCell) => void
    onClearPaint?: (target: GridCell) => void
    className?: string
    style?: React.CSSProperties
}

/**
 * Advanced pitch component with grid overlay and cell interaction
 * Based on FET's GridCanvas but made reusable
 */
export const GridPitch = ({
    cols,
    rows,
    cell,
    highlightCell,
    mappedCells,
    pendingCells,
    coloredCells,
    showLabels = true,
    onCellClick,
    onCopyPaint,
    onClearPaint,
    className,
    style
}: GridPitchProps): ReactNode =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<{ mode: 'none' | 'copy' | 'clear'; source: GridCell | null; last?: string }>({ mode: 'none', source: null })
    const bgRef = useRef<OffscreenCanvas | null>(null)
    const bgSizeRef = useRef<{ w: number; h: number } | null>(null)

    // Draw with an offscreen cached background to avoid full redraw work on every render
    useEffect(() =>
    {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // 1) Build background only when size changes: pitch + grid
        const w = canvas.width
        const h = canvas.height
        const sizeChanged = !bgSizeRef.current || bgSizeRef.current.w !== w || bgSizeRef.current.h !== h

        if (!bgRef.current || sizeChanged)
        {
            const bg = new OffscreenCanvas(w, h)
            const bgctx = bg.getContext("2d")
            if (!bgctx) return
            
            bgctx.clearRect(0, 0, w, h)
            bgctx.fillStyle = PITCH_COLORS.GRASS
            bgctx.fillRect(0, 0, w, h)
            drawPitch(bgctx as unknown as CanvasRenderingContext2D, w, h)
            
            bgctx.strokeStyle = PITCH_COLORS.GRID
            bgctx.lineWidth = 1
            
            for (let c = 0; c <= cols; c++)
            {
                const x = c * cell.w
                bgctx.beginPath()
                bgctx.moveTo(x, 0)
                bgctx.lineTo(x, rows * cell.h)
                bgctx.stroke()
            }
            
            for (let r = 0; r <= rows; r++)
            {
                const y = r * cell.h
                bgctx.beginPath()
                bgctx.moveTo(0, y)
                bgctx.lineTo(cols * cell.w, y)
                bgctx.stroke()
            }
            
            bgRef.current = bg
            bgSizeRef.current = { w, h }
        }

        // 2) Blit background, then dynamic overlays
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (bgRef.current)
        {
            ctx.drawImage(bgRef.current as unknown as HTMLCanvasElement, 0, 0)
        }

        if (coloredCells && coloredCells.length > 0)
        {
            // Render explicit colored cells
            for (const cc of coloredCells)
            {
                ctx.fillStyle = cc.color
                ctx.fillRect(cc.c * cell.w, cc.r * cell.h, cell.w, cell.h)
            }
        }
        else
        {
            // Unified fallback: same styling for mapped and pending
            ctx.fillStyle = "rgba(140, 200, 255, 0.18)"
            
            if (mappedCells && mappedCells.length > 0)
            {
                for (const mc of mappedCells)
                {
                    ctx.fillRect(mc.c * cell.w, mc.r * cell.h, cell.w, cell.h)
                }
            }
            
            if (pendingCells && pendingCells.length > 0)
            {
                for (const pc of pendingCells)
                {
                    ctx.fillRect(pc.c * cell.w, pc.r * cell.h, cell.w, cell.h)
                }
            }
        }

        if (highlightCell)
        {
            // Ball-occupied cell highlight: distinct green shade
            ctx.fillStyle = "rgba(0, 200, 60, 0.32)"
            ctx.fillRect(highlightCell.c * cell.w, highlightCell.r * cell.h, cell.w, cell.h)
        }

        // Axes labels: alphabetic along pitch length (rows, A..), numeric along width (cols, 1..)
        if (showLabels)
        {
            ctx.fillStyle = "#ddd"
            ctx.font = "12px sans-serif"
            
            // Left side row labels (A at top)
            for (let r = 0; r < rows; r++)
            {
                const letter = String.fromCharCode(65 + r) // A,B,C...
                ctx.fillText(letter, 4, r * cell.h + 12)
            }
            
            // Top column labels (1..)
            for (let c = 0; c < cols; c++)
            {
                const num = String(c + 1)
                ctx.fillText(num, c * cell.w + 4, 12)
            }
        }
    }, [cols, rows, cell.h, cell.w, highlightCell, mappedCells, pendingCells, coloredCells, showLabels])

    const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): GridCell | null =>
    {
        const canvas = canvasRef.current
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        if (!Number.isFinite(mx) || !Number.isFinite(my)) return null
        if (cell.w <= 0 || cell.h <= 0) return null
        const c = Math.max(0, Math.min(cols - 1, Math.floor(mx / cell.w)))
        const r = Math.max(0, Math.min(rows - 1, Math.floor(my / cell.h)))
        if (!Number.isFinite(c) || !Number.isFinite(r)) return null
        return { c, r }
    }

    const cellsWithSetting = useMemo(() =>
    {
        const set = new Set<string>()
        for (const m of (mappedCells ?? [])) set.add(`${m.c}_${m.r}`)
        for (const p of (pendingCells ?? [])) set.add(`${p.c}_${p.r}`)
        return set
    }, [mappedCells, pendingCells])

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void =>
    {
        const cellPos = getCellFromEvent(e)
        if (!cellPos) return
        
        if (onCellClick)
        {
            onCellClick(cellPos)
        }

        if (e.button === 0 && onCopyPaint)
        {
            // Left button: start copy paint only if starting cell has mapping
            const key = `${cellPos.c}_${cellPos.r}`
            if (cellsWithSetting.has(key))
            {
                stateRef.current = { mode: 'copy', source: cellPos, last: undefined }
                if (canvasRef.current) canvasRef.current.style.cursor = 'copy'
            }
        }
        else if (e.button === 2 && onClearPaint)
        {
            // Right button: start clear paint
            e.preventDefault()
            stateRef.current = { mode: 'clear', source: null, last: undefined }
            onClearPaint(cellPos)
            stateRef.current.last = `${cellPos.c}_${cellPos.r}`
            if (canvasRef.current) canvasRef.current.style.cursor = 'not-allowed'
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void =>
    {
        const st = stateRef.current
        if (st.mode === 'none') return
        const cellPos = getCellFromEvent(e)
        if (!cellPos) return
        const key = `${cellPos.c}_${cellPos.r}`
        if (st.last === key) return
        
        if (st.mode === 'copy' && st.source && onCopyPaint)
        {
            onCopyPaint(cellPos, st.source)
        }
        else if (st.mode === 'clear' && onClearPaint)
        {
            onClearPaint(cellPos)
        }
        
        stateRef.current.last = key
    }

    const handleMouseUpLeave = (): void =>
    {
        stateRef.current = { mode: 'none', source: null, last: undefined }
        if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>): void =>
    {
        e.preventDefault()
    }

    return (
        <canvas
            ref={canvasRef}
            width={cols * cell.w}
            height={rows * cell.h}
            style={{ 
                background: PITCH_COLORS.GRASS_DARK, 
                border: "2px solid #444",
                ...style
            }}
            className={className}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpLeave}
            onMouseLeave={handleMouseUpLeave}
            onContextMenu={handleContextMenu}
        />
    )
}