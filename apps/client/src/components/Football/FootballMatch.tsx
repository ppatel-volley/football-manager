import { PitchCanvas } from "@game/pitch-ui"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { useDispatchAction, useStateSync } from "../../hooks/VGF"

interface FootballMatchProps {
    phase: string
}

export const FootballMatch = ({ phase }: FootballMatchProps): ReactNode => 
{
    const gameState = useStateSync()
    const dispatchAction = useDispatchAction()
    const [autoProgress, setAutoProgress] = useState(true)
    
    // Auto-progress through phases for demo purposes
    useEffect(() => 
{
        if (!autoProgress) return
        
        let timeout: NodeJS.Timeout
        
        switch (phase) 
{
            case 'pre_match':
                // Auto-start match after 5 seconds
                timeout = setTimeout(() => 
{
                    dispatchAction('startMatch')
                }, 5000)
                break
                
            case 'kickoff':
                // Auto-take kickoff after 3 seconds
                timeout = setTimeout(() => 
{
                    dispatchAction('takeKickoff')
                }, 3000)
                break
        }
        
        return () => 
{
            if (timeout) clearTimeout(timeout)
        }
    }, [phase, autoProgress, dispatchAction])
    
    // Handle tactical commands
    const handleTacticalCommand = (commandType: string) => 
{
        dispatchAction('tacticalCommand', {
            type: commandType,
            team: 'HOME' // Assuming player controls HOME team
        })
    }
    
    // Handle specific phase actions
    const handlePhaseAction = (actionType: string) => 
{
        switch (actionType) 
{
            case 'shoot':
                if (phase === 'first_half' || phase === 'second_half') 
{
                    dispatchAction('shootBall', 'HOME')
                }
                break
            case 'restart':
                if (phase === 'full_time') 
{
                    dispatchAction('restartMatch')
                }
                break
        }
    }
    
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1a1a1a',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Match Status */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px 20px',
                borderRadius: '8px'
            }}>
                <div>
                    <h2>{gameState?.homeTeam?.name || 'Home'} vs {gameState?.awayTeam?.name || 'Away'}</h2>
                    <p>Phase: {phase.replace('_', ' ').toUpperCase()}</p>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {gameState?.score?.home || 0} - {gameState?.score?.away || 0}
                    </div>
                    <div>{gameState?.footballTime || '00:00'}</div>
                </div>
                
                <div>
                    <p>Ball: {gameState?.ballPossession || 'None'}</p>
                    <p>Half: {gameState?.footballHalf || 1}</p>
                </div>
            </div>
            
            {/* Pitch visualization */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                padding: '20px'
            }}>
                <PitchCanvas 
                    width={800} 
                    height={600}
                    style={{ 
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                />
            </div>
            
            {/* Phase-specific content */}
            <div style={{ textAlign: 'center', margin: '20px' }}>
                {phase === 'pre_match' && (
                    <div>
                        <h1>Pre-Match</h1>
                        <p>Teams entering the pitch...</p>
                        <button onClick={() => dispatchAction('startMatch')}>
                            Start Match
                        </button>
                    </div>
                )}
                
                {phase === 'kickoff' && (
                    <div>
                        <h1>Kick Off</h1>
                        <p>Teams ready for kickoff</p>
                        <button onClick={() => dispatchAction('takeKickoff')}>
                            Take Kickoff
                        </button>
                    </div>
                )}
                
                {(phase === 'first_half' || phase === 'second_half') && (
                    <div>
                        <h1>{phase === 'first_half' ? 'First Half' : 'Second Half'}</h1>
                        <p>Match in progress...</p>
                        
                        {/* Tactical buttons */}
                        <div style={{ margin: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => handleTacticalCommand('ATTACK')}>
                                Attack
                            </button>
                            <button onClick={() => handleTacticalCommand('DEFEND')}>
                                Defend
                            </button>
                            <button onClick={() => handleTacticalCommand('BALANCE')}>
                                Balance
                            </button>
                        </div>
                        
                        <div style={{ margin: '20px' }}>
                            <button onClick={() => handlePhaseAction('shoot')}>
                                Shoot!
                            </button>
                        </div>
                    </div>
                )}
                
                {phase === 'half_time' && (
                    <div>
                        <h1>Half Time</h1>
                        <p>Teams taking a break...</p>
                        <div style={{ margin: '20px' }}>
                            <h3>Stats</h3>
                            <p>Possession: HOME {gameState?.stats?.possessionSeconds?.HOME || 0}s, 
                               AWAY {gameState?.stats?.possessionSeconds?.AWAY || 0}s</p>
                            <p>Shots: HOME {gameState?.stats?.shots?.HOME || 0}, 
                               AWAY {gameState?.stats?.shots?.AWAY || 0}</p>
                        </div>
                    </div>
                )}
                
                {phase === 'full_time' && (
                    <div>
                        <h1>Full Time</h1>
                        <p>Match completed!</p>
                        <div style={{ margin: '20px' }}>
                            <h2>Final Score: {gameState?.score?.home || 0} - {gameState?.score?.away || 0}</h2>
                            <h3>Final Stats</h3>
                            <p>Possession: HOME {gameState?.stats?.possessionSeconds?.HOME || 0}s, 
                               AWAY {gameState?.stats?.possessionSeconds?.AWAY || 0}s</p>
                            <p>Shots: HOME {gameState?.stats?.shots?.HOME || 0}, 
                               AWAY {gameState?.stats?.shots?.AWAY || 0}</p>
                        </div>
                        <button onClick={() => handlePhaseAction('restart')}>
                            Play Again
                        </button>
                    </div>
                )}
            </div>
            
            {/* Auto-progress toggle */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
                <label>
                    <input 
                        type="checkbox" 
                        checked={autoProgress}
                        onChange={(e) => setAutoProgress(e.target.checked)}
                    />
                    Auto-progress
                </label>
            </div>
        </div>
    )
}