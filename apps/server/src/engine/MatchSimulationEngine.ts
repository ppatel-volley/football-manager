/**
 * Match Simulation Engine for VGF Football Manager
 * Integrates POC match logic with VGF framework for deterministic gameplay
 * Uses GameRNG and GameClock for reproducible results
 */
import { COORDINATE_UTILS, FORMATION_POSITIONS, KEY_POSITIONS } from "../constants/FIFA"
import type { GameState, Player } from "../shared/types/GameState"
import { GameClock } from "../utils/GameClock"
import { GameRNG } from "../utils/GameRNG"

export class MatchSimulationEngine
{
    private clock: GameClock

private eventQueue: MatchEvent[] = []

private rng: GameRNG
    
    
    
    constructor(matchSeed: number)
    {
        this.rng = new GameRNG(matchSeed)
        this.clock = new GameClock(0, 1) // Real-time initially
    }

    /**
     * Start or stop the match clock
     */
public controlClock(start: boolean): void
    {
        if (start)
        {
            this.clock.start()
        }
        else
        {
            this.clock.stop()
        }
    }

/**
     * Execute a shooting action
     */
public executeShoot(gameState: GameState, team: 'HOME' | 'AWAY'): GameState
    {
        const shootingTeam = team === 'HOME' ? gameState.homeTeam : gameState.awayTeam
        
        // Find player with ball
        const ballCarrier = shootingTeam.players.find(p => p.hasBall)
        if (!ballCarrier)
        {
            return gameState
        }

        // Clear possession
        ballCarrier.hasBall = false
        gameState.ball.possessor = null

        // Calculate shot direction and power
        const targetGoal = team === 'HOME' ? KEY_POSITIONS.AWAY_GOAL_CENTRE : KEY_POSITIONS.HOME_GOAL_CENTRE
        const shotAccuracy = this.calculateShotAccuracy(ballCarrier, targetGoal)
        
        // Determine if it's a goal (based on distance, angle, player attributes)
        const isGoal = this.rng.nextBoolean(shotAccuracy * 0.15) // Base 15% chance modified by accuracy

        const updatedState = { ...gameState }
        
        if (isGoal)
        {
            // Update score
            if (team === 'HOME')
            {
                updatedState.score.home += 1
            }
            else
            {
                updatedState.score.away += 1
            }
            
            // Schedule goal celebration and kickoff restart
            this.scheduleEvent({
                type: 'GOAL_CELEBRATION',
                executeTime: this.clock.getCurrentTime() + 2,
                data: { scoringTeam: team }
            })
            
            this.scheduleEvent({
                type: 'KICKOFF_RESTART', 
                executeTime: this.clock.getCurrentTime() + 5,
                data: { kickingTeam: team === 'HOME' ? 'AWAY' : 'HOME' }
            })
        }
        else
        {
            // Move ball based on shot trajectory
            const direction = this.calculateShotTrajectory(ballCarrier.position, targetGoal, shotAccuracy)
            updatedState.ball.velocity = direction
            updatedState.ball.isMoving = true
        }

        // Update shot statistics
        updatedState.stats.shots[team] += 1

        return updatedState
    }

/**
     * Execute a tactical command on the match
     */
public executeTacticalCommand(gameState: GameState, command: {
        type: 'ATTACK' | 'DEFEND' | 'BALANCE';
        team: 'HOME' | 'AWAY';
    }): GameState
    {
        const targetTeam = command.team === 'HOME' ? gameState.homeTeam : gameState.awayTeam
        
        // Update team tactical style
        targetTeam.tacticalStyle = command.type
        
        // Adjust player positions based on tactical style
        const adjustedPositions = this.adjustFormationForTactics(targetTeam, command.type)
        
        // Update player target positions
        targetTeam.players.forEach((player, index) =>
        {
            if (adjustedPositions[index])
            {
                player.targetPosition = adjustedPositions[index]
            }
        })

        return {
            ...gameState,
            lastCommand: {
                type: command.type,
                team: command.team,
                timestamp: this.clock.getCurrentTime()
            }
        }
    }

/**
     * Set clock time scale (for accelerated simulation)
     */
public setTimeScale(scale: number): void
    {
        this.clock.setTimeScale(scale)
    }

/**
     * Set up match for kickoff
     */
public setupKickoff(gameState: GameState, kickingTeam: 'HOME' | 'AWAY'): GameState
    {
        // Reset ball to centre
        const updatedState = {
            ...gameState,
            ball: {
                ...gameState.ball,
                position: { ...KEY_POSITIONS.CENTRE_SPOT },
                velocity: { x: 0, y: 0 },
                isMoving: false,
                possessor: null
            }
        }

        // Position players in formation
        const homePositions = FORMATION_POSITIONS['4-4-2'].HOME
        const awayPositions = FORMATION_POSITIONS['4-4-2'].AWAY
        
        updatedState.homeTeam.players.forEach((player, index) =>
        {
            if (homePositions[index])
            {
                player.position = { ...homePositions[index] }
                player.targetPosition = { ...homePositions[index] }
                player.hasBall = false
            }
        })
        
        updatedState.awayTeam.players.forEach((player, index) =>
        {
            if (awayPositions[index])
            {
                player.position = { ...awayPositions[index] }
                player.targetPosition = { ...awayPositions[index] }
                player.hasBall = false
            }
        })

        // Give ball to kicking team's centre forward
        const kickingTeamData = kickingTeam === 'HOME' ? updatedState.homeTeam : updatedState.awayTeam
        const centreForward = kickingTeamData.players.find(p => 
            p.position.x === (kickingTeam === 'HOME' ? 0.65 : 0.35) && 
            Math.abs(p.position.y - 0.5) < 0.1
        )
        
        if (centreForward)
        {
            centreForward.hasBall = true
            updatedState.ball.possessor = centreForward.id
        }

        return updatedState
    }

/**
     * Update simulation state for one frame
     */
    public updateSimulation(gameState: GameState, deltaTime: number): GameState
    {
        // Update game clock
        this.clock.update()
        
        // Process scheduled events
        const updatedState = this.processScheduledEvents(gameState)
        
        // Update player positions and movement
        const withPlayerMovement = this.updatePlayerMovement(updatedState, deltaTime)
        
        // Update ball physics
        const withBallMovement = this.updateBallMovement(withPlayerMovement, deltaTime)
        
        // Update possession logic
        const withPossession = this.updateBallPossession(withBallMovement)
        
        // Check for game events (goals, out of play, etc.)
        const withEvents = this.checkGameEvents(withPossession)
        
        // Update match statistics
        const withStats = this.updateMatchStats(withEvents, deltaTime)
        
        return {
            ...withStats,
            gameTime: this.clock.getCurrentTime(),
            footballTime: this.clock.getFormattedTime(),
            footballHalf: this.clock.getCurrentHalf()
        }
    }

    
    

    


    

    



    

    
    

    
    

