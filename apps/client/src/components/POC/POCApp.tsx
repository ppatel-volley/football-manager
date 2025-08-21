import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { GameCanvas } from "./GameCanvas"
import { ControlPanel } from "./ControlPanel"
import { GameHUD } from "./GameHUD"
import { POCMatchEngine } from "../../engine/POCMatchEngine"
import type { ButtonCommand } from "../../types/POCTypes"

export const POCApp = (): ReactNode => 
{
    console.log("POCApp rendering...")
    
    const [matchEngine, setMatchEngine] = useState<POCMatchEngine | null>(null)
    const [isMatchActive, setIsMatchActive] = useState(false)
    const [gameTime, setGameTime] = useState(0)
    const [footballTime, setFootballTime] = useState("00:00")
    const [footballHalf, setFootballHalf] = useState<1 | 2>(1)
    const [score, setScore] = useState({ home: 0, away: 0 })
    const [ballPossessor, setBallPossessor] = useState<{ name: string; squadNumber: number; team: "RED" | "BLUE" } | null>(null)
    const animationFrameRef = useRef<number>(0)
    const lastUIUpdateRef = useRef<number>(0)

    // Initialize match engine
    useEffect(() => 
    {
        const engine = new POCMatchEngine()
        engine.initializeMatch()
        setMatchEngine(engine)

        return () => 
        {
            if (animationFrameRef.current) 
            {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    // Game loop - 30 FPS
    useEffect(() => 
    {
        if (!matchEngine || !isMatchActive) return

        let lastTime = 0
        const targetFPS = 30
        const frameTime = 1000 / targetFPS

        const gameLoop = (currentTime: number) => 
        {
            if (currentTime - lastTime >= frameTime) 
            {
                const deltaTime = (currentTime - lastTime) / 1000
                matchEngine.updateFrame(deltaTime)
                
                // Immediately render after updating game state
                const renderFunction = (matchEngine as any).__renderFunction
                if (renderFunction) {
                    renderFunction()
                }
                
                // Update UI state less frequently (every 10 frames = ~3 times per second)
                if (currentTime - lastUIUpdateRef.current >= 333) { // ~3 FPS for UI updates
                    const newTime = matchEngine.getGameTime()
                    const newFootballTime = matchEngine.getFootballTime()
                    const newFootballHalf = matchEngine.getCurrentFootballHalf()
                    const newScore = matchEngine.getScore()
                    const newBallPossessor = matchEngine.getBallPossessor()
                    
                    // Only update if values actually changed
                    if (newTime !== gameTime) {
                        setGameTime(newTime)
                    }
                    if (newFootballTime !== footballTime) {
                        setFootballTime(newFootballTime)
                    }
                    if (newFootballHalf !== footballHalf) {
                        setFootballHalf(newFootballHalf)
                    }
                    if (newScore.home !== score.home || newScore.away !== score.away) {
                        setScore(newScore)
                    }
                    
                    // Check if ball possessor changed
                    const possessorChanged = 
                        (!ballPossessor && newBallPossessor) ||
                        (ballPossessor && !newBallPossessor) ||
                        (ballPossessor && newBallPossessor && 
                         (ballPossessor.name !== newBallPossessor.name || 
                          ballPossessor.squadNumber !== newBallPossessor.squadNumber ||
                          ballPossessor.team !== newBallPossessor.team))
                    
                    if (possessorChanged) {
                        setBallPossessor(newBallPossessor)
                    }
                    
                    lastUIUpdateRef.current = currentTime
                }
                
                lastTime = currentTime
            }
            
            animationFrameRef.current = requestAnimationFrame(gameLoop)
        }

        animationFrameRef.current = requestAnimationFrame(gameLoop)

        return () => 
        {
            if (animationFrameRef.current) 
            {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [matchEngine, isMatchActive])

    const handleButtonCommand = (command: ButtonCommand) => 
    {
        if (matchEngine) 
        {
            matchEngine.handleButtonCommand(command, 'HUMAN')
        }
    }

    const handleStartMatch = () => 
    {
        if (matchEngine) 
        {
            matchEngine.startMatch()
        }
        setIsMatchActive(true)
    }

    const handlePauseMatch = () => 
    {
        if (matchEngine) 
        {
            matchEngine.pauseMatch()
        }
        setIsMatchActive(!isMatchActive)
    }

    const handleResetMatch = () => 
    {
        setIsMatchActive(false)
        setGameTime(0)
        setFootballTime("00:00")
        setFootballHalf(1)
        setScore({ home: 0, away: 0 })
        setBallPossessor(null)
        if (matchEngine) 
        {
            matchEngine.initializeMatch()
        }
    }

    if (!matchEngine) 
    {
        return <div>Loading POC...</div>
    }

    return (
        <div style={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#1a1a1a',
            color: 'white',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Top HUD */}
            <GameHUD 
                footballTime={footballTime}
                footballHalf={footballHalf}
                score={score}
                isActive={isMatchActive}
                ballPossessor={ballPossessor}
            />
            
            {/* Main Game Area */}
            <div style={{ flex: 1, position: 'relative' }}>
                <GameCanvas 
                    matchEngine={matchEngine}
                    width={1920}
                    height={1100}
                />
            </div>
            
            {/* Control Panel */}
            <ControlPanel 
                onButtonCommand={handleButtonCommand}
                onStartMatch={handleStartMatch}
                onPauseMatch={handlePauseMatch}
                onResetMatch={handleResetMatch}
                isMatchActive={isMatchActive}
            />
        </div>
    )
}