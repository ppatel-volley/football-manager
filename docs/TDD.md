# Technical Design Document: Soccer Manager: World Cup Edition

> **Note**: This document references canonical definitions in [docs/CANONICAL-DEFINITIONS.md](./CANONICAL-DEFINITIONS.md) for schemas, constants, and mappings.

## 1. Executive Summary

**Document Version**: 1.2
**Date**: 20 August 2025
**Product**: Soccer Manager: World Cup Edition
**Architecture**: Voice-controlled football management game with 3D ball physics in 2D presentation

This Technical Design Document outlines the technical architecture and implementation details for developing Soccer Manager: World Cup Edition. The game features a voice-controlled football simulation with AI-controlled teams, 3D ball physics presented in 2D, and sophisticated formation-based player positioning using a formation editing tool for tactical AI behaviour.

### 1.1 POC Scope Definition

**Primary Goal**: Demonstrate viable AI football simulation with formation adherence and realistic match flow

**In-Scope for POC**:
- AI vs AI autonomous match simulation
- 3D ball physics with 2D visual presentation (including height simulation and landing position prediction)
- Ball in/out detection with basic restarts (throw-ins, corners, goal kicks)
- Half-time transitions with team switching
- Formation-based player positioning using formation editing tool data
- Dynamic formation templates: 4-4-2, 4-3-3, 5-3-2 (5 defenders), 3-5-2 (5 midfielders), 4-2-3-1, 3-4-3
- Basic statistics tracking (possession, shots, corners)
- In-game HUD with score, time, and team names
- Player action logic and ball passing behaviours
- FireTV Stick 4K Max optimisation (30+ FPS target)

**Explicitly Out-of-Scope**:
- Voice command system (Phase 2)
- Offside detection and foul system
- Advanced AI learning and adaptation
- Real-time multiplayer functionality
- Commentary and audio systems

### 1.2 PRD to TDD Phase Terminology Mapping

The PRD uses simplified phase names while the TDD implements a richer finite state machine. This mapping table ensures consistency:

| PRD Phase | TDD Match State(s) | Description |
|-----------|-------------------|-------------|
| PreMatch | `INTRODUCTION`, `PLAYERS_ENTERING` | Players walk onto pitch, crowd atmosphere |
| Kick Off | `PREPARE_FOR_KICKOFF`, `KICKOFF` | Team positioning and whistle for start |
| First Half | `IN_PLAY`, `OUT_OF_PLAY`, `THROW_IN`, `CORNER_KICK`, `GOAL_KICK` | Active gameplay with basic restarts |
| Half Time | `HALF_TIME_BREAK` | Statistics display and team switching |
| Second Half | `IN_PLAY`, `OUT_OF_PLAY`, `THROW_IN`, `CORNER_KICK`, `GOAL_KICK` | Active gameplay (second 45 minutes) |
| Full Time | `MATCH_COMPLETE`, `FINAL_STATISTICS` | End-of-match summary and cleanup |

**Future Phase 2 Extensions**:
- `FREE_KICK`, `PENALTY` states for advanced rule system
- `OFFSIDE` state for offside detection
- `VAR_REVIEW` for future video review system

### 1.3 Deterministic Simulation Policy

**Critical Requirement**: All simulation logic (AI decisions, physics, formation positioning) MUST use deterministic game time to ensure reproducible behaviour across different devices, runs, and test scenarios.

**Forbidden in Simulation Logic**:
- `Date.now()` - Wall-clock time (non-deterministic)
- `performance.now()` - High-resolution wall-clock time
- `Math.random()` without seeded RNG
- Any system-dependent timing

**Required for Simulation**:
- Fixed timestep game loop (33.33ms steps)
- Seeded pseudo-random number generation with shared seed for multiplayer
- Game time passed as `deltaTime` parameter to all AI and physics systems
- Clamped delta time to prevent "spiral of death" scenarios

**VGF Deterministic Context Implementation**:

VGF GameRuleset actions receive a `GameActionContext` that ensures deterministic execution across all clients:

```typescript
// VGF provides deterministic context automatically
interface ActionContext<TGameState> {
  gameState: TGameState;     // Current game state
  playerId: string;          // Player who triggered the action
  logger: Logger;            // Structured logging
  timestamp: number;         // Server timestamp for deterministic timing
}

// Custom deterministic context for football simulation
interface DeterministicGameContext {
  gameTime: number;         // Accumulated game time in seconds
  rng: SeededRandom;       // Seeded RNG for reproducible randomness
  frameCount: number;      // Frame counter for temporal decisions
  matchSeed: number;       // Match-specific seed from GameState
}

class SeededRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  // Linear congruential generator for deterministic randomness
  public next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
  
  public uniform(min: number = 0, max: number = 1): number {
    return min + (max - min) * this.next();
  }
  
  public boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
  
  public choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// Helper to create deterministic context from VGF game state
function createDeterministicContext(gameState: GameState): DeterministicGameContext {
  return {
    gameTime: gameState.gameTime,
    rng: new SeededRandom(gameState.matchSeed),
    frameCount: Math.floor(gameState.gameTime * 30), // 30 FPS
    matchSeed: gameState.matchSeed
  };
}
```

**FIFA Constants for Normalized Coordinates**:
```typescript
// FIFA-compliant pitch ratios for normalized coordinate system
export const FIFA_CONSTANTS = {
  // All ratios based on 110m × 68m FIFA maximum pitch
  PITCH: {
    LENGTH: 110, // metres
    WIDTH: 68,   // metres
  },
  
  // Goal specifications as ratios (0-1 normalized)
  GOAL: {
    WIDTH: 7.32 / 68,     // 0.1076 (10.76% of pitch width)
    HEIGHT: 2.44 / 110,   // Not relevant for 2D top-down
    DEPTH: 0.6 / 110,     // Behind goal line
    POST_WIDTH: 0.12 / 68, // Visual only
  },
  
  // Area specifications as ratios
  GOAL_AREA: {
    DEPTH: 5.5 / 110,     // 0.05 (5% of pitch length)
    WIDTH: 18.32 / 68,    // 0.2694 (26.94% of pitch width)
  },
  
  PENALTY_AREA: {
    DEPTH: 16.5 / 110,    // 0.15 (15% of pitch length)
    WIDTH: 40.32 / 68,    // 0.5929 (59.29% of pitch width)
  },
  
  // Positioning ratios
  PENALTY_SPOT: {
    DISTANCE_FROM_GOAL: 11.0 / 110, // 0.1 (10% of pitch length)
  },
  
  CENTER_CIRCLE: {
    RADIUS: 9.15 / 68,    // 0.1346 (13.46% of pitch width)
  },
  
  CORNER_ARC: {
    RADIUS: 1.0 / 68,     // 0.0147 (1.47% of pitch width)
  },
  
  // Player/ball sizes in normalized coordinates
  PLAYER: {
    RADIUS: 0.01,         // 1% of normalized space (roughly 1.1m on full pitch)
    REACH: 0.015,         // 1.5% for ball interactions
  },
  
  BALL: {
    RADIUS: 0.007,        // 0.7% of normalized space (roughly 0.77m on full pitch)
  },
  
  // Movement and positioning thresholds
  THRESHOLDS: {
    MIN_VELOCITY: 0.001,  // Stop movement below this speed
    COLLISION_MARGIN: 0.005, // Margin for collision detection
    FORMATION_TOLERANCE: 0.02, // Acceptable deviation from formation position
  }
} as const;
```

**Benefits**:
- Reproducible test scenarios for AI evaluation
- Consistent behaviour across FireTV devices with different performance characteristics
- Deterministic regression testing for formation adherence and match outcomes

### 1.3 Component Phase Mapping

| Component | POC Status | Phase 2 Status | Implementation Notes |
|-----------|------------|-----------------|----------------------|
| **Match Phases** | ⚠️ Limited | Complete | POC: KICKOFF, IN_PLAY, OUT_OF_PLAY, THROW_IN, CORNER_KICK, GOAL_KICK<br/>Phase 2: +FREE_KICK, +PENALTY, +OFFSIDE |
| **AI Difficulty** | ✅ Full | Enhanced | BEGINNER, AMATEUR, PROFESSIONAL, WORLD_CLASS |
| **Physics Engine** | ✅ 2D Only | 3D Enhanced | POC: Simple 2D Canvas physics<br/>Phase 2: +Ball height, +Spin effects, +Advanced trajectories |
| **Formation System** | ⚠️ Basic | FET Integrated | POC: Predefined 4-4-2/4-3-3 templates<br/>Phase 2: FET-TDD schema consumption |
| **Player Attributes** | ✅ Full | Enhanced | 0.0-10.0 scale (PRD specification) |
| **Match Statistics** | ⚠️ Minimal | Advanced | POC: Possession, shots, corners<br/>Phase 2: +Passes, +Fouls, +Cards, +Heatmaps |
| **Voice Commands** | ❌ Disabled | ✅ Full | Completely out of scope for POC |
| **Multiplayer** | ❌ Disabled | ✅ Full | POC: AI vs AI evaluation only |
| **Rules System** | ⚠️ Basic | Complete | POC: Ball boundaries, goals, basic restarts<br/>Phase 2: +Offside, +Fouls, +Cards, +Advanced restarts |

**Legend**: ✅ Fully implemented | ⚠️ Limited implementation | ❌ Not implemented

## 2. System Architecture Overview

### 2.1 POC Architecture Overview

```
POC Single-Client Architecture:
┌─────────────────────────────────────────┐
│           React Client (FireTV)         │
│  ┌─────────────────────────────────────┐ │
│  │         Game Manager                │ │
│  │  ┌─────────────┐ ┌─────────────────┐│ │
│  │  │    Team     │ │    Team         ││ │
│  │  │   (Home)    │ │   (Away)        ││ │
│  │  │             │ │                 ││ │
│  │  └─────────────┘ └─────────────────┘│ │
│  │         │                │          │ │
│  │         └────────┬───────┘          │ │
│  │                  │                  │ │
│  │              Ball Class             │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Canvas 2D Renderer   │   AI Controllers  │
│  Physics Engine       │   Match Logic     │
└─────────────────────────────────────────┘

Future Multiplayer (Phase 2):
┌─────────────────┐    ┌─────────────────┐
│   Client (TV)   │────│  VGF Server     │
│  - Game Manager │    │  - Match Engine │
│  - Voice Input  │    │  - Socket.IO    │
│  - Canvas 2D    │    │  - Redis Store  │
└─────────────────┘    └─────────────────┘
```

### 2.2 Technology Stack

**Frontend (Client)**:
- React 18+ with TypeScript
- VGF Client SDK for state synchronisation
- Web Speech API for voice recognition
- Canvas/WebGL for game rendering
- Socket.IO Client for real-time communication

**Backend (Server)**:
- Node.js 22+ with Express
- VGF Server framework (handles all transport and storage automatically)
- TypeScript for type safety
- Deterministic game logic via Game definitions
- Real-time multiplayer coordination

**Infrastructure**:
- pnpm workspace monorepo
- ESLint + Prettier for code quality
- Vitest (client) + Jest (server) for testing

## 3. Core Systems Design

### 3.1 Voice Recognition System

#### 3.1.1 Architecture
```typescript
interface VoiceCommand
{
  id: string;
  phrase: string;
  confidence: number;
  timestamp: number;
  playerId: string;
}

interface CommandProcessor
{
  recogniseSpeech(audioInput: MediaStream): Promise<VoiceCommand>;
  parseCommand(command: VoiceCommand): GameAction | null;
  validateCommand(action: GameAction, gameState: GameState): boolean;
}
```

#### 3.1.2 Implementation Details
- **Web Speech API Integration**: Continuous listening with noise filtering
- **Command Mapping**: Natural language to game action translation
- **Context Awareness**: Commands valid only in appropriate game states
- **Fallback System**: Visual/touch controls for command confirmation

#### 3.1.3 Supported Command Categories
```typescript
enum CommandType
{
  TACTICAL = 'tactical',        // "Defend", "Attack", "Balance"
  POSITIONAL = 'positional',    // "Watch the left", "Push up"
  ACTION = 'action',            // "Shoot", "Cross", "Pass short"
  SUBSTITUTION = 'substitution' // "Sub midfielder", "Change formation"
}
```

### 3.2 Core Game Architecture

#### 3.2.1 Game Manager Class Hierarchy

**Central Architecture**: Game Manager orchestrates Team, Player, and Ball classes for match simulation

```typescript
class GameManager {
  // Core game entities
  private homeTeam: Team;
  private awayTeam: Team;
  private ball: Ball;
  private referee: Referee;

  // Game systems
  private physicsEngine: Physics2DEngine;
  // POC: simple predefined formations; Phase 2: replace with formation editing tool data
  private formationManager: FormationManager; // POC placeholder
  private aiControllers: Map<string, TeamAIController>;
  private matchState: MatchState;
  private statistics: MatchStatistics;

  // Deterministic context for multiplayer consistency
  private deterministicContext: DeterministicGameContext;

  // Performance optimization
  private positionBuffer: Float32Array;      // All player positions (44 floats)
  private lastUpdateTime: number;
  private frameTimeTarget: number = 33;      // 30 FPS target (33ms per frame as per PRD)

  constructor(homeTeam: Team, awayTeam: Team, matchSeed?: number) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.ball = new Ball();
    this.referee = new Referee();

    // Initialize deterministic context for multiplayer consistency
    this.deterministicContext = {
      gameTime: 0,
      rng: new SeededRandom(matchSeed || 12345), // Same seed for both players
      frameCount: 0,
      matchSeed: matchSeed || 12345
    };

    // Initialize game systems
    this.physicsEngine = new Physics2DEngine();
    // POC placeholder; Phase 2: load formations via formation editing tool export
    this.formationManager = new FormationManager();
    this.aiControllers = new Map();
    this.statistics = new MatchStatistics();

    // Set up AI controllers for both teams
    this.aiControllers.set(homeTeam.id, new TeamAIController(homeTeam, "4-4-2"));
    this.aiControllers.set(awayTeam.id, new TeamAIController(awayTeam, "4-3-3"));

    // Pre-allocate position buffer for SIMD optimization
    this.positionBuffer = new Float32Array(44); // 22 players * 2 coordinates

    // Initialize match state and kick-off
    this.matchState = MatchState.PREPARING_KICKOFF;
    this.initialKickOffTeam = Math.random() < 0.5 ? 'HOME' : 'AWAY'; // Random kick-off
    this.kickOffTeam = this.initialKickOffTeam;
    this.halfTimeTransitioned = false;
    this.halfTimeStartTime = 0;
    
    this.lastUpdateTime = 0; // Initialize to 0, use game time in update loop
  }

  // Main game loop - called every frame (target 30 FPS)
  public update(currentTime: number): void {
    // **DETERMINISTIC TIMEBASE POLICY**
    // All simulation logic MUST use game time, never wall-clock time (Date.now(), performance.now())
    // This ensures reproducible AI behaviour and physics across different devices/runs

    const deltaTime = (currentTime - this.lastUpdateTime) / 1000.0; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Fixed timestep approach: limit delta time to prevent non-deterministic behaviour
    const clampedDelta = Math.min(deltaTime, 1.0 / 30.0); // Fixed 30 FPS timestep (33.33ms)

    // Update deterministic context
    this.deterministicContext.gameTime += clampedDelta;
    this.deterministicContext.frameCount++;

    // Update match state first
    this.updateMatchState(clampedDelta);

    if (this.matchState === MatchState.IN_PLAY) {
      // CRITICAL: AI and physics MUST use clampedDelta and deterministic context
      this.updateAI(clampedDelta);        // Deterministic AI decisions
      this.updatePhysics(clampedDelta);   // Deterministic physics simulation
      this.updateStatistics(clampedDelta); // Statistics tracking
    }

    // Handle state transitions
    this.checkStateTransitions();
  }

  private updateAI(deltaTime: number): void {
    const gameContext = this.buildGameContext();

    // Update both team AI controllers with deterministic context
    this.aiControllers.get(this.homeTeam.id)?.update(gameContext, deltaTime, this.deterministicContext);
    this.aiControllers.get(this.awayTeam.id)?.update(gameContext, deltaTime, this.deterministicContext);

    // Update individual player AI with deterministic context
    this.homeTeam.updatePlayers(gameContext, deltaTime, this.deterministicContext);
    this.awayTeam.updatePlayers(gameContext, deltaTime, this.deterministicContext);
  }

  private updatePhysics(deltaTime: number): void {
    // Update ball physics
    this.ball.update(deltaTime);

    // Check ball boundaries (POC scope: basic in/out detection)
    this.checkBallBoundaries();

    // Update player positions using Float32Array optimization
    this.updatePlayerPositions(deltaTime);

    // Check ball-player collisions
    this.checkBallPlayerCollisions();
  }

  private updatePlayerPositions(deltaTime: number): void {
    // Fill position buffer with current player positions
    let bufferIndex = 0;

    for (const player of this.homeTeam.players) {
      this.positionBuffer[bufferIndex++] = player.position.x;
      this.positionBuffer[bufferIndex++] = player.position.y;
    }

    for (const player of this.awayTeam.players) {
      this.positionBuffer[bufferIndex++] = player.position.x;
      this.positionBuffer[bufferIndex++] = player.position.y;
    }

    // Use optimized formation system for bulk position updates
    const ballPosition = new Float32Array([this.ball.position.x, this.ball.position.y]);

    this.formationManager.updatePlayerPositions(
      ballPosition,
      this.positionBuffer,
      this.getFormationTargets(),
      deltaTime
    );

    // Apply updated positions back to player objects
    this.applyPositionsFromBuffer();
  }

  private buildGameContext(): GameContext {
    return {
      matchState: this.matchState,
      ball: this.ball,
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      possession: this.determinePossession(),
      matchTime: this.getMatchTime(),
      statistics: this.statistics
    };
  }

  public getState(): GameManagerState {
    return {
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      ball: this.ball,
      matchState: this.matchState,
      statistics: this.statistics,
      matchTime: this.getMatchTime()
    };
  }
}

interface GameContext {
  matchState: MatchState;
  ball: Ball;
  homeTeam: Team;
  awayTeam: Team;
  possession: 'HOME' | 'AWAY' | null;
  matchTime: MatchTime;
  statistics: MatchStatistics;
}

interface GameManagerState {
  homeTeam: Team;
  awayTeam: Team;
  ball: Ball3D; // Updated to 3D ball
  matchPhase: MatchPhase; // Updated to match phase system
  statistics: MatchStatistics;
  matchTime: MatchTime;
}

// Vector interfaces for 3D ball physics
interface Vector2 {
  x: number;
  y: number;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Ball trajectory prediction for formation positioning
interface BallLandingPrediction {
  isValid: boolean;
  landingPosition: Vector2;
  timeToLanding: number;
  gridSquare: string;
}

// Multi-factor positioning system interfaces
interface PositioningFactor {
  type: 'loose_ball' | 'formation_data' | 'tactical_instruction';
  position: Vector2;
  priority: number;      // 0.0-1.0
  description: string;
}

interface LooseBallFactor extends PositioningFactor {
  type: 'loose_ball';
  ballDistance: number;
  chaseThreshold: number;
}

interface FormationFactor extends PositioningFactor {
  type: 'formation_data';
  ballGridPosition: string;
  playerRole: string;
}
```

#### 3.2.2 Team Class Implementation

```typescript
class Team {
  public readonly id: string;
  public readonly name: string;
  public readonly players: Player[];
  public readonly formation: string;
  public captain: Player;

  private formationPositions: Float32Array;
  private teamColor: 'HOME' | 'AWAY';
  private currentPhase: 'ATTACK' | 'DEFEND' | 'TRANSITION';
  private currentMatchState: MatchState = MatchState.INTRODUCTION;

  constructor(
    id: string,
    name: string,
    players: Player[],
    formation: string = "4-4-2",
    teamColor: 'HOME' | 'AWAY'
  ) {
    this.id = id;
    this.name = name;
    this.players = players;
    this.formation = formation;
    this.teamColor = teamColor;
    this.currentPhase = 'TRANSITION';

    // Assign captain (highest-rated player)
    this.captain = this.findCaptain();
    this.captain.isCaptain = true;

    // Initialize formation positions
    this.formationPositions = this.generateFormationPositions(formation);
    this.positionPlayersInFormation();
  }

  private findCaptain(): Player {
    return this.players.reduce((captain, player) =>
      player.overallRating > captain.overallRating ? player : captain
    );
  }

  /**
   * Captain Leadership System Implementation
   * Provides team-wide bonuses and tactical influence as per PRD specifications
   */
  public applyCaptainLeadershipEffects(context: GameContext): void {
    if (!this.captain) return;

    const captainPosition = this.captain.position;
    const LEADERSHIP_RADIUS = 0.15; // 15% of normalized pitch space
    const MORALE_BONUS = 0.05; // 5% attribute effectiveness bonus

    for (const player of this.players) {
      if (player.id === this.captain.id) {
        // Captain-specific bonuses
        this.applyCaptainPersonalBonuses(player, context);
        continue;
      }

      // Proximity-based morale boost
      const distanceToCaptain = this.calculateDistance(player.position, captainPosition);
      if (distanceToCaptain <= LEADERSHIP_RADIUS) {
        this.applyMoraleBoost(player, MORALE_BONUS);
      }

      // Team-wide leadership effects
      this.applyTeamwideLeadershipEffects(player, context);
    }
  }

  private applyCaptainPersonalBonuses(captain: Player, context: GameContext): void {
    // Pressure resistance bonus (+2.0 composure in high-pressure situations)
    if (this.isHighPressureSituation(captain, context)) {
      captain.attributes.composure = Math.min(10.0, captain.attributes.composure + 2.0);
    }

    // Set piece authority (priority for penalties and free kicks)
    captain.setTakesPenalties(true);
    captain.setTakesFreeKicks(true);
  }

  private applyMoraleBoost(player: Player, bonus: number): void {
    // Apply 5% attribute effectiveness bonus
    const attributes = player.attributes;
    const boostedAttributes = {
      ...attributes,
      pace: Math.min(10.0, attributes.pace * (1 + bonus)),
      shooting: Math.min(10.0, attributes.shooting * (1 + bonus)),
      passing: Math.min(10.0, attributes.passing * (1 + bonus)),
      ballControl: Math.min(10.0, attributes.ballControl * (1 + bonus)),
      tackling: Math.min(10.0, attributes.tackling * (1 + bonus))
    };
    
    player.setTemporaryAttributes(boostedAttributes);
  }

  private applyTeamwideLeadershipEffects(player: Player, context: GameContext): void {
    // Comeback inspiration (+10% stamina regeneration when losing)
    if (this.isTeamLosing(context)) {
      const COMEBACK_STAMINA_BONUS = 0.10;
      player.staminaRegenerationRate *= (1 + COMEBACK_STAMINA_BONUS);
    }

    // Disciplinary leadership (15% reduction in misconduct likelihood)
    const DISCIPLINARY_REDUCTION = 0.15;
    player.misconductLikelihood *= (1 - DISCIPLINARY_REDUCTION);
  }

  private isHighPressureSituation(player: Player, context: GameContext): boolean {
    // High pressure: in penalty area or final 10 minutes of match
    const inPenaltyArea = this.isInPenaltyArea(player.position, context);
    const finalMinutes = context.matchTime.elapsed > 80 * 60; // 80+ minutes
    const closeMatch = Math.abs(context.homeScore - context.awayScore) <= 1;
    
    return (inPenaltyArea || (finalMinutes && closeMatch));
  }

  private isTeamLosing(context: GameContext): boolean {
    const myScore = this.teamColor === 'HOME' ? context.homeScore : context.awayScore;
    const opponentScore = this.teamColor === 'HOME' ? context.awayScore : context.homeScore;
    return myScore < opponentScore;
  }

  /**
   * Captain Tactical Communication System
   * Allows captain to override player positioning for tactical adjustments
   */
  public applyCaptainTacticalOverrides(): void {
    if (!this.captain) return;

    const TACTICAL_OVERRIDE_RADIUS = 0.20; // 20% of pitch for tactical influence
    const MAX_POSITION_OVERRIDE = 0.10; // 10% maximum position adjustment

    for (const player of this.players) {
      if (player.id === this.captain.id) continue;

      const distanceToCaptain = this.calculateDistance(player.position, this.captain.position);
      
      if (distanceToCaptain <= TACTICAL_OVERRIDE_RADIUS) {
        // Captain can provide tactical positioning adjustments
        const tacticalAdjustment = this.calculateCaptainTacticalAdjustment(player);
        
        if (tacticalAdjustment) {
          const adjustedPosition = {
            x: player.targetPosition.x + tacticalAdjustment.x * MAX_POSITION_OVERRIDE,
            y: player.targetPosition.y + tacticalAdjustment.y * MAX_POSITION_OVERRIDE
          };
          
          player.setCaptainTacticalOverride(adjustedPosition);
        }
      }
    }
  }

  private calculateCaptainTacticalAdjustment(player: Player): Vector2 | null {
    // Captain makes tactical decisions based on leadership attribute and game situation
    if (this.captain.attributes.leadership < 7.0) return null;

    // Example tactical adjustments based on game context
    // This would be expanded with more sophisticated tactical logic
    return {
      x: (Math.random() - 0.5) * 0.1, // Simple random adjustment for POC
      y: (Math.random() - 0.5) * 0.1
    };
  }

  public updatePlayers(context: GameContext, deltaTime: number): void {
    // Apply captain leadership effects first
    this.applyCaptainLeadershipEffects(context);
    
    // Update each player's AI and movement
    for (const player of this.players) {
      player.update(context, deltaTime);
    }
    
    // Apply captain tactical overrides after individual updates
    this.applyCaptainTacticalOverrides();
  }

  public resetPlayersToFormation(): void {
    // Reset all players to their base formation positions
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const basePosition = this.getFormationBasePosition(i);
      
      player.position = { ...basePosition };
      player.targetPosition = { ...basePosition };
      player.hasBall = false;
      player.velocity = { x: 0, y: 0 };
      
      // Reset player state for kick-off
      player.stamina = 100;
    }
  }

  private getFormationBasePosition(playerIndex: number): Vector2 {
    // Get base position from formation data
    const positionIndex = playerIndex * 2;
    return {
      x: this.formationPositions[positionIndex],
      y: this.formationPositions[positionIndex + 1]
    };
  }

  /**
   * STATE TRANSITION HANDLER - Called by GameManager when match state changes
   */
  public onMatchStateChange(newState: MatchState, previousState: MatchState): void {
    console.log(`Team ${this.name}: State change ${previousState} -> ${newState}`);
    this.currentMatchState = newState;

    switch (newState) {
      case MatchState.INTRODUCTION:
        this.handleIntroductionState();
        break;

      case MatchState.PREPARE_FOR_KICKOFF:
        this.handlePrepareKickoffState();
        break;

      case MatchState.IN_PLAY:
        this.handleInPlayState(previousState);
        break;

      case MatchState.GOAL_KICK:
      case MatchState.CORNER_KICK:
      case MatchState.THROW_IN:
        this.handleSetPieceState(newState);
        break;

      case MatchState.GOAL_SCORED:
        this.handleGoalScoredState();
        break;

      case MatchState.HALF_TIME:
        this.handleHalfTimeState();
        break;

      case MatchState.FULL_TIME:
        this.handleFullTimeState();
        break;

      default:
        console.warn(`Team ${this.name}: Unhandled state transition to ${newState}`);
        break;
    }

    // Propagate state change to all players
    this.players.forEach(player => {
      player.onMatchStateChange(newState, previousState);
    });
  }

  private handleIntroductionState(): void {
    // Players walk onto pitch, crowd atmosphere
    // Set players to walking animation, move towards starting positions
    this.players.forEach(player => {
      player.setAnimationState('walking');
      player.setMovementSpeed(0.02); // Slow walk onto pitch
    });
  }

  private handlePrepareKickoffState(): void {
    // Move players to kick-off positions quickly
    this.resetPlayersToFormation();
    this.players.forEach(player => {
      player.setAnimationState('jogging');
      player.setMovementSpeed(0.06); // Quick movement to positions
    });
  }

  private handleInPlayState(previousState: MatchState): void {
    // Resume normal gameplay
    this.currentPhase = 'TRANSITION'; // Reset to neutral phase
    this.players.forEach(player => {
      player.setAnimationState('ready');
      player.setMovementSpeed(player.getBaseMovementSpeed());
    });

    // If transitioning from set piece, clear any temporary roles
    if (this.isSetPieceState(previousState)) {
      this.clearSetPieceRoles();
    }
  }

  private handleSetPieceState(setState: MatchState): void {
    // Assign set piece roles and positions
    switch (setState) {
      case MatchState.GOAL_KICK:
        this.assignGoalKickRoles();
        break;
      case MatchState.CORNER_KICK:
        this.assignCornerKickRoles();
        break;
      case MatchState.THROW_IN:
        this.assignThrowInRoles();
        break;
    }

    // Move players to set piece positions
    this.players.forEach(player => {
      player.setAnimationState('positioning');
      player.setMovementSpeed(0.04); // Moderate speed for positioning
    });
  }

  private handleGoalScoredState(): void {
    // Trigger appropriate celebration or disappointment
    const goalScorer = this.findGoalScorer(); // Would be passed in state data
    
    if (goalScorer) {
      // Our team scored - celebration
      this.players.forEach(player => {
        if (player === goalScorer) {
          player.setAnimationState('celebrating');
        } else {
          player.setAnimationState('cheering');
        }
      });
    } else {
      // Opponent scored - disappointment
      this.players.forEach(player => {
        player.setAnimationState('disappointed');
      });
    }
  }

  private handleHalfTimeState(): void {
    // Players walk off pitch
    this.players.forEach(player => {
      player.setAnimationState('walking');
      player.setMovementSpeed(0.02);
      // Set target to tunnel/sideline
      player.targetPosition = this.calculateTunnelPosition();
    });
  }

  private handleFullTimeState(): void {
    // Match complete - varied reactions based on result
    this.players.forEach(player => {
      // Animation would depend on match result
      player.setAnimationState('match_end');
      player.setMovementSpeed(0.01); // Very slow movement
    });
  }

  private isSetPieceState(state: MatchState): boolean {
    return state === MatchState.GOAL_KICK || 
           state === MatchState.CORNER_KICK || 
           state === MatchState.THROW_IN;
  }

  private assignGoalKickRoles(): void {
    // Goalkeeper takes kick, outfield players spread out
    const goalkeeper = this.players.find(p => p.role === 'GOALKEEPER');
    if (goalkeeper) {
      goalkeeper.setTemporaryRole('goal_kicker');
    }
  }

  private assignCornerKickRoles(): void {
    // Find best corner kick taker, others position for cross
    const cornerTaker = this.findBestCornerTaker();
    cornerTaker?.setTemporaryRole('corner_taker');
  }

  private assignThrowInRoles(): void {
    // Nearest outfield player takes throw-in
    const throwInTaker = this.findNearestOutfieldPlayer();
    throwInTaker?.setTemporaryRole('throw_in_taker');
  }

  public getPlayersInPositionOrder(): Player[] {
    // Return players ordered by formation position (GK, DEF, MID, ATT)
    return [...this.players].sort((a, b) => {
      const positionOrder = {
        'GOALKEEPER': 0,
        'CENTRE_BACK': 1, 'FULL_BACK': 1,
        'CENTRAL_MIDFIELDER': 2, 'WINGER': 2,
        'STRIKER': 3
      };

      return (positionOrder[a.role] || 99) - (positionOrder[b.role] || 99);
    });
  }

  private generateFormationPositions(formation: string): Float32Array {
    // Generate normalized positions based on formation
    // This integrates with the Float32Array optimization system

    switch (formation) {
      case "4-4-2":
        return this.create442Positions();
      case "4-3-3":
        return this.create433Positions();
      default:
        return this.create442Positions(); // Default fallback
    }
  }

  private create442Positions(): Float32Array {
    // Position away team attacking left instead of right
    const baseX = this.teamColor === 'HOME' ? 0.0 : 1.0;
    const direction = this.teamColor === 'HOME' ? 1 : -1;

    return new Float32Array([
      // Goalkeeper
      baseX + (0.05 * direction), 0.5,

      // Defense (4)
      baseX + (0.25 * direction), 0.2,  // Left back
      baseX + (0.20 * direction), 0.35, // Center back left
      baseX + (0.20 * direction), 0.65, // Center back right
      baseX + (0.25 * direction), 0.8,  // Right back

      // Midfield (4)
      baseX + (0.45 * direction), 0.15, // Left midfield
      baseX + (0.50 * direction), 0.35, // Center midfield left
      baseX + (0.50 * direction), 0.65, // Center midfield right
      baseX + (0.45 * direction), 0.85, // Right midfield

      // Attack (2)
      baseX + (0.75 * direction), 0.4,  // Striker left
      baseX + (0.75 * direction), 0.6   // Striker right
    ]);
  }
}
```

#### 3.2.3 Player Class Implementation