    private adjustFormationForTactics(team: { id: string }, tactic: string): Array<{ x: number; y: number }>
    {
        const basePositions = FORMATION_POSITIONS['4-4-2'][team.id.toUpperCase() as 'HOME' | 'AWAY'] || []
        
        return basePositions.map(pos =>
        {
            switch (tactic)
            {
                case 'ATTACK':
                    // Push players forward
                    return {
                        x: team.id === 'home' ? Math.min(1, pos.x + 0.05) : Math.max(0, pos.x - 0.05),
                        y: pos.y
                    }
                    
                case 'DEFEND':
                    // Pull players back
                    return {
                        x: team.id === 'home' ? Math.max(0, pos.x - 0.05) : Math.min(1, pos.x + 0.05),
                        y: pos.y
                    }
                    
                default:
                    return { x: pos.x, y: pos.y }
            }
        })
    }

private calculateShotAccuracy(player: Player, targetGoal: { x: number; y: number }): number
    {
        const distance = COORDINATE_UTILS.distance(player.position, targetGoal)
        const baseAccuracy = player.attributes.shooting / 10
        const distancePenalty = Math.min(distance / 50, 1) // Penalty increases with distance
        
        return Math.max(0.1, baseAccuracy - distancePenalty)
    }

private calculateShotTrajectory(
        playerPos: { x: number; y: number }, 
        target: { x: number; y: number }, 
        accuracy: number
    ): { x: number; y: number }
    {
        const dx = target.x - playerPos.x
        const dy = target.y - playerPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance === 0) return { x: 0, y: 0 }
        
