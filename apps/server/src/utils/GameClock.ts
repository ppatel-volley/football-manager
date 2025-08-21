/**
 * Deterministic Game Clock for VGF football simulation
 * Manages match time progression in a predictable manner
 * Handles both real-time and accelerated time progression
 */
export class GameClock
{
    private currentTime: number = 0
    private isRunning: boolean = false
    private lastUpdateTime: number = 0
    private timeScale: number = 1
    
    // Football match timing constants
    public static readonly HALF_DURATION = 45 * 60 // 45 minutes in seconds
    public static readonly FULL_MATCH_DURATION = 90 * 60 // 90 minutes in seconds
    public static readonly STOPPAGE_TIME_MAX = 5 * 60 // Maximum 5 minutes stoppage time

    constructor(initialTime: number = 0, scale: number = 1)
    {
        this.currentTime = initialTime
        this.timeScale = scale
        this.lastUpdateTime = Date.now()
    }

    /**
     * Start the clock
     */
    start(): void
    {
        this.isRunning = true
        this.lastUpdateTime = Date.now()
    }

    /**
     * Stop the clock
     */
    stop(): void
    {
        this.isRunning = false
    }

    /**
     * Update clock time based on elapsed real time
     */
    update(): void
    {
        if (!this.isRunning) return

        const now = Date.now()
        const deltaMs = now - this.lastUpdateTime
        const deltaSeconds = (deltaMs / 1000) * this.timeScale
        
        this.currentTime += deltaSeconds
        this.lastUpdateTime = now
    }

    /**
     * Advance clock by specific amount (for deterministic simulation)
     */
    advance(seconds: number): void
    {
        this.currentTime += seconds
    }

    /**
     * Get current time in seconds
     */
    getCurrentTime(): number
    {
        return this.currentTime
    }

    /**
     * Get formatted match time (MM:SS or 90+MM format)
     */
    getFormattedTime(): string
    {
        const totalMinutes = Math.floor(this.currentTime / 60)
        const seconds = Math.floor(this.currentTime % 60)
        
        if (totalMinutes <= 45)
        {
            return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`
        }
        else if (totalMinutes <= 90)
        {
            return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`
        }
        else
        {
            return `90+${totalMinutes - 90}`
        }
    }

    /**
     * Get current half (1 or 2)
     */
    getCurrentHalf(): 1 | 2
    {
        return this.currentTime <= GameClock.HALF_DURATION ? 1 : 2
    }

    /**
     * Check if first half is complete
     */
    isFirstHalfComplete(): boolean
    {
        return this.currentTime >= GameClock.HALF_DURATION
    }

    /**
     * Check if match is complete (including stoppage time)
     */
    isMatchComplete(): boolean
    {
        return this.currentTime >= GameClock.FULL_MATCH_DURATION + GameClock.STOPPAGE_TIME_MAX
    }

    /**
     * Check if in stoppage time
     */
    isInStoppageTime(): boolean
    {
        const halfTime = this.getCurrentHalf() === 1 ? GameClock.HALF_DURATION : GameClock.FULL_MATCH_DURATION
        return this.currentTime > halfTime
    }

    /**
     * Get stoppage time minutes
     */
    getStoppageTime(): number
    {
        if (!this.isInStoppageTime()) return 0
        
        const halfTime = this.getCurrentHalf() === 1 ? GameClock.HALF_DURATION : GameClock.FULL_MATCH_DURATION
        return Math.floor((this.currentTime - halfTime) / 60)
    }

    /**
     * Set time scale (1 = real time, higher = faster)
     */
    setTimeScale(scale: number): void
    {
        this.timeScale = scale
    }

    /**
     * Get current time scale
     */
    getTimeScale(): number
    {
        return this.timeScale
    }

    /**
     * Reset clock to zero
     */
    reset(): void
    {
        this.currentTime = 0
        this.isRunning = false
        this.lastUpdateTime = Date.now()
    }

    /**
     * Set clock to specific time
     */
    setTime(seconds: number): void
    {
        this.currentTime = seconds
        this.lastUpdateTime = Date.now()
    }

    /**
     * Create a snapshot of current clock state
     */
    getState(): { time: number; running: boolean; scale: number }
    {
        return {
            time: this.currentTime,
            running: this.isRunning,
            scale: this.timeScale
        }
    }

    /**
     * Restore clock from snapshot
     */
    setState(state: { time: number; running: boolean; scale: number }): void
    {
        this.currentTime = state.time
        this.isRunning = state.running
        this.timeScale = state.scale
        this.lastUpdateTime = Date.now()
    }
}