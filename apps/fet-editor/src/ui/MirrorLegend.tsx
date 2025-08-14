import type { ReactNode } from "react";

export function MirrorLegend(): ReactNode
{
    return (
        <div
            style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                background: "rgba(0,0,0,0.55)",
                color: "#ddd",
                fontSize: 12,
                padding: "6px 8px",
                border: "1px solid #333",
                borderRadius: 6,
                pointerEvents: "none",
                zIndex: 3,
                maxWidth: 380,
                lineHeight: 1.25,
            }}
            title="Mirroring rules"
        >
            Ghost mirrors across halfway: y' = 1 − y (x unchanged). Ball cell (c, r) → (c, rows − 1 − r). Pending mapping takes priority over committed.
        </div>
    )
}


