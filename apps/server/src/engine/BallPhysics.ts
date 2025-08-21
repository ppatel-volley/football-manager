import type { GameRNG } from "../utils/GameRNG"

/**
 * 3D Ball Physics Engine with 2D Presentation
 * 
 * Implements realistic ball physics with gravity, friction, and bouncing
 * while presenting everything in 2D with height simulation through scaling and shadows.
 * 
 * All coordinates are normalized (0-1) for device-agnostic simulation.
 */

export interface Vector3
{
    x: number
    y: number 
    z: number // Height above ground
}

export interface Vector2
{
    x: number
    y: number
}

export interface BallState
{
    position: Vector3      // Current 3D position
    velocity: Vector3      // Current 3D velocity
    isMoving: boolean      // Is ball currently in motion
    possessor: string | null // Player ID who has ball (null if loose)
    lastTouchPlayer: string | null
    lastTouchTeam: 'HOME' | 'AWAY' | null
}

export class BallPhysics
{
    private ballState: BallState

// Ground friction coefficient
private static readonly BOUNCE_DAMPING = 0.6

// m/s² - standard earth gravity
private static readonly FRICTION = 0.8

private static readonly GRAVITY = 9.81 
     

     // Stop below this velocity

private static readonly MAX_HEIGHT = 0.2

// Energy loss on bounce
    private static readonly MIN_VELOCITY = 0.01 
     // Maximum ball height (normalized)
    
    // Pitch boundaries (normalized coordinates)
    private static readonly PITCH_BOUNDS = {
        minX: 0.05, // 5% margin
        maxX: 0.95, // 95% 
        minY: 0.1,  // 10% margin
        maxY: 0.9   // 90%
    }

    
    private rng: GameRNG

    constructor(rng: GameRNG, initialPosition: Vector2 = { x: 0.5, y: 0.5 })
    {
        this.rng = rng
        this.ballState = {
            position: { x: initialPosition.x, y: initialPosition.y, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isMoving: false,
            possessor: null,
            lastTouchPlayer: null,
            lastTouchTeam: null
        }
    }

    /**
     * Get 2D position for rendering (with height represented as scaling)
     */
public get2DPosition(): Vector2
    {
        return {
            x: this.ballState.position.x,
            y: this.ballState.position.y
        }
    }

/**
     * Get current ball state
     */
public getBallState(): BallState
    {
        return { ...this.ballState }
    }

/**
     * Get height for 2D scaling effect
     */
public getHeightForScaling(): number
    {
        return Math.max(0, this.ballState.position.z / BallPhysics.MAX_HEIGHT)
    }

/**
     * Check if ball is out of bounds
     */
public isOutOfBounds(): { isOut: boolean; side: 'touchline' | 'goal_line' | null }
    {
        const pos = this.ballState.position
        
        if (pos.x <= BallPhysics.PITCH_BOUNDS.minX || pos.x >= BallPhysics.PITCH_BOUNDS.maxX)
        {
            return { isOut: true, side: 'touchline' }
        }
        
        if (pos.y <= BallPhysics.PITCH_BOUNDS.minY || pos.y >= BallPhysics.PITCH_BOUNDS.maxY)
        {
            return { isOut: true, side: 'goal_line' }
        }

        return { isOut: false, side: null }
    }

/**
     * Kick ball with given force and direction
     */
public kick(direction: Vector2, power: number, height: number = 0): void
    {
        // Normalize direction vector
        const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2)
        if (magnitude === 0) return

        const normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude
        }

        // Apply kick force
        this.ballState.velocity.x = normalizedDir.x * power
        this.ballState.velocity.y = normalizedDir.y * power
        this.ballState.velocity.z = height * power * 0.5 // Convert height to vertical velocity

        this.ballState.isMoving = true
        this.ballState.possessor = null // Ball is no longer possessed when kicked
    }

/**
     * Pass ball between players with realistic trajectory
     */
public pass(targetPosition: Vector2, power: number, passType: 'ground' | 'lob' | 'driven' = 'ground'): void
    {
        const direction = {
            x: targetPosition.x - this.ballState.position.x,
            y: targetPosition.y - this.ballState.position.y
        }

        let height = 0
        switch (passType)
        {
            case 'ground':
                height = 0.1
                break
            case 'lob':
                height = 0.8
                power *= 1.2 // Need more power for lob
                break
            case 'driven':
                height = 0.3
                power *= 1.1
                break
        }

        this.kick(direction, power, height)
    }

/**
     * Predict where ball will land (for AI positioning)
     */
