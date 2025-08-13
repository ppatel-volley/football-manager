/* eslint-disable import/order */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import type {
    Ball,
    BasicTacticalCommand,
    ButtonCommand,
    GameState,
    Player,
    PlayerAttributes,
    ScheduledEvent,
    Team,
    Vector2,
} from "../types/POCTypes"
import { FORMATION_4_4_2, PlayerState, POC_CONFIG } from "../types/POCTypes"
import { BasicAIController } from "./BasicAIController"
import { BasicOpponentAI } from "./BasicOpponentAI"
import { GameTimer } from "./GameTimer"
import { SeededRNG } from "../utils/SeededRNG"

export class POCMatchEngine {
    private basicAI: BasicAIController

    private gameState: GameState

    private gameTimer: GameTimer

    private lastAIUpdateGameTime: number = 0

    private rng: SeededRNG
    private aiUpdateIntervalSeconds: number

    private opponentAI: BasicOpponentAI

    private pendingGoalKick: { team: 'RED' | 'BLUE'; takerId: string; position: Vector2 } | null = null

    constructor() {
        this.gameTimer = new GameTimer()
        // Seeded RNG for deterministic POC; fixed seed for reproducibility
        this.rng = new SeededRNG(123456789)
        this.basicAI = new BasicAIController(this.rng)
        this.opponentAI = new BasicOpponentAI("BEGINNER")
        this.aiUpdateIntervalSeconds = POC_CONFIG.AI_UPDATE_INTERVAL_SECONDS

        // Initialize with default game state
        this.gameState = this.createInitialGameState()
    }

    public getCurrentFootballHalf(): 1 | 2 {
        return this.gameTimer.getCurrentFootballHalf()
    }

    public getFootballTime(): string {
        return this.gameTimer.getFormattedFootballTime()
    }

    public getFootballTimeMinutes(): number {
        return this.gameTimer.getFootballTimeMinutes()
    }

    public getGameState(): GameState {
        return this.gameState
    }

    public getGameTime(): number {
        return this.gameState.gameTime
    }

    public getScore(): { home: number; away: number } {
        return this.gameState.score
    }

    public handleButtonCommand(
        command: ButtonCommand,
        team: "HUMAN" | "AI"
    ): void {
        const tacticalCommand: BasicTacticalCommand = {
            type: command.type as "ATTACK" | "DEFEND" | "BALANCE",
            team,
            timestamp: command.timestamp,
        }

        // Apply tactical command to human team (RED)
        if (["ATTACK", "DEFEND", "BALANCE"].includes(command.type)) {
            this.gameState.teams[0].tacticalStyle = command.type as
                | "ATTACK"
                | "DEFEND"
                | "BALANCE"
            console.log(`Human team tactical style changed to: ${command.type}`)
        }

        // Handle action commands
        switch (command.type) {
            case "SHOOT":
                this.handleShootCommand()
                break
            case "PASS_SHORT":
                this.handlePassCommand()
                break
            case "CLEAR":
                this.handleClearCommand()
                break
            default:
                console.log(`Unhandled command type: ${command.type}`)
        }
    }

    public initializeMatch(): void {
        this.gameState = this.createInitialGameState()
        this.gameTimer.reset()
        this.lastAIUpdateGameTime = 0

        console.log(
            "POC Match initialized with",
            this.gameState.teams[0].players.length,
            "players per team"
        )
    }

    public pauseMatch(): void {
        this.gameState.isActive = false
        this.gameTimer.pause()
        console.log("Match paused!")
    }

    public startMatch(): void {
        this.gameState.isActive = true
        this.gameTimer.forceStart()
        this.setupKickoff()
        console.log("Match started!")
    }

    public updateFrame(deltaTime: number): void {
        if (!this.gameState.isActive) return

        // Fixed timestep per TDD: clamp delta to 33.33ms
        const clampedDelta = Math.min(deltaTime, 1 / 30)

        // Update game timer with clamped delta
        this.gameTimer.update(clampedDelta)
        this.gameState.gameTime = this.gameTimer.getElapsedTime()
        this.gameState.half = this.gameTimer.getCurrentHalf()

        // Check for match end
        if (this.gameTimer.isMatchComplete()) {
            this.gameState.isActive = false
            console.log("Match completed! Final score:", this.gameState.score)
            return
        }

        // Check for half-time transition
        if (this.gameTimer.isHalfTimeReached()) {
            this.handleHalfTime()
            return
        }

        // Update AI decisions (less frequently for performance) using deterministic game time
        if (this.gameState.gameTime - this.lastAIUpdateGameTime > this.aiUpdateIntervalSeconds) {
            this.processAIDecisions()
            this.lastAIUpdateGameTime = this.gameState.gameTime
        }

        // Process scheduled events
        this.processScheduledEvents()

        // Update player positions and ball
        this.updatePlayerMovement(clampedDelta)
        this.updateBallMovement(clampedDelta)

        // Basic game logic
        this.checkForGoals()
        this.handleBallOutOfPlay()
        this.updateBallPossession()
        this.updatePossessionStats(clampedDelta)
    }

    private calculateDistance(pos1: Vector2, pos2: Vector2): number {
        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    private calculatePlayerDirection(player: Player): Vector2 {
        const dx = player.targetPosition.x - player.position.x
        const dy = player.targetPosition.y - player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 5) {
            return { x: dx / distance, y: dy / distance }
        }

        // If not moving, face towards opponent's goal
        const goalX = player.team === "RED" ? POC_CONFIG.FIELD_WIDTH : 0
        const goalDirection = goalX - player.position.x
        return { x: goalDirection > 0 ? 1 : -1, y: 0 }
    }