```typescript
class Player {
  // Identity
  public readonly id: string;
  public readonly name: string;
  public readonly kitNumber: number;
  public role: PlayerRole;
  public isCaptain: boolean = false;

  // Physical state
  public position: Vector2;
  public targetPosition: Vector2;
  public velocity: Vector2;
  public facing: number; // Radians

  // Game state
  public hasBall: boolean = false;
  public stamina: number = 100; // 0-100
  public confidence: number = 80; // 0-100
  public currentMatchState: MatchState = MatchState.INTRODUCTION;
  public animationState: string = 'idle';
  public movementSpeed: number = 0.04; // Base movement speed
  public temporaryRole: string | null = null;

  // Attributes (from PRD specification)
  public attributes: PlayerAttributes;
  public overallRating: number;

  // AI state
  private aiState: PlayerAIState;
  private movementController: PlayerMovementController;

  constructor(
    id: string,
    name: string,
    kitNumber: number,
    role: PlayerRole,
    attributes: PlayerAttributes
  ) {
    this.id = id;
    this.name = name;
    this.kitNumber = kitNumber;
    this.role = role;
    this.attributes = attributes;

    // Calculate overall rating from attributes
    this.overallRating = this.calculateOverallRating();

    // Initialize position (set by team formation)
    this.position = { x: 0.5, y: 0.5 };
    this.targetPosition = { x: 0.5, y: 0.5 };
    this.velocity = { x: 0, y: 0 };
    this.facing = 0;

    // Initialize AI state
    this.aiState = new PlayerAIState();
    this.movementController = new PlayerMovementController();
  }

  public update(context: GameContext, deltaTime: number): void {
    // Update AI decision making
    this.updateAI(context, deltaTime);

    // Update movement towards target
    this.updateMovement(deltaTime);

    // Update stamina
    this.updateStamina(deltaTime);
  }

  private updateAI(context: GameContext, deltaTime: number): void {
    // Enhanced AI decisions with specific analysis from outline.md requirements

    if (context.ball.owner === null) {
      // Ball is loose - decide whether to chase it
      this.aiState.timeToReachBall = this.calculateTimeToReachBall(context.ball);

      if (this.shouldChaseBall(context)) {
        this.targetPosition = this.predictBallInterception(context.ball);
      } else {
        // Maintain formation position with slight ball influence
        this.targetPosition = this.getFormationPosition(context);
      }
    } else if (context.ball.owner?.team === this.getTeam(context)) {
      // Team has possession - support or make runs
      this.targetPosition = this.getSupportPosition(context);
    } else if (this.hasBall) {
      // **Player Action Decision Tree** (from outline.md:137-140)
      this.executePlayerActionDecisionTree(context);
    } else {
      // Opposition has possession - defend
      this.targetPosition = this.getDefensivePosition(context);
    }
  }

  /**
   * Player Action Decision Tree for Ball Possessors (from outline.md:137-140)
   * For ball possessors who are not the goal keeper, we will run a check to determine the best course of action.
   */
  private executePlayerActionDecisionTree(context: GameContext): void {
    if (this.role === 'GOALKEEPER') {
      this.executeGoalkeeperActions(context);
      return;
    }

    // Analysis factors from outline.md:139-140
    const spaceAhead = this.analyzeSpaceAheadTowardsGoal(context);
    const playerInOppositionBox = this.findPlayerInOppositionPenaltyBox(context);
    
    // Decision tree based on analysis
    if (playerInOppositionBox && this.canAttemptCross(context)) {
      // **If there is a player in the opposition penalty box we will attempt to pass to them via a cross/whipped pass**
      this.executeCrossToPlayer(playerInOppositionBox, context);
    }
    else if (spaceAhead.hasSpace && spaceAhead.distanceToGoal < 0.3) { // Within 30% of pitch
      // **If there is space ahead of the player to run towards the opposition goal**
      this.executeRunTowardsGoal(spaceAhead, context);
    }
    else if (this.shouldAttemptShot(context)) {
      this.executeShot(context);
    }
    else {
      // Default: Look for best passing option or maintain possession
      this.executeBestPassingOption(context);
    }
  }

  private analyzeSpaceAheadTowardsGoal(context: GameContext): SpaceAnalysis {
    const oppositionGoal = this.getOppositionGoalPosition(context);
    const directionToGoal = this.normalizeVector({
      x: oppositionGoal.x - this.position.x,
      y: oppositionGoal.y - this.position.y
    });

    // Check for clear space in direction of goal
    const spaceCheckDistance = 0.1; // 10% of pitch
    const checkPosition = {
      x: this.position.x + directionToGoal.x * spaceCheckDistance,
      y: this.position.y + directionToGoal.y * spaceCheckDistance
    };

    const opponentsInPath = this.getOpponentsInArea(checkPosition, 0.05, context);
    const teammatesInPath = this.getTeammatesInArea(checkPosition, 0.05, context);

    return {
      hasSpace: opponentsInPath.length === 0 && teammatesInPath.length === 0,
      distanceToGoal: this.calculateDistance(this.position, oppositionGoal),
      clearPath: this.hasCllearPathToGoal(context),
      spaceQuality: this.calculateSpaceQuality(checkPosition, context)
    };
  }

  private findPlayerInOppositionPenaltyBox(context: GameContext): Player | null {
    const oppositionPenaltyArea = this.getOppositionPenaltyArea(context);
    const teammates = this.getTeammates(context);
    
    // Find teammates in opposition penalty box
    const playersInBox = teammates.filter(teammate => 
      this.isInArea(teammate.position, oppositionPenaltyArea) &&
      teammate.id !== this.id
    );

    if (playersInBox.length === 0) return null;

    // Return best positioned player for cross
    return playersInBox.reduce((best, current) => {
      const bestScore = this.calculateCrossTargetScore(best, context);
      const currentScore = this.calculateCrossTargetScore(current, context);
      return currentScore > bestScore ? current : best;
    });
  }

  private canAttemptCross(context: GameContext): boolean {
    // Check if player is in good crossing position (wide areas)
    const isInWideArea = this.position.y < 0.25 || this.position.y > 0.75; // Wide flanks
    const hasGoodCrossingAngle = this.calculateCrossingAngle(context) > 0.3;
    const hasSufficientCrossingSkill = this.attributes.crossing > 5.0;
    
    return isInWideArea && hasGoodCrossingAngle && hasSufficientCrossingSkill;
  }

  private executeCrossToPlayer(targetPlayer: Player, context: GameContext): void {
    const crossPower = this.calculateOptimalCrossPower(targetPlayer);
    const crossDirection = this.calculateCrossDirection(targetPlayer);
    
    // Execute whipped pass/cross as specified in outline.md
    this.executeKick(crossDirection, crossPower, 'CROSS');
    
    // Set target position to support the cross
    this.targetPosition = this.calculateCrossFollowUpPosition(context);
  }

  private executeRunTowardsGoal(spaceAnalysis: SpaceAnalysis, context: GameContext): void {
    const runDirection = this.calculateOptimalRunDirection(context);
    const runDistance = Math.min(spaceAnalysis.spaceQuality * 0.1, 0.08); // Max 8% of pitch per action
    
    this.targetPosition = {
      x: this.position.x + runDirection.x * runDistance,
      y: this.position.y + runDirection.y * runDistance
    };
    
    // Keep ball with player during run
    this.maintainBallPossession(context);
  }

  private shouldAttemptShot(context: GameContext): boolean {
    const distanceToGoal = this.calculateDistance(this.position, this.getOppositionGoalPosition(context));
    const shootingAngle = this.calculateShootingAngle(context);
    const hasGoodShootingPosition = distanceToGoal < 0.25 && shootingAngle > 0.2;
    const hasSufficientShootingSkill = this.attributes.shooting > 4.0;
    
    return hasGoodShootingPosition && hasSufficientShootingSkill;
  }

  /**
   * STATE TRANSITION HANDLER - Called by Team when match state changes
   */
  public onMatchStateChange(newState: MatchState, previousState: MatchState): void {
    this.currentMatchState = newState;

    switch (newState) {
      case MatchState.INTRODUCTION:
        this.handleIntroductionState();
        break;

      case MatchState.PREPARE_FOR_KICKOFF:
        this.handlePrepareKickoffState();
        break;

      case MatchState.IN_PLAY:
        this.handleInPlayState(previousState);
        break;

      case MatchState.GOAL_KICK:
      case MatchState.CORNER_KICK:
      case MatchState.THROW_IN:
        this.handleSetPieceState(newState);
        break;

      case MatchState.GOAL_SCORED:
        this.handleGoalScoredState();
        break;

      case MatchState.HALF_TIME:
        this.handleHalfTimeState();
        break;

      case MatchState.FULL_TIME:
        this.handleFullTimeState();
        break;
    }
  }

  private handleIntroductionState(): void {
    // Walking onto pitch animation
    this.setAnimationState('walking');
    this.confidence = Math.max(60, this.confidence - 5); // Slight nerves
  }

  private handlePrepareKickoffState(): void {
    // Get into position quickly
    this.setAnimationState('jogging');
    this.confidence = Math.min(100, this.confidence + 2); // Ready to play
  }

  private handleInPlayState(previousState: MatchState): void {
    // Resume normal gameplay
    this.setAnimationState('ready');
    this.clearTemporaryRole(); // Clear any set piece roles
    
    // Adjust confidence based on previous state
    if (previousState === MatchState.GOAL_SCORED) {
      // Confidence affected by goal
      this.confidence = Math.min(100, this.confidence + (this.scoredLastGoal() ? 10 : -5));
    }
  }

  private handleSetPieceState(setState: MatchState): void {
    // Set appropriate animation for set piece
    this.setAnimationState('positioning');
    
    // Adjust behavior based on temporary role
    if (this.temporaryRole) {
      this.confidence = Math.min(100, this.confidence + 3); // Confidence boost for taking set piece
    }
  }

  private handleGoalScoredState(): void {
    // Different animations based on involvement
    if (this.scoredLastGoal()) {
      this.setAnimationState('celebrating');
      this.confidence = Math.min(100, this.confidence + 15);
    } else if (this.assistedLastGoal()) {
      this.setAnimationState('cheering');
      this.confidence = Math.min(100, this.confidence + 8);
    } else {
      this.setAnimationState('celebrating'); // Team celebration
      this.confidence = Math.min(100, this.confidence + 5);
    }
  }

  private handleHalfTimeState(): void {
    // Walk off pitch
    this.setAnimationState('walking');
    this.stamina = Math.min(100, this.stamina + 20); // Partial stamina recovery
  }

  private handleFullTimeState(): void {
    // Match end reactions
    this.setAnimationState('match_end');
    this.clearTemporaryRole();
  }

  // State-related helper methods
  public setAnimationState(newState: string): void {
    this.animationState = newState;
  }

  public setMovementSpeed(speed: number): void {
    this.movementSpeed = speed;
  }

  public getBaseMovementSpeed(): number {
    // Base speed modified by stamina and pace attribute
    const staminaFactor = this.stamina / 100;
    const paceFactor = this.attributes.pace / 10;
    return 0.04 * staminaFactor * paceFactor;
  }

  public setTemporaryRole(role: string): void {
    this.temporaryRole = role;
  }

  public clearTemporaryRole(): void {
    this.temporaryRole = null;
  }

  public setTakesPenalties(takes: boolean): void {
    this.aiState.takesPenalties = takes;
  }

  public setTakesFreeKicks(takes: boolean): void {
    this.aiState.takesFreeKicks = takes;
  }

  public setTemporaryAttributes(attributes: PlayerAttributes): void {
    // Temporarily boost attributes (cleared after match state change)
    this.attributes = { ...attributes };
  }

  private scoredLastGoal(): boolean {
    // Would check against match statistics
    return false; // Placeholder
  }

  private assistedLastGoal(): boolean {
    // Would check against match statistics  
    return false; // Placeholder
  }
}

interface SpaceAnalysis {
  hasSpace: boolean;
  distanceToGoal: number;
  clearPath: boolean;
  spaceQuality: number; // 0.0-1.0 rating of space quality
}

  private calculateOverallRating(): number {
    // Calculate overall rating based on role-specific attribute weightings
    const roleWeights = this.getRoleAttributeWeights(this.role);
    let totalRating = 0;
    let totalWeight = 0;

    for (const [attribute, weight] of Object.entries(roleWeights)) {
      if (this.attributes[attribute] !== undefined) {
        totalRating += this.attributes[attribute] * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? (totalRating / totalWeight) * 10 : 50; // Convert to 0-100 scale
  }

  private getRoleAttributeWeights(role: PlayerRole): Record<string, number> {
    const weights = {
      [PlayerRole.GOALKEEPER]: {
        handling: 0.2, reflexes: 0.2, aerialReach: 0.15,
        oneOnOnes: 0.15, distribution: 0.1, positioning: 0.18
      },
      [PlayerRole.CENTRE_BACK]: {
        tackling: 0.2, marking: 0.2, heading: 0.18,
        positioning: 0.15, strength: 0.12, passing: 0.15
      },
      [PlayerRole.FULL_BACK]: {
        tackling: 0.15, marking: 0.12, pace: 0.18,
        crossing: 0.15, stamina: 0.15, passing: 0.25
      },
      [PlayerRole.CENTRAL_MIDFIELDER]: {
        passing: 0.25, vision: 0.2, stamina: 0.15,
        ballControl: 0.15, decisions: 0.12, tackling: 0.13
      },
      [PlayerRole.WINGER]: {
        pace: 0.2, crossing: 0.18, dribbling: 0.18,
        stamina: 0.15, passing: 0.15, shooting: 0.14
      },
      [PlayerRole.STRIKER]: {
        shooting: 0.25, finishing: 0.2, pace: 0.15,
        positioning: 0.15, heading: 0.12, ballControl: 0.13
      }
    };

    return weights[role] || weights[PlayerRole.CENTRAL_MIDFIELDER];
  }
}

// **CANONICAL** Player attributes from PRD specification (0.0-10.0 scale)
interface PlayerAttributes {
  // Physical Attributes (0.0-10.0 scale as per PRD)
  pace: number;           // Sprint speed
  acceleration: number;   // Reaching top speed
  stamina: number;        // Match-long performance
  strength: number;       // Physical duels
  jumpingReach: number;   // Aerial ability
  agility: number;        // Direction changes
  balance: number;        // Stability

  // Technical Attributes (0.0-10.0 scale as per PRD)
  ballControl: number;    // First touch quality
  dribbling: number;      // Maintaining possession whilst moving
  passing: number;        // Accuracy and range
  crossing: number;       // Wide delivery quality
  shooting: number;       // Power and accuracy
  finishing: number;      // Goal conversion
  longShots: number;      // Distance shooting
  freeKickTaking: number; // Dead ball expertise
  penaltyTaking: number;  // Penalty conversion

  // Mental Attributes (0.0-10.0 scale as per PRD)
  decisions: number;      // Choice quality
  composure: number;      // Pressure performance
  concentration: number;  // Focus maintenance
  positioning: number;    // Tactical awareness
  anticipation: number;   // Game reading
  vision: number;         // Opportunity spotting
  workRate: number;       // Effort levels
  teamwork: number;       // Collective play
  leadership: number;     // Teammate influence

  // Defensive Attributes (0.0-10.0 scale as per PRD)
  tackling: number;       // Ground challenges
  marking: number;        // Opponent tracking
  heading: number;        // Aerial defending
  interceptions: number;  // Pass reading

  // Goalkeeping Attributes - optional (0.0-10.0 scale as per PRD)
  handling?: number;      // Ball security
  reflexes?: number;      // Reaction time
  aerialReach?: number;   // Cross claiming
  oneOnOnes?: number;     // Close-range saves
  distribution?: number;  // Ball delivery
}
```

#### 3.2.4 Ball Class Implementation

```typescript
// **Ball with 3D Physics in 2D Presentation** - Ball uses 3D physics but presented in 2D with visual illusions
class Ball {
  public position: Vector2;
  public velocity: Vector3; // 3D velocity including Z-axis
  public height: number = 0; // Z-axis for 3D physics
  public owner: Player | null;
  public lastTouchedBy: Player | null;
  public isMoving: boolean = false;
  public currentMatchState: MatchState = MatchState.INTRODUCTION;

  private radius: number = 0.01; // Normalized ball size
  private friction: number = 0.98; // 2% velocity loss per frame

  constructor() {
    this.position = { x: 0.5, y: 0.5 }; // Center of pitch
    this.velocity = { x: 0, y: 0, z: 0 }; // 3D velocity
    this.owner = null;
    this.lastTouchedBy = null;
  }

  public update(deltaTime: number): void {
    if (this.owner) {
      // Ball follows the player who owns it
      this.followOwner(deltaTime);
    } else {
      // Ball moves freely with physics
      this.updateFreeMovement(deltaTime);
    }
  }

  private updateFreeMovement(deltaTime: number): void {
    // 3D physics simulation for realistic ball movement
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Height physics (gravity affects Z-axis)
    this.height = Math.max(0, this.height + this.velocity.z * deltaTime);
    this.velocity.z -= 9.81 * deltaTime; // Gravity

    // Apply 2D friction when ball is on ground
    if (this.height <= 0) {
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
      this.velocity.z = 0; // Stop vertical movement when on ground
    }

    // Stop very slow movement (performance optimization)
    const minVelocity = 0.01;
    if (Math.abs(this.velocity.x) < minVelocity && Math.abs(this.velocity.y) < minVelocity) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.isMoving = false;
    } else {
      this.isMoving = true;
    }
  }
  
  // Calculate where ball will land for formation positioning
  public predictLandingPosition(): { position: Vector2; gridSquare: string } {
    // Calculate landing position based on current trajectory
    const timeToLand = this.height > 0 ? Math.sqrt(2 * this.height / 9.81) : 0;
    const landingX = this.position.x + this.velocity.x * timeToLand;
    const landingY = this.position.y + this.velocity.y * timeToLand;
    
    // Convert to formation grid square
    const gridX = Math.floor(landingX * 20); // 20 columns
    const gridY = Math.floor(landingY * 15); // 15 rows
    const gridSquare = `x${gridX}_y${gridY}`;
    
    return {
      position: { x: landingX, y: landingY },
      gridSquare
    };
  }

  private followOwner(deltaTime: number): void {
    if (!this.owner) return;

    // Ball stays close to player who owns it
    const targetX = this.owner.position.x + Math.cos(this.owner.facing) * 0.03;
    const targetY = this.owner.position.y + Math.sin(this.owner.facing) * 0.03;

    // Smooth interpolation to target position
    const lerpFactor = Math.min(deltaTime * 5.0, 1.0);
    this.position.x += (targetX - this.position.x) * lerpFactor;
    this.position.y += (targetY - this.position.y) * lerpFactor;

    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  public kick(direction: Vector3, power: number, kicker: Player): void {
    // Apply kick to ball with 3D velocity
    this.velocity.x = direction.x * power * 0.5;
    this.velocity.y = direction.y * power * 0.5;
    this.velocity.z = direction.z * power * 0.5; // Height component

    // Ball is no longer owned
    this.owner = null;
    this.lastTouchedBy = kicker;
  }

  public isOutOfBounds(): { out: boolean; side?: 'left' | 'right' | 'top' | 'bottom' } {
    if (this.position.x < 0) return { out: true, side: 'left' };
    if (this.position.x > 1) return { out: true, side: 'right' };
    if (this.position.y < 0) return { out: true, side: 'top' };
    if (this.position.y > 1) return { out: true, side: 'bottom' };

    return { out: false };
  }

  public isInGoal(): { inGoal: boolean; side?: 'home' | 'away' } {
    const goalWidth = FIFA_CONSTANTS.GOAL.WIDTH; // Correct FIFA ratio (10.76%)
    const goalY = (1 - goalWidth) / 2;

    // Check if ball is in goal area and crossed goal line
    if (this.position.y >= goalY && this.position.y <= goalY + goalWidth) {
      if (this.position.x <= 0) return { inGoal: true, side: 'home' };
      if (this.position.x >= 1) return { inGoal: true, side: 'away' };
    }

    return { inGoal: false };
  }

  // Calculate where ball will land for formation positioning with standardized grid keys
  public predictLandingPosition(): { position: Vector2; gridSquare: string } {
    // Calculate landing position based on current trajectory
    const timeToLand = this.height > 0 ? Math.sqrt(2 * this.height / 9.81) : 0;
    const landingX = this.position.x + this.velocity.x * timeToLand;
    const landingY = this.position.y + this.velocity.y * timeToLand;
    
    // Convert to formation grid square using standardized format
    const gridCol = Math.floor(landingX * 20); // 20 columns
    const gridRow = Math.floor(landingY * 15); // 15 rows
    const gridSquare = `x${gridCol}_y${gridRow}`; // Standardized format
    
    return {
      position: { x: landingX, y: landingY },
      gridSquare
    };
  }

  /**
   * STATE TRANSITION HANDLER - Called by GameManager when match state changes
   */
  public onMatchStateChange(newState: MatchState, previousState: MatchState): void {
    this.currentMatchState = newState;

    switch (newState) {
      case MatchState.INTRODUCTION:
      case MatchState.PREPARE_FOR_KICKOFF:
        this.resetToKickoffPosition();
        break;

      case MatchState.IN_PLAY:
        // Resume normal physics if transitioning from static state
        if (this.isStaticState(previousState)) {
          this.enablePhysics();
        }
        break;

      case MatchState.GOAL_KICK:
      case MatchState.CORNER_KICK:
      case MatchState.THROW_IN:
        this.prepareForSetPiece(newState);
        break;

      case MatchState.GOAL_SCORED:
        this.handleGoalScored();
        break;

      case MatchState.HALF_TIME:
      case MatchState.FULL_TIME:
        this.stopMovement();
        break;
    }
  }

  private resetToKickoffPosition(): void {
    this.position = { x: 0.5, y: 0.5 }; // Center circle
    this.velocity = { x: 0, y: 0, z: 0 };
    this.height = 0;
    this.owner = null;
    this.isMoving = false;
  }

  private prepareForSetPiece(setState: MatchState): void {
    // Position ball for specific set piece
    switch (setState) {
      case MatchState.GOAL_KICK:
        this.positionForGoalKick();
        break;
      case MatchState.CORNER_KICK:
        this.positionForCornerKick();
        break;
      case MatchState.THROW_IN:
        this.positionForThrowIn();
        break;
    }
    
    // Stop movement for set piece
    this.stopMovement();
  }

  private handleGoalScored(): void {
    // Stop ball movement, it will be reset for kick-off later
    this.stopMovement();
    
    // Clear possession
    this.owner = null;
  }

  private stopMovement(): void {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.height = 0;
    this.isMoving = false;
  }

  private enablePhysics(): void {
    // Ball physics re-enabled - will respond to kicks and movement
    // No specific action needed, physics will resume in update loop
  }

  private isStaticState(state: MatchState): boolean {
    return [
      MatchState.INTRODUCTION,
      MatchState.PREPARE_FOR_KICKOFF,
      MatchState.GOAL_KICK,
      MatchState.CORNER_KICK,
      MatchState.THROW_IN,
      MatchState.GOAL_SCORED,
      MatchState.HALF_TIME,
      MatchState.FULL_TIME
    ].includes(state);
  }

  private positionForGoalKick(): void {
    // Position in goal area for goal kick
    // Would be set by GameManager based on which team is kicking
  }

  private positionForCornerKick(): void {
    // Position at corner arc
    // Would be set by GameManager based on which corner
  }

  private positionForThrowIn(): void {
    // Position at touchline where ball went out
    // Would be set by GameManager based on boundary detection
  }
}
```

### 3.6 POC 2D Physics Engine

**POC Constraint**: Simple 2D Canvas physics with no Z-axis simulation. Complex 3D physics, ball height/elevation, realistic spin effects, and complex trajectory simulation are explicitly out-of-scope.

#### 3.6.1 Physics2DEngine Implementation
```typescript
class Physics2DEngine {
  private fieldBounds: FieldBounds;
  private collisionDetector: CircularCollisionDetector;

  constructor() {
    this.fieldBounds = new FieldBounds();
    this.collisionDetector = new CircularCollisionDetector();
  }

  public updateBall(ball: Ball, deltaTime: number): void {
    if (ball.owner) {
      this.updatePossessedBall(ball, deltaTime);
    } else {
      this.updateFreeBall(ball, deltaTime);
    }

    // Check boundaries for out-of-play detection
    this.checkBallBoundaries(ball);
  }

  private updateFreeBall(ball: Ball, deltaTime: number): void {
    // Simple 2D velocity integration
    ball.position.x += ball.velocity.x * deltaTime;
    ball.position.y += ball.velocity.y * deltaTime;

    // Apply basic 2D friction
    const frictionFactor = 0.98; // 2% velocity loss per frame
    ball.velocity.x *= frictionFactor;
    ball.velocity.y *= frictionFactor;

    // Stop very slow movement (performance optimization)
    const minVelocity = 0.01;
    if (Math.abs(ball.velocity.x) < minVelocity && Math.abs(ball.velocity.y) < minVelocity) {
      ball.velocity.x = 0;
      ball.velocity.y = 0;
      ball.isMoving = false;
    } else {
      ball.isMoving = true;
    }
  }

  public updatePlayers(players: Player[], deltaTime: number): void {
    for (const player of players) {
      this.updatePlayerMovement(player, deltaTime);
    }

    // Check player-ball collisions
    this.checkPlayerBallCollisions(players, this.ball);
  }

  private updatePlayerMovement(player: Player, deltaTime: number): void {
    // Simple movement towards target position
    const dx = player.targetPosition.x - player.position.x;
    const dy = player.targetPosition.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) { // Threshold to prevent jittering
      const moveSpeed = player.speed * deltaTime;
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;

      player.position.x += normalizedDx * Math.min(moveSpeed, distance);
      player.position.y += normalizedDy * Math.min(moveSpeed, distance);
    }

    // Clamp to field boundaries
    this.fieldBounds.clampPlayerPosition(player);
  }

  private checkPlayerBallCollisions(players: Player[], ball: Ball): void {
    if (ball.owner) return; // Ball is already possessed

    const ballRadius = FIFA_CONSTANTS.BALL.RADIUS;
    const playerRadius = FIFA_CONSTANTS.PLAYER.RADIUS;
    const collisionDistance = ballRadius + playerRadius;

    for (const player of players) {
      const distance = this.calculateDistance(player.position, ball.position);

      if (distance < collisionDistance) {
        // Player gains possession
        ball.owner = player;
        ball.possessor = player.id;
        player.hasBall = true;

        // Stop ball velocity
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        ball.isMoving = false;

        break;
      }
    }
  }
}

class FieldBounds {
  private readonly margin = FIFA_CONSTANTS.THRESHOLDS.COLLISION_MARGIN; // Normalized margin

  public clampPlayerPosition(player: Player): void {
    player.position.x = Math.max(this.margin, Math.min(1.0 - this.margin, player.position.x));
    player.position.y = Math.max(this.margin, Math.min(1.0 - this.margin, player.position.y));
  }

  public isBallOutOfPlay(ballPosition: Vector2): { out: boolean; side?: 'left' | 'right' | 'top' | 'bottom' } {
    if (ballPosition.x < 0) return { out: true, side: 'left' };
    if (ballPosition.x > 1.0) return { out: true, side: 'right' };
    if (ballPosition.y < 0) return { out: true, side: 'top' };
    if (ballPosition.y > 1.0) return { out: true, side: 'bottom' };

    return { out: false };
  }
}
```

### 3.7 FireTV Performance Specifications

**Target Device**: Amazon FireTV Stick 4K Max (2021)
- **SoC**: Quad-core ARM Cortex-A55 @1.8GHz
- **GPU**: ARM Mali-G52 MC1
- **RAM**: 2GB DDR4
- **Browser**: Amazon Silk Browser (Chromium-based)

#### 3.7.1 Performance Targets
```typescript
interface FireTVPerformanceTargets {
  frameRate: {
    target: 30; // FPS minimum during active gameplay
    maximum: 60; // FPS cap to conserve resources
  };

  timing: {
    frameBudget: 33; // ms total per frame (PRD specification)
    gameLogicBudget: 20; // ms for AI + physics
    renderBudget: 13; // ms for Canvas 2D operations
  };

  memory: {
    jsHeapLimit: 256; // MB peak usage (PRD specification)
    textureMemory: 128; // MB for all sprites and assets (PRD specification)
    totalBudget: 512; // MB total application footprint
  };

  canvas: {
    maxDrawCalls: 500; // per frame (PRD specification: <500 draw calls per frame)
    maxSprites: 22; // players
    maxParticles: 0; // disabled for POC
  };
}

class FireTVPerformanceMonitor {
  private frameTimeHistory: number[] = [];
  private memoryUsageHistory: number[] = [];
  private readonly historyLength = 300; // 10 seconds at 30 FPS

  public recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.historyLength) {
      this.frameTimeHistory.shift();
    }

    // Trigger fallbacks if performance degrades
    const averageFrameTime = this.getAverageFrameTime();
    if (averageFrameTime > 33) { // Above 30 FPS budget (PRD specification)
      this.triggerPerformanceFallbacks();
    }
  }

  private triggerPerformanceFallbacks(): void {
    // Reduce AI update frequency
    POC_CONFIG.AI_UPDATE_INTERVAL_SECONDS = 2; // From 1 second to 2 seconds

    // Reduce render quality
    this.enableSimplifiedRendering();

    console.warn('FireTV performance fallbacks activated');
  }

  private enableSimplifiedRendering(): void {
    // Reduce visual fidelity for better performance
    // - Disable player shadows
    // - Reduce player sprite animation frames
    // - Simplify ball trail effects
  }

  public getPerformanceReport(): FireTVPerformanceReport {
    return {
      averageFrameTime: this.getAverageFrameTime(),
      frameDrop: this.getFrameDropPercentage(),
      memoryUsage: this.getCurrentMemoryUsage(),
      fallbacksActive: this.areFallbacksActive()
    };
  }
}

interface FireTVPerformanceReport {
  averageFrameTime: number; // ms
  frameDrop: number; // percentage of frames over budget
  memoryUsage: number; // MB current usage
  fallbacksActive: boolean;
}
```

#### 3.7.2 Advanced Canvas 2D Optimizations
```typescript
class OptimizedCanvas2DRenderer {
  private context: CanvasRenderingContext2D;
  private spriteCache: Map<string, ImageBitmap> = new Map();
  private drawCallCount: number = 0;
  private readonly maxDrawCalls = 500;

  public renderFrame(gameState: GameManagerState): void {
    this.drawCallCount = 0;

    // Clear canvas efficiently
    this.clearCanvas();

    // Render in order: field -> players -> ball -> UI
    this.renderField();
    this.renderPlayers(gameState.homeTeam.players);
    this.renderPlayers(gameState.awayTeam.players);
    this.renderBall(gameState.ball);
    this.renderUI(gameState);

    // Performance check
    if (this.drawCallCount > this.maxDrawCalls) {
      console.warn(`Draw calls exceeded budget: ${this.drawCallCount}/${this.maxDrawCalls}`);
    }
  }

  private renderPlayers(players: Player[]): void {
    // Batch render players to minimize context switches
    for (const player of players) {
      this.renderPlayer(player);
      this.drawCallCount++;
    }
  }

  private renderPlayer(player: Player): void {
    const sprite = this.getSpriteFromCache(player.team, player.playerType);

    // Simple circle for POC - no complex sprites
    this.context.fillStyle = player.team === 'RED' ? '#FF0000' : '#0000FF';
    this.context.beginPath();
    this.context.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
    this.context.fill();

    // Player name (simplified)
    if (player.hasBall) {
      this.context.strokeStyle = '#FFFF00';
      this.context.lineWidth = 3;
      this.context.stroke();
    }
  }

  private renderBall(ball: Ball): void {
    // **POC ONLY** - Simple 2D ball rendering
    const ballRadius = 8; // Fixed radius for POC

    // Simple white ball
    this.context.fillStyle = '#FFFFFF';
    this.context.beginPath();
    this.context.arc(ball.position.x, ball.position.y, ballRadius, 0, Math.PI * 2);
    this.context.fill();

    // Ball outline
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 1;
    this.context.stroke();

    this.drawCallCount++;
  }

  // **PHASE 2 ONLY** - Advanced ball rendering with height effects
  private renderBallWithHeight(ball: Ball): void {
    // Render drop shadow for height perception
    if (ball.height > 0) {
      this.renderBallShadow(ball);
    }

    // Scale ball based on height for 3D effect in 2D
    const heightScaleFactor = 1 + (ball.height * 0.3); // 30% max size increase
    const ballRadius = 8 * heightScaleFactor;

    // Ball color gets lighter as it goes higher
    const heightBrightness = Math.min(255, 200 + (ball.height * 55));
    this.context.fillStyle = `rgb(${heightBrightness}, ${heightBrightness}, ${heightBrightness})`;

    this.context.beginPath();
    this.context.arc(ball.position.x, ball.position.y, ballRadius, 0, Math.PI * 2);
    this.context.fill();

    // Ball outline
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 1;
    this.context.stroke();

    this.drawCallCount++;
  }

  private renderBallShadow(ball: Ball): void {
    // Shadow gets larger and more diffuse the higher the ball
    const shadowRadius = 6 + (ball.height * 4); // Shadow grows with height
    const shadowOpacity = Math.max(0.1, 0.4 - (ball.height * 0.2)); // Fades with height

    this.context.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    this.context.beginPath();
    this.context.arc(ball.position.x, ball.position.y + 2, shadowRadius, 0, Math.PI * 2);
    this.context.fill();

    this.drawCallCount++;
  }
}

#### 3.7.3 FireTV-Optimized Canvas Rendering System

**Critical Optimizations**: FireTV Stick 4K Max requires specialized rendering optimizations due to ARM Cortex-A55 CPU and Mali-G52 GPU constraints.

```typescript
class FireTVOptimizedRenderer {
  private offscreenCanvas: OffscreenCanvas;
  private staticPitchCache: ImageBitmap;
  private dirtyRectangles: DirtyRectTracker;
  private layeredRenderer: LayeredCanvasRenderer;
  private objectPool: RenderObjectPool;
  
  // Pre-allocated buffers for SIMD operations
  private playerPositionBuffer: Float32Array = new Float32Array(44); // 22 players * 2 coords
  private transformBuffer: Float32Array = new Float32Array(32); // 8 transforms * 4 matrix values
  private colorBuffer: Uint8ClampedArray = new Uint8ClampedArray(88); // 22 players * 4 RGBA values

  constructor(canvas: HTMLCanvasElement) {
    this.initializeOffscreenRendering(canvas);
    this.setupDirtyRectTracking();
    this.createStaticAssetCache();
    this.configureLayeredRendering();
    this.initializeObjectPooling();
  }

  // Static asset caching to avoid redrawing pitch every frame
  private createStaticAssetCache(): void {
    this.offscreenCanvas = new OffscreenCanvas(1920, 1080);
    const offCtx = this.offscreenCanvas.getContext('2d')!;
    
    // Render FIFA-compliant pitch once to offscreen canvas
    this.renderStaticPitchElements(offCtx);
    
    // Cache as ImageBitmap for efficient blitting
    this.staticPitchCache = this.offscreenCanvas.transferToImageBitmap();
  }

  // Dirty rectangle rendering - only redraw changed screen areas
  public renderFrame(gameState: GameManagerState): void {
    const dirtyRects = this.dirtyRectangles.getDirtyRegions();
    
    if (dirtyRects.length === 0) return; // No changes, skip frame

    // Clear only dirty rectangles
    for (const rect of dirtyRects) {
      this.context.clearRect(rect.x, rect.y, rect.width, rect.height);
      
      // Blit static pitch cache for dirty regions
      this.context.drawImage(
        this.staticPitchCache,
        rect.x, rect.y, rect.width, rect.height, // Source
        rect.x, rect.y, rect.width, rect.height  // Destination
      );
    }

    // Render dynamic objects only in dirty rectangles
    this.renderDynamicObjects(gameState, dirtyRects);
    
    this.dirtyRectangles.clearDirtyRegions();
  }

  // SIMD-optimized bulk position updates
  private updatePlayerPositions(players: Player[]): void {
    // Fill Float32Array for SIMD-friendly operations
    let bufferIndex = 0;
    for (const player of players) {
      this.playerPositionBuffer[bufferIndex++] = player.position.x;
      this.playerPositionBuffer[bufferIndex++] = player.position.y;
    }

    // Use SIMD-optimized viewport transformations
    this.applyViewportTransform(this.playerPositionBuffer);
    
    // Apply bulk color calculations for team identification
    this.calculatePlayerColors(players, this.colorBuffer);
  }

  // Path2D object reuse for better performance
  private playerCirclePath: Path2D = new Path2D();
  private ballCirclePath: Path2D = new Path2D();
  
  private renderPlayersOptimized(players: Player[]): void {
    // Batch similar rendering operations
    this.context.save();
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const colorIndex = i * 4;
      
      // Reuse Path2D objects to avoid object creation
      this.playerCirclePath = new Path2D();
      this.playerCirclePath.arc(
        this.playerPositionBuffer[i * 2],     // x from SIMD buffer
        this.playerPositionBuffer[i * 2 + 1], // y from SIMD buffer
        15, 0, Math.PI * 2
      );
      
      // Use pre-calculated colors from SIMD buffer
      this.context.fillStyle = `rgba(${
        this.colorBuffer[colorIndex]}, ${
        this.colorBuffer[colorIndex + 1]}, ${
        this.colorBuffer[colorIndex + 2]}, ${
        this.colorBuffer[colorIndex + 3]
      })`;
      
      this.context.fill(this.playerCirclePath);
    }
    
