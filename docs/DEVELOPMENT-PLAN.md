# Development Plan: Soccer Manager: World Cup Edition

> **Note**: This document references canonical definitions in [docs/CANONICAL-DEFINITIONS.md](./CANONICAL-DEFINITIONS.md) for schemas, constants, and mappings.

## 1. Overview

**Document Version**: 3.0  
**Date**: 20 August 2025  
**Product**: Soccer Manager: World Cup Edition  

This plan outlines development phases for a voice-controlled multiplayer football management game built on Volley's VGF framework, featuring real-time gameplay with 3D ball physics in 2D presentation.

## 2. Development Philosophy

### 2.1 VGF-First Architecture
- Build on VGF framework from day one for real-time multiplayer
- Design deterministic simulation for multiplayer consistency
- Leverage VGF's Redis storage and Socket.IO transport
- Plan for session creation and state synchronization

### 2.2 Deterministic Design
- All game logic uses seeded RNG for reproducible outcomes
- Normalized coordinates (0-1) for device-agnostic simulation
- No Date.now() or Math.random() in game logic
- Multiplayer-safe from the ground up

### 2.3 Performance-Constrained
- Target FireTV hardware with 512MB memory budget
- 30 FPS rendering with 3D ball physics
- Efficient formation system with spatial optimization
- Voice command processing under 100ms latency

## 3. Architecture Foundation

### 3.1 Core System Design
```
App Manager
├── FrontEnd Manager (menu, team selection, settings)
└── Game Manager (match execution)
    ├── Phase System (PreMatch → KickOff → FirstHalf → HalfTime → SecondHalf → FullTime)
    ├── Ball Physics (3D simulation, 2D presentation with scaling/shadow)
    ├── Player AI (formation-based positioning with voice response)
    ├── Formation Engine (UberFormationData with phase transitions)
    └── Voice Command System (tactical instructions)
```

### 3.2 Key Technologies
- **Framework**: VGF (Volley Gaming Framework) with Redis + Socket.IO
- **Client**: React with Canvas 2D rendering
- **Server**: Node.js/Express with deterministic game rules
- **Formation**: UberFormationData schema with 20×15 grid system (5.5m × 4.53m cells)
- **Voice**: Web Speech API for command recognition

## 4. Development Phases

### Phase 1: VGF Foundation & Core Gameplay (Months 1-3)

#### Month 1: VGF Setup & Basic Rendering
**Week 1-2: Project Structure**
- Set up VGF monorepo with client/server architecture
- Configure Redis session storage and Socket.IO transport
- Implement VGF client hooks (useStateSync, useDispatchAction, usePhase)
- Create deterministic GameRuleset with seeded RNG context

**Week 3-4: Basic Rendering**
- Canvas 2D pitch rendering with FIFA-accurate proportions
- Player sprite system (22 players, 2 teams)
- Ball rendering with 2D scaling for height illusion
- Basic HUD (score, timer, team names, phase indicators)

#### Month 2: Ball Physics & Player Movement
**Week 5-6: 3D Ball Physics**
- Implement 3D ball physics with 2D visual presentation
- Ball trajectory calculation with landing prediction
- Drop shadow and scaling for height visualization
- Grid system integration for formation positioning

**Week 7-8: Player AI Foundation**
- Basic player positioning using formation data
- Simple ball-seeking behaviour
- Team differentiation (home/away colours)
- Formation-based starting positions

#### Month 3: Game Loop & Phases
**Week 9-10: Match Phase System**
- VGF phase management (PreMatch → FullTime)
- Game timer with accelerated time (5min = 90min game)
- Phase transitions with proper state synchronization
- Basic match statistics collection

**Week 11-12: Voice Commands (Basic)**
- Web Speech API integration
- Basic tactical commands ("attack", "defend", "balanced")
- Command validation and team posture changes
- Voice feedback system

### Phase 2: Formation System & Advanced AI (Months 4-6)

#### Month 4: Formation Editor Tool (FET) Core
**Week 13-14: Grid System**
- 20×15 grid implementation (300 zones total)
- Zone-based player positioning
- Grid key standardization (x{col}_y{row} format)
- Performance optimization for 675KB memory budget

