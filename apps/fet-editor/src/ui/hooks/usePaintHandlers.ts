import { useCallback, useRef, useState } from "react";

interface GridSize
{
    cols: number;
    rows: number;
}

interface Point
{
    c: number;
    r: number;
}

interface UsePaintHandlersArgs
{
    grid: GridSize;
    cell: { w: number; h: number };
    isDisabled?: boolean;
    hasMappingAt: (key: string) => boolean;
    copyFromTo: (target: Point, source: Point) => void;
    clearAt: (target: Point) => void;
}

export interface Handlers
{
    containerRef: React.MutableRefObject<HTMLDivElement | null>;
    mode: "none" | "copy" | "clear";
    setMode: (m: "none" | "copy" | "clear") => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function usePaintHandlers({ grid, cell, isDisabled, hasMappingAt, copyFromTo, clearAt }: UsePaintHandlersArgs): Handlers
{
    const containerRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<"none" | "copy" | "clear">("none");
    const sourceRef = useRef<Point | null>(null);
    const lastKeyRef = useRef<string | null>(null);

    const getPointFromMouse = useCallback((e: React.MouseEvent<HTMLDivElement>): Point | null =>
    {
        const container = containerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(mx / cell.w)));
        const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(my / cell.h)));
        return { c, r };
    }, [grid.cols, grid.rows, cell.w, cell.h]);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
    {
        if (isDisabled) return;
        const pt = getPointFromMouse(e);
        if (!pt) return;
        const key = `${pt.c}_${pt.r}`;
        if (e.button === 0)
        {
            if (hasMappingAt(key))
            {
                setMode("copy");
                sourceRef.current = pt;
                lastKeyRef.current = null;
            }
        }
        else if (e.button === 2)
        {
            e.preventDefault();
            setMode("clear");
            sourceRef.current = null;
            clearAt(pt);
            lastKeyRef.current = key;
        }
    }, [getPointFromMouse, hasMappingAt, clearAt, isDisabled]);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
    {
        if (isDisabled) return;
        if (mode === "none") return;
        const pt = getPointFromMouse(e);
        if (!pt) return;
        const key = `${pt.c}_${pt.r}`;
        if (lastKeyRef.current === key) return;
        if (mode === "copy" && sourceRef.current)
        {
            copyFromTo(pt, sourceRef.current);
        }
        else if (mode === "clear")
        {
            clearAt(pt);
        }
        lastKeyRef.current = key;
    }, [mode, getPointFromMouse, copyFromTo, clearAt, isDisabled]);

    const onMouseUp = useCallback(() =>
    {
        setMode("none");
        sourceRef.current = null;
        lastKeyRef.current = null;
    }, []);

    const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
    {
        e.preventDefault();
    }, []);

    return { containerRef, mode, setMode, onMouseDown, onMouseMove, onMouseUp, onContextMenu };
}