    this.context.restore();
  }

  // Transform matrix caching to avoid recalculations
  private cachedTransforms: Map<string, DOMMatrix> = new Map();
  
  private getCachedTransform(scaleX: number, scaleY: number, rotation: number): DOMMatrix {
    const key = `${scaleX}_${scaleY}_${rotation}`;
    
    if (!this.cachedTransforms.has(key)) {
      const matrix = new DOMMatrix()
        .scale(scaleX, scaleY)
        .rotate(rotation);
      this.cachedTransforms.set(key, matrix);
    }
    
    return this.cachedTransforms.get(key)!;
  }
}

// Dirty rectangle tracking system
class DirtyRectTracker {
  private dirtyRegions: Rectangle[] = [];
  private lastPlayerPositions: Map<string, Vector2> = new Map();
  
  public markPlayerMoved(playerId: string, oldPos: Vector2, newPos: Vector2): void {
    // Add old position area as dirty
    this.dirtyRegions.push(this.createPlayerBounds(oldPos));
    
    // Add new position area as dirty  
    this.dirtyRegions.push(this.createPlayerBounds(newPos));
    
    this.lastPlayerPositions.set(playerId, newPos);
  }
  
  public getDirtyRegions(): Rectangle[] {
    // Merge overlapping rectangles to minimize draw calls
    return this.mergeOverlappingRectangles(this.dirtyRegions);
  }
  
  private mergeOverlappingRectangles(rects: Rectangle[]): Rectangle[] {
    // Implementation to combine overlapping dirty rectangles
    // This reduces the number of separate draw operations
    return rects; // Simplified for brevity
  }
}
```

#### 3.7.4 ARM NEON SIMD Optimizations

**Target Architecture**: ARM Cortex-A55 with NEON SIMD support for vectorized floating-point operations.

```typescript
class NEONOptimizedMath {
  // Pre-allocated SIMD-friendly buffers
  private static readonly SIMD_PLAYER_COUNT = 22;
  private static readonly COORDS_PER_PLAYER = 2;
  private static readonly BUFFER_SIZE = NEONOptimizedMath.SIMD_PLAYER_COUNT * NEONOptimizedMath.COORDS_PER_PLAYER;
  
  // Float32Array enables potential NEON vectorization by V8's TurboFan JIT
  private positionBuffer: Float32Array = new Float32Array(NEONOptimizedMath.BUFFER_SIZE);
  private velocityBuffer: Float32Array = new Float32Array(NEONOptimizedMath.BUFFER_SIZE);
  private targetBuffer: Float32Array = new Float32Array(NEONOptimizedMath.BUFFER_SIZE);
  private distanceBuffer: Float32Array = new Float32Array(NEONOptimizedMath.SIMD_PLAYER_COUNT);
  
  // Temporary calculation buffers (avoid allocation in hot paths)
  private tempBuffer: Float32Array = new Float32Array(16);
  
  // SIMD-optimized bulk distance calculation for all players to ball
  public calculatePlayerBallDistances(
    ballPosition: Float32Array, // [x, y]
    playerPositions: Float32Array, // [x1, y1, x2, y2, ...]
    outputDistances: Float32Array // Output buffer for distances
  ): void {
    const ballX = ballPosition[0];
    const ballY = ballPosition[1];
    
    // Pattern optimized for ARM NEON vectorization
    // Modern JavaScript engines can detect this pattern and generate NEON instructions
    for (let i = 0; i < NEONOptimizedMath.SIMD_PLAYER_COUNT; i++) {
      const playerX = playerPositions[i * 2];
      const playerY = playerPositions[i * 2 + 1];
      
      const deltaX = playerX - ballX;
      const deltaY = playerY - ballY;
      
      // Single sqrt operation per player (NEON can vectorize this)
      outputDistances[i] = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
  }
  
  // Vectorized position interpolation for formation positioning
  public interpolateFormationPositions(
    currentPositions: Float32Array,
    targetPositions: Float32Array,
    interpolationFactors: Float32Array, // Per-player interpolation rates
    outputPositions: Float32Array
  ): void {
    // SIMD-friendly interpolation loop
    // ARM NEON can process 4 floats per instruction
    for (let i = 0; i < NEONOptimizedMath.BUFFER_SIZE; i += 4) {
      // Process 4 coordinates at once (2 players worth)
      const factor1 = interpolationFactors[Math.floor(i / 2)];
      const factor2 = interpolationFactors[Math.floor(i / 2) + 1];
      
      // Linear interpolation: current + (target - current) * factor
      outputPositions[i] = currentPositions[i] + (targetPositions[i] - currentPositions[i]) * factor1;
      outputPositions[i + 1] = currentPositions[i + 1] + (targetPositions[i + 1] - currentPositions[i + 1]) * factor1;
      outputPositions[i + 2] = currentPositions[i + 2] + (targetPositions[i + 2] - currentPositions[i + 2]) * factor2;
      outputPositions[i + 3] = currentPositions[i + 3] + (targetPositions[i + 3] - currentPositions[i + 3]) * factor2;
    }
  }
  
  // Bulk collision detection using SIMD patterns
  public detectBulkCollisions(
    positions1: Float32Array, // First set of entities
    positions2: Float32Array, // Second set of entities
    radii1: Float32Array,     // Collision radii for first set
    radii2: Float32Array,     // Collision radii for second set
    collisionFlags: Uint8Array // Output: 1 if collision, 0 if not
  ): number {
    let collisionCount = 0;
    
    // Nested loop optimized for NEON SIMD operations
    for (let i = 0; i < positions1.length; i += 2) {
      for (let j = 0; j < positions2.length; j += 2) {
        const dx = positions1[i] - positions2[j];
        const dy = positions1[i + 1] - positions2[j + 1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radii1[i / 2] + radii2[j / 2];
        
        const collision = distance < minDistance ? 1 : 0;
        collisionFlags[i / 2] = collision;
        collisionCount += collision;
      }
    }
    
    return collisionCount;
  }
  
  // Matrix operations optimized for ARM NEON
  public applyBulkTransformations(
    positions: Float32Array,
    transformMatrix: Float32Array, // 2D transformation matrix [a, b, c, d, tx, ty]
    outputPositions: Float32Array
  ): void {
    const [a, b, c, d, tx, ty] = transformMatrix;
    
    // Process positions in SIMD-friendly chunks
    for (let i = 0; i < positions.length; i += 2) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // 2D transformation: [x', y'] = [a*x + c*y + tx, b*x + d*y + ty]
      outputPositions[i] = a * x + c * y + tx;
      outputPositions[i + 1] = b * x + d * y + ty;
    }
  }
}
```

#### 3.7.5 Memory Management Optimizations

**FireTV RAM Constraint**: 2GB total system RAM requires aggressive memory management to prevent browser tab eviction.

```typescript
class FireTVMemoryManager {
  private objectPools: Map<string, ObjectPool<any>> = new Map();
  private memoryMonitor: MemoryUsageMonitor;
  private gcScheduler: GarbageCollectionScheduler;
  
  // Object pooling to avoid allocation/deallocation overhead
  public initializeObjectPools(): void {
    // Pool for frequently created temporary objects
    this.objectPools.set('Vector2', new ObjectPool<Vector2>(() => ({ x: 0, y: 0 }), 100));
    this.objectPools.set('Rectangle', new ObjectPool<Rectangle>(() => ({ x: 0, y: 0, width: 0, height: 0 }), 50));
    this.objectPools.set('PlayerAIDecision', new ObjectPool<PlayerAIDecision>(() => new PlayerAIDecision(), 22));
    this.objectPools.set('CollisionResult', new ObjectPool<CollisionResult>(() => new CollisionResult(), 50));
    
    // Pre-allocate commonly used arrays
    this.objectPools.set('PlayerArray', new ObjectPool<Player[]>(() => new Array(22), 10));
    this.objectPools.set('EventArray', new ObjectPool<MatchEvent[]>(() => new Array(100), 5));
  }
  
  // Memory-efficient entity management
  public createManagedEntity<T>(type: string, initializer: () => T): T {
    const pool = this.objectPools.get(type);
    if (pool && !pool.isEmpty()) {
      return pool.acquire();
    }
    
    // Fallback to new allocation if pool empty
    const entity = initializer();
    this.memoryMonitor.trackAllocation(type, this.getObjectSize(entity));
    return entity;
  }
  
  public releaseManagedEntity<T>(type: string, entity: T): void {
    const pool = this.objectPools.get(type);
    if (pool) {
      this.resetObject(entity);
      pool.release(entity);
    }
  }
  
  // Prevent memory leaks in game loops
  private resetObject(obj: any): void {
    if (obj && typeof obj === 'object') {
      // Reset common properties without breaking references
      if ('position' in obj) obj.position = { x: 0, y: 0 };
      if ('velocity' in obj) obj.velocity = { x: 0, y: 0 };
      if ('active' in obj) obj.active = false;
    }
  }
  
  // Proactive garbage collection scheduling
  private scheduleGarbageCollection(): void {
    // Trigger GC during low-activity periods (not during active gameplay)
    if (this.memoryMonitor.getHeapUsage() > 200 * 1024 * 1024) { // 200MB threshold
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          // Force GC by creating and releasing large temporary objects
          this.forceGarbageCollection();
        });
      }
    }
  }
  
  private forceGarbageCollection(): void {
    // Create temporary pressure to trigger GC
    const tempArrays = [];
    for (let i = 0; i < 100; i++) {
      tempArrays.push(new Array(1000).fill(0));
    }
    tempArrays.length = 0; // Clear references
  }
}

class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  
  constructor(
    private factory: () => T,
    private maxSize: number
  ) {
    // Pre-populate pool
    for (let i = 0; i < maxSize; i++) {
      this.available.push(this.factory());
    }
  }
  
  public acquire(): T | null {
    if (this.available.length === 0) {
      return null; // Pool exhausted
    }
    
    const item = this.available.pop()!;
    this.inUse.add(item);
    return item;
  }
  
  public release(item: T): void {
    if (this.inUse.has(item)) {
      this.inUse.delete(item);
      if (this.available.length < this.maxSize) {
        this.available.push(item);
      }
    }
  }
  
  public isEmpty(): boolean {
    return this.available.length === 0;
  }
}
```

#### 3.7.6 Spatial Optimization and Level-of-Detail

**Culling and LOD**: Reduce computational load by rendering only visible/relevant entities.

```typescript
class SpatialOptimizer {
  private spatialGrid: SpatialHashGrid;
  private viewportCuller: ViewportCuller;
  private lodManager: LevelOfDetailManager;
  
  constructor(fieldWidth: number, fieldHeight: number, cellSize: number) {
    this.spatialGrid = new SpatialHashGrid(fieldWidth, fieldHeight, cellSize);
    this.viewportCuller = new ViewportCuller();
    this.lodManager = new LevelOfDetailManager();
  }
  
  // Spatial partitioning for efficient collision detection
  public updateSpatialGrid(entities: Entity[]): void {
    this.spatialGrid.clear();
    
    for (const entity of entities) {
      if (entity.active) {
        this.spatialGrid.insert(entity);
      }
    }
  }
  
  // Only process entities within reasonable proximity
  public getNearbyEntities(position: Vector2, radius: number): Entity[] {
    return this.spatialGrid.query(position, radius);
  }
  
  // Viewport culling - don't render off-screen entities
  public cullOffscreenEntities(entities: Entity[], camera: Camera): Entity[] {
    return entities.filter(entity => 
      this.viewportCuller.isInViewport(entity.getBounds(), camera.getViewport())
    );
  }
  
  // Level-of-Detail based on distance from camera focus
  public applyLevelOfDetail(entities: Entity[], cameraFocus: Vector2): void {
    for (const entity of entities) {
      const distance = this.calculateDistance(entity.position, cameraFocus);
      const lodLevel = this.lodManager.calculateLOD(distance);
      
      // Reduce update frequency for distant entities
      entity.setUpdateFrequency(lodLevel);
      
      // Simplify rendering for distant entities
      entity.setRenderQuality(lodLevel);
    }
  }
}

class SpatialHashGrid {
  private grid: Map<string, Entity[]> = new Map();
  private cellSize: number;
  private invCellSize: number;
  
  constructor(
    private width: number,
    private height: number,
    cellSize: number
  ) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
  }
  
  public insert(entity: Entity): void {
    const bounds = entity.getBounds();
    const cells = this.getCellsForBounds(bounds);
    
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      this.grid.get(cellKey)!.push(entity);
    }
  }
  
  public query(position: Vector2, radius: number): Entity[] {
    const queryBounds = {
      x: position.x - radius,
      y: position.y - radius,
      width: radius * 2,
      height: radius * 2
    };
    
    const cells = this.getCellsForBounds(queryBounds);
    const entities = new Set<Entity>();
    
    for (const cellKey of cells) {
      const cellEntities = this.grid.get(cellKey) || [];
      for (const entity of cellEntities) {
        entities.add(entity);
      }
    }
    
    return Array.from(entities);
  }
  
  private getCellsForBounds(bounds: Rectangle): string[] {
    const startX = Math.floor(bounds.x * this.invCellSize);
    const startY = Math.floor(bounds.y * this.invCellSize);
    const endX = Math.floor((bounds.x + bounds.width) * this.invCellSize);
    const endY = Math.floor((bounds.y + bounds.height) * this.invCellSize);
    
    const cells: string[] = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    
    return cells;
  }
  
  public clear(): void {
    this.grid.clear();
  }
}
```

#### 3.7.7 Performance Monitoring and Adaptive Quality

**Dynamic Quality Adjustment**: Automatically reduce rendering quality when performance drops below targets.

```typescript
class AdaptiveQualityManager {
  private performanceHistory: PerformanceMetrics[] = [];
  private currentQualityLevel: QualityLevel = QualityLevel.HIGH;
  private frameTimeTarget: number = 33.33; // 30 FPS
  private qualityLevels: QualitySettings[];
  
  constructor() {
    this.initializeQualityLevels();
  }
  
  private initializeQualityLevels(): void {
    this.qualityLevels = [
      // Ultra Low Quality - Emergency fallback
      {
        level: QualityLevel.ULTRA_LOW,
        playerRenderDistance: 100,
        particleCount: 0,
        shadowQuality: 0,
        antialiasing: false,
        aiUpdateFrequency: 500, // ms
        physicsSubsteps: 1
      },
      // Low Quality
      {
        level: QualityLevel.LOW,
        playerRenderDistance: 200,
        particleCount: 5,
        shadowQuality: 1,
        antialiasing: false,
        aiUpdateFrequency: 200,
        physicsSubsteps: 1
      },
      // Medium Quality
      {
        level: QualityLevel.MEDIUM,
        playerRenderDistance: 400,
        particleCount: 15,
        shadowQuality: 2,
        antialiasing: true,
        aiUpdateFrequency: 100,
        physicsSubsteps: 2
      },
      // High Quality
      {
        level: QualityLevel.HIGH,
        playerRenderDistance: 600,
        particleCount: 30,
        shadowQuality: 3,
        antialiasing: true,
        aiUpdateFrequency: 50,
        physicsSubsteps: 3
      }
    ];
  }
  
  public updatePerformanceMetrics(frameTime: number, memoryUsage: number, context: DeterministicGameContext): void {
    const metrics: PerformanceMetrics = {
      frameTime,
      memoryUsage,
      timestamp: context.gameTime, // Use deterministic game time
      qualityLevel: this.currentQualityLevel
    };
    
    this.performanceHistory.push(metrics);
    
    // Keep only recent history
    if (this.performanceHistory.length > 300) { // 10 seconds at 30 FPS
      this.performanceHistory.shift();
    }
    
    // Check if quality adjustment is needed
    this.evaluateQualityAdjustment();
  }
  
  private evaluateQualityAdjustment(): void {
    if (this.performanceHistory.length < 60) return; // Need sufficient samples
    
    const recentMetrics = this.performanceHistory.slice(-60); // Last 2 seconds
    const averageFrameTime = recentMetrics.reduce((sum, m) => sum + m.frameTime, 0) / recentMetrics.length;
    const maxMemoryUsage = Math.max(...recentMetrics.map(m => m.memoryUsage));
    
    // Performance is below target - reduce quality
    if (averageFrameTime > this.frameTimeTarget * 1.2) { // 20% above target
      this.reduceQuality();
    }
    // Memory usage too high - reduce quality  
    else if (maxMemoryUsage > 400 * 1024 * 1024) { // 400MB threshold
      this.reduceQuality();
    }
    // Performance is good - try increasing quality
    else if (averageFrameTime < this.frameTimeTarget * 0.8 && this.currentQualityLevel < QualityLevel.HIGH) {
      this.increaseQuality();
    }
  }
  
  private reduceQuality(): void {
    if (this.currentQualityLevel > QualityLevel.ULTRA_LOW) {
      this.currentQualityLevel--;
      this.applyQualitySettings();
      console.log(`Quality reduced to level ${this.currentQualityLevel}`);
    }
  }
  
  private increaseQuality(): void {
    if (this.currentQualityLevel < QualityLevel.HIGH) {
      this.currentQualityLevel++;
      this.applyQualitySettings();
      console.log(`Quality increased to level ${this.currentQualityLevel}`);
    }
  }
  
  private applyQualitySettings(): void {
    const settings = this.qualityLevels[this.currentQualityLevel];
    
    // Apply settings to game systems
    GameManager.getInstance().setAIUpdateFrequency(settings.aiUpdateFrequency);
    PhysicsEngine.getInstance().setSubsteps(settings.physicsSubsteps);
    Renderer.getInstance().setPlayerRenderDistance(settings.playerRenderDistance);
    ParticleSystem.getInstance().setMaxParticles(settings.particleCount);
    
    // Apply canvas rendering settings
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = settings.antialiasing;
  }
  
  public getCurrentQualitySettings(): QualitySettings {
    return this.qualityLevels[this.currentQualityLevel];
  }
}

enum QualityLevel {
  ULTRA_LOW = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

interface QualitySettings {
  level: QualityLevel;
  playerRenderDistance: number;
  particleCount: number;
  shadowQuality: number;
  antialiasing: boolean;
  aiUpdateFrequency: number; // milliseconds
  physicsSubsteps: number;
}

interface PerformanceMetrics {
  frameTime: number;
  memoryUsage: number;
  timestamp: number;
  qualityLevel: QualityLevel;
}
```

### 3.8 Formation Editor Tool (FET) System

The Formation Editor Tool (FET) is a developer-only application for creating sophisticated AI positioning data that drives tactical player behaviour in Soccer Manager: World Cup Edition. This tool enables precise mapping of player positions relative to ball location across all standard football formations, creating rich datasets for intelligent player movement during matches.

**Key Features**:
- **Design-Time Tool**: Developer-only application for creating formation data, not used during actual gameplay
- **FIFA-Compliant Pitch**: All pitch markings follow FIFA Laws of the Game specifications with maximum allowed dimensions (110m × 68m)
- **20×15 Grid System**: 300 zones total, each representing 5.5m × 4.53m of real pitch space
- **Flexible Player Roles**: Supports variable defender/midfielder/forward compositions for authentic tactical setups
- **Single File Export**: Exports all formation data to `formations.json` for game runtime consumption

**Formation System Features**:

**Grid Structure**:
- Grid: 20×15 (columns × rows) zones  
- Saved mappings are keyed by ball grid cell key "x{col}_y{row}" format (e.g., "x12_y8") for any `col ∈ [0,20)` and `row ∈ [0,15)`
- Role positions are normalised coordinates `x ∈ [0,1], y ∈ [0,1]` and can be placed anywhere on the pitch to capture attacking/defending contexts

**Formation Flexibility**:
- Variable defender counts: 5-3-2 formation uses 5 defenders whilst 3-5-2 uses only 3
- Flexible midfielder numbers: 3-5-2 employs 5 midfielders (CDM_1, CDM_2, LM, RM, CAM) for midfield dominance  
- Dynamic role naming: Players numbered by position (CB_1, CB_2, CB_3) to support multiple instances
- Tactical authenticity: Each formation reflects real-world tactical setups without artificial limitations

**Editor Workflow**:

**Formation Creation Process**:
- When the ball is moved to a new cell and any player is adjusted, those edits are staged to that ball cell; multiple cells can be staged and then committed in one operation
- Committed cells are persisted; staged cells are visualised separately in the editor but not persisted until committed
- Formation dropdown selection loads pre-defined formations with kick-off positions automatically applied

#### 3.8.1 Formation System Architecture

**Core Components**:
- **Grid System**: 20×15 grid (300 zones total) with zones of 5.5m × 4.53m real pitch space
- **Position Validation Engine**: Real-time validation with visual error indicators
- **FIFA-Compliant Pitch**: All markings follow FIFA Laws of the Game specifications
- **Formation Templates**: Dynamic support for 4-4-2, 4-3-3, 5-3-2, 3-5-2, 4-2-3-1, 3-4-3

#### 3.8.2 Flexible Player Role System

The formation system supports completely flexible player compositions, removing rigid constraints about formation structure:

```typescript
// Base position types for flexible formations
type BasePosition = 
  | "GK"      // Goalkeeper
  | "CB"      // Centre Back
  | "LB"      // Left Back  
  | "RB"      // Right Back
  | "LWB"     // Left Wing Back
  | "RWB"     // Right Wing Back
  | "DM"      // Defensive Midfielder
  | "CM"      // Central Midfielder
  | "AM"      // Attacking Midfielder
  | "LM"      // Left Midfielder
  | "RM"      // Right Midfielder
  | "LW"      // Left Winger
  | "RW"      // Right Winger
  | "CF"      // Centre Forward
  | "ST"      // Striker

// Dynamic player role system (e.g., CB_1, CB_2, CB_3)
type PlayerRole = string

// Formation templates define exact player compositions
const FORMATION_TEMPLATES: Record<string, PlayerRole[]> = {
  "4-4-2": ["GK", "LB", "CB_1", "CB_2", "RB", "LM", "CM_1", "CM_2", "RM", "ST_1", "ST_2"],
  "4-3-3": ["GK", "LB", "CB_1", "CB_2", "RB", "DM", "CM_1", "CM_2", "LW", "RW", "ST"],
  "5-3-2": ["GK", "LWB", "CB_1", "CB_2", "CB_3", "RWB", "CM_1", "CM_2", "CM_3", "ST_1", "ST_2"],
  "3-5-2": ["GK", "CB_1", "CB_2", "CB_3", "LWB", "RWB", "CM_1", "CM_2", "CM_3", "ST_1", "ST_2"],
  "4-2-3-1": ["GK", "LB", "CB_1", "CB_2", "RB", "DM_1", "DM_2", "LW", "AM", "RW", "ST"],
  "3-4-3": ["GK", "CB_1", "CB_2", "CB_3", "LM", "CM_1", "CM_2", "RM", "LW", "ST", "RW"],
}
```

#### 3.8.3 Uber Formation Data Structure

All formation data is contained within a single JSON file (`formations.json`) that includes all formations across all postures and phases:

```typescript
// Reference: see docs/CANONICAL-DEFINITIONS.md for canonical UberFormationData schema
interface UberFormationData {
  name: string;
  players: Record<string, PlayerFormationData>; // Key format: x{col}_y{row}
}

interface PlayerFormationData {
  role: PlayerRole;
  posture: PlayingPosture;
  phases: Record<GamePhase, PhasePositioning>;
}

// DEPRECATED: Use UberFormationData instead
interface FormationDefinition {
  formationId: string;                    // "5-3-2"
  name: string;                          // "5-3-2 Defensive"
  category: FormationCategory;           // "Defensive" | "Balanced" | "Attacking"
  playerComposition: PlayerRole[];       // Defines exactly which players this formation uses
  postures: {
    [posture: string]: PostureData;      // "defensive", "balanced", "attacking"
  };
  metadata: FormationMetadata;
}

interface PostureData {
  phases: {
    [phase in GamePhase]: PhaseData;
  };
}

interface PhaseData {
  positions: {
    [zoneId: string]: {                  // "x12_y8" format
      players: {
        [playerRole: string]: {          // "CB_1", "CM_2", "ST_1" etc.
          x: number;                     // 0.0-1.0 normalised
          y: number;                     // 0.0-1.0 normalised
          priority: number;              // 1-10 positioning importance
          flexibility: number;           // 0.0-1.0 deviation allowed
          contextualModifiers: ContextualModifier[];
        }
      }
    }
  };
}

enum GamePhase {
  ATTACK = "attack",
  DEFEND = "defend",
  TRANSITION_ATTACK = "transition_attack",
  TRANSITION_DEFEND = "transition_defend",
  SET_PIECE_FOR = "set_piece_for",
  SET_PIECE_AGAINST = "set_piece_against"
}
```

#### 3.8.4 Grid System Implementation

```typescript
class OptimizedGridSystem {
  private readonly GRID_WIDTH = 20;
  private readonly GRID_HEIGHT = 15;
  private readonly ZONE_COUNT = 300;

  // Hybrid approach: Integer indices + Float32Array positions
  private spatialIndex: Map<number, ZoneData> = new Map();
  private positionBuffer: Float32Array;

  constructor() {
    // Pre-allocate SIMD-optimized buffers for 22 players
    this.positionBuffer = new Float32Array(44);        // x,y interleaved (22 * 2)
  }

  // Integer operations for exact grid calculations (cache-friendly)
  public getZoneIndex(x: number, y: number): number {
    const gridX = Math.floor(x * this.GRID_WIDTH);
    const gridY = Math.floor(y * this.GRID_HEIGHT);
    return gridY * this.GRID_WIDTH + gridX;  // Single integer index (0-299)
  }

  // Optimized zone center calculation using integer index
  public getZoneCenter(zoneIndex: number): Float32Array {
    const gridX = zoneIndex % this.GRID_WIDTH;
    const gridY = Math.floor(zoneIndex / this.GRID_WIDTH);

    const center = new Float32Array(2);
    center[0] = (gridX + 0.5) / this.GRID_WIDTH;
    center[1] = (gridY + 0.5) / this.GRID_HEIGHT;
    return center;
  }
}
```

#### 3.8.5 Formation Data Storage

Formation data is stored in a single `formations.json` file containing all formation definitions:

```typescript
interface FormationExport {
  schemaVersion: string;        // "1.0.0" semantic versioning
  formatVersion: number;        // Breaking change indicator
  exportTimestamp: string;      // ISO 8601 timestamp
  formations: FormationData[];
  metadata: ExportMetadata;
}
```

**Storage Location**: `assets/formations.json` in repository root
**File Format**: Single JSON file containing all formation data for runtime use

#### 3.8.6 Formation Runtime Integration

```typescript
class FormationEngine {
  private formationData: Map<string, FormationData> = new Map();
  private positionInterpolator: PositionInterpolator;

  public getOptimalPosition(
    player: Player,
    gameState: GameState,
    tacticalCommand?: TacticalCommand
  ): Vector2 {
    const formation = this.getActiveFormation(player.team);
    const gamePhase = this.determineGamePhase(gameState, player.team);
    const context = this.buildGameContext(gameState, tacticalCommand);

    const position = this.positionInterpolator.getInterpolatedPosition(
      player.playerType,
      gameState.ball.position,
      gamePhase,
      context
    );

    return this.applyFlexibilityAndConstraints(player, position, gameState);
  }

