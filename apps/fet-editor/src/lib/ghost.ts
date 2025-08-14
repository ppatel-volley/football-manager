import type { EditorDoc } from "../types/EditorDoc";
import type { PlayerRole, Vector2 } from "../types/Formation";
import { cellKey } from "./cellKey";
import { mirrorCellAcrossHalfway, mirrorRolesAcrossHalfway } from "./mirror";

export function computeGhostRoles(
    doc: EditorDoc,
    pending: Record<string, Record<PlayerRole, Vector2>>
): Record<PlayerRole, Vector2>
{
    if (!doc.ball)
    {
        return mirrorRolesAcrossHalfway(doc.formation.roles);
    }
    const bc = Math.max(0, Math.min(doc.grid.cols - 1, Math.floor((doc.ball.x) * doc.grid.cols)));
    const br = Math.max(0, Math.min(doc.grid.rows - 1, Math.floor((doc.ball.y) * doc.grid.rows)));
    const mirroredCell = mirrorCellAcrossHalfway(doc.grid.rows, bc, br);
    const mirroredKey = `${mirroredCell.c}_${mirroredCell.r}`;
    const sourceSet = pending[mirroredKey]
        ?? (doc.mapping[doc.posture] ?? {})[mirroredKey]
        ?? (doc.formation.postures?.[doc.posture] ?? doc.formation.roles);
    return mirrorRolesAcrossHalfway(sourceSet);
}

export function ensureInitialStagedCell(
    doc: EditorDoc,
    pending: Record<string, Record<PlayerRole, Vector2>>
): Record<string, Record<PlayerRole, Vector2>>
{
    if (!doc.ball)
    {
        return pending;
    }
    const key = cellKey(doc.grid, doc.ball);
    if (Object.keys(pending).length > 0) return pending;
    if (Object.prototype.hasOwnProperty.call(doc.mapping[doc.posture] ?? {}, key)) return pending;
    return { ...pending, [key]: { ...doc.formation.roles } };
}


