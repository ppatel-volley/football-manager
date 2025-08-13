import { POC_CONFIG } from "../types/POCTypes"

export class GameTimer
{
    private accumulatedTime: number = 0
    private elapsedTime: number = 0
    private running: boolean = false
    private matchComplete: boolean = false
    private halfTimeTriggered: boolean = false

    // Football match is 90 minutes (5400 seconds) compressed into 5 minutes (300 seconds) real-time
    private static readonly FOOTBALL_MATCH_DURATION_SECONDS = 5400 // 90 minutes
    private static readonly ACCELERATION_FACTOR = GameTimer.FOOTBALL_MATCH_DURATION_SECONDS / POC_CONFIG.MATCH_DURATION_SECONDS // 18x

    public reset(): void
    {
        this.accumulatedTime = 0
        this.elapsedTime = 0
        this.running = false
        this.matchComplete = false
        this.halfTimeTriggered = false
    }

    public start(): void
    {
        this.running = true
    }

    public pause(): void
    {
        this.running = false
    }

    // Fixed timestep accumulator update (delta seconds)
    public update(deltaTime: number): void
    {
        if (!this.running || this.matchComplete) return

        this.accumulatedTime += deltaTime

        // Clamp to avoid spiral of death per TDD
        const maxFrame = 1 / 30
        const step = Math.min(deltaTime, maxFrame)

        // Advance elapsedTime in fixed steps of 33.33ms
        while (this.accumulatedTime >= maxFrame) {
            this.elapsedTime += step
            this.accumulatedTime -= maxFrame
        }

        if (this.elapsedTime >= POC_CONFIG.MATCH_DURATION_SECONDS) {
            this.elapsedTime = POC_CONFIG.MATCH_DURATION_SECONDS
            this.matchComplete = true
            this.running = false
        }
    }

    public getElapsedTime(): number
    {
        return Math.min(this.elapsedTime, POC_CONFIG.MATCH_DURATION_SECONDS)
    }

    public getCurrentHalf(): 1 | 2
    {
        return this.elapsedTime < (POC_CONFIG.MATCH_DURATION_SECONDS / 2) ? 1 : 2
    }

    public getTimeRemainingInHalf(): number
    {
        const halfDuration = POC_CONFIG.MATCH_DURATION_SECONDS / 2
        const currentHalf = this.getCurrentHalf()

        if (currentHalf === 1)
        {
            return halfDuration - this.elapsedTime
        }
        else
        {
            return POC_CONFIG.MATCH_DURATION_SECONDS - this.elapsedTime
        }
    }

    public isMatchComplete(): boolean
    {
        return this.matchComplete
    }

    public isRunning(): boolean
    {
        return this.running
    }

    public forceStart(): void
    {
        this.running = true
        this.matchComplete = false
    }

    public isHalfTimeReached(): boolean
    {
        const halfDuration = POC_CONFIG.MATCH_DURATION_SECONDS / 2
        return this.elapsedTime >= halfDuration && !this.halfTimeTriggered && this.getCurrentHalf() === 2
    }

    public markHalfTimeTriggered(): void
    {
        this.halfTimeTriggered = true
    }

    public hasHalfTimeBeenTriggered(): boolean
    {
        return this.halfTimeTriggered
    }

    // Convert real-time seconds to football time seconds
    private realTimeToFootballTime(realTimeSeconds: number): number
    {
        return Math.min(realTimeSeconds * GameTimer.ACCELERATION_FACTOR, GameTimer.FOOTBALL_MATCH_DURATION_SECONDS)
    }

    // Get elapsed football time in seconds (0-5400)
    public getFootballTimeElapsed(): number
    {
        return this.realTimeToFootballTime(this.elapsedTime)
    }

    // Get elapsed football time in minutes (0-90+)
    public getFootballTimeMinutes(): number
    {
        return Math.floor(this.getFootballTimeElapsed() / 60)
    }

    // Get football time remaining in current half (in minutes)
    public getFootballTimeRemainingInHalf(): number
    {
        const footballElapsed = this.getFootballTimeElapsed()
        const footballHalfDuration = GameTimer.FOOTBALL_MATCH_DURATION_SECONDS / 2 // 45 minutes = 2700 seconds
        const currentHalf = this.getCurrentHalf()

        if (currentHalf === 1)
        {
            return Math.max(0, Math.ceil((footballHalfDuration - footballElapsed) / 60))
        }
        else
        {
            return Math.max(0, Math.ceil((GameTimer.FOOTBALL_MATCH_DURATION_SECONDS - footballElapsed) / 60))
        }
    }

    // Get current half based on football time
    public getCurrentFootballHalf(): 1 | 2
    {
        const footballElapsed = this.getFootballTimeElapsed()
        const footballHalfDuration = GameTimer.FOOTBALL_MATCH_DURATION_SECONDS / 2 // 2700 seconds = 45 minutes
        return footballElapsed < footballHalfDuration ? 1 : 2
    }

    // Format football time as MM:SS for display (e.g., "23:45", "90+2")
    public getFormattedFootballTime(): string
    {
        const footballSeconds = this.getFootballTimeElapsed()
        const footballMinutes = Math.floor(footballSeconds / 60)
        const seconds = Math.floor(footballSeconds % 60)

        if (footballMinutes <= 90)
        {
            return `${footballMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        else
        {
            // Stoppage time (90+ format)
            const stoppageMinutes = footballMinutes - 90
            return `90+${stoppageMinutes}:${seconds.toString().padStart(2, '0')}`
        }
    }
}