import type { ReactNode } from "react"
import { useEffect, useMemo, useRef } from "react"

interface GridCanvasProps
{
    cols: number
    rows: number
    cell: { w: number; h: number }
    highlightCell?: { c: number; r: number } | null
    mappedCells?: Array<{ c: number; r: number }>
    pendingCells?: Array<{ c: number; r: number }>
    onCopyPaint?: (target: { c: number; r: number }, source: { c: number; r: number }) => void
    onClearPaint?: (target: { c: number; r: number }) => void
    coloredCells?: Array<{ c: number; r: number; color: string }>
}

export const GridCanvas = ({ cols, rows, cell, highlightCell, mappedCells, pendingCells, onCopyPaint, onClearPaint, coloredCells }: GridCanvasProps): ReactNode =>
{
    const ref = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<{ mode: 'none' | 'copy' | 'clear'; source: { c: number; r: number } | null; last?: string }>({ mode: 'none', source: null })
    const bgRef = useRef<OffscreenCanvas | null>(null)
    const bgSizeRef = useRef<{ w: number; h: number } | null>(null)

    // Draw with an offscreen cached background to avoid full redraw work on every render
    useEffect(() =>
    {
        const canvas = ref.current
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
            bgctx.fillStyle = "#2d8f2d"
            bgctx.fillRect(0, 0, w, h)
            drawPitch(bgctx as unknown as CanvasRenderingContext2D, w, h)
            bgctx.strokeStyle = "#2f7f2f"
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
    }, [cols, rows, cell.h, cell.w, highlightCell, mappedCells, pendingCells, coloredCells])

    const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): { c: number; r: number } | null =>
    {
        const canvas = ref.current
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
        if (e.button === 0)
        {
            // Left button: start copy paint only if starting cell has mapping
            const key = `${cellPos.c}_${cellPos.r}`
            if (cellsWithSetting.has(key))
            {
                stateRef.current = { mode: 'copy', source: cellPos, last: undefined }
                if (ref.current) ref.current.style.cursor = 'copy'
            }
        }
        else if (e.button === 2)
        {
            // Right button: start clear paint
            e.preventDefault()
            stateRef.current = { mode: 'clear', source: null, last: undefined }
            onClearPaint?.(cellPos)
            stateRef.current.last = `${cellPos.c}_${cellPos.r}`
            if (ref.current) ref.current.style.cursor = 'not-allowed'
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
        if (st.mode === 'copy' && st.source)
        {
            onCopyPaint?.(cellPos, st.source)
        }
        else if (st.mode === 'clear')
        {
            onClearPaint?.(cellPos)
        }
        stateRef.current.last = key
    }

    const handleMouseUpLeave = (): void =>
    {
        stateRef.current = { mode: 'none', source: null, last: undefined }
        if (ref.current) ref.current.style.cursor = 'default'
    }

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>): void =>
    {
        e.preventDefault()
    }

    return (
        <canvas
            ref={ref}
            width={cols * cell.w}
            height={rows * cell.h}
            style={{ background: "#0a5d0a", border: "2px solid #444" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpLeave}
            onMouseLeave={handleMouseUpLeave}
            onContextMenu={handleContextMenu}
        />
    )
}

function drawPitch(ctx: CanvasRenderingContext2D, fieldWidth: number, fieldHeight: number): void
{
    // Outer boundary
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, fieldWidth, fieldHeight)

    // Center line
    ctx.beginPath()
    ctx.moveTo(fieldWidth / 2, 0)
    ctx.lineTo(fieldWidth / 2, fieldHeight)
    ctx.stroke()

    // Center circle
    const centerCircleRadius = (0.32 * fieldHeight) / 2 // match 10-yard radius relative to our existing proportions
    ctx.beginPath()
    ctx.arc(fieldWidth / 2, fieldHeight / 2, centerCircleRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Center spot
    ctx.beginPath()
    ctx.arc(fieldWidth / 2, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()

    // Dimensions derived from POC renderer ratios
    const goalWidth = 0.145 * fieldHeight
    const goalAreaDepth = 0.028125 * fieldWidth
    const goalAreaWidth = 0.145 * fieldHeight
    const penaltyAreaDepth = 0.084375 * fieldWidth
    const penaltyAreaWidth = 0.32 * fieldHeight
    const penaltySpotDistance = 0.05625 * fieldWidth
    const goalDepth = 0.009 * fieldWidth
    const cornerRadius = 0.007 * fieldHeight

    const goalY = (fieldHeight - goalWidth) / 2
    const goalAreaY = (fieldHeight - goalAreaWidth) / 2
    const penaltyAreaY = (fieldHeight - penaltyAreaWidth) / 2

    // Left penalty area
    ctx.strokeRect(0, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)
    // Left goal area
    ctx.strokeRect(0, goalAreaY, goalAreaDepth, goalAreaWidth)
    // Left penalty spot
    ctx.beginPath()
    ctx.arc(penaltySpotDistance, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    // Left penalty arc
    ctx.beginPath()
    ctx.arc(penaltySpotDistance, fieldHeight / 2, centerCircleRadius, -Math.PI / 3, Math.PI / 3)
    ctx.stroke()

    // Right penalty area
    ctx.strokeRect(fieldWidth - penaltyAreaDepth, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)
    // Right goal area
    ctx.strokeRect(fieldWidth - goalAreaDepth, goalAreaY, goalAreaDepth, goalAreaWidth)
    // Right penalty spot
    ctx.beginPath()
    ctx.arc(fieldWidth - penaltySpotDistance, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fill()
    // Right penalty arc
    ctx.beginPath()
    ctx.arc(fieldWidth - penaltySpotDistance, fieldHeight / 2, centerCircleRadius, (2 * Math.PI) / 3, (4 * Math.PI) / 3)
    ctx.stroke()

    // Corner arcs
    ctx.beginPath()
    ctx.arc(0, 0, cornerRadius, 0, Math.PI / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, fieldHeight, cornerRadius, -Math.PI / 2, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(fieldWidth, 0, cornerRadius, Math.PI / 2, Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(fieldWidth, fieldHeight, cornerRadius, Math.PI, -Math.PI / 2)
    ctx.stroke()

    // Goals behind the line
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(-goalDepth, goalY, goalDepth, goalWidth)
    ctx.fillRect(fieldWidth, goalY, goalDepth, goalWidth)

    // Goal posts
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(-5, goalY, 5, 8)
    ctx.fillRect(-5, goalY + goalWidth - 8, 5, 8)
    ctx.fillRect(fieldWidth, goalY, 5, 8)
    ctx.fillRect(fieldWidth, goalY + goalWidth - 8, 5, 8)
}


