/**
 * FIFA-compliant football pitch constants for normalised coordinate system
 * All measurements based on FIFA Laws of the Game
 * Coordinates normalised to 0-1 range for consistent simulation
 */

// FIFA pitch dimensions in metres
export const FIFA_DIMENSIONS = {
    // Main pitch dimensions
    PITCH_LENGTH: 105,        // Standard FIFA pitch length (100-110m allowed)
    PITCH_WIDTH: 68,          // Standard FIFA pitch width (64-75m allowed)
    
    // Goal dimensions
    GOAL_WIDTH: 7.32,         // Goal width (8 yards)
    GOAL_HEIGHT: 2.44,        // Goal height (8 feet)
    GOAL_DEPTH: 2,            // Goal net depth (estimated)
    
    // Penalty area (18-yard box)
    PENALTY_AREA_LENGTH: 16.5, // 18 yards from goal line
    PENALTY_AREA_WIDTH: 40.32, // 44 yards total width
    PENALTY_SPOT_DISTANCE: 11, // 12 yards from goal line
    
    // Goal area (6-yard box)
    GOAL_AREA_LENGTH: 5.5,    // 6 yards from goal line
    GOAL_AREA_WIDTH: 18.32,   // 20 yards total width
    
    // Corner arc
    CORNER_ARC_RADIUS: 1,     // 1 yard radius
    
    // Centre circle
    CENTRE_CIRCLE_RADIUS: 9.15, // 10 yards radius
    
    // Technical areas
    TECHNICAL_AREA_LENGTH: 1,  // 1 metre from touchline
    TECHNICAL_AREA_WIDTH: 8,   // 8 metres along touchline
} as const

