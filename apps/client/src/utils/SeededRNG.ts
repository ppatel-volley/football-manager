/**
 * Deterministic pseudo-random number generator.
 *
 * Uses Mulberry32 to generate reproducible sequences for simulation determinism.
 */
export class SeededRNG {
    private state: number

    /**
     * Create a new seeded generator.
     * @param seed 32-bit unsigned integer used to seed the sequence
     */
    constructor(seed: number) {
        // Ensure non-zero 32-bit seed
        this.state = seed >>> 0 || 0x9e3779b9
    }

    /**
     * Next value in the sequence in the range [0, 1).
     */
    public next(): number {
        let t = (this.state += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    /**
     * Get a floating-point number in [min, max).
     */
    public nextInRange(min: number, max: number): number {
        return min + (max - min) * this.next()
    }

    /**
     * Get an integer in [minInclusive, maxExclusive).
     */
    public nextInt(minInclusive: number, maxExclusive: number): number {
        return Math.floor(this.nextInRange(minInclusive, maxExclusive))
    }

    /**
     * Get a signed value in (-1, 1).
     */
    public nextSigned(): number {
        return this.next() * 2 - 1
    }
}
