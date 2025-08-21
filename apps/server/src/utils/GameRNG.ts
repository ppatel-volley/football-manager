/**
 * Deterministic Random Number Generator for VGF game simulation
 * Uses Linear Congruential Generator (LCG) algorithm for reproducible results
 * Seeded with match seed to ensure deterministic gameplay across sessions
 */
export class GameRNG
{
    private seed: number
    private current: number

    constructor(seed: number)
    {
        this.seed = seed
        this.current = seed
    }

    /**
     * Generate next random number between 0 and 1 (exclusive of 1)
     */
    next(): number
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
     * Generate random integer between min (inclusive) and max (exclusive)
     */
    nextInt(min: number, max: number): number
    {
        return Math.floor(this.next() * (max - min)) + min
    }

    /**
     * Generate random float between min (inclusive) and max (exclusive)
     */
    nextFloat(min: number, max: number): number
    {
        return this.next() * (max - min) + min
    }

    /**
     * Generate random boolean with given probability (0-1)
     */
    nextBoolean(probability: number = 0.5): boolean
    {
        return this.next() < probability
    }

    /**
     * Pick random element from array
     */
    pickRandom<T>(array: T[]): T
    {
        const index = this.nextInt(0, array.length)
        return array[index]
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    shuffle<T>(array: T[]): T[]
    {
        const result = [...array]
        for (let i = result.length - 1; i > 0; i--)
        {
            const j = this.nextInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]]
        }
        return result
    }

    /**
     * Reset RNG to initial seed state
     */
    reset(): void
    {
        this.current = this.seed
    }

    /**
     * Get current seed value
     */
    getSeed(): number
    {
        return this.seed
    }

    /**
     * Create new RNG instance with different seed
     */
    fork(offset: number): GameRNG
    {
        return new GameRNG(this.seed + offset)
    }
}