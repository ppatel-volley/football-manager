import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

interface GridCanvasProps
{
    cols: number
    rows: number
    cell: { w: number; h: number }
    highlightCell?: { c: number; r: number } | null
    mappedCells?: Array<{ c: number; r: number }>
    pendingCells?: Array<{ c: number; r: number }>
}

export const GridCanvas = ({ cols, rows, cell, highlightCell, mappedCells, pendingCells }: GridCanvasProps): ReactNode =>
{
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() =>
    {
        const canvas = ref.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // Pitch background
        ctx.fillStyle = "#2d8f2d"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Pitch lines (All dimensions proportional to canvas size)
        drawPitch(ctx, canvas.width, canvas.height)

        // Grid overlay
        ctx.strokeStyle = "#2f7f2f"
        ctx.lineWidth = 1

        for (let c = 0; c <= cols; c++)
        {
            const x = c * cell.w
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, rows * cell.h)
            ctx.stroke()
        }

        for (let r = 0; r <= rows; r++)
        {
            const y = r * cell.h
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(cols * cell.w, y)
            ctx.stroke()
        }

        if (mappedCells && mappedCells.length > 0)
        {
            ctx.fillStyle = "rgba(0, 150, 255, 0.12)"
            for (const mc of mappedCells)
            {
                ctx.fillRect(mc.c * cell.w, mc.r * cell.h, cell.w, cell.h)
            }
        }

        if (pendingCells && pendingCells.length > 0)
        {
            ctx.fillStyle = "rgba(0, 255, 100, 0.12)"
            for (const pc of pendingCells)
            {
                ctx.fillRect(pc.c * cell.w, pc.r * cell.h, cell.w, cell.h)
            }
        }

        if (highlightCell)
        {
            ctx.fillStyle = "rgba(255,255,0,0.15)"
            ctx.fillRect(highlightCell.c * cell.w, highlightCell.r * cell.h, cell.w, cell.h)
        }
    }, [cols, rows, cell.h, cell.w, highlightCell?.c, highlightCell?.r, mappedCells?.length, pendingCells?.length])

    return (
        <canvas
            ref={ref}
            width={cols * cell.w}
            height={rows * cell.h}
            style={{ background: "#0a5d0a", border: "2px solid #444" }}
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


