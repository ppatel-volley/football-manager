import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { GridCanvas } from "./GridCanvas"
import { MarkersLayer } from "./MarkersLayer"
import { BallLayer } from "./BallLayer"
import { cellKey } from "../lib/cellKey"
import type { FormationData } from "../types/Formation"
import type { EditorDoc } from "../types/EditorDoc"

export const App = (): ReactNode =>
{
    const [grid, setGrid] = useState({ cols: 20, rows: 15 })

    const cellSize = useMemo(() => ({ w: 40, h: 40 }), [])
    const canvasSize = useMemo(() => ({ w: grid.cols * cellSize.w, h: grid.rows * cellSize.h }), [grid, cellSize])

    const [snap, setSnap] = useState(false)
    const [doc, setDoc] = useState<EditorDoc>({
        grid,
        formation: {
            formationId: "4-4-2-poc",
            name: "4-4-2 POC",
            roles: {
                GK: { x: 0.05, y: 0.5 },
                LB: { x: 0.2, y: 0.2 },
                CB_L: { x: 0.2, y: 0.4 },
                CB_R: { x: 0.2, y: 0.6 },
                RB: { x: 0.2, y: 0.8 },
                CM_L: { x: 0.35, y: 0.35 },
                CM_R: { x: 0.35, y: 0.65 },
                LW: { x: 0.48, y: 0.3 },
                RW: { x: 0.48, y: 0.7 },
                ST_L: { x: 0.6, y: 0.45 },
                ST_R: { x: 0.6, y: 0.55 },
            },
        },
        mapping: {},
        ball: { x: 0.5, y: 0.5 },
    })
    const [pending, setPending] = useState<Record<string, typeof doc.formation.roles>>({})

    const exportJson = () =>
    {
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.editor.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importJson: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        const file = e.target.files?.[0]
        if (!file) return
        file.text().then((t) => setDoc(JSON.parse(t) as EditorDoc))
    }

    return (
        <div style={{ display: "flex", height: "100vh", background: "#111", color: "#fff" }}>
            <div style={{ width: 320, padding: 16, borderRight: "2px solid #333" }}>
                <h2 style={{ marginTop: 0 }}>Formation Editor (POC)</h2>
                <div>
                    <label>Grid: {grid.cols}x{grid.rows}</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={exportJson}>Export</button>
                    <label style={{ display: "inline-block" }}>
                        <span style={{ padding: 6, border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Import</span>
                        <input type="file" accept="application/json" onChange={importJson} style={{ display: "none" }} />
                    </label>
                    <button
                        onClick={() =>
                        {
                            if (!doc.ball) return
                            const key = cellKey(doc.grid, doc.ball)
                            setPending((p) => ({ ...p, [key]: { ...doc.formation.roles } }))
                        }}
                    >
                        Stage mapping for ball cell
                    </button>
                    <button
                        onClick={() =>
                        {
                            // Commit all pending into mapping
                            setDoc((d) => ({ ...d, mapping: { ...d.mapping, ...pending } }))
                            setPending({})
                        }}
                        disabled={Object.keys(pending).length === 0}
                    >
                        Commit all staged cells
                    </button>
                    <button
                        onClick={() =>
                        {
                            if (!doc.ball) return
                            const key = cellKey(doc.grid, doc.ball)
                            if (!Object.prototype.hasOwnProperty.call(doc.mapping, key)) return
                            setDoc((d) =>
                            {
                                const next = { ...d.mapping }
                                delete next[key]
                                return { ...d, mapping: next }
                            })
                        }}
                        disabled={!Object.keys(doc.mapping).includes(cellKey(doc.grid, doc.ball!))}
                    >
                        Delete mapping for current cell
                    </button>
                    <span style={{ fontSize: 12, padding: 6, color: Object.keys(doc.mapping).includes(cellKey(doc.grid, doc.ball!)) ? "#0f0" : "#aaa" }}>
                        {Object.keys(doc.mapping).includes(cellKey(doc.grid, doc.ball!)) ? "Committed mapping exists for current cell" : Object.keys(pending).includes(cellKey(doc.grid, doc.ball!)) ? "Staged mapping exists for current cell" : "No mapping for current cell"}
                    </span>
                </div>
                <div style={{ marginTop: 12 }}>
                    <label>
                        <input type="checkbox" checked={snap} onChange={(ev) => setSnap(ev.target.checked)} /> Snap to grid on release
                    </label>
                </div>
                <p style={{ fontSize: 12, color: "#aaa" }}>Phase 2A scope shell. Canvas shows grid; next steps: drag/drop players, export schema.</p>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ position: "relative", width: canvasSize.w, height: canvasSize.h }}>
                    <GridCanvas
                        cols={grid.cols}
                        rows={grid.rows}
                        cell={cellSize}
                        highlightCell={(() =>
                        {
                            const c = Math.max(0, Math.min(grid.cols - 1, Math.floor((doc.ball?.x ?? 0.5) * grid.cols)))
                            const r = Math.max(0, Math.min(grid.rows - 1, Math.floor((doc.ball?.y ?? 0.5) * grid.rows)))
                            return { c, r }
                        })()}
                        mappedCells={Object.keys(doc.mapping).map((k) =>
                        {
                            const [c, r] = k.split("_")
                            return { c: parseInt(c, 10), r: parseInt(r, 10) }
                        })}
                        pendingCells={Object.keys(pending).map((k) =>
                        {
                            const [c, r] = k.split("_")
                            return { c: parseInt(c, 10), r: parseInt(r, 10) }
                        })}
                    />
                    <div style={{ position: "absolute", inset: 0 }}>
                        <BallLayer
                            size={canvasSize}
                            grid={grid}
                            value={doc.ball!}
                            onChange={(ball) =>
                            {
                                setDoc((d) =>
                                {
                                    const key = cellKey(d.grid, ball)
                                    const preset = d.mapping[key] ?? pending[key]
                                    if (preset)
                                    {
                                        return { ...d, ball, formation: { ...d.formation, roles: { ...preset } } }
                                    }
                                    return { ...d, ball }
                                })
                            }}
                        />
                    </div>
                    <div style={{ position: "absolute", inset: 0 }}>
                        <MarkersLayer
                            size={canvasSize}
                            grid={grid}
                            snapToGrid={snap}
                            roles={doc.formation.roles}
                            onChange={(roles) =>
                            {
                                setDoc((d) => ({ ...d, formation: { ...d.formation, roles } }))
                                // Stage edit into pending for current ball cell automatically
                                if (d.ball)
                                {
                                    const key = cellKey(d.grid, d.ball)
                                    setPending((p) => ({ ...p, [key]: roles }))
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}


