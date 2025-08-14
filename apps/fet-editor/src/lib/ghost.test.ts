import { describe, expect, it } from "vitest";

import type { EditorDoc } from "../types/EditorDoc";
import type { PlayerRole, Vector2 } from "../types/Formation";
import { computeGhostRoles, ensureInitialStagedCell } from "./ghost";

const baseRoles: Record<PlayerRole, Vector2> = {
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
};

function makeDoc(ball: Vector2): EditorDoc
{
    return {
        grid: { cols: 20, rows: 15 },
        formation: { formationId: "t", name: "t", roles: baseRoles },
        posture: "BALANCE",
        mapping: { ATTACK: {}, BALANCE: {}, DEFEND: {} },
        ball,
    };
}

describe("ghost helpers", () =>
{
    it("mirrors across halfway using pending mapping precedence", () =>
    {
        const doc = makeDoc({ x: 0.5, y: 0.6 });
        // Ball cell c ~ 10, r ~ 9 for rows=15; mirrored r' = 5
        const pending: Record<string, Record<PlayerRole, Vector2>> = {
            "10_5": {
                ...baseRoles,
                ST_L: { x: 0.6, y: 0.7 },
                ST_R: { x: 0.6, y: 0.8 },
            },
        };
        const ghost = computeGhostRoles(doc, pending);
        expect(ghost.ST_L.y).toBeCloseTo(1 - 0.7, 5);
        expect(ghost.ST_R.y).toBeCloseTo(1 - 0.8, 5);
    });

    it("stages initial cell when none exists", () =>
    {
        const doc = makeDoc({ x: 0.5, y: 0.5 });
        const staged = ensureInitialStagedCell(doc, {});
        expect(Object.keys(staged).length).toBe(1);
    });
});


