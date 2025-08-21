import React, { useEffect, useRef } from 'react'

/**
 * Canvas-based Football Pitch Renderer
 * 
 * Renders FIFA-accurate football pitch with players and ball using HTML5 Canvas.
 * Optimized for 30 FPS rendering with 2D presentation of 3D ball physics.
 * 
 * Features:
 * - FIFA-standard pitch proportions (100m x 64m)
 * - Player sprites with team colors
 * - Ball with height simulation (scaling and shadow)
 * - Normalized coordinate system (0-1)
 */

interface PitchCanvasProps
{
    gameState: {
        homeTeam: {
            name: string
            players: Array<{
                id: string
                name: string
                position: { x: number; y: number }
                team: 'HOME' | 'AWAY'
                hasBall: boolean
            }>
        }
        awayTeam: {
            name: string
            players: Array<{
                id: string
                name: string
                position: { x: number; y: number }
                team: 'HOME' | 'AWAY'
                hasBall: boolean
            }>
        }
        ball: {
            position: { x: number; y: number }
            height?: number
            isMoving: boolean
        }
        score: { home: number; away: number }
        footballTime: string
    }
    width?: number
    height?: number
}

export const PitchCanvas: React.FC<PitchCanvasProps> = ({ 
    gameState, 
    width = 800, 
    height = 512 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationIdRef = useRef<number>()

    // FIFA standard pitch proportions (100m x 64m)
    const PITCH_RATIO = 64 / 100 // Height/Width ratio
    const PITCH_WIDTH = width * 0.9 // 90% of canvas width
    const PITCH_HEIGHT = PITCH_WIDTH * PITCH_RATIO
    const PITCH_OFFSET_X = (width - PITCH_WIDTH) / 2
    const PITCH_OFFSET_Y = (height - PITCH_HEIGHT) / 2

    // Colors
    const COLORS = {
        pitch: '#1e7b32',        // Football pitch green
        lines: '#ffffff',        // White pitch markings
        homeTeam: '#ff0000',     // Red for home team
        awayTeam: '#0000ff',     // Blue for away team
        ball: '#ffffff',         // White ball
        ballShadow: 'rgba(0,0,0,0.3)', // Ball shadow
        background: '#0d5a1a'    // Darker green background
    }

    const drawPitch = (ctx: CanvasRenderingContext2D): void => {
        // Clear canvas
        ctx.fillStyle = COLORS.background
        ctx.fillRect(0, 0, width, height)

        // Draw pitch background
        ctx.fillStyle = COLORS.pitch
        ctx.fillRect(PITCH_OFFSET_X, PITCH_OFFSET_Y, PITCH_WIDTH, PITCH_HEIGHT)

        // Set line style
        ctx.strokeStyle = COLORS.lines
        ctx.lineWidth = 2
        ctx.fillStyle = COLORS.lines

        // Draw pitch outline
        ctx.strokeRect(PITCH_OFFSET_X, PITCH_OFFSET_Y, PITCH_WIDTH, PITCH_HEIGHT)

        // Draw center line
        const centerX = PITCH_OFFSET_X + PITCH_WIDTH / 2
        ctx.beginPath()
        ctx.moveTo(centerX, PITCH_OFFSET_Y)
        ctx.lineTo(centerX, PITCH_OFFSET_Y + PITCH_HEIGHT)
        ctx.stroke()

        // Draw center circle
        const centerY = PITCH_OFFSET_Y + PITCH_HEIGHT / 2
        const circleRadius = (PITCH_WIDTH / 100) * 9.15 // 9.15m radius in FIFA rules
        ctx.beginPath()
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2)
        ctx.stroke()

        // Draw center spot
        ctx.beginPath()
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
        ctx.fill()

        // Draw penalty areas
        const penaltyWidth = (PITCH_WIDTH / 100) * 40.32 // 40.32m width
        const penaltyHeight = (PITCH_HEIGHT / 64) * 16.5 // 16.5m depth
        const goalAreaWidth = (PITCH_WIDTH / 100) * 18.32 // 18.32m width
        const goalAreaHeight = (PITCH_HEIGHT / 64) * 5.5 // 5.5m depth

        // Left penalty area
        const leftPenaltyX = PITCH_OFFSET_X
        const leftPenaltyY = PITCH_OFFSET_Y + (PITCH_HEIGHT - penaltyWidth) / 2
        ctx.strokeRect(leftPenaltyX, leftPenaltyY, penaltyHeight, penaltyWidth)

        // Left goal area
        const leftGoalY = PITCH_OFFSET_Y + (PITCH_HEIGHT - goalAreaWidth) / 2
        ctx.strokeRect(leftPenaltyX, leftGoalY, goalAreaHeight, goalAreaWidth)

        // Right penalty area
        const rightPenaltyX = PITCH_OFFSET_X + PITCH_WIDTH - penaltyHeight
        ctx.strokeRect(rightPenaltyX, leftPenaltyY, penaltyHeight, penaltyWidth)

        // Right goal area
        const rightGoalX = PITCH_OFFSET_X + PITCH_WIDTH - goalAreaHeight
        ctx.strokeRect(rightGoalX, leftGoalY, goalAreaHeight, goalAreaWidth)

        // Draw penalty spots
        const penaltySpotDistance = (PITCH_WIDTH / 100) * 11 // 11m from goal line
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + penaltySpotDistance, centerY, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + PITCH_WIDTH - penaltySpotDistance, centerY, 2, 0, Math.PI * 2)
        ctx.fill()

        // Draw penalty arcs (10-yard arcs from penalty spot)
        const penaltyArcRadius = (PITCH_WIDTH / 100) * 9.15 // 9.15m radius (10 yards)
        
        // Left penalty arc
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + penaltySpotDistance, centerY, penaltyArcRadius, -Math.PI/2, Math.PI/2)
        ctx.stroke()
        
        // Right penalty arc  
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + PITCH_WIDTH - penaltySpotDistance, centerY, penaltyArcRadius, Math.PI/2, 3*Math.PI/2)
        ctx.stroke()

        // Draw corner arcs (1m radius at each corner)
        const cornerArcRadius = (PITCH_WIDTH / 100) * 1 // 1m radius
        
        // Top-left corner arc
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X, PITCH_OFFSET_Y, cornerArcRadius, 0, Math.PI/2)
        ctx.stroke()
        
        // Top-right corner arc
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + PITCH_WIDTH, PITCH_OFFSET_Y, cornerArcRadius, Math.PI/2, Math.PI)
        ctx.stroke()
        
        // Bottom-left corner arc
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X, PITCH_OFFSET_Y + PITCH_HEIGHT, cornerArcRadius, 3*Math.PI/2, 2*Math.PI)
        ctx.stroke()
        
        // Bottom-right corner arc
        ctx.beginPath()
        ctx.arc(PITCH_OFFSET_X + PITCH_WIDTH, PITCH_OFFSET_Y + PITCH_HEIGHT, cornerArcRadius, Math.PI, 3*Math.PI/2)
        ctx.stroke()

        // Draw goals
        const goalWidth = (PITCH_HEIGHT / 64) * 7.32 // 7.32m goal width
        const goalDepth = 8 // 8 pixels depth for visual effect
        const goalY = PITCH_OFFSET_Y + (PITCH_HEIGHT - goalWidth) / 2

        // Left goal
        ctx.strokeRect(PITCH_OFFSET_X - goalDepth, goalY, goalDepth, goalWidth)
        
        // Right goal
        ctx.strokeRect(PITCH_OFFSET_X + PITCH_WIDTH, goalY, goalDepth, goalWidth)
    }

    const drawPlayers = (ctx: CanvasRenderingContext2D): void => {
        const playerRadius = 8

        // Draw home team players
        gameState.homeTeam.players.forEach(player => {
            const screenX = PITCH_OFFSET_X + player.position.x * PITCH_WIDTH
            const screenY = PITCH_OFFSET_Y + (1 - player.position.y) * PITCH_HEIGHT // Flip Y coordinate

            ctx.fillStyle = player.hasBall ? '#ffff00' : COLORS.homeTeam // Yellow if has ball
            ctx.strokeStyle = COLORS.lines
            ctx.lineWidth = 2

            ctx.beginPath()
            ctx.arc(screenX, screenY, playerRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            // Draw player name
            ctx.fillStyle = COLORS.lines
            ctx.font = '10px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(player.name.split(' ')[0], screenX, screenY + 20) // First name only
        })

        // Draw away team players
        gameState.awayTeam.players.forEach(player => {
            const screenX = PITCH_OFFSET_X + player.position.x * PITCH_WIDTH
            const screenY = PITCH_OFFSET_Y + (1 - player.position.y) * PITCH_HEIGHT // Flip Y coordinate

            ctx.fillStyle = player.hasBall ? '#ffff00' : COLORS.awayTeam // Yellow if has ball
            ctx.strokeStyle = COLORS.lines
            ctx.lineWidth = 2

            ctx.beginPath()
            ctx.arc(screenX, screenY, playerRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            // Draw player name
            ctx.fillStyle = COLORS.lines
            ctx.font = '10px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(player.name.split(' ')[0], screenX, screenY + 20) // First name only
        })
    }

    const drawBall = (ctx: CanvasRenderingContext2D): void => {
        const screenX = PITCH_OFFSET_X + gameState.ball.position.x * PITCH_WIDTH
        const screenY = PITCH_OFFSET_Y + (1 - gameState.ball.position.y) * PITCH_HEIGHT // Flip Y coordinate

        // Calculate ball size based on height (3D effect)
        const ballHeight = gameState.ball.height || 0
        const baseRadius = 6
        const heightScale = 1 + ballHeight * 0.5 // Scale up to 150% at max height
        const ballRadius = baseRadius * heightScale

        // Draw ball shadow (offset based on height)
        const shadowOffset = ballHeight * 10 // Shadow moves as ball gets higher
        ctx.fillStyle = COLORS.ballShadow
        ctx.beginPath()
        ctx.ellipse(
            screenX + shadowOffset,
            screenY + shadowOffset,
            baseRadius * 0.8, // Shadow is smaller
            baseRadius * 0.4, // Shadow is flatter
            0, 0, Math.PI * 2
        )
        ctx.fill()

        // Draw ball
        ctx.fillStyle = COLORS.ball
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1

        ctx.beginPath()
        ctx.arc(screenX, screenY - ballHeight * 20, ballRadius, 0, Math.PI * 2) // Lift ball based on height
        ctx.fill()
        ctx.stroke()

        // Add simple ball pattern (cross)
        if (ballRadius > 4) {
            ctx.strokeStyle = '#888888'
            ctx.lineWidth = 1
            const patternSize = ballRadius * 0.6
            const ballCenterX = screenX
            const ballCenterY = screenY - ballHeight * 20

            ctx.beginPath()
            ctx.moveTo(ballCenterX - patternSize, ballCenterY)
            ctx.lineTo(ballCenterX + patternSize, ballCenterY)
            ctx.moveTo(ballCenterX, ballCenterY - patternSize)
            ctx.lineTo(ballCenterX, ballCenterY + patternSize)
            ctx.stroke()
        }
    }

    const drawHUD = (ctx: CanvasRenderingContext2D): void => {
        // Score and time display
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(10, 10, width - 20, 60)

        ctx.fillStyle = COLORS.lines
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'

        // Score
        const scoreText = `${gameState.homeTeam.name} ${gameState.score.home} - ${gameState.score.away} ${gameState.awayTeam.name}`
        ctx.fillText(scoreText, width / 2, 35)

        // Time
        ctx.font = '16px Arial'
        ctx.fillText(`${gameState.footballTime}'`, width / 2, 55)
    }

    const render = (): void => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear and draw everything
        drawPitch(ctx)
        drawPlayers(ctx)
        drawBall(ctx)
        drawHUD(ctx)

        // Schedule next frame (30 FPS)
        animationIdRef.current = requestAnimationFrame(() => {
            setTimeout(render, 1000 / 30) // 30 FPS cap
        })
    }

    useEffect(() => {
        render()
        
        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current)
            }
        }
    }, [gameState])

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                border: '2px solid #333',
                borderRadius: '8px',
                backgroundColor: COLORS.background
            }}
        />
    )
}