import type { GameState, Player, Ball, Vector2 } from "../types/POCTypes"
import { POC_CONFIG } from "../types/POCTypes"

export class POCRenderer
{
    private context: CanvasRenderingContext2D
    private fieldWidth: number
    private fieldHeight: number

    constructor(context: CanvasRenderingContext2D)
    {
        this.context = context
        this.fieldWidth = POC_CONFIG.FIELD_WIDTH
        this.fieldHeight = POC_CONFIG.FIELD_HEIGHT
    }

    public render(gameState: GameState): void
    {
        this.clearCanvas()
        this.renderPitch()
        this.renderPlayers(gameState.teams[0].players, gameState.teams[1].players)
        this.renderBall(gameState.ball)
        this.renderUI(gameState)
    }

    public dispose(): void
    {
        // No cleanup needed for basic renderer
    }

    private clearCanvas(): void
    {
        this.context.fillStyle = '#0a5d0a' // Dark green
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height)
    }

    private renderPitch(): void
    {
        const ctx = this.context
        const canvas = ctx.canvas

        // Calculate pitch position (centered in canvas)
        const pitchX = (canvas.width - this.fieldWidth) / 2
        const pitchY = (canvas.height - this.fieldHeight) / 2

        // Save context for pitch rendering
        ctx.save()
        ctx.translate(pitchX, pitchY)

        // Pitch background
        ctx.fillStyle = '#2d8f2d'
        ctx.fillRect(0, 0, this.fieldWidth, this.fieldHeight)

        // Pitch lines
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2

        // Outer boundary
        ctx.strokeRect(0, 0, this.fieldWidth, this.fieldHeight)

        // Center line
        ctx.beginPath()
        ctx.moveTo(this.fieldWidth / 2, 0)
        ctx.lineTo(this.fieldWidth / 2, this.fieldHeight)
        ctx.stroke()

        // Center circle (10 yard radius = ~75px at this scale)
        const centerCircleRadius = 75
        ctx.beginPath()
        ctx.arc(this.fieldWidth / 2, this.fieldHeight / 2, centerCircleRadius, 0, 2 * Math.PI)
        ctx.stroke()

        // Center spot
        ctx.beginPath()
        ctx.arc(this.fieldWidth / 2, this.fieldHeight / 2, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Soccer field markings with proper proportions
        // Goal width: 8 yards = ~145px at this scale
        // Goal area (6-yard box): 6 yards from goal line, 20 yards wide = ~45px x 145px
        // Penalty area (18-yard box): 18 yards from goal line, 44 yards wide = ~135px x 320px
        const goalWidth = 145
        const goalDepth = 15
        const goalAreaDepth = 45  // 6 yards
        const goalAreaWidth = 145  // 20 yards
        const penaltyAreaDepth = 135  // 18 yards
        const penaltyAreaWidth = 320  // 44 yards
        const penaltySpotDistance = 90  // 12 yards from goal line

        const goalY = (this.fieldHeight - goalWidth) / 2
        const goalAreaY = (this.fieldHeight - goalAreaWidth) / 2
        const penaltyAreaY = (this.fieldHeight - penaltyAreaWidth) / 2

        // LEFT SIDE (Red team defends)
        // Penalty area (18-yard box)
        ctx.strokeRect(0, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)

        // Goal area (6-yard box)
        ctx.strokeRect(0, goalAreaY, goalAreaDepth, goalAreaWidth)

        // Penalty spot
        ctx.beginPath()
        ctx.arc(penaltySpotDistance, this.fieldHeight / 2, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Penalty arc (10-yard arc from penalty spot)
        ctx.beginPath()
        ctx.arc(penaltySpotDistance, this.fieldHeight / 2, centerCircleRadius, -Math.PI/3, Math.PI/3)
        ctx.stroke()

        // RIGHT SIDE (Blue team defends)
        // Penalty area (18-yard box)
        ctx.strokeRect(this.fieldWidth - penaltyAreaDepth, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)

        // Goal area (6-yard box)
        ctx.strokeRect(this.fieldWidth - goalAreaDepth, goalAreaY, goalAreaDepth, goalAreaWidth)

        // Penalty spot
        ctx.beginPath()
        ctx.arc(this.fieldWidth - penaltySpotDistance, this.fieldHeight / 2, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Penalty arc (10-yard arc from penalty spot)
        ctx.beginPath()
        ctx.arc(this.fieldWidth - penaltySpotDistance, this.fieldHeight / 2, centerCircleRadius, Math.PI*2/3, Math.PI*4/3)
        ctx.stroke()

        // Corner arcs (1-yard radius = ~7px)
        const cornerRadius = 7
        // Top-left corner
        ctx.beginPath()
        ctx.arc(0, 0, cornerRadius, 0, Math.PI/2)
        ctx.stroke()
        // Bottom-left corner
        ctx.beginPath()
        ctx.arc(0, this.fieldHeight, cornerRadius, -Math.PI/2, 0)
        ctx.stroke()
        // Top-right corner
        ctx.beginPath()
        ctx.arc(this.fieldWidth, 0, cornerRadius, Math.PI/2, Math.PI)
        ctx.stroke()
        // Bottom-right corner
        ctx.beginPath()
        ctx.arc(this.fieldWidth, this.fieldHeight, cornerRadius, Math.PI, -Math.PI/2)
        ctx.stroke()

        // Goals (darker rectangles behind the goal line)
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(-goalDepth, goalY, goalDepth, goalWidth)
        ctx.fillRect(this.fieldWidth, goalY, goalDepth, goalWidth)

        // Goal posts (white rectangles)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(-5, goalY, 5, 8)  // Left post top
        ctx.fillRect(-5, goalY + goalWidth - 8, 5, 8)  // Left post bottom
        ctx.fillRect(this.fieldWidth, goalY, 5, 8)  // Right post top
        ctx.fillRect(this.fieldWidth, goalY + goalWidth - 8, 5, 8)  // Right post bottom

        ctx.restore()
    }

    private renderPlayers(redTeam: Player[], blueTeam: Player[]): void
    {
        const ctx = this.context
        const canvas = ctx.canvas
        const pitchX = (canvas.width - this.fieldWidth) / 2
        const pitchY = (canvas.height - this.fieldHeight) / 2

        ctx.save()
        ctx.translate(pitchX, pitchY)

        // Render red team players
        ctx.fillStyle = '#ff4444'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2

        for (const player of redTeam)
        {
            this.renderPlayer(player, '#ff4444')
        }

        // Render blue team players
        for (const player of blueTeam)
        {
            this.renderPlayer(player, '#4444ff')
        }

        ctx.restore()
    }

    private renderPlayer(player: Player, color: string): void
    {
        const ctx = this.context
        const radius = player.playerType === 'GOALKEEPER' ? 12 : 10

        // Player body
        ctx.beginPath()
        ctx.arc(player.position.x, player.position.y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Ball indicator
        if (player.hasBall)
        {
            ctx.beginPath()
            ctx.arc(player.position.x, player.position.y, radius + 5, 0, 2 * Math.PI)
            ctx.strokeStyle = '#ffff00'
            ctx.lineWidth = 3
            ctx.stroke()
        }

        // Player number (simple)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Extract number from player name (e.g., "RED 1" -> "1")
        const numberMatch = player.name.match(/\d+/)
        const number = numberMatch ? numberMatch[0] : '?'
        ctx.fillText(number, player.position.x, player.position.y)

        // Player state indicator (debug)
        if (process.env.NODE_ENV === 'development')
        {
            ctx.fillStyle = '#000000'
            ctx.font = '8px Arial'
            ctx.fillText(player.state.substring(0, 3).toUpperCase(), player.position.x, player.position.y - 20)
        }
    }

    private renderBall(ball: Ball): void
    {
        const ctx = this.context
        const canvas = ctx.canvas
        const pitchX = (canvas.width - this.fieldWidth) / 2
        const pitchY = (canvas.height - this.fieldHeight) / 2

        ctx.save()
        ctx.translate(pitchX, pitchY)

        // Ball
        ctx.beginPath()
        ctx.arc(ball.position.x, ball.position.y, 6, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.stroke()

        // Ball movement trail (if moving)
        if (ball.isMoving)
        {
            const trailLength = 20
            const trailX = ball.position.x - (ball.velocity.x / POC_CONFIG.BALL_SPEED) * trailLength
            const trailY = ball.position.y - (ball.velocity.y / POC_CONFIG.BALL_SPEED) * trailLength

            ctx.beginPath()
            ctx.moveTo(trailX, trailY)
            ctx.lineTo(ball.position.x, ball.position.y)
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.stroke()
        }

        ctx.restore()
    }

    private renderUI(gameState: GameState): void
    {
        const ctx = this.context

        // Render tactical indicators
        this.renderTacticalIndicators(gameState)

        // Debug info (development only)
        if (process.env.NODE_ENV === 'development')
        {
            this.renderDebugInfo(gameState)
        }
        this.renderStats(gameState)
    }

    private renderTacticalIndicators(gameState: GameState): void
    {
        const ctx = this.context

        // Team tactical styles
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'left'

        ctx.fillText(`Red Team: ${gameState.teams[0].tacticalStyle}`, 20, 30)
        ctx.fillText(`Blue Team: ${gameState.teams[1].tacticalStyle}`, 20, 50)

        // Ball possession
        const ballCarrier = this.findBallCarrier(gameState)
        if (ballCarrier)
        {
            ctx.fillText(`Ball: ${ballCarrier.name}`, 20, 70)
        }
        else
        {
            ctx.fillText('Ball: Free', 20, 70)
        }
    }

    private renderDebugInfo(gameState: GameState): void
    {
        const ctx = this.context

        ctx.fillStyle = '#ffff00'
        ctx.font = '12px monospace'
        ctx.textAlign = 'right'

        const debugY = ctx.canvas.height - 20
        ctx.fillText(`FPS: ${Math.round(60)}`, ctx.canvas.width - 20, debugY)
        ctx.fillText(`Active: ${gameState.isActive}`, ctx.canvas.width - 20, debugY - 20)
        ctx.fillText(`Time: ${gameState.gameTime.toFixed(1)}s`, ctx.canvas.width - 20, debugY - 40)
    }

    private renderStats(gameState: GameState): void
    {
        const ctx = this.context
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'left'
        const baseY = 100
        const toPercent = (r: number, b: number) => {
            const total = r + b
            if (total === 0) return [50, 50]
            return [Math.round((r / total) * 100), Math.round((b / total) * 100)]
        }

        const [posRed, posBlue] = toPercent(
            gameState.stats.possessionSeconds.RED,
            gameState.stats.possessionSeconds.BLUE
        )
        ctx.fillText(`Possession: Red ${posRed}%  |  Blue ${posBlue}%`, 20, baseY)
        ctx.fillText(
            `Shots: Red ${gameState.stats.shots.RED}  |  Blue ${gameState.stats.shots.BLUE}`,
            20,
            baseY + 20
        )
        ctx.fillText(
            `Corners: Red ${gameState.stats.corners.RED}  |  Blue ${gameState.stats.corners.BLUE}`,
            20,
            baseY + 40
        )
    }

    private findBallCarrier(gameState: GameState): Player | null
    {
        for (const team of gameState.teams)
        {
            for (const player of team.players)
            {
                if (player.hasBall)
                {
                    return player
                }
            }
        }
        return null
    }
}