// Normalised coordinates (0-1 range)
export const PITCH_ZONES = {
    // Defensive thirds
    HOME_DEFENSIVE_THIRD: { x: [0, 0.33], y: [0, 1] },
    AWAY_DEFENSIVE_THIRD: { x: [0.67, 1], y: [0, 1] },
    
    // Middle third
    MIDDLE_THIRD: { x: [0.33, 0.67], y: [0, 1] },
    
    // Final thirds
    HOME_FINAL_THIRD: { x: [0.67, 1], y: [0, 1] },
    AWAY_FINAL_THIRD: { x: [0, 0.33], y: [0, 1] },
    
    // Penalty areas (normalised)
    HOME_PENALTY_AREA: { 
        x: [0, FIFA_DIMENSIONS.PENALTY_AREA_LENGTH / FIFA_DIMENSIONS.PITCH_LENGTH], 
        y: [(FIFA_DIMENSIONS.PITCH_WIDTH - FIFA_DIMENSIONS.PENALTY_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH, 
            (FIFA_DIMENSIONS.PITCH_WIDTH + FIFA_DIMENSIONS.PENALTY_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH] 
    },
    AWAY_PENALTY_AREA: { 
        x: [1 - FIFA_DIMENSIONS.PENALTY_AREA_LENGTH / FIFA_DIMENSIONS.PITCH_LENGTH, 1], 
        y: [(FIFA_DIMENSIONS.PITCH_WIDTH - FIFA_DIMENSIONS.PENALTY_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH, 
            (FIFA_DIMENSIONS.PITCH_WIDTH + FIFA_DIMENSIONS.PENALTY_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH] 
    },
    
    // Goal areas (normalised)
    HOME_GOAL_AREA: { 
        x: [0, FIFA_DIMENSIONS.GOAL_AREA_LENGTH / FIFA_DIMENSIONS.PITCH_LENGTH], 
        y: [(FIFA_DIMENSIONS.PITCH_WIDTH - FIFA_DIMENSIONS.GOAL_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH, 
            (FIFA_DIMENSIONS.PITCH_WIDTH + FIFA_DIMENSIONS.GOAL_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH] 
    },
    AWAY_GOAL_AREA: { 
        x: [1 - FIFA_DIMENSIONS.GOAL_AREA_LENGTH / FIFA_DIMENSIONS.PITCH_LENGTH, 1], 
        y: [(FIFA_DIMENSIONS.PITCH_WIDTH - FIFA_DIMENSIONS.GOAL_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH, 
            (FIFA_DIMENSIONS.PITCH_WIDTH + FIFA_DIMENSIONS.GOAL_AREA_WIDTH) / 2 / FIFA_DIMENSIONS.PITCH_WIDTH] 
    },
} as const

// Key positions on pitch (normalised coordinates)
export const KEY_POSITIONS = {
    // Goal centres
    HOME_GOAL_CENTRE: { x: 0, y: 0.5 },
    AWAY_GOAL_CENTRE: { x: 1, y: 0.5 },
    
    // Penalty spots
    HOME_PENALTY_SPOT: { 
        x: FIFA_DIMENSIONS.PENALTY_SPOT_DISTANCE / FIFA_DIMENSIONS.PITCH_LENGTH, 
        y: 0.5 
    },
    AWAY_PENALTY_SPOT: { 
        x: 1 - FIFA_DIMENSIONS.PENALTY_SPOT_DISTANCE / FIFA_DIMENSIONS.PITCH_LENGTH, 
        y: 0.5 
    },
    
    // Centre spots
    CENTRE_SPOT: { x: 0.5, y: 0.5 },
    
    // Corner positions
    HOME_LEFT_CORNER: { x: 0, y: 0 },
    HOME_RIGHT_CORNER: { x: 0, y: 1 },
    AWAY_LEFT_CORNER: { x: 1, y: 0 },
    AWAY_RIGHT_CORNER: { x: 1, y: 1 },
    
    // Touchline centres
    LEFT_TOUCHLINE_CENTRE: { x: 0.5, y: 0 },
    RIGHT_TOUCHLINE_CENTRE: { x: 0.5, y: 1 },
} as const

// Formation positions (normalised coordinates)
export const FORMATION_POSITIONS = {
    '4-4-2': {
        HOME: [
            { position: 'GK', x: 0.05, y: 0.5 },       // Goalkeeper
            { position: 'LB', x: 0.2, y: 0.15 },       // Left Back
            { position: 'CB', x: 0.2, y: 0.35 },       // Centre Back (Left)
            { position: 'CB', x: 0.2, y: 0.65 },       // Centre Back (Right)
            { position: 'RB', x: 0.2, y: 0.85 },       // Right Back
            { position: 'LM', x: 0.4, y: 0.2 },        // Left Midfielder
            { position: 'CM', x: 0.4, y: 0.4 },        // Centre Midfielder (Left)
            { position: 'CM', x: 0.4, y: 0.6 },        // Centre Midfielder (Right)
            { position: 'RM', x: 0.4, y: 0.8 },        // Right Midfielder
            { position: 'ST', x: 0.65, y: 0.4 },       // Striker (Left)
            { position: 'ST', x: 0.65, y: 0.6 },       // Striker (Right)
        ],
        AWAY: [
            { position: 'GK', x: 0.95, y: 0.5 },       // Goalkeeper
            { position: 'LB', x: 0.8, y: 0.15 },       // Left Back
            { position: 'CB', x: 0.8, y: 0.35 },       // Centre Back (Left)
            { position: 'CB', x: 0.8, y: 0.65 },       // Centre Back (Right)
            { position: 'RB', x: 0.8, y: 0.85 },       // Right Back
            { position: 'LM', x: 0.6, y: 0.2 },        // Left Midfielder
            { position: 'CM', x: 0.6, y: 0.4 },        // Centre Midfielder (Left)
            { position: 'CM', x: 0.6, y: 0.6 },        // Centre Midfielder (Right)
            { position: 'RM', x: 0.6, y: 0.8 },        // Right Midfielder
            { position: 'ST', x: 0.35, y: 0.4 },       // Striker (Left)
            { position: 'ST', x: 0.35, y: 0.6 },       // Striker (Right)
        ]
    },
    
    '4-3-3': {
        HOME: [
            { position: 'GK', x: 0.05, y: 0.5 },       // Goalkeeper
            { position: 'LB', x: 0.2, y: 0.1 },        // Left Back
            { position: 'CB', x: 0.2, y: 0.35 },       // Centre Back (Left)
            { position: 'CB', x: 0.2, y: 0.65 },       // Centre Back (Right)
            { position: 'RB', x: 0.2, y: 0.9 },        // Right Back
            { position: 'CDM', x: 0.35, y: 0.5 },      // Defensive Midfielder
            { position: 'CM', x: 0.45, y: 0.3 },       // Centre Midfielder (Left)
            { position: 'CM', x: 0.45, y: 0.7 },       // Centre Midfielder (Right)
            { position: 'LW', x: 0.7, y: 0.15 },       // Left Winger
            { position: 'ST', x: 0.75, y: 0.5 },       // Striker
            { position: 'RW', x: 0.7, y: 0.85 },       // Right Winger
        ],
        AWAY: [
            { position: 'GK', x: 0.95, y: 0.5 },       // Goalkeeper
            { position: 'LB', x: 0.8, y: 0.1 },        // Left Back
            { position: 'CB', x: 0.8, y: 0.35 },       // Centre Back (Left)
            { position: 'CB', x: 0.8, y: 0.65 },       // Centre Back (Right)
            { position: 'RB', x: 0.8, y: 0.9 },        // Right Back
            { position: 'CDM', x: 0.65, y: 0.5 },      // Defensive Midfielder
            { position: 'CM', x: 0.55, y: 0.3 },       // Centre Midfielder (Left)
            { position: 'CM', x: 0.55, y: 0.7 },       // Centre Midfielder (Right)
            { position: 'LW', x: 0.3, y: 0.15 },       // Left Winger
            { position: 'ST', x: 0.25, y: 0.5 },       // Striker
            { position: 'RW', x: 0.3, y: 0.85 },       // Right Winger
        ]
    }
} as const

// Movement boundaries for different positions
export const POSITION_BOUNDARIES = {
    GOALKEEPER: { x: [0, 0.15], y: [0.25, 0.75] },     // Stay near goal
    CENTRE_BACK: { x: [0, 0.4], y: [0.2, 0.8] },       // Defensive half
    FULL_BACK: { x: [0, 0.7], y: [0, 1] },             // Wide areas
    MIDFIELDER: { x: [0.2, 0.8], y: [0.1, 0.9] },      // Box to box
    WINGER: { x: [0.3, 1], y: [0, 1] },                // Wide attacking
    STRIKER: { x: [0.4, 1], y: [0.2, 0.8] },           // Attacking areas
} as const

// Utility functions for coordinate conversion
export const COORDINATE_UTILS = {
    /**
     * Convert normalised coordinates to metres
     */
    normalisedToMetres: (x: number, y: number) => ({
        x: x * FIFA_DIMENSIONS.PITCH_LENGTH,
        y: y * FIFA_DIMENSIONS.PITCH_WIDTH
    }),

    /**
     * Convert metres to normalised coordinates
     */
    metresToNormalised: (x: number, y: number) => ({
        x: x / FIFA_DIMENSIONS.PITCH_LENGTH,
        y: y / FIFA_DIMENSIONS.PITCH_WIDTH
    }),

    /**
     * Check if position is within penalty area
     */
    isInPenaltyArea: (x: number, y: number, team: 'HOME' | 'AWAY') => {
        const area = team === 'HOME' ? PITCH_ZONES.HOME_PENALTY_AREA : PITCH_ZONES.AWAY_PENALTY_AREA
        return x >= area.x[0] && x <= area.x[1] && y >= area.y[0] && y <= area.y[1]
    },

    /**
     * Calculate distance between two normalised positions
     */
    distance: (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
        const dx = (pos1.x - pos2.x) * FIFA_DIMENSIONS.PITCH_LENGTH
        const dy = (pos1.y - pos2.y) * FIFA_DIMENSIONS.PITCH_WIDTH
        return Math.sqrt(dx * dx + dy * dy)
    }
} as const