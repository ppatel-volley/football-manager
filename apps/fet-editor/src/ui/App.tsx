import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

import { cellKey } from "../lib/cellKey"
import { computeGhostRoles, ensureInitialStagedCell } from "../lib/ghost"
import type { EditorDoc } from "../types/EditorDoc"
import type { FormationData } from "../types/Formation"
import type { PlayerRole, Posture,Vector2 } from "../types/Formation"
import { ControlsPanel } from "./ControlsPanel"
import { EditorCanvas } from "./EditorCanvas"
import { usePaintHandlers } from "./hooks/usePaintHandlers"

export const App = (): ReactNode =>
{
    const grid = useMemo(() => ({ cols: 20, rows: 15 }), [])

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
    const [showGhostOpposition, setShowGhostOpposition] = useState<boolean>(false)
    const [showMirrorLegend, setShowMirrorLegend] = useState<boolean>(true)
    const ghostRoles = useMemo(() => computeGhostRoles(doc, pending), [doc, pending])
    const [isBallDragging, setIsBallDragging] = useState(false)

    // Load formations from repo folder via Vite glob (declare type via `as` for TS)
    const formationFiles = (import.meta as unknown as { glob: <T = unknown>(p: string, opts: { eager: boolean }) => Record<string, T> })
        .glob<FormationData | { default: FormationData }>("../formations/*.json", { eager: true })
    const normalizeFormationModule = (m: FormationData | { default: FormationData }): FormationData =>
    {
        return ("default" in m ? m.default : m)
    }
    const availableFormations = useMemo(() =>
    {
        const entries = Object.entries(formationFiles)
        return entries.map(([path, mod]) =>
        {
            const data = mod as FormationData | { default: FormationData }
            const resolved: FormationData = normalizeFormationModule(data)
            return { path, id: resolved.formationId, name: resolved.name, data: resolved }
        })
    }, [formationFiles])
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

    const applyPreset = (id: keyof typeof presets): void =>
    {
        const preset = presets[id] as Record<PlayerRole, Vector2>
        const roles = clampOwnHalf(preset)
        setDoc((d) => ({ ...d, formation: { formationId: id, name: id, roles: { ...roles } }, ball: { x: 0.5, y: 0.5 } }))
    }

    const exportProject = (): void =>
    {
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.project.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importProject: React.ChangeEventHandler<HTMLInputElement> = (e): void =>
    {
        const file = e.target.files?.[0]
        if (!file) return
        void file.text().then((t) => setDoc(JSON.parse(t) as EditorDoc)).catch(() => {})
    }

    const exportFormation = (): void =>
    {
        const blob = new Blob([JSON.stringify(doc.formation, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.formation.formationId}.formation.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importFormation: React.ChangeEventHandler<HTMLInputElement> = (e): void =>
    {
        const file = e.target.files?.[0]
        if (!file) return
        void file.text().then((t) =>
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
                    const posture: Posture = (maybeDoc as { posture?: Posture }).posture ?? "BALANCE"
                    const mapping = (maybeDoc as { mapping?: unknown }).mapping
                    const normalizedMapping: EditorDoc["mapping"] = ((): EditorDoc["mapping"] =>
                    {
                        if (mapping && ("ATTACK" in (mapping as Record<string, unknown>) || "BALANCE" in (mapping as Record<string, unknown>) || "DEFEND" in (mapping as Record<string, unknown>)))
                        {
                            return mapping as EditorDoc["mapping"]
                        }
                        return { ATTACK: {}, BALANCE: (mapping as Record<string, Record<PlayerRole, Vector2>>) ?? {}, DEFEND: {} }
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
                    const roles = clampOwnHalf(maybeFormation.roles)
                    setDoc((d) => ({ ...d, formation: { ...(maybeFormation as FormationData), roles }, ball: { x: 0.5, y: 0.5 } }))
                    return
                }
                // Fallback: ignore

                console.warn("Unrecognized file format for formation/editor doc import")
            }
            catch (err)
            {

                console.error("Failed to parse formation file", err)
            }
        }).catch(() => {})
    }

    // Validation removed from panel in this refactor; will reintroduce in a dedicated module later

    // Export compact schema per FET-TDD
    const exportCompact = (): void =>
    {
        // Build compact export for ATTACK/BALANCE/DEFEND phases
        const phases: Record<string, { zones: number[]; positions: number[]; priorities: number[]; flexibility: number[] }> = {}

        const roleOrder = Object.keys(doc.formation.roles) as PlayerRole[]
        const gridWidth = doc.grid.cols
        const toIndex = (c: number, r: number): number => r * gridWidth + c

        const buildPhase = (posture: Posture, base: Record<PlayerRole, Vector2>): void =>
        {
            const zones: number[] = []
            const positions: number[] = []
            const priorities: number[] = []
            const flexibility: number[] = []

            const mapping = doc.mapping[posture] ?? {}
            const keys = Object.keys(mapping)
            const pushSet = (set: Record<PlayerRole, Vector2>, zoneIndex: number): void =>
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

    // Restore UI prefs and stage initial ball cell mapping on mount / formation change
    useEffect((): void =>
    {
        try
        {
            const g = localStorage.getItem("fet-pref-showGhost")
            const l = localStorage.getItem("fet-pref-showLegend")
            if (g !== null) setShowGhostOpposition(g === "true")
            if (l !== null) setShowMirrorLegend(l === "true")
        }
        catch { /* ignore */ }
        // Stage initial cell if none staged yet
        setPending((p) => ensureInitialStagedCell(doc, p))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doc.formation.formationId])

    // Persist UI prefs
    useEffect((): void =>
    {
        try { localStorage.setItem("fet-pref-showGhost", String(showGhostOpposition)) }
 catch { /* ignore */ }
    }, [showGhostOpposition])
    useEffect((): void =>
    {
        try { localStorage.setItem("fet-pref-showLegend", String(showMirrorLegend)) }
 catch { /* ignore */ }
    }, [showMirrorLegend])

    // Autosave project periodically
    useEffect(() =>
    {
        const key = `fet-project-${doc.formation.formationId}`
        const save = (): void =>
        {
            try { localStorage.setItem(key, JSON.stringify(doc)) }
 catch { /* ignore */ }
        }
        const id = window.setInterval(save, 5000)
        save()
        return () => window.clearInterval(id)
    }, [doc])

    // Painting helpers (deduped handlers)
    const paintHandlers = usePaintHandlers({
        grid,
        cell: cellSize,
        isDisabled: isBallDragging,
        hasMappingAt: (key) => Boolean((doc.mapping[doc.posture] ?? {})[key] || pending[key]),
        copyFromTo: (target, source) =>
        {
            const keySource = `${source.c}_${source.r}`
            const keyTarget = `${target.c}_${target.r}`
            const src = doc.mapping[doc.posture]?.[keySource] ?? pending[keySource]
            if (!src) return
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
        },
        clearAt: (target) =>
        {
            const keyTarget = `${target.c}_${target.r}`
            setDoc((d) =>
            {
                const map = { ...(d.mapping[d.posture] ?? {}) }
                if (!Object.prototype.hasOwnProperty.call(map, keyTarget)) return d
                delete map[keyTarget]
                return { ...d, mapping: { ...d.mapping, [d.posture]: map } }
            })
        },
    })

    return (
        <div style={{ display: "flex", height: "100vh", background: "#111", color: "#fff" }}>
            <ControlsPanel
                doc={doc}
                presets={presets}
                selectedFormationPath={selectedFormationPath}
                availableFormations={availableFormations}
                snap={snap}
                showGhostOpposition={showGhostOpposition}
                showMirrorLegend={showMirrorLegend}
                onChangeDoc={(updater) => setDoc((d) => updater(d))}
                onApplyPreset={(id) => applyPreset(id)}
                onLoadSelected={(path) =>
                {
                    const found = availableFormations.find((f) => f.path === path)
                    if (found)
                    {
                        const clamped = { ...found.data, roles: clampOwnHalf((found.data).roles) }
                        setDoc((d) => ({ ...d, formation: clamped, ball: { x: 0.5, y: 0.5 } }))
                    }
                }}
                onSetSelectedPath={setSelectedFormationPath}
                onExportFormation={exportFormation}
                onImportFormation={importFormation}
                onExportProject={exportProject}
                onImportProject={importProject}
                onExportCompact={exportCompact}
                onToggleSnap={setSnap}
                onToggleGhost={setShowGhostOpposition}
                onToggleLegend={setShowMirrorLegend}
                onStageCurrentCell={() =>
                {
                    if (!doc.ball) return
                    const key = cellKey(doc.grid, doc.ball)
                    setPending((p) => ({ ...p, [key]: { ...doc.formation.roles } }))
                }}
                onCommitPending={() =>
                {
                    setDoc((d) => ({ ...d, mapping: { ...d.mapping, [d.posture]: { ...d.mapping[d.posture], ...pending } } }))
                    setPending({})
                }}
                onDeleteCurrentCell={() =>
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
                hasMappingAtBall={Object.keys(doc.mapping[doc.posture] ?? {}).includes(cellKey(doc.grid, doc.ball!))}
                hasPendingAtBall={Object.keys(pending).includes(cellKey(doc.grid, doc.ball!))}
            />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <EditorCanvas
                    doc={doc}
                    canvasSize={canvasSize}
                    grid={grid}
                    cellSize={cellSize}
                    pending={pending}
                    ghostRoles={ghostRoles}
                    paintHandlers={paintHandlers}
                    snap={snap}
                    showGhostOpposition={showGhostOpposition}
                    showMirrorLegend={showMirrorLegend}
                    setDoc={setDoc}
                    setPending={setPending}
                    setIsBallDragging={setIsBallDragging}
                />
            </div>
        </div>
    )
}


