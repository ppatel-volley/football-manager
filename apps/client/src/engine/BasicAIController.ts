import type { Player, GameState, Vector2 } from "../types/POCTypes"
import { PlayerState, POC_CONFIG } from "../types/POCTypes"
import { SeededRNG } from "../utils/SeededRNG"

export class BasicAIController
{
    private rng: SeededRNG

    constructor(rng: SeededRNG) {
        this.rng = rng
    }

    public updatePlayerBehaviour(player: Player, gameState: GameState): void
    {
        // Freeze AI during set pieces and when GK has ball in hands (POC)
        if (gameState.phase === 'CORNER_KICK' || gameState.phase === 'GOAL_KICK' || gameState.phase === 'THROW_IN' || gameState.ball.inGoalkeeperHands)
        {
            player.state = PlayerState.MAINTAINING_POSITION
            return
        }

        // Handle restarts and kickoff phases first
        if ((gameState.phase === 'KICKOFF')
            && player.state === PlayerState.WAITING_KICKOFF)
        {
            // During kickoff, position players to be available for pass
            this.positionForKickoffPass(player, gameState)
            return
        }

        // Simple AI state machine for normal play
        if (this.shouldSeekBall(player, gameState))
        {
            player.state = PlayerState.SEEKING_BALL
            this.seekBall(player, gameState)
        }
        else if (this.shouldAttack(player, gameState))
        {
            player.state = PlayerState.ATTACKING
            this.moveToAttackingPosition(player, gameState)
        }
        else if (this.shouldDefend(player, gameState))
        {
            player.state = PlayerState.DEFENDING
            this.moveToDefensivePosition(player, gameState)
        }
        else
        {
            player.state = PlayerState.MAINTAINING_POSITION
            this.maintainPosition(player, gameState)
        }

        // Apply collision avoidance to prevent player crowding
        this.avoidPlayerCollisions(player, gameState)

        // Goalkeeper special behaviour
        if (player.playerType === 'GOALKEEPER')
        {
            this.defendGoal(player, gameState)
        }
    }

    private shouldSeekBall(player: Player, gameState: GameState): boolean
    {
        if (player.playerType === 'GOALKEEPER') return false

        // If player has the ball, they should not be seeking it
        if (player.hasBall) return false

        // FIFA Law 12: Cannot challenge goalkeeper when ball is in their hands
        if (gameState.ball.inGoalkeeperHands) {
            return false // Cannot seek ball held by goalkeeper
        }

        const distanceToBall = this.calculateDistance(player.position, gameState.ball.position)
        const noBallPossessor = !gameState.ball.possessor
        const myTeamHasBall = this.teamHasBall(player.team, gameState)
        const oppositionTeamHasBall = this.teamHasBall(player.team === 'RED' ? 'BLUE' : 'RED', gameState)

        // Always seek loose balls if close enough
        if (noBallPossessor && distanceToBall < 200)
        {
            return true
        }

        // Press opposition when they have the ball
        if (oppositionTeamHasBall && distanceToBall < 150)
        {
            return true
        }

        // Support teammate with ball by getting into space
        if (myTeamHasBall && !player.hasBall)
        {
            // Move to support if not too far
            return distanceToBall < 300
        }

        return false
    }

    private shouldAttack(player: Player, gameState: GameState): boolean
    {
        const team = gameState.teams.find(t => t.color === player.team)
        if (!team || player.playerType === 'GOALKEEPER') return false

        const isAttackingStyle = team.tacticalStyle === 'ATTACK'
        const isBalancedStyle = team.tacticalStyle === 'BALANCE'
        const teamHasBall = this.teamHasBall(player.team, gameState)

        // If this player has the ball and is in opponent's half, be aggressive
        if (player.hasBall) {
            const opponentHalfX = player.team === 'RED'
                ? POC_CONFIG.FIELD_WIDTH / 2
                : POC_CONFIG.FIELD_WIDTH / 2
            const inOpponentHalf = player.team === 'RED'
                ? player.position.x > opponentHalfX
                : player.position.x < opponentHalfX

            if (inOpponentHalf) return true
        }

        // Attack when team style is attacking or balanced and team has ball
        return (isAttackingStyle || isBalancedStyle) && teamHasBall
    }

    private shouldDefend(player: Player, gameState: GameState): boolean
    {
        const team = gameState.teams.find(t => t.color === player.team)
        if (!team) return false

        const isDefendingStyle = team.tacticalStyle === 'DEFEND'
        const opponentHasBall = !this.teamHasBall(player.team, gameState)

        return isDefendingStyle || opponentHasBall
    }

