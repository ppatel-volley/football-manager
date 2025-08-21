import type { GameRNG } from "../utils/GameRNG"

/**
 * Formation Engine implementing UberFormationData schema
 * 
 * Manages player positioning based on formation data with 20×15 grid system.
 * Provides phase-aware positioning and tactical adjustments.
 * 
 * Grid system: 20 columns × 15 rows = 300 zones (5.5m × 4.53m per cell)
 * Normalized coordinates: (0,0) = bottom-left, (1,1) = top-right
 */

export interface UberFormationData
{
    name: string // e.g. "4-4-2", "4-3-3", "3-5-2"
    players: Record<string, PlayerFormationData> // Key format: x{col}_y{row}
    description?: string
    tags?: string[]
}

export interface PlayerFormationData
{
    role: PlayerRole
    posture: PlayingPosture
    phases: Record<GamePhase, PhasePositioning>
    specialInstructions?: SpecialInstruction[]
}

export enum PlayerRole
{
    GOALKEEPER = 'GOALKEEPER',
    CENTRE_BACK = 'CENTRE_BACK', 
    FULL_BACK = 'FULL_BACK',
    WING_BACK = 'WING_BACK',
    DEFENSIVE_MIDFIELDER = 'DEFENSIVE_MIDFIELDER',
    CENTRAL_MIDFIELDER = 'CENTRAL_MIDFIELDER',
    ATTACKING_MIDFIELDER = 'ATTACKING_MIDFIELDER',
    WINGER = 'WINGER',
    STRIKER = 'STRIKER'
}

export enum PlayingPosture
{
    VERY_DEFENSIVE = 'VERY_DEFENSIVE',
    DEFENSIVE = 'DEFENSIVE',
    BALANCED = 'BALANCED',
    ATTACKING = 'ATTACKING',
    VERY_ATTACKING = 'VERY_ATTACKING'
}

export enum GamePhase
{
    DEFENDING = 'DEFENDING',      // Team without ball
    NEUTRAL = 'NEUTRAL',         // Transition phase
    ATTACKING = 'ATTACKING',     // Team with ball
    SET_PIECE = 'SET_PIECE'      // Dead ball situations
}

export interface PhasePositioning
{
    gridPosition: GridKey        // Primary position in 20×15 grid
    movement: MovementPattern    // How player moves in this phase
    priority: number            // Priority for this position (1-10)
}

export type GridKey = string // Format: "x{col}_y{row}" e.g. "x10_y8"

export interface MovementPattern
{
    type: 'STATIC' | 'ROAMING' | 'SUPPORT_RUN' | 'PRESSING'
    intensity: number           // 0-1: how aggressively to move
    direction: 'FORWARD' | 'BACKWARD' | 'LATERAL' | 'FREE'
    maxDistance: number         // Maximum distance from base position
}

export interface SpecialInstruction
{
    type: 'STAY_WIDE' | 'CUT_INSIDE' | 'OVERLAP' | 'PRESS_HIGH' | 'DROP_DEEP'
    conditions?: string[]       // When to apply this instruction
}

export class FormationEngine
{
    private static readonly CELL_HEIGHT = 1 / FormationEngine.GRID_ROWS

private static readonly CELL_WIDTH = 1 / FormationEngine.GRID_COLS

private currentFormation: Map<'HOME' | 'AWAY', UberFormationData> = new Map()

private static readonly GRID_COLS = 20

    private static readonly GRID_ROWS = 15
    
    

    

    private rng: GameRNG

    /**
     * Calculate target position for player based on current game context
     */
public calculatePlayerPosition(
        team: 'HOME' | 'AWAY',
        playerId: string,
        gamePhase: GamePhase,
        ballPosition: { x: number; y: number },
        tacticalStyle?: 'ATTACK' | 'DEFEND' | 'BALANCE'
    ): { x: number; y: number } | null
    {
        const formation = this.currentFormation.get(team)
        if (!formation)
        {
            return null
        }

        // Find player in formation
        const playerData = Object.values(formation.players).find(p => 
            p.role === this.getPlayerRole(playerId) // This would need to be passed or stored
        )

        if (!playerData)
        {
            return null
        }

        const phasePositioning = playerData.phases[gamePhase]
        if (!phasePositioning)
        {
            return null
        }

        // Get base position from grid
        let basePosition = this.gridKeyToPosition(phasePositioning.gridPosition)

        // Apply tactical adjustments
        if (tacticalStyle)
        {
            basePosition = this.applyTacticalAdjustment(basePosition, team, tacticalStyle)
        }

        // Apply movement pattern
        const adjustedPosition = this.applyMovementPattern(
            basePosition,
            phasePositioning.movement,
            ballPosition,
            team
        )

        return adjustedPosition
    }

constructor(rng: GameRNG)
    {
        this.rng = rng
    }

