# Source of Truth

This file contains canonical definitions for schemas, constants, and mappings used throughout the project. Both PRD.md and TDD.md reference this file to ensure consistency.

## FIFA Constants

All measurements normalized to 0-1 coordinate system based on FIFA specifications.

```typescript
export const FIFA_CONSTANTS = {
  GOAL: {
    WIDTH: 7.32 / 68,        // 0.1076 (10.76% of pitch width)
    HEIGHT: 2.44 / 68,       // 0.0359 (3.59% of pitch width for proportional scaling)
    POST_RADIUS: 0.06 / 68,  // 0.0009 (0.09% of pitch width)
  },
  PENALTY_AREA: {
    WIDTH: 40.32 / 68,       // 0.5929 (59.29% of pitch width)
    DEPTH: 16.5 / 105,       // 0.1571 (15.71% of pitch length)
  },
  GOAL_AREA: {
    WIDTH: 18.32 / 68,       // 0.2694 (26.94% of pitch width)
    DEPTH: 5.5 / 105,        // 0.0524 (5.24% of pitch length)
  },
  CENTER_CIRCLE: {
    RADIUS: 9.15 / 68,       // 0.1346 (13.46% of pitch width)
  },
  CORNER_ARC: {
    RADIUS: 1 / 68,          // 0.0147 (1.47% of pitch width)
  },
  PLAYER: {
    RADIUS: 0.01,            // 1% of normalized space
    REACH: 0.015,            // 1.5% for ball interactions
    SPRINT_SPEED: 0.08,      // 8% of field per second (typical sprint)
    JOG_SPEED: 0.04,         // 4% of field per second (typical jog)
  },
  BALL: {
    RADIUS: 0.007,           // 0.7% of normalized space
    MAX_HEIGHT: 0.05,        // 5% max height for lofted balls
    BOUNCE_DAMPING: 0.7,     // Energy retention on bounce
  },
} as const;
```

## Grid System

Formation Editor Tool uses 20×15 grid system with standardized cell dimensions:

- **Cell Size**: 5.5m × 4.53m (derived from FIFA pitch dimensions)
- **Total Pitch**: 105m × 68m (FIFA standard)
- **Grid Columns**: 20 (x-axis, 0-19)
- **Grid Rows**: 15 (y-axis, 0-14)
- **Key Format**: `x{col}_y{row}` (e.g., "x10_y7" for centre of pitch)

## Canonical Schemas

### UberFormationData (Primary Formation Schema)

```typescript
interface UberFormationData {
  name: string;
  players: Record<string, PlayerFormationData>; // Key format: x{col}_y{row}
}

interface PlayerFormationData {
  role: PlayerRole;
  posture: PlayingPosture;
  phases: Record<GamePhase, PhasePositioning>;
}

type PlayerRole = string; // CPU-optimized string type

enum PlayingPosture {
  DEFENSIVE = "defensive",
  BALANCED = "balanced", 
  ATTACKING = "attacking"
}

enum GamePhase {
  DEFENDING = "defending",
  NEUTRAL = "neutral",
  ATTACKING = "attacking",
  SET_PIECE = "set_piece"
}

interface PhasePositioning {
  priority: number;           // Movement priority (1-10)
  zoneInfluence: number;      // Influence radius in normalized coordinates
  supportDistance: number;    // Preferred distance from ball carrier
}
```

### PlayerAttributes (Canonical Player Stats)

```typescript
interface PlayerAttributes {
  // Core Attributes (0.0 - 10.0)
  attack: number;             // Shooting, finishing, positioning in attack
  defence: number;            // Tackling, marking, interceptions
  ballControl: number;        // First touch, dribbling, ball retention
  shotPower: number;          // Power and accuracy of shots
  strength: number;           // Physical contests, holding off opponents
  stamina: number;            // Energy levels, sprint duration
  speed: number;              // Maximum sprint speed
  passing: number;            // Short and long pass accuracy
  heading: number;            // Aerial ability for crosses and corners
  
  // Meta Attributes
  overall: number;            // Computed overall rating (0.0 - 10.0)
  name: string;               // Player display name
  role: PlayerRole;           // Primary playing position
}
```

### MatchStatistics (Canonical Match Data)

