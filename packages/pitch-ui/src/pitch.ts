/**
 * FIFA standard pitch rendering utility functions
 */

export interface PitchDimensions
{
    fieldWidth: number
    fieldHeight: number
}

/**
 * Renders a FIFA-standard football pitch on a canvas context
 */
export function drawPitch(ctx: CanvasRenderingContext2D, fieldWidth: number, fieldHeight: number): void
{
    // Outer boundary
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, fieldWidth, fieldHeight)

    // Center line
    ctx.beginPath()
    ctx.moveTo(fieldWidth / 2, 0)
    ctx.lineTo(fieldWidth / 2, fieldHeight)
    ctx.stroke()

    // Center circle: 9.15m radius (13.46% of pitch width)
    const centerCircleRadius = (9.15 / 68) * fieldHeight
    
    // Penalty arc: 9.15m radius (same as center circle)
    const penaltyArcRadius = centerCircleRadius
    ctx.beginPath()
    ctx.arc(fieldWidth / 2, fieldHeight / 2, centerCircleRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Center spot
    ctx.beginPath()
    ctx.arc(fieldWidth / 2, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()

    // FIFA standard dimensions (based on 110m × 68m pitch - maximum FIFA length)
    // Goal: 7.32m wide (10.76% of pitch width)
    const goalWidth = 0.1076 * fieldHeight
    // Goal area: 5.5m deep × 18.32m wide
    const goalAreaDepth = (5.5 / 110) * fieldWidth  // 5.0% of pitch length
    const goalAreaWidth = (18.32 / 68) * fieldHeight // 26.94% of pitch width
    // Penalty area: 16.5m deep × 40.32m wide  
    const penaltyAreaDepth = (16.5 / 110) * fieldWidth // 15.0% of pitch length
    const penaltyAreaWidth = (40.32 / 68) * fieldHeight // 59.29% of pitch width
    // Penalty spot: 11m from goal line
    const penaltySpotDistance = (11 / 110) * fieldWidth // 10.0% of pitch length
    const goalDepth = 0.009 * fieldWidth
    // Corner arc: 1m radius
    const cornerRadius = (1 / 68) * fieldHeight // 1.47% of pitch width

    const goalY = (fieldHeight - goalWidth) / 2
    const goalAreaY = (fieldHeight - goalAreaWidth) / 2
    const penaltyAreaY = (fieldHeight - penaltyAreaWidth) / 2

    // Left penalty area
    ctx.strokeRect(0, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)
    // Left goal area
    ctx.strokeRect(0, goalAreaY, goalAreaDepth, goalAreaWidth)
    // Left penalty spot
    ctx.beginPath()
    ctx.arc(penaltySpotDistance, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    // Left penalty arc - only draw the part outside the penalty box
    const arcStartAngle = Math.acos((penaltyAreaDepth - penaltySpotDistance) / penaltyArcRadius)
    ctx.beginPath()
    ctx.arc(penaltySpotDistance, fieldHeight / 2, penaltyArcRadius, -arcStartAngle, arcStartAngle)
    ctx.stroke()

    // Right penalty area
    ctx.strokeRect(fieldWidth - penaltyAreaDepth, penaltyAreaY, penaltyAreaDepth, penaltyAreaWidth)
    // Right goal area
    ctx.strokeRect(fieldWidth - goalAreaDepth, goalAreaY, goalAreaDepth, goalAreaWidth)
    // Right penalty spot
    ctx.beginPath()
    ctx.arc(fieldWidth - penaltySpotDistance, fieldHeight / 2, 3, 0, Math.PI * 2)
    ctx.fill()
    // Right penalty arc - only draw the part outside the penalty box
    ctx.beginPath()
    ctx.arc(fieldWidth - penaltySpotDistance, fieldHeight / 2, penaltyArcRadius, Math.PI - arcStartAngle, Math.PI + arcStartAngle)
    ctx.stroke()

    // Corner arcs
    ctx.beginPath()
    ctx.arc(0, 0, cornerRadius, 0, Math.PI / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, fieldHeight, cornerRadius, -Math.PI / 2, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(fieldWidth, 0, cornerRadius, Math.PI / 2, Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(fieldWidth, fieldHeight, cornerRadius, Math.PI, -Math.PI / 2)
    ctx.stroke()

    // Goals behind the line
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(-goalDepth, goalY, goalDepth, goalWidth)
    ctx.fillRect(fieldWidth, goalY, goalDepth, goalWidth)

    // Goal posts
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(-5, goalY, 5, 8)
    ctx.fillRect(-5, goalY + goalWidth - 8, 5, 8)
    ctx.fillRect(fieldWidth, goalY, 5, 8)
    ctx.fillRect(fieldWidth, goalY + goalWidth - 8, 5, 8)
}

/**
 * Pitch colors and styling constants
 */
export const PITCH_COLORS = {
    GRASS: "#2d8f2d",
    GRASS_DARK: "#0a5d0a",
    LINES: "#ffffff",
    GRID: "#2f7f2f",
    GOAL_SHADOW: "#1a1a1a"
} as const