# Development Plan: Super Soccer Manager: Pro Edition

## 1. Overview

**Document Version**: 1.0  
**Date**: 12 August 2025  
**Product**: Super Soccer Manager: Pro Edition  

This document outlines the development phases for Super Soccer Manager: Pro Edition, starting with a basic Proof of Concept (POC) and progressing through to a fully-featured product.

## 2. Development Philosophy

### 2.1 Iterative Approach
- Build incrementally from basic functionality to complex features
- Validate core game mechanics before adding advanced features
- Maintain playable builds at each milestone

### 2.2 FireTV-First Design
- Optimise for TV display from the beginning
- Design UI elements for 10-foot viewing distance
- Test on actual FireTV hardware throughout development

## 3. Phase 1: Proof of Concept (POC)

### 3.1 POC Objectives
- Validate core game engine architecture
- Demonstrate basic AI player behaviour (both controlled players and AI opponent)
- Establish sprite-based rendering pipeline
- Create foundation for future voice integration
- Test single-player vs AI opponent gameplay

### 3.2 POC Scope

#### 3.2.1 Visual Components
```
✅ Core Visual Elements:
- Top-down football pitch background (1920x1080)
- 22 player sprites (11 per team, different kit colours)
- 1 referee sprite (distinctive black uniform)
- Ball sprite with basic movement
- Basic UI overlay (score, timer, team names)
```

#### 3.2.2 Game Mechanics
```
✅ Basic Match Engine:
- 5-minute real-time match (representing 90 minutes)
- Player movement AI with basic positioning
- Ball physics with simple collision detection
- Match timer with half-time break
- Basic scoring system
```

#### 3.2.3 AI Behaviour Evolution Strategy

The AI system will evolve through multiple phases, balancing functionality with FireTV performance constraints:

**Phase 1: POC - Basic AI (Months 1-3)**
```typescript
interface BasicAI
{
  // Simple behaviour states
  seekBall(): void;           // Move towards ball when nearby
  maintainPosition(): void;   // Stay in rough formation position
  passToNearestTeammate(): void;  // Simple passing logic
  shootAtGoal(): void;       // Attempt shot when in penalty area
  defendGoal(): void;        // Goalkeeper basic positioning
}

// Simple tactical instruction system
interface SimpleTacticalProcessor
{
  processAttackCommand(): void;   // Increase aggression values
  processDefendCommand(): void;   // Decrease risk tolerance
  processBalanceCommand(): void;  // Reset to default values
}

// Basic opponent AI for single-player
interface BasicOpponentAI
{
  makeSimpleDecision(gameState: GameState): BasicTacticalCommand;
  difficulty: 'BEGINNER'; // Fixed for POC
  reactionDelay: 3000;    // 3 second reaction time
}

enum PlayerState
{
  SEEKING_BALL = 'seeking_ball',
  MAINTAINING_POSITION = 'maintaining_position', 
  ATTACKING = 'attacking',
  DEFENDING = 'defending'
}
```

**Phase 2: Enhanced AI (Months 4-6)**
```typescript
// Grid-based spatial awareness (simpler than Voronoi)
interface GridBasedPositioning
{
  gridResolution: [20, 14];     // Much coarser grid for performance
  updateFrequency: 5;           // 5Hz updates only
  influenceRadius: 30;          // Metres - limited scope
  calculateGridInfluence(players: Player[]): InfluenceGrid;
}

// Simple ball progression with basic heuristics
interface BasicBallProgression
{
  evaluateSimplePasses(ballCarrier: Player): SimplePassOption[];
  selectBestPass(options: SimplePassOption[]): SimplePassOption;
  // No EPV calculations - just distance and pressure metrics
}
```

**Phase 3: Advanced AI (Months 7-10)**
```typescript
// Introduction of Voronoi diagrams with performance monitoring
interface OptimisedVoronoiSystem
{
  updateFrequency: 10;          // Start at 10Hz, reduce if performance issues
  gridResolution: [50, 34];    // Start smaller, increase if performance allows
  fallbackToGrid: boolean;     // Automatic fallback if FPS drops
  performanceThreshold: 25;    // Minimum FPS before fallback
}

// Full ball progression with EPV (if performance allows)
interface AdvancedBallProgression
{
  maxPassOptions: 5;           // Limit calculations 
  decisionTimeout: 8;          // 8ms maximum per decision
  simplifiedEPV: boolean;      // Use approximation instead of full calculation
}
```

**Phase 4: Complete AI (Months 11-12)**
```typescript
// Full system only if performance validated
interface FullAISystem
{
  spatialAnalysis: VoronoiPositioning | GridBasedPositioning; // Conditional
  ballProgression: AdvancedBallProgression | BasicBallProgression;
  adaptiveLearning: boolean;   // Enable only if CPU headroom available
  performanceMode: 'FULL' | 'OPTIMISED' | 'BASIC'; // Runtime adaptation
}
```