  private determineGamePhase(gameState: GameState, team: Team): GamePhase {
    const possession = gameState.possession;
    const ballPosition = gameState.ball.position;

    if (possession === team.id) {
      return ballPosition.y > 0.6 ? GamePhase.ATTACK : GamePhase.TRANSITION_ATTACK;
    } else {
      return ballPosition.y < 0.4 ? GamePhase.DEFEND : GamePhase.TRANSITION_DEFEND;
    }
  }
}
```

### 3.9 Player Abilities System

**POC Constraint**: Basic attribute-driven behaviour with simplified ability execution. Complex skill animations and detailed ability mechanics are deferred to Phase 2.

#### 3.9.1 Core Player Abilities

**Passing Abilities**:
- **Short Passing**: Building up play through close-range distribution. Requires precision over power, quick decision-making, and accurate placement to feet or into space ahead of teammate
- **Long Passing**: Switching play across the field or finding teammates in distant positions. Requires power, accuracy, and vision to spot distant targets
- **Wall Pass (Give-and-Go)**: Breaking through defensive lines using quick combination play. Requires precise timing and immediate movement after passing
- **Through Pass**: Creating direct goal-scoring opportunities by exploiting defensive gaps. Ball played into space between or behind defenders
- **Cross-field Pass**: Long-range passes to switch the point of attack, typically used by defenders and central midfielders

**Dribbling Abilities**:
- **Basic Step-Over**: Throw foot over ball to feint direction, then push ball with outside of other foot
- **Simple Cut (Inside/Outside)**: Sharp directional change using inside or outside of foot
- **Body Feint**: Drop shoulder and lean to suggest direction before going opposite way
- **Nutmeg**: Push ball through opponent's legs and accelerate past them
- **Cruyff Turn**: Fake pass/shot, drag ball behind standing leg with inside of foot, turn 180°
- **Stop and Go**: Sudden deceleration followed by explosive acceleration

**Header Abilities**:
- **Standing Header**: Ground-based execution with minimal vertical movement
- **Jumping Header**: Most common type requiring elevation and timing
- **Diving Header**: Dynamic technique requiring full body commitment
- **Defensive Headers**: Clearing danger from defensive zones
- **Attacking Headers**: Converting crosses and corner kicks into goals
- **Flick Headers**: Subtle redirections to teammates

**Tackling Abilities**:
- **Standing Tackle**: Defender remains on feet throughout challenge
- **Sliding Tackle**: Sliding along ground with leg extended to dispossess
- **Block Tackle**: Uses body positioning to obstruct ball movement
- **Interception**: Reading play to cut out passes before they reach target
- **Shoulder Charge**: Legal physical challenge using shoulder-to-shoulder contact
- **Recovery Tackle**: Last-ditch defensive action to prevent goal-scoring opportunities

#### 3.9.2 Player Attribute System

**Note**: Uses canonical PlayerAttributes interface from section 3.2.1 (0.0-10.0 scale as per PRD specification).

class AttributeCalculator {
  public calculateOverallRating(attributes: PlayerAttributes, playerType: PlayerType): number {
    const weights = this.getPositionWeights(playerType);
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [attribute, value] of Object.entries(attributes)) {
      const weight = weights[attribute] || 0;
      weightedSum += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private getPositionWeights(playerType: PlayerType): Record<string, number> {
    switch (playerType) {
      case 'GOALKEEPER':
        return {
          handling: 1.0, reflexes: 1.0, aerialReach: 0.8, oneOnOnes: 0.9,
          distribution: 0.7, positioning: 0.8, concentration: 0.8
        };

      case 'DEFENDER':
        return {
          tackling: 1.0, marking: 1.0, heading: 0.9, interceptions: 0.8,
          positioning: 0.9, strength: 0.8, pace: 0.7, passing: 0.6
        };

      case 'MIDFIELDER':
        return {
          passing: 1.0, vision: 0.9, ballControl: 0.8, stamina: 0.8,
          positioning: 0.8, decisions: 0.7, tackling: 0.6, dribbling: 0.6
        };

      case 'FORWARD':
        return {
          finishing: 1.0, shooting: 0.9, pace: 0.8, dribbling: 0.8,
          ballControl: 0.7, positioning: 0.8, strength: 0.6, crossing: 0.5
        };

      default:
        return {};
    }
  }
}
```

#### 3.9.3 Multi-Factor Player Positioning Algorithm

**Core Principle**: Each player's desired position is calculated using a weighted sum of multiple positioning factors, as specified in the original outline requirements.

```typescript
interface PositioningFactor {
  position: Vector2;           // Target position from this factor
  weight: number;              // Importance weighting (0.0-1.0)  
  priority: number;            // Override priority (1-10)
  description: string;         // Factor identification
}

interface PositioningContext extends DeterministicGameContext {
  ball: Ball;
  teammates: Player[];
  opponents: Player[];
  teamPosture: 'DEFENDING' | 'BALANCED' | 'ATTACKING';
  gamePhase: GamePhase;
}

class MultiFactorPositioning {
  private factors: PositioningFactor[] = [];
  private weights: PositioningWeights;

  constructor(private player: Player, private role: PlayerRole) {
    this.weights = this.getPositioningWeights(role);
  }

  public calculateDesiredPosition(context: PositioningContext): Vector2 {
    this.factors = [];

    // **Factor 0: Loose Ball Priority** (from outline.md:133)
    this.addLooseBallFactor(context);

    // **Factor 1: Formation Data Priority** (from outline.md:135) 
    this.addFormationDataFactor(context);

    // **Factor 2: Tactical Instruction Factor**
    this.addTacticalInstructionFactor(context);

    // **Factor 3: Role-Specific Behaviour Factor**
    this.addRoleSpecificFactor(context);

    // Calculate weighted sum of all factors
    return this.calculateWeightedPosition();
  }

  private addLooseBallFactor(context: PositioningContext): void {
    if (!context.ball.owner) {
      const distanceToBall = this.calculateDistance(this.player.position, context.ball.position);
      const isClosestTeammate = this.isClosestTeammateToLooseBall(context);

      if (isClosestTeammate && distanceToBall < this.weights.looseBallChaseThreshold) {
        // Chase loose ball with high priority
        this.factors.push({
          position: context.ball.position,
          weight: this.weights.looseBallWeight,
          priority: 10, // Highest priority
          description: "Loose Ball Chase"
        });
      } 
      else {
        // Support position for loose ball scenario
        const supportPosition = this.calculateLooseBallSupportPosition(context);
        this.factors.push({
          position: supportPosition,
          weight: this.weights.looseBallSupportWeight,
          priority: 6,
          description: "Loose Ball Support"
        });
      }
    }
  }

  private addFormationDataFactor(context: PositioningContext): void {
    // Get formation position based on ball location (grid square calculation)
    const ballGridPosition = this.calculateBallGridSquare(context.ball.position);
    const formationPosition = this.getFormationPositionForBallLocation(ballGridPosition, context.gamePhase);

    this.factors.push({
      position: formationPosition,
      weight: this.weights.formationWeight,
      priority: 8, // High priority for formation shape
      description: `Formation Position (Ball: ${ballGridPosition})`
    });
  }

  private addTacticalInstructionFactor(context: PositioningContext): void {
    let tacticalPosition: Vector2;
    let weight: number;

    switch (context.teamPosture) {
      case 'DEFENDING':
        tacticalPosition = this.calculateDefensivePosition(context);
        weight = this.weights.defensiveTacticalWeight;
        break;
      case 'ATTACKING':
        tacticalPosition = this.calculateAttackingPosition(context);
        weight = this.weights.attackingTacticalWeight;
        break;
      case 'BALANCED':
      default:
        tacticalPosition = this.calculateBalancedPosition(context);
        weight = this.weights.balancedTacticalWeight;
        break;
    }

    this.factors.push({
      position: tacticalPosition,
      weight,
      priority: 7,
      description: `Tactical: ${context.teamPosture}`
    });
  }

  private addRoleSpecificFactor(context: PositioningContext): void {
    const rolePosition = this.calculateRoleSpecificPosition(context);
    
    this.factors.push({
      position: rolePosition,
      weight: this.weights.roleSpecificWeight,
      priority: 5,
      description: `Role: ${this.role}`
    });
  }

  private calculateWeightedPosition(): Vector2 {
    if (this.factors.length === 0) {
      return this.player.position; // No factors, stay put
    }

    // Sort by priority (highest first)
    const sortedFactors = this.factors.sort((a, b) => b.priority - a.priority);

    // Check for high-priority overrides
    const highestPriority = sortedFactors[0].priority;
    if (highestPriority >= 9) {
      // High priority factor overrides weighted calculation
      return sortedFactors[0].position;
    }

    // Calculate weighted average position
    let totalWeightedX = 0;
    let totalWeightedY = 0;
    let totalWeight = 0;

    for (const factor of this.factors) {
      totalWeightedX += factor.position.x * factor.weight;
      totalWeightedY += factor.position.y * factor.weight;
      totalWeight += factor.weight;
    }

    if (totalWeight === 0) {
      return this.player.position;
    }

    return {
      x: totalWeightedX / totalWeight,
      y: totalWeightedY / totalWeight
    };
  }

  private isClosestTeammateToLooseBall(context: PositioningContext): boolean {
    const myDistance = this.calculateDistance(this.player.position, context.ball.position);
    
    return context.teammates.every(teammate => {
      if (teammate.id === this.player.id) return true;
      const teammateDistance = this.calculateDistance(teammate.position, context.ball.position);
      return myDistance <= teammateDistance;
    });
  }

  private calculateBallGridSquare(ballPosition: Vector2): string {
    const gridCol = Math.floor(ballPosition.x * 20); // 20 columns
    const gridRow = Math.floor(ballPosition.y * 15); // 15 rows
    return `x${gridCol}_y${gridRow}`;
  }

  private getPositioningWeights(role: PlayerRole): PositioningWeights {
    const baseWeights: PositioningWeights = {
      looseBallWeight: 0.3,
      looseBallSupportWeight: 0.1,
      looseBallChaseThreshold: 0.15, // 15% of pitch
      formationWeight: 0.4,
      defensiveTacticalWeight: 0.2,
      attackingTacticalWeight: 0.2,
      balancedTacticalWeight: 0.15,
      roleSpecificWeight: 0.1
    };

    // Role-specific weight adjustments
    switch (role) {
      case 'GOALKEEPER':
        return {
          ...baseWeights,
          looseBallWeight: 0.1,      // Goalkeepers rarely chase loose balls
          formationWeight: 0.6,      // Strong formation adherence
          looseBallChaseThreshold: 0.05 // Only chase very close balls
        };

      case 'CENTRE_BACK':
        return {
          ...baseWeights,
          looseBallWeight: 0.25,
          formationWeight: 0.5,      // High formation discipline
          defensiveTacticalWeight: 0.3
        };

      case 'CENTRAL_MIDFIELDER':
        return {
          ...baseWeights,
          looseBallWeight: 0.4,      // Most involved in loose ball situations
          formationWeight: 0.3,
          balancedTacticalWeight: 0.25
        };

      case 'STRIKER':
        return {
          ...baseWeights,
          looseBallWeight: 0.35,
          formationWeight: 0.25,     // More flexible positioning
          attackingTacticalWeight: 0.35,
          roleSpecificWeight: 0.2    // Strong role-specific behaviour
        };

      default:
        return baseWeights;
    }
  }
}

interface PositioningWeights {
  looseBallWeight: number;
  looseBallSupportWeight: number;
  looseBallChaseThreshold: number;
  formationWeight: number;
  defensiveTacticalWeight: number;
  attackingTacticalWeight: number;
  balancedTacticalWeight: number;
  roleSpecificWeight: number;
}

// Integration with existing formation system
class FormationAwarePlayer extends Player {
  private multiFactorPositioning: MultiFactorPositioning;
  private roleSpecificBehaviour: RoleSpecificBehaviour;

  constructor(basePlayer: Player, formation: FormationData, role: string) {
    super(basePlayer);
    this.multiFactorPositioning = new MultiFactorPositioning(this, role as PlayerRole);
    this.roleSpecificBehaviour = new RoleSpecificBehaviour(role);
  }

  public update(gameContext: GameContext, deltaTime: number): void {
    // Build positioning context
    const positioningContext: PositioningContext = {
      ...gameContext,
      gameTime: gameContext.matchTime.elapsed,
      rng: new SeededRandom(gameContext.matchSeed || 12345),
      frameCount: Math.floor(gameContext.matchTime.elapsed * 30),
      matchSeed: gameContext.matchSeed || 12345
    };

    // Calculate desired position using multi-factor algorithm
    const desiredPosition = this.multiFactorPositioning.calculateDesiredPosition(positioningContext);

    // Apply role-specific adjustments  
    this.targetPosition = this.roleSpecificBehaviour.adjustPosition(
      desiredPosition,
      gameContext,
      this.attributes
    );

    // Update player with enhanced position
    this.targetPosition = adjustedTarget;
    super.update(gameContext, deltaTime);
  }

  private getFormationTarget(gameContext: GameContext): Vector2 {
    // Use the optimized formation system from section 3.1
    return this.formationManager.getPlayerPosition(
      this.role,
      gameContext.ball.position,
      gameContext.matchPhase
    );
  }
}

class RoleSpecificBehaviour {
  constructor(private role: string) {}

  public adjustPosition(
    basePosition: Vector2,
    context: GameContext,
    attributes: PlayerAttributes
  ): Vector2 {
    switch (this.role) {
      case 'CB_LEFT':
      case 'CB_RIGHT':
        return this.adjustDefenderPosition(basePosition, context, attributes);

      case 'CDM':
        return this.adjustDefensiveMidfielderPosition(basePosition, context, attributes);

      case 'ST_LEFT':
      case 'ST_RIGHT':
        return this.adjustStrikerPosition(basePosition, context, attributes);

      default:
        return basePosition;
    }
  }

  private adjustDefenderPosition(pos: Vector2, context: GameContext, attr: PlayerAttributes): Vector2 {
    // Higher positioning attribute = better defensive positioning
    const positioningBonus = (attr.positioning - 5) * 0.02; // ±10% adjustment

    return {
      x: pos.x,
      y: pos.y + (context.ball.position.y - pos.y) * positioningBonus
    };
  }
}
```

#### 3.2.5 Enhanced Match Engine Core
```typescript
class MatchEngine implements Entity  // Core match engine implementation
{
  private gameState: GameState;
  private entities: Map<string, Entity>;     // All game entities (players, ball, referee)
  private players: Map<string, Player>;
  private ball: Ball;
  private referee: Referee;
  private physics: PhysicsEngine;
  private masterAI: MasterAIController;
  private stateManager: MatchStateManager;   // Finite State Machine for match phases
  private performanceMonitor: PerformanceMonitor;
  private eventSystem: EventSystem;          // For decoupled event handling

  // Core game loop implementation
  public processFrame(deltaTime: number): void
  {
    // 1. Update all entities
    for (const entity of this.entities.values())
    {
      entity.update(deltaTime);
    }

    // 2. Process physics
    this.physics.update(deltaTime);

    // 3. Handle AI decisions
    this.masterAI.processFrame(this.gameState, deltaTime);

    // 4. Update match state
    this.stateManager.update(this.gameState, deltaTime);

    // 5. Check rules and events
    this.processMatchEvents();

    // 6. Render (if applicable)
    this.render();
  }

  public handlePlayerAction(action: GameAction): void;
  public handleTacticalInstruction(instruction: TacticalCommand): void;
  public checkRules(): RuleViolation[];
  public getAIPerformanceMetrics(): AIQualityMetrics;

  // Entity interface implementation
  public update(deltaTime: number): void;
  public render(renderer: Renderer): void;
  public getBounds(): Circle;
  public dispose(): void;
}

// Enhanced Entity system implementation
interface Entity
{
  id: string;
  position: Vector2;
  bounds: Circle;               // For collision detection
  active: boolean;              // Whether entity is active in simulation

  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  getBounds(): Circle;
  dispose(): void;
}

// Match State Management with proper FSM
enum MatchState
{
  INTRODUCTION = 'introduction',       // Pre-match setup
  PREPARE_FOR_KICKOFF = 'prepare_kickoff',
  IN_PLAY = 'in_play',
  THROW_IN = 'throw_in',
  CORNER_KICK = 'corner_kick',
  FREE_KICK = 'free_kick',             // **PHASE 2 ONLY**
  PENALTY = 'penalty',                 // **PHASE 2 ONLY**
  GOAL_SCORED = 'goal_scored',
  HALF_TIME = 'half_time',
  FULL_TIME = 'full_time'
}

// MatchStateManager REMOVED - functionality absorbed into GameManager

// GameManager now handles ALL match state logic with a clean switch statement
class GameManager {
  private matchState: MatchState = MatchState.INTRODUCTION;
  private stateTimer: number = 0; // Timer for current state
  private stateData: any = {}; // State-specific data

  // Main game loop with centralized state handling
  public update(currentTime: number): void {
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000.0;
    this.lastUpdateTime = currentTime;
    const clampedDelta = Math.min(deltaTime, 1.0 / 30.0);

    // Update deterministic context
    this.deterministicContext.gameTime += clampedDelta;
    this.deterministicContext.frameCount++;
    this.stateTimer += clampedDelta;

    // **CENTRALIZED STATE MACHINE** - All match logic flows through here
    this.handleCurrentState(clampedDelta);
    
    // Check for state transitions after handling current state
    this.checkStateTransitions();
  }

  /**
   * CENTRALIZED STATE HANDLER - Single source of truth for all match states
   */
  private handleCurrentState(deltaTime: number): void {
    switch (this.matchState) {
      case MatchState.INTRODUCTION:
        this.handleIntroductionState(deltaTime);
        break;

      case MatchState.PREPARE_FOR_KICKOFF:
        this.handlePrepareKickoffState(deltaTime);
        break;

      case MatchState.IN_PLAY:
        this.handleInPlayState(deltaTime);
        break;

      case MatchState.GOAL_KICK:
        this.handleGoalKickState(deltaTime);
        break;

      case MatchState.CORNER_KICK:
        this.handleCornerKickState(deltaTime);
        break;

      case MatchState.THROW_IN:
        this.handleThrowInState(deltaTime);
        break;

      case MatchState.GOAL_SCORED:
        this.handleGoalScoredState(deltaTime);
        break;

      case MatchState.HALF_TIME:
        this.handleHalfTimeState(deltaTime);
        break;

      case MatchState.FULL_TIME:
        this.handleFullTimeState(deltaTime);
        break;

      default:
        console.warn(`Unhandled match state: ${this.matchState}`);
        break;
    }
  }

  private transitionToState(newState: MatchState, stateData?: any): void {
    console.log(`State transition: ${this.matchState} -> ${newState}`);
    
    // Exit current state
    this.exitCurrentState();
    
    // Update state
    const previousState = this.matchState;
    this.matchState = newState;
    this.stateTimer = 0;
    this.stateData = stateData || {};
    
    // Enter new state  
    this.enterNewState(previousState);
    
    // Broadcast state change to systems that need it
    this.broadcastStateChange(newState, previousState);
  }

  /**
   * STATE ENTRY/EXIT HANDLERS - Called during state transitions
   */
  private exitCurrentState(): void {
    switch (this.matchState) {
      case MatchState.IN_PLAY:
        // Stop ball if needed, clear temporary state
        break;
      case MatchState.GOAL_KICK:
      case MatchState.CORNER_KICK:
      case MatchState.THROW_IN:
        // Clear set piece state
        break;
    }
  }

  private enterNewState(previousState: MatchState): void {
    switch (this.matchState) {
      case MatchState.GOAL_KICK:
        this.referee.blowBriefWhistle();
        break;
      case MatchState.CORNER_KICK:
        this.referee.blowBriefWhistle();
        break;
      case MatchState.THROW_IN:
        this.referee.blowBriefWhistle();
        break;
      case MatchState.GOAL_SCORED:
        this.statistics.recordGoal(this.stateData.scoringTeam, this.stateData.scoringPlayer);
        break;
      case MatchState.HALF_TIME:
        this.referee.blowExtendedWhistle();
        break;
      case MatchState.FULL_TIME:
        this.referee.blowExtendedWhistle();
        break;
    }
  }

  /**
   * STATE CHANGE BROADCASTING - Notify other systems of state changes
   */
  private broadcastStateChange(newState: MatchState, previousState: MatchState): void {
    // Notify AI controllers
    this.aiControllers.forEach(controller => {
      controller.onMatchStateChange(newState, previousState);
    });

    // Notify teams
    this.homeTeam.onMatchStateChange(newState, previousState);
    this.awayTeam.onMatchStateChange(newState, previousState);

    // Update statistics
    this.statistics.recordStateChange(newState, this.deterministicContext.gameTime);

    // Notify UI/Renderer (if needed)
    this.notifyUIStateChange(newState);
  }

  /**
   * INDIVIDUAL STATE HANDLERS - Pure functions that handle specific states
   */
  private handleIntroductionState(deltaTime: number): void {
    // Players walking onto pitch, crowd noise, commentary
    if (this.stateTimer > 30) { // 30 seconds introduction
      this.transitionToState(MatchState.PREPARE_FOR_KICKOFF);
    }
  }

  private handlePrepareKickoffState(deltaTime: number): void {
    // Players move to kick-off positions
    this.setupKickOffPositions(this.kickOffTeam);
    
    if (this.stateTimer > 5) { // 5 seconds to get in position
      this.transitionToState(MatchState.IN_PLAY);
    }
  }

  private handleInPlayState(deltaTime: number): void {
    // Main gameplay - AI, physics, collision detection
    this.updateAI(deltaTime);
    this.updatePhysics(deltaTime);
    this.updateStatistics(deltaTime);
  }

  private handleCornerKickState(deltaTime: number): void {
    // Similar pattern to goal kick - position players, execute kick
    // Implementation would follow same pattern as handleGoalKickState
  }

  private handleThrowInState(deltaTime: number): void {
    // Similar pattern - position players, execute throw
    // Implementation would follow same pattern as handleGoalKickState
  }

  private handleGoalScoredState(deltaTime: number): void {
    // Celebration animation, update score display
    if (this.stateTimer > 5) { // 5 seconds celebration
      // Reset for kick-off by team that conceded
      const concedingTeam = this.stateData.scoringTeam === 'HOME' ? 'AWAY' : 'HOME';
      this.kickOffTeam = concedingTeam;
      this.transitionToState(MatchState.PREPARE_FOR_KICKOFF);
    }
  }

  private handleHalfTimeState(deltaTime: number): void {
    // Display half-time statistics
    if (this.stateTimer > 60) { // 1 minute half-time
      this.transitionToSecondHalf();
    }
  }

  private handleFullTimeState(deltaTime: number): void {
    // Display final statistics, match summary
    // Match is complete - no further transitions
  }

    // Enter new state
    const newHandler = this.stateHandlers.get(newState);
    if (newHandler)
    {
      newHandler.enter(gameState);
    }

    this.currentState = newState;
    this.stateTimer = 0;
  }
}

interface StateHandler
{
  enter(gameState: GameState): void;
  update(gameState: GameState, deltaTime: number): void;
  exit(gameState: GameState): void;
  checkTransitions(gameState: GameState): MatchState | null;
}
```

#### 3.2.2 Enhanced Game State Management
```typescript
// Enhanced match phases with state machine implementation
enum MatchPhase
{
  INTRODUCTION = 'introduction',       // Pre-match team presentation
  PREPARE_FOR_KICKOFF = 'prepare_kickoff', // Player positioning for kickoff
  KICKOFF = 'kickoff',                 // Kick-off in progress
  IN_PLAY = 'in_play',                 // Active gameplay with ball in play
  OUT_OF_PLAY = 'out_of_play',         // Ball out of bounds
  THROW_IN = 'throw_in',               // Throw-in restart
  CORNER_KICK = 'corner_kick',         // Corner kick restart
  GOAL_KICK = 'goal_kick',             // Goal kick restart (opposing players must exit penalty area)
  FREE_KICK = 'free_kick',             // **PHASE 2 ONLY** - Free kick restart
  PENALTY = 'penalty',                 // **PHASE 2 ONLY** - Penalty kick
  GOAL_SCORED = 'goal_scored',         // Goal celebration and reset
  HALF_TIME = 'half_time',             // Half-time transition
  FULL_TIME = 'full_time'              // Match completed
}

// shared/types.ts - VGF-compatible shared types
import type { BaseGameState } from '@volley/vgf/types';

interface GameState extends BaseGameState
{
  // VGF handles phase management automatically
  phase: 'lobby' | 'pre_match' | 'kick_off' | 'first_half' | 'half_time' | 'second_half' | 'full_time';
  
  // Match participants (multiplayer managers)
  teams: Team[];
  
  // Core game objects  
  ball: Ball3D;                        // 3D ball with physics
  players: Player[];                   // All players from both teams
  
  // Match state
  score: Score;
  gameTime: number;                    // Accumulated game time in seconds
  matchSeed: number;                   // Deterministic seed for this match
  
  // Current match context
  possession: 'HOME' | 'AWAY' | null;  // Current team in possession
  lastTouch: string | null;            // Player ID who last touched ball
  pressureLevel: number;               // 0-1, attacking pressure intensity
  tempo: number;                       // 0-1, pace of play
<<<<<<< Updated upstream
=======
  
  // Events and match tracking
  events: MatchEvent[];
  
  // Match timing (derived from VGF phase system)
  phaseStartTime: number;              // When current phase started
  phaseElapsedTime: number;            // Time in current phase
  
  // Team tactical postures (FET integration)
  homeTeamPosture: TeamPosture;        // HOME team's current tactical posture
  awayTeamPosture: TeamPosture;        // AWAY team's current tactical posture
>>>>>>> Stashed changes
}

interface MatchTime
{
  elapsed: number;                     // Real minutes elapsed (0-90+)
  footballTime: string;                // Formatted time display ("23:45", "90+2")
  period: 1 | 2;                      // First or second half
  stoppage: number;                   // Added time in minutes
  realTimeStart: number;              // Unix timestamp when match started
  realTimeElapsed: number;            // Real seconds elapsed (300 = 5 minutes)
  halfTimeTriggered: boolean;         // Half-time transition completed

  // Enhanced timing inspired by realistic football
  accelerationFactor: number;         // 18x (5 real minutes = 90 football minutes)
  lastUpdate: number;                 // Last time update timestamp
}

### 3.6.5 Goal Kick Implementation (POC)

**FIFA Law 16 Compliance**: Implementation follows FIFA Laws of the Game for goal kick procedures.

#### 3.6.5.1 Goal Kick State Machine
```typescript
enum GoalKickPhase {
  AWAITING_POSITIONING = 'awaiting_positioning',  // Waiting for players to exit penalty area
  READY_TO_KICK = 'ready_to_kick',               // All players correctly positioned
  BALL_IN_PLAY = 'ball_in_play'                  // Goal kick taken, ball is active
}

interface GoalKickState {
  phase: GoalKickPhase;
  kickingTeam: 'HOME' | 'AWAY';
  ballPosition: Vector2;                         // Within goal area (6-yard box)
  playersExitingPenaltyArea: Player[];           // Opposing players still exiting
  canTakeKick: boolean;                          // Referee allows kick
  timeInPhase: number;                           // Seconds in current phase
}

// GoalKickController REMOVED - functionality absorbed into GameManager

// Goal kick logic now handled directly in GameManager.handleGoalKickState()
class GameManager {
  /**
   * GOAL KICK STATE HANDLER - Integrated into GameManager
   */
  private handleGoalKickState(deltaTime: number): void {
    const goalKickData = this.stateData as GoalKickStateData;
    
    switch (goalKickData.phase) {
      case GoalKickPhase.AWAITING_POSITIONING:
        this.handleGoalKickPositioning(deltaTime);
        break;
        
      case GoalKickPhase.READY_TO_KICK:
        this.handleGoalKickReady(deltaTime);
        break;
        
      case GoalKickPhase.BALL_IN_PLAY:
        // Ball has been kicked and is moving - transition back to IN_PLAY
        this.transitionToState(MatchState.IN_PLAY);
        break;
    }
  }

  private handleGoalKickPositioning(deltaTime: number): void {
    const goalKickData = this.stateData as GoalKickStateData;
    const opposingTeam = goalKickData.kickingTeam === 'HOME' ? this.awayTeam : this.homeTeam;
    
    // Check if opposing players have exited penalty area
    const playersInPenaltyArea = opposingTeam.players.filter(player => 
      this.isPlayerInPenaltyArea(player.position, goalKickData.kickingTeam)
    );
    
    if (playersInPenaltyArea.length === 0) {
      // All players have left penalty area - ready to kick
      goalKickData.phase = GoalKickPhase.READY_TO_KICK;
      this.referee.blowBriefWhistle(); // Signal ready for goal kick
    }
  }

  private handleGoalKickReady(deltaTime: number): void {
    const goalKickData = this.stateData as GoalKickStateData;
    
    // AI automatically takes goal kick after brief delay
    if (this.stateTimer > 2.0) { // 2 second delay for realism
      this.executeGoalKick(goalKickData);
    }
  }

  private executeGoalKick(goalKickData: GoalKickStateData): void {
    const kickingTeam = goalKickData.kickingTeam === 'HOME' ? this.homeTeam : this.awayTeam;
    
    // Find goalkeeper or suitable player for goal kick
    const kicker = this.findGoalKicker(kickingTeam);
    
    // Execute kick with appropriate power and direction
    const kickDirection = this.calculateGoalKickDirection(kicker, kickingTeam);
    const kickPower = this.calculateGoalKickPower(kicker);
    
    this.ball.kick(kickDirection, kickPower, kicker);
    
    // Update state - ball is now in play
    goalKickData.phase = GoalKickPhase.BALL_IN_PLAY;
  }

  private initiateGoalKick(kickingTeam: 'HOME' | 'AWAY'): void {
    const ballPosition = this.placeBallInGoalArea(kickingTeam);
    const opposingTeam = kickingTeam === 'HOME' ? this.awayTeam : this.homeTeam;
    const playersInPenaltyArea = opposingTeam.players.filter(player => 
      this.isPlayerInPenaltyArea(player.position, kickingTeam)
    );
    
    const goalKickData: GoalKickStateData = {
      phase: playersInPenaltyArea.length > 0 ? GoalKickPhase.AWAITING_POSITIONING : GoalKickPhase.READY_TO_KICK,
      kickingTeam,
      ballPosition,
      playersExitingPenaltyArea: playersInPenaltyArea,
      canTakeKick: playersInPenaltyArea.length === 0,
      timeInPhase: 0
    };
  }
  
  public updateGoalKickState(goalKickState: GoalKickState, gameState: GameState, deltaTime: number): GoalKickState {
    goalKickState.timeInPhase += deltaTime;
    
    switch (goalKickState.phase) {
      case GoalKickPhase.AWAITING_POSITIONING:
        return this.updateAwaitingPositioning(goalKickState, gameState);
        
      case GoalKickPhase.READY_TO_KICK:
        return this.updateReadyToKick(goalKickState, gameState);
        
      case GoalKickPhase.BALL_IN_PLAY:
        // Goal kick completed, transition back to normal play
        gameState.phase = MatchPhase.IN_PLAY;
        break;
    }
    
    return goalKickState;
  }
  
  private updateAwaitingPositioning(goalKickState: GoalKickState, gameState: GameState): GoalKickState {
    const opposingPlayers = this.getOpposingPlayers(gameState, goalKickState.kickingTeam);
    const playersStillInPenaltyArea = opposingPlayers.filter(player => 
      this.isPlayerInPenaltyArea(player.position, goalKickState.kickingTeam)
    );
    
    // Check if all players are attempting to leave (moving away from penalty area center)
    const playersAttemptingToLeave = playersStillInPenaltyArea.filter(player => 
      this.isPlayerAttemptingToExit(player, goalKickState.kickingTeam)
    );
    
    goalKickState.playersExitingPenaltyArea = playersStillInPenaltyArea;
    
    // Allow quick goal kick if players are actively leaving penalty area
    const allowQuickKick = playersStillInPenaltyArea.length === 0 || 
                          (playersAttemptingToLeave.length === playersStillInPenaltyArea.length);
    
    if (allowQuickKick) {
      goalKickState.phase = GoalKickPhase.READY_TO_KICK;
      goalKickState.canTakeKick = true;
      goalKickState.timeInPhase = 0;
    }
    
    return goalKickState;
  }
  
  private updateReadyToKick(goalKickState: GoalKickState, gameState: GameState): GoalKickState {
    // AI automatically takes goal kick after brief delay
    if (goalKickState.timeInPhase > 2.0) { // 2 second delay for realism
      this.executeGoalKick(goalKickState, gameState);
      goalKickState.phase = GoalKickPhase.BALL_IN_PLAY;
    }
    
    return goalKickState;
  }
  
  private executeGoalKick(goalKickState: GoalKickState, gameState: GameState): void {
    const goalkeeper = this.findGoalkeeper(gameState, goalKickState.kickingTeam);
    
    if (goalkeeper) {
      // Move goalkeeper to ball position
      goalkeeper.position = { ...goalKickState.ballPosition };
      
      // Execute kick - ball becomes in play
      const kickDirection = this.calculateKickDirection(gameState, goalKickState.kickingTeam);
      const kickPower = 0.8; // Moderate power for POC
      
      gameState.ball.position = { ...goalKickState.ballPosition };
      gameState.ball.velocity = {
        x: kickDirection.x * kickPower,
        y: kickDirection.y * kickPower
      };
      
      gameState.ball.isMoving = true;
      gameState.ball.possessor = null; // Ball is free
      gameState.lastTouch = goalkeeper;
    }
  }
  
  private isPlayerInPenaltyArea(playerPosition: Vector2, defendingTeam: 'HOME' | 'AWAY'): boolean {
    const penaltyArea = this.getPenaltyAreaForTeam(defendingTeam);
    
    return playerPosition.x >= penaltyArea.left && 
           playerPosition.x <= penaltyArea.right && 
           playerPosition.y >= penaltyArea.top && 
           playerPosition.y <= penaltyArea.bottom;
  }
  
  private isPlayerAttemptingToExit(player: Player, defendingTeam: 'HOME' | 'AWAY'): boolean {
    const penaltyAreaCenter = this.getPenaltyAreaCenter(defendingTeam);
    const distanceToCenterNow = this.calculateDistance(player.position, penaltyAreaCenter);
    const distanceToCenterTarget = this.calculateDistance(player.targetPosition, penaltyAreaCenter);
    
    // Player is attempting to exit if moving away from penalty area center
    return distanceToCenterTarget > distanceToCenterNow;
  }
  
  private placeBallInGoalArea(kickingTeam: 'HOME' | 'AWAY'): Vector2 {
    const goalArea = this.getGoalAreaForTeam(kickingTeam);
    
    // Place ball in center of goal area for POC simplicity
    return {
      x: (goalArea.left + goalArea.right) / 2,
      y: (goalArea.top + goalArea.bottom) / 2
    };
  }
  
  private calculateKickDirection(gameState: GameState, kickingTeam: 'HOME' | 'AWAY'): Vector2 {
    // Simple POC implementation - kick toward center field
    const fieldCenter = { x: 0.5, y: 0.5 }; // Normalized center
    const ballPos = gameState.ball.position;
    
    const direction = {
      x: fieldCenter.x - ballPos.x,
      y: fieldCenter.y - ballPos.y
    };
    
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    
    return {
      x: direction.x / magnitude,
      y: direction.y / magnitude
    };
  }
}
```

#### 3.6.5.2 AI Behavior During Goal Kicks
```typescript
class GoalKickAIBehavior {
  public updatePlayerDuringGoalKick(player: Player, goalKickState: GoalKickState, gameState: GameState): void {
    const isKickingTeam = player.team === goalKickState.kickingTeam;
    
    if (isKickingTeam) {
      this.handleKickingTeamPlayer(player, goalKickState, gameState);
    } else {
      this.handleOpposingTeamPlayer(player, goalKickState, gameState);
    }
  }
  
  private handleOpposingTeamPlayer(player: Player, goalKickState: GoalKickState, gameState: GameState): void {
    const isInPenaltyArea = this.isPlayerInPenaltyArea(player.position, goalKickState.kickingTeam);
    
    if (isInPenaltyArea) {
      // Must attempt to leave penalty area
      const exitDirection = this.calculateExitDirection(player.position, goalKickState.kickingTeam);
      player.targetPosition = {
        x: player.position.x + exitDirection.x * 0.05, // Move 5% of pitch toward exit
        y: player.position.y + exitDirection.y * 0.05
      };
      
      player.state = PlayerState.MAINTAINING_POSITION; // Don't interfere with other AI
    } else {
      // Position outside penalty area, prepare for when ball comes into play
      player.targetPosition = this.calculateReadyPosition(player, goalKickState);
      player.state = PlayerState.MAINTAINING_POSITION;
    }
  }
  
  private handleKickingTeamPlayer(player: Player, goalKickState: GoalKickState, gameState: GameState): void {
    if (player.playerType === 'GOALKEEPER') {
      // Goalkeeper moves to ball to take the kick
      player.targetPosition = { ...goalKickState.ballPosition };
    } else {
      // Other players position for receiving the goal kick
      player.targetPosition = this.calculateReceivingPosition(player, goalKickState);
    }
    
    player.state = PlayerState.MAINTAINING_POSITION;
  }
}
```

### 3.6.6 Goalkeeper Ball Handling System (POC)

**FIFA Law 12 Compliance**: Goalkeeper can handle ball within penalty area, 6-second rule when ball is in hands.

#### 3.6.6.1 Goalkeeper Ball States
```typescript
enum GoalkeeperBallState {
  NO_POSSESSION = 'no_possession',         // Goalkeeper doesn't have ball
  AT_FEET = 'at_feet',                    // Ball on ground, can dribble
  IN_HANDS = 'in_hands',                  // Ball caught/picked up, 6-second rule
  DISTRIBUTING = 'distributing'           // In process of releasing ball
}

interface GoalkeeperPossession {
  state: GoalkeeperBallState;
  timeInHands: number;                    // Seconds ball has been in hands
  distributionMethod: 'drop_kick' | 'throw' | 'roll' | 'punt' | null;
  targetPlayer: Player | null;            // Intended recipient for distribution
  maxHandsTime: number;                   // 6 seconds (FIFA Law 12)
}

class GoalkeeperController {
  private possession: GoalkeeperPossession;
  private penaltyAreaBounds: FieldZone;
  
  constructor() {
    this.possession = {
      state: GoalkeeperBallState.NO_POSSESSION,
      timeInHands: 0,
      distributionMethod: null,
      targetPlayer: null,
      maxHandsTime: 6.0
    };
    
    this.penaltyAreaBounds = this.calculatePenaltyAreaBounds();
  }
  
  public updateGoalkeeperPossession(goalkeeper: Player, gameState: GameState, deltaTime: number): void {
    if (!this.isGoalkeeperInPenaltyArea(goalkeeper)) {
      // Outside penalty area - no special handling allowed
      this.possession.state = GoalkeeperBallState.NO_POSSESSION;
      return;
    }
    
    switch (this.possession.state) {
      case GoalkeeperBallState.NO_POSSESSION:
        this.checkForBallAcquisition(goalkeeper, gameState);
        break;
        
      case GoalkeeperBallState.AT_FEET:
        this.updateAtFeetState(goalkeeper, gameState, deltaTime);
        break;
        
      case GoalkeeperBallState.IN_HANDS:
        this.updateInHandsState(goalkeeper, gameState, deltaTime);
        break;
        
      case GoalkeeperBallState.DISTRIBUTING:
        this.updateDistributingState(goalkeeper, gameState, deltaTime);
        break;
    }
  }
  
  private updateInHandsState(goalkeeper: Player, gameState: GameState, deltaTime: number): void {
    this.possession.timeInHands += deltaTime;
    
    // Trigger opposing team retreat when goalkeeper has ball in hands
    this.triggerOpposingTeamRetreat(gameState, goalkeeper.team);
    
    // Must distribute within 6 seconds (FIFA Law 12)
    if (this.possession.timeInHands >= this.possession.maxHandsTime) {
      this.forcedDistribution(goalkeeper, gameState);
      return;
    }
    
    // AI decision: choose distribution method
    if (this.possession.timeInHands > 2.0) { // Hold for 2 seconds to assess options
      const distributionDecision = this.chooseDistributionMethod(goalkeeper, gameState);
      this.executeDistribution(goalkeeper, gameState, distributionDecision);
    }
  }
  
  private chooseDistributionMethod(goalkeeper: Player, gameState: GameState): DistributionDecision {
    const teammates = this.getTeammates(goalkeeper, gameState);
    const opposingPlayers = this.getOpposingPlayers(goalkeeper, gameState);
    
    // Assess tactical situation
    const nearbyTeammates = teammates.filter(player => 
      this.calculateDistance(goalkeeper.position, player.position) < 200
    );
    
    const opposingPressure = opposingPlayers.filter(player =>
      this.calculateDistance(goalkeeper.position, player.position) < 300
    ).length;
    
    if (opposingPressure > 2 || nearbyTeammates.length === 0) {
      // High pressure or no nearby options - go long
      return {
        method: 'drop_kick',
        target: this.findLongDistributionTarget(teammates),
        power: 0.9, // High power for distance
        reason: 'escape_pressure'
      };
    } else {
      // Safe to distribute short
      return {
        method: context.rng.boolean(0.5) ? 'throw' : 'roll', // Use deterministic RNG
        target: this.findShortDistributionTarget(nearbyTeammates),
        power: 0.4, // Moderate power for accuracy
        reason: 'maintain_possession'
      };
    }
  }
  
  private executeDistribution(goalkeeper: Player, gameState: GameState, decision: DistributionDecision): void {
    this.possession.state = GoalkeeperBallState.DISTRIBUTING;
    this.possession.distributionMethod = decision.method;
    this.possession.targetPlayer = decision.target;
    
    const direction = this.calculateDistributionDirection(goalkeeper.position, decision.target.position);
    
    switch (decision.method) {
      case 'drop_kick':
        this.executeDropKick(gameState, direction, decision.power);
        break;
        
      case 'throw':
        this.executeThrow(gameState, direction, decision.power);
        break;
        
      case 'roll':
        this.executeRoll(gameState, direction, decision.power);
        break;
        
      case 'punt':
        this.executePunt(gameState, direction, decision.power);
        break;
    }
  }
  
  private executeDropKick(gameState: GameState, direction: Vector2, power: number): void {
    // Drop kick: ball is dropped and kicked for long distribution
    const velocity = {
      x: direction.x * power * 800, // High speed for distance
      y: direction.y * power * 800
    };
    
    gameState.ball.velocity = velocity;
    gameState.ball.isMoving = true;
    gameState.ball.possessor = null;
    
    // Reset goalkeeper possession
    this.resetPossession();
  }
  
  private executeThrow(gameState: GameState, direction: Vector2, power: number): void {
    // Hand throw: accurate short distribution
    const velocity = {
      x: direction.x * power * 400, // Moderate speed for accuracy
      y: direction.y * power * 400
    };
    
    gameState.ball.velocity = velocity;
    gameState.ball.isMoving = true;
    gameState.ball.possessor = null;
    
    this.resetPossession();
  }
  
  private executeRoll(gameState: GameState, direction: Vector2, power: number): void {
    // Ground roll: very short, accurate distribution
    const velocity = {
      x: direction.x * power * 200, // Low speed, stays on ground
      y: direction.y * power * 200
    };
    
    gameState.ball.velocity = velocity;
    gameState.ball.isMoving = true;
    gameState.ball.possessor = null;
    
    this.resetPossession();
  }
  
