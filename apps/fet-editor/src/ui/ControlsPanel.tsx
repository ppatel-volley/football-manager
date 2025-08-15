import type { ReactNode } from "react";

import type { EditorDoc } from "../types/EditorDoc";
import type { PlayerRole, Posture, Vector2 } from "../types/Formation";

interface ControlsPanelProps
{
    doc: EditorDoc;
    presets: Record<string, Record<PlayerRole, Vector2>>;
    selectedFormationPath: string;
    availableFormations: Array<{ path: string; id: string; name: string; data: { roles: Record<PlayerRole, Vector2> } }>;
    snap: boolean;
    showGhostOpposition: boolean;
    showMirrorLegend: boolean;
    onChangeDoc: (updater: (d: EditorDoc) => EditorDoc) => void;
    onApplyPreset: (id: keyof ControlsPanelProps["presets"]) => void;
    onLoadSelected: (path: string) => void;
    onSetSelectedPath: (path: string) => void;
    onExportFormation: () => void;
    onImportFormation: React.ChangeEventHandler<HTMLInputElement>;
    onExportProject: () => void;
    onImportProject: React.ChangeEventHandler<HTMLInputElement>;
    onExportCompact: () => void;
    onToggleSnap: (v: boolean) => void;
    onToggleGhost: (v: boolean) => void;
    onToggleLegend: (v: boolean) => void;
    onStageCurrentCell: () => void;
    onCommitPending: () => void;
    onDeleteCurrentCell: () => void;
    hasMappingAtBall: boolean;
    hasPendingAtBall: boolean;
}

export function ControlsPanel(props: ControlsPanelProps): ReactNode
{
    const {
        doc,
        presets,
        selectedFormationPath,
        availableFormations,
        snap,
        showGhostOpposition,
        showMirrorLegend,
        onChangeDoc,
        onApplyPreset,
        onLoadSelected,
        onSetSelectedPath,
        onExportFormation,
        onImportFormation,
        onExportProject,
        onImportProject,
        onExportCompact,
        onToggleSnap,
        onToggleGhost,
        onToggleLegend,
        onStageCurrentCell,
        onCommitPending,
        onDeleteCurrentCell,
        hasMappingAtBall,
        hasPendingAtBall,
    } = props;

    return (
        <div style={{ width: 320, padding: 16, borderRight: "2px solid #333" }}>
            <h2 style={{ marginTop: 0 }}>Formation Editor</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "#bbb" }}>Template</label>
                <select
                    value={Object.keys(presets).includes(doc.formation.formationId) ? doc.formation.formationId : ""}
                    onChange={(e) => onApplyPreset(e.target.value)}
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
                    onChange={(e) => onSetSelectedPath(e.target.value)}
                    style={{ background: "#222", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "4px 8px" }}
                >
                    {availableFormations.map((f) => (
                        <option key={f.path} value={f.path}>{f.name || f.id || f.path}</option>
                    ))}
                </select>
                <button onClick={() => onLoadSelected(selectedFormationPath)}>Load Selected</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#bbb" }}>Formation ID</span>
                    <input
                        value={doc.formation.formationId}
                        onChange={(e) => onChangeDoc((d) => ({ ...d, formation: { ...d.formation, formationId: e.target.value } }))}
                        style={{ background: "#111", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "6px 8px" }}
                    />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#bbb" }}>Formation Name</span>
                    <input
                        value={doc.formation.name}
                        onChange={(e) => onChangeDoc((d) => ({ ...d, formation: { ...d.formation, name: e.target.value } }))}
                        style={{ background: "#111", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "6px 8px" }}
                    />
                </label>
            </div>
            <div>
                <label>Grid: {doc.grid.cols}x{doc.grid.rows}</label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button onClick={onExportFormation}>Save Formation</button>
                <label style={{ display: "inline-block" }}>
                    <span style={{ padding: 6, border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Load Formation</span>
                    <input type="file" accept="application/json" onChange={onImportFormation} style={{ display: "none" }} />
                </label>
                <button onClick={onExportProject}>Save Project</button>
                <label style={{ display: "inline-block" }}>
                    <span style={{ padding: 6, border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Load Project</span>
                    <input type="file" accept="application/json" onChange={onImportProject} style={{ display: "none" }} />
                </label>
                <button onClick={onExportCompact}>Export Compact</button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#bbb" }}>Posture</span>
                    <select
                        value={doc.posture}
                        onChange={(e) =>
                        {
                            const next = e.target.value as Posture
                            onChangeDoc((d) =>
                            {
                                const base = d.formation.postures?.[next]
                                const newRoles = base ? { ...base } : d.formation.roles
                                // Update the current ball cell's mapping to reflect the new posture formation
                                const ballKey = d.ball ? `${Math.floor(d.ball.x * d.grid.cols)}_${Math.floor(d.ball.y * d.grid.rows)}` : null
                                if (ballKey && d.mapping[d.posture]?.[ballKey])
                                {
                                    const updatedMapping = { ...d.mapping }
                                    updatedMapping[d.posture] = { ...updatedMapping[d.posture], [ballKey]: { ...newRoles } }
                                    return { ...d, posture: next, formation: { ...d.formation, roles: { ...newRoles } }, mapping: updatedMapping }
                                }
                                return { ...d, posture: next, formation: { ...d.formation, roles: { ...newRoles } } }
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
                            onChangeDoc((d) =>
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
                <button onClick={onStageCurrentCell}>Stage mapping for ball cell</button>
                <button onClick={onCommitPending}>Commit all staged cells</button>
                <button onClick={onDeleteCurrentCell} disabled={!hasMappingAtBall}>Delete mapping for current cell</button>
                <span style={{ fontSize: 12, padding: 6, color: hasMappingAtBall ? "#0f0" : "#aaa" }}>
                    {hasMappingAtBall ? "Committed mapping exists for current cell (this posture)" : hasPendingAtBall ? "Staged mapping exists for current cell" : "No mapping for current cell"}
                </span>
            </div>
            <div style={{ marginTop: 12 }}>
                <label>
                    <input type="checkbox" checked={snap} onChange={(ev) => onToggleSnap(ev.target.checked)} /> Snap to grid on release
                </label>
            </div>
            <div style={{ marginTop: 8 }}>
                <label>
                    <input type="checkbox" checked={showGhostOpposition} onChange={(ev) => onToggleGhost(ev.target.checked)} /> Ghost Opposition
                </label>
            </div>
            <div style={{ marginTop: 6 }}>
                <label>
                    <input type="checkbox" checked={showMirrorLegend} onChange={(ev) => onToggleLegend(ev.target.checked)} /> Show mirroring legend
                </label>
            </div>
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#222", borderRadius: 6, border: "1px solid #444" }}>
                <div style={{ fontSize: 12, color: "#4CAF50", fontWeight: "bold", marginBottom: 4 }}>Cursor Key Controls:</div>
                <div style={{ fontSize: 11, color: "#bbb", lineHeight: "1.4" }}>
                    Use arrow keys to move outfield players smoothly.<br />
                    ↑↓←→ Move team (goalkeeper stays in position)
                </div>
            </div>
        </div>
    )
}


