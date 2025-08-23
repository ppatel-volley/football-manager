import type { ReactNode } from "react"

import { getAvailableFormations, getKickoffPositions } from "../lib/uberFormationLoader"
import type { PlayerRole, Vector2 } from "../types/Formation"

interface FormationDropdownProps
{
    selectedFormationId: string
    onSelectionChange: (formationId: string, kickoffPositions: Record<PlayerRole, Vector2>) => void
    onApplyKickoff: (kickoffPositions: Record<PlayerRole, Vector2>) => void
}

export function FormationDropdown(props: FormationDropdownProps): ReactNode
{
    const { selectedFormationId, onSelectionChange, onApplyKickoff } = props
    
    const availableFormations = getAvailableFormations()
    console.log("Available formations:", availableFormations)
    
    const handleFormationSelect = (formationId: string): void => 
{
        const kickoffPositions = getKickoffPositions(formationId)
        if (kickoffPositions) 
{
            onSelectionChange(formationId, kickoffPositions)
        }
    }
    
    const handleApplyKickoff = (): void => 
{
        const kickoffPositions = getKickoffPositions(selectedFormationId)
        if (kickoffPositions) 
{
            onApplyKickoff(kickoffPositions)
        }
    }
    
    return (
        <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 8, 
            padding: 12, 
            background: "#1a1a1a", 
            borderRadius: 6, 
            border: "1px solid #444",
            marginBottom: 12
        }}>
            <div style={{ fontSize: 14, color: "#4CAF50", fontWeight: "bold" }}>
                Formation Templates
            </div>
            
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 12, color: "#bbb", minWidth: 60 }}>Formation:</label>
                <select
                    value={selectedFormationId}
                    onChange={(e) => handleFormationSelect(e.target.value)}
                    style={{ 
                        background: "#222", 
                        color: "#fff", 
                        border: "1px solid #555", 
                        borderRadius: 4, 
                        padding: "6px 8px",
                        minWidth: 120
                    }}
                >
                    <option value="" disabled>Select formation...</option>
                    {availableFormations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                            {formation.name} ({formation.category})
                        </option>
                    ))}
                </select>
            </div>
            
            {selectedFormationId && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                        onClick={handleApplyKickoff}
                        style={{
                            background: "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: "bold"
                        }}
                    >
                        Apply Kick-off Positions
                    </button>
                    <span style={{ fontSize: 11, color: "#888" }}>
                        Positions team for kick-off using {selectedFormationId}
                    </span>
                </div>
            )}
            
            <div style={{ fontSize: 10, color: "#666", lineHeight: "1.3" }}>
                Select a formation template to load pre-defined player positions.
                Click "Apply Kick-off Positions" to position your team for kick-off.
            </div>
        </div>
    )
}