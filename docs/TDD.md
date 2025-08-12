# Technical Design Document: Super Soccer Manager: Pro Edition

## 1. Executive Summary

**Document Version**: 1.0
**Date**: 12 August 2025
**Product**: Super Soccer Manager: Pro Edition
**Architecture**: Voice-controlled football management game supporting single-player and multiplayer modes

This Technical Design Document outlines the technical architecture, implementation details, and asset requirements for developing Super Soccer Manager: Pro Edition. The game supports both single-player (human vs AI) and multiplayer (human vs human) gameplay modes.

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
Single-Player Mode (Human vs AI):
┌─────────────────┐    ┌─────────────────┐
│   Client (TV)   │────│  Local Engine   │
│  - React App    │    │  - AI Opponent  │
│  - Voice Input  │    │  - Match Logic  │ 
│  - Canvas 2D    │    │  - Team Control │
└─────────────────┘    └─────────────────┘

Multiplayer Mode (Human vs Human):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client (TV)   │────│  VGF Server     │────│   Redis Store   │
│  - React App    │    │  - Game Logic   │    │  - Game State   │
│  - Voice Input  │    │  - Match Engine │    │  - User Data    │
│  - Canvas 2D    │    │  - Socket.IO    │    │  - Sessions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
           Real-time Socket.IO
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

### 3.2 Game Engine Architecture

#### 3.2.1 Enhanced Match Engine Core
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
  FREE_KICK = 'free_kick',
  PENALTY = 'penalty',
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
  FREE_KICK = 'free_kick',             // Free kick restart
  PENALTY = 'penalty',                 // Penalty kick
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
  fouls: [number, number];
  cards: [CardEvent[], CardEvent[]];
  passes: [number, number];            // Total passes attempted
  passAccuracy: [number, number];     // Pass completion percentage
  tackles: [number, number];          // Successful tackles
  interceptions: [number, number];    // Ball interceptions
  offside: [number, number];          // Offside calls
  
  // Advanced statistics
  heatmaps: PlayerHeatmap[];          // Player position data
  touchMap: BallTouchData[];          // Ball touch locations
  pressureMap: PressureData[];        // Defensive pressure zones
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
  EXPERT = 'expert'             // Near-perfect reactions, complex strategies
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
  public calculateExpectedPossessionValue(currentPosition: Vector2): EPVCalculation;
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

// Expected Possession Value (EPV) calculation
interface EPVCalculation
{
  currentEPV: number;           // -1 to 1, probability of next goal
  progressionBenefit: number;   // EPV gain from advancing ball
  riskPenalty: number;          // EPV loss potential from turnover
  optimalAction: 'pass' | 'dribble' | 'shoot' | 'hold';
  confidenceLevel: number;      // 0-1, certainty in calculation
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

### 3.4 Physics and Movement System

#### 3.4.1 Enhanced Ball Physics Implementation
```typescript
class BallPhysics
{
  position: Vector3;          // Include Z-axis for height calculations
  velocity: Vector3;
  lastPosition: Vector3;      // For bounce calculations
  spin: number;
  mass: number = 0.43;        // FIFA regulation ball mass (430g)
  dragCoefficient: number = 0.350; // Realistic drag coefficient
  gravity: number = 9.81;     // Earth gravity (m/s²)
  bounceEnergyLoss: number = 0.7; // Energy retained after bounce
  owner: Player | null;       // Current ball possessor

  public update(deltaTime: number, weather: WeatherConditions): void;
  public applyKick(force: Vector2, player: Player): void;
  public checkGroundBounce(): boolean;
  public calculateDrag(velocity: Vector3): Vector3;
  public applyGravity(deltaTime: number): void;
  public checkCollisions(players: Player[], boundaries: Boundary[]): Collision[];
}

// Realistic physics constants implementation
interface PhysicsConstants
{
  BALL_MASS: 0.43;              // kg (FIFA regulation)
  AIR_DENSITY: 1.225;           // kg/m³ at sea level
  DRAG_COEFFICIENT: 0.350;      // Sphere drag coefficient
  GRAVITY: 9.81;                // m/s² Earth gravity
  BOUNCE_DAMPING: 0.7;          // Energy loss per bounce
  ROLLING_FRICTION: 0.1;        // Ground friction coefficient
  SPIN_DECAY_RATE: 0.95;        // Spin reduction per frame
}
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
  FOUL = 'foul',
  CARD = 'card',
  SUBSTITUTION = 'substitution',
  OFFSIDE = 'offside'
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
  maxMemoryUsage: 256 * 1024 * 1024; // 256MB (reduced due to sprites)
  maxSpriteSheetSize: 1024; // 1024x1024 max per sheet
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
  
  // Attributes (0-20 scale like Football Manager)
  attributes: PlayerAttributes;
  
  // Animation and rendering
  spriteAnimation: SpriteAnimation;
  height: number;               // For header calculations
  
  // Captain status
  isCaptain: boolean;
  
  // Entity interface methods
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  getBounds(): Circle;
  inPosition(): boolean;        // Whether player has reached destination
}

interface PlayerAttributes
{
  // Technical skills
  ballControl: number;          // Ball handling ability
  dribbling: number;            // 1v1 dribbling skill
  passing: number;              // Short and medium passing
  longPassing: number;          // Long range passing ability
  shooting: number;             // Shot power and accuracy
  heading: number;              // Aerial ability
  freeKickTaking: number;       // Set piece ability
  
  // Mental attributes
  vision: number;               // Ability to spot passes/runs
  decisions: number;            // Decision making under pressure
  concentration: number;        // Focus during match
  composure: number;            // Performance under pressure
  anticipation: number;         // Reading the game
  
  // Physical attributes
  pace: number;                 // Raw speed
  acceleration: number;         // Speed increase rate
  stamina: number;              // Endurance levels
  strength: number;             // Physical power
  jumping: number;              // Leap height
  agility: number;              // Balance and quick movements
  
  // Defensive skills
  tackling: number;             // Tackle success rate
  marking: number;              // Man-to-man defending
  positioning: number;          // Defensive positioning
  
  // Mental/Social attributes
  teamwork: number;             // Following team instructions
  workRate: number;             // Effort and energy levels
  leadership: number;           // Captain and influence ability
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

### 10.1 Comprehensive Testing Strategy

#### 10.1.1 AI System Tests
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