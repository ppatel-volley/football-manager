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

#### 3.2.1 Match Engine Core
```typescript
class MatchEngine
{
  private gameState: GameState;
  private players: Map<string, Player>;
  private referee: Referee;
  private physics: PhysicsEngine;
  private masterAI: MasterAIController;     // Updated to use new AI system
  private performanceMonitor: PerformanceMonitor;

  public processFrame(deltaTime: number): void;
  public handlePlayerAction(action: GameAction): void;
  public handleTacticalInstruction(instruction: TacticalCommand): void;
  public checkRules(): RuleViolation[];
  public getAIPerformanceMetrics(): AIQualityMetrics;
}
```

#### 3.2.2 Game State Management
```typescript
interface GameState
{
  matchId: string;
  phase: MatchPhase;
  time: MatchTime;
  score: Score;
  teams: [Team, Team];
  ball: Ball;
  events: MatchEvent[];
}

interface MatchTime
{
  elapsed: number;        // Minutes elapsed (0-90+)
  period: 1 | 2;         // First or second half
  stoppage: number;      // Added time
  realTimeStart: number; // Unix timestamp
}
```

### 3.3 Advanced AI System Architecture

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

// Master AI Controller orchestrating all AI systems
class MasterAIController
{
  private spatialAnalysis: VoronoiPositioning;
  private ballProgression: BallProgressionEngine;
  private tacticalInterpreter: TacticalInstructionSystem;
  private opponentAI: OpponentAI;
  
  public processFrame(gameState: GameState): void;
  public handleTacticalInstruction(instruction: TacticalCommand): void;
  public updateFormationPositioning(formation: Formation): void;
}

// AI Opponent System (Single-Player Mode)
class OpponentAI
{
  private difficulty: AIDifficulty;
  private tacticalStyle: TacticalStyle;
  private reactionTime: number;
  private adaptiveMemory: TacticalMemory;
  
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

#### 3.3.4 Tactical Instruction Interpretation System
```typescript
class TacticalInstructionSystem
{
  private currentMentality: TacticalMentality;
  private dutyDistribution: DutyDistribution;
  private instructionTemplates: Map<TacticalCommand, InstructionTemplate>;
  
  public processTacticalCommand(command: TacticalCommand): TeamAdjustments;
  public updatePlayerDuties(mentality: TacticalMentality): PlayerDutyMap;
  public calculateFormationShift(instruction: TacticalCommand): FormationAdjustment;
  public applyRealTimeAdjustments(players: Player[], instruction: TacticalCommand): void;
}

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

#### 3.4.1 Ball Physics
```typescript
class BallPhysics
{
  position: Vector2;
  velocity: Vector2;
  spin: number;

  public update(deltaTime: number, weather: WeatherConditions): void;
  public applyForce(force: Vector2, contactPoint: Vector2): void;
  public checkCollisions(players: Player[], boundaries: Boundary[]): Collision[];
}
```

#### 3.4.2 Player Movement and Sprite Animation
```typescript
interface PlayerMovement
{
  targetPosition: Vector2;
  currentPosition: Vector2;
  facing: number;
  speed: number;
  spriteAnimation: SpriteAnimation;
}

interface SpriteAnimation
{
  currentFrame: number;
  frameCount: number;
  frameRate: number; // FPS for animation
  animationType: 'idle' | 'running' | 'kicking' | 'celebration';
  spriteSheet: HTMLImageElement;
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

## 8. Data Models

### 8.1 Core Game Entities

#### 8.1.1 Team Structure
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

### 10.1 Unit Testing

#### 10.1.1 Game Logic Tests
```typescript
describe('AIController', () =>
{
  test('should make appropriate decisions based on player attributes', () =>
  {
    const player = createPlayerWithAttributes({ decisions: 8.5, positioning: 7.0 });
    const gameState = createGameState({ phase: 'defending' });

    const decisions = aiController.evaluateOptions(player, gameState);
    expect(decisions[0].action.type).toBe('DEFENSIVE_POSITIONING');
  });
});
```

### 10.2 Integration Testing

#### 10.2.1 Voice Command Pipeline
```typescript
describe('Voice Command Integration', () =>
{
  test('should process voice command end-to-end', async () =>
  {
    const audioInput = createMockAudioStream('attack');
    const command = await voiceProcessor.recogniseSpeech(audioInput);
    const action = commandParser.parseCommand(command);

    expect(action.type).toBe('TACTICAL_CHANGE');
    expect(action.data.style).toBe('ATTACKING');
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