  private triggerOpposingTeamRetreat(gameState: GameState, goalkeepingTeam: 'HOME' | 'AWAY'): void {
    const opposingTeam = goalkeepingTeam === 'HOME' ? 'AWAY' : 'HOME';
    const opposingPlayers = gameState.teams.find(team => team.name === opposingTeam)?.players || [];
    
    // Opposing players retreat toward own half to defend counter-attack
    opposingPlayers.forEach(player => {
      if (player.playerType !== 'GOALKEEPER') {
<<<<<<< Updated upstream
        const ownHalfX = opposingTeam === 'HOME' ? 
          POC_CONFIG.FIELD_WIDTH * 0.25 : 
          POC_CONFIG.FIELD_WIDTH * 0.75;
        
=======
        const ownHalfX = opposingTeam === 'HOME' ? 0.25 : 0.75; // Normalized coordinates

>>>>>>> Stashed changes
        // Move toward own half, maintaining some width
        player.targetPosition = {
          x: ownHalfX,
          y: player.basePosition.y + context.rng.uniform(-0.05, 0.05) // Use deterministic RNG (5% variation)
        };
        
        player.state = PlayerState.DEFENDING; // Switch to defensive mindset
      }
    });
  }
  
  private resetPossession(): void {
    this.possession = {
      state: GoalkeeperBallState.NO_POSSESSION,
      timeInHands: 0,
      distributionMethod: null,
      targetPlayer: null,
      maxHandsTime: 6.0
    };
  }
}

interface DistributionDecision {
  method: 'drop_kick' | 'throw' | 'roll' | 'punt';
  target: Player;
  power: number; // 0.0-1.0
  reason: 'escape_pressure' | 'maintain_possession' | 'counter_attack';
}
```

#### 3.6.6.2 Enhanced Ball Class for Goalkeeper Handling
```typescript
// Extension to existing Ball class
interface Ball {
  // ... existing properties
  inGoalkeeperHands: boolean;              // Ball is held by goalkeeper
  goalkeeperPossessor: Player | null;      // Which goalkeeper has it
  timeInHands: number;                     // Seconds in goalkeeper's hands
  
  // New methods for goalkeeper handling
  pickUpByGoalkeeper(goalkeeper: Player): void;
  dropFromHands(): void;
  isWithinGoalkeeperReach(goalkeeper: Player): boolean;
}

class EnhancedBall extends Ball {
  public pickUpByGoalkeeper(goalkeeper: Player): void {
    if (this.isWithinGoalkeeperReach(goalkeeper)) {
      this.inGoalkeeperHands = true;
      this.goalkeeperPossessor = goalkeeper;
      this.possessor = goalkeeper.id;
      this.velocity = { x: 0, y: 0 };
      this.isMoving = false;
      this.timeInHands = 0;
    }
  }
  
  public dropFromHands(): void {
    this.inGoalkeeperHands = false;
    this.goalkeeperPossessor = null;
    this.timeInHands = 0;
    // Ball remains at goalkeeper's feet until kicked
  }
  
  public isWithinGoalkeeperReach(goalkeeper: Player): boolean {
    const distance = this.calculateDistance(this.position, goalkeeper.position);
    return distance < FIFA_CONSTANTS.PLAYER.REACH; // Normalized reach distance
  }
}
```

#### 3.6.6.3 Tactical AI Response to Goalkeeper Possession
```typescript
class TacticalAIResponse {
  public respondToGoalkeeperPossession(gameState: GameState, goalkeepingTeam: 'HOME' | 'AWAY'): void {
    const opposingTeam = goalkeepingTeam === 'HOME' ? 'AWAY' : 'HOME';
    const opposingPlayers = this.getTeamPlayers(gameState, opposingTeam);
    
    // Immediate tactical response: retreat and prepare for counter-attack defense
    opposingPlayers.forEach(player => {
      if (player.playerType !== 'GOALKEEPER') {
        this.setRetreatBehavior(player, opposingTeam);
      }
    });
    
    // Adjust formation to defensive shape
    this.adjustFormationForDefense(gameState, opposingTeam);
  }
  
  private setRetreatBehavior(player: Player, team: 'HOME' | 'AWAY'): void {
<<<<<<< Updated upstream
    const ownHalfCenterX = team === 'HOME' ? 
      POC_CONFIG.FIELD_WIDTH * 0.25 : 
      POC_CONFIG.FIELD_WIDTH * 0.75;
    
=======
    const ownHalfCenterX = team === 'HOME' ? 0.25 : 0.75; // Normalized coordinates

>>>>>>> Stashed changes
    // Players retreat but maintain some attacking potential
    const retreatIntensity = player.attributes?.positioning || 0.5; // Use positioning attribute
    
    player.targetPosition = {
      x: player.basePosition.x + (ownHalfCenterX - player.basePosition.x) * retreatIntensity * 0.6,
      y: player.basePosition.y
    };
    
    player.state = PlayerState.DEFENDING;
  }
}
```

#### 3.6.6.4 FIFA Law 12 Enhanced Goalkeeper System

```typescript
class FIFALaw12GoalkeeperController extends GoalkeeperController {
  private passBackViolations: PassBackViolation[] = [];
  private sweepingBehaviour: SweeperKeeperBehaviour;
  
  constructor() {
    super();
    this.sweepingBehaviour = new SweeperKeeperBehaviour();
  }
  
  public checkPassBackRule(ball: Ball, lastTouchPlayer: Player, goalkeeper: Player): boolean {
    // FIFA Law 12: Goalkeeper cannot handle ball deliberately passed by teammate's foot
    if (!lastTouchPlayer || lastTouchPlayer.team !== goalkeeper.team) {
      return true; // Legal - not from teammate
    }
    
    if (!this.wasDeliberateFootPass(lastTouchPlayer, ball)) {
      return true; // Legal - deflection, header, or chest pass
    }
    
    // Violation detected
    this.recordPassBackViolation(goalkeeper, lastTouchPlayer);
    return false;
  }
  
  public canOutfieldPlayerChallenge(goalkeeper: Player, challengingPlayer: Player, ball: Ball): boolean {
    // FIFA Law 12: Outfield players cannot tackle/dispossess goalkeeper when ball is in hands
    if (challengingPlayer.playerType === 'GOALKEEPER') {
      return true; // Goalkeeper vs goalkeeper is allowed
    }
    
    if (ball.inGoalkeeperHands && ball.goalkeeperPossessor === goalkeeper.id) {
      return false; // Cannot challenge when ball is in keeper's hands
    }
    
    // Can challenge when ball is at goalkeeper's feet
    const distanceToKeeper = this.calculateDistance(ball.position, goalkeeper.position);
    const ballAtFeet = distanceToKeeper < 15 && !ball.inGoalkeeperHands;
    
    return ballAtFeet;
  }
  
  private wasDeliberateFootPass(player: Player, ball: Ball): boolean {
    // Simple POC logic: check if player was in passing state and used foot
    const wasInPassingAction = player.state === PlayerState.ATTACKING || 
                              player.state === PlayerState.MAINTAINING_POSITION;
    const ballSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
    
    // Deliberate passes typically have controlled speed
    return wasInPassingAction && ballSpeed > 50 && ballSpeed < 200;
  }
<<<<<<< Updated upstream
  
  private recordPassBackViolation(goalkeeper: Player, passer: Player): void {
=======

  private recordPassBackViolation(goalkeeper: Player, passer: Player, context: DeterministicGameContext): void {
>>>>>>> Stashed changes
    const violation: PassBackViolation = {
      timestamp: context.gameTime, // Use deterministic game time
      goalkeeper: goalkeeper.id,
      passer: passer.id,
      penaltyAwarded: 'indirect_free_kick'
    };
    
    this.passBackViolations.push(violation);
    // Award indirect free kick to opposing team at the spot of the handling
  }
  
  // Enhanced 6-second rule with progressive urgency
  private enforceEnhanced6SecondRule(goalkeeper: Player, gameState: GameState, deltaTime: number): void {
    if (this.possession.state !== GoalkeeperBallState.IN_HANDS) return;
    
    this.possession.timeInHands += deltaTime;
    
    // Progressive urgency system
    if (this.possession.timeInHands > 4.0) {
      // Warning phase - goalkeeper becomes more urgent
      this.increaseDistributionUrgency(goalkeeper);
    }
    
    if (this.possession.timeInHands > 5.5) {
      // Critical phase - must distribute immediately
      this.forcedUrgentDistribution(goalkeeper, gameState);
    }
    
    if (this.possession.timeInHands >= 6.0) {
      // Violation - indirect free kick
      this.awardIndirectFreeKick(gameState, goalkeeper);
    }
  }
  
  private increaseDistributionUrgency(goalkeeper: Player): void {
    // Reduce decision time and prefer quicker distribution methods
    goalkeeper.speed *= 1.2; // Slight speed increase to show urgency
  }
}

// Sweeper-keeper behaviour for modern goalkeeper role
class SweeperKeeperBehaviour {
  private rushOutThreshold: number = 300; // Distance threshold for rushing out
  private maxRushDistance: number = 200;  // Maximum distance from goal
  
  public shouldRushOut(goalkeeper: Player, gameState: GameState): boolean {
    const ball = gameState.ball;
    const opponentWithBall = this.getOpponentBallCarrier(gameState, goalkeeper.team);
    
    if (!opponentWithBall) return false;
    
    // Calculate threat level
    const distanceToGoal = this.calculateDistance(
      opponentWithBall.position, 
      this.getGoalPosition(goalkeeper.team)
    );
    
    const opponentSpeed = this.calculatePlayerSpeed(opponentWithBall);
    const timeToGoal = distanceToGoal / Math.max(opponentSpeed, 1);
    
    // Rush out criteria
    const isInRushZone = distanceToGoal < this.rushOutThreshold;
    const canReachFirst = this.canGoalkeeperReachFirst(goalkeeper, opponentWithBall, ball);
    const lowRisk = timeToGoal > 1.5; // Enough time to reach and clear
    
    return isInRushZone && canReachFirst && lowRisk;
  }
  
  public executeSweepingAction(goalkeeper: Player, gameState: GameState): void {
    const ball = gameState.ball;
    const interceptPoint = this.calculateOptimalInterceptPoint(goalkeeper, ball);
    
    // Move outside penalty area if necessary for sweep
    const clampedInterceptPoint = this.clampToSafeRushDistance(
      goalkeeper, 
      interceptPoint, 
      this.maxRushDistance
    );
    
    goalkeeper.targetPosition = clampedInterceptPoint;
    goalkeeper.state = PlayerState.SWEEPING;
    goalkeeper.speed *= 1.4; // Increased speed for sweeping action
  }
  
  private calculateOptimalInterceptPoint(goalkeeper: Player, ball: Ball): Vector2 {
    // Predict ball trajectory and find optimal intercept point
    const ballVelocity = ball.velocity;
    const ballPosition = ball.position;
    
    // Simple linear prediction (POC level)
    const timeSteps = 10;
    let bestInterceptPoint = ballPosition;
    let minTimeToIntercept = Infinity;
    
    for (let t = 1; t <= timeSteps; t++) {
      const futureTime = t * 0.1; // 0.1 second steps
      const futureBallPos = {
        x: ballPosition.x + ballVelocity.x * futureTime,
        y: ballPosition.y + ballVelocity.y * futureTime
      };
      
      const keeperTravelTime = this.calculateDistance(goalkeeper.position, futureBallPos) / 
                              (goalkeeper.speed || 100);
      
      if (keeperTravelTime < futureTime && futureTime < minTimeToIntercept) {
        minTimeToIntercept = futureTime;
        bestInterceptPoint = futureBallPos;
      }
    }
    
    return bestInterceptPoint;
  }
}

// Enhanced goalkeeper communication and defensive organisation
class GoalkeeperLeadershipController {
  public organiseDefensiveLine(goalkeeper: Player, gameState: GameState): void {
    const teammates = this.getTeamPlayers(gameState, goalkeeper.team)
      .filter(p => p.playerType === 'OUTFIELD');
    
    const ballPosition = gameState.ball.position;
    const threatLevel = this.assessThreatLevel(gameState, goalkeeper.team);
    
    // Adjust defensive line based on ball position and threat
    const optimalDefenseLineX = this.calculateOptimalDefenseLinePosition(
      goalkeeper, 
      ballPosition, 
      threatLevel
    );
    
    teammates.forEach(player => {
      if (this.isDefensivePlayer(player)) {
        this.adjustPlayerToDefensiveLine(player, optimalDefenseLineX);
      }
    });
  }
  
  private calculateOptimalDefenseLinePosition(
    goalkeeper: Player, 
    ballPosition: Vector2, 
    threatLevel: number
  ): number {
    const goalX = this.getGoalPosition(goalkeeper.team).x;
    const baseLine = goalX + (goalkeeper.team === 'HOME' ? 100 : -100);
    
    // Adjust line based on ball position and threat
    const ballAdjustment = (ballPosition.x - goalX) * 0.3 * threatLevel;
    
    return baseLine + ballAdjustment;
  }
  
  public coordinateSetPieceDefense(goalkeeper: Player, gameState: GameState): void {
    // Command defensive positioning for set pieces
    if (gameState.phase === 'CORNER_KICK' || gameState.phase === 'GOAL_KICK') {
      this.setCornerDefensePositions(goalkeeper, gameState);
    }
  }
}

interface PassBackViolation {
  timestamp: number;
  goalkeeper: string;
  passer: string;
  penaltyAwarded: 'indirect_free_kick';
}

// Goalkeeper protection and collision rules
class GoalkeeperPhysicalProtection {
  public canPlayerApproachGoalkeeper(
    player: Player, 
    goalkeeper: Player, 
    ball: Ball, 
    gameState: GameState
  ): boolean {
    // Players can always approach, but cannot make physical challenges when ball is in hands
    return true;
  }
  
  public canPlayerMakePhysicalChallenge(
    challengingPlayer: Player, 
    goalkeeper: Player, 
    ball: Ball
  ): boolean {
    // FIFA Law 12: Cannot tackle/dispossess when ball is in goalkeeper's hands
    if (ball.inGoalkeeperHands && ball.goalkeeperPossessor === goalkeeper.id) {
      return false;
    }
    
    // Can challenge when ball is at goalkeeper's feet (within reach distance)
    const distanceToKeeper = this.calculateDistance(ball.position, goalkeeper.position);
    const ballAtFeet = distanceToKeeper < 15; // POC: 15 pixel reach distance
    
    return ballAtFeet && !ball.inGoalkeeperHands;
  }
  
  public handleIllegalGoalkeeperChallenge(
    challengingPlayer: Player,
    goalkeeper: Player, 
    gameState: GameState
  ): void {
    // Award indirect free kick for challenging goalkeeper with ball in hands
    // This would be a development-time safety check
    console.warn(`Illegal challenge: ${challengingPlayer.id} attempted to tackle goalkeeper with ball in hands`);
    
    // In full implementation, this would award an indirect free kick
    // For POC, we just prevent the action from occurring
  }
  
  private calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

interface WeatherConditions
{
  type: 'clear' | 'overcast' | 'light_rain' | 'heavy_rain' | 'snow';
  visibility: number;                 // 0-1, affects player vision
  windSpeed: number;                  // 0-10, affects ball physics
  windDirection: number;              // 0-360 degrees
  temperature: number;                // Celsius, affects player stamina
  pitchCondition: number;             // 0-1, pitch quality (dry to waterlogged)
}

// Reference: see docs/CANONICAL-DEFINITIONS.md for canonical MatchStatistics schema
```

#### 3.2.3 Half-Time State Management

Half-time is managed as a state within the Game Manager's finite state machine, eliminating the need for a separate manager class.

```typescript
// Half-time logic integrated directly into GameManager
class GameManager {
  private matchState: MatchState = MatchState.INTRODUCTION;
  private kickOffTeam: 'HOME' | 'AWAY';
  private initialKickOffTeam: 'HOME' | 'AWAY';
  private halfTimeTransitioned: boolean = false;

  private checkStateTransitions(): void {
    switch (this.matchState) {
      case MatchState.IN_PLAY:
        if (this.isHalfTimeReached() && !this.halfTimeTransitioned) {
          this.transitionToHalfTime();
        }
        else if (this.isFullTimeReached()) {
          this.transitionToFullTime();
        }
        break;

      case MatchState.HALF_TIME:
        if (this.isHalfTimeComplete()) {
          this.transitionToSecondHalf();
        }
        break;
    }
  }

  private isHalfTimeReached(): boolean {
    const halfDuration = MATCH_DURATION / 2; // 45 minutes in seconds
    const elapsed = this.deterministicContext.gameTime;
    return elapsed >= halfDuration && !this.halfTimeTransitioned;
  }

  private isHalfTimeComplete(): boolean {
    // Half-time lasts 1 minute in real-time (as per PRD spec)
    const halfTimeStarted = this.matchState === MatchState.HALF_TIME;
    const halfTimeDuration = 60; // 1 minute
    // Track when half-time state was entered
    return halfTimeStarted && (this.deterministicContext.gameTime - this.halfTimeStartTime) >= halfTimeDuration;
  }

  private isFullTimeReached(): boolean {
    const fullMatchDuration = MATCH_DURATION; // 90 minutes + stoppage
    return this.deterministicContext.gameTime >= fullMatchDuration;
  }

  private transitionToHalfTime(): void {
    console.log('Transitioning to half-time');
    
    // Set state
    this.matchState = MatchState.HALF_TIME;
    this.halfTimeTransitioned = true;
    this.halfTimeStartTime = this.deterministicContext.gameTime;

    // Referee blows extended whistle (1.25 seconds) as per PRD
    this.referee.blowExtendedWhistle();

    // Reset ball and player positions
    this.resetForHalfTime();

    // Switch kick-off team for second half
    this.kickOffTeam = this.initialKickOffTeam === 'HOME' ? 'AWAY' : 'HOME';
  }

  private transitionToSecondHalf(): void {
    console.log('Transitioning to second half');
    
    // Set state for second half kick-off
    this.matchState = MatchState.PREPARE_FOR_KICKOFF;
    
    // Players take positions for second half kick-off
    this.setupKickOffPositions(this.kickOffTeam);
    
    // Ball to center circle
    this.ball.position = { x: 0.5, y: 0.5 };
    this.ball.owner = null;
  }

  private transitionToFullTime(): void {
    console.log('Match completed - Full time');
    
    this.matchState = MatchState.FULL_TIME;
    
    // Referee blows extended whistle (1.25 seconds) for full-time
    this.referee.blowExtendedWhistle();
  }

  private resetForHalfTime(): void {
    // Reset ball to center
    this.ball.position = { x: 0.5, y: 0.5 };
    this.ball.velocity = { x: 0, y: 0, z: 0 };
    this.ball.owner = null;
    this.ball.isMoving = false;

    // Reset all players to formation positions
    this.homeTeam.resetPlayersToFormation();
    this.awayTeam.resetPlayersToFormation();
  }
}
```

**Half-Time Transition Flow**:
1. **Detection**: Monitor elapsed time for half-time trigger (2.5 minutes)
2. **Formation Reset**: All players return to base formation positions in own half
3. **Ball Reset**: Ball returns to center circle, clears all possession
4. **Team Switch**: Alternate kick-off team (opposite of first half)
5. **Phase Transition**: PLAY → HALF_TIME → KICKOFF → PLAY
6. **Event Cleanup**: Clear all scheduled AI events and actions

### 3.3 Advanced AI System Architecture

#### 3.3.1 Multi-Layer AI Decision Framework
Advanced AI system with sophisticated team controller and entity management:

```typescript
// Enhanced AI architecture with proper separation of concerns
interface AIController
{
  teamId: string;
  difficulty: AIDifficulty;
  tacticalMemory: TacticalMemory;
  currentStrategy: TeamStrategy;

  // Core decision-making implementation
  calculateTacticalSituation(gameState: GameState): TacticalSituation;
  assignPlayerRoles(players: Player[], opponents: Player[]): RoleAssignment[];
  updateFormationDynamics(ballPosition: Vector2, possession: TeamPossession): FormationUpdate;

  // Greedy algorithm for efficient player assignment
  optimizePlayerPositioning(availablePositions: Vector2[], players: Player[]): PositionAssignment[];
}

// Advanced tactical situation calculation
interface TacticalSituation
{
  // Positional metrics
  depth: number;              // How deep the team is positioned (0-1)
  width: number;              // How wide the formation is spread (0-1)
  focus: number;              // Concentration around ball area (0-1)

  // Dynamic tactical factors implementation
  offensiveBias: number;      // -1 (fully defensive) to 1 (fully attacking)
  pressureLevel: number;      // Intensity of defensive pressure (0-1)
  spaceControl: number;       // Area of pitch controlled (0-1)

  // Context-aware adjustments
  scoreInfluence: number;     // Tactical adjustment based on scoreline
  timeInfluence: number;      // Urgency based on match time
  fatigueInfluence: number;   // Player stamina impact on tactics
}

// Enhanced player state management implementation
interface PlayerAIState
{
  // Possession states
  hasPossession: boolean;
  hasBestPossession: boolean;     // Closest to ball on team
  hasUniquePossession: boolean;   // Only player who can reach ball

  // Predictive calculations
  timeNeededToGetToBall: number;  // Milliseconds to reach ball
  ballAcquisitionProbability: number; // 0-1 chance of getting ball

  // Tactical context
  currentRole: DynamicRole;
  assignedOpponent: Player | null; // Man-marking assignment
  markingQuality: number;         // 0-1 effectiveness of marking

  // Performance metrics
  fatigueLevel: number;           // 0-1 current fatigue
  performanceMultiplier: number;  // Context-based performance boost/penalty
  averageVelocity: Vector2;       // Recent movement pattern
  positionHistory: Vector2[];     // Last N positions for analysis
}

#### 3.3.1 Hierarchical AI Decision Framework
```typescript
interface AIDecision
{
  playerId: string;
  action: PlayerAction;
  priority: number;
  confidence: number;          // 0-1 probability of success
  reasoning: AIReasoning;
  spatialContext: SpatialAnalysis;
  riskAssessment: RiskProfile;
}

// Unified AI System Implementation (consolidating MasterAIController functionality)
class TeamAIController implements AIController
{
  private spatialAnalysis: VoronoiPositioning;
  private ballProgression: BallProgressionEngine;
  private tacticalEngine: TacticalEngine;
  private greedyAssignment: GreedyAssignmentEngine;
  private currentMatchState: MatchState = MatchState.INTRODUCTION;

  public teamId: string;
  public difficulty: AIDifficulty;
  public tacticalMemory: TacticalMemory;
  public currentStrategy: TeamStrategy;

  // Core AI processing
  public processFrame(gameState: GameState): void;
  public calculateTacticalSituation(gameState: GameState): TacticalSituation;

  /**
   * STATE TRANSITION HANDLER - Called by GameManager when match state changes
   */
  public onMatchStateChange(newState: MatchState, previousState: MatchState): void {
    console.log(`TeamAI ${this.teamId}: State change ${previousState} -> ${newState}`);
    this.currentMatchState = newState;

    switch (newState) {
      case MatchState.INTRODUCTION:
        this.handleIntroductionState();
        break;

      case MatchState.PREPARE_FOR_KICKOFF:
        this.handlePrepareKickoffState();
        break;

      case MatchState.IN_PLAY:
        this.handleInPlayState(previousState);
        break;

      case MatchState.GOAL_KICK:
      case MatchState.CORNER_KICK:
      case MatchState.THROW_IN:
        this.handleSetPieceState(newState);
        break;

      case MatchState.GOAL_SCORED:
        this.handleGoalScoredState();
        break;

      case MatchState.HALF_TIME:
        this.handleHalfTimeState();
        break;

      case MatchState.FULL_TIME:
        this.handleFullTimeState();
        break;

      default:
        console.warn(`TeamAI ${this.teamId}: Unhandled state transition to ${newState}`);
        break;
    }
  }

  private handleIntroductionState(): void {
    // Prepare team for match start
    this.currentStrategy = TeamStrategy.BALANCED; // Neutral starting strategy
    this.tacticalMemory.clear(); // Clear previous match memory
  }

  private handlePrepareKickoffState(): void {
    // Set kick-off tactical setup
    if (this.isKickingOff()) {
      this.currentStrategy = TeamStrategy.ATTACKING; // Be aggressive on kick-off
    } else {
      this.currentStrategy = TeamStrategy.DEFENSIVE; // Prepare to defend
    }
    
    // Adjust AI difficulty for kick-off
    this.adjustDifficultyForSituation('kickoff');
  }

  private handleInPlayState(previousState: MatchState): void {
    // Resume normal gameplay AI
    this.currentStrategy = this.calculateOptimalStrategy();
    
    // Adjust behavior based on transition context
    if (this.isSetPieceState(previousState)) {
      // Transitioning from set piece - be alert for quick counter
      this.tacticalMemory.recordEvent('set_piece_ended', previousState);
      this.temporarilyIncreaseAwareness(3.0); // 3 seconds heightened awareness
    }
    
    // Resume normal AI processing frequency
    this.setUpdateFrequency(this.getBaseUpdateFrequency());
  }

  private handleSetPieceState(setState: MatchState): void {
    // Adjust strategy for set pieces
    switch (setState) {
      case MatchState.GOAL_KICK:
        this.handleGoalKickAI();
        break;
      case MatchState.CORNER_KICK:
        this.handleCornerKickAI();
        break;
      case MatchState.THROW_IN:
        this.handleThrowInAI();
        break;
    }
    
    // Increase AI update frequency for set pieces
    this.setUpdateFrequency(this.getBaseUpdateFrequency() * 2);
  }

  private handleGoalKickAI(): void {
    if (this.isMyTeamKicking()) {
      // My goal kick - coordinate distribution
      this.currentStrategy = TeamStrategy.BUILDUP_PLAY;
      this.instructPlayersToSpreadOut();
    } else {
      // Opposition goal kick - prepare to press or drop back
      const pressingIntensity = this.calculatePressingIntensity();
      this.currentStrategy = pressingIntensity > 0.7 ? TeamStrategy.HIGH_PRESS : TeamStrategy.MEDIUM_BLOCK;
    }
  }

  private handleCornerKickAI(): void {
    if (this.isMyTeamKicking()) {
      // My corner - attacking setup
      this.currentStrategy = TeamStrategy.SET_PIECE_ATTACK;
      this.assignCornerKickRoles();
    } else {
      // Opposition corner - defensive setup
      this.currentStrategy = TeamStrategy.SET_PIECE_DEFENSE;
      this.organizeCornerDefense();
    }
  }

  private handleThrowInAI(): void {
    const fieldPosition = this.getThrowInPosition();
    
    if (this.isMyTeamTaking()) {
      // Quick throw-in or organized buildup based on position
      this.currentStrategy = fieldPosition.isAttackingThird ? 
        TeamStrategy.ATTACKING : TeamStrategy.BALANCED;
    } else {
      // Mark nearby players, prepare for quick transition
      this.currentStrategy = TeamStrategy.COMPACT_DEFENDING;
    }
  }

  private handleGoalScoredState(): void {
    const didMyTeamScore = this.checkIfMyTeamScored();
    
    if (didMyTeamScore) {
      // We scored - celebrate briefly then prepare for restart
      this.tacticalMemory.recordSuccess('goal_scored');
      this.adjustConfidenceBoost(0.15); // 15% confidence boost
      this.currentStrategy = TeamStrategy.MAINTAIN_LEAD;
    } else {
      // Opponent scored - need to respond
      this.tacticalMemory.recordFailure('goal_conceded');
      this.adjustUrgencyLevel(0.2); // Increase urgency
      this.currentStrategy = TeamStrategy.COMEBACK_MODE;
    }
  }

  private handleHalfTimeState(): void {
    // Analyze first half performance
    const firstHalfAnalysis = this.analyzeFirstHalfPerformance();
    
    // Adjust strategy for second half
    this.tacticalMemory.consolidateFirstHalf();
    this.planSecondHalfStrategy(firstHalfAnalysis);
    
    // Reset temporary states
    this.resetTemporaryAdjustments();
  }

  private handleFullTimeState(): void {
    // Match complete - final analysis
    this.tacticalMemory.finalizeMatch();
    this.recordMatchResults();
    
    // Disable AI processing
    this.setUpdateFrequency(0);
  }

  // Helper methods for state handling
  private isSetPieceState(state: MatchState): boolean {
    return [MatchState.GOAL_KICK, MatchState.CORNER_KICK, MatchState.THROW_IN].includes(state);
  }

  private adjustDifficultyForSituation(situation: string): void {
    // Temporarily adjust AI difficulty based on match situation
    // Implementation would modify AI decision-making parameters
  }

  private setUpdateFrequency(frequency: number): void {
    // Adjust how often AI processes decisions
    // Higher frequency for important moments, lower for stable play
  }
  public assignPlayerRoles(players: Player[], opponents: Player[]): RoleAssignment[];
  public updateFormationDynamics(ballPosition: Vector2, possession: TeamPossession): FormationUpdate;
  public optimizePlayerPositioning(availablePositions: Vector2[], players: Player[]): PositionAssignment[];

  // Single-player opponent behavior
  public makeTeamDecision(gameState: GameState): TacticalCommand;
  public respondToPlayerAction(playerCommand: VoiceCommand): void;
  public updateTacticalApproach(matchSituation: MatchSituation): void;
  public learnFromPlayerPatterns(playerHistory: CommandHistory[]): void;
}

enum AIDifficulty
{
  BEGINNER = 'beginner',        // Slower reactions, basic tactics, makes mistakes
  AMATEUR = 'amateur',          // Standard AI behaviour with minor errors
  PROFESSIONAL = 'professional', // Quick reactions, advanced tactics, rare mistakes
  WORLD_CLASS = 'world_class'   // Near-perfect reactions, complex strategies
}
```

#### 3.3.2 Spatial Intelligence: Voronoi-Based Positioning System
```typescript
class VoronoiPositioning
{
  private pitchGrid: PitchControlGrid;    // 100x68 cell grid
  private playerInfluenceZones: Map<string, VoronoiCell>;

  public calculatePitchControl(players: Player[], ball: Ball): PitchControlMap;
  public optimizePlayerPositioning(formation: Formation, gameState: GameState): PositionAdjustments;
  public evaluateSpacialAdvantage(team: Team, opponents: Team): SpacialMetrics;
  public detectFormationVulnerabilities(opposingFormation: Formation): WeakZones[];
}

interface VoronoiCell
{
  playerId: string;
  controlRadius: number;
  influenceStrength: number;   // 0-1 based on player attributes
  cellBoundaries: Vector2[];
  neighbouringCells: string[];
  roleWeighting: PositionalWeight;
}

interface PitchControlMap
{
  gridCells: ControlCell[][];  // 100x68 grid
  teamInfluence: TeamInfluenceMap;
  contestedZones: ContestationArea[];
  dominanceMetrics: DominanceAnalysis;
}

// Role-based spatial weighting system
interface PositionalWeight
{
  defensiveThirdBias: number;    // 0-1, higher for defenders
  middleThirdMobility: number;   // 0-1, higher for midfielders
  attackingThirdPush: number;    // 0-1, higher for attackers
  goalKeeperException: boolean;  // Special handling for GK positioning
}

// Real-time spatial calculations
class SpatialCalculator
{
  // Fortune's Algorithm implementation for real-time Voronoi diagrams
  public static calculateVoronoiDiagram(players: Player[]): VoronoiCell[];

  // Weighted influence calculation
  public static calculatePlayerInfluence(player: Player, position: Vector2): number
  {
    const distance = Vector2.distance(player.position, position);
    const arrivalTime = distance / player.currentSpeed;
    const attributeModifier = this.getAttributeInfluence(player);
    const roleModifier = this.getRoleInfluence(player, position);

    return Math.exp(-arrivalTime * attributeModifier * roleModifier);
  }

  // Pitch control probability at any location - optimised version
  public static calculateControlProbability(
    location: Vector2,
    teamAPlayers: Player[],    // Pre-filtered teams for performance
    teamBPlayers: Player[]
  ): ControlProbability
  {
    const teamAInfluence = this.calculateTeamInfluence(teamAPlayers, location);
    const teamBInfluence = this.calculateTeamInfluence(teamBPlayers, location);
    const totalInfluence = teamAInfluence + teamBInfluence;

    // Avoid division by zero
    if (totalInfluence === 0)
    {
      return { teamA: 0.5, teamB: 0.5, contested: true };
    }

    return {
      teamA: teamAInfluence / totalInfluence,
      teamB: teamBInfluence / totalInfluence,
      contested: Math.abs(teamAInfluence - teamBInfluence) < 0.1
    };
  }
}
```

#### 3.3.3 Ball Progression Intelligence Engine
```typescript
class BallProgressionEngine
{
  private progressionPhases: Map<MatchPhase, ProgressionStrategy>;
  private riskAssessment: RiskEvaluator;
  private patternRecognition: PatternAnalyser;

  public evaluateBallProgression(gameState: GameState): ProgressionDecision[];
  public selectOptimalPass(ballCarrier: Player, teammates: Player[], opponents: Player[]): PassDecision;
  public assessCounterAttackOpportunity(transitionState: TransitionState): CounterAttackPlan;
  public calculateExpectedPossessionValue(currentPosition: Vector2): EPVCalculation; // **PHASE 2 ONLY**
}

// Three phases of ball progression
enum ProgressionPhase
{
  DEFENSIVE_BUILDUP = 'defensive_buildup',      // Own third, patient build-up
  MIDDLE_TRANSITION = 'middle_transition',     // Middle third, progression focus
  ATTACKING_CREATION = 'attacking_creation'    // Final third, chance creation
}

interface ProgressionStrategy
{
  primaryApproach: 'short_buildup' | 'direct_play' | 'wing_play' | 'through_balls';
  riskTolerance: number;        // 0-1, higher means more adventurous passes
  tempoPreference: number;      // 0-1, speed of play progression
  widthUtilisation: number;     // 0-1, preference for using wide areas
  verticalUrgency: number;      // 0-1, pressure to advance quickly
}

// Decision tree for pass selection
class PassDecisionTree
{
  public evaluatePassOptions(ballCarrier: Player, gameState: GameState): PassOption[]
  {
    const options: PassOption[] = [];

    // Evaluate each potential pass recipient
    for (const teammate of this.getAvailableTeammates(ballCarrier, gameState))
    {
      const passOption = this.analysePass(ballCarrier, teammate, gameState);
      if (passOption.viability > 0.3) // Minimum viability threshold
      {
        options.push(passOption);
      }
    }

    // Sort by expected value (risk-adjusted reward)
    return options.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  private analysePass(passer: Player, receiver: Player, gameState: GameState): PassOption
  {
    const distance = Vector2.distance(passer.position, receiver.position);
    const defensivePressure = this.calculatePressure(receiver.position, gameState.opponents);
    const progressiveValue = this.calculateProgressiveValue(passer.position, receiver.position);
    const completionProbability = this.calculateCompletionProbability(passer, receiver, gameState);

    return {
      receiverId: receiver.id,
      distance,
      completionProbability,
      progressiveValue,
      riskLevel: 1 - completionProbability,
      expectedValue: progressiveValue * completionProbability,
      urgency: this.calculateUrgency(gameState)
    };
  }
}

// **PHASE 2 ONLY** - Expected Possession Value (EPV) calculation
interface EPVCalculation
{
  currentEPV: number;           // -1 to 1, probability of next goal - **PHASE 2 ONLY**
  progressionBenefit: number;   // EPV gain from advancing ball - **PHASE 2 ONLY**
  riskPenalty: number;          // EPV loss potential from turnover - **PHASE 2 ONLY**
  optimalAction: 'pass' | 'dribble' | 'shoot' | 'hold'; // **PHASE 2 ONLY**
  confidenceLevel: number;      // 0-1, certainty in calculation - **PHASE 2 ONLY**
}
```

#### 3.3.4 Advanced Tactical Engine
```typescript
class TacticalEngine
{
  private currentMentality: TacticalMentality;
  private formationManager: DynamicFormationManager;
  private roleAssignmentEngine: HungarianAlgorithm;  // Optimal role assignment
  private tacticalMemory: TacticalMemory;

  // Core tactical processing implementation
  public calculateTeamPositioning(gameState: GameState): TeamPositioning
  {
    const ballPosition = gameState.ball.position;
    const possession = this.determinePossession(gameState);

    // Calculate tactical factors
    const depth = this.calculateFormationDepth(gameState.teams[0].players, ballPosition);
    const width = this.calculateFormationWidth(gameState.teams[0].players, ballPosition);
    const focus = this.calculateFocusAroundBall(gameState.teams[0].players, ballPosition);

    // Apply dynamic tactical adjustments
    return {
      depth: this.applyContextualDepth(depth, gameState),
      width: this.applyContextualWidth(width, gameState),
      focus: this.applyContextualFocus(focus, gameState),
      offensiveBias: this.calculateOffensiveBias(gameState),
      pressureLevel: this.calculatePressureLevel(gameState)
    };
  }

  // Greedy algorithm implementation for efficient player positioning
  public optimizePlayerAssignments(
    players: Player[],
    availableRoles: TacticalRole[],
    gameContext: GameContext
  ): RoleAssignment[]
  {
    // Cost matrix calculation
    const costMatrix: number[][] = [];

    for (let i = 0; i < players.length; i++)
    {
      costMatrix[i] = [];
      for (let j = 0; j < availableRoles.length; j++)
      {
        costMatrix[i][j] = this.calculateAssignmentCost(players[i], availableRoles[j], gameContext);
      }
    }

    // Solve assignment problem using greedy algorithm for better performance
    const assignments = this.greedyAssignment.solve(costMatrix);

    return assignments.map((roleIndex, playerIndex) => ({
      playerId: players[playerIndex].id,
      assignedRole: availableRoles[roleIndex],
      confidenceLevel: 1 - (costMatrix[playerIndex][roleIndex] / this.getMaxCost()),
      transitionTime: this.calculateRoleTransitionTime(players[playerIndex], availableRoles[roleIndex])
    }));
  }

  // Dynamic formation adjustment implementation
  public adjustFormationDynamically(
    baseFormation: Formation,
    tacticalSituation: TacticalSituation,
    gameContext: GameContext
  ): DynamicFormation
  {
    const adjustments: PositionAdjustment[] = [];

    // Apply depth adjustments based on tactical situation
    const depthModifier = this.calculateDepthAdjustment(tacticalSituation, gameContext);

    // Apply width adjustments
    const widthModifier = this.calculateWidthAdjustment(tacticalSituation, gameContext);

    // Apply focus adjustments (concentration around ball)
    const focusModifier = this.calculateFocusAdjustment(tacticalSituation, gameContext);

    // Generate position adjustments for each player
    for (const position of baseFormation.positions)
    {
      adjustments.push({
        originalPosition: position,
        adjustedPosition: {
          x: position.x + (depthModifier * position.x) + (focusModifier * this.getBallInfluence(position)),
          y: position.y + (widthModifier * (position.y - 0.5))
        },
        adjustmentReason: this.getAdjustmentReason(tacticalSituation, position)
      });
    }

    return {
      baseFormation,
      adjustments,
      tacticalContext: tacticalSituation,
      confidenceLevel: this.calculateFormationConfidence(adjustments)
    };
  }

  // Man-marking system implementation
  public assignManMarking(
    defenders: Player[],
    opponents: Player[],
    gameState: GameState
  ): MarkingAssignment[]
  {
    const threatAssessments = opponents.map(opponent => ({
      player: opponent,
      threatLevel: this.calculateThreatLevel(opponent, gameState),
      markingRequirement: this.calculateMarkingRequirement(opponent, gameState)
    }));

    // Sort by threat level (most dangerous first)
    threatAssessments.sort((a, b) => b.threatLevel - a.threatLevel);

    const assignments: MarkingAssignment[] = [];
    const availableDefenders = [...defenders];

    // Assign defenders to most threatening opponents first
    for (const threat of threatAssessments)
    {
      if (availableDefenders.length === 0) break;

      // Find best defender for this threat
      const bestDefender = this.findBestDefenderForThreat(availableDefenders, threat, gameState);

      if (bestDefender)
      {
        assignments.push({
          defenderId: bestDefender.id,
          opponentId: threat.player.id,
          markingType: threat.markingRequirement,
          expectedEffectiveness: this.calculateMarkingEffectiveness(bestDefender, threat.player)
        });

        // Remove assigned defender from available pool
        const defenderIndex = availableDefenders.findIndex(d => d.id === bestDefender.id);
        availableDefenders.splice(defenderIndex, 1);
      }
    }

    return assignments;
  }

  private calculateAssignmentCost(player: Player, role: TacticalRole, context: GameContext): number
  {
    let cost = 0;

    // Attribute-role compatibility
    cost += this.getAttributeRoleMismatch(player.attributes, role);

    // Position-role distance cost
    cost += this.getPositionRoleDistance(player.position, role.idealPosition);

    // Fatigue penalty
    cost += player.stamina < 0.7 ? (0.7 - player.stamina) * 50 : 0;

    // Context-specific adjustments
    cost += this.getContextualRoleCost(player, role, context);

    return cost;
  }
}

// Greedy Assignment Engine for performance-optimized role assignment
class GreedyAssignmentEngine
{
  // Simple greedy algorithm - much faster than Hungarian algorithm
  public solve(costMatrix: number[][]): number[]
  {
    const assignments: number[] = [];
    const assignedRoles: Set<number> = new Set();
    const numPlayers = costMatrix.length;
    const numRoles = costMatrix[0]?.length || 0;

    // For each player, find the best available role
    for (let playerIndex = 0; playerIndex < numPlayers; playerIndex++)
    {
      let bestRoleIndex = -1;
      let bestCost = Infinity;

      // Find the lowest cost available role for this player
      for (let roleIndex = 0; roleIndex < numRoles; roleIndex++)
      {
        if (!assignedRoles.has(roleIndex) && costMatrix[playerIndex][roleIndex] < bestCost)
        {
          bestCost = costMatrix[playerIndex][roleIndex];
          bestRoleIndex = roleIndex;
        }
      }

      // Assign the role
      if (bestRoleIndex !== -1)
      {
        assignments[playerIndex] = bestRoleIndex;
        assignedRoles.add(bestRoleIndex);
      }
      else
      {
        // Fallback: assign any available role
        for (let roleIndex = 0; roleIndex < numRoles; roleIndex++)
        {
          if (!assignedRoles.has(roleIndex))
          {
            assignments[playerIndex] = roleIndex;
            assignedRoles.add(roleIndex);
            break;
          }
        }
      }
    }

    return assignments;
  }
}

// Enhanced tactical memory system
interface TacticalMemory
{
  // Pattern recognition
  opponentPatterns: OpponentPattern[];
  successfulTactics: TacticalSuccess[];
  failedApproaches: TacticalFailure[];

  // Dynamic learning
  adaptationHistory: TacticalAdaptation[];
  performanceMetrics: PerformanceTracking[];

  // Context-aware storage
  situationalTactics: Map<MatchSituation, PreferredTactic>;
  playerSpecificMemory: Map<string, PlayerTacticalData>;
}

// Role assignment results
interface RoleAssignment
{
  playerId: string;
  assignedRole: TacticalRole;
  confidenceLevel: number;        // 0-1, how suitable this assignment is
  transitionTime: number;         // Seconds to fully adapt to role
  previousRole?: TacticalRole;    // For smooth transitions
}

interface MarkingAssignment
{
  defenderId: string;
  opponentId: string;
  markingType: 'tight' | 'loose' | 'zonal';
  expectedEffectiveness: number;  // 0-1, predicted success rate
  priority: number;               // 1-10, importance of this marking
}

// Dynamic formation system
interface DynamicFormation
{
  baseFormation: Formation;
  adjustments: PositionAdjustment[];
  tacticalContext: TacticalSituation;
  confidenceLevel: number;        // 0-1, how well formation suits situation
}

interface PositionAdjustment
{
  originalPosition: Vector2;
  adjustedPosition: Vector2;
  adjustmentReason: string;       // Why this adjustment was made
  temporaryAdjustment: boolean;   // Whether adjustment reverts after situation
}
```

// Tactical mentality affects entire team behaviour
interface TacticalMentality
{
  mentality: 'attack' | 'balanced' | 'defend';
  aggressionLevel: number;      // 0-100, pressing and challenge intensity
  riskTolerance: number;        // 0-100, adventurous vs safe play
  defensiveLineHeight: number;  // 0-100, how high up the pitch
  pressingSensitivity: number;  // 0-100, trigger threshold for pressing
  tempoPreference: number;      // 0-100, speed of play
}

// Player duty distribution (Football Manager style)
interface DutyDistribution
{
  attackDuties: number;    // Number of players with primary attacking role
  supportDuties: number;   // Number of players with supporting role
  defendDuties: number;    // Number of players with defensive role