public predictLandingPosition(lookAheadTime: number = 2.0): Vector2
    {
        if (!this.ballState.isMoving) return this.get2DPosition()

        // Simple physics prediction
        const futureX = this.ballState.position.x + this.ballState.velocity.x * lookAheadTime
        const futureY = this.ballState.position.y + this.ballState.velocity.y * lookAheadTime

        // Clamp to pitch boundaries
        return {
            x: Math.max(BallPhysics.PITCH_BOUNDS.minX, Math.min(BallPhysics.PITCH_BOUNDS.maxX, futureX)),
            y: Math.max(BallPhysics.PITCH_BOUNDS.minY, Math.min(BallPhysics.PITCH_BOUNDS.maxY, futureY))
        }
    }

/**
     * Release ball from possession
     */
public releasePossession(): void
    {
        this.ballState.possessor = null
    }

/**
     * Reset ball to specific position
     */
public resetToPosition(position: Vector2): void
    {
        this.ballState.position = { x: position.x, y: position.y, z: 0 }
        this.ballState.velocity = { x: 0, y: 0, z: 0 }
        this.ballState.isMoving = false
        this.ballState.possessor = null
    }

/**
     * Set ball possession to specific player
     */
public setPossession(playerId: string, team: 'HOME' | 'AWAY'): void
    {
        this.ballState.possessor = playerId
        this.ballState.lastTouchPlayer = playerId
        this.ballState.lastTouchTeam = team
        this.ballState.isMoving = false
        this.ballState.velocity = { x: 0, y: 0, z: 0 }
    }

/**
     * Update ball physics for one fixed timestep
     */
    public update(deltaTime: number): void
    {
        if (!this.ballState.isMoving && this.ballState.possessor === null)
        {
            return // Ball is stationary and not possessed
        }

        // Apply gravity to Z velocity
        this.ballState.velocity.z -= BallPhysics.GRAVITY * deltaTime

        // Update position based on velocity
        this.ballState.position.x += this.ballState.velocity.x * deltaTime
        this.ballState.position.y += this.ballState.velocity.y * deltaTime
        this.ballState.position.z += this.ballState.velocity.z * deltaTime

        // Ground collision (bounce)
        if (this.ballState.position.z <= 0)
        {
            this.ballState.position.z = 0
            this.ballState.velocity.z = -this.ballState.velocity.z * BallPhysics.BOUNCE_DAMPING
            
            // Apply ground friction to horizontal movement
            this.ballState.velocity.x *= BallPhysics.FRICTION
            this.ballState.velocity.y *= BallPhysics.FRICTION
        }

        // Boundary collision (simplified - just bounce off)
        this.handleBoundaryCollisions()

        // Check if ball should stop moving
        const totalVelocity = Math.sqrt(
            this.ballState.velocity.x ** 2 + 
            this.ballState.velocity.y ** 2 + 
            this.ballState.velocity.z ** 2
        )

        if (totalVelocity < BallPhysics.MIN_VELOCITY && this.ballState.position.z <= 0.001)
        {
            this.ballState.velocity = { x: 0, y: 0, z: 0 }
            this.ballState.position.z = 0
            this.ballState.isMoving = false
        }
        else
        {
            this.ballState.isMoving = true
        }
    }

    
    

    








    

    








    

    
    

    
    

    
    

    
    

    
    

    
    

    
    

    /**
     * Handle boundary collisions with pitch edges
     */
    private handleBoundaryCollisions(): void
    {
        const pos = this.ballState.position
        const vel = this.ballState.velocity

        // X boundaries (touchlines)
        if (pos.x <= BallPhysics.PITCH_BOUNDS.minX && vel.x < 0)
        {
            this.ballState.velocity.x = -vel.x * 0.8 // Reverse and dampen
            this.ballState.position.x = BallPhysics.PITCH_BOUNDS.minX
        }
        else if (pos.x >= BallPhysics.PITCH_BOUNDS.maxX && vel.x > 0)
        {
            this.ballState.velocity.x = -vel.x * 0.8
            this.ballState.position.x = BallPhysics.PITCH_BOUNDS.maxX
        }

        // Y boundaries (goal lines)
        if (pos.y <= BallPhysics.PITCH_BOUNDS.minY && vel.y < 0)
        {
            this.ballState.velocity.y = -vel.y * 0.8
            this.ballState.position.y = BallPhysics.PITCH_BOUNDS.minY
        }
        else if (pos.y >= BallPhysics.PITCH_BOUNDS.maxY && vel.y > 0)
        {
            this.ballState.velocity.y = -vel.y * 0.8
            this.ballState.position.y = BallPhysics.PITCH_BOUNDS.maxY
        }
    }
}