    private seekBall(player: Player, gameState: GameState): void
    {
        const ballPos = gameState.ball.position
        const myTeamHasBall = this.teamHasBall(player.team, gameState)

        if (myTeamHasBall && !player.hasBall)
        {
            // Supporting teammate - find good passing position
            this.positionForPassReceiving(player, gameState)
        }
        else
        {
            // Go directly for the ball
            player.targetPosition = { ...ballPos }
        }

        // Keep within field boundaries
        player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
        player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
    }

    private moveToAttackingPosition(player: Player, gameState: GameState): void
    {
        const opponentGoalX = player.team === 'RED' ? POC_CONFIG.FIELD_WIDTH - 80 : 80
        const opponentGoalY = POC_CONFIG.FIELD_HEIGHT / 2

        if (player.hasBall) {
            // Player with ball should attack goal more directly
            const distanceToGoal = this.calculateDistance(player.position, { x: opponentGoalX, y: opponentGoalY })

            if (distanceToGoal < 250) {
                // Close to goal - move directly toward goal
                player.targetPosition = {
                    x: opponentGoalX + this.rng.nextSigned() * 40,
                    y: opponentGoalY + this.rng.nextSigned() * 60
                }
            }
            else {
                // Further from goal - move toward goal area more aggressively
                player.targetPosition = {
                    x: player.position.x + (opponentGoalX - player.position.x) * 0.8,
                    y: player.position.y + (opponentGoalY - player.position.y) * 0.6
                }
            }
        }
        else {
            // Player without ball - support attack from base position
            const ballY = gameState.ball.position.y
            player.targetPosition = {
                x: player.basePosition.x + (opponentGoalX - player.basePosition.x) * 0.6,
                y: player.basePosition.y + (ballY - player.basePosition.y) * 0.4
            }

            // Add some variation (deterministic)
            player.targetPosition.x += this.rng.nextSigned() * 80
            player.targetPosition.y += this.rng.nextSigned() * 80
        }

        // Clamp to field boundaries
        player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
        player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
    }

    private moveToDefensivePosition(player: Player, gameState: GameState): void
    {
        // Move towards own goal and track ball
        const ownGoalX = player.team === 'RED' ? 50 : POC_CONFIG.FIELD_WIDTH - 50
        const ballPos = gameState.ball.position

        // Position between ball and own goal
        const defenseX = player.basePosition.x + (ownGoalX - player.basePosition.x) * 0.3
        const defenseY = player.basePosition.y + (ballPos.y - player.basePosition.y) * 0.4

        player.targetPosition = {
            x: defenseX,
            y: defenseY
        }

        // Clamp to field boundaries
        player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
        player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
    }