    private checkForGoals(): void {
        const ball = this.gameState.ball
        // Match the goal dimensions from the renderer (8 yards = ~145px)
        const goalWidth = 145
        const goalTop = (POC_CONFIG.FIELD_HEIGHT - goalWidth) / 2
        const goalBottom = goalTop + goalWidth

        // Check left goal (RED team defends, BLUE scores)
        if (
            ball.position.x <= 0 &&
            ball.position.y >= goalTop &&
            ball.position.y <= goalBottom
        ) {
            this.gameState.score.away++
            this.gameState.phase = "GOAL_SCORED"
            console.log("Goal! Blue team scores!")

            // Reset all players to starting positions
            this.resetPlayersToFormation()

            // Set up kickoff for defending team
            this.gameState.kickoffTeam = "RED" // Defending team kicks off
            this.gameState.phase = "KICKOFF"
            this.setupKickoff()
        }

        // Check right goal (BLUE team defends, RED scores)
        if (
            ball.position.x >= POC_CONFIG.FIELD_WIDTH &&
            ball.position.y >= goalTop &&
            ball.position.y <= goalBottom
        ) {
            this.gameState.score.home++
            this.gameState.phase = "GOAL_SCORED"
            console.log("Goal! Red team scores!")

            // Reset all players to starting positions
            this.resetPlayersToFormation()

            // Set up kickoff for defending team
            this.gameState.kickoffTeam = "BLUE" // Defending team kicks off
            this.gameState.phase = "KICKOFF"
            this.setupKickoff()
        }
    }

    private chooseAIAction(player: Player): "PASS" | "SHOOT" | "MOVE_FORWARD" {
        const random = this.rng.next()
        const goalX = player.team === "RED" ? POC_CONFIG.FIELD_WIDTH : 0
        const distanceToGoal = Math.abs(player.position.x - goalX)

        if (distanceToGoal < 200 && random < 0.4) {
            // Close to goal = more shooting
            return "SHOOT"
        }
        else if (random < 0.6) {
            return "PASS"
        }
        else {
            return "MOVE_FORWARD"
        }
    }

    private clearBall(player: Player): void {
        // Clear toward opponent's side
        const targetX = player.team === "RED" ? POC_CONFIG.FIELD_WIDTH : 0
        const direction = this.normalizeVector({
            x: targetX - player.position.x,
            y: 0, // Just clear forward
        })

        this.gameState.ball.velocity = {
            x: direction.x * POC_CONFIG.BALL_SPEED,
            y: direction.y * POC_CONFIG.BALL_SPEED,
        }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team

        console.log(`${player.name} clears the ball!`)
    }

    private handleHalfTime(): void {
        console.log("Half-time reached! Setting up second half...")

        // Mark half-time as triggered in timer
        this.gameTimer.markHalfTimeTriggered()

        // Set phase to half-time briefly
        this.gameState.phase = "HALF_TIME"

        // Determine which team kicks off second half (opposite of first half)
        this.gameState.kickoffTeam =
            this.gameState.initialKickoffTeam === "RED" ? "BLUE" : "RED"

        // Reset all players to formation positions
        this.resetPlayersToFormation()

        // Reset ball to center
        this.resetBallToCenter()

        // Hold briefly in HALF_TIME, then set up kick-off for second half
        this.gameState.phase = "KICKOFF"
        this.setupKickoff()

        console.log(`Second half kick-off: ${this.gameState.kickoffTeam} team`)
    }

