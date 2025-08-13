import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { GridCanvas } from "./GridCanvas"
import { MarkersLayer } from "./MarkersLayer"
import { BallLayer } from "./BallLayer"
import { cellKey } from "../lib/cellKey"
import type { FormationData } from "../types/Formation"
import type { EditorDoc } from "../types/EditorDoc"
import type { PlayerRole, Vector2 } from "../types/Formation"

export const App = (): ReactNode =>
{
    const [grid, setGrid] = useState({ cols: 20, rows: 15 })

    const cellSize = useMemo(() => ({ w: 40, h: 40 }), [])
    const canvasSize = useMemo(() => ({ w: grid.cols * cellSize.w, h: grid.rows * cellSize.h }), [grid, cellSize])

    const [snap, setSnap] = useState(false)
    const clampOwnHalf = (roles: Record<PlayerRole, Vector2>): Record<PlayerRole, Vector2> =>
    {
        const out: Record<PlayerRole, Vector2> = { ...roles }
        const keys = Object.keys(out) as PlayerRole[]
        for (const k of keys)
        {
            const p = out[k]
            out[k] = { x: Math.min(0.48, p.x), y: p.y }
        }
        return out
    }

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
                ST_L: { x: 0.45, y: 0.45 },
                ST_R: { x: 0.45, y: 0.55 },
            },
        },
        mapping: {},
        ball: { x: 0.45, y: 0.5 },
    })
    const [pending, setPending] = useState<Record<string, typeof doc.formation.roles>>({})

    // Load formations from repo folder via Vite glob
    const formationFiles = (import.meta as any).glob("../formations/*.json", { eager: true }) as Record<string, { default: FormationData } | FormationData>
    const availableFormations = useMemo(() =>
    {
        const entries = Object.entries(formationFiles)
        return entries.map(([path, mod]) =>
        {
            const data = (mod as any)?.default ?? mod
            return { path, id: (data as FormationData).formationId, name: (data as FormationData).name, data: data as FormationData }
        })
    }, [])
    const [selectedFormationPath, setSelectedFormationPath] = useState<string>(availableFormations[0]?.path ?? "")

    const presets: Record<string, Record<PlayerRole, Vector2>> = {
        "4-4-2": {
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
        "4-3-3": {
            GK: { x: 0.05, y: 0.5 },
            LB: { x: 0.2, y: 0.2 },
            CB_L: { x: 0.2, y: 0.4 },
            CB_R: { x: 0.2, y: 0.6 },
            RB: { x: 0.2, y: 0.8 },
            // Mid three (use CM_L/CM_R and repurpose ST_R as central mid position)
            CM_L: { x: 0.4, y: 0.38 },
            CM_R: { x: 0.4, y: 0.62 },
            // Wingers higher
            LW: { x: 0.62, y: 0.28 },
            RW: { x: 0.62, y: 0.72 },
            // Centre forward
            ST_L: { x: 0.7, y: 0.5 },
            // Auxiliary mid (use ST_R as CM_C approx)
            ST_R: { x: 0.4, y: 0.5 },
        },
        // Approximations using available roles
        "3-5-2": {
            GK: { x: 0.05, y: 0.5 },
            LB: { x: 0.18, y: 0.3 }, // LCB-ish wing-back deeper
            CB_L: { x: 0.18, y: 0.45 },
            CB_R: { x: 0.18, y: 0.55 },
            RB: { x: 0.18, y: 0.7 }, // RCB-ish wing-back deeper
            CM_L: { x: 0.35, y: 0.38 },
            CM_R: { x: 0.35, y: 0.62 },
            LW: { x: 0.52, y: 0.34 }, // LWB advanced
            RW: { x: 0.52, y: 0.66 }, // RWB advanced
            ST_L: { x: 0.62, y: 0.45 },
            ST_R: { x: 0.62, y: 0.55 },
        },
        "5-3-2": {
            GK: { x: 0.05, y: 0.5 },
            LB: { x: 0.12, y: 0.25 },
            CB_L: { x: 0.12, y: 0.45 },
            CB_R: { x: 0.12, y: 0.55 },
            RB: { x: 0.12, y: 0.75 },
            CM_L: { x: 0.3, y: 0.4 },
            CM_R: { x: 0.3, y: 0.6 },
            LW: { x: 0.22, y: 0.3 }, // LWB deeper
            RW: { x: 0.22, y: 0.7 }, // RWB deeper
            ST_L: { x: 0.55, y: 0.47 },
            ST_R: { x: 0.55, y: 0.53 },
        },
        "4-2-3-1": {
            GK: { x: 0.05, y: 0.5 },
            LB: { x: 0.2, y: 0.25 },
            CB_L: { x: 0.2, y: 0.45 },
            CB_R: { x: 0.2, y: 0.55 },
            RB: { x: 0.2, y: 0.75 },
            CM_L: { x: 0.32, y: 0.42 }, // DM left
            CM_R: { x: 0.32, y: 0.58 }, // DM right
            LW: { x: 0.56, y: 0.35 },
            RW: { x: 0.56, y: 0.65 },
            ST_L: { x: 0.72, y: 0.5 }, // ST
            ST_R: { x: 0.48, y: 0.5 }, // CAM approximation
        },
    }

    const applyPreset = (id: keyof typeof presets) =>
    {
        const preset = presets[id] as Record<PlayerRole, Vector2>
        const roles = clampOwnHalf(preset)
        setDoc((d) => ({ ...d, formation: { formationId: id, name: id, roles: { ...roles } }, ball: { x: 0.45, y: 0.5 } }))
    }

    const exportEditorDoc = () =>
    {
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.editor.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importEditorDoc: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        const file = e.target.files?.[0]
        if (!file) return
        file.text().then((t) => setDoc(JSON.parse(t) as EditorDoc))
    }

    const exportFormation = () =>
    {
        const blob = new Blob([JSON.stringify(doc.formation, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.formation.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importFormation: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        const file = e.target.files?.[0]
        if (!file) return
        file.text().then((t) =>
        {
            try
            {
                const parsed = JSON.parse(t) as unknown
                // Heuristic: if it has grid/mapping it's a full editor doc, otherwise assume FormationData
                const maybeDoc = parsed as Partial<EditorDoc>
                const maybeFormation = parsed as Partial<FormationData>
                if (maybeDoc && maybeDoc.grid && maybeDoc.mapping && maybeDoc.formation)
                {
                    setDoc(maybeDoc as EditorDoc)
                    return
                }
                if (maybeFormation && maybeFormation.formationId && maybeFormation.roles)
                {
                    setDoc((d) => ({ ...d, formation: maybeFormation as FormationData }))
                    return
                }
                // Fallback: ignore
                // eslint-disable-next-line no-console
                console.warn("Unrecognized file format for formation/editor doc import")
            }
            catch (err)
            {
                // eslint-disable-next-line no-console
                console.error("Failed to parse formation file", err)
            }
        })
    }

    // Validation: bounds and overlap
    const validate = useMemo(() =>
    {
        const errors: string[] = []
        const warnings: string[] = []

        const roles = doc.formation.roles
        const keys = Object.keys(roles) as PlayerRole[]
        for (const k of keys)
        {
            const p = roles[k]
            if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)
            {
                errors.push(`${k} out of bounds: (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`)
            }
        }
        // Overlap (minimum distance threshold)
        const minDist = 0.03
        for (let i = 0; i < keys.length; i++)
        {
            for (let j = i + 1; j < keys.length; j++)
            {
                const a = roles[keys[i] as PlayerRole]
                const b = roles[keys[j] as PlayerRole]
                const dx = a.x - b.x
                const dy = a.y - b.y
                const d2 = dx * dx + dy * dy
                if (d2 < minDist * minDist)
                {
                    warnings.push(`${keys[i]} and ${keys[j]} are very close`)
                }
            }
        }
        return { errors, warnings }
    }, [doc.formation.roles])

    // Export compact schema per FET-TDD
    const exportCompact = () =>
    {
        // Map grid cell mappings to compact representation under a single phase "attack"
        const zones: number[] = []
        const positions: number[] = [] // interleaved x,y per role in a fixed order
        const priorities: number[] = []
        const flexibility: number[] = []

        // We will export the current ball cell mapping if present; otherwise export base roles as a single entry (zone -1)
        const baseRoles = doc.formation.roles
        const roleOrder = Object.keys(baseRoles) as PlayerRole[]

        const pushRoleSet = (set: Record<PlayerRole, Vector2>, zoneIndex: number) =>
        {
            zones.push(zoneIndex)
            for (const r of roleOrder)
            {
                const p = set[r]
                positions.push(p.x, p.y)
                priorities.push(5)
                flexibility.push(20)
            }
        }

        const gridWidth = doc.grid.cols
        const gridHeight = doc.grid.rows
        const toIndex = (c: number, r: number) => r * gridWidth + c

        const mappingKeys = Object.keys(doc.mapping)
        if (mappingKeys.length > 0)
        {
            for (const key of mappingKeys)
            {
                const [cStr, rStr] = key.split("_")
                const c = Number.parseInt(cStr ?? "0", 10)
                const r = Number.parseInt(rStr ?? "0", 10)
                const idx = toIndex(c, r)
                const set = doc.mapping[key]
                if (set)
                {
                    pushRoleSet(set, idx)
                }
            }
        }
        else
        {
            // No per-zone mapping; export base formation with virtual zone -1
            pushRoleSet(baseRoles, -1)
        }

        const compact = {
            id: doc.formation.formationId,
            phases:
            {
                attack:
                {
                    zones,
                    positions,
                    priorities,
                    flexibility,
                },
            },
        }

        const blob = new Blob([JSON.stringify(compact, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.compact.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div style={{ display: "flex", height: "100vh", background: "#111", color: "#fff" }}>
            <div style={{ width: 320, padding: 16, borderRight: "2px solid #333" }}>
                <h2 style={{ marginTop: 0 }}>Formation Editor</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ fontSize: 12, color: "#bbb" }}>Template</label>
                    <select
                        value={Object.keys(presets).includes(doc.formation.formationId) ? doc.formation.formationId : ""}
                        onChange={(e) => applyPreset(e.target.value as keyof typeof presets)}
                        style={{ background: "#222", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "4px 8px" }}
                    >
                        <option value="" disabled>Select template…</option>
                        {Object.keys(presets).map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                    <label style={{ fontSize: 12, color: "#bbb", marginLeft: 8 }}>From files</label>
                    <select
                        value={selectedFormationPath}
                        onChange={(e) => setSelectedFormationPath(e.target.value)}
                        style={{ background: "#222", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "4px 8px" }}
                    >
                        {availableFormations.map((f) => (
                            <option key={f.path} value={f.path}>{f.name || f.id || f.path}</option>
                        ))}
                    </select>
                    <button
                        onClick={() =>
                        {
                            const found = availableFormations.find((f) => f.path === selectedFormationPath)
                            if (found) setDoc((d) => ({ ...d, formation: found.data }))
                        }}
                    >
                        Load Selected
                    </button>
                    <button onClick={() => applyPreset("4-4-2")} style={{ fontWeight: doc.formation.formationId === "4-4-2" ? 700 : 400 }}>4-4-2</button>
                    <button onClick={() => applyPreset("4-3-3")} style={{ fontWeight: doc.formation.formationId === "4-3-3" ? 700 : 400 }}>4-3-3</button>
                    <button onClick={() => applyPreset("3-5-2")} style={{ fontWeight: doc.formation.formationId === "3-5-2" ? 700 : 400 }}>3-5-2</button>
                    <button onClick={() => applyPreset("5-3-2")} style={{ fontWeight: doc.formation.formationId === "5-3-2" ? 700 : 400 }}>5-3-2</button>
                    <button onClick={() => applyPreset("4-2-3-1")} style={{ fontWeight: doc.formation.formationId === "4-2-3-1" ? 700 : 400 }}>4-2-3-1</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "#bbb" }}>Formation ID</span>
                        <input
                            value={doc.formation.formationId}
                            onChange={(e) => setDoc((d) => ({ ...d, formation: { ...d.formation, formationId: e.target.value } }))}
                            style={{ background: "#111", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "6px 8px" }}
                        />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "#bbb" }}>Formation Name</span>
                        <input
                            value={doc.formation.name}
                            onChange={(e) => setDoc((d) => ({ ...d, formation: { ...d.formation, name: e.target.value } }))}
                            style={{ background: "#111", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "6px 8px" }}
                        />
                    </label>
                </div>
                <div>
                    <label>Grid: {grid.cols}x{grid.rows}</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={exportFormation}>Save Formation</button>
                    <label style={{ display: "inline-block" }}>
                        <span style={{ padding: 6, border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Load Formation</span>
                        <input type="file" accept="application/json" onChange={importFormation} style={{ display: "none" }} />
                    </label>
                    <button onClick={exportEditorDoc}>Save Editor Doc</button>
                    <label style={{ display: "inline-block" }}>
                        <span style={{ padding: 6, border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Load Editor Doc</span>
                        <input type="file" accept="application/json" onChange={importEditorDoc} style={{ display: "none" }} />
                    </label>
                    <button onClick={exportCompact}>Export Compact</button>
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
                <div style={{ marginTop: 12, padding: 8, background: "#181818", border: "1px solid #333", borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Validation</div>
                    {validate.errors.length === 0 && validate.warnings.length === 0 && (
                        <div style={{ color: "#8f8" }}>No issues detected</div>
                    )}
                    {validate.errors.length > 0 && (
                        <div style={{ color: "#f88", marginBottom: 6 }}>
                            {validate.errors.map((e, i) => (<div key={i}>• {e}</div>))}
                        </div>
                    )}
                    {validate.warnings.length > 0 && (
                        <div style={{ color: "#ff8" }}>
                            {validate.warnings.map((w, i) => (<div key={i}>• {w}</div>))}
                        </div>
                    )}
                </div>
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
                        mappedCells={Object.keys(doc.mapping ?? {}).map((k) =>
                        {
                            const [cStr, rStr] = (k as string).split("_")
                            const c = Number.parseInt(cStr ?? "0", 10)
                            const r = Number.parseInt(rStr ?? "0", 10)
                            return { c, r }
                        })}
                        pendingCells={Object.keys(pending ?? {}).map((k) =>
                        {
                            const [cStr, rStr] = (k as string).split("_")
                            const c = Number.parseInt(cStr ?? "0", 10)
                            const r = Number.parseInt(rStr ?? "0", 10)
                            return { c, r }
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
                                if (doc.ball)
                                {
                                    const key = cellKey(doc.grid, doc.ball)
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


