/**
 * Maps FIFA player attributes to canonical PlayerAttributes schema
 * Based on CANONICAL-DEFINITIONS.md PlayerAttributes interface
 */

interface FIFAAttributeCategories
{
    pace: Record<string, number>;
    shooting: Record<string, number>;
    passing: Record<string, number>;
    dribbling: Record<string, number>;
    defending: Record<string, number>;
    physical: Record<string, number>;
    goalkeeping?: Record<string, number>;
}

interface CanonicalPlayerAttributes
{
    // Technical
    passing: number;
    shooting: number;
    dribbling: number;
    crossing: number;
    finishing: number;
    longShots: number;
    freeKicks: number;
    penalties: number;
    
    // Physical
    pace: number;
    acceleration: number;
    stamina: number;
    strength: number;
    jumping: number;
    agility: number;
    balance: number;
    
    // Mental
    decisions: number;
    composure: number;
    concentration: number;
    positioning: number;
    anticipation: number;
    vision: number;
    workRate: number;
    teamwork: number;
    leadership: number;
    
    // Defensive
    tackling: number;
    marking: number;
    heading: number;
    interceptions: number;
    
    // Goalkeeping (optional)
    goalkeeping?: {
        shotStopping: number;
        handling: number;
        distribution: number;
        positioning: number;
        reflexes: number;
        communication: number;
    };
}

export class AttributeMapper
{
    /**
     * Maps FIFA attributes to canonical PlayerAttributes format
     * Normalizes FIFA scale (1-99) to our scale (0-10)
     */
    mapAttributes(
        fifaAttributes: FIFAAttributeCategories,
        position: string,
        overall: number
    ): CanonicalPlayerAttributes
    {
        const normalizeValue = (value: number): number => {
            // FIFA uses 1-99 scale, we use 0-10
            return Math.round((Math.max(0, Math.min(99, value)) / 99) * 100) / 10;
        };
        
        // Extract FIFA attributes with fallbacks
        const pace = fifaAttributes.pace || {};
        const shooting = fifaAttributes.shooting || {};
        const passing = fifaAttributes.passing || {};
        const dribbling = fifaAttributes.dribbling || {};
        const defending = fifaAttributes.defending || {};
        const physical = fifaAttributes.physical || {};
        
        // Direct mappings from FIFA to canonical
        const mapped: CanonicalPlayerAttributes = {
            // Technical - Direct mappings
            passing: normalizeValue(this.getWeightedAverage([
                { value: passing.shortpassing || passing.passing || 50, weight: 0.6 },
                { value: passing.longpassing || 50, weight: 0.4 }
            ])),
            shooting: normalizeValue(this.getWeightedAverage([
                { value: shooting.finishing || 50, weight: 0.4 },
                { value: shooting.volleys || 50, weight: 0.3 },
                { value: shooting.shotpower || 50, weight: 0.3 }
            ])),
            dribbling: normalizeValue(dribbling.dribbling || dribbling.ballcontrol || 50),
            crossing: normalizeValue(passing.crossing || 50),
            finishing: normalizeValue(shooting.finishing || 50),
            longShots: normalizeValue(shooting.longshots || shooting.shotpower || 50),
            freeKicks: normalizeValue(passing.freekickaccuracy || passing.curve || 50),
            penalties: normalizeValue(shooting.penalties || 50),
            
            // Physical - Direct mappings
            pace: normalizeValue(pace.sprintspeed || pace.pace || 50),
            acceleration: normalizeValue(pace.acceleration || 50),
            stamina: normalizeValue(physical.stamina || 50),
            strength: normalizeValue(physical.strength || 50),
            jumping: normalizeValue(physical.jumping || 50),
            agility: normalizeValue(dribbling.agility || 50),
            balance: normalizeValue(dribbling.balance || 50),
            
            // Mental - Derived from FIFA attributes
            decisions: normalizeValue(this.getWeightedAverage([
                { value: shooting.positioning || 50, weight: 0.3 },
                { value: passing.vision || 50, weight: 0.3 },
                { value: dribbling.composure || 50, weight: 0.4 }
            ])),
            composure: normalizeValue(dribbling.composure || 50),
            concentration: normalizeValue(this.getWeightedAverage([
                { value: dribbling.reactions || 50, weight: 0.4 },
                { value: dribbling.composure || 50, weight: 0.3 },
                { value: defending.defensiveawareness || defending.marking || 50, weight: 0.3 }
            ])),
            positioning: normalizeValue(shooting.positioning || defending.defensiveawareness || 50),
            anticipation: normalizeValue(dribbling.reactions || defending.interceptions || 50),
            vision: normalizeValue(passing.vision || 50),
            workRate: normalizeValue(this.getWeightedAverage([
                { value: physical.stamina || 50, weight: 0.4 },
                { value: physical.aggression || 50, weight: 0.3 },
                { value: defending.defensiveawareness || 50, weight: 0.3 }
            ])),
            teamwork: normalizeValue(this.getWeightedAverage([
                { value: passing.shortpassing || 50, weight: 0.4 },
                { value: passing.vision || 50, weight: 0.3 },
                { value: shooting.positioning || 50, weight: 0.3 }
            ])),
            leadership: this.calculateLeadership(overall, position),
            
            // Defensive - Direct mappings
            tackling: normalizeValue(this.getWeightedAverage([
                { value: defending.standingtackle || defending.tackling || 50, weight: 0.6 },
                { value: defending.slidingtackle || 50, weight: 0.4 }
            ])),
            marking: normalizeValue(defending.defensiveawareness || defending.marking || 50),
            heading: normalizeValue(defending.headingaccuracy || physical.jumping || 50),
            interceptions: normalizeValue(defending.interceptions || 50)
        };
        
        // Add goalkeeping if position is goalkeeper
        if (position === 'GK' && fifaAttributes.goalkeeping)
        {
            mapped.goalkeeping = this.mapGoalkeeperAttributes(fifaAttributes.goalkeeping);
        }
        
        return mapped;
    }
    
