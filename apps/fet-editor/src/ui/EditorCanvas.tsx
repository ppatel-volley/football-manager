import type { ReactNode } from "react";

import { cellKey } from "../lib/cellKey";
import type { EditorDoc } from "../types/EditorDoc";
import type { PlayerRole, Vector2 } from "../types/Formation";
import { BallLayer } from "./BallLayer";
import { GridCanvas } from "./GridCanvas";
import type { Handlers } from "./hooks/usePaintHandlers";
import { MarkersLayer } from "./MarkersLayer";
import { MirrorLegend } from "./MirrorLegend";

interface EditorCanvasProps
{
    doc: EditorDoc;
    canvasSize: { w: number; h: number };
    grid: { cols: number; rows: number };
    cellSize: { w: number; h: number };
    pending: Record<string, Record<PlayerRole, Vector2>>;
    ghostRoles: Record<PlayerRole, Vector2>;
    paintHandlers: Handlers;
    snap: boolean;
    showGhostOpposition: boolean;
    showMirrorLegend: boolean;
    setDoc: React.Dispatch<React.SetStateAction<EditorDoc>>;
    setPending: React.Dispatch<React.SetStateAction<Record<string, Record<PlayerRole, Vector2>>>>;
    setIsBallDragging: (v: boolean) => void;
}

export function EditorCanvas(props: EditorCanvasProps): ReactNode
{
    const { doc, canvasSize, grid, cellSize, pending, ghostRoles, paintHandlers, snap, showGhostOpposition, showMirrorLegend, setDoc, setPending, setIsBallDragging } = props;

    return (
        <div
            aria-label="editor-canvas"
            style={{ position: "relative", width: canvasSize.w, height: canvasSize.h, cursor: paintHandlers.mode === "copy" ? "copy" : paintHandlers.mode === "clear" ? "not-allowed" : "auto" }}
        >
            {showMirrorLegend && <MirrorLegend />}
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
                    const [cStr, rStr] = (k).split("_")
                    const c = Number.parseInt(cStr ?? "0", 10)
                    const r = Number.parseInt(rStr ?? "0", 10)
                    return { c, r }
                })}
                pendingCells={Object.keys(pending ?? {}).map((k) =>
                {
                    const [cStr, rStr] = (k).split("_")
                    const c = Number.parseInt(cStr ?? "0", 10)
                    const r = Number.parseInt(rStr ?? "0", 10)
                    return { c, r }
                })}
                coloredCells={[]}
                onCopyPaint={(target, source): void =>
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
                onClearPaint={(target): void =>
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
                ref={paintHandlers.containerRef}
                onMouseDown={(e) => paintHandlers.onMouseDown(e)}
                onMouseMove={(e) => paintHandlers.onMouseMove(e)}
                onMouseUp={() => paintHandlers.onMouseUp()}
                onContextMenu={(e) => paintHandlers.onContextMenu(e)}
            >
                {showGhostOpposition && (
                    <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
                        <MarkersLayer
                            size={canvasSize}
                            grid={grid}
                            snapToGrid={false}
                            roles={ghostRoles}
                            onChange={() => { /* no-op: ghost non-interactive */ }}
                            ghost
                        />
                    </div>
                )}
                <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
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
                        onDragStart={() => paintHandlers.setMode("none")}
                        onDragEnd={() => paintHandlers.setMode("none")}
                    />
                </div>
            </div>
        </div>
    )
}