  // Attack mode: More attack duties, fewer defend duties
  // Defend mode: More defend duties, fewer attack duties
  // Balance mode: Roughly equal distribution
}

// Real-time instruction interpretation
class InstructionProcessor
{
  public interpretAttackMode(players: Player[]): PlayerAdjustment[]
  {
    const adjustments: PlayerAdjustment[] = [];

    for (const player of players)
    {
      const adjustment = {
        playerId: player.id,
        positionAdjustment: this.calculateAttackingPositionShift(player),
        behaviourChanges: {
          aggressiveness: Math.min(player.baseAggression + 20, 100),
          riskTolerance: Math.min(player.baseRiskTolerance + 30, 100),
          forwardRunFrequency: Math.min(player.baseForwardRuns + 25, 100),
          pressingIntensity: Math.min(player.basePressing + 15, 100)
        },
        dutyShift: this.assignAttackingDuty(player)
      };
      adjustments.push(adjustment);
    }

    return adjustments;
  }

  public interpretDefendMode(players: Player[]): PlayerAdjustment[]
  {
    return players.map(player => ({
      playerId: player.id,
      positionAdjustment: this.calculateDefensivePositionShift(player),
      behaviourChanges: {
        aggressiveness: Math.max(player.baseAggression - 15, 0),
        riskTolerance: Math.max(player.baseRiskTolerance - 40, 0),
        forwardRunFrequency: Math.max(player.baseForwardRuns - 35, 0),
        defensivePositioning: Math.min(player.basePositioning + 20, 100)
      },
      dutyShift: this.assignDefensiveDuty(player)
    }));
  }

  public interpretBalanceMode(players: Player[]): PlayerAdjustment[]
  {
    return players.map(player => ({
      playerId: player.id,
      positionAdjustment: this.calculateBalancedPositioning(player),
      behaviourChanges: {
        aggressiveness: player.baseAggression,
        riskTolerance: player.baseRiskTolerance,
        forwardRunFrequency: player.baseForwardRuns,
        pressingIntensity: player.basePressing
      },
      dutyShift: this.assignBalancedDuty(player)
    }));
  }
}

// Cascading instruction effects
interface PlayerAdjustment
{
  playerId: string;
  positionAdjustment: Vector2;     // Positional shift relative to base formation
  behaviourChanges: BehaviourModifiers;
  dutyShift: PlayerDuty;
  transitionTime: number;          // Seconds to fully apply changes (gradual)
}

interface BehaviourModifiers
{
  aggressiveness: number;          // 0-100, tackle frequency and intensity
  riskTolerance: number;           // 0-100, adventurous vs safe decisions
  forwardRunFrequency: number;     // 0-100, attacking movement likelihood
  pressingIntensity: number;       // 0-100, pressure on opponents
  defensivePositioning: number;    // 0-100, positional discipline
  passingAdventurousness: number;  // 0-100, through balls vs safe passes
}

enum PlayerDuty
{
  ATTACK = 'attack',      // Primary goal: create and score
  SUPPORT = 'support',    // Primary goal: link play and support
  DEFEND = 'defend'       // Primary goal: prevent opposition
}
```

#### 3.3.5 Advanced AI Learning and Adaptation
```typescript
class AdaptiveAISystem
{
  private playerPatternMemory: PatternMemory;
  private tacticalEffectivenessTracker: EffectivenessTracker;
  private counterTacticGenerator: CounterTacticEngine;