        // Add inaccuracy
        const inaccuracy = (1 - accuracy) * this.rng.nextFloat(-0.2, 0.2)
        const adjustedDy = dy + inaccuracy
        
        // Normalise and apply power
        const power = 0.5 // Ball speed in normalised coordinates per second
        return {
            x: (dx / distance) * power,
            y: (adjustedDy / distance) * power
        }
    }

private checkBallOutOfPlay(gameState: GameState): { outOfPlay: boolean; gameState: GameState }
    {
        const { x, y } = gameState.ball.position
        
        if (x < 0 || x > 1 || y < 0 || y > 1)
        {
            // Ball is out of play - determine restart type
            // This is a simplified implementation - full logic would handle corners, throw-ins, etc.
            return {
                outOfPlay: true,
                gameState: {
                    ...gameState,
                    ball: {
                        ...gameState.ball,
                        position: { ...KEY_POSITIONS.CENTRE_SPOT },
                        velocity: { x: 0, y: 0 },
                        isMoving: false,
                        possessor: null
                    }
                }
            }
        }
        
        return { outOfPlay: false, gameState }
    }

private checkForGoals(gameState: GameState): { goalScored: boolean; gameState: GameState }
    {
        const ball = gameState.ball
        
        // Check home goal (away team scores)
        if (ball.position.x <= 0 && Math.abs(ball.position.y - 0.5) <= 0.1)
        {
            return {
                goalScored: true,
                gameState: {
                    ...gameState,
                    score: { ...gameState.score, away: gameState.score.away + 1 }
                }
            }
        }
        
        // Check away goal (home team scores) 
        if (ball.position.x >= 1 && Math.abs(ball.position.y - 0.5) <= 0.1)
        {
            return {
                goalScored: true,
                gameState: {
                    ...gameState,
                    score: { ...gameState.score, home: gameState.score.home + 1 }
                }
            }
        }
        
        return { goalScored: false, gameState }
    }

private checkGameEvents(gameState: GameState): GameState
    {
        // Check for goals
        const goalResult = this.checkForGoals(gameState)
        if (goalResult.goalScored)
        {
            return goalResult.gameState
        }
        
        // Check for ball out of play
        const outOfPlayResult = this.checkBallOutOfPlay(gameState)
        if (outOfPlayResult.outOfPlay)
        {
            return outOfPlayResult.gameState
        }
        
        return gameState
    }

private executeAutoPass(gameState: GameState, data: { playerId: string }): GameState
    {
        const player = this.findPlayerById(gameState, data.playerId)
        if (!player || !player.hasBall)
        {
            return gameState
        }

        // Find best teammate to pass to
        const playerTeam = gameState.homeTeam.players.find(p => p.id === data.playerId) ? 'HOME' : 'AWAY'
        const teammates = playerTeam === 'HOME' ? 
            gameState.homeTeam.players.filter(p => p.id !== data.playerId) :
            gameState.awayTeam.players.filter(p => p.id !== data.playerId)
        
        if (teammates.length === 0) return gameState
        
        // Choose teammate closest to opponent's goal
        const targetGoal = playerTeam === 'HOME' ? KEY_POSITIONS.AWAY_GOAL_CENTRE : KEY_POSITIONS.HOME_GOAL_CENTRE
        let bestTeammate = teammates[0]
        let bestDistance = COORDINATE_UTILS.distance(bestTeammate.position, targetGoal)
        
        for (const teammate of teammates)
        {
            const distance = COORDINATE_UTILS.distance(teammate.position, targetGoal)
            if (distance < bestDistance)
            {
                bestDistance = distance
                bestTeammate = teammate
            }
        }
        
        // Execute pass
        player.hasBall = false
        const dx = bestTeammate.position.x - player.position.x
        const dy = bestTeammate.position.y - player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0)
        {
            const passSpeed = 0.3
            return {
                ...gameState,
                ball: {
                    ...gameState.ball,
                    possessor: null,
                    velocity: {
                        x: (dx / distance) * passSpeed,
                        y: (dy / distance) * passSpeed
                    },
                    isMoving: true
                }
            }
        }
        
        return gameState
    }

