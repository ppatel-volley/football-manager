# Technical Design Document: Super Soccer Manager: Pro Edition

## 1. Executive Summary

**Document Version**: 1.1
**Date**: 13 August 2025
**Product**: Super Soccer Manager: Pro Edition
**Architecture**: Voice-controlled football management game with POC focus on AI evaluation

This Technical Design Document outlines the technical architecture and implementation details for developing Super Soccer Manager: Pro Edition. The current focus is on **Phase 1 POC** - a proof-of-concept demonstrating AI-controlled football matches for evaluation and foundation validation.

### 1.1 POC Scope Definition

**Primary Goal**: Demonstrate viable AI football simulation with formation adherence and realistic match flow

**In-Scope for POC**:
- AI vs AI autonomous match simulation
- 2D Canvas physics (no Z-axis/height)
- Ball in/out detection with basic restarts (throw-ins, corners, goal kicks)
- Half-time transitions with team switching
- Formation-based player positioning (pre-defined 4-4-2, 4-3-3)
- Basic statistics tracking (possession, shots, corners)
- FireTV Stick 4K Max optimisation (30+ FPS target)

**Explicitly Out-of-Scope**:
- Voice command system (Phase 2)
- Offside detection and foul system
- Advanced AI learning and adaptation
- Real-time multiplayer functionality
- Commentary and audio systems

### 1.2 Deterministic Simulation Policy

**Critical Requirement**: All simulation logic (AI decisions, physics, formation positioning) MUST use deterministic game time to ensure reproducible behaviour across different devices, runs, and test scenarios.

**Forbidden in Simulation Logic**:
- `Date.now()` - Wall-clock time (non-deterministic)
- `performance.now()` - High-resolution wall-clock time
- `Math.random()` without seeded RNG
- Any system-dependent timing

**Required for Simulation**:
- Fixed timestep game loop (33.33ms steps)
- Seeded pseudo-random number generation
- Game time passed as `deltaTime` parameter to all AI and physics systems
- Clamped delta time to prevent "spiral of death" scenarios

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
- VGF Server framework
- TypeScript for type safety
- Socket.IO for WebSocket transport
- Redis for persistent storage

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
  // POC: simple predefined formations; Phase 2: replace with FET adapter
  private formationManager: FormationManager; // POC placeholder
  private aiControllers: Map<string, TeamAIController>;
  private matchState: MatchState;
  private statistics: MatchStatistics;

  // Performance optimization
  private positionBuffer: Float32Array;      // All player positions (44 floats)
  private lastUpdateTime: number;
  private frameTimeTarget: number = 33;      // 30 FPS target (33ms per frame as per PRD)

  constructor(homeTeam: Team, awayTeam: Team) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.ball = new Ball();
    this.referee = new Referee();

    // Initialize game systems
    this.physicsEngine = new Physics2DEngine();
    // POC placeholder; Phase 2: load formations via FET export adapter
    this.formationManager = new FormationManager();
    this.aiControllers = new Map();
    this.statistics = new MatchStatistics();

    // Set up AI controllers for both teams
    this.aiControllers.set(homeTeam.id, new TeamAIController(homeTeam, "4-4-2"));
    this.aiControllers.set(awayTeam.id, new TeamAIController(awayTeam, "4-3-3"));

    // Pre-allocate position buffer for SIMD optimization
    this.positionBuffer = new Float32Array(44); // 22 players * 2 coordinates

    this.matchState = MatchState.PREPARING_KICKOFF;
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

    // Update match state first
    this.updateMatchState(clampedDelta);

    if (this.matchState === MatchState.IN_PLAY) {
      // CRITICAL: AI and physics MUST use clampedDelta, never raw system time
      this.updateAI(clampedDelta);        // Deterministic AI decisions
      this.updatePhysics(clampedDelta);   // Deterministic physics simulation
      this.updateStatistics(clampedDelta); // Statistics tracking
    }

    // Handle state transitions
    this.checkStateTransitions();
  }

  private updateAI(deltaTime: number): void {
    const gameContext = this.buildGameContext();

    // Update both team AI controllers
    this.aiControllers.get(this.homeTeam.id)?.update(gameContext, deltaTime);
    this.aiControllers.get(this.awayTeam.id)?.update(gameContext, deltaTime);

    // Update individual player AI
    this.homeTeam.updatePlayers(gameContext, deltaTime);
    this.awayTeam.updatePlayers(gameContext, deltaTime);
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
  ball: Ball;
  matchState: MatchState;
  statistics: MatchStatistics;
  matchTime: MatchTime;
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

  public updatePlayers(context: GameContext, deltaTime: number): void {
    // Update each player's AI and movement
    for (const player of this.players) {
      player.update(context, deltaTime);
    }
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
    // Mirror positions for away team (attacking left instead of right)
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
    // Basic AI decisions based on game context and player attributes

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
    } else {
      // Opposition has possession - defend
      this.targetPosition = this.getDefensivePosition(context);
    }
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
  shooting: number;
  heading: number;
  freeKickTaking: number;

  // Mental attributes
  vision: number;
  decisions: number;
  concentration: number;
  composure: number;
  anticipation: number;

  // Physical attributes
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  jumping: number;
  agility: number;

  // Defensive skills
  tackling: number;
  marking: number;
  positioning: number;

  // Mental/Social attributes
  teamwork: number;
  workRate: number;
  leadership: number;

  // Goalkeeper-specific (optional)
  handling?: number;
  reflexes?: number;
  aerialReach?: number;
  oneOnOnes?: number;
  distribution?: number;
}
```

#### 3.2.4 Ball Class Implementation

```typescript
// **POC ONLY** - Simplified 2D Ball (no height/3D effects)
class Ball {
  public position: Vector2;
  public velocity: Vector2;
  public owner: Player | null;
  public lastTouchedBy: Player | null;
  public isMoving: boolean = false;