```typescript
interface MatchStatistics {
  // Core Match Data
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  
  // Timing
  startTime: number;          // Game time when match started
  currentTime: number;        // Current game time
  phase: MatchPhase;          // Current match phase
  
  // Ball State
  ballPosition: NormalizedPosition;
  ballPossession: TeamId | null;
  ballCarrier: PlayerId | null;
  
  // Team Statistics
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
  
  // Events
  events: MatchEvent[];       // Chronological event log
}

interface TeamMatchStats {
  possession: number;         // Percentage (0-100)
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  passAccuracy: number;       // Percentage (0-100)
}

interface MatchEvent {
  timestamp: number;          // Game time when event occurred
  type: EventType;
  team: TeamId;
  player?: PlayerId;
  position: NormalizedPosition;
  description: string;
}
```

## Coordinate System

- **Canonical**: Normalized coordinates (0.0 - 1.0) for all game logic
- **Rendering**: Pixel coordinates only during rendering phase
- **Conversion**: Single utility function for coordinate transformation
- **Grid Keys**: x{col}_y{row} format for formation positioning

### NormalizedPosition

```typescript
interface NormalizedPosition {
  x: number; // 0.0 to 1.0 (left to right)
  y: number; // 0.0 to 1.0 (top to bottom)
  z?: number; // Optional height for 3D ball physics (0.0 to 1.0)
}
```

## Phase Mapping (PRD ↔ TDD)

| PRD Phase | TDD State | Description | Duration |
|-----------|-----------|-------------|----------|
| PreMatch | PRE_MATCH | Players walk on, crowd cheers, commentary | 30s |
| Kick Off | KICK_OFF | Teams in starting positions, awaiting whistle | 5s |
| First Half | FIRST_HALF_PLAY | Active gameplay, first 45 minutes + stoppage | 2.5min |
| Half Time | HALF_TIME | Statistics display, brief break | 1min |
| Second Half | SECOND_HALF_PLAY | Active gameplay, second 45 minutes + stoppage | 2.5min |
| Full Time | FULL_TIME | Final statistics, match summary | 30s |
| - | THROW_IN | Dead ball: throw-in situation | 5s |
| - | CORNER_KICK | Dead ball: corner kick situation | 5s |
| - | FREE_KICK | Dead ball: free kick situation | 5s |
| - | PENALTY | Dead ball: penalty kick situation | 10s |
| - | GOAL_KICK | Dead ball: goal kick situation | 5s |

## Deterministic Game Context

All random events and time-based calculations use deterministic context for multiplayer consistency.

```typescript
interface DeterministicGameContext {
  gameTime: number;           // Accumulated game time in seconds
  rng: SeededRandom;          // Seeded RNG for reproducible randomness
  frameCount: number;         // Frame counter for temporal decisions
  matchSeed: number;          // Seed for this specific match
}

class SeededRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  public next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
}
```

## Ball Physics Model

3D physics simulation with 2D visual presentation:

```typescript
interface BallState {
  position: NormalizedPosition;   // x, y, z coordinates
  velocity: Vector3D;             // 3D velocity vector
  spin: Vector3D;                 // Ball rotation for curve effects
  onGround: boolean;              // Ground contact state
  lastTouch: PlayerId | null;     // Last player to touch ball
}

interface Vector3D {
  x: number;
  y: number; 
  z: number;
}
```

## Voice Command Mapping

| Voice Input | Game Action | Context |
|-------------|-------------|---------|
| "defend" | Set team posture to DEFENSIVE | Global team instruction |
| "attack" | Set team posture to ATTACKING | Global team instruction |
| "balanced" | Set team posture to BALANCED | Global team instruction |
| "shoot" | Attempt shot on goal | Ball carrier instruction |
| "watch the left" | Increase left flank coverage | Defensive positioning |
| "watch the right" | Increase right flank coverage | Defensive positioning |
| "close him down" | Press ball carrier | Defensive instruction |
| "get it up the pitch" | Long ball forward | Clearance instruction |

## Version Information

- **Document Version**: 1.0
- **Last Updated**: Based on system design v1.1
- **Referenced By**: PRD.md, TDD.md, FET-TDD.md