**Week 15-16: Formation Engine**
- UberFormationData schema implementation
- Phase-aware positioning (defending/neutral/attacking/set_piece)
- Formation loading and validation
- Real-time position interpolation

#### Month 5: Advanced Player Behaviour
**Week 17-18: Formation-Based AI**
- AI positioning based on formation data
- Multi-factor positioning (formation + ball + tactical state)
- Player role specialization (goalkeeper, defender, midfielder, attacker)
- Formation phase transitions during gameplay

**Week 19-20: Tactical AI Responses**
- Voice command processing with formation adjustments
- Team-wide tactical changes
- Player-specific instructions
- Coordination between players based on formation roles

#### Month 6: Enhanced Gameplay Features
**Week 21-22: Advanced Ball Interactions**
- Pass types (regular, lobbed, through, driven, cross)
- Player kick selection based on context
- Goal-scoring attempts with player attributes
- Goalkeeper positioning and distribution

**Week 23-24: Set Pieces & Dead Ball Situations**
- Throw-ins, corners, free kicks, penalties, goal kicks
- Formation adjustments for dead ball situations
- Quick positioning transitions
- Rule enforcement and validation

### Phase 3: Multiplayer & Polish (Months 7-9)

#### Month 7: VGF Multiplayer Implementation
**Week 25-26: Real-Time Multiplayer**
- VGF session creation and management
- Player matchmaking system
- State synchronization optimization
- Network lag compensation

**Week 27-28: Multiplayer Game Logic**
- Deterministic simulation validation
- Conflict resolution for simultaneous commands
- Multiplayer-specific UI updates
- Connection stability and reconnection

#### Month 8: Advanced Voice Features
**Week 29-30: Enhanced Voice Commands**
- Extended command vocabulary
- Context-sensitive command interpretation
- Voice feedback for invalid commands
- Multi-language support foundation

**Week 31-32: Tactical Voice Instructions**
- Player-specific voice commands
- Formation change voice commands
- Emergency tactical instructions
- Voice command history and undo

#### Month 9: Game Polish & Optimization
**Week 33-34: Performance Optimization**
- Memory usage optimization for FireTV
- Rendering optimization for consistent 30 FPS
- Network optimization for smooth multiplayer
- Battery optimization for mobile devices

**Week 35-36: Audio & Visual Polish**
- Enhanced visual effects and animations
- Audio feedback for commands and events
- Improved UI/UX for TV viewing
- Accessibility improvements

### Phase 4: League System & Advanced Features (Months 10-12)

#### Month 10: League Infrastructure
**Week 37-38: League System Core**
- 28-team league structure
- Weekly league cycles
- Promotion/relegation mechanics
- Team progression and rating system

**Week 39-40: Player Trading**
- Player attribute system (0-10 scale)
- Transfer market mechanics
- Team building and squad management
- Financial simulation

#### Month 11: Advanced Features
**Week 41-42: Enhanced Statistics**
- Comprehensive match analytics
- Formation effectiveness tracking
- Player performance metrics
- Historical data and trends

**Week 43-44: Social Features**
- Friend systems and social play
- Formation sharing
- Tournament creation
- Spectator mode

#### Month 12: Launch Preparation
**Week 45-46: Beta Testing**
- Closed beta with selected users
- Performance validation across devices
- Bug fixing and stability improvements
- Feature refinement based on feedback

**Week 47-48: Production Deployment**
- Production infrastructure setup
- Monitoring and analytics systems
- Launch preparation and marketing
- Day-one support systems

## 5. Technical Implementation Details