    private resetPlayersToFormation(): void {
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                // Reset to base formation position
                player.position = { ...player.basePosition }
                player.targetPosition = { ...player.basePosition }
                player.state = PlayerState.WAITING_KICKOFF
                player.hasBall = false
            }
        }

        // Clear any scheduled events
        this.gameState.scheduledEvents = []

        console.log("All players reset to formation positions")
    }

    private clearBallPossession(): void {
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                player.hasBall = false
            }
        }
        this.gameState.ball.possessor = null
    }

    private setupKickoff(): void {
        console.log(`Setting up kickoff for ${this.gameState.kickoffTeam} team`)

        // Reset ball to center and clear possession
        this.resetBallToCenter()
        this.clearBallPossession()

        // Position one striker from kicking team at center and give them the ball
        const kickingTeam = this.gameState.teams.find(
            (team) => team.color === this.gameState.kickoffTeam
        )
        if (kickingTeam && kickingTeam.players.length > 0) {
            // Find a striker/forward to take kickoff (furthest from own goal)
            let kickoffPlayer: Player | null = null
            let bestDistance = -1

            const ownGoalX =
                this.gameState.kickoffTeam === "RED"
                    ? 0
                    : POC_CONFIG.FIELD_WIDTH

            for (const player of kickingTeam.players) {
                if (player.playerType === "OUTFIELD") {
                    const distanceFromOwnGoal = Math.abs(
                        player.basePosition.x - ownGoalX
                    )
                    if (distanceFromOwnGoal > bestDistance) {
                        bestDistance = distanceFromOwnGoal
                        kickoffPlayer = player
                    }
                }
            }

            if (kickoffPlayer) {
                // Position striker at center circle
                kickoffPlayer.position = {
                    x: POC_CONFIG.FIELD_WIDTH / 2,
                    y: POC_CONFIG.FIELD_HEIGHT / 2,
                }
                kickoffPlayer.targetPosition = { ...kickoffPlayer.position }
                kickoffPlayer.state = PlayerState.SEEKING_BALL

                // Give possession immediately
                kickoffPlayer.hasBall = true
                this.gameState.ball.possessor = kickoffPlayer.id

                console.log(
                    `${kickoffPlayer.name} has been positioned for kickoff and given possession`
                )
            }
        }

        // All other players wait in position
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                if (!player.hasBall) {
                    player.state = PlayerState.WAITING_KICKOFF
                    player.targetPosition = { ...player.basePosition }
                }
            }
        }
    }

    private createInitialGameState(): GameState {
        const teams: [Team, Team] = [
            this.createTeam("Team Red", "RED", true), // Human team
            this.createTeam("Team Blue", "BLUE", false), // AI team
        ]

        const ball: Ball = {
            position: {
                x: POC_CONFIG.FIELD_WIDTH / 2,
                y: POC_CONFIG.FIELD_HEIGHT / 2,
            },
            velocity: { x: 0, y: 0 },
            isMoving: false,
            possessor: null,
            inGoalkeeperHands: false,
            goalkeeperPossessor: null,
            timeInHands: 0,
        }

        return {
            teams,
            ball,
            gameTime: 0,
            isActive: false,
            score: { home: 0, away: 0 },
            half: 1,
            phase: "KICKOFF",
            kickoffTeam: "RED", // Red team starts with kickoff
            initialKickoffTeam: "RED", // Track initial kick-off team
            scheduledEvents: [], // Empty event queue
            restartPosition: null,
            restartTeam: null,
            lastTouchTeam: null,
            stats: {
                possessionSeconds: { RED: 0, BLUE: 0 },
                shots: { RED: 0, BLUE: 0 },
                corners: { RED: 0, BLUE: 0 },
                throwIns: { RED: 0, BLUE: 0 },
                goalKicks: { RED: 0, BLUE: 0 },
            },
        }
    }

    private createTeam(
        name: string,
        color: "RED" | "BLUE",
        isHuman: boolean
    ): Team {
        const players: Player[] = []
        const isLeftSide = color === "RED"

        for (let i = 0; i < FORMATION_4_4_2.length; i++) {
            const formationPos = FORMATION_4_4_2[i]
            if (!formationPos) continue

            // Calculate actual field position
            const x = isLeftSide
                ? formationPos.x * POC_CONFIG.FIELD_WIDTH
                : POC_CONFIG.FIELD_WIDTH -
                  formationPos.x * POC_CONFIG.FIELD_WIDTH

            const y = formationPos.y * POC_CONFIG.FIELD_HEIGHT

            const basePosition = { x, y }

            const attributes: PlayerAttributes = this.generatePlayerAttributes(
                formationPos.type === "GOALKEEPER"
            )

            const maxSpeed = 50 + attributes.pace * 5 // 50-100

            players.push({
                id: `${color.toLowerCase()}_player_${i}`,
                name: `${color} ${i + 1}`,
                position: { ...basePosition },
                targetPosition: { ...basePosition },
                team: color,
                playerType: formationPos.type,
                state: PlayerState.WAITING_KICKOFF,
                speed: maxSpeed,
                basePosition,
                hasBall: false,
                attributes,
            })
        }

        return {
            name,
            color,
            players,
            tacticalStyle: "BALANCE",
            isHuman,
        }
    }

    private executeScheduledEvent(event: ScheduledEvent): void {
        const player = this.findPlayerById(event.playerId)
        if (
            !player ||
            !player.hasBall ||
            this.gameState.ball.possessor !== player.id
        ) {
            console.log(
                `Event ${event.action} for ${player?.name || event.playerId} cancelled - no longer has ball`
            )
            return
        }

        console.log(`Executing ${event.action} for ${player.name}`)

        switch (event.action) {
            case "PASS":
                this.findAndPass(player)
                break
            case "GK_DISTRIBUTE_SHORT":
                this.goalkeeperDistribute(player, 'short')
                break
            case "GK_DISTRIBUTE_LONG":
                this.goalkeeperDistribute(player, 'long')
                break
            case "PASS_LONG":
                this.executeLongPass(player)
                break
            case "CROSS":
                this.executeCross(player)
                break
            case "SHOOT":
                this.shootBall(player)
                break
            case "MOVE_FORWARD":
                this.movePlayerTowards(player, "GOAL")
                break
        }
    }

    private goalkeeperDistribute(player: Player, type: 'short' | 'long'): void {
        if (player.playerType !== 'GOALKEEPER') return
        // Reset hands state when distributing
        this.gameState.ball.inGoalkeeperHands = false
        this.gameState.ball.goalkeeperPossessor = null
        this.gameState.ball.timeInHands = 0
        this.clearBallPossession()

        if (type === 'short') {
            // Find nearby teammate for accurate throw/roll
            const teammates = this.gameState.teams.find(t => t.color === player.team)?.players.filter(p => p.id !== player.id) || []
            let target = teammates[0]
            let best = target ? this.calculateDistance(player.position, target.position) : Infinity
            for (const tm of teammates) {
                const d = this.calculateDistance(player.position, tm.position)
                if (d < best) { best = d; target = tm }
            }
            if (!target) return
            const dir = this.normalizeVector({ x: target.position.x - player.position.x, y: target.position.y - player.position.y })
            this.gameState.ball.velocity = { x: dir.x * POC_CONFIG.BALL_SPEED * 0.7, y: dir.y * POC_CONFIG.BALL_SPEED * 0.7 }
        } else {
            // Long punt toward midfield
            const midfieldX = player.team === 'RED' ? POC_CONFIG.FIELD_WIDTH * 0.6 : POC_CONFIG.FIELD_WIDTH * 0.4
            const target = { x: midfieldX, y: POC_CONFIG.FIELD_HEIGHT / 2 + this.rng.nextSigned() * 120 }
            const dir = this.normalizeVector({ x: target.x - player.position.x, y: target.y - player.position.y })
            this.gameState.ball.velocity = { x: dir.x * POC_CONFIG.BALL_SPEED * 1.2, y: dir.y * POC_CONFIG.BALL_SPEED * 1.2 }
        }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team
        this.gameState.phase = 'PLAY'
    }

    private executeLongPass(player: Player): void {
        const teammates = this.gameState.teams.find(t => t.color === player.team)?.players.filter(p => p.id !== player.id) || []
        if (teammates.length === 0) return
        const goalX = player.team === 'RED' ? POC_CONFIG.FIELD_WIDTH : 0
        let target = teammates[0]
        let best = Math.abs(target.position.x - goalX)
        for (const tm of teammates) {
            const distToGoal = Math.abs(tm.position.x - goalX)
            if (distToGoal < best) { best = distToGoal; target = tm }
        }
        this.clearBallPossession()
        const dir = this.normalizeVector({ x: target.position.x - player.position.x, y: target.position.y - player.position.y })
        const power = 1.3
        this.gameState.ball.velocity = { x: dir.x * POC_CONFIG.BALL_SPEED * power, y: dir.y * POC_CONFIG.BALL_SPEED * power }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team
        this.gameState.phase = 'PLAY'
    }

    private executeCross(player: Player): void {
        const boxCenterX = player.team === 'RED' ? POC_CONFIG.FIELD_WIDTH - 90 : 90
        const boxCenterY = this.gameState.restartPosition?.y ?? POC_CONFIG.FIELD_HEIGHT / 2
        this.clearBallPossession()
        const target = { x: boxCenterX, y: boxCenterY + this.rng.nextSigned() * 60 }
        const dir = this.normalizeVector({ x: target.x - player.position.x, y: target.y - player.position.y })
        const power = 1.1
        this.gameState.ball.velocity = { x: dir.x * POC_CONFIG.BALL_SPEED * power, y: dir.y * POC_CONFIG.BALL_SPEED * power }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team
        this.gameState.phase = 'PLAY'
    }

    private findAndPass(player: Player): void {
        const teammates =
            this.gameState.teams
                .find((team) => team.color === player.team)
                ?.players.filter((p) => p.id !== player.id) || []

        if (teammates.length === 0) return

        // Find teammate closest to opponent's goal
        const goalX = player.team === "RED" ? POC_CONFIG.FIELD_WIDTH : 0
        let bestTeammate = teammates[0]
        if (!bestTeammate) return

        let bestScore = Math.abs(bestTeammate.position.x - goalX)

        for (const teammate of teammates) {
            const distanceToGoal = Math.abs(teammate.position.x - goalX)
            if (distanceToGoal < bestScore) {
                bestScore = distanceToGoal
                bestTeammate = teammate
            }
        }

        // Clear ball possession first
        this.clearBallPossession()

        // Pass to best teammate
        const direction = this.normalizeVector({
            x: bestTeammate.position.x - player.position.x,
            y: bestTeammate.position.y - player.position.y,
        })

        this.gameState.ball.velocity = {
            x: direction.x * (POC_CONFIG.BALL_SPEED * 0.7),
            y: direction.y * (POC_CONFIG.BALL_SPEED * 0.7),
        }
        this.gameState.ball.isMoving = true

        console.log(`${player.name} passes to ${bestTeammate.name}`)
    }

    private findBallCarrier(): Player | null {
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                if (player.hasBall) {
                    return player
                }
            }
        }
        return null
    }

    private findKickoffPlayer(): Player | null {
        const kickingTeam = this.gameState.teams.find(
            (team) => team.color === this.gameState.kickoffTeam
        )
        if (!kickingTeam) return null

        // Find the player closest to center (should be the kickoff taker)
        let kickoffPlayer = null
        let closestDistance = Infinity
        const centerX = POC_CONFIG.FIELD_WIDTH / 2
        const centerY = POC_CONFIG.FIELD_HEIGHT / 2

        for (const player of kickingTeam.players) {
            const distance = this.calculateDistance(player.position, {
                x: centerX,
                y: centerY,
            })
            if (distance < closestDistance) {
                closestDistance = distance
                kickoffPlayer = player
            }
        }

        return kickoffPlayer
    }

    private findPlayerById(playerId: string): Player | null {
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                if (player.id === playerId) {
                    return player
                }
            }
        }
        return null
    }

    // --- New: Attributes/stats helpers and restart logic ---
    private generatePlayerAttributes(isGoalkeeper: boolean): PlayerAttributes {
        const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)))
        if (isGoalkeeper) {
            return {
                pace: clamp(4 + this.rng.nextInRange(0, 3)),
                passing: clamp(4 + this.rng.nextInRange(0, 3)),
                shooting: clamp(2 + this.rng.nextInRange(0, 2)),
                positioning: clamp(7 + this.rng.nextInRange(0, 3)),
            }
        }
        return {
            pace: clamp(5 + this.rng.nextInRange(0, 5)),
            passing: clamp(4 + this.rng.nextInRange(0, 6)),
            shooting: clamp(4 + this.rng.nextInRange(0, 6)),
            positioning: clamp(4 + this.rng.nextInRange(0, 6)),
        }
    }

    private handleBallOutOfPlay(): void {
        const { x, y } = this.gameState.ball.position
        const outLeft = x < 0
        const outRight = x > POC_CONFIG.FIELD_WIDTH
        const outTop = y < 0
        const outBottom = y > POC_CONFIG.FIELD_HEIGHT

        if (!(outLeft || outRight || outTop || outBottom)) return

        // Stop ball
        this.gameState.ball.velocity = { x: 0, y: 0 }
        this.gameState.ball.isMoving = false
        this.clearBallPossession()

        // Determine restart type
        const lastTouch = this.gameState.lastTouchTeam
        if (outLeft || outRight) {
            // Crossed goal line: goal or corner/goal-kick already handled by goal check.
            // If not in goal mouth, decide corner or goal-kick
            const goalWidth = 145
            const goalTop = (POC_CONFIG.FIELD_HEIGHT - goalWidth) / 2
            const goalBottom = goalTop + goalWidth
            const inGoalMouth = y >= goalTop && y <= goalBottom
            if (!inGoalMouth) {
                if (outLeft) {
                    // Red defends this goal; if last touched by RED => goal kick RED, else corner BLUE
                    if (lastTouch === "RED") {
                        this.queueGoalKick("RED")
                    } else {
                        this.queueCorner("BLUE", {
                            x: 0,
                            y:
                                y < POC_CONFIG.FIELD_HEIGHT / 2
                                    ? 0
                                    : POC_CONFIG.FIELD_HEIGHT,
                        })
                    }
                } else {
                    // Blue defends
                    if (lastTouch === "BLUE") {
                        this.queueGoalKick("BLUE")
                    } else {
                        this.queueCorner("RED", {
                            x: POC_CONFIG.FIELD_WIDTH,
                            y:
                                y < POC_CONFIG.FIELD_HEIGHT / 2
                                    ? 0
                                    : POC_CONFIG.FIELD_HEIGHT,
                        })
                    }
                }
            }
        }
        else if (outTop || outBottom) {
            // Throw-in to the opposite team of last touch, at nearest sideline
            const restartY = outTop ? 0 : POC_CONFIG.FIELD_HEIGHT
            const clampedX = Math.max(0, Math.min(POC_CONFIG.FIELD_WIDTH, x))
            const team: "RED" | "BLUE" = lastTouch === "RED" ? "BLUE" : "RED"
            this.queueThrowIn(team, { x: clampedX, y: restartY })
        }
    }

    private handleClearCommand(): void {
        const ballCarrier = this.findBallCarrier()
        if (ballCarrier && ballCarrier.team === "RED") {
            this.clearBall(ballCarrier)
        }
    }
