import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { POCRenderer } from "../../rendering/POCRenderer"
import type { POCMatchEngine } from "../../engine/POCMatchEngine"

interface GameCanvasProps 
{
    matchEngine: POCMatchEngine
    width: number
    height: number
}

export const GameCanvas = ({ matchEngine, width, height }: GameCanvasProps): ReactNode => 
{
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<POCRenderer | null>(null)

    // Initialize renderer
    useEffect(() => 
    {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        if (!context) 
        {
            console.error('Failed to get 2D context')
            return
        }

        rendererRef.current = new POCRenderer(context)
        
        return () => 
        {
            if (rendererRef.current) 
            {
                rendererRef.current.dispose()
            }
        }
    }, [])

    // Expose render method to parent
    useEffect(() => 
    {
        if (rendererRef.current && matchEngine) 
        {
            // Store reference to render function for parent to call
            const renderFunction = () => {
                if (rendererRef.current && matchEngine) 
                {
                    const gameState = matchEngine.getGameState()
                    rendererRef.current.render(gameState)
                }
            }
            
            // Expose render function via a custom property
            ;(matchEngine as any).__renderFunction = renderFunction
            
            // Initial render
            renderFunction()
        }
    }, [matchEngine])

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0a5d0a' // Dark green background
        }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    border: '2px solid #ffffff',
                    borderRadius: '8px'
                }}
            />
        </div>
    )
}