### 5.1 VGF Integration Architecture
```typescript
// Server: GameRuleset implementation
class SoccerWorldCupGame extends GameRuleset {
  private deterministicContext: DeterministicGameContext;
  private formationEngine: FormationEngine;
  private ballPhysics: BallPhysics;

  constructor(matchSeed: number) {
    super();
    this.deterministicContext = new DeterministicGameContext(matchSeed);
    this.formationEngine = new FormationEngine();
    this.ballPhysics = new BallPhysics();
  }

  protected getPhases(): Record<string, PhaseHandler> {
    return {
      HOME: new HomePhase(),
      PRE_MATCH: new PreMatchPhase(),
      KICK_OFF: new KickOffPhase(),
      FIRST_HALF: new FirstHalfPhase(),
      HALF_TIME: new HalfTimePhase(),
      SECOND_HALF: new SecondHalfPhase(),
      FULL_TIME: new FullTimePhase()
    };
  }
}

// Client: VGF hooks usage
function GameComponent() {
  const { gameState } = useStateSync();
  const dispatch = useDispatchAction();
  const currentPhase = usePhase();

  const handleVoiceCommand = (command: string) => {
    dispatch({ type: 'TACTICAL_COMMAND', payload: { command } });
  };

  return (
    <GameCanvas 
      gameState={gameState} 
      phase={currentPhase}
      onVoiceCommand={handleVoiceCommand}
    />
  );
}
```

### 5.2 Deterministic Game Context
```typescript
interface DeterministicGameContext {
  gameTime: number;           // Accumulated game time
  rng: SeededRandom;          // Seeded RNG for reproducibility
  frameCount: number;         // Frame counter
  matchSeed: number;          // Match-specific seed
}

class SeededRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
}
```

### 5.3 Formation System Implementation
```typescript
// UberFormationData integration
interface UberFormationData {
  name: string;
  players: Record<string, PlayerFormationData>; // x{col}_y{row} keys
}

interface PlayerFormationData {
  role: PlayerRole;
  posture: PlayingPosture;
  phases: Record<GamePhase, PhasePositioning>;
}

class FormationEngine {
  private currentFormation: UberFormationData;
  private gridSystem: GridSystem; // 20×15 grid

  updatePlayerPositions(gamePhase: GamePhase, ballPosition: NormalizedPosition): void {
    // Calculate desired positions based on formation and game context
    Object.entries(this.currentFormation.players).forEach(([gridKey, playerData]) => {
      const phasePositioning = playerData.phases[gamePhase];
      const targetPosition = this.calculatePosition(gridKey, ballPosition, phasePositioning);
      this.setPlayerTarget(playerData.role, targetPosition);
    });
  }
}
```

## 6. Success Metrics & Validation

### 6.1 Technical KPIs
- **Performance**: Consistent 30 FPS on FireTV with <512MB memory
- **Latency**: Voice commands processed <100ms
- **Determinism**: 100% reproducible outcomes across clients
- **Network**: <50ms state sync latency
- **Formation**: <1ms per position calculation

### 6.2 Gameplay Validation
- **Voice Recognition**: 95%+ accuracy for core commands
- **Match Completion**: 100% matches complete without crashes
- **Multiplayer Sync**: <1% desync rate in testing
- **Formation Impact**: Measurable tactical differences
- **User Engagement**: Average 15+ minutes per match

### 6.3 Multiplayer Metrics
- **Matchmaking**: <30 second queue times
- **Connection Stability**: <5% disconnection rate
- **State Consistency**: 100% synchronized game state
- **Player Retention**: 60%+ return rate after first match

## 7. Risk Management

### 7.1 Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| **VGF Framework Limitations** | High | Early prototyping, fallback plans |
| **FireTV Performance Constraints** | High | Continuous profiling, adaptive complexity |
| **Multiplayer Synchronization** | Medium | Deterministic design, extensive testing |
| **Voice Recognition Accuracy** | Medium | Multiple speech engines, fallback UI |

### 7.2 Schedule Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Formation System Complexity** | High | Phased implementation, early validation |
| **3D Ball Physics Performance** | Medium | Performance budgeting, optimization focus |
| **Multiplayer Integration Delays** | Medium | Parallel development tracks |
| **Voice Command Scope Creep** | Low | Strict scope control, iterative expansion |

## 8. Post-Launch Roadmap

### 8.1 Content Updates (Months 13-15)
- Additional formations and tactical systems
- Seasonal leagues and tournaments
- Enhanced player customization
- Advanced analytics and insights

### 8.2 Platform Expansion (Months 16-18)
- Mobile device support
- Cross-platform multiplayer
- Enhanced voice features
- Regional localization

### 8.3 Advanced Features (Months 19-24)
- AI opponent difficulty levels
- Machine learning formation optimization
- Esports tournament support
- Advanced spectator features