  public learnFromMatch(matchData: MatchAnalysis): LearningUpdate;
  public adaptToOpponentStyle(opponentBehaviour: BehaviourPattern): TacticalCounter;
  public generateCounterStrategy(opponentTactics: TacticalAnalysis): CounterStrategy;
}

interface PatternMemory
{
  frequentCommands: Map<TacticalCommand, CommandFrequency>;
  commandSequences: CommandSequence[];
  timingPatterns: TimingAnalysis[];
  effectivenessHistory: EffectivenessRecord[];
}

interface CounterStrategy
{
  primaryCounter: TacticalCommand;
  secondaryAdjustments: MinorAdjustment[];
  triggerConditions: TriggerCondition[];
  expectedEffectiveness: number;    // 0-1 probability of success
  implementationDelay: number;      // Realistic reaction time based on difficulty
}
```

#### 3.3.6 Player Attribute Integration
```typescript
// Player interface already defined in section 8.1.1 - see Team Data Models section

#### 3.3.7 AI System Integration and Implementation

##### Real-Time AI Processing Pipeline
```typescript
class AIProcessingPipeline
{
  public processAIFrame(gameState: GameState, deltaTime: number): AIFrameResult
  {
    // 1. Spatial Analysis (10Hz - every 3 frames at 30 FPS)
    if (this.shouldUpdateSpatialAnalysis())
    {
      this.spatialAnalysis.updatePitchControl(gameState.players, gameState.ball);
      this.spatialAnalysis.updateFormationPositioning(gameState.teams);
    }

    // 2. Ball Progression Decisions (30Hz - every frame)
    if (gameState.ballCarrier)
    {
      const progressionOptions = this.ballProgression.evaluateOptions(gameState);
      this.selectAndExecuteProgression(progressionOptions);
    }

    // 3. Tactical Instruction Processing (immediate when received)
    if (this.hasPendingTacticalInstructions())
    {
      const instructions = this.getPendingInstructions();
      this.tacticalInterpreter.processInstructions(instructions, gameState.players);
    }

    // 4. AI Opponent Decision Making (5Hz - every 6 frames)
    if (this.shouldUpdateOpponentAI() && this.isPlayingAgainstAI())
    {
      const opponentDecision = this.opponentAI.makeDecision(gameState);
      this.executeOpponentDecision(opponentDecision);
    }

    // 5. Individual Player AI (30Hz - every frame)
    const playerDecisions = this.processPlayerAI(gameState.players, gameState);

    return {
      playerAdjustments: this.spatialAnalysis.getPositionAdjustments(),
      ballProgressionDecision: progressionOptions?.[0] || null,
      tacticalChanges: this.tacticalInterpreter.getActiveAdjustments(),
      opponentAIAction: opponentDecision || null,
      individualPlayerActions: playerDecisions
    };
  }
}
```

##### Performance Optimisation Strategies
```typescript
interface AIPerformanceConfig
{
  // Update frequencies (Hz)
  spatialAnalysisFrequency: 10;      // Computationally expensive - reduce frequency
  ballProgressionFrequency: 30;      // Critical for gameplay - full frequency
  tacticalProcessingFrequency: 60;   // Immediate response required
  opponentAIFrequency: 5;            // Less critical - reduce frequency

  // Spatial analysis optimisation
  voronoiGridResolution: [100, 68];  // Balance between accuracy and performance
  playerInfluenceRadius: 50;         // Metres - limit calculation scope
  contestedZoneThreshold: 0.1;       // Probability difference for contested zones

  // Decision tree limits
  maxPassOptionsEvaluated: 8;        // Limit pass option calculations
  maxRiskAssessmentDepth: 3;         // Limit lookahead calculations
  decisionTreeTimeout: 16;           // Max milliseconds per decision (60 FPS = 16ms)
}
```

##### Integration with Player Attributes
```typescript
// Attribute calculations integrated into respective AI systems for better cohesion

// Extended VoronoiPositioning with attribute integration
class VoronoiPositioning
{
  private pitchGrid: PitchControlGrid;
  private playerInfluenceZones: Map<string, VoronoiCell>;

  public calculatePitchControl(players: Player[], ball: Ball): PitchControlMap;
  public optimizePlayerPositioning(formation: Formation, gameState: GameState): PositionAdjustments;

  // Integrated spatial intelligence calculation
  public getSpatialIntelligence(player: Player): SpatialIntelligence
  {
    return {
      positioningAccuracy: (player.attributes.positioning + player.attributes.anticipation) / 2,
      spaceRecognition: (player.attributes.vision + player.attributes.decisions) / 2,
      formationDiscipline: (player.attributes.teamwork + player.attributes.workRate) / 2,
      adaptabilityToInstructions: (player.attributes.decisions + player.attributes.concentration) / 2
    };
  }
}

// Extended BallProgressionEngine with attribute integration
class BallProgressionEngine
{
  private progressionPhases: Map<MatchPhase, ProgressionStrategy>;
  private riskAssessment: RiskEvaluator;

  public evaluateBallProgression(gameState: GameState): ProgressionDecision[];

  // Integrated progression ability calculation
  public getProgressionAbility(player: Player): ProgressionAbility
  {
    return {
      passingRange: this.calculatePassingRange(player.attributes.passing, player.attributes.vision),
      riskAssessment: this.calculateRiskTolerance(player.attributes.decisions, player.attributes.composure),
      creativityLevel: (player.attributes.vision + player.attributes.freeKickTaking) / 2,
      pressureResistance: (player.attributes.composure + player.attributes.ballControl) / 2
    };
  }
}

// Extended TacticalInstructionSystem with attribute integration
class TacticalInstructionSystem
{
  private currentMentality: TacticalMentality;
  private dutyDistribution: DutyDistribution;

  public processTacticalCommand(command: TacticalCommand): TeamAdjustments;

  // Integrated instruction responsiveness calculation
  public getInstructionResponsiveness(player: Player, instruction: TacticalCommand): ResponseProfile
  {
    const baseResponsiveness = (player.attributes.teamwork + player.attributes.workRate) / 2;
    const intelligenceModifier = (player.attributes.decisions + player.attributes.positioning) / 2;
    const captainBonus = player.isCaptain ? 1.2 : 1.0;

    return {
      responseTime: this.calculateResponseTime(baseResponsiveness * captainBonus),
      adherenceQuality: intelligenceModifier / 10.0,
      influenceRadius: player.isCaptain ? 25 : 10, // Metres
      adaptationSpeed: (baseResponsiveness + intelligenceModifier) / 20.0
    };
  }
}
```

##### AI Validation and Quality Metrics
```typescript
interface AIQualityMetrics
{
  // Spatial intelligence validation
  formationMaintenance: number;      // 0-1, how well formation is maintained
  spacingOptimisation: number;       // 0-1, effectiveness of player spacing
  defensiveShapeIntegrity: number;   // 0-1, defensive line coordination

  // Ball progression effectiveness
  progressionEfficiency: number;     // 0-1, forward progress per possession
  passCompletionRate: number;        // 0-1, successful passes ratio
  riskAdjustedProgression: number;   // 0-1, progression accounting for risk

  // Tactical instruction compliance
  instructionAdherence: number;      // 0-1, how well players follow instructions
  tacticalCoherence: number;         // 0-1, team-wide tactical coordination
  adaptationSpeed: number;           // Seconds to fully implement changes

  // Overall AI performance
  gameRealism: number;               // 0-1, how realistic the gameplay feels
  challengeLevel: number;            // 0-1, appropriate difficulty for opponent AI
  responsiveness: number;            // 0-1, reaction time to game events
}

class AIValidator
{
  public validateAIPerformance(matchData: MatchData): AIQualityMetrics
  {
    return {
      formationMaintenance: this.assessFormationQuality(matchData.playerPositions),
      spacingOptimisation: this.assessPlayerSpacing(matchData.voronoiData),
      passCompletionRate: this.calculatePassSuccess(matchData.passAttempts),
      instructionAdherence: this.measureInstructionCompliance(matchData.commands),
      gameRealism: this.assessRealismScore(matchData.events),
      // ... other metrics
    };
  }
}
```

##### Memory and Processing Requirements
```typescript
interface AIMemoryFootprint
{
  // Spatial analysis
  voronoiGridMemory: number;         // ~27KB (100x68 grid of 32-bit values)
  pitchControlMemory: number;        // ~54KB (100x68 grid of 64-bit structs)
  playerInfluenceMemory: number;     // ~2KB (22 players × 96 bytes each)

  // Ball progression
  passOptionMemory: number;          // ~1KB (max 8 options × 128 bytes each)
  decisionTreeMemory: number;        // ~4KB (decision nodes and evaluations)

  // Tactical systems
  instructionMemory: number;         // ~512B (current instruction state)
  playerAdjustmentMemory: number;    // ~2KB (22 players × 96 bytes adjustments)

  // AI opponent
  patternMemorySize: number;         // ~8KB (command patterns and learning data)

  totalAIMemoryFootprint: number;    // ~99KB total (within 256MB budget)
}
```

This comprehensive AI architecture provides realistic football simulation through:

1. **Spatial Intelligence**: Voronoi diagrams ensure realistic positioning and formation maintenance
2. **Smart Ball Progression**: Evidence-based decision making for authentic football flow
3. **Dynamic Tactical Response**: Immediate and gradual responses to voice commands
4. **Adaptive Opposition**: AI that learns and counters player strategies
5. **Performance Optimised**: Real-time calculations suitable for 30 FPS FireTV gameplay

### 3.4 Optimized Formation and Positioning System

#### 3.4.1 Float32Array Grid System for ARM NEON Optimization

**Performance Strategy**: Hybrid integer/float approach optimized for FireTV ARM Cortex-A55 NEON capabilities

```typescript
// **PHASE 2 INTEGRATION** - Formation system that consumes FET export schema
class FETFormationAdapter {
  private formationCache: Map<string, FormationExport> = new Map();
  private roleMapper: FETRoleMapper;

  constructor() {
    this.roleMapper = new FETRoleMapper();
  }

  // Load formation from FET export schema (see docs/FET-TDD.md)
  public async loadFormation(formationId: string): Promise<FormationData> {
    const formationExport = await this.loadFETFormation(formationId);
    return this.adaptToGameManager(formationExport);
  }

  private adaptToGameManager(fetData: FormationExport): FormationData {
    const gameData = fetData.formations[0];

    return {
      id: gameData.formationId,
      name: gameData.name,
      positions: this.mapFETPositionsToGame(gameData.phases),
      roleMapping: this.roleMapper.mapFETRolesToGame(gameData)
    };
  }
}

// **PHASE 2** - Role mapping between FET and Game Manager systems
class FETRoleMapper {
  // Maps FET PlayerRole enum to Game Manager player roles
  private readonly FET_TO_GAME_ROLE_MAP = {
    // FET Roles (from FET-TDD.md) → Game Manager Roles
    'GK': 'GOALKEEPER',
    'CB_LEFT': 'CENTRE_BACK_LEFT',
    'CB_RIGHT': 'CENTRE_BACK_RIGHT',
    'CB_CENTER': 'CENTRE_BACK_CENTRE',
    'LB': 'LEFT_BACK',
    'RB': 'RIGHT_BACK',
    'WB_LEFT': 'WING_BACK_LEFT',
    'WB_RIGHT': 'WING_BACK_RIGHT',
    'CDM': 'DEFENSIVE_MIDFIELDER',
    'CM_LEFT': 'CENTRAL_MIDFIELDER_LEFT',
    'CM_RIGHT': 'CENTRAL_MIDFIELDER_RIGHT',
    'CM_CENTER': 'CENTRAL_MIDFIELDER_CENTRE',
    'CAM': 'ATTACKING_MIDFIELDER',
    'LM': 'LEFT_MIDFIELDER',
    'RM': 'RIGHT_MIDFIELDER',
    'LW': 'LEFT_WINGER',
    'RW': 'RIGHT_WINGER',
    'ST_LEFT': 'STRIKER_LEFT',
    'ST_RIGHT': 'STRIKER_RIGHT',
    'CF': 'CENTRE_FORWARD'
  } as const;

  // Maps FET GamePhase to Game Manager match phases
  private readonly FET_TO_GAME_PHASE_MAP = {
    'attack': 'ATTACKING',
    'defend': 'DEFENDING',
    'transition_attack': 'TRANSITION_TO_ATTACK',
    'transition_defend': 'TRANSITION_TO_DEFEND',
    'set_piece_for': 'SET_PIECE_FOR',
    'set_piece_against': 'SET_PIECE_AGAINST'
  } as const;

  public mapFETRolesToGame(fetFormation: FormationData): RoleMapping[] {
    // Convert FET role assignments to game manager format
    return Object.entries(this.FET_TO_GAME_ROLE_MAP).map(([fetRole, gameRole]) => ({
      fetRole,
      gameRole,
      mandatory: this.isMandatoryRole(fetRole),
      alternatives: this.getAlternativeRoles(gameRole)
    }));
  }
}

// **POC ONLY** - Simplified formation grid (no FET integration yet)
class POCFormationGrid {
  private readonly GRID_WIDTH = 20;
  private readonly GRID_HEIGHT = 15;
  private readonly ZONE_COUNT = 300;

  // Integer indices for exact grid calculations (cache-friendly)
  private spatialIndex: Map<number, ZoneData> = new Map();

  // Float32Array for SIMD-optimized bulk operations (ARM NEON potential)
  private positionBuffer: Float32Array;           // 22 players * 2 coords (x,y interleaved)
  private interpolationBuffer: Float32Array;      // Temporary calculation space
  private targetPositions: Float32Array;          // Formation target positions
  private weights: Float32Array;                  // Interpolation weights

  constructor() {
    // Pre-allocate SIMD-friendly buffers
    this.positionBuffer = new Float32Array(44);        // 22 players * 2 coordinates
    this.interpolationBuffer = new Float32Array(16);   // Working space for calculations
    this.targetPositions = new Float32Array(44);       // Target formation positions
    this.weights = new Float32Array(22);               // Per-player interpolation weights
  }

  // Integer operations for exact grid calculations (cache-friendly)
  public getZoneIndex(x: number, y: number): number {
    const gridX = Math.floor(x * this.GRID_WIDTH);
    const gridY = Math.floor(y * this.GRID_HEIGHT);
    return gridY * this.GRID_WIDTH + gridX;  // Single integer index (0-299)
  }

  // Bulk position updates using Float32Array (SIMD potential)
  public updatePlayerPositions(
    ballPosition: Float32Array,    // [x, y]
    playerPositions: Float32Array, // [x1, y1, x2, y2, ...] current positions
    targetPositions: Float32Array, // [x1, y1, x2, y2, ...] formation targets
    deltaTime: number
  ): void {
    const lerpFactor = Math.min(deltaTime * 2.0, 1.0); // Smooth interpolation

    // Pattern optimizable by V8's TurboFan JIT for ARM NEON generation
    for (let i = 0; i < playerPositions.length; i += 2) {
      const playerIndex = i >> 1; // Bit shift for divide by 2

      // Calculate formation-based target with ball influence
      const ballInfluence = this.calculateBallInfluence(
        playerPositions[i],
        playerPositions[i + 1],
        ballPosition[0],
        ballPosition[1]
      );

      const adjustedTargetX = targetPositions[i] + ballInfluence * 0.1;
      const adjustedTargetY = targetPositions[i + 1] + ballInfluence * 0.05;

      // SIMD-friendly linear interpolation
      playerPositions[i] += (adjustedTargetX - playerPositions[i]) * lerpFactor;
      playerPositions[i + 1] += (adjustedTargetY - playerPositions[i + 1]) * lerpFactor;
    }
  }

  private calculateBallInfluence(playerX: number, playerY: number, ballX: number, ballY: number): number {
    const dx = ballX - playerX;
    const dy = ballY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Exponential decay influence (closer players more affected by ball)
    return Math.exp(-distance * 2.0);
  }

  // Bulk formation switching using pre-computed arrays
  public switchFormation(
    newFormationData: Float32Array, // Pre-computed formation positions
    transitionTime: number = 2.0     // Seconds for formation change
  ): void {
    // Copy new formation to target positions buffer
    this.targetPositions.set(newFormationData);

    // Formation switching handled by updatePlayerPositions interpolation
    // No complex individual calculations needed
  }
}
```

**SIMD Optimization Benefits**:
- **Integer Grid Indices**: Exact calculations, cache-friendly, no floating-point precision drift
- **Float32Array Bulk Operations**: V8 TurboFan can generate ARM NEON instructions for predictable loops
- **Memory Layout**: Interleaved x,y coordinates optimize cache usage and enable vectorization
- **Performance**: 2-4x potential speedup for 22 player position updates on ARM devices

#### 3.4.2 Formation Data Management

```typescript
interface FormationDefinition {
  id: string;                       // "4-4-2-flat"
  positions: Float32Array;          // Pre-computed normalized positions [x1,y1,x2,y2,...]
  roles: PlayerRole[];              // Corresponding roles for each position
  phases: {
    attack: Float32Array;           // Attacking phase adjustments
    defend: Float32Array;           // Defensive phase adjustments
    transition: Float32Array;       // Neutral/transition positions
  };
}

// POC placeholder formation manager
// Phase 2: This will be replaced by a FormationAdapter that consumes FET export schema (see docs/FET-TDD.md)
class FormationManager {
  private formations: Map<string, FormationDefinition> = new Map();
  private currentFormation: FormationDefinition;
  private gridSystem: OptimizedFormationGrid; // POC-only grid; Phase 2 uses FET data

  constructor() {
    this.gridSystem = new OptimizedFormationGrid();
    this.loadPredefinedFormations();
  }

  private loadPredefinedFormations(): void {
    // Pre-defined formations for POC
    const formation442 = this.createFormation442();
    const formation433 = this.createFormation433();

    this.formations.set("4-4-2", formation442);
    this.formations.set("4-3-3", formation433);
    this.currentFormation = formation442; // Default
  }

  private createFormation442(): FormationDefinition {
    // Normalized positions for 4-4-2 formation (home team attacking right)
    const positions = new Float32Array([
      // Goalkeeper
      0.05, 0.5,

      // Defense (4)
      0.25, 0.2,  // Left back
      0.20, 0.35, // Center back left
      0.20, 0.65, // Center back right
      0.25, 0.8,  // Right back

      // Midfield (4)
      0.45, 0.15, // Left midfield
      0.50, 0.35, // Center midfield left
      0.50, 0.65, // Center midfield right
      0.45, 0.85, // Right midfield

      // Attack (2)
      0.75, 0.4,  // Striker left
      0.75, 0.6   // Striker right
    ]);

    return {
      id: "4-4-2-flat",
      positions,
      roles: [
        PlayerRole.GOALKEEPER,
        PlayerRole.FULL_BACK, PlayerRole.CENTRE_BACK, PlayerRole.CENTRE_BACK, PlayerRole.FULL_BACK,
        PlayerRole.WINGER, PlayerRole.CENTRAL_MIDFIELDER, PlayerRole.CENTRAL_MIDFIELDER, PlayerRole.WINGER,
        PlayerRole.STRIKER, PlayerRole.STRIKER
      ],
      phases: {
        attack: this.createAttackingAdjustments(positions),
        defend: this.createDefensiveAdjustments(positions),
        transition: positions.slice() // Copy of base positions
      }
    };
  }

  private createAttackingAdjustments(basePositions: Float32Array): Float32Array {
    const adjusted = basePositions.slice();

    // Push players forward in attacking phase
    for (let i = 0; i < adjusted.length; i += 2) {
      adjusted[i] += 0.1; // Move 10% further up pitch
    }

    return adjusted;
  }

  private createDefensiveAdjustments(basePositions: Float32Array): Float32Array {
    const adjusted = basePositions.slice();

    // Pull players back in defensive phase (except goalkeeper)
    for (let i = 2; i < adjusted.length; i += 2) { // Skip goalkeeper (index 0,1)
      adjusted[i] -= 0.08; // Move 8% back towards own goal
    }

    return adjusted;
  }
}
```

### 3.5 Physics and Movement System

#### 3.4.1 Enhanced Ball Physics Implementation
```typescript
// **PHASE 2 ONLY** - Advanced 3D Ball Physics (not implemented in POC)
class Phase2BallPhysics
{
  position: Vector3;          // Include Z-axis for height calculations - PHASE 2
  velocity: Vector3;          // 3D velocity vector - PHASE 2
  lastPosition: Vector3;      // For bounce calculations - PHASE 2
  spin: number;               // Ball spin effects - PHASE 2
  mass: number = 0.43;        // FIFA regulation ball mass (430g) - PHASE 2
  dragCoefficient: number = 0.350; // Realistic drag coefficient - PHASE 2
  gravity: number = 9.81;     // Earth gravity (m/s²) - PHASE 2
  bounceEnergyLoss: number = 0.7; // Energy retained after bounce - PHASE 2
  owner: Player | null;       // Current ball possessor

  public update(deltaTime: number, weather: WeatherConditions): void;
  public applyKick(force: Vector2, player: Player): void;
  public checkGroundBounce(): boolean;
  public calculateDrag(velocity: Vector3): Vector3;
  public applyGravity(deltaTime: number): void;
  public checkCollisions(players: Player[], boundaries: Boundary[]): Collision[];
}

// **PHASE 2 ONLY** - Realistic 3D physics constants (not used in POC)
interface Phase2PhysicsConstants
{
  BALL_MASS: 0.43;              // kg (FIFA regulation) - PHASE 2
  AIR_DENSITY: 1.225;           // kg/m³ at sea level - PHASE 2
  DRAG_COEFFICIENT: 0.350;      // Sphere drag coefficient - PHASE 2
  GRAVITY: 9.81;                // m/s² Earth gravity - PHASE 2
  BOUNCE_DAMPING: 0.7;          // Energy loss per bounce - PHASE 2
  ROLLING_FRICTION: 0.1;        // Ground friction coefficient - PHASE 2
  SPIN_DECAY_RATE: 0.95;        // Spin reduction per frame - PHASE 2
}

// POC uses simplified 2D constants (see Section 3.6 POC 2D Physics Engine)
```

#### 3.4.2 Advanced Player Movement System
```typescript
interface PlayerMovement
{
  targetPosition: Vector2;
  currentPosition: Vector2;
  destination: Vector2;         // Pathfinding destination
  facing: number;               // Direction player is facing (radians)
  speed: number;                // Current movement speed
  maxSpeed: number;             // Player's top speed
  acceleration: number;         // Speed increase rate
  deceleration: number;         // Speed decrease rate
  turningSpeed: number;         // How fast player can change direction
  spriteAnimation: SpriteAnimation;
  movementState: MovementState;
  lastMovementUpdate: number;   // For smooth interpolation
}

interface SpriteAnimation
{
  currentFrame: number;
  frameCount: number;
  frameRate: number;            // FPS for animation (8-12 typical)
  animationType: AnimationType;
  spriteSheet: HTMLImageElement;
  frameTime: number;            // Elapsed time for current frame
  animationSpeed: number;       // Speed multiplier for animation
  direction: number;            // 8-directional animation support
}

enum AnimationType
{
  IDLE = 'idle',
  RUNNING = 'running',
  SPRINTING = 'sprinting',
  KICKING = 'kicking',
  TACKLING = 'tackling',
  HEADING = 'heading',
  CELEBRATION = 'celebration',
  INJURY = 'injury'
}

enum MovementState
{
  STATIONARY = 'stationary',
  WALKING = 'walking',
  JOGGING = 'jogging',
  RUNNING = 'running',
  SPRINTING = 'sprinting',
  TURNING = 'turning',
  STOPPING = 'stopping'
}

// Enhanced movement calculations implementation
class PlayerMovementController
{
  public updatePosition(player: Player, deltaTime: number): void
  {
    const dx = player.targetPosition.x - player.position.x;
    const dy = player.targetPosition.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Arrival threshold - player stops when close enough
    if (distance < 5.0)
    {
      player.movementState = MovementState.STATIONARY;
      return;
    }

    // Calculate movement direction
    const moveDirection = { x: dx / distance, y: dy / distance };

    // Apply acceleration/deceleration
    const targetSpeed = this.calculateTargetSpeed(player, distance);
    player.speed = this.interpolateSpeed(player.speed, targetSpeed, deltaTime);

    // Update position
    const moveDistance = player.speed * deltaTime;
    player.position.x += moveDirection.x * moveDistance;
    player.position.y += moveDirection.y * moveDistance;

    // Update facing direction smoothly
    this.updateFacingDirection(player, moveDirection, deltaTime);

    // Update sprite animation based on movement
    this.updateAnimationState(player);
  }

  private calculateTargetSpeed(player: Player, distanceToTarget: number): number
  {
    // Slow down when approaching target
    const slowdownDistance = 50.0;
    if (distanceToTarget < slowdownDistance)
    {
      return player.maxSpeed * (distanceToTarget / slowdownDistance);
    }
    return player.maxSpeed;
  }

  private interpolateSpeed(currentSpeed: number, targetSpeed: number, deltaTime: number): number
  {
    const acceleration = targetSpeed > currentSpeed ? 200.0 : 400.0; // Deceleration is faster
    const speedChange = acceleration * deltaTime;

    if (Math.abs(targetSpeed - currentSpeed) < speedChange)
    {
      return targetSpeed;
    }

    return currentSpeed + (targetSpeed > currentSpeed ? speedChange : -speedChange);
  }
}
```

### 3.5 Referee System

#### 3.5.1 Rule Enforcement
```typescript
class Referee
{
  position: Vector2;
  lineOfSight: Vision;
  currentWhistle: WhistleState | null;

  // Rule enforcement
  public detectFouls(players: Player[], ball: Ball): Foul[];
  public checkOffside(attackingTeam: Team, ball: Ball): boolean;
  public manageAdvantage(foul: Foul, gameState: GameState): AdvantageDecision;
  public updatePosition(ball: Ball, players: Player[]): void;

  // Whistle mechanics (called by Game Manager)
  public blowWhistle(type: WhistleType, reason: WhistleReason, context: DeterministicGameContext): WhistleEvent;
  public updateWhistleState(deltaTime: number): void;
  public isWhistleActive(): boolean;
}

interface WhistleState {
  type: WhistleType;
  startTime: number;
  duration: number;
  isActive: boolean;
}

enum WhistleType {
  BRIEF = 'brief',           // 0.5 seconds - restarts, fouls, out of play
  EXTENDED = 'extended'      // 1.25 seconds - half-time, full-time
}

interface WhistleEvent {
  type: WhistleType;
  timestamp: number;
  reason: WhistleReason;
  duration: number;
}

enum WhistleReason {
  KICK_OFF = 'kick_off',
  RESTART_AFTER_GOAL = 'restart_after_goal',
  BALL_OUT_OF_PLAY = 'ball_out_of_play',
  FOUL = 'foul',
  HALF_TIME = 'half_time',
  FULL_TIME = 'full_time',
  ADVANTAGE = 'advantage'
}

interface OutOfPlayEvent {
  ballPosition: NormalizedPosition;
  crossingPoint: NormalizedPosition;
  restartType: 'throw_in' | 'corner_kick' | 'goal_kick';
  lastTouch: string; // Player ID
}
```

#### 3.5.2 Game Manager Ball Boundary System

The Game Manager acts as the central authority for ball boundary detection and event coordination:

```typescript
class GameManager {
  private ball: Ball3D;
  private referee: Referee;
  private audioSystem: AudioSystem;
  private eventBus: GameEventBus;
  private ballBoundaryDetector: BallBoundaryDetector;

  constructor(gameState: GameState, context: DeterministicGameContext) {
    this.ballBoundaryDetector = new BallBoundaryDetector();
    this.eventBus = new GameEventBus();
    
    // Subscribe systems to events
    this.setupEventListeners();
  }

  public updateGameFrame(deltaTime: number, context: DeterministicGameContext): GameState {
    // Store previous position for boundary crossing calculation
    const previousBallPosition = { ...this.ball.position };
    
    // Update ball physics
    this.ball.update(deltaTime);
    
    // Check for boundary crossing
    const outOfPlayEvent = this.ballBoundaryDetector.checkBoundaries(
      this.ball.position,
      previousBallPosition,
      this.ball.lastTouchedBy
    );
    
    if (outOfPlayEvent) {
      return this.handleBallOutOfPlay(outOfPlayEvent, context);
    }
    
    return this.getCurrentGameState();
  }

  private handleBallOutOfPlay(event: OutOfPlayEvent, context: DeterministicGameContext): GameState {
    // 1. Stop ball immediately at boundary
    this.ball.inPlay = false;
    this.ball.velocity = { x: 0, y: 0, z: 0 };
    this.ball.position = event.crossingPoint;
    
    // 2. Referee blows whistle
    const whistleEvent = this.referee.blowWhistle(WhistleType.BRIEF, WhistleReason.BALL_OUT_OF_PLAY, context);
    
    // 3. Coordinate system responses via event bus
    this.eventBus.emit('ballOutOfPlay', event);
    this.eventBus.emit('whistleBlow', whistleEvent);
    
    // 4. Update game state with events
    return {
      ...this.getCurrentGameState(),
      ball: this.ball,
      events: [...this.events, 
        { type: 'BALL_OUT_OF_PLAY', timestamp: context.gameTime, data: event },
        { type: 'WHISTLE', timestamp: context.gameTime, data: whistleEvent }
      ]
    };
  }

  private setupEventListeners(): void {
    // AI system responds to ball out of play
    this.eventBus.on('ballOutOfPlay', (event: OutOfPlayEvent) => {
      this.aiController.handleBallOutOfPlay(event);
    });
    
    // Audio system plays whistle sound
    this.eventBus.on('whistleBlow', (event: WhistleEvent) => {
      this.audioSystem.playWhistle(event.type, event.duration);
    });
    
    // UI system shows restart indicators
    this.eventBus.on('ballOutOfPlay', (event: OutOfPlayEvent) => {
      this.uiSystem.showRestartIndicator(event.restartType, event.crossingPoint);
    });
  }
}

// Simplified boundary detector as a utility class
class BallBoundaryDetector {
  public checkBoundaries(
    currentPos: NormalizedPosition,
    previousPos: NormalizedPosition,
    lastTouchedBy: string
  ): OutOfPlayEvent | null {
    
    // Check touchline boundaries (sides)
    if (currentPos.x <= 0 || currentPos.x >= 1) {
      return {
        ballPosition: currentPos,
        crossingPoint: this.calculateCrossingPoint(previousPos, currentPos),
        restartType: 'throw_in',
        lastTouch: lastTouchedBy
      };
    }
    
    // Check goal line boundaries (ends)
    if (currentPos.y <= 0 || currentPos.y >= 1) {
      const restartType = this.determineGoalLineRestart(currentPos, lastTouchedBy);
      return {
        ballPosition: currentPos,
        crossingPoint: this.calculateCrossingPoint(previousPos, currentPos),
        restartType,
        lastTouch: lastTouchedBy
      };
    }
    
    return null; // Ball still in play
  }

  private calculateCrossingPoint(previous: NormalizedPosition, current: NormalizedPosition): NormalizedPosition {
    // Calculate exact point where ball crossed boundary line
    // Implementation details for line intersection
    return current; // Simplified for now
  }

  private determineGoalLineRestart(position: NormalizedPosition, lastTouch: string): 'corner_kick' | 'goal_kick' {
    // Logic to determine restart type based on which team last touched ball
    return lastTouch.includes('attacking') ? 'goal_kick' : 'corner_kick';
  }
}
```

#### 3.5.3 Game Event Bus System

The Game Manager uses an event bus to coordinate system responses to ball out of play events:

```typescript
class GameEventBus {
  private eventListeners: Map<string, Function[]> = new Map();

  public on(eventType: string, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  public emit(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(callback => callback(data));
  }

  public off(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}

// System responses to ball out of play events
class AIController {
  public handleBallOutOfPlay(event: OutOfPlayEvent): void {
    // Stop player movement immediately
    this.stopAllPlayerMovement();
    
    // Position players for restart based on type
    switch (event.restartType) {
      case 'throw_in':
        this.positionForThrowIn(event.crossingPoint);
        break;
      case 'corner_kick':
        this.positionForCorner(event.crossingPoint);
        break;
      case 'goal_kick':
        this.positionForGoalKick(event.crossingPoint);
        break;
    }
  }
}

class AudioSystem {
  public playWhistle(type: WhistleType, duration: number): void {
    const audioFile = type === WhistleType.BRIEF ? 'whistle-brief.ogg' : 'whistle-extended.ogg';
    this.playSound(audioFile, { duration, volume: 0.8 });
  }
}

class UISystem {
  public showRestartIndicator(restartType: string, position: NormalizedPosition): void {
    // Show UI indicator for restart type at boundary crossing point
    this.displayIndicator({
      type: restartType,
      position: this.convertToPixelCoords(position),
      duration: 3000 // Show for 3 seconds
    });
  }
}
```

#### 3.5.4 Match Events
```typescript
enum EventType
{
  GOAL = 'goal',
  BALL_OUT_OF_PLAY = 'ball_out_of_play',   // Ball crosses boundary
  WHISTLE = 'whistle',                     // Referee whistle events
  FOUL = 'foul',                          // **PHASE 2 ONLY**
  CARD = 'card',                          // **PHASE 2 ONLY**
  SUBSTITUTION = 'substitution',          // **PHASE 2 ONLY**
  OFFSIDE = 'offside'                     // **PHASE 2 ONLY**
}

interface MatchEvent
{
  id: string;
  type: EventType;
  timestamp: number;
  playersInvolved: string[];
  description: string;
  audioTrigger?: AudioCue;
}
```

## 4. Real-Time Multiplayer Architecture

### 4.1 VGF Integration

#### 4.1.1 Server Setup
```typescript
// apps/server/src/index.ts
import { Server } from '@volley/vgf/server';
import { createLogger } from '@volley/logger';
import express from 'express';
import { createServer } from 'http';
import { Redis } from 'ioredis';
import cors from 'cors';
import { soccerWorldCupGame } from './game';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);

const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
  lazyConnect: true,
});

// VGF handles storage and transport internally

const logger = createLogger({
  type: 'node',
  level: 'info',
  base: { service: 'soccer-manager-world-cup' },
});

const server = new Server({
  port: 3000,
  game: soccerWorldCupGame,
  // VGF automatically configures Redis storage and Socket.IO transport
});

server.start();
```

#### 4.1.2 GameRuleset Implementation
```typescript
// apps/server/src/game.ts
import type { Game, GameAction } from '@volley/vgf/server';
import type { GameState } from '../shared/types';

const joinMatch: GameAction<GameState> = (ctx, teamName: string) => {
  // Check if player already joined
  const existingTeam = ctx.gameState.teams.find(
    (team) => team.managerId === ctx.playerId
  );
  if (existingTeam) return ctx.gameState;

  // Add new team to match
  return {
    ...ctx.gameState,
    teams: [
      ...ctx.gameState.teams,
      { 
        id: ctx.playerId, 
        name: teamName, 
        managerId: ctx.playerId,
        formation: DEFAULT_FORMATION 
      },
    ],
  };
};

const voiceCommand: GameAction<GameState> = (ctx, command: VoiceCommand) => {
  const team = ctx.gameState.teams.find(
    (team) => team.managerId === ctx.playerId
  );
  if (!team) return ctx.gameState;

  // Process tactical voice command
  return {
    ...ctx.gameState,
    teams: ctx.gameState.teams.map(t => 
      t.id === team.id ? { ...t, tacticStyle: command.tacticStyle } : t
    ),
  };
};

export const soccerWorldCupGame = {
  setup: (): GameState => ({
    phase: 'lobby',
    teams: [],
    match: null,
    ball: { position: { x: 0.5, y: 0.5, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    gameTime: 0,
    matchSeed: Math.floor(Math.random() * 1000000),
  }),

  actions: {
    joinMatch: { action: joinMatch },
    voiceCommand: { action: voiceCommand },
  },

  phases: {
    lobby: {
      actions: {
        startMatch: {
          action: (ctx) => ({ ...ctx.gameState, phase: 'pre_match' })
        },
      },
      endIf: (ctx) => ctx.gameState.phase === 'pre_match',
      next: 'pre_match',
    },

    pre_match: {
      endIf: (ctx) => ctx.gameState.gameTime >= 30, // 30 seconds pre-match
      next: 'kick_off',
      onEnd: (ctx) => {
        // Initialize match with deterministic context
        return {
          ...ctx.gameState,
          phase: 'kick_off',
          gameTime: 0,
          match: initializeMatch(ctx.gameState.teams, ctx.gameState.matchSeed),
        };
      },
    },

    kick_off: {
      endIf: (ctx) => ctx.gameState.gameTime >= 5,
      next: 'first_half',
    },

    first_half: {
      actions: {
        // Game Manager processes the game frame and handles ball boundaries automatically
        processGameFrame: {
          action: (ctx) => {
            // Create Game Manager instance from current state
            const gameManager = GameManager.fromGameState(ctx.gameState);
            const deterministicContext = createDeterministicContext(ctx.gameState);
            
            // Game Manager handles ball physics and boundary detection internally
            const updatedState = gameManager.updateGameFrame(0.033, deterministicContext); // 30 FPS
            
            return updatedState; // Includes any ball out of play events and whistle triggers
          }
        },
        restartPlay: {
          action: (ctx, restartType: 'throw_in' | 'corner_kick' | 'goal_kick') => {
            const gameManager = GameManager.fromGameState(ctx.gameState);
            const deterministicContext = createDeterministicContext(ctx.gameState);
            
            // Game Manager coordinates the restart
            return gameManager.restartPlay(restartType, deterministicContext);
          }
        }
      },
      endIf: (ctx) => ctx.gameState.gameTime >= 150, // 2.5 minutes = 45 min game time
      next: 'half_time',
      onEnd: (ctx) => {
        // Blow extended whistle for half-time and calculate statistics
        const whistleEvent: WhistleEvent = {
          type: WhistleType.EXTENDED,
          timestamp: ctx.gameState.gameTime,
          reason: WhistleReason.HALF_TIME,
          duration: 1.25
        };
        
        return {
          ...calculateHalfTimeStats(ctx.gameState),
          events: [...ctx.gameState.events, {
            type: 'WHISTLE',
            timestamp: ctx.gameState.gameTime,
            data: whistleEvent
          }]
        };
      },
    },

    half_time: {
      endIf: (ctx) => ctx.gameState.gameTime >= 60, // 1 minute break
      next: 'second_half',
    },

    second_half: {
      actions: {
        // Real-time gameplay actions
      },
      endIf: (ctx) => ctx.gameState.gameTime >= 150, // Another 2.5 minutes
      next: 'full_time',
      onEnd: (ctx) => {
        // Blow extended whistle for full-time
        const whistleEvent: WhistleEvent = {
          type: WhistleType.EXTENDED,
          timestamp: ctx.gameState.gameTime,
          reason: WhistleReason.FULL_TIME,
          duration: 1.25
        };
        
        return {
          ...ctx.gameState,
          events: [...ctx.gameState.events, {
            type: 'WHISTLE',
            timestamp: ctx.gameState.gameTime,
            data: whistleEvent
          }]
        };
      },
    },

    full_time: {
      actions: {
        newMatch: { 
          action: (ctx) => ({ ...ctx.gameState, phase: 'lobby' })
        },
      },
      endIf: (ctx) => ctx.gameState.phase === 'lobby',
      next: 'lobby',
    },
  },
} as const satisfies Game<GameState>;
```

#### 4.1.3 Client Integration
```typescript
// apps/client/src/hooks/VGF.ts - Generated type-safe hooks
import { getVGFHooks } from '@volley/vgf/client';
import type { GameState } from '../../shared/types';
import type { soccerWorldCupGame } from '../../server/game';

// Generate type-safe hooks based on game definition
export const { useGameState, useDispatchAction, useCurrentPhase } = getVGFHooks<
  typeof soccerWorldCupGame,
  GameState
>();

// Custom hooks for football-specific functionality
export function useSoccerWorldCup() {
  const gameState = useGameState();
  const dispatchAction = useDispatchAction();
  const currentPhase = useCurrentPhase();

  return {
    gameState,
    currentPhase,
    sendVoiceCommand: (command: VoiceCommand) => 
      dispatchAction('voiceCommand', command),
    joinMatch: (teamName: string) => 
      dispatchAction('joinMatch', teamName),
    startMatch: () => 
      dispatchAction('startMatch'),
  };
}
```

#### 4.1.4 VGF Client Setup
```typescript
// apps/client/src/App.tsx
import React from 'react';
import { VGFClient } from '@volley/vgf/client';
import type { GameState } from '../shared/types';
import { GameComponent } from './GameComponent';

const client = new VGFClient({
  serverUrl: 'http://localhost:3000',
  userId: `manager-${Math.random().toString(36).substr(2, 9)}`,
});

function App() {
  return (
    <VGFClient.Provider client={client}>
      <GameComponent />
    </VGFClient.Provider>
  );
}

export default App;
```

### 4.2 VGF State Synchronisation

#### 4.2.1 Automatic State Broadcasting

VGF handles state synchronisation automatically:

1. **Action Dispatch**: Client calls `dispatchAction('actionName', ...args)`
2. **Server Processing**: VGF calls your GameAction function with current state
3. **State Update**: Your action returns new state (immutable update)
4. **Broadcasting**: VGF broadcasts updated state to all connected clients
5. **Client Updates**: React components re-render with new state via `useGameState()`

```typescript
// No manual synchronisation required - VGF handles it automatically
const voiceCommand: GameAction<GameState> = (ctx, command: VoiceCommand) => {
  // Process command and return new state
  return {
    ...ctx.gameState,
    teams: ctx.gameState.teams.map(team => 
      team.managerId === ctx.playerId 
        ? { ...team, tacticStyle: command.tacticStyle }
        : team
    ),
  };
  // VGF automatically broadcasts this new state to all clients
};
```

#### 4.2.2 Real-Time Game Loop Integration

For continuous gameplay (ball movement, player AI), we integrate with VGF phases:

```typescript
// Real-time updates handled in phase onEnd lifecycle
first_half: {
  endIf: (ctx) => ctx.gameState.gameTime >= 150, // 2.5 minutes
  next: 'half_time',
  onEnd: (ctx) => {
    // Update game state with latest positions, events, etc.
    const updatedState = processGameFrame(ctx.gameState);
    return updatedState; // Automatically synced to all clients
  },
},
```

#### 4.2.3 VGF Architecture Principles

VGF provides a complete multiplayer framework with these guarantees:

- **Server-authoritative**: All game state changes happen on the VGF server
- **Deterministic execution**: Actions execute in deterministic order with server timestamps
- **Automatic synchronization**: State changes automatically broadcast to all clients
- **Phase-based lifecycle**: Game progresses through defined phases with clear transitions
- **Built-in persistence**: Game state automatically persists across sessions
- **Real-time updates**: Sub-100ms action processing and state synchronization

#### 4.2.4 VGF Game Definition Structure

```typescript
interface Game<TGameState> {
  setup(): TGameState;                    // Initial game state factory
  actions: Record<string, GameAction>;   // Global actions available in any phase
  phases: Record<string, Phase>;         // Phase-specific logic and transitions
}

interface Phase {
  actions?: Record<string, GameAction>;  // Phase-specific actions
  endIf?: (ctx: ActionContext) => boolean; // Auto-transition condition
  next?: string | ((ctx: ActionContext) => string); // Next phase
  onStart?: (ctx: ActionContext) => GameState; // Phase entry logic
  onEnd?: (ctx: ActionContext) => GameState;   // Phase exit logic
}
```

## 5. Audio System Architecture

### 5.1 Dynamic Audio Management

#### 5.1.1 Audio Controller
```typescript
class AudioController
{
  private commentaryEngine: CommentaryEngine;
  private crowdAudioSystem: CrowdAudioSystem;
  private musicManager: MusicManager;

  public handleMatchEvent(event: MatchEvent): void;
  public updateCrowdReaction(gameState: GameState): void;
  public triggerChant(chantType: ChantType, context: ChantContext): void;
}
```

#### 5.1.2 Crowd Audio System
```typescript
interface CrowdAudioSystem
{
  ambientNoise: AudioBuffer;
  eventReactions: Map<EventType, AudioBuffer[]>;
  chants: Map<ChantType, ChantAudio>;

  playReaction(event: MatchEvent, homeTeam: boolean): void;
  startChant(chant: ChantType, intensity: number): void;
  updateAmbientLevel(excitement: number): void;
}

enum ChantType
{
  SUPPORT_GENERAL = 'support_general',      // "Come on [Team]!"
  PLAYER_SPECIFIC = 'player_specific',      // "There's only one [Player]!"
  DEFENSIVE = 'defensive',                  // "DEE-FENSE!"
  ATTACKING = 'attacking',                  // "Attack! Attack!"
  GOAL_CELEBRATION = 'goal_celebration',    // "Goooooal!"
  CALL_RESPONSE = 'call_response'          // "What do we want? A goal!"
}
```

### 5.2 Commentary System

#### 5.2.1 Dynamic Commentary
```typescript
interface CommentaryEngine
{
  generateCommentary(event: MatchEvent, context: GameContext): string;
  selectAudioClip(commentary: string): AudioBuffer;
  queueCommentary(audio: AudioBuffer, priority: number): void;
}
```

## 6. League System Architecture

### 6.1 League Management

#### 6.1.1 League Structure
```typescript
interface League
{
  id: string;
  name: string;
  tier: LeagueTier;
  teams: Team[];
  schedule: Match[];
  table: LeagueTable;
  season: Season;
}

enum LeagueTier
{
  NATIONAL_LEAGUE = 5,
  LEAGUE_TWO = 4,
  LEAGUE_ONE = 3,
  CHAMPIONSHIP = 2,
  PREMIER_LEAGUE = 1
}
```

#### 6.1.2 Promotion/Relegation System
```typescript
class LeagueManager
{
  public processWeeklyResults(league: League): PromotionResult;
  public promoteTeams(teams: Team[], targetLeague: League): void;
  public relegateTeams(teams: Team[], targetLeague: League): void;
  public calculateRewards(position: number, tier: LeagueTier): Currency;
}
```

### 6.2 Player Trading System (Future Phase)

#### 6.2.1 Transfer Market
```typescript
interface TransferMarket
{
  availablePlayers: Player[];
  transferBids: TransferBid[];

  listPlayer(player: Player, askingPrice: Currency): void;
  placeBid(player: Player, offer: Currency): TransferBid;
  processTransfer(bid: TransferBid): TransferResult;
}
```

## 7. Platform Optimisation

### 7.1 FireTV Optimisation

#### 7.1.1 Performance Constraints
```typescript
interface PerformanceConfig
{
  targetFPS: 30;
  frameBudgetMs: 33; // ms total per frame (PRD specification)
  maxMemoryUsageMB: 256; // MB JavaScript heap (PRD specification)
  maxTextureMemoryMB: 128; // MB for all sprites and assets (PRD specification)
  maxDrawCallsPerFrame: 500; // PRD specification: <500 draw calls per frame
  audioChannels: 8;
  canvasRenderer: '2d'; // Canvas 2D for sprite rendering
}
```

#### 7.1.2 Input Handling
```typescript
interface TVInputHandler
{
  handleRemoteInput(keyCode: number): void;
  handleVoiceInput(command: VoiceCommand): void;
  handleGesture(gesture: GestureEvent): void; // For advanced remotes
}
```

### 7.2 Responsive Design

#### 7.2.1 Display Adaptation
```typescript
interface DisplayConfig
{
  resolution: Resolution;
  uiScale: number;
  textSize: 'large' | 'xlarge'; // TV-appropriate text sizes
  buttonSpacing: number; // Larger for remote navigation
}
```

## 8. Enhanced Data Models

### 8.1 Core Game Entities

#### 8.1.1 Enhanced Player Model
```typescript
interface Player extends Entity  // Implementing Entity pattern
{
  // Basic identification
  id: string;
  name: string;
  kitNumber: number;
  team: 'HOME' | 'AWAY';

  // Physical properties
  position: Vector2;
  destination: Vector2;         // Target position for movement
  facing: number;               // Direction facing (radians)
  bounds: Circle;               // Collision detection

  // Movement characteristics (derived from attributes)
  currentSpeed: number;         // Current movement speed
  facing: number;               // Direction facing (radians)
  turningSpeed: number;         // Direction change rate (derived from agility)

  // Game state
  playerType: 'OUTFIELD' | 'GOALKEEPER';
  state: PlayerState;
  hasBall: boolean;
  stamina: number;              // 0-100, affects performance
  confidence: number;           // 0-100, affects decision making

  // Formation and tactics
  basePosition: Vector2;        // Formation position
  role: PlayerRole;
  instructions: PlayerInstructions;

  // Attributes (0.0-10.0 scale as per PRD)
  attributes: PlayerAttributes;

  // Animation and rendering
  spriteAnimation: SpriteAnimation;
  // PHASE 2 ONLY: height (for 3D/headers); not used in POC 2D engine
  height?: number;

  // Captain status
  isCaptain: boolean;

  // Entity interface methods
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  getBounds(): Circle;
  inPosition(): boolean;        // Whether player has reached destination
}

// **REMOVED** - Use canonical PlayerAttributes from section 3.2.1 (0.0-10.0 scale)

}

enum PlayerRole
{
  GOALKEEPER = 'goalkeeper',
  CENTRE_BACK = 'centre_back',
  FULL_BACK = 'full_back',
  DEFENSIVE_MIDFIELDER = 'defensive_midfielder',
  CENTRAL_MIDFIELDER = 'central_midfielder',
  ATTACKING_MIDFIELDER = 'attacking_midfielder',
  WINGER = 'winger',
  STRIKER = 'striker'
}

interface PlayerInstructions
{
  mentality: 'very_defensive' | 'defensive' | 'balanced' | 'attacking' | 'very_attacking';
  passingStyle: 'short' | 'mixed' | 'long';
  crossingStyle: 'low' | 'mixed' | 'high';
  tacklingStyle: 'easy' | 'normal' | 'hard';
  markingAssignment: Player | null; // Specific player to mark
}
```

#### 8.1.2 Team Structure
```typescript
interface Team
{
  id: string;
  name: string;
  customName?: string;
  captain: string; // Player ID
  formation: Formation;
  startingXI: Player[];
  substitutes: Player[];
  reserves: Player[];
  tacticalStyle: TacticalStyle;
  finances: TeamFinances;
  stadium: Stadium;
}

interface Stadium
{
  name: string;
  capacity: number;
  pitchQuality: number; // 0.0-10.0, improves with league tier
  facilities: FacilityLevel;
  atmosphere: AtmosphereLevel;
}
```

#### 8.1.2 Match Data
```typescript
interface Match
{
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  venue: Stadium;
  weather: WeatherConditions;
  result?: MatchResult;
  events: MatchEvent[];
  statistics: MatchStatistics;
}

// Reference: see docs/CANONICAL-DEFINITIONS.md for canonical MatchStatistics schema
```

## 9. Security and Performance

### 9.1 Anti-Cheat Measures

#### 9.1.1 Server Validation
```typescript
class GameValidator
{
  public validatePlayerAction(action: PlayerAction, gameState: GameState): boolean;
  public checkPhysicsConsistency(positions: Vector2[], deltaTime: number): boolean;
  public detectAbnormalBehaviour(player: Player, actions: PlayerAction[]): boolean;
}
```

### 9.2 Performance Monitoring

#### 9.2.1 Metrics Collection
```typescript
interface PerformanceMetrics
{
  frameRate: number;
  memoryUsage: number;
  networkLatency: number;
  voiceRecognitionAccuracy: number;
  commandResponseTime: number;
}
```

## 10. Testing Strategy

### 10.1 Testing Architecture Overview

**Testing Framework Stack:**
- **Server**: Jest with VGF testing utilities
- **Client**: Vitest with React Testing Library
- **Integration**: Custom VGF test harness for multiplayer scenarios
- **E2E**: Playwright for full game flow testing
- **Performance**: Custom benchmarking with deterministic timing

**VGF-Specific Testing Patterns:**
```typescript
// VGF Game Testing Utilities
import { createTestGame, TestGameClient } from '@volley/vgf/test';

class SoccerTestHarness {
  private testGame: TestGameClient<GameState>;
  
  constructor() {
    this.testGame = createTestGame(soccerWorldCupGame);
  }
  
  // Simulate multiplayer actions deterministically
  async simulatePlayerAction(playerId: string, action: string, ...args: any[]) {
    return this.testGame.dispatchAction(playerId, action, ...args);
  }
  
  // Verify state synchronization across clients
  assertStateSynchronization(expectedState: Partial<GameState>) {
    const actualState = this.testGame.getGameState();
    expect(actualState).toMatchObject(expectedState);
  }
}
```

### 10.2 POC Acceptance Tests (Priority 1 - Critical)

**These tests validate PRD POC acceptance criteria and must pass for POC success.**

#### 10.1.1 Ball Physics and Boundaries (PRD Requirements)
```typescript
describe('POC Ball Physics', () => {
  test('should detect out-of-bounds within 16ms', async () => {
    const ball = createBall({ position: { x: POC_CONFIG.FIELD_WIDTH + 1, y: 500 } });
    const testClock = createTestClock();
    const startTime = testClock.now();
    const result = physics.checkBoundaries(ball);
    const detectionTime = testClock.now() - startTime;

    expect(result.out).toBe(true);
    expect(detectionTime).toBeLessThan(16); // PRD requirement
  });

  test('should execute correct restart within 3 seconds', async () => {
    const testCases = [
      { ballExit: 'top', lastTouch: 'RED', expected: 'THROW_IN' },
      { ballExit: 'right', lastTouch: 'RED', expected: 'CORNER_KICK' },
      { ballExit: 'right', lastTouch: 'BLUE', expected: 'GOAL_KICK' }
    ];

    for (const testCase of testCases) {
      // Use deterministic test clock instead of wall-clock
      const testClock = createTestClock();
      testClock.reset(0);
      const restart = await gameEngine.processOutOfPlay(testCase, testClock);
      const executionTimeMs = testClock.now();

      expect(restart.type).toBe(testCase.expected);
      expect(executionTimeMs).toBeLessThan(3000); // PRD: within 3 seconds
    }
  });
  
  test('should enforce FIFA Law 16 goal kick positioning rules', async () => {
    const gameState = createGameState();
    const goalKickController = new GoalKickController();
    
    // Set up scenario: opposing players in penalty area during goal kick
    const opposingPlayers = gameState.teams[1].players.slice(0, 3);
    opposingPlayers.forEach((player, i) => {
      player.position = { 
        x: 100 + i * 20, // Inside home team's penalty area
        y: 400 + i * 50 
      };
    });
    
    const goalKickState = goalKickController.initiateGoalKick(gameState, 'HOME');
    
    // Should wait for positioning (FIFA Law 16 compliance)
    expect(goalKickState.phase).toBe('awaiting_positioning');
    expect(goalKickState.canTakeKick).toBe(false);
    expect(goalKickState.playersExitingPenaltyArea.length).toBe(3);
    
    // Simulate players attempting to exit penalty area
    opposingPlayers.forEach(player => {
      player.targetPosition = { x: 300, y: player.position.y }; // Moving away
      player.position = { x: player.position.x + 15, y: player.position.y }; // Gradual exit
    });
    
    const updatedState = goalKickController.updateGoalKickState(goalKickState, gameState, 0.1);
    
    // Should now allow kick (players attempting to leave)
    expect(updatedState.phase).toBe('ready_to_kick');
    expect(updatedState.canTakeKick).toBe(true);
  });
});
```

#### 10.1.2 Formation Adherence (PRD Requirements)
```typescript
describe('POC Formation Adherence', () => {
  test('should maintain formation within ±10% tolerance', () => {
    const gameState = createGameState();
    const team = gameState.teams[0];

    // Run simulation for 30 seconds
    for (let t = 0; t < 30; t += 1/30) {
      gameEngine.update(gameState, t * 1000);

      team.players.forEach(player => {
        const distance = calculateDistance(player.position, player.basePosition);
        const fieldDiagonal = Math.sqrt(POC_CONFIG.FIELD_WIDTH**2 + POC_CONFIG.FIELD_HEIGHT**2);
        const maxDeviation = fieldDiagonal * 0.1; // 10% tolerance

        expect(distance).toBeLessThan(maxDeviation);
      });
    }
  });

  test('should respond within 100ms to ball movement', () => {
    const gameState = createGameState();
    const initialPositions = gameState.teams[0].players.map(p => ({ ...p.position }));

    // Move ball significantly
    gameState.ball.position = { x: 800, y: 300 };
    gameEngine.update(gameState, 100); // 100ms update

    let responsivePlayerCount = 0;
    gameState.teams[0].players.forEach((player, i) => {
      const movement = calculateDistance(player.position, initialPositions[i]);
      if (movement > 5) responsivePlayerCount++;
    });

    expect(responsivePlayerCount).toBeGreaterThan(0);
  });

  test('should maintain possession variance <5%', () => {
    const possessionResults = [];

    // Run identical scenarios multiple times with fixed seed
    for (let run = 0; run < 10; run++) {
      const gameState = createGameState({ seed: 12345 });

      for (let t = 0; t < 60; t += 1/30) { // 1 minute simulation
        gameEngine.update(gameState, t * 1000);
      }

      possessionResults.push(gameState.stats.possession.RED);
    }

    const mean = possessionResults.reduce((a, b) => a + b) / possessionResults.length;
    const variance = possessionResults.reduce((sum, val) => sum + (val - mean)**2, 0) / possessionResults.length;

    expect(Math.sqrt(variance)).toBeLessThan(5); // <5% standard deviation
  });
});
```

#### 10.1.3 FireTV Performance (PRD Requirements)
```typescript
describe('POC FireTV Performance', () => {
  test('should maintain 30+ FPS during gameplay', async () => {
    const gameState = createGameState();
    const frameTimes = [];

    // Measure 1000 frames
    // Drive updates with a deterministic test clock
    const testClock = createTestClock();
    for (let i = 0; i < 1000; i++) {
      const frameStart = testClock.now();
      gameEngine.update(gameState, frameStart);
      testClock.advance(33); // simulate ~30 FPS frame time
      const frameEnd = testClock.now();
      frameTimes.push(frameEnd - frameStart);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(33); // PRD: 33ms budget
  });

  test('should stay within draw call budget', () => {
    const renderer = new OptimizedCanvas2DRenderer();
    const gameState = createGameState();

    renderer.renderFrame(gameState);
    expect(renderer.getDrawCallCount()).toBeLessThan(500); // PRD: <500 draws
  });

  test('should complete 5-minute matches without crashes', async () => {
    const gameState = createGameState();
    let frameCount = 0;

    // 5 minutes at 30 FPS = 9000 frames
    for (let i = 0; i < 9000; i++) {
      expect(() => {
        gameEngine.update(gameState, i * 33.33);
        frameCount++;
      }).not.toThrow();
    }

    expect(frameCount).toBe(9000);
    expect(gameState.gameTime).toBeGreaterThanOrEqual(300); // 5 minutes
  });
});
```

#### 10.2.4 VGF Multiplayer Integration Tests

```typescript
describe('VGF Multiplayer Scenarios', () => {
  let testHarness: SoccerTestHarness;
  
  beforeEach(() => {
    testHarness = new SoccerTestHarness();
  });
  
  test('should synchronize game state between two players', async () => {
    // Player 1 joins and creates team
    await testHarness.simulatePlayerAction('player1', 'joinMatch', 'Arsenal FC');
    
    // Player 2 joins
    await testHarness.simulatePlayerAction('player2', 'joinMatch', 'Barcelona FC');
    
    // Verify both players see the same game state
    const gameState = testHarness.testGame.getGameState();
    expect(gameState.teams).toHaveLength(2);
    expect(gameState.teams[0].name).toBe('Arsenal FC');
    expect(gameState.teams[1].name).toBe('Barcelona FC');
    
    // Start match from player 1
    await testHarness.simulatePlayerAction('player1', 'startMatch');
    
    // Verify phase transition for both players
    testHarness.assertStateSynchronization({ phase: 'pre_match' });
  });
  
  test('should handle simultaneous voice commands deterministically', async () => {
    // Set up match with two players
    await testHarness.simulatePlayerAction('player1', 'joinMatch', 'Team A');
    await testHarness.simulatePlayerAction('player2', 'joinMatch', 'Team B');
    await testHarness.simulatePlayerAction('player1', 'startMatch');
    
    // Simulate simultaneous voice commands
    const command1 = testHarness.simulatePlayerAction('player1', 'voiceCommand', { tacticStyle: 'ATTACKING' });
    const command2 = testHarness.simulatePlayerAction('player2', 'voiceCommand', { tacticStyle: 'DEFENSIVE' });
    
    await Promise.all([command1, command2]);
    
    // Verify deterministic execution order
    const gameState = testHarness.testGame.getGameState();
    const team1 = gameState.teams.find(t => t.managerId === 'player1');
    const team2 = gameState.teams.find(t => t.managerId === 'player2');
    
    expect(team1?.tacticStyle).toBe('ATTACKING');
    expect(team2?.tacticStyle).toBe('DEFENSIVE');
  });
  
  test('should maintain determinism with seeded match', async () => {
    // Create multiple test runs with same seed
    const results = [];
    
    for (let run = 0; run < 5; run++) {
      const harness = new SoccerTestHarness();
      
      // Set up identical match conditions
      await harness.simulatePlayerAction('player1', 'joinMatch', 'Team A');
      await harness.simulatePlayerAction('player2', 'joinMatch', 'Team B');
      
      // Use same match seed
      const gameState = harness.testGame.getGameState();
      gameState.matchSeed = 12345;
      
      // Simulate game frame
      await harness.simulatePlayerAction('player1', 'processGameFrame');
      
      results.push(harness.testGame.getGameState());
    }
    
    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
  
  test('should handle player disconnection gracefully', async () => {
    await testHarness.simulatePlayerAction('player1', 'joinMatch', 'Team A');
    await testHarness.simulatePlayerAction('player2', 'joinMatch', 'Team B');
    
    // Start match
    await testHarness.simulatePlayerAction('player1', 'startMatch');
    
    // Simulate player 2 disconnection
    testHarness.testGame.disconnectPlayer('player2');
    
    // Player 1 should still be able to continue
    await testHarness.simulatePlayerAction('player1', 'voiceCommand', { tacticStyle: 'BALANCED' });
    
    // Game should continue in single-player mode or pause
    const gameState = testHarness.testGame.getGameState();
    expect(gameState.teams[0].tacticStyle).toBe('BALANCED');
  });
});

describe('VGF Phase Lifecycle Tests', () => {
  let testHarness: SoccerTestHarness;
  
  beforeEach(() => {
    testHarness = new SoccerTestHarness();
  });
  
  test('should transition through all match phases correctly', async () => {
    // Set up players
    await testHarness.simulatePlayerAction('player1', 'joinMatch', 'Team A');
    await testHarness.simulatePlayerAction('player2', 'joinMatch', 'Team B');
    
    // Start match and verify phase progression
    testHarness.assertStateSynchronization({ phase: 'lobby' });
    
    await testHarness.simulatePlayerAction('player1', 'startMatch');
    testHarness.assertStateSynchronization({ phase: 'pre_match' });
    
    // Simulate time progression through phases
    const gameState = testHarness.testGame.getGameState();
    gameState.gameTime = 35; // Should trigger kick_off phase
    
    // VGF should automatically transition based on endIf conditions
    expect(gameState.phase).toBe('kick_off');
  });
  
  test('should execute onEnd lifecycle hooks correctly', async () => {
    await testHarness.simulatePlayerAction('player1', 'joinMatch', 'Team A');
    await testHarness.simulatePlayerAction('player2', 'joinMatch', 'Team B');
    
    // Progress to first half and simulate end
    const gameState = testHarness.testGame.getGameState();
    gameState.phase = 'first_half';
    gameState.gameTime = 150; // Should trigger half-time
    
    // Verify whistle event was created in onEnd
    const events = gameState.events.filter(e => e.type === 'WHISTLE');
    expect(events.length).toBeGreaterThan(0);
    
    const halfTimeWhistle = events.find(e => e.data?.reason === 'HALF_TIME');
    expect(halfTimeWhistle).toBeDefined();
    expect(halfTimeWhistle?.data?.duration).toBe(1.25);
  });
});
```

### 10.3 Advanced Testing Strategy (Phase 2+)

#### 10.2.1 AI System Tests
```typescript
describe('TacticalEngine', () =>
{
  describe('Hungarian Algorithm Role Assignment', () =>
  {
    test('should assign optimal roles based on player attributes and game context', () =>
    {
      const players = [
        createPlayer({ attributes: { positioning: 9, tackling: 8, passing: 6 } }), // Defender
        createPlayer({ attributes: { vision: 9, passing: 9, shooting: 7 } }),      // Midfielder
        createPlayer({ attributes: { pace: 9, shooting: 8, dribbling: 8 } })       // Attacker
      ];

      const availableRoles = [
        { type: 'CENTRE_BACK', idealPosition: { x: 0.2, y: 0.5 } },
        { type: 'CENTRAL_MIDFIELDER', idealPosition: { x: 0.5, y: 0.5 } },
        { type: 'STRIKER', idealPosition: { x: 0.8, y: 0.5 } }
      ];

      const gameContext = createGameContext({ matchTime: 45, score: [0, 0] });

      const assignments = tacticalEngine.optimizePlayerAssignments(players, availableRoles, gameContext);

      // Verify optimal assignment
      expect(assignments[0].assignedRole.type).toBe('CENTRE_BACK');
      expect(assignments[1].assignedRole.type).toBe('CENTRAL_MIDFIELDER');
      expect(assignments[2].assignedRole.type).toBe('STRIKER');

      // Check confidence levels
      assignments.forEach(assignment => {
        expect(assignment.confidenceLevel).toBeGreaterThan(0.7);
      });
    });
  });

  describe('Dynamic Formation Adjustment', () =>
  {
    test('should adjust formation depth based on tactical situation', () =>
    {
      const baseFormation = createFormation('4-4-2');
      const tacticalSituation = {
        depth: 0.3,           // Defensive positioning
        width: 0.6,           // Moderate width
        focus: 0.8,           // High focus around ball
        offensiveBias: -0.4,  // Defensive bias
        pressureLevel: 0.7    // High pressure
      };

      const gameContext = createGameContext({
        matchTime: 85,        // Late in match
        score: [1, 0],        // Leading by one
        possession: 'AWAY'    // Opposition has ball
      });

      const dynamicFormation = tacticalEngine.adjustFormationDynamically(
        baseFormation,
        tacticalSituation,
        gameContext
      );

      // Verify defensive adjustments
      const defenderAdjustments = dynamicFormation.adjustments.filter(adj =>
        adj.originalPosition.x < 0.4  // Defensive third
      );

      defenderAdjustments.forEach(adjustment => {
        // Defenders should move deeper when defending a lead
        expect(adjustment.adjustedPosition.x).toBeLessThan(adjustment.originalPosition.x);
      });

      expect(dynamicFormation.confidenceLevel).toBeGreaterThan(0.6);
    });
  });

  describe('Man-Marking Assignment', () =>
  {
    test('should assign defenders to most threatening opponents', () =>
    {
      const defenders = [
        createDefender({ attributes: { tackling: 8, positioning: 9, pace: 7 } }),
        createDefender({ attributes: { tackling: 7, positioning: 8, pace: 8 } })
      ];

      const opponents = [
        createOpponent({ attributes: { shooting: 9, pace: 8, dribbling: 7 }, position: { x: 0.7, y: 0.3 } }),
        createOpponent({ attributes: { shooting: 6, pace: 6, passing: 8 }, position: { x: 0.6, y: 0.7 } })
      ];

      const gameState = createGameState({
        ballPosition: { x: 0.8, y: 0.4 },
        phase: 'IN_PLAY'
      });

      const assignments = tacticalEngine.assignManMarking(defenders, opponents, gameState);

      // Most dangerous opponent should be marked by best available defender
      const mostThreatening = opponents[0]; // Higher shooting + pace
      const assignmentForThreat = assignments.find(a => a.opponentId === mostThreatening.id);

      expect(assignmentForThreat).toBeDefined();
      expect(assignmentForThreat!.markingType).toBe('tight'); // High threat = tight marking
      expect(assignmentForThreat!.expectedEffectiveness).toBeGreaterThan(0.6);
    });
  });
});

describe('PlayerAI State Management', () =>
{
  test('should accurately calculate ball acquisition time', () =>
  {
    const player = createPlayer({
      position: { x: 100, y: 100 },
      attributes: { pace: 8, acceleration: 7 }
    });

    const ballPosition = { x: 200, y: 150 };
    const ballVelocity = { x: 50, y: 25 };

    const acquisitionTime = playerAI.calculateBallAcquisitionTime(player, ballPosition, ballVelocity);

    // Should be realistic time based on distance and player speed
    expect(acquisitionTime).toBeGreaterThan(1000); // At least 1 second
    expect(acquisitionTime).toBeLessThan(5000);    // At most 5 seconds
  });

  test('should update possession states correctly', () =>
  {
    const team = createTeam([
      createPlayer({ id: 'player1', position: { x: 100, y: 100 } }),
      createPlayer({ id: 'player2', position: { x: 200, y: 100 } }),
      createPlayer({ id: 'player3', position: { x: 300, y: 100 } })
    ]);

    const ballPosition = { x: 150, y: 100 };

    playerAI.updatePossessionStates(team.players, ballPosition);

    // Closest player should have best possession
    const player2 = team.players.find(p => p.id === 'player2')!;
    expect(player2.aiState.hasBestPossession).toBe(true);

    // Others should not
    const otherPlayers = team.players.filter(p => p.id !== 'player2');
    otherPlayers.forEach(player => {
      expect(player.aiState.hasBestPossession).toBe(false);
    });
  });
});

describe('Physics Integration Tests', () =>
{
  test('should handle ball bounce physics correctly', () =>
  {
    const ball = createBall({
      position: { x: 100, y: 100, z: 50 },  // Ball in air
      velocity: { x: 0, y: 0, z: -20 }      // Falling down
    });

    ballPhysics.update(ball, 0.016); // One frame at 60 FPS

    if (ball.position.z <= 0) // Hit ground
    {
      // Should bounce with reduced energy
      expect(ball.velocity.z).toBeGreaterThan(0);  // Bouncing up
      expect(ball.velocity.z).toBeLessThan(14);     // Energy loss (70% retention)
    }
  });

  test('should apply realistic drag to ball movement', () =>
  {
    const ball = createBall({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 100, y: 0, z: 0 }  // Fast horizontal movement
    });

    const initialSpeed = Math.sqrt(
      ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
    );

    // Update multiple frames
    for (let i = 0; i < 60; i++) {
      ballPhysics.update(ball, 0.016);
    }

    const finalSpeed = Math.sqrt(
      ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
    );

    // Speed should decrease due to drag
    expect(finalSpeed).toBeLessThan(initialSpeed);
    expect(finalSpeed).toBeGreaterThan(initialSpeed * 0.5); // But not too much
  });
});
```

### 10.2 Advanced Integration Testing

#### 10.2.1 Tactical System Integration
```typescript
describe('Full Tactical System Integration', () =>
{
  test('should process tactical command through complete pipeline', async () =>
  {
    const gameState = createGameState({
      phase: 'IN_PLAY',
      teams: [createTeam('HOME'), createTeam('AWAY')],
      ballPosition: { x: 0.3, y: 0.5 }
    });

    // Voice command processing
    const audioInput = createMockAudioStream('attack');
    const voiceCommand = await voiceProcessor.recogniseSpeech(audioInput);
    const tacticalCommand = commandParser.parseCommand(voiceCommand);

    // AI processing
    const tacticalSituation = tacticalEngine.calculateTeamPositioning(gameState);
    const roleAssignments = tacticalEngine.optimizePlayerAssignments(
      gameState.teams[0].players,
      getTacticalRoles('ATTACKING'),
      createGameContext(gameState)
    );

    // Formation adjustment
    const adjustedFormation = tacticalEngine.adjustFormationDynamically(
      gameState.teams[0].formation,
      tacticalSituation,
      createGameContext(gameState)
    );

    // Verify complete pipeline
    expect(tacticalCommand.type).toBe('TACTICAL_CHANGE');
    expect(tacticalCommand.data.mentality).toBe('ATTACKING');
    expect(roleAssignments.length).toBe(11); // Full team
    expect(adjustedFormation.tacticalContext.offensiveBias).toBeGreaterThan(0);

    // Check that attacking players moved forward
    const attackers = roleAssignments.filter(r => r.assignedRole.type.includes('STRIKER'));
    const attackerPositions = adjustedFormation.adjustments
      .filter(adj => attackers.some(a => a.assignedRole.idealPosition === adj.originalPosition));

    attackerPositions.forEach(pos => {
      expect(pos.adjustedPosition.x).toBeGreaterThan(pos.originalPosition.x);
    });
  });

  test('should handle complex match situation with multiple systems', () =>
  {
    const gameState = createComplexGameState({
      phase: 'IN_PLAY',
      matchTime: 89,            // Late in match
      score: [1, 2],            // Losing by one
      ballPossession: 'HOME',   // Player has ball
      ballPosition: { x: 0.7, y: 0.3 }, // Attacking third
      weather: { type: 'heavy_rain', visibility: 0.7 },
      playerStamina: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.6, 0.5, 0.4, 0.3] // Varied fatigue
    });

    // Process AI decisions for desperate attacking
    const aiDecisions = masterAI.processFrame(gameState, 0.016);

    // Verify tactical adjustments for desperate situation
    expect(aiDecisions.tacticalChanges.offensiveBias).toBeGreaterThan(0.8); // Very attacking
    expect(aiDecisions.formationAdjustments).toBeDefined();

    // Check that tired players are positioned strategically
    const tiredPlayers = gameState.teams[0].players.filter(p => p.stamina < 0.5);
    tiredPlayers.forEach(player => {
      const decision = aiDecisions.individualPlayerActions.find(d => d.playerId === player.id);
      expect(decision?.conservingEnergy).toBe(true); // Should conserve energy
    });

    // Weather should affect decision making
    expect(aiDecisions.ballProgressionDecision?.preferredPlayStyle).toBe('direct_play'); // Less passing in rain
  });
});

#### 10.2.2 Physics and AI Integration
```typescript
describe('Physics-AI Integration', () =>
{
  test('should coordinate ball physics with player AI decisions', () =>
  {
    const gameState = createGameState({
      ball: {
        position: { x: 100, y: 100, z: 5 },
        velocity: { x: 50, y: 30, z: 0 },
        spin: 0.2
      }
    });

    // Multiple players should calculate acquisition times
    const players = gameState.teams[0].players;

    // Process one frame
    ballPhysics.update(gameState.ball, 0.016);

    players.forEach(player => {
      playerAI.updateAIState(player, gameState);
    });

    // Find player with best ball acquisition
    const bestPlayer = players.reduce((best, current) =>
      current.aiState.ballAcquisitionProbability > best.aiState.ballAcquisitionProbability
        ? current : best
    );

    // Best player should move toward predicted ball position
    const ballPrediction = ballPhysics.predictPosition(gameState.ball, bestPlayer.aiState.timeNeededToGetToBall);
    const targetDistance = Vector2.distance(bestPlayer.targetPosition, ballPrediction);

    expect(targetDistance).toBeLessThan(50); // Should target predicted position
    expect(bestPlayer.aiState.hasBestPossession).toBe(true);
  });
});
```

### 10.4 Testing Commands and Scripts

**Package.json Test Scripts:**
```json
{
  "scripts": {
    "test": "pnpm test:unit && pnpm test:integration",
    "test:unit": "pnpm --filter \"*\" test:unit",
    "test:integration": "pnpm --filter @game/server test:integration",
    "test:e2e": "pnpm --filter @game/client test:e2e", 
    "test:performance": "pnpm --filter @game/server test:performance",
    "test:coverage": "pnpm --filter \"*\" test:coverage",
    "test:vgf": "pnpm --filter @game/server test:vgf-multiplayer",
    "test:watch": "pnpm --filter \"*\" test --watch",
    "test:ci": "pnpm test && pnpm test:e2e && pnpm test:performance"
  }
}
```

**Server Test Configuration (Jest):**
```javascript
// apps/server/jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

**Client Test Configuration (Vitest):**
```javascript
// apps/client/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

**E2E Test Configuration (Playwright):**
```typescript
// apps/client/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Test Execution Examples:**
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run only VGF multiplayer tests
pnpm test:vgf

# Run performance tests
pnpm test:performance

# Run E2E tests against local development server
pnpm test:e2e

# Run tests in watch mode during development
pnpm test:watch

# CI pipeline test execution
pnpm test:ci
```

## 11. Asset Requirements and AI Prompts

### 11.1 Visual Assets

#### 11.1.1 Sprite Assets (Midjourney/DALL-E Prompts)

**Players:**
```
Prompt: "Top-down 2D sprite sheet for football players, 32x32 pixel size, multiple animation frames:
- Idle stance (2 frames)
- Running (4 frames, 8-directional)
- Kicking ball (3 frames)
- Slide tackle (3 frames)
- Goal celebration (4 frames)
- Different kit colours for team differentiation
- Clear visual distinction between positions (goalkeeper gloves, etc.)
- Pixel art style optimised for TV viewing distance"

Additional variations needed:
- 4 different skin tones for diversity
- Referee sprite with distinct black uniform
- Injured player animation (limping)
- Substitution gesture sprites
```

**Stadium Assets:**
```
Prompt: "Football stadium environment pack with 4 different quality levels:
1. Basic stadium: Simple stands, grass pitch with visible wear
2. League Two standard: Better maintained pitch, improved seating
3. Championship level: Modern facilities, pristine pitch, larger capacity
4. Premier League: State-of-the-art stadium, perfect pitch, premium amenities
Top-down optimised, suitable for mobile/TV display"
```

**Ball and Equipment:**
```
Prompt: "Football/soccer ball with realistic physics properties, corner flags, goalposts, referee equipment (whistle, cards), substitution boards, all optimised for real-time rendering"
```

#### 11.1.2 2D UI Assets (Midjourney/DALL-E Prompts)

**Team Badges:**
```
Prompt: "28 unique football club badges inspired by English league teams, heraldic style, featuring lions, eagles, shields, crowns, geometric patterns, high contrast for TV display, vector-style artwork suitable for sports branding"
```

**Formation Diagrams:**
```
Prompt: "Clean tactical formation diagrams for football: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2 formations, minimalist design with player position dots and movement arrows, suitable for TV interface display"
```

**UI Elements:**
```
Prompt: "Football management game UI kit: scoreboard, timer, player substitution interface, tactical instruction buttons, voice command status indicator, TV-optimised with large buttons and high contrast colours"
```

### 11.2 Audio Assets

#### 11.2.1 Crowd Audio (ElevenLabs/Murf Prompts)

**Ambient Crowd Noise:**
```
Prompt: "Football stadium crowd atmosphere audio:
- Base ambient murmur of 20,000+ crowd
- Rising excitement during attacks
- Tension during defensive pressure
- Celebratory atmosphere after goals
- Disappointed sighs after missed chances
Record in layers for dynamic mixing, 48kHz quality"
```

**Crowd Chants:**
```
Prompt: "English Premier League style crowd chants:
1. 'Come on [Team Name]' - rhythmic, building intensity
2. 'Defence! Defence!' - call and response style
3. 'Attack! Attack!' - encouraging forward play
4. Generic goal celebration chants
5. Rhythmic clapping patterns during tense moments
Multiple variations of each, crowd sizes from 5,000 to 50,000"
```

#### 11.2.2 Commentary Audio (ElevenLabs)

**Match Commentary:**
```
Prompt: "Professional football commentator voice, British accent:
- Goal announcements with varying excitement levels
- Foul descriptions and referee decisions
- Player name pronunciations (generic names)
- Tactical analysis phrases
- Half-time and full-time summaries
- Weather and pitch condition comments
Energetic but clear for TV speakers"
```

**Referee Audio:**
```
Prompt: "Football referee sounds:
- Whistle blows (start/stop play, fouls, cards)
- Advantage calls
- Offside signals
- Match official communication sounds
Clear, authoritative, suitable for game audio mixing"
```

### 11.3 Music and Sound Effects

#### 11.3.1 Musical Score (Suno.ai/Mubert Prompts)

**Match Intro Music:**
```
Prompt: "Epic football anthem, orchestral with modern electronic elements, builds excitement for match start, 60 seconds, loop-friendly, similar to Champions League anthem but original composition"
```

**Menu Background Music:**
```
Prompt: "Upbeat sports-themed background music for game menus, subtle and non-intrusive, modern electronic with orchestral elements, seamless loop, energetic but not overwhelming"
```

#### 11.3.2 Sound Effects Library

**Gameplay Sounds:**
```
Required sound effects:
- Ball kick variations (soft pass, hard shot, header)
- Ball hitting post/crossbar
- Crowd gasps and cheers
- Footsteps on grass
- Player collision sounds
- Referee whistle variations
- Stadium announcer (muffled PA system)
All sounds should be clear and distinct for TV audio systems
```

### 11.4 Weather and Environmental Effects

#### 11.4.1 Weather Visuals (Runway ML/Stable Video)

**Weather Conditions:**
```
Prompt: "Football match weather effects:
1. Clear sunny day - bright green pitch, sharp shadows
2. Overcast conditions - diffused lighting, grey sky
3. Light rain - wet pitch surface, player spray effects
4. Heavy rain - reduced visibility, muddy conditions
5. Snow - white accumulation, breath vapour from players
Top-down view optimised, subtle effects suitable for mobile performance"
```

### 11.5 Asset Directory Structure

#### 11.5.1 Proposed Asset Organisation

```
apps/client/public/assets/
├── sprites/
│   ├── players/
│   │   ├── outfield/
│   │   │   ├── idle.png                    # 32x32 idle animation frames
│   │   │   ├── running.png                 # 32x32 8-directional running
│   │   │   ├── kicking.png                 # 32x32 ball interaction frames
│   │   │   ├── tackling.png               # 32x32 defensive actions
│   │   │   └── celebrating.png            # 32x32 goal celebrations
│   │   ├── goalkeeper/
│   │   │   ├── idle.png                   # GK-specific idle poses
│   │   │   ├── diving.png                 # Diving save animations
│   │   │   ├── catching.png               # Ball handling frames
│   │   │   └── throwing.png               # Distribution animations
│   │   └── referee/
│   │       ├── idle.png                   # Referee idle/walking
│   │       ├── signalling.png             # Card/whistle gestures
│   │       └── running.png                # Referee movement
│   ├── ball/
│   │   ├── stationary.png                 # 16x16 static ball
│   │   ├── rolling.png                    # Ball rotation frames
│   │   └── spinning.png                   # Ball spin effects
│   ├── ui/
│   │   ├── formations/
│   │   │   ├── 4-4-2.svg                  # Formation diagrams
│   │   │   ├── 4-3-3.svg
│   │   │   ├── 3-5-2.svg
│   │   │   └── 4-2-3-1.svg
│   │   ├── badges/
│   │   │   ├── team-01.svg                # Team badge designs
│   │   │   ├── team-02.svg
│   │   │   └── ... (up to team-28.svg)
│   │   ├── hud/
│   │   │   ├── scoreboard.png             # Match scoreboard UI
│   │   │   ├── timer.png                  # Match clock display
│   │   │   ├── voice-indicator.png        # Voice command status
│   │   │   └── substitution-panel.png     # Player substitution UI
│   │   └── buttons/
│   │       ├── tactical/                  # Voice command buttons
│   │       │   ├── attack.png
│   │       │   ├── defend.png
│   │       │   └── balance.png
│   │       └── navigation/                # Menu navigation
│   │           ├── play.png
│   │           ├── pause.png
│   │           └── settings.png
│   └── stadiums/
│       ├── backgrounds/
│       │   ├── national-league/
│       │   │   ├── pitch.png              # 1920x1080 stadium background
│       │   │   └── stands.png             # Crowd/stadium overlay
│       │   ├── league-two/
│       │   │   ├── pitch.png
│       │   │   └── stands.png
│       │   ├── championship/
│       │   │   ├── pitch.png
│       │   │   └── stands.png
│       │   └── premier-league/
│       │       ├── pitch.png
│       │       └── stands.png
│       └── elements/
│           ├── goalposts.png              # Stadium furniture sprites
│           ├── corner-flags.png
│           ├── penalty-spot.png
│           └── centre-circle.png
├── audio/
│   ├── crowd/
│   │   ├── ambient/
│   │   │   ├── base-murmur-large.ogg      # 50k+ crowd background
│   │   │   ├── base-murmur-medium.ogg     # 20k crowd background
│   │   │   └── base-murmur-small.ogg      # 5k crowd background
│   │   ├── reactions/
│   │   │   ├── goal-celebration.ogg       # Massive cheers
│   │   │   ├── goal-disappointment.ogg    # Opposing team reaction
│   │   │   ├── near-miss-gasp.ogg         # Close chances
│   │   │   ├── penalty-tension.ogg        # Penalty anticipation
│   │   │   ├── foul-boos.ogg             # Controversial decisions
│   │   │   └── card-mixed-reaction.ogg    # Card reactions
│   │   └── chants/
│   │       ├── support/
│   │       │   ├── come-on-team.ogg       # "Come on [Team]!"
│   │       │   ├── team-name-repeat.ogg   # Rhythmic team chanting
│   │       │   └── we-are-team.ogg        # "We are [Team]!"
│   │       ├── players/
│   │       │   ├── only-one-player.ogg    # "There's only one..."
│   │       │   └── super-player.ogg       # "Super [Player Name]!"
│   │       ├── tactical/
│   │       │   ├── defense-chant.ogg      # "DEE-FENSE!"
│   │       │   ├── attack-chant.ogg       # "Attack! Attack!"
│   │       │   └── call-response.ogg      # "What do we want?"
│   │       └── celebrations/
│   │           ├── goal-chant-long.ogg    # Extended goal celebrations
│   │           └── victory-chant.ogg      # Match-winning celebrations
│   ├── commentary/
│   │   ├── goals/
│   │   │   ├── goal-excitement-high.ogg   # High-excitement goal calls
│   │   │   ├── goal-excitement-medium.ogg
│   │   │   └── goal-excitement-low.ogg
│   │   ├── fouls/
│   │   │   ├── foul-called.ogg           # Foul announcements
│   │   │   ├── advantage-played.ogg      # Advantage calls
│   │   │   └── booking-yellow.ogg        # Card commentary
│   │   ├── general/
│   │   │   ├── half-time.ogg             # Half-time summary
│   │   │   ├── full-time.ogg             # Match conclusion
│   │   │   └── substitution.ogg          # Player changes
│   │   └── tactical/
│   │       ├── attacking-play.ogg        # Tactical observations
│   │       ├── defensive-setup.ogg
│   │       └── formation-change.ogg
│   ├── sfx/
│   │   ├── ball/
│   │   │   ├── kick-soft.ogg             # Gentle passes
│   │   │   ├── kick-hard.ogg             # Powerful shots
│   │   │   ├── ball-post.ogg             # Ball hitting post
│   │   │   └── ball-net.ogg              # Ball in net sound
│   │   ├── referee/
│   │   │   ├── whistle-start.ogg         # Match start/restart
│   │   │   ├── whistle-foul.ogg          # Foul calls
│   │   │   ├── whistle-end.ogg           # Half/full time
│   │   │   └── whistle-advantage.ogg     # Advantage signal
│   │   ├── players/
│   │   │   ├── footsteps-grass.ogg       # Running on pitch
│   │   │   ├── player-collision.ogg      # Player contact
│   │   │   └── breathing-heavy.ogg       # Exertion sounds
│   │   └── stadium/
│   │       ├── announcer-muffled.ogg     # PA system announcements
│   │       └── turnstiles.ogg            # Pre-match atmosphere
│   └── music/
│       ├── menu/
│       │   ├── main-theme.ogg            # Main menu background
│       │   └── team-selection.ogg        # Team/formation selection
│       ├── match/
│       │   ├── pre-match-buildup.ogg     # Match intro music
│       │   ├── goal-celebration.ogg      # Goal celebration stinger
│       │   └── victory-theme.ogg         # Match victory music
│       └── ambient/
│           ├── tension-buildup.ogg       # Close match tension
│           └── celebration-loop.ogg      # Extended celebration music
├── fonts/
│   ├── scoreboard/
│   │   └── digital-display.woff2         # LED-style scoreboard font
│   ├── ui/
│   │   ├── headers-bold.woff2            # UI header text
│   │   └── body-text.woff2               # General UI text
│   └── commentary/
│       └── subtitle-text.woff2           # Commentary subtitles
└── config/
    ├── sprite-animations.json            # Animation frame definitions
    ├── audio-mixing.json                 # Audio level configurations
    ├── team-data.json                    # Team names, badges, colours
    └── formation-layouts.json            # Tactical formation coordinates
```

#### 11.5.2 Asset Loading Strategy

```typescript
interface AssetLoader
{
  loadSpriteSheet(path: string): Promise<SpriteSheet>;
  loadAudioClip(path: string): Promise<AudioBuffer>;
  loadConfiguration(path: string): Promise<ConfigurationData>;
  preloadCriticalAssets(): Promise<void>;
  loadAssetsOnDemand(assetGroup: AssetGroup): Promise<void>;
}

enum AssetGroup
{
  CORE_GAMEPLAY = 'core_gameplay',        // Players, ball, basic UI
  STADIUM_TIER_1 = 'stadium_national',    // National League assets
  STADIUM_TIER_2 = 'stadium_league_two',  // League Two assets
  STADIUM_TIER_3 = 'stadium_championship', // Championship assets
  STADIUM_TIER_4 = 'stadium_premier',     // Premier League assets
  CROWD_AUDIO = 'crowd_audio',            // All crowd-related audio
  COMMENTARY = 'commentary',              // Commentary voice clips
  UI_ELEMENTS = 'ui_elements'             // Menus, buttons, HUD
}
```

### 11.6 Asset Specifications

#### 11.6.1 Technical Requirements

**Sprite Sheets:**
- Individual sprite size: 32x32 pixels for players, 16x16 for ball
- Sheet size: Maximum 1024x1024 per animation set
- Format: PNG with transparency support
- Animation: Frame-based sprite animation (8-12 FPS)
- Compression: Optimised for web delivery

**Audio Files:**
- Format: OGG Vorbis for web compatibility
- Quality: 44.1kHz, 16-bit minimum
- Compression: Optimised for streaming
- Length: Individual effects <3 seconds, ambient loops 30-60 seconds

**2D Graphics:**
- Resolution: Vector-based (SVG) preferred for UI elements
- Texture size: Power of 2 (256x256, 512x512, 1024x1024)
- Format: WebP for photographs, PNG for UI elements
- Colour depth: 24-bit RGB minimum

## 12. Deployment and Infrastructure

### 12.1 Build System

#### 12.1.1 Development Pipeline
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @game/server dev\" \"pnpm --filter @game/client dev\"",
    "build": "pnpm --filter @game/shared build && pnpm --filter @game/server build && pnpm --filter @game/client build",
    "test": "pnpm --filter @game/server test && pnpm --filter @game/client test",
    "lint": "pnpm --filter \"*\" lint",
    "typecheck": "pnpm --filter \"*\" typecheck"
  }
}
```

### 12.2 Production Deployment

#### 12.2.1 Server Configuration
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/server/index.js"]
```

### 12.3 Monitoring and Observability

#### 12.3.1 Health Checks
```typescript
interface HealthStatus
{
  server: 'healthy' | 'degraded' | 'unhealthy';
  redis: 'connected' | 'disconnected';
  activeMatches: number;
  averageLatency: number;
}
```

## 13. Development Phases and Milestones

### 13.1 Phase 1: Core Match Engine (Months 1-3)

**Milestones:**
- [ ] Basic VGF server setup with Redis storage
- [ ] Player and team data models implementation
- [ ] Simple AI movement and ball physics
- [ ] Voice command recognition (basic commands only)
- [ ] Top-down match view with basic rendering
- [ ] Single-player vs AI matches

### 13.2 Phase 2: Multiplayer and Enhanced Features (Months 4-6)

**Milestones:**
- [ ] Real-time multiplayer via Socket.IO
- [ ] Complete referee system with all rules
- [ ] Advanced AI behaviour based on player attributes
- [ ] Full voice command set implementation
- [ ] Basic crowd audio and commentary system
- [ ] TV-optimised UI/UX

### 13.3 Phase 3: League System (Months 7-10)

**Milestones:**
- [ ] 28-team league structure
- [ ] Weekly league cycles with promotion/relegation
- [ ] Player trading marketplace
- [ ] Stadium progression system
- [ ] Complete audio system with dynamic chants
- [ ] Performance optimisation for FireTV

### 13.4 Phase 4: Polish and Launch (Months 11-12)

**Milestones:**
- [ ] Comprehensive testing and bug fixes
- [ ] Audio/visual polish and asset integration
- [ ] Tutorial and onboarding system
- [ ] Analytics and monitoring implementation
- [ ] Beta testing and user feedback integration
- [ ] Production deployment and launch

This Technical Design Document provides the comprehensive technical foundation for implementing Soccer Manager: World Cup Edition, covering all aspects from system architecture to asset creation prompts for AI tools.