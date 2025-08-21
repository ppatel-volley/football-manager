/**
 * Deterministic Random Number Generator for VGF game simulation
 * Uses Linear Congruential Generator (LCG) algorithm for reproducible results
 * Seeded with match seed to ensure deterministic gameplay across sessions
 */
export class GameRNG
{
    private current: number

private seed: number

    

    constructor(seed: number)
    {
        this.seed = seed
        this.current = seed
    }

    /**
     * Create new RNG instance with different seed
     */
public fork(offset: number): GameRNG
    {
        return new GameRNG(this.seed + offset)
    }

/**
     * Get current seed value
     */
    public getSeed(): number
    {
        return this.seed
    }

    
    

    /**
     * Generate next random number between 0 and 1 (exclusive of 1)
     */
    public next(): number
    {
        // LCG formula: (a * seed + c) % m
        // Using parameters from Numerical Recipes
        const a = 1664525
        const c = 1013904223
        const m = Math.pow(2, 32)
        
        this.current = (a * this.current + c) % m
        return this.current / m
    }

    /**
     * Generate random boolean with given probability (0-1)
     */
public nextBoolean(probability: number = 0.5): boolean
    {
        return this.next() < probability
    }

/**
     * Generate random float between min (inclusive) and max (exclusive)
     */
public nextFloat(min: number, max: number): number
    {
        return this.next() * (max - min) + min
    }

/**
     * Generate random integer between min (inclusive) and max (exclusive)
     */
    public nextInt(min: number, max: number): number
    {
        return Math.floor(this.next() * (max - min)) + min
    }

    
    

    
    

    /**
     * Pick random element from array
     */
    public pickRandom<T>(array: T[]): T
    {
        const index = this.nextInt(0, array.length)
        return array[index]
    }

    /**
     * Reset RNG to initial seed state
     */
public reset(): void
    {
        this.current = this.seed
    }

/**
     * Shuffle array using Fisher-Yates algorithm
     */
    public shuffle<T>(array: T[]): T[]
    {
        const result = [...array]
        for (let i = result.length - 1; i > 0; i--)
        {
            const j = this.nextInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]]
        }
        return result
    }

    
    
}