#### 3.2.4 Control Interface (Button-Based)
```
🎮 POC Control Panel (Instead of Voice Commands):
Human Player Controls:
- [Attack] - Your team adopts attacking formation
- [Defend] - Your team drops back defensively  
- [Balance] - Return to balanced formation
- [Shoot] - Nearest player attempts shot
- [Pass Short] - Encourage short passing
- [Clear Ball] - Defensive clearance

Match Controls:
- [Pause/Resume] - Match control
- [Reset Match] - Restart for testing
- [Switch Sides] - Play as the other team (for testing)

Note: AI opponent makes decisions automatically based on match situation
```

### 3.3 POC Technical Stack

#### 3.3.1 Simplified Architecture
```typescript
// POC Core Systems
class POCMatchEngine
{
  private players: Player[] = [];
  private ball: Ball;
  private pitch: Pitch;
  private gameTimer: GameTimer;
  private basicAI: BasicAIController;
  private opponentAI: OpponentAI;  // AI opponent for single-player
  
  public initializeMatch(): void;
  public updateFrame(): void;  // 30 FPS game loop
  public handleButtonCommand(command: ButtonCommand, team: 'HUMAN' | 'AI'): void;
  public processAIDecisions(): void;  // AI opponent decision-making
}

interface ButtonCommand
{
  type: 'ATTACK' | 'DEFEND' | 'BALANCE' | 'SHOOT' | 'PASS_SHORT' | 'CLEAR';
  timestamp: number;
}
```

#### 3.3.2 Rendering System
```typescript
class POCRenderer
{
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  
  public renderPitch(): void;
  public renderPlayers(players: Player[]): void;
  public renderBall(ball: Ball): void;
  public renderUI(gameState: GameState): void;
}
```

### 3.4 POC Asset Requirements

#### 3.4.1 Minimal Sprite Set
```
Required POC Assets:
├── sprites/
│   ├── players/
│   │   ├── team-red-idle.png          # 32x32, red kit team
│   │   ├── team-blue-idle.png         # 32x32, blue kit team
│   │   └── goalkeeper-idle.png        # 32x32, distinctive GK kit
│   ├── ball/
│   │   └── ball-static.png            # 16x16, simple ball
│   ├── pitch/
│   │   └── basic-pitch.png            # 1920x1080, green pitch with lines
│   └── ui/
│       ├── button-attack.png          # TV-sized button
│       ├── button-defend.png
│       └── button-balance.png
```

#### 3.4.2 POC UI Layout
```
TV Screen Layout (1920x1080):
┌─────────────────────────────────────────────────────┐
│ Team Red 0 - 0 Team Blue           45:00    [1st]   │ ← Top HUD
├─────────────────────────────────────────────────────┤
│                                                     │
│            🟢 Football Pitch View                   │ ← Main Game Area
│              (Top-down, 1600x800)                   │   (1920x900)
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [Attack] [Defend] [Balance] [Shoot] [Pass] [Clear]  │ ← Control Panel
└─────────────────────────────────────────────────────┘   (1920x180)
```

### 3.5 POC Success Criteria

#### 3.5.1 Technical Validation
- ✅ Consistent 30 FPS on FireTV device
- ✅ Memory usage under 256MB
- ✅ Button commands execute within 100ms
- ✅ Match completes 5-minute duration without crashes

#### 3.5.2 Gameplay Validation
- ✅ Players exhibit believable AI behaviour
- ✅ AI opponent provides challenging but fair gameplay
- ✅ Ball physics feel realistic
- ✅ Basic tactical commands affect team behaviour
- ✅ Goals can be scored by both human and AI teams
- ✅ AI opponent reacts appropriately to player commands

#### 3.5.3 Foundation Validation
- ✅ Code architecture supports future voice integration
- ✅ Sprite rendering system performs efficiently
- ✅ Game state management works correctly
- ✅ Timer and match flow systems function properly
- ✅ Single-player vs AI mode works smoothly
- ✅ Foundation ready for multiplayer expansion

## 4. POC Development Milestones

### 4.1 Week 1-2: Core Infrastructure
- ✅ Set up VGF project structure
- ✅ Create basic Canvas 2D renderer
- ✅ Implement pitch background and basic sprites
- ✅ Game loop with 30 FPS timing

### 4.2 Week 3-4: Player System
- ✅ Player positioning and movement
- ✅ Basic AI state machine
- ✅ AI opponent decision-making system
- ✅ Team differentiation (red vs blue kits)
- ✅ Formation positioning (simple 4-4-2)

### 4.3 Week 5-6: Ball Physics and Interaction
- ✅ Ball movement and collision detection
- ✅ Player-ball interaction (kicking, receiving)
- ✅ Goal detection and scoring
- ✅ Basic passing mechanics

### 4.4 Week 7-8: Control System and UI
- ✅ Button-based control interface
- ✅ Command processing system
- ✅ Match timer and game states
- ✅ Basic UI overlay (score, time, team names)

### 4.5 Week 9-10: Polish and Testing
- ✅ Performance optimisation for FireTV
- ✅ AI behaviour refinement
- ✅ Bug fixes and stability testing
- ✅ POC demonstration preparation

## 5. Post-POC Development Phases

