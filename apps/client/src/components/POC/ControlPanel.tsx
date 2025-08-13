import type { ReactNode } from "react"
import type { ButtonCommand } from "../../types/POCTypes"

interface ControlPanelProps 
{
    onButtonCommand: (command: ButtonCommand) => void
    onStartMatch: () => void
    onPauseMatch: () => void
    onResetMatch: () => void
    isMatchActive: boolean
}

export const ControlPanel = ({ 
    onButtonCommand, 
    onStartMatch, 
    onPauseMatch, 
    onResetMatch,
    isMatchActive 
}: ControlPanelProps): ReactNode => 
{
    const buttonStyle: React.CSSProperties = {
        padding: '12px 24px',
        fontSize: '18px',
        fontWeight: 'bold',
        border: '2px solid #666',
        borderRadius: '8px',
        backgroundColor: '#333',
        color: 'white',
        cursor: 'pointer',
        minWidth: '120px',
        transition: 'all 0.2s'
    }

    const activeButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#555',
        borderColor: '#888'
    }

    const tacticalButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#1a4d1a',
        borderColor: '#2d7d2d'
    }

    const actionButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#4d1a1a',
        borderColor: '#7d2d2d'
    }

    const controlButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#1a1a4d',
        borderColor: '#2d2d7d'
    }

    return (
        <div style={{
            height: '180px',
            backgroundColor: '#1a1a1a',
            borderTop: '2px solid #444',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 40px'
        }}>
            {/* Human Player Controls */}
            <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#ccc', fontSize: '16px' }}>
                    Human Player Controls:
                </h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <button
                        style={tacticalButtonStyle}
                        onClick={() => onButtonCommand({ type: 'ATTACK', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d7d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a4d1a'}
                    >
                        Attack
                    </button>
                    <button
                        style={tacticalButtonStyle}
                        onClick={() => onButtonCommand({ type: 'DEFEND', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d7d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a4d1a'}
                    >
                        Defend
                    </button>
                    <button
                        style={tacticalButtonStyle}
                        onClick={() => onButtonCommand({ type: 'BALANCE', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d7d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a4d1a'}
                    >
                        Balance
                    </button>
                    <button
                        style={actionButtonStyle}
                        onClick={() => onButtonCommand({ type: 'SHOOT', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7d2d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4d1a1a'}
                    >
                        Shoot
                    </button>
                    <button
                        style={actionButtonStyle}
                        onClick={() => onButtonCommand({ type: 'PASS_SHORT', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7d2d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4d1a1a'}
                    >
                        Pass Short
                    </button>
                    <button
                        style={actionButtonStyle}
                        onClick={() => onButtonCommand({ type: 'CLEAR', timestamp: Date.now() })}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7d2d2d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4d1a1a'}
                    >
                        Clear Ball
                    </button>
                </div>
            </div>

            {/* Match Controls */}
            <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#ccc', fontSize: '16px' }}>
                    Match Controls:
                </h3>
                <div style={{ display: 'flex', gap: '15px' }}>
                    {!isMatchActive ? (
                        <button
                            style={controlButtonStyle}
                            onClick={onStartMatch}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d7d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a4d'}
                        >
                            Start Match
                        </button>
                    ) : (
                        <button
                            style={controlButtonStyle}
                            onClick={onPauseMatch}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d7d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a4d'}
                        >
                            Pause
                        </button>
                    )}
                    <button
                        style={controlButtonStyle}
                        onClick={onResetMatch}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d7d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a4d'}
                    >
                        Reset Match
                    </button>
                    <div style={{ 
                        padding: '12px 24px', 
                        fontSize: '16px', 
                        color: '#888',
                        fontStyle: 'italic'
                    }}>
                        AI opponent makes decisions automatically
                    </div>
                </div>
            </div>
        </div>
    )
}