private executeEvent(gameState: GameState, event: MatchEvent): GameState
    {
        switch (event.type)
        {
            case 'GOAL_CELEBRATION':
                // Players celebrate goal
                return this.executeGoalCelebration(gameState, event.data)
                
            case 'KICKOFF_RESTART':
                // Set up kickoff for specified team
                return this.setupKickoff(gameState, (event.data as { kickingTeam: 'HOME' | 'AWAY' }).kickingTeam)
                
            case 'AUTO_PASS':
                // AI player automatically passes
                return this.executeAutoPass(gameState, event.data)
                
            case 'POSITION_ADJUSTMENT':
                // Adjust player positions for tactical reasons
                return this.executePositionAdjustment(gameState, event.data)
                
            default:
                return gameState
        }
    }

private executeGoalCelebration(gameState: GameState, _data: unknown): GameState
    {
        // Simple goal celebration - could be expanded
        return gameState
    }

private executePositionAdjustment(gameState: GameState, _data: unknown): GameState
    {
        // Implement tactical position adjustments
        return gameState
    }

private findPlayerById(gameState: GameState, playerId: string): Player | null
    {
        for (const player of gameState.homeTeam.players)
        {
            if (player.id === playerId) return player
        }
        
        for (const player of gameState.awayTeam.players)
        {
            if (player.id === playerId) return player
        }
        
        return null
    }

private movePlayerTowardsTarget(player: Player, deltaTime: number): Player
    {
        const dx = player.targetPosition.x - player.position.x
        const dy = player.targetPosition.y - player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0.001) // Small threshold for normalised coordinates
        {
            const moveSpeed = (player.attributes.pace / 10) * deltaTime * 0.1 // Normalised movement speed
            const ratio = Math.min(moveSpeed / distance, 1)
            
            return {
                ...player,
                position: {
                    x: player.position.x + dx * ratio,
                    y: player.position.y + dy * ratio
                }
            }
        }
        
        return player
    }

private processScheduledEvents(gameState: GameState): GameState
    {
        const currentTime = this.clock.getCurrentTime()
        const eventsToExecute = this.eventQueue.filter(event => event.executeTime <= currentTime)
        
        // Remove executed events
        this.eventQueue = this.eventQueue.filter(event => event.executeTime > currentTime)
        
        let updatedState = { ...gameState }
        
        // Execute each event
        for (const event of eventsToExecute)
        {
            updatedState = this.executeEvent(updatedState, event)
        }
        
        return updatedState
    }

    

    



private scheduleEvent(event: MatchEvent): void
    {
        this.eventQueue.push(event)
        this.eventQueue.sort((a, b) => a.executeTime - b.executeTime)
    }

private updateBallMovement(gameState: GameState, deltaTime: number): GameState
    {
        if (!gameState.ball.isMoving)
        {
            // Ball follows possessor if any
            if (gameState.ball.possessor)
            {
                const possessor = this.findPlayerById(gameState, gameState.ball.possessor)
                if (possessor)
                {
                    return {
                        ...gameState,
                        ball: {
                            ...gameState.ball,
                            position: { 
                                x: possessor.position.x,
                                y: possessor.position.y 
                            }
                        }
                    }
                }
            }
            return gameState
        }

        // Apply ball physics
        const newPosition = {
            x: gameState.ball.position.x + gameState.ball.velocity.x * deltaTime,
            y: gameState.ball.position.y + gameState.ball.velocity.y * deltaTime
        }
        
        // Apply friction
        const friction = 0.95
        const newVelocity = {
            x: gameState.ball.velocity.x * friction,
            y: gameState.ball.velocity.y * friction
        }
        
        // Stop ball if velocity is very low
        const speed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y)
        const isMoving = speed > 0.01
        
        return {
            ...gameState,
            ball: {
                ...gameState.ball,
                position: newPosition,
                velocity: isMoving ? newVelocity : { x: 0, y: 0 },
                isMoving
            }
        }
    }

