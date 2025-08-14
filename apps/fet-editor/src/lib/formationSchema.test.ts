import { describe, expect, it } from "vitest"

import { validateEditorDoc, validateFormationData } from "./formationSchema"

const validFormation = {
    formationId: "4-4-2",
    name: "442",
    roles: {
        GK: { x: 0.05, y: 0.5 },
        CB_L: { x: 0.2, y: 0.4 },
        CB_R: { x: 0.2, y: 0.6 },
        LB: { x: 0.2, y: 0.2 },
        RB: { x: 0.2, y: 0.8 },
        CM_L: { x: 0.35, y: 0.35 },
        CM_R: { x: 0.35, y: 0.65 },
        LW: { x: 0.48, y: 0.3 },
        RW: { x: 0.48, y: 0.7 },
        ST_L: { x: 0.6, y: 0.45 },
        ST_R: { x: 0.6, y: 0.55 },
    },
}

describe("formation schema", () =>
{
    it("accepts valid formation", () =>
    {
        const res = validateFormationData(validFormation)
        expect(res).not.toBeNull()
        expect(res?.formationId).toBe("4-4-2")
    })

    it("rejects out-of-range vectors", () =>
    {
        const bad: typeof validFormation = {
            ...validFormation,
            roles: { ...validFormation.roles, GK: { x: -0.1, y: 2 } },
        }
        expect(validateFormationData(bad)).toBeNull()
    })

    it("validates editor doc shape", () =>
    {
        const doc = {
            grid: { cols: 20, rows: 15 },
            formation: validFormation,
            posture: "BALANCE",
            mapping: { ATTACK: {}, BALANCE: {}, DEFEND: {} },
            ball: { x: 0.5, y: 0.5 },
        }
        expect(validateEditorDoc(doc)).toBe(true)
    })
})


