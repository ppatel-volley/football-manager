import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

import { cellKey } from "../lib/cellKey"
import { validateEditorDoc, validateFormationData } from "../lib/formationSchema"
import { computeGhostRoles, ensureInitialStagedCell } from "../lib/ghost"
import type { EditorDoc } from "../types/EditorDoc"
import type { FormationData } from "../types/Formation"
import type { PlayerRole, Posture,Vector2 } from "../types/Formation"
import { ControlsPanel } from "./ControlsPanel"
import { EditorCanvas } from "./EditorCanvas"
import { ErrorBoundary } from "./ErrorBoundary"
import { FormationDropdown } from "./FormationDropdown"
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
    const [isTeamMoving, setIsTeamMoving] = useState(false)

    
    // Uber formation dropdown state
    const [selectedUberFormationId, setSelectedUberFormationId] = useState<string>("")
    
    const handleUberFormationSelect = (formationId: string, kickoffPositions: Record<PlayerRole, Vector2>): void =>
    {
        setSelectedUberFormationId(formationId)
        // Apply the kickoff positions immediately
        const clamped = clampOwnHalf(kickoffPositions)
        setDoc((d) => ({ ...d, formation: { formationId, name: formationId, roles: clamped }, ball: { x: 0.5, y: 0.5 } }))
    }
    
    const handleApplyKickoff = (kickoffPositions: Record<PlayerRole, Vector2>): void =>
    {
        const clamped = clampOwnHalf(kickoffPositions)
        setDoc((d) => ({ ...d, formation: { ...d.formation, roles: clamped }, ball: { x: 0.5, y: 0.5 } }))
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
                    const candidate: EditorDoc = ({
                        ...doc,
                        ...(maybeDoc as EditorDoc),
                        posture,
                        mapping: normalizedMapping,
                        ball: { x: 0.5, y: 0.5 },
                    } as EditorDoc)
                    if (validateEditorDoc(candidate)) setDoc(candidate)
                    return
                }
                if (maybeFormation && maybeFormation.formationId && maybeFormation.roles)
                {
                    const validated = validateFormationData(maybeFormation)
                    if (!validated) return
                    const roles = clampOwnHalf(validated.roles)
                    setDoc((d) => ({ ...d, formation: { ...validated, roles }, ball: { x: 0.5, y: 0.5 } }))
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

    // Team movement with cursor keys
    useEffect(() =>
    {
        const moveTeam = (deltaX: number, deltaY: number): void =>
        {
            setIsTeamMoving(true)
            const moveAmount = 0.02 // Amount to move on each keypress
            const adjustedDeltaX = deltaX * moveAmount
            const adjustedDeltaY = deltaY * moveAmount

            setDoc((d) =>
            {
                const updatedRoles = { ...d.formation.roles }
                
                // Move all players by the delta amount, except goalkeeper
                Object.keys(updatedRoles).forEach((roleKey) =>
                {
                    const role = roleKey as PlayerRole
                    
                    // Skip goalkeeper - GK stays in position
                    if (role === 'GK')
                    {
                        return
                    }
                    
                    const currentPos = updatedRoles[role]
                    updatedRoles[role] = {
                        x: Math.max(0, Math.min(1, currentPos.x + adjustedDeltaX)),
                        y: Math.max(0, Math.min(1, currentPos.y + adjustedDeltaY))
                    }
                })

                // Update current ball cell mapping if it exists
                if (d.ball)
                {
                    const key = cellKey(d.grid, d.ball)
                    setPending((p) => ({ ...p, [key]: updatedRoles }))
                }

                return { ...d, formation: { ...d.formation, roles: updatedRoles } }
            })

            // Clear the moving state after a short delay for visual feedback
            setTimeout(() => setIsTeamMoving(false), 150)
        }

        const handleKeyDown = (e: KeyboardEvent): void =>
        {
            // Only handle cursor keys when not in input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
            {
                return
            }

            // Prevent default browser behaviour for cursor keys
            switch (e.key)
            {
                case 'ArrowUp':
                    e.preventDefault()
                    moveTeam(0, -1)
                    break
                case 'ArrowDown':
                    e.preventDefault()
                    moveTeam(0, 1)
                    break
                case 'ArrowLeft':
                    e.preventDefault()
                    moveTeam(-1, 0)
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    moveTeam(1, 0)
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [doc.ball, doc.grid])

    // Painting helpers (deduped handlers)
    const paintHandlers = usePaintHandlers({
        grid,
        cell: cellSize,
        isDisabled: isBallDragging,
        hasMappingAt: (key) => Boolean((doc.mapping[doc.posture] ?? {})[key] || pending[key]),
        getDefaultSource: () =>
        {
            // Use the current ball cell as a default source if it has a mapping or pending set
            if (!doc.ball) return null
            const key = cellKey(doc.grid, doc.ball)
            if ((doc.mapping[doc.posture] ?? {})[key] || pending[key])
            {
                const [cStr, rStr] = key.split("_")
                const c = Number.parseInt(cStr ?? "0", 10)
                const r = Number.parseInt(rStr ?? "0", 10)
                return { c, r }
            }
            return null
        },
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
            <div style={{ flex: 1, padding: 16, borderRight: "2px solid #333", overflowY: "auto" }}>
                <h2 style={{ marginTop: 0 }}>Formation Editor</h2>
                <FormationDropdown
                    selectedFormationId={selectedUberFormationId}
                    onSelectionChange={handleUberFormationSelect}
                    onApplyKickoff={handleApplyKickoff}
                />
                <ControlsPanel
                    doc={doc}
                    snap={snap}
                    showGhostOpposition={showGhostOpposition}
                    showMirrorLegend={showMirrorLegend}
                    onChangeDoc={(updater) => setDoc((d) => updater(d))}
                    onExportFormation={exportFormation}
                    onImportFormation={importFormation}
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
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <ErrorBoundary>
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
                        isTeamMoving={isTeamMoving}
                        setDoc={setDoc}
                        setPending={setPending}
                        setIsBallDragging={setIsBallDragging}
                    />
                </ErrorBoundary>
            </div>
        </div>
    )
}


