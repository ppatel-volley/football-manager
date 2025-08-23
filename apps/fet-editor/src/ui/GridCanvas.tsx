import type { ColoredCell,GridCell } from "@game/pitch-ui"
import { GridPitch } from "@game/pitch-ui"
import type { ReactNode } from "react"

interface GridCanvasProps
{
    cols: number
    rows: number
    cell: { w: number; h: number }
    highlightCell?: GridCell | null
    mappedCells?: GridCell[]
    pendingCells?: GridCell[]
    onCopyPaint?: (target: GridCell, source: GridCell) => void
    onClearPaint?: (target: GridCell) => void
    coloredCells?: ColoredCell[]
}

export const GridCanvas = ({ cols, rows, cell, highlightCell, mappedCells, pendingCells, onCopyPaint, onClearPaint, coloredCells }: GridCanvasProps): ReactNode =>
{
    return (
        <GridPitch
            cols={cols}
            rows={rows}
            cell={cell}
            highlightCell={highlightCell}
            mappedCells={mappedCells}
            pendingCells={pendingCells}
            coloredCells={coloredCells}
            showLabels={true}
            onCopyPaint={onCopyPaint}
            onClearPaint={onClearPaint}
        />
    )
}