import { describe, expect, it } from "vitest";

import { cellKey } from "./cellKey";

describe("cellKey", () =>
{
    it("clamps coordinates within grid and floors to cell index", () =>
    {
        const grid = { cols: 20, rows: 15 };
        expect(cellKey(grid, { x: 0, y: 0 })).toBe("0_0");
        expect(cellKey(grid, { x: 0.999, y: 0.999 })).toBe("19_14");
        expect(cellKey(grid, { x: -1, y: -1 })).toBe("0_0");
        expect(cellKey(grid, { x: 2, y: 2 })).toBe("19_14");
        // Middle approximately
        const key = cellKey(grid, { x: 0.5, y: 0.5 });
        expect(["10_7", "9_7"]).toContain(key);
    });
});