## 9. Testing Strategy Implementation

### 9.1 Testing Framework Integration

**Phase 1: Testing Foundation (Month 1)**
```bash
# Server testing setup
pnpm add -D jest @types/jest @volley/vgf-test-utils
pnpm add -D supertest # For API endpoint testing

# Client testing setup  
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D playwright # For E2E testing
```

**Testing Architecture:**
- **Unit Tests**: 80%+ coverage for game logic, AI systems, and utilities
- **Integration Tests**: VGF multiplayer scenarios, cross-system interactions
- **E2E Tests**: Complete match flows, voice command integration
- **Performance Tests**: Frame rate, memory usage, network latency benchmarks

### 9.2 Phase-by-Phase Testing Implementation

#### Phase 1: Core Testing (Months 1-3)
**Week 2: Unit Testing Foundation**
- Game Manager boundary detection tests
- Ball physics deterministic behavior verification
- Formation system position calculation validation
- VGF action and state synchronization tests

**Week 4: Integration Testing Setup**
- VGF multiplayer test harness creation
- Player join/leave scenario testing
- Voice command processing pipeline tests
- Phase transition and lifecycle validation

**Week 6: Performance Testing Baseline**
- 30 FPS consistency validation on FireTV hardware
- Memory usage profiling and leak detection
- Network latency measurement for VGF actions
- Voice command response time benchmarking

#### Phase 2: Advanced Testing (Months 4-6)
**Month 4: Formation System Testing**
- Formation Editor Tool export/import validation
- AI positioning accuracy within formation constraints
- Multi-phase formation transition testing
- Formation effectiveness measurement tools

**Month 5: Multiplayer Stress Testing**
- Concurrent player action conflict resolution
- Network partition and reconnection scenarios  
- Deterministic simulation validation across clients
- Load testing with multiple simultaneous matches

**Month 6: Voice Integration Testing**
- Speech recognition accuracy measurement
- Command interpretation in various noise conditions
- Voice command latency under different network conditions
- Accessibility testing for voice-only interaction

#### Phase 3: Production Testing (Months 7-9)
**Month 7: End-to-End Testing**
- Complete match flow automation with Playwright
- Cross-browser compatibility validation
- FireTV device-specific testing across generations
- Integration testing with external voice APIs

**Month 8: Performance Optimization Testing**
- A/B testing for different rendering optimizations
- Memory usage optimization validation
- Network bandwidth optimization measurement
- Battery usage testing on mobile platforms

**Month 9: User Acceptance Testing**
- Beta tester feedback integration and validation
- Accessibility compliance testing
- Usability testing for voice-only interaction
- Performance validation across diverse hardware

### 9.3 Continuous Integration Testing

**Automated Test Pipeline:**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test:e2e
      - run: pnpm test:performance
      
  firetv-testing:
    runs-on: self-hosted-firetv
    steps:
      - run: pnpm test:device-specific
```

**Test Quality Gates:**
- Unit tests: 80%+ coverage required for PR merge
- Integration tests: All VGF scenarios must pass
- Performance tests: Must maintain 30 FPS benchmarks
- E2E tests: Critical user journeys must complete successfully

### 9.4 Testing Tools and Utilities

**Custom Testing Utilities:**
```typescript
// VGF Soccer Test Suite
export class SoccerTestSuite {
  // Deterministic match simulation
  static simulateMatch(seed: number, commands: VoiceCommand[]): MatchResult
  
  // Performance benchmarking
  static benchmarkFrameRate(duration: number): PerformanceMetrics
  
  // Formation validation
  static validateFormationCompliance(formation: UberFormationData): ValidationResult
  
  // Voice command accuracy testing
  static testVoiceRecognition(audioSamples: AudioBuffer[]): AccuracyReport
}
```

**Testing Data Management:**
- Deterministic test match scenarios with known outcomes
- Voice command audio sample library for accuracy testing
- Formation test cases covering all standard football formations
- Performance benchmark baselines for different hardware tiers

This development plan provides a structured approach to building a sophisticated voice-controlled multiplayer football game while maintaining focus on performance, determinism, user experience, and comprehensive test coverage throughout the development lifecycle.