    private maintainPosition(player: Player, gameState: GameState): void
    {
        // Dynamic positioning based on ball location
        const ballX = gameState.ball.position.x
        const ballY = gameState.ball.position.y

        // Adjust position slightly towards ball while maintaining formation
        const adjustmentFactor = 0.15 // 15% adjustment towards ball
        const baseX = player.basePosition.x
        const baseY = player.basePosition.y

        // Move slightly towards ball but stay in formation
        const adjustedX = baseX + (ballX - baseX) * adjustmentFactor
        const adjustedY = baseY + (ballY - baseY) * adjustmentFactor

        player.targetPosition = {
            x: Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, adjustedX)),
            y: Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, adjustedY))
        }
    }

    private defendGoal(player: Player, gameState: GameState): void
    {
        // Goalkeeper stays near goal line but moves laterally with ball
        const goalX = player.team === 'RED' ? 50 : POC_CONFIG.FIELD_WIDTH - 50
        const ballY = gameState.ball.position.y

        // Clamp to goal area
        const goalAreaTop = POC_CONFIG.FIELD_HEIGHT * 0.35
        const goalAreaBottom = POC_CONFIG.FIELD_HEIGHT * 0.65
        const clampedY = Math.max(goalAreaTop, Math.min(goalAreaBottom, ballY))

        player.targetPosition = { x: goalX, y: clampedY }
    }

    private teamHasBall(team: 'RED' | 'BLUE', gameState: GameState): boolean
    {
        const teamPlayers = gameState.teams.find(t => t.color === team)?.players || []
        return teamPlayers.some(player => player.hasBall)
    }

    private positionForKickoffPass(player: Player, gameState: GameState): void
    {
        // During restarts (including kickoff), position players to be available for receiving passes
        const kickingTeam = gameState.teams.find(team => team.color === gameState.kickoffTeam)
        const isKickingTeam = player.team === gameState.kickoffTeam

        if (isKickingTeam && !player.hasBall)
        {
            // Make yourself available for pass from kickoff taker
            const centerX = POC_CONFIG.FIELD_WIDTH / 2
            const centerY = POC_CONFIG.FIELD_HEIGHT / 2

            // Position slightly forward and to the side for easy pass
            const direction = player.team === 'RED' ? 1 : -1
            const sideOffset = this.rng.nextSigned() * 200

            player.targetPosition = {
                x: centerX + direction * (60 + this.rng.nextInRange(0, 40)), // 60-100 pixels forward
                y: centerY + sideOffset
            }
        }
        else
        {
            // Defending team stays in formation
            player.targetPosition = { ...player.basePosition }
        }

        // Keep within field boundaries and own half during kickoff
        const ownHalfLimit = player.team === 'RED'
            ? POC_CONFIG.FIELD_WIDTH / 2 - 10
            : POC_CONFIG.FIELD_WIDTH / 2 + 10

        if (player.team === 'RED')
        {
            player.targetPosition.x = Math.min(player.targetPosition.x, ownHalfLimit)
        }
        else
        {
            player.targetPosition.x = Math.max(player.targetPosition.x, ownHalfLimit)
        }

        player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
        player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
    }

    private positionForPassReceiving(player: Player, gameState: GameState): void
    {
        // Find ball carrier on same team
        const ballCarrier = gameState.teams
            .find(team => team.color === player.team)?.players
            .find(p => p.hasBall)

        if (!ballCarrier)
        {
            player.targetPosition = { ...player.basePosition }
            return
        }

        const ballPos = ballCarrier.position
        const opponentGoalX = player.team === 'RED' ? POC_CONFIG.FIELD_WIDTH : 0

        // Position to receive pass - either supporting or ahead of ball carrier
        const isAheadOfBall = player.team === 'RED'
            ? player.basePosition.x > ballPos.x
            : player.basePosition.x < ballPos.x

        if (isAheadOfBall)
        {
            // Player is ahead - make run towards goal
            const goalDirection = opponentGoalX > ballPos.x ? 1 : -1
            player.targetPosition = {
                x: ballPos.x + goalDirection * (80 + this.rng.nextInRange(0, 60)),
                y: ballPos.y + this.rng.nextSigned() * 120
            }
        }
        else
        {
            // Player is behind - support by coming closer at angle
            const supportAngle = this.rng.nextInRange(-Math.PI / 2, Math.PI / 2)
            const supportDistance = 60 + this.rng.nextInRange(0, 40)

            player.targetPosition = {
                x: ballPos.x + Math.cos(supportAngle) * supportDistance,
                y: ballPos.y + Math.sin(supportAngle) * supportDistance
            }
        }

        // Keep within field boundaries
        player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
        player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
    }

    private avoidPlayerCollisions(player: Player, gameState: GameState): void
    {
        const allPlayers = gameState.teams.flatMap(team => team.players)
        const avoidanceDistance = 40 // Minimum distance between players

        for (const otherPlayer of allPlayers)
        {
            if (otherPlayer.id === player.id) continue

            const distance = this.calculateDistance(player.targetPosition, otherPlayer.position)

            if (distance < avoidanceDistance && distance > 0)
            {
                // Calculate repulsion vector
                const dx = player.targetPosition.x - otherPlayer.position.x
                const dy = player.targetPosition.y - otherPlayer.position.y
                const repulsionStrength = (avoidanceDistance - distance) / avoidanceDistance

                // Apply repulsion
                const pushDistance = repulsionStrength * 30
                player.targetPosition.x += (dx / distance) * pushDistance
                player.targetPosition.y += (dy / distance) * pushDistance

                // Keep within field boundaries
                player.targetPosition.x = Math.max(10, Math.min(POC_CONFIG.FIELD_WIDTH - 10, player.targetPosition.x))
                player.targetPosition.y = Math.max(10, Math.min(POC_CONFIG.FIELD_HEIGHT - 10, player.targetPosition.y))
            }
        }
    }

    private calculateDistance(pos1: Vector2, pos2: Vector2): number
    {
        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    private canChallengeGoalkeeper(player: Player, gameState: GameState): boolean
    {
        // FIFA Law 12: Outfield players cannot challenge goalkeeper when ball is in hands
        const ball = gameState.ball
        
        if (!ball.inGoalkeeperHands) {
            return true // Can challenge when ball is at goalkeeper's feet
        }
        
        // Find the goalkeeper who has the ball
        const goalkeeper = gameState.teams.flatMap(team => team.players)
            .find(p => p.playerType === 'GOALKEEPER' && ball.goalkeeperPossessor === p.id)
        
        if (!goalkeeper) {
            return true // No goalkeeper has ball in hands
        }
        
        // Cannot challenge different team's goalkeeper when ball is in hands
        return player.team === goalkeeper.team
    }
}