### 5.1 Phase 2: Voice Integration (Weeks 11-16)
- Replace button controls with voice commands
- Implement Web Speech API integration
- Add voice command recognition and parsing
- Create voice feedback system

### 5.2 Phase 3: Enhanced Gameplay (Weeks 17-22)
- Advanced AI with player attributes
- Multiple formations and tactical systems
- Referee system and rule enforcement
- Enhanced ball physics and player animations

### 5.3 Phase 4: Multiplayer Foundation (Weeks 23-28)
- VGF real-time multiplayer implementation
- Player matching and lobby system
- Network optimisation and latency handling
- Cross-platform compatibility testing

### 5.4 Phase 5: League System (Weeks 29-36)
- 28-team league structure
- Weekly league cycles
- Promotion/relegation mechanics
- Player trading system implementation

### 5.5 Phase 6: Audio and Polish (Weeks 37-42)
- Complete audio system implementation
- Crowd reactions and commentary
- Stadium progression visuals
- Performance optimisation and bug fixes

### 5.6 Phase 7: Launch Preparation (Weeks 43-48)
- Beta testing program
- User feedback integration
- Marketing asset creation
- Production deployment and monitoring

## 6. POC Technical Implementation

### 6.1 Project Structure
```
apps/client/src/poc/
├── components/
│   ├── GameCanvas.tsx              # Main game rendering component
│   ├── ControlPanel.tsx            # Button control interface
│   ├── GameHUD.tsx                 # Score, timer, team names
│   └── POCApp.tsx                  # Main POC application
├── engine/
│   ├── POCMatchEngine.ts           # Core game logic
│   ├── BasicAIController.ts        # Simple AI implementation
│   ├── BallPhysics.ts             # Ball movement and collision
│   ├── PlayerController.ts         # Player movement and actions
│   └── GameTimer.ts               # Match timing system
├── rendering/
│   ├── POCRenderer.ts             # Canvas 2D rendering system
│   ├── SpriteManager.ts           # Sprite loading and management
│   └── AssetLoader.ts             # Basic asset loading
├── types/
│   ├── POCTypes.ts                # Basic game type definitions
│   └── CommandTypes.ts            # Button command interfaces
└── utils/
    ├── Vector2.ts                 # 2D vector mathematics
    ├── Collision.ts               # Basic collision detection
    └── Constants.ts               # Game constants and configuration
```

### 6.2 POC Configuration
```typescript
// POC Game Constants
export const POC_CONFIG = 
{
  MATCH_DURATION_SECONDS: 300,        // 5 minutes real-time
  PLAYERS_PER_TEAM: 11,
  FIELD_WIDTH: 1600,
  FIELD_HEIGHT: 800,
  PLAYER_SPEED: 2,                    // pixels per frame at 30fps
  BALL_SPEED: 4,
  AI_UPDATE_FREQUENCY: 10,            // AI decisions per second
  RENDER_FPS: 30
};

// Basic Team Setup
export const POC_TEAMS =
{
  RED_TEAM: {
    name: "Team Red",
    kitColour: "#FF0000",
    formation: FORMATION_4_4_2
  },
  BLUE_TEAM: {
    name: "Team Blue", 
    kitColour: "#0000FF",
    formation: FORMATION_4_4_2
  }
};
```

### 6.3 Button Command Implementation
```typescript
class POCControlSystem
{
  private matchEngine: POCMatchEngine;
  
  public handleAttackCommand(): void
  {
    // Move players forward, increase attacking behaviour
    this.matchEngine.setTacticalStyle('ATTACKING');
  }
  
  public handleDefendCommand(): void
  {
    // Pull players back, focus on defensive positioning
    this.matchEngine.setTacticalStyle('DEFENDING');
  }
  
  public handleShootCommand(): void
  {
    // Find player closest to ball and attempt shot
    const ballCarrier = this.matchEngine.getPlayerWithBall();
    if (ballCarrier && this.isInShootingPosition(ballCarrier))
    {
      ballCarrier.attemptShot();
    }
  }
}
```

## 7. Risk Management

### 7.1 Technical Risks
- **Performance on FireTV**: Mitigate with early hardware testing
- **Sprite Animation Complexity**: Start with static sprites, add animation later
- **AI Behaviour Quality**: Begin with simple rules, iterate based on feedback

### 7.2 Schedule Risks
- **Feature Creep**: Strict scope control for POC phase
- **Technical Complexity**: Build buffer time into milestones
- **Asset Creation Delays**: Use placeholder assets initially

## 8. Success Metrics

### 8.1 POC Success Indicators
- ✅ Demonstrates core football gameplay loop
- ✅ Shows feasibility of sprite-based approach
- ✅ Validates FireTV performance characteristics
- ✅ Provides foundation for voice integration
- ✅ Generates positive stakeholder feedback

### 8.2 Technical KPIs
- Frame rate: Consistent 30 FPS
- Memory usage: <256MB peak
- Load time: <5 seconds on FireTV
- Button response: <100ms latency
- Match stability: 0 crashes in 10 complete matches

This development plan provides a clear roadmap from basic POC to full product, with the initial focus on validating core technical concepts before investing in advanced features like voice recognition and multiplayer systems.