private movePlayerTowardsTarget(player: Player, deltaTime: number): void {
        const dx = player.targetPosition.x - player.position.x
        const dy = player.targetPosition.y - player.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 5) {
            // 5 pixel tolerance
            const moveDistance = player.speed * deltaTime
            const ratio = Math.min(moveDistance / distance, 1)

            player.position.x += dx * ratio
            player.position.y += dy * ratio
        }
    }


    private performKickoff(): void {
        console.log(`${this.gameState.kickoffTeam} team performs kickoff`)

        const kickoffPlayer = this.findKickoffPlayer()
        if (!kickoffPlayer) return

        // First kick must go forward (soccer rules)
        const direction = this.gameState.kickoffTeam === "RED" ? 1 : -1

        // Clear ball possession first
        this.clearBallPossession()

        // Small forward kick to satisfy rules, then pass to teammate
        this.gameState.ball.velocity = {
            x: direction * 80, // Forward kick (reduced speed for better control)
            y: this.rng.nextSigned() * 20, // Minimal side variation
        }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = this.gameState.kickoffTeam

        // Schedule a pass to teammate after the forward kick
        this.scheduleKickoffPass(kickoffPlayer, 0.5) // Pass after 0.5 seconds

        console.log(`${kickoffPlayer.name} performs kickoff with forward kick`)
    }

    private handlePassCommand(): void {
        const ballCarrier = this.findBallCarrier()
        if (ballCarrier && ballCarrier.team === "RED") {
            this.passToNearestTeammate(ballCarrier)
        }
    }
