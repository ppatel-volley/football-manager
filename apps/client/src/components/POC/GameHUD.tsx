import type { ReactNode } from "react"

interface GameHUDProps 
{
    footballTime: string  // Formatted football time (e.g., "23:45", "90+2")
    footballHalf: 1 | 2   // Current half based on football time
    score: { home: number; away: number }
    isActive: boolean
}

export const GameHUD = ({ footballTime, footballHalf, score, isActive }: GameHUDProps): ReactNode => 
{
    const getHalf = (half: 1 | 2): string => 
    {
        return half === 1 ? '1st' : '2nd'
    }

    return (
        <div style={{
            height: '80px',
            backgroundColor: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 40px',
            borderBottom: '2px solid #444'
        }}>
            {/* Team Names and Score */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '30px',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
                <span style={{ color: '#ff4444' }}>Team Red</span>
                <span style={{ 
                    fontSize: '32px',
                    color: '#ffffff',
                    minWidth: '80px',
                    textAlign: 'center'
                }}>
                    {score.home} - {score.away}
                </span>
                <span style={{ color: '#4444ff' }}>Team Blue</span>
            </div>

            {/* Match Time and Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                fontSize: '20px'
            }}>
                <div style={{
                    backgroundColor: isActive ? '#00aa00' : '#aa0000',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    {isActive ? 'LIVE' : 'PAUSED'}
                </div>
                
                <div style={{
                    color: '#ffffff',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    textAlign: 'center'
                }}>
                    {footballTime}
                </div>
                
                <div style={{
                    backgroundColor: '#444',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '16px'
                }}>
                    [{getHalf(footballHalf)}]
                </div>
            </div>
        </div>
    )
}