private updateBallPossession(gameState: GameState): GameState
    {
        // If ball is moving fast, no possession
        const ballSpeed = Math.sqrt(
            gameState.ball.velocity.x * gameState.ball.velocity.x + 
            gameState.ball.velocity.y * gameState.ball.velocity.y
        )
        
        if (ballSpeed > 0.1) // Fast moving ball threshold
        {
            return {
                ...gameState,
                ball: { ...gameState.ball, possessor: null },
                homeTeam: {
                    ...gameState.homeTeam,
                    players: gameState.homeTeam.players.map(p => ({ ...p, hasBall: false }))
                },
                awayTeam: {
                    ...gameState.awayTeam,
                    players: gameState.awayTeam.players.map(p => ({ ...p, hasBall: false }))
                }
            }
        }

        // Find closest player to ball
        let closestPlayer: Player | null = null
        let closestDistance = Infinity
        let closestTeam: 'HOME' | 'AWAY' = 'HOME'
        
        // Check home team players
        for (const player of gameState.homeTeam.players)
        {
            const distance = COORDINATE_UTILS.distance(player.position, gameState.ball.position)
            if (distance < closestDistance)
            {
                closestDistance = distance
                closestPlayer = player
                closestTeam = 'HOME'
            }
        }
        
        // Check away team players
        for (const player of gameState.awayTeam.players)
        {
            const distance = COORDINATE_UTILS.distance(player.position, gameState.ball.position)
            if (distance < closestDistance)
            {
                closestDistance = distance
                closestPlayer = player
                closestTeam = 'AWAY'
            }
        }
        
        // Update possession if player is close enough
        const possessionDistance = 5 // metres
        if (closestPlayer && closestDistance < possessionDistance)
        {
            // Clear all possession
            const updatedState = {
                ...gameState,
                homeTeam: {
                    ...gameState.homeTeam,
                    players: gameState.homeTeam.players.map(p => ({ ...p, hasBall: false }))
                },
                awayTeam: {
                    ...gameState.awayTeam,
                    players: gameState.awayTeam.players.map(p => ({ ...p, hasBall: false }))
                }
            }
            
            // Give possession to closest player
            if (closestTeam === 'HOME')
            {
                const playerIndex = updatedState.homeTeam.players.findIndex(p => p.id === closestPlayer.id)
                if (playerIndex !== -1)
                {
                    updatedState.homeTeam.players[playerIndex].hasBall = true
                }
            }
            else
            {
                const playerIndex = updatedState.awayTeam.players.findIndex(p => p.id === closestPlayer.id)
                if (playerIndex !== -1)
                {
                    updatedState.awayTeam.players[playerIndex].hasBall = true
                }
            }
            
            updatedState.ball.possessor = closestPlayer.id
            updatedState.ballPossession = closestTeam
            
            // Schedule AI action for non-human teams
            if (closestTeam === 'AWAY') // Assuming away team is AI
            {
                this.scheduleEvent({
                    type: 'AUTO_PASS',
                    executeTime: this.clock.getCurrentTime() + this.rng.nextFloat(1, 3),
                    data: { playerId: closestPlayer.id }
                })
            }
            
            return updatedState
        }
        
        return gameState
    }

private updateMatchStats(gameState: GameState, deltaTime: number): GameState
    {
        // Update possession time
        const ballPossession = gameState.ballPossession
        if (ballPossession)
        {
            return {
                ...gameState,
                stats: {
                    ...gameState.stats,
                    possessionSeconds: {
                        ...gameState.stats.possessionSeconds,
                        [ballPossession]: gameState.stats.possessionSeconds[ballPossession] + deltaTime
                    }
                }
            }
        }
        
        return gameState
    }

private updatePlayerMovement(gameState: GameState, deltaTime: number): GameState
    {
        const updatedState = { ...gameState }
        
        // Update home team players
        updatedState.homeTeam.players = updatedState.homeTeam.players.map(player =>
            this.movePlayerTowardsTarget(player, deltaTime)
        )
        
        // Update away team players
        updatedState.awayTeam.players = updatedState.awayTeam.players.map(player =>
            this.movePlayerTowardsTarget(player, deltaTime)
        )
        
        return updatedState
    }

    

    












    

    

    





    

    














    

    


    

    



    

    

    

    
}

// Types for match events
interface MatchEvent
{
    type: 'GOAL_CELEBRATION' | 'KICKOFF_RESTART' | 'AUTO_PASS' | 'POSITION_ADJUSTMENT'
    executeTime: number
    data: unknown
}