private processAIDecisions(): void {
        // Handle automatic kickoff after 1 second (only once)
        if (
            this.gameState.phase === "KICKOFF" &&
            this.gameState.gameTime > 1 &&
            !this.gameState.ball.isMoving
        ) {
            this.performKickoff()
        }

        // AI opponent makes decisions for blue team
        const aiDecision = this.opponentAI.makeSimpleDecision(this.gameState)
        if (aiDecision) {
            this.gameState.teams[1].tacticalStyle = aiDecision.type
            console.log(`AI team tactical style changed to: ${aiDecision.type}`)
        }

        // Individual player AI for both teams
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                this.basicAI.updatePlayerBehaviour(player, this.gameState)
            }
        }
    }



    private processScheduledEvents(): void {
        const currentTime = this.gameState.gameTime
        const eventsToExecute = this.gameState.scheduledEvents.filter(
            (event) => event.executeTime <= currentTime
        )

        // Remove executed events from the queue
        this.gameState.scheduledEvents = this.gameState.scheduledEvents.filter(
            (event) => event.executeTime > currentTime
        )

        // Execute each event
        for (const event of eventsToExecute) {
            this.executeScheduledEvent(event)
        }

        // Handle pending goal kick rule check (every frame)
        if (this.pendingGoalKick) {
            const { team, takerId, position } = this.pendingGoalKick
            if (this.canTakeGoalKick(team)) {
                // Schedule the actual long pass shortly after allowing
                const scheduled: ScheduledEvent = {
                    id: `goalkick_${Math.floor(this.gameState.gameTime * 1000)}`,
                    playerId: takerId,
                    action: "PASS_LONG",
                    executeTime: this.gameState.gameTime + 0.3,
                }
                this.gameState.scheduledEvents.push(scheduled)
                this.pendingGoalKick = null
            }
        }
    }

    private canTakeGoalKick(team: 'RED' | 'BLUE'): boolean {
        // Determine penalty area rectangle for defending team
        const depth = 135 // 18-yard box depth in px (from renderer constants)
        const width = 320 // vertical span
        const topY = (POC_CONFIG.FIELD_HEIGHT - width) / 2
        const bottomY = topY + width
        const isRed = team === 'RED'
        const leftX = isRed ? 0 : POC_CONFIG.FIELD_WIDTH - depth
        const rightX = isRed ? depth : POC_CONFIG.FIELD_WIDTH

        const oppTeam = this.gameState.teams.find(t => t.color !== team)
        if (!oppTeam) return true

        const insideOpponents = oppTeam.players.filter(p =>
            p.position.x >= leftX && p.position.x <= rightX &&
            p.position.y >= topY && p.position.y <= bottomY
        )

        if (insideOpponents.length === 0) return true

        // Quick goal kick allowed if all inside opponents are attempting to leave (target outside area)
        const allAttemptingToLeave = insideOpponents.every(p => {
            const tx = p.targetPosition.x
            const ty = p.targetPosition.y
            const outsideTarget = !(tx >= leftX && tx <= rightX && ty >= topY && ty <= bottomY)
            return outsideTarget
        })
        return allAttemptingToLeave
    }