    private mapGoalkeeperAttributes(gkAttributes: Record<string, number>): NonNullable<CanonicalPlayerAttributes['goalkeeping']>
    {
        const normalizeValue = (value: number): number => {
            return Math.round((Math.max(0, Math.min(99, value)) / 99) * 100) / 10;
        };
        
        return {
            shotStopping: normalizeValue(gkAttributes.gkdiving || gkAttributes.reflexes || 50),
            handling: normalizeValue(gkAttributes.gkhandling || gkAttributes.handling || 50),
            distribution: normalizeValue(gkAttributes.gkkicking || gkAttributes.distribution || 50),
            positioning: normalizeValue(gkAttributes.gkpositioning || gkAttributes.positioning || 50),
            reflexes: normalizeValue(gkAttributes.gkreflexes || gkAttributes.reflexes || 50),
            communication: normalizeValue(this.getWeightedAverage([
                { value: gkAttributes.gkpositioning || 50, weight: 0.5 },
                { value: gkAttributes.gkhandling || 50, weight: 0.5 }
            ]))
        };
    }
    
    private getWeightedAverage(values: Array<{ value: number; weight: number }>): number
    {
        const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
        const weightedSum = values.reduce((sum, item) => sum + (item.value * item.weight), 0);
        return weightedSum / totalWeight;
    }
    
    private calculateLeadership(overall: number, position: string): number
    {
        // Leadership based on overall rating and position
        // Captains and senior players typically have higher leadership
        let baseLeadership = (overall / 99) * 10;
        
        // Position-based modifiers
        const positionModifiers: Record<string, number> = {
            'GK': 0.2,    // Goalkeepers often leaders
            'CB': 0.15,   // Centre backs leadership role
            'CDM': 0.1,   // Defensive midfielders
            'CM': 0.05,   // Central midfielders
            'CAM': 0,     // No modifier for attacking mids
            'ST': -0.05,  // Strikers less leadership focus
            'LW': -0.1,   // Wingers less leadership focus
            'RW': -0.1
        };
        
        const modifier = positionModifiers[position] || 0;
        baseLeadership += modifier;
        
        // Ensure within bounds
        return Math.max(0, Math.min(10, Math.round(baseLeadership * 10) / 10));
    }
    
    /**
     * Validates that all required attributes are present
     */
    validateAttributes(attributes: CanonicalPlayerAttributes): boolean
    {
        const requiredFields = [
            'passing', 'shooting', 'dribbling', 'crossing', 'finishing', 'longShots',
            'freeKicks', 'penalties', 'pace', 'acceleration', 'stamina', 'strength',
            'jumping', 'agility', 'balance', 'decisions', 'composure', 'concentration',
            'positioning', 'anticipation', 'vision', 'workRate', 'teamwork', 'leadership',
            'tackling', 'marking', 'heading', 'interceptions'
        ];
        
        return requiredFields.every(field => {
            const value = (attributes as any)[field];
            return typeof value === 'number' && value >= 0 && value <= 10;
        });
    }
    
    /**
     * Get default attributes for a position when FIFA data is incomplete
     */
    getPositionDefaults(position: string): Partial<CanonicalPlayerAttributes>
    {
        const defaults: Record<string, Partial<CanonicalPlayerAttributes>> = {
            'GK': {
                tackling: 2, marking: 3, interceptions: 4,
                pace: 3, acceleration: 3,
                shooting: 1, finishing: 1, longShots: 2
            },
            'CB': {
                tackling: 7, marking: 8, heading: 8, interceptions: 7,
                dribbling: 3, pace: 4, finishing: 2
            },
            'LB': {
                tackling: 6, crossing: 6, pace: 7, stamina: 7,
                shooting: 3, heading: 5
            },
            'RB': {
                tackling: 6, crossing: 6, pace: 7, stamina: 7,
                shooting: 3, heading: 5
            },
            'CDM': {
                tackling: 7, passing: 7, interceptions: 7,
                shooting: 4, pace: 5, dribbling: 5
            },
            'CM': {
                passing: 7, vision: 6, stamina: 7, workRate: 7,
                tackling: 5, shooting: 5, pace: 6
            },
            'CAM': {
                passing: 8, vision: 8, dribbling: 7,
                shooting: 6, finishing: 6, pace: 6
            },
            'LW': {
                pace: 8, dribbling: 8, crossing: 7,
                shooting: 6, tackling: 3, heading: 4
            },
            'RW': {
                pace: 8, dribbling: 8, crossing: 7,
                shooting: 6, tackling: 3, heading: 4
            },
            'ST': {
                shooting: 8, finishing: 8, positioning: 8,
                heading: 7, pace: 7, tackling: 2
            }
        };
        
        return defaults[position] || {};
    }
}