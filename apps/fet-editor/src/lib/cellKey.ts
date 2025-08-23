export const cellKey = (grid: { cols: number; rows: number }, v: { x: number; y: number }): string =>
{
    const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(v.x * grid.cols)))
    const r = Math.max(0, Math.min(grid.rows - 1, Math.floor(v.y * grid.rows)))
    return `${c}_${r}`
}


