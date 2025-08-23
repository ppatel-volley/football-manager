import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { drawPitch, PITCH_COLORS } from "./pitch"

interface PitchCanvasProps
{
    width: number
    height: number
    showGrid?: boolean
    gridCols?: number
    gridRows?: number
    children?: ReactNode
    className?: string
    style?: React.CSSProperties
}

/**
 * Basic pitch canvas component that renders a FIFA-standard football pitch
 */
export const PitchCanvas = ({
    width,
    height,
    showGrid = false,
    gridCols = 20,
    gridRows = 15,
    children,
    className,
    style,
    ...props
}: PitchCanvasProps): ReactNode =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bgRef = useRef<OffscreenCanvas | null>(null)
    const bgSizeRef = useRef<{ w: number; h: number } | null>(null)

    useEffect(() =>
    {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Build background only when size changes: pitch + grid
        const w = canvas.width
        const h = canvas.height
        const sizeChanged = !bgSizeRef.current || bgSizeRef.current.w !== w || bgSizeRef.current.h !== h

        if (!bgRef.current || sizeChanged)
        {
            const bg = new OffscreenCanvas(w, h)
            const bgctx = bg.getContext("2d")
            if (!bgctx) return

            // Clear and draw grass background
            bgctx.clearRect(0, 0, w, h)
            bgctx.fillStyle = PITCH_COLORS.GRASS
            bgctx.fillRect(0, 0, w, h)

            // Draw pitch markings
            drawPitch(bgctx as unknown as CanvasRenderingContext2D, w, h)

            // Draw grid if enabled
            if (showGrid)
            {
                bgctx.strokeStyle = PITCH_COLORS.GRID
                bgctx.lineWidth = 1
                const cellW = w / gridCols
                const cellH = h / gridRows

                for (let c = 0; c <= gridCols; c++)
                {
                    const x = c * cellW
                    bgctx.beginPath()
                    bgctx.moveTo(x, 0)
                    bgctx.lineTo(x, h)
                    bgctx.stroke()
                }

                for (let r = 0; r <= gridRows; r++)
                {
                    const y = r * cellH
                    bgctx.beginPath()
                    bgctx.moveTo(0, y)
                    bgctx.lineTo(w, y)
                    bgctx.stroke()
                }
            }

            bgRef.current = bg
            bgSizeRef.current = { w, h }
        }

        // Draw background
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (bgRef.current)
        {
            ctx.drawImage(bgRef.current as unknown as HTMLCanvasElement, 0, 0)
        }
    }, [width, height, showGrid, gridCols, gridRows])

    return (
        <div
            style={{
                position: "relative",
                width,
                height,
                ...style
            }}
            className={className}
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    background: PITCH_COLORS.GRASS_DARK,
                    border: "2px solid #444",
                    display: "block"
                }}
                {...props}
            />
            {children && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none"
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    )
}