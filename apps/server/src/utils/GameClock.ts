/**
 * Deterministic Game Clock for VGF football simulation
 * Manages match time progression in a predictable manner
 * Handles both real-time and accelerated time progression
 */
export class GameClock
{
    private currentTime: number = 0

    // 45 minutes in seconds
public static readonly FULL_MATCH_DURATION = 90 * 60

// Football match timing constants
public static readonly HALF_DURATION = 45 * 60

private isRunning: boolean = false

    private lastUpdateTime: number = 0

    // 90 minutes in seconds
public static readonly STOPPAGE_TIME_MAX = 5 * 60

private timeScale: number = 1
    
    
     

     

     /**
     * Advance clock by specific amount (for deterministic simulation)
     */

public advance(seconds: number): void
    {
        this.currentTime += seconds
    }
// Maximum 5 minutes stoppage time

    constructor(initialTime: number = 0, scale: number = 1)
    {
        this.currentTime = initialTime
        this.timeScale = scale
        this.lastUpdateTime = Date.now()
    }

    /**
     * Get current half (1 or 2)
     */
public getCurrentHalf(): 1 | 2
    {
        return this.currentTime <= GameClock.HALF_DURATION ? 1 : 2
    }

/**
     * Get current time in seconds
     */
public getCurrentTime(): number
    {
        return this.currentTime
    }

/**
     * Get formatted match time (MM:SS or 90+MM format)
     */
public getFormattedTime(): string
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
     * Create a snapshot of current clock state
     */
public getState(): { time: number; running: boolean; scale: number }
    {
        return {
            time: this.currentTime,
            running: this.isRunning,
            scale: this.timeScale
        }
    }

/**
     * Get stoppage time minutes
     */
public getStoppageTime(): number
    {
        if (!this.isInStoppageTime()) return 0
        
        const halfTime = this.getCurrentHalf() === 1 ? GameClock.HALF_DURATION : GameClock.FULL_MATCH_DURATION
        return Math.floor((this.currentTime - halfTime) / 60)
    }

/**
     * Get current time scale
     */
public getTimeScale(): number
    {
        return this.timeScale
    }

/**
     * Check if first half is complete
     */
public isFirstHalfComplete(): boolean
    {
        return this.currentTime >= GameClock.HALF_DURATION
    }

/**
     * Check if in stoppage time
     */
public isInStoppageTime(): boolean
    {
        const halfTime = this.getCurrentHalf() === 1 ? GameClock.HALF_DURATION : GameClock.FULL_MATCH_DURATION
        return this.currentTime > halfTime
    }

/**
     * Check if match is complete (including stoppage time)
     */
public isMatchComplete(): boolean
    {
        return this.currentTime >= GameClock.FULL_MATCH_DURATION + GameClock.STOPPAGE_TIME_MAX
    }

/**
     * Reset clock to zero
     */
public reset(): void
    {
        this.currentTime = 0
        this.isRunning = false
        this.lastUpdateTime = Date.now()
    }

/**
     * Restore clock from snapshot
     */
public setState(state: { time: number; running: boolean; scale: number }): void
    {
        this.currentTime = state.time
        this.isRunning = state.running
        this.timeScale = state.scale
        this.lastUpdateTime = Date.now()
    }

/**
     * Set clock to specific time
     */
public setTime(seconds: number): void
    {
        this.currentTime = seconds
        this.lastUpdateTime = Date.now()
    }

/**
     * Set time scale (1 = real time, higher = faster)
     */
public setTimeScale(scale: number): void
    {
        this.timeScale = scale
    }

/**
     * Start the clock
     */
    public start(): void
    {
        this.isRunning = true
        this.lastUpdateTime = Date.now()
    }

    /**
     * Stop the clock
     */
    public stop(): void
    {
        this.isRunning = false
    }

    /**
     * Update clock time based on elapsed real time
     */
    public update(): void
    {
        if (!this.isRunning) return

        const now = Date.now()
        const deltaMs = now - this.lastUpdateTime
        const deltaSeconds = (deltaMs / 1000) * this.timeScale
        
        this.currentTime += deltaSeconds
        this.lastUpdateTime = now
    }

    
    

    


    

    
    

    
    

    









    

    



    

    
    

    
    

    











    

    
    

    


    

    



    

    
    

    
    
}