private scheduleAIAction(player: Player): void {
        // Schedule an AI action using game time instead of setTimeout
        const delay = 1 + this.rng.nextInRange(0, 2) // 1-3 second delay (deterministic)
        const executeTime = this.gameState.gameTime + delay

        const event: ScheduledEvent = {
            id: `ai_action_${Math.floor(this.gameState.gameTime * 1000)}_${player.id}`,
            playerId: player.id,
            action: this.chooseAIAction(player),
            executeTime,
        }

        this.gameState.scheduledEvents.push(event)
        console.log(
            `Scheduled ${event.action} for ${player.name} at time ${executeTime.toFixed(1)}s`
        )
    }


    private scheduleKickoffPass(kickoffPlayer: Player, delay: number): void {
        const executeTime = this.gameState.gameTime + delay
        const event: ScheduledEvent = {
            id: `kickoff_pass_${Math.floor(this.gameState.gameTime * 1000)}`,
            playerId: kickoffPlayer.id,
            action: "PASS",
            executeTime,
        }

        this.gameState.scheduledEvents.push(event)
        console.log(
            `Scheduled kickoff pass for ${kickoffPlayer.name} at time ${executeTime.toFixed(1)}s`
        )
    }


    private updateBallMovement(deltaTime: number): void {
        // If ball has a possessor, keep it with the player
        if (this.gameState.ball.possessor) {
            const possessor = this.findPlayerById(this.gameState.ball.possessor)
            if (possessor) {
                // Position ball in front of player in direction they're moving
                const direction = this.calculatePlayerDirection(possessor)
                this.gameState.ball.position = {
                    x: possessor.position.x + direction.x * 15, // 15 pixels in front
                    y: possessor.position.y + direction.y * 15,
                }
                this.gameState.ball.velocity = { x: 0, y: 0 }
                this.gameState.ball.isMoving = false
                return
            }
        }

        // Ball is loose - normal physics
        if (this.gameState.ball.isMoving) {
            this.gameState.ball.position.x +=
                this.gameState.ball.velocity.x * deltaTime
            this.gameState.ball.position.y +=
                this.gameState.ball.velocity.y * deltaTime

            // Check if ball has left center circle (kickoff completed)
            if (this.gameState.phase === "KICKOFF") {
                const centerX = POC_CONFIG.FIELD_WIDTH / 2
                const centerY = POC_CONFIG.FIELD_HEIGHT / 2
                const distanceFromCenter = Math.sqrt(
                    Math.pow(this.gameState.ball.position.x - centerX, 2) +
                        Math.pow(this.gameState.ball.position.y - centerY, 2)
                )

                if (distanceFromCenter > 50) {
                    // Center circle radius
                    this.gameState.phase = "PLAY"
                    // Activate all players for normal play
                    for (const team of this.gameState.teams) {
                        for (const player of team.players) {
                            if (player.state === PlayerState.WAITING_KICKOFF) {
                                player.state = PlayerState.MAINTAINING_POSITION
                            }
                        }
                    }
                    console.log("Kickoff completed - play begins!")
                }
            }

            // Simple friction
            this.gameState.ball.velocity.x *= 0.95
            this.gameState.ball.velocity.y *= 0.95

            // Stop if velocity is very low
            if (
                Math.abs(this.gameState.ball.velocity.x) < 10 &&
                Math.abs(this.gameState.ball.velocity.y) < 10
            ) {
                this.gameState.ball.velocity = { x: 0, y: 0 }
                this.gameState.ball.isMoving = false
            }
        }
    }

    private updateBallPossession(): void {
        // If ball is moving fast, no one can control it
        const ballSpeed = Math.sqrt(
            this.gameState.ball.velocity.x * this.gameState.ball.velocity.x +
                this.gameState.ball.velocity.y * this.gameState.ball.velocity.y
        )

        if (ballSpeed > 80) {
            // Ball moving too fast to control
            this.clearBallPossession()
            return
        }

        // Goalkeeper hands: treat as special possession state
        if (this.gameState.ball.inGoalkeeperHands && this.gameState.ball.goalkeeperPossessor) {
            const gk = this.findPlayerById(this.gameState.ball.goalkeeperPossessor)
            if (gk) {
                this.gameState.ball.position = { x: gk.position.x, y: gk.position.y }
                this.gameState.ball.isMoving = false
                return
            }
        }

        let closestPlayer: Player | null = null
        let closestDistance = Infinity

        // Find closest player to ball
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                const distance = this.calculateDistance(
                    player.position,
                    this.gameState.ball.position
                )
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestPlayer = player
                }
            }
        }

        // Update possession if a player is close enough
        const possessionDistance = 25 // pixels
        if (closestPlayer && closestDistance < possessionDistance) {
            // Only change possession if different player
            if (this.gameState.ball.possessor !== closestPlayer.id) {
                this.clearBallPossession()
                closestPlayer.hasBall = true
                this.gameState.ball.possessor = closestPlayer.id
                this.gameState.lastTouchTeam = closestPlayer.team
                console.log(`${closestPlayer.name} gains possession`)

                // Simple AI decision for non-human players
                if (
                    !this.gameState.teams.find(
                        (t) => t.color === closestPlayer.team
                    )?.isHuman
                ) {
                    this.scheduleAIAction(closestPlayer)
                }
            }
        } else {
            // No one close enough to control ball
            if (this.gameState.ball.possessor) {
                this.clearBallPossession()
                console.log("Ball is loose")
            }
        }
    }