    /**
     * Get all player positions for a team in current game context
     */
public getTeamPositions(
        team: 'HOME' | 'AWAY',
        gamePhase: GamePhase,
        ballPosition: { x: number; y: number },
        playerIds: string[],
        tacticalStyle?: 'ATTACK' | 'DEFEND' | 'BALANCE'
    ): Record<string, { x: number; y: number }>
    {
        const positions: Record<string, { x: number; y: number }> = {}

        for (const playerId of playerIds)
        {
            const position = this.calculatePlayerPosition(
                team,
                playerId,
                gamePhase,
                ballPosition,
                tacticalStyle
            )

            if (position)
            {
                positions[playerId] = position
            }
        }

        return positions
    }

/**
     * Get normalized position from grid key
     */
public gridKeyToPosition(gridKey: GridKey): { x: number; y: number }
    {
        const match = gridKey.match(/^x(\d+)_y(\d+)$/)
        if (!match)
        {
            throw new Error(`Invalid grid key format: ${gridKey}`)
        }

        const col = parseInt(match[1], 10)
        const row = parseInt(match[2], 10)

        if (col < 0 || col >= FormationEngine.GRID_COLS || row < 0 || row >= FormationEngine.GRID_ROWS)
        {
            throw new Error(`Grid position out of bounds: ${gridKey}`)
        }

        return {
            x: (col + 0.5) * FormationEngine.CELL_WIDTH,
            y: (row + 0.5) * FormationEngine.CELL_HEIGHT
        }
    }

/**
     * Load formation for specific team
     */
    public loadFormation(team: 'HOME' | 'AWAY', formation: UberFormationData): void
    {
        this.currentFormation.set(team, formation)
    }

    
    

    

/**
     * Convert normalized position to grid key
     */
    public positionToGridKey(x: number, y: number): GridKey
    {
        const col = Math.floor(x / FormationEngine.CELL_WIDTH)
        const row = Math.floor(y / FormationEngine.CELL_HEIGHT)
        
        const clampedCol = Math.max(0, Math.min(FormationEngine.GRID_COLS - 1, col))
        const clampedRow = Math.max(0, Math.min(FormationEngine.GRID_ROWS - 1, row))
        
        return `x${clampedCol}_y${clampedRow}`
    }

    
    

    
    

    /**
     * Apply movement pattern to base position
     */
private applyMovementPattern(
        basePosition: { x: number; y: number },
        movement: MovementPattern,
        ballPosition: { x: number; y: number },
        team: 'HOME' | 'AWAY'
    ): { x: number; y: number }
    {
        switch (movement.type)
        {
            case 'STATIC':
                return basePosition

            case 'ROAMING':
                // Small random movement around base position
                const roamDistance = movement.maxDistance * movement.intensity
                return {
                    x: basePosition.x + this.rng.nextFloat(-roamDistance, roamDistance),
                    y: basePosition.y + this.rng.nextFloat(-roamDistance, roamDistance)
                }

            case 'SUPPORT_RUN':
                // Move towards ball or supporting position
                const supportDistance = movement.maxDistance * movement.intensity
                const ballDirection = {
                    x: ballPosition.x - basePosition.x,
                    y: ballPosition.y - basePosition.y
                }
                const ballDist = Math.sqrt(ballDirection.x ** 2 + ballDirection.y ** 2)
                
                if (ballDist > 0)
                {
                    return {
                        x: basePosition.x + (ballDirection.x / ballDist) * supportDistance,
                        y: basePosition.y + (ballDirection.y / ballDist) * supportDistance
                    }
                }
                return basePosition

            case 'PRESSING':
                // Aggressive movement towards ball
                const pressDistance = movement.maxDistance * movement.intensity
                const pressingDirection = {
                    x: ballPosition.x - basePosition.x,
                    y: ballPosition.y - basePosition.y
                }
                const pressingDist = Math.sqrt(pressingDirection.x ** 2 + pressingDirection.y ** 2)
                
                if (pressingDist > 0)
                {
                    return {
                        x: basePosition.x + (pressingDirection.x / pressingDist) * pressDistance,
                        y: basePosition.y + (pressingDirection.y / pressingDist) * pressDistance
                    }
                }
                return basePosition

            default:
                return basePosition
        }
    }

/**
     * Apply tactical style adjustment to position
     */
private applyTacticalAdjustment(
        position: { x: number; y: number },
        team: 'HOME' | 'AWAY',
        style: 'ATTACK' | 'DEFEND' | 'BALANCE'
    ): { x: number; y: number }
    {
        const adjustmentFactor = 0.05 // 5% of pitch width

        switch (style)
        {
            case 'ATTACK':
                // Push players forward
                return {
                    x: team === 'HOME' 
                        ? Math.min(0.95, position.x + adjustmentFactor)
                        : Math.max(0.05, position.x - adjustmentFactor),
                    y: position.y
                }
            
            case 'DEFEND':
                // Pull players back
                return {
                    x: team === 'HOME'
                        ? Math.max(0.05, position.x - adjustmentFactor)
                        : Math.min(0.95, position.x + adjustmentFactor),
                    y: position.y
                }
            
            case 'BALANCE':
            default:
                return position
        }
    }

/**
     * Create 3-5-2 formation template
     */
private static create352Formation(): UberFormationData
    {
        return {
            name: '3-5-2',
            description: 'Formation with three centre-backs and five midfielders',
            players: {
                // Simplified template
                'x2_y7': {
                    role: PlayerRole.GOALKEEPER,
                    posture: PlayingPosture.DEFENSIVE,
                    phases: {
                        [GamePhase.DEFENDING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.2, direction: 'FREE', maxDistance: 0.05 },
                            priority: 10
                        },
                        [GamePhase.NEUTRAL]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FREE', maxDistance: 0.03 },
                            priority: 10
                        },
                        [GamePhase.ATTACKING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FORWARD', maxDistance: 0.02 },
                            priority: 9
                        },
                        [GamePhase.SET_PIECE]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0, direction: 'FREE', maxDistance: 0 },
                            priority: 10
                        }
                    }
                }
            }
        }
    }