  private radius: number = 0.01; // Normalized ball size
  private friction: number = 0.98; // 2% velocity loss per frame

  constructor() {
    this.position = { x: 0.5, y: 0.5 }; // Center of pitch
    this.velocity = { x: 0, y: 0 };
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
    // **POC ONLY** - Simple 2D movement
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Apply 2D friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

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

  public kick(direction: Vector2, power: number, kicker: Player): void {
    // Apply kick to ball
    this.velocity.x = direction.x * power * 0.5;
    this.velocity.y = direction.y * power * 0.5;

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
    const goalWidth = 0.2; // 20% of pitch width
    const goalY = (1 - goalWidth) / 2;

    // Check if ball is in goal area and crossed goal line
    if (this.position.y >= goalY && this.position.y <= goalY + goalWidth) {
      if (this.position.x <= 0) return { inGoal: true, side: 'home' };
      if (this.position.x >= 1) return { inGoal: true, side: 'away' };
    }

    return { inGoal: false };
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

    const ballRadius = 8; // pixels
    const playerRadius = 15; // pixels
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
  private readonly margin = 10; // pixels from edge

  public clampPlayerPosition(player: Player): void {
    player.position.x = Math.max(this.margin, Math.min(POC_CONFIG.FIELD_WIDTH - this.margin, player.position.x));
    player.position.y = Math.max(this.margin, Math.min(POC_CONFIG.FIELD_HEIGHT - this.margin, player.position.y));
  }

  public isBallOutOfPlay(ballPosition: Vector2): { out: boolean; side?: 'left' | 'right' | 'top' | 'bottom' } {
    if (ballPosition.x < 0) return { out: true, side: 'left' };
    if (ballPosition.x > POC_CONFIG.FIELD_WIDTH) return { out: true, side: 'right' };
    if (ballPosition.y < 0) return { out: true, side: 'top' };
    if (ballPosition.y > POC_CONFIG.FIELD_HEIGHT) return { out: true, side: 'bottom' };

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

#### 3.7.2 Canvas 2D Optimization
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
```

### 3.8 Player Abilities System

**POC Constraint**: Basic attribute-driven behaviour with simplified ability execution. Complex skill animations and detailed ability mechanics are deferred to Phase 2.

#### 3.8.1 Core Player Abilities

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

#### 3.8.2 Player Attribute System

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

#### 3.8.3 Formation-Based Player Positioning
```typescript
// Integration with existing formation system from earlier sections
class FormationAwarePlayer extends Player {
  private formationPosition: Vector2;
  private roleSpecificBehaviour: RoleSpecificBehaviour;

  constructor(basePlayer: Player, formation: FormationData, role: string) {
    super(basePlayer);
    this.formationPosition = formation.getPositionForRole(role);
    this.roleSpecificBehaviour = new RoleSpecificBehaviour(role);
  }

  public update(gameContext: GameContext, deltaTime: number): void {
    // Get formation target from Float32Array optimized system
    const formationTarget = this.getFormationTarget(gameContext);

    // Apply role-specific adjustments
    const adjustedTarget = this.roleSpecificBehaviour.adjustPosition(
      formationTarget,
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

class MatchStateManager
{
  private currentState: MatchState;
  private stateTimer: number;
  private stateHandlers: Map<MatchState, StateHandler>;

  public update(gameState: GameState, deltaTime: number): void
  {
    const handler = this.stateHandlers.get(this.currentState);
    if (handler)
    {
      handler.update(gameState, deltaTime);

      // Check for state transitions
      const nextState = handler.checkTransitions(gameState);
      if (nextState && nextState !== this.currentState)
      {
        this.transitionToState(nextState, gameState);
      }
    }
  }

  private transitionToState(newState: MatchState, gameState: GameState): void
  {
    // Exit current state
    const currentHandler = this.stateHandlers.get(this.currentState);
    if (currentHandler)
    {
      currentHandler.exit(gameState);
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
  FREE_KICK = 'free_kick',             // **PHASE 2 ONLY** - Free kick restart
  PENALTY = 'penalty',                 // **PHASE 2 ONLY** - Penalty kick
  GOAL_SCORED = 'goal_scored',         // Goal celebration and reset
  HALF_TIME = 'half_time',             // Half-time transition
  FULL_TIME = 'full_time'              // Match completed
}

interface GameState
{
  matchId: string;
  phase: MatchPhase;
  previousPhase: MatchPhase;           // For returning from stoppages
  time: MatchTime;
  score: Score;
  teams: [Team, Team];
  ball: Ball;
  referee: Referee;
  weather: WeatherConditions;
  events: MatchEvent[];
  statistics: MatchStatistics;

  // Kickoff management
  kickoffTeam: 'HOME' | 'AWAY';
  initialKickoffTeam: 'HOME' | 'AWAY';
  restartPosition: Vector2 | null;     // Position for restarts (throw-ins, etc.)
  restartTeam: 'HOME' | 'AWAY' | null;

  // Match state timing
  phaseStartTime: number;              // When current phase started
  phaseElapsedTime: number;            // Time in current phase

  // Advanced match context
  possession: 'HOME' | 'AWAY' | null;  // Current team in possession
  lastTouch: Player | null;            // Last player to touch ball
  pressureLevel: number;               // 0-1, attacking pressure intensity
  tempo: number;                       // 0-1, pace of play
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

interface WeatherConditions
{
  type: 'clear' | 'overcast' | 'light_rain' | 'heavy_rain' | 'snow';
  visibility: number;                 // 0-1, affects player vision
  windSpeed: number;                  // 0-10, affects ball physics
  windDirection: number;              // 0-360 degrees
  temperature: number;                // Celsius, affects player stamina
  pitchCondition: number;             // 0-1, pitch quality (dry to waterlogged)
}

interface MatchStatistics
{
  possession: [number, number];        // Possession percentage [home, away]
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];             // **PHASE 2 ONLY**
  cards: [CardEvent[], CardEvent[]];   // **PHASE 2 ONLY**
  passes: [number, number];            // **PHASE 2 ONLY** - Total passes attempted
  passAccuracy: [number, number];     // **PHASE 2 ONLY** - Pass completion percentage
  tackles: [number, number];          // **PHASE 2 ONLY** - Successful tackles
  interceptions: [number, number];    // Ball interceptions
  offside: [number, number];          // **PHASE 2 ONLY** - Offside calls

  // **PHASE 2 ONLY** - Advanced statistics
  heatmaps: PlayerHeatmap[];          // **PHASE 2 ONLY** - Player position data
  touchMap: BallTouchData[];          // **PHASE 2 ONLY** - Ball touch locations
  pressureMap: PressureData[];        // **PHASE 2 ONLY** - Defensive pressure zones
}
```

#### 3.2.3 Half-Time System Implementation

The half-time system manages the transition between the first and second halves, ensuring proper team positioning and kick-off team alternation.

```typescript
interface HalfTimeManager
{
  detectHalfTimeReached(matchTime: MatchTime): boolean;
  resetPlayersToFormation(teams: [Team, Team]): void;
  switchKickoffTeam(currentKickoff: 'HOME' | 'AWAY', initialKickoff: 'HOME' | 'AWAY'): 'HOME' | 'AWAY';
  transitionToSecondHalf(gameState: GameState): GameState;
}

class HalfTimeManager implements HalfTimeManager
{
  public detectHalfTimeReached(matchTime: MatchTime): boolean
  {
    const halfDuration = MATCH_DURATION / 2;
    return matchTime.elapsed >= halfDuration &&
           !matchTime.halfTimeTriggered &&
           matchTime.period === 2;
  }

  public resetPlayersToFormation(teams: [Team, Team]): void
  {
    teams.forEach(team => {
      team.players.forEach(player => {
        // Reset to formation positions within own half
        player.position = { ...player.basePosition };
        player.targetPosition = { ...player.basePosition };
        player.state = PlayerState.WAITING_KICKOFF;
        player.hasBall = false;
      });
    });
  }

  public switchKickoffTeam(currentKickoff: 'HOME' | 'AWAY', initialKickoff: 'HOME' | 'AWAY'): 'HOME' | 'AWAY'
  {
    // Team that didn't kick off first half kicks off second half
    return initialKickoff === 'HOME' ? 'AWAY' : 'HOME';
  }

  public transitionToSecondHalf(gameState: GameState): GameState
  {
    return {
      ...gameState,
      phase: MatchPhase.KICKOFF,
      kickoffTeam: this.switchKickoffTeam(gameState.kickoffTeam, gameState.initialKickoffTeam),
      time: {
        ...gameState.time,
        halfTimeTriggered: true
      }
    };
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

  public teamId: string;
  public difficulty: AIDifficulty;
  public tacticalMemory: TacticalMemory;
  public currentStrategy: TeamStrategy;

  // Core AI processing
  public processFrame(gameState: GameState): void;
  public calculateTacticalSituation(gameState: GameState): TacticalSituation;
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

  public detectFouls(players: Player[], ball: Ball): Foul[];
  public checkOffside(attackingTeam: Team, ball: Ball): boolean;
  public manageAdvantage(foul: Foul, gameState: GameState): AdvantageDecision;
  public updatePosition(ball: Ball, players: Player[]): void;
}
```

#### 3.5.2 Match Events
```typescript
enum EventType
{
  GOAL = 'goal',
  FOUL = 'foul',                       // **PHASE 2 ONLY**
  CARD = 'card',                       // **PHASE 2 ONLY**
  SUBSTITUTION = 'substitution',       // **PHASE 2 ONLY**
  OFFSIDE = 'offside'                  // **PHASE 2 ONLY**
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
// apps/server/src/VGFServer.ts
import { VGFServer } from '@vgf/server';

const server = new VGFServer(
{
  port: process.env.PORT || 3001,
  storage:
  {
    type: 'redis',
    url: process.env.REDIS_URL
  },
  transport:
  {
    type: 'socket.io',
    cors: { origin: process.env.CLIENT_URL }
  }
});

server.addRuleset(new FootballGameRuleset());
```

#### 4.1.2 Client Integration
```typescript
// apps/client/src/hooks/useVGF.ts
import { useVGFClient } from '@vgf/client-react';

export function useFootballGame()
{
  const { state, dispatch, phase } = useVGFClient<GameState, GameAction>();

  return {
    gameState: state,
    sendVoiceCommand: (command: VoiceCommand) => dispatch({ type: 'VOICE_COMMAND', command }),
    matchPhase: phase
  };
}
```

### 4.2 State Synchronisation

#### 4.2.1 Delta Updates
```typescript
interface GameStateDelta
{
  timestamp: number;
  playerPositions?: Map<string, Vector2>;
  ballPosition?: Vector2;
  score?: Score;
  events?: MatchEvent[];
}
```

#### 4.2.2 Conflict Resolution
- Server-authoritative game state
- Client prediction with server reconciliation
- Rollback for incorrect predictions

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

interface MatchStatistics
{
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  cards: [CardEvent[], CardEvent[]];
}
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

### 10.1 POC Acceptance Tests (Priority 1 - Critical)

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

### 10.2 Advanced Testing Strategy (Phase 2+)

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

This Technical Design Document provides the comprehensive technical foundation for implementing Super Soccer Manager: Pro Edition, covering all aspects from system architecture to asset creation prompts for AI tools.