private updatePlayerMovement(deltaTime: number): void {
        for (const team of this.gameState.teams) {
            for (const player of team.players) {
                this.movePlayerTowardsTarget(player, deltaTime)
            }
        }
    }






    private handleShootCommand(): void {
        const ballCarrier = this.findBallCarrier()
        if (ballCarrier && ballCarrier.team === "RED") {
            this.shootBall(ballCarrier)
        }
    }

    private incrementShot(team: "RED" | "BLUE"): void {
        if (team === "RED") this.gameState.stats.shots.RED++
        else this.gameState.stats.shots.BLUE++
    }

    private movePlayerTowards(player: Player, target: "GOAL" | "BALL"): void {
        if (target === "GOAL") {
            const goalX =
                player.team === "RED" ? POC_CONFIG.FIELD_WIDTH - 50 : 50
            const goalY = POC_CONFIG.FIELD_HEIGHT / 2

            player.targetPosition = {
                x: goalX + this.rng.nextSigned() * 100,
                y: goalY + this.rng.nextSigned() * 200,
            }

            console.log(`${player.name} moves towards goal`)
        }
    }

    private normalizeVector(vector: Vector2): Vector2 {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
        if (magnitude === 0) return { x: 0, y: 0 }

        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude,
        }
    }

    private passToNearestTeammate(player: Player): void {
        const teammates =
            this.gameState.teams
                .find((team) => team.color === player.team)
                ?.players.filter((p) => p.id !== player.id) || []

        if (teammates.length === 0) return

        let nearestTeammate = teammates[0]
        if (!nearestTeammate) return

        let nearestDistance = this.calculateDistance(
            player.position,
            nearestTeammate.position
        )

        for (const teammate of teammates) {
            const distance = this.calculateDistance(
                player.position,
                teammate.position
            )
            if (distance < nearestDistance) {
                nearestDistance = distance
                nearestTeammate = teammate
            }
        }

        if (!nearestTeammate) return

        // Clear ball possession first
        this.clearBallPossession()

        const direction = this.normalizeVector({
            x: nearestTeammate.position.x - player.position.x,
            y: nearestTeammate.position.y - player.position.y,
        })

        const accuracy = 0.9 + (player.attributes?.passing ?? 5) / 100 // subtle boost
        this.gameState.ball.velocity = {
            x: direction.x * (POC_CONFIG.BALL_SPEED * 0.7) * accuracy, // Slower than shot
            y: direction.y * (POC_CONFIG.BALL_SPEED * 0.7) * accuracy,
        }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team

        console.log(`${player.name} passes to ${nearestTeammate.name}`)
    }

    private positionForRestart(team: "RED" | "BLUE", position: Vector2): void {
        const isCorner = this.gameState.phase === "CORNER_KICK"
        const isThrowIn = this.gameState.phase === "THROW_IN"
        const isGoalKick = this.gameState.phase === "GOAL_KICK"

        const attackingTeam = this.gameState.teams.find((t) => t.color === team)
        const defendingTeam = this.gameState.teams.find((t) => t.color !== team)
        if (!attackingTeam || !defendingTeam) return

        for (const t of this.gameState.teams) {
            for (const p of t.players) {
                p.targetPosition = { ...p.basePosition }
                p.state = PlayerState.MAINTAINING_POSITION
            }
        }

        const jitter = (mag: number) => this.rng.nextSigned() * mag

        if (isCorner) {
            const taker = this.findNearestPlayer(attackingTeam.players, position)
            if (taker) taker.targetPosition = { x: position.x, y: position.y }

        const boxX = position.x === 0 ? 35 : POC_CONFIG.FIELD_WIDTH - 35
        const cornerTop = 0
        const cornerBottom = POC_CONFIG.FIELD_HEIGHT
        // If position.y is exactly edge (0 or FIELD_HEIGHT), choose the nearest penalty box center by comparing to midline
        const boxCenterY = (position.y <= cornerTop + 1)
            ? POC_CONFIG.FIELD_HEIGHT * 0.3
            : (position.y >= cornerBottom - 1)
                ? POC_CONFIG.FIELD_HEIGHT * 0.7
                : (position.y < POC_CONFIG.FIELD_HEIGHT / 2 ? 120 : POC_CONFIG.FIELD_HEIGHT - 120)

            const attackers = attackingTeam.players.filter((p) => p !== taker)
            const inBox = attackers.slice(0, 3)
            const edge = attackers.slice(3, 5)
            const rest = attackers.slice(5)

            inBox.forEach((p, i) => {
                p.targetPosition = { x: boxX + jitter(10), y: boxCenterY + (i - 1) * 40 + jitter(10) }
            })

            const edgeX = position.x === 0 ? 80 : POC_CONFIG.FIELD_WIDTH - 80
            edge.forEach((p, i) => {
                p.targetPosition = { x: edgeX + jitter(10), y: boxCenterY + (i * 30 - 15) + jitter(10) }
            })

            rest.forEach((p, i) => {
                p.targetPosition = { x: edgeX + (i % 2 === 0 ? 60 : -60) + jitter(10), y: boxCenterY + (i * 25 - 60) + jitter(10) }
            })

            const defendersSorted = defendingTeam.players.slice()
            const nearPostY = boxCenterY - 35
            const farPostY = boxCenterY + 35
            if (defendersSorted[0]) defendersSorted[0].targetPosition = { x: boxX - (position.x === 0 ? 5 : -5), y: nearPostY }
            if (defendersSorted[1]) defendersSorted[1].targetPosition = { x: boxX - (position.x === 0 ? 5 : -5), y: farPostY }
        }
        else if (isGoalKick) {
            const gk = this.findGoalkeeper(attackingTeam.players)
            if (gk) gk.targetPosition = { ...position }

            const leftSide = team === 'RED' ? 1 : -1
            const cbOffsetX = 40 * leftSide
            const outfield = attackingTeam.players.filter(p => p !== gk)
            outfield.forEach((p, idx) => {
                const laneY = (idx + 1) * (POC_CONFIG.FIELD_HEIGHT / (outfield.length + 1))
                const isDef = idx < 4
                const isMid = idx >= 4 && idx < 8
                const isAtt = idx >= 8
                if (isDef) p.targetPosition = { x: position.x + cbOffsetX + jitter(10), y: laneY + jitter(8) }
                else if (isMid) p.targetPosition = { x: position.x + cbOffsetX * 2 + jitter(10), y: laneY + jitter(8) }
                else if (isAtt) p.targetPosition = { x: position.x + cbOffsetX * 3 + jitter(10), y: laneY + jitter(8) }
            })

            defendingTeam.players.forEach((p, idx) => {
                const laneY = (idx + 1) * (POC_CONFIG.FIELD_HEIGHT / (defendingTeam.players.length + 1))
                p.targetPosition = { x: POC_CONFIG.FIELD_WIDTH / 2 + jitter(20), y: laneY + jitter(8) }
            })
        }
        else if (isThrowIn) {
            const taker = this.findNearestPlayer(attackingTeam.players, position)
            if (taker) taker.targetPosition = { x: position.x, y: position.y }
            const options = attackingTeam.players.filter(p => p !== taker).slice(0, 3)
            options.forEach((p, i) => {
                p.targetPosition = { x: position.x + (team === 'RED' ? 40 : -40) + i * 20, y: position.y + (i - 1) * 35 }
            })
        }
    }

    private queueCorner(team: "RED" | "BLUE", position: Vector2): void {
        this.gameState.phase = "CORNER_KICK"
        this.gameState.restartTeam = team
        this.gameState.restartPosition = { ...position }
        if (team === "RED") this.gameState.stats.corners.RED++
        else this.gameState.stats.corners.BLUE++
        this.positionForRestart(team, position)
        this.takeCornerRestart(team, position)
    }

    private queueGoalKick(team: "RED" | "BLUE"): void {
        this.gameState.phase = "GOAL_KICK"
        this.gameState.restartTeam = team
        const x = team === "RED" ? 6 : POC_CONFIG.FIELD_WIDTH - 6
        const y = POC_CONFIG.FIELD_HEIGHT / 2
        this.gameState.restartPosition = { x, y }
        if (team === "RED") this.gameState.stats.goalKicks.RED++
        else this.gameState.stats.goalKicks.BLUE++
        this.positionForRestart(team, { x, y })
        this.takeGoalKickRestart(team, { x, y })
    }
private resetBallToCenter(): void {
        this.gameState.ball.position = {
            x: POC_CONFIG.FIELD_WIDTH / 2,
            y: POC_CONFIG.FIELD_HEIGHT / 2,
        }
        this.gameState.ball.velocity = { x: 0, y: 0 }
        this.gameState.ball.isMoving = false
        this.gameState.ball.possessor = null
    }



    private queueThrowIn(team: "RED" | "BLUE", position: Vector2): void {
        this.gameState.phase = "THROW_IN"
        this.gameState.restartTeam = team
        this.gameState.restartPosition = { ...position }
        if (team === "RED") this.gameState.stats.throwIns.RED++
        else this.gameState.stats.throwIns.BLUE++
        this.positionForRestart(team, position)
        this.takeThrowInRestart(team, position)
    }

    private shootBall(player: Player): void {
        // Clear ball possession first
        this.clearBallPossession()

        const targetGoal =
            player.team === "RED"
                ? { x: POC_CONFIG.FIELD_WIDTH, y: POC_CONFIG.FIELD_HEIGHT / 2 }
                : { x: 0, y: POC_CONFIG.FIELD_HEIGHT / 2 }

            // Add some shooting accuracy variation (match goal width from renderer)
        const goalWidth = 145
            const targetVariation = this.rng.nextSigned() * goalWidth * 0.8

        const direction = this.normalizeVector({
            x: targetGoal.x - player.position.x,
            y: targetGoal.y + targetVariation - player.position.y,
        })

        const power = 1.0 + (player.attributes?.shooting ?? 5) / 20 // ~1.25 max
        this.gameState.ball.velocity = {
            x: direction.x * POC_CONFIG.BALL_SPEED * 1.2 * power, // Shots are faster than passes
            y: direction.y * POC_CONFIG.BALL_SPEED * 1.2 * power,
        }
        this.gameState.ball.isMoving = true
        this.gameState.lastTouchTeam = player.team

        console.log(`${player.name} shoots toward goal!`)
        // Count as a shot
        this.incrementShot(player.team)
    }

    private takeCornerRestart(team: "RED" | "BLUE", position: Vector2): void {
        const takingTeam = this.gameState.teams.find((t) => t.color === team)
        if (!takingTeam) return
        const taker = this.findNearestPlayer(takingTeam.players, position)
        if (!taker) return
        this.placeBallForRestart(position, taker, team)
        const scheduled: ScheduledEvent = {
            id: `corner_${Math.floor(this.gameState.gameTime * 1000)}`,
            playerId: taker.id,
            action: "CROSS",
            executeTime: this.gameState.gameTime + 1.0,
        }
        this.gameState.scheduledEvents.push(scheduled)
    }

    private takeGoalKickRestart(team: "RED" | "BLUE", position: Vector2): void {
        const takingTeam = this.gameState.teams.find((t) => t.color === team)
        if (!takingTeam) return
        const taker = this.findGoalkeeper(takingTeam.players) || this.findNearestPlayer(takingTeam.players, position)
        if (!taker) return
        this.placeBallForRestart(position, taker, team)
        // Per TDD/PRD: Only take once opponents have attempted to exit the penalty area (or none remain)
        // We queue a check every 0.2s until allowed, then schedule the long pass 0.3s later
        this.pendingGoalKick = { team, takerId: taker.id, position: { ...position } }
    }

    private takeThrowInRestart(team: "RED" | "BLUE", position: Vector2): void {
        const takingTeam = this.gameState.teams.find((t) => t.color === team)
        if (!takingTeam) return
        const taker = this.findNearestPlayer(takingTeam.players, position)
        if (!taker) return
        this.placeBallForRestart(position, taker, team)
        const scheduled: ScheduledEvent = {
            id: `throwin_${Math.floor(this.gameState.gameTime * 1000)}`,
            playerId: taker.id,
            action: "PASS",
            executeTime: this.gameState.gameTime + 0.4,
        }
        this.gameState.scheduledEvents.push(scheduled)
    }

    private placeBallForRestart(position: Vector2, taker: Player, team: 'RED' | 'BLUE') {
        this.gameState.ball.position = { ...position }
        this.gameState.ball.velocity = { x: 0, y: 0 }
        this.gameState.ball.isMoving = false
        this.clearBallPossession()
        taker.hasBall = true
        this.gameState.ball.possessor = taker.id
        this.gameState.lastTouchTeam = team
    }

    private findNearestPlayer(players: Player[], position: Vector2): Player | null {
        let best: Player | null = null
        let bestD = Infinity
        for (const p of players) {
            const d = this.calculateDistance(p.position, position)
            if (d < bestD) { bestD = d; best = p }
        }
        return best
    }

    private findGoalkeeper(players: Player[]): Player | null {
        return players.find(p => p.playerType === 'GOALKEEPER') || null
    }

    private updatePossessionStats(deltaTime: number): void {
        const possessorId = this.gameState.ball.possessor
        if (!possessorId) return
        const player = this.findPlayerById(possessorId)
        if (!player) return
        if (player.team === "RED")
            this.gameState.stats.possessionSeconds.RED += deltaTime
        else this.gameState.stats.possessionSeconds.BLUE += deltaTime
    }
}