/**
     * Create 4-2-3-1 formation template
     */
private static create4231Formation(): UberFormationData
    {
        return {
            name: '4-2-3-1',
            description: 'Modern formation with two holding midfielders',
            players: {
                // Simplified template
                'x2_y7': {
                    role: PlayerRole.GOALKEEPER,
                    posture: PlayingPosture.DEFENSIVE,
                    phases: {
                        [GamePhase.DEFENDING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.2, direction: 'FREE', maxDistance: 0.05 },
                            priority: 10
                        },
                        [GamePhase.NEUTRAL]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FREE', maxDistance: 0.03 },
                            priority: 10
                        },
                        [GamePhase.ATTACKING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FORWARD', maxDistance: 0.02 },
                            priority: 9
                        },
                        [GamePhase.SET_PIECE]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0, direction: 'FREE', maxDistance: 0 },
                            priority: 10
                        }
                    }
                }
            }
        }
    }

/**
     * Create 4-3-3 formation template
     */
private static create433Formation(): UberFormationData
    {
        return {
            name: '4-3-3',
            description: 'Attacking formation with three forwards',
            players: {
                // Simplified template - would include all positions
                'x2_y7': {
                    role: PlayerRole.GOALKEEPER,
                    posture: PlayingPosture.DEFENSIVE,
                    phases: {
                        [GamePhase.DEFENDING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.2, direction: 'FREE', maxDistance: 0.05 },
                            priority: 10
                        },
                        [GamePhase.NEUTRAL]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FREE', maxDistance: 0.03 },
                            priority: 10
                        },
                        [GamePhase.ATTACKING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FORWARD', maxDistance: 0.02 },
                            priority: 9
                        },
                        [GamePhase.SET_PIECE]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0, direction: 'FREE', maxDistance: 0 },
                            priority: 10
                        }
                    }
                }
            }
        }
    }

/**
     * Create 4-4-2 formation template
     */
private static create442Formation(): UberFormationData
    {
        return {
            name: '4-4-2',
            description: 'Classic balanced formation with two banks of four',
            players: {
                'x2_y7': { // Goalkeeper
                    role: PlayerRole.GOALKEEPER,
                    posture: PlayingPosture.DEFENSIVE,
                    phases: {
                        [GamePhase.DEFENDING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.2, direction: 'FREE', maxDistance: 0.05 },
                            priority: 10
                        },
                        [GamePhase.NEUTRAL]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FREE', maxDistance: 0.03 },
                            priority: 10
                        },
                        [GamePhase.ATTACKING]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0.1, direction: 'FORWARD', maxDistance: 0.02 },
                            priority: 9
                        },
                        [GamePhase.SET_PIECE]: {
                            gridPosition: 'x2_y7',
                            movement: { type: 'STATIC', intensity: 0, direction: 'FREE', maxDistance: 0 },
                            priority: 10
                        }
                    }
                },
                // Add more positions for full 4-4-2 formation...
                // This is a simplified example - full implementation would have all 11 positions
            }
        }
    }

/**
     * Get player role for positioning (placeholder - would be stored in player data)
     */
private getPlayerRole(playerId: string): PlayerRole
    {
        // This is a placeholder - in reality this would come from player data
        // For now, assign roles based on player ID patterns
        if (playerId.includes('GK')) return PlayerRole.GOALKEEPER
        if (playerId.includes('CB')) return PlayerRole.CENTRE_BACK
        if (playerId.includes('FB')) return PlayerRole.FULL_BACK
        if (playerId.includes('CM')) return PlayerRole.CENTRAL_MIDFIELDER
        if (playerId.includes('ST')) return PlayerRole.STRIKER
        
        return PlayerRole.CENTRAL_MIDFIELDER // Default
    }

/**
     * Create standard formations
     */
    public static createStandardFormation(name: string): UberFormationData
    {
        switch (name)
        {
            case '4-4-2':
                return FormationEngine.create442Formation()
            case '4-3-3':
                return FormationEngine.create433Formation()
            case '3-5-2':
                return FormationEngine.create352Formation()
            case '4-2-3-1':
                return FormationEngine.create4231Formation()
            default:
                throw new Error(`Unknown formation: ${name}`)
        }
    }

    
    

    
    

    









    

    
    

    




    

    
    

    
    
}