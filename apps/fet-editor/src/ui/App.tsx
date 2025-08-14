import type { ReactNode } from "react"
import { useMemo, useRef, useState } from "react"
import { GridCanvas } from "./GridCanvas"
import { MarkersLayer } from "./MarkersLayer"
import { BallLayer } from "./BallLayer"
import { cellKey } from "../lib/cellKey"
import type { FormationData } from "../types/Formation"
import type { EditorDoc } from "../types/EditorDoc"
import type { PlayerRole, Vector2, Posture } from "../types/Formation"

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
            postures:
            {
                ATTACK: {
                    GK: { x: 0.05, y: 0.5 },
                    LB: { x: 0.22, y: 0.24 },
                    CB_L: { x: 0.22, y: 0.4 },
                    CB_R: { x: 0.22, y: 0.6 },
                    RB: { x: 0.22, y: 0.76 },
                    CM_L: { x: 0.4, y: 0.35 },
                    CM_R: { x: 0.4, y: 0.65 },
                    LW: { x: 0.52, y: 0.3 },
                    RW: { x: 0.52, y: 0.7 },
                    ST_L: { x: 0.6, y: 0.45 },
                    ST_R: { x: 0.6, y: 0.55 },
                },
                BALANCE: {
                    GK: { x: 0.05, y: 0.5 },
                    LB: { x: 0.2, y: 0.2 },
                    CB_L: { x: 0.2, y: 0.4 },
                    CB_R: { x: 0.2, y: 0.6 },
                    RB: { x: 0.2, y: 0.8 },
                    CM_L: { x: 0.35, y: 0.35 },
                    CM_R: { x: 0.35, y: 0.65 },
                    LW: { x: 0.48, y: 0.3 },
                    RW: { x: 0.48, y: 0.7 },
                    ST_L: { x: 0.55, y: 0.45 },
                    ST_R: { x: 0.55, y: 0.55 },
                },
                DEFEND: {
                    GK: { x: 0.05, y: 0.5 },
                    LB: { x: 0.18, y: 0.22 },
                    CB_L: { x: 0.18, y: 0.4 },
                    CB_R: { x: 0.18, y: 0.6 },
                    RB: { x: 0.18, y: 0.78 },
                    CM_L: { x: 0.3, y: 0.38 },
                    CM_R: { x: 0.3, y: 0.62 },
                    LW: { x: 0.4, y: 0.34 },
                    RW: { x: 0.4, y: 0.66 },
                    ST_L: { x: 0.48, y: 0.48 },
                    ST_R: { x: 0.48, y: 0.52 },
                },
            },
        },
        posture: "BALANCE",
        mapping: { ATTACK: {}, BALANCE: {}, DEFEND: {} },
        ball: { x: 0.5, y: 0.5 },
    })
    const [pending, setPending] = useState<Record<string, typeof doc.formation.roles>>({})
    const [paintMode, setPaintMode] = useState<"none" | "copy" | "clear">("none")
    const [paintSource, setPaintSource] = useState<{ c: number; r: number } | null>(null)
    const paintLast = useRef<string | null>(null)
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const [isBallDragging, setIsBallDragging] = useState(false)

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
        setDoc((d) => ({ ...d, formation: { formationId: id, name: id, roles: { ...roles } }, ball: { x: 0.5, y: 0.5 } }))
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
                    // Backfill posture/mapping if older schema loaded
                    const posture: Posture = (maybeDoc as any).posture ?? "BALANCE"
                    const mapping = (maybeDoc as any).mapping
                    const normalizedMapping: EditorDoc["mapping"] = ((): EditorDoc["mapping"] =>
                    {
                        if (mapping && ("ATTACK" in mapping || "BALANCE" in mapping || "DEFEND" in mapping))
                        {
                            return mapping as EditorDoc["mapping"]
                        }
                        return { ATTACK: {}, BALANCE: mapping as any as Record<string, Record<PlayerRole, Vector2>> ?? {}, DEFEND: {} }
                    })()
                    setDoc((d) => ({
                        ...d,
                        ...maybeDoc,
                        posture,
                        mapping: normalizedMapping,
                        ball: { x: 0.5, y: 0.5 },
                    } as EditorDoc))
                    return
                }
                if (maybeFormation && maybeFormation.formationId && maybeFormation.roles)
                {
                    const roles = clampOwnHalf(maybeFormation.roles as Record<PlayerRole, Vector2>)
                    setDoc((d) => ({ ...d, formation: { ...(maybeFormation as FormationData), roles }, ball: { x: 0.5, y: 0.5 } }))
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
        // Build compact export for ATTACK/BALANCE/DEFEND phases
        const phases: Record<string, { zones: number[]; positions: number[]; priorities: number[]; flexibility: number[] }> = {}

        const roleOrder = Object.keys(doc.formation.roles) as PlayerRole[]
        const gridWidth = doc.grid.cols
        const toIndex = (c: number, r: number) => r * gridWidth + c

        const buildPhase = (posture: Posture, base: Record<PlayerRole, Vector2>) =>
        {
            const zones: number[] = []
            const positions: number[] = []
            const priorities: number[] = []
            const flexibility: number[] = []

            const mapping = doc.mapping[posture] ?? {}
            const keys = Object.keys(mapping)
            const pushSet = (set: Record<PlayerRole, Vector2>, zoneIndex: number) =>
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
            if (keys.length === 0)
            {
                pushSet(base, -1)
            }
            else
            {
                for (const k of keys)
                {
                    const [cStr, rStr] = k.split("_")
                    const c = Number.parseInt(cStr ?? "0", 10)
                    const r = Number.parseInt(rStr ?? "0", 10)
                    pushSet(mapping[k]!, toIndex(c, r))
                }
            }
            phases[posture.toLowerCase()] = { zones, positions, priorities, flexibility }
        }

        const bases: Record<Posture, Record<PlayerRole, Vector2>> = {
            ATTACK: doc.formation.postures?.ATTACK ?? doc.formation.roles,
            BALANCE: doc.formation.postures?.BALANCE ?? doc.formation.roles,
            DEFEND: doc.formation.postures?.DEFEND ?? doc.formation.roles,
        }
        buildPhase("ATTACK", bases.ATTACK)
        buildPhase("BALANCE", bases.BALANCE)
        buildPhase("DEFEND", bases.DEFEND)

        const compact = { id: doc.formation.formationId, phases }
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
                            if (found)
                            {
                                const clamped = { ...found.data, roles: clampOwnHalf((found.data as FormationData).roles) }
                                setDoc((d) => ({ ...d, formation: clamped, ball: { x: 0.5, y: 0.5 } }))
                            }
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#bbb" }}>Posture</span>
                        <select
                            value={doc.posture}
                            onChange={(e) =>
                            {
                                const next = e.target.value as Posture
                                setDoc((d) =>
                                {
                                    // On posture switch, if formation has base posture presets, apply as working roles
                                    const base = d.formation.postures?.[next]
                                    return base ? { ...d, posture: next, formation: { ...d.formation, roles: { ...base } } } : { ...d, posture: next }
                                })
                            }}
                            style={{ background: "#222", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "4px 8px" }}
                        >
                            <option value="ATTACK">ATTACK</option>
                            <option value="BALANCE">BALANCE</option>
                            <option value="DEFEND">DEFEND</option>
                        </select>
                        <button
                            onClick={() =>
                            {
                                setDoc((d) =>
                                {
                                    const nextPostures = { ...(d.formation.postures ?? {}) } as NonNullable<typeof d.formation.postures>
                                    nextPostures[d.posture] = { ...d.formation.roles }
                                    return { ...d, formation: { ...d.formation, postures: nextPostures } }
                                })
                            }}
                            title="Save current role positions as the default for this posture"
                        >
                            Save to posture
                        </button>
                    </div>
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
                            setDoc((d) => ({ ...d, mapping: { ...d.mapping, [d.posture]: { ...d.mapping[d.posture], ...pending } } }))
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
                            if (!Object.prototype.hasOwnProperty.call(doc.mapping[doc.posture] ?? {}, key)) return
                            setDoc((d) =>
                            {
                                const nextPostureMap = { ...(d.mapping[d.posture] ?? {}) }
                                delete nextPostureMap[key]
                                return { ...d, mapping: { ...d.mapping, [d.posture]: nextPostureMap } }
                            })
                        }}
                        disabled={!Object.keys(doc.mapping[doc.posture] ?? {}).includes(cellKey(doc.grid, doc.ball!))}
                    >
                        Delete mapping for current cell
                    </button>
                    <span style={{ fontSize: 12, padding: 6, color: Object.keys(doc.mapping[doc.posture] ?? {}).includes(cellKey(doc.grid, doc.ball!)) ? "#0f0" : "#aaa" }}>
                        {Object.keys(doc.mapping[doc.posture] ?? {}).includes(cellKey(doc.grid, doc.ball!)) ? "Committed mapping exists for current cell (this posture)" : Object.keys(pending).includes(cellKey(doc.grid, doc.ball!)) ? "Staged mapping exists for current cell" : "No mapping for current cell"}
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
                <div ref={canvasContainerRef} style={{ position: "relative", width: canvasSize.w, height: canvasSize.h, cursor: paintMode === "copy" ? "copy" : paintMode === "clear" ? "not-allowed" : "auto" }}>
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
                        mappedCells={Object.keys(doc.mapping?.[doc.posture] ?? {}).map((k) =>
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
                        coloredCells={(() =>
                        {
                            // Deterministic color per unique mapping signature (stable across renders)
                            const colorMap = new Map<string, string>()
                            const cells: Array<{ c: number; r: number; color: string }> = []
                            const toSig = (set: Record<PlayerRole, Vector2>) =>
                            {
                                const roles = Object.keys(set).sort() as PlayerRole[]
                                return roles.map((rname) =>
                                {
                                    const p = set[rname]
                                    return `${rname}:${p.x.toFixed(3)},${p.y.toFixed(3)}`
                                }).join("|")
                            }
                            const colorForSig = (sig: string) =>
                            {
                                let h = 2166136261 >>> 0 // FNV offset basis
                                for (let i = 0; i < sig.length; i++)
                                {
                                    h ^= sig.charCodeAt(i)
                                    h = Math.imul(h, 16777619)
                                }
                                const hue = h % 360
                                const sat = 70
                                const light = 72
                                return `hsla(${hue}, ${sat}%, ${light}%, 0.28)`
                            }
                            const pushCell = (k: string, set: Record<PlayerRole, Vector2>) =>
                            {
                                const [cStr, rStr] = k.split("_")
                                const c = Number.parseInt(cStr ?? "0", 10)
                                const r = Number.parseInt(rStr ?? "0", 10)
                                const sig = toSig(set)
                                let color = colorMap.get(sig)
                                if (!color)
                                {
                                    color = colorForSig(sig)
                                    colorMap.set(sig, color)
                                }
                                cells.push({ c, r, color })
                            }
                            for (const k of Object.keys(doc.mapping?.[doc.posture] ?? {}))
                            {
                                pushCell(k, doc.mapping[doc.posture]![k]!)
                            }
                            for (const k of Object.keys(pending ?? {}))
                            {
                                pushCell(k, pending[k]!)
                            }
                            return cells
                        })()}
                        onCopyPaint={(target, source) =>
                        {
                            const keySource = `${source.c}_${source.r}`
                            const keyTarget = `${target.c}_${target.r}`
                            const src = doc.mapping[doc.posture]?.[keySource] ?? pending[keySource]
                            if (!src) return
                            // If painting into the current highlighted ball cell, also apply preview roles
                            const bc = Math.max(0, Math.min(grid.cols - 1, Math.floor((doc.ball?.x ?? 0.5) * grid.cols)))
                            const br = Math.max(0, Math.min(grid.rows - 1, Math.floor((doc.ball?.y ?? 0.5) * grid.rows)))
                            const ballKey = `${bc}_${br}`
                            setDoc((d) => ({
                                ...d,
                                mapping: {
                                    ...d.mapping,
                                    [d.posture]: {
                                        ...(d.mapping[d.posture] ?? {}),
                                        [keyTarget]: { ...src },
                                    },
                                },
                                formation: keyTarget === ballKey ? { ...d.formation, roles: { ...src } } : d.formation,
                            }))
                        }}
                        onClearPaint={(target) =>
                        {
                            const keyTarget = `${target.c}_${target.r}`
                            setDoc((d) =>
                            {
                                const map = { ...(d.mapping[d.posture] ?? {}) }
                                if (!Object.prototype.hasOwnProperty.call(map, keyTarget)) return d
                                delete map[keyTarget]
                                return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
                            })
                        }}
                    />
                    <div
                        style={{ position: "absolute", inset: 0 }}
                        onMouseDown={(e) =>
                        {
                            if (paintMode !== "none" || isBallDragging) return
                            const container = canvasContainerRef.current
                            if (!container) return
                            const rect = container.getBoundingClientRect()
                            const mx = e.clientX - rect.left
                            const my = e.clientY - rect.top
                            const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(mx / cellSize.w)))
                            const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(my / cellSize.h)))
                            const key = `${c}_${r}`
                            if (e.button === 0)
                            {
                                if ((doc.mapping[doc.posture] ?? {})[key] || pending[key])
                                {
                                    setPaintMode("copy")
                                    setPaintSource({ c, r })
                                    paintLast.current = null
                                }
                            }
                            else if (e.button === 2)
                            {
                                e.preventDefault()
                                setPaintMode("clear")
                                setPaintSource(null)
                                // Clear immediately on first cell
                                setDoc((d) =>
                                {
                                    const map = { ...(d.mapping[d.posture] ?? {}) }
                                    if (!Object.prototype.hasOwnProperty.call(map, key)) return d
                                    delete map[key]
                                    return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
                                })
                                paintLast.current = key
                            }
                        }}
                        onMouseMove={(e) =>
                        {
                            if (isBallDragging) return
                            if (paintMode === "none") return
                            const container = canvasContainerRef.current
                            if (!container) return
                            const rect = container.getBoundingClientRect()
                            const mx = e.clientX - rect.left
                            const my = e.clientY - rect.top
                            const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(mx / cellSize.w)))
                            const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(my / cellSize.h)))
                            const key = `${c}_${r}`
                            if (paintLast.current === key) return
                            if (paintMode === "copy" && paintSource)
                            {
                                const srcKey = `${paintSource.c}_${paintSource.r}`
                                const src = (doc.mapping[doc.posture] ?? {})[srcKey] ?? pending[srcKey]
                                if (src)
                                {
                                    setDoc((d) => ({
                                        ...d,
                                        mapping: {
                                            ...d.mapping,
                                            [d.posture]: {
                                                ...(d.mapping[d.posture] ?? {}),
                                                [key]: { ...src },
                                            },
                                        },
                                    }))
                                    paintLast.current = key
                                }
                            }
                            else if (paintMode === "clear")
                            {
                                setDoc((d) =>
                                {
                                    const map = { ...(d.mapping[d.posture] ?? {}) }
                                    if (!Object.prototype.hasOwnProperty.call(map, key)) return d
                                    delete map[key]
                                    paintLast.current = key
                                    return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
                                })
                            }
                        }}
                        onMouseUp={() => { setPaintMode("none"); setPaintSource(null); paintLast.current = null }}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <BallLayer
                            size={canvasSize}
                            grid={grid}
                            value={doc.ball!}
                            onChange={(ball) =>
                            {
                                setDoc((d) =>
                                {
                                    const key = cellKey(d.grid, ball)
                                    const preset = d.mapping[d.posture]?.[key] ?? pending[key]
                                    if (preset)
                                    {
                                        return { ...d, ball, formation: { ...d.formation, roles: { ...preset } } }
                                    }
                                    return { ...d, ball }
                                })
                            }}
                            onDragStart={() => setIsBallDragging(true)}
                            onDragEnd={() => setIsBallDragging(false)}
                        />
                    </div>
                    <div
                        style={{ position: "absolute", inset: 0 }}
                        onMouseDown={(e) =>
                        {
                            if (paintMode !== "none" || isBallDragging) return
                            const container = canvasContainerRef.current
                            if (!container) return
                            const rect = container.getBoundingClientRect()
                            const mx = e.clientX - rect.left
                            const my = e.clientY - rect.top
                            const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(mx / cellSize.w)))
                            const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(my / cellSize.h)))
                            const key = `${c}_${r}`
                            if (e.button === 0)
                            {
                                if ((doc.mapping[doc.posture] ?? {})[key] || pending[key])
                                {
                                    setPaintMode("copy")
                                    setPaintSource({ c, r })
                                    paintLast.current = null
                                }
                            }
                            else if (e.button === 2)
                            {
                                e.preventDefault()
                                setPaintMode("clear")
                                setPaintSource(null)
                                setDoc((d) =>
                                {
                                    const map = { ...(d.mapping[d.posture] ?? {}) }
                                    if (!Object.prototype.hasOwnProperty.call(map, key)) return d
                                    delete map[key]
                                    return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
                                })
                                paintLast.current = key
                            }
                        }}
                        onMouseMove={(e) =>
                        {
                            if (isBallDragging) return
                            if (paintMode === "none") return
                            const container = canvasContainerRef.current
                            if (!container) return
                            const rect = container.getBoundingClientRect()
                            const mx = e.clientX - rect.left
                            const my = e.clientY - rect.top
                            const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(mx / cellSize.w)))
                            const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(my / cellSize.h)))
                            const key = `${c}_${r}`
                            if (paintLast.current === key) return
                            if (paintMode === "copy" && paintSource)
                            {
                                const srcKey = `${paintSource.c}_${paintSource.r}`
                                const src = (doc.mapping[doc.posture] ?? {})[srcKey] ?? pending[srcKey]
                                if (src)
                                {
                                    setDoc((d) => ({
                                        ...d,
                                        mapping: {
                                            ...d.mapping,
                                            [d.posture]: {
                                                ...(d.mapping[d.posture] ?? {}),
                                                [key]: { ...src },
                                            },
                                        },
                                    }))
                                    paintLast.current = key
                                }
                            }
                            else if (paintMode === "clear")
                            {
                                setDoc((d) =>
                                {
                                    const map = { ...(d.mapping[d.posture] ?? {}) }
                                    if (!Object.prototype.hasOwnProperty.call(map, key)) return d
                                    delete map[key]
                                    paintLast.current = key
                                    return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
                                })
                            }
                        }}
                        onMouseUp={() => { setPaintMode("none"); setPaintSource(null); paintLast.current = null }}
                        onContextMenu={(e) => e.preventDefault()}
                    >
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


