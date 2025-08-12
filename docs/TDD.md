# Technical Design Document: Super Soccer Manager: Pro Edition

## 1. Executive Summary

**Document Version**: 1.0
**Date**: 12 August 2025
**Product**: Super Soccer Manager: Pro Edition
**Architecture**: Real-time multiplayer voice-controlled football management game

This Technical Design Document outlines the technical architecture, implementation details, and asset requirements for developing Super Soccer Manager: Pro Edition using the Voice Gaming Framework (VGF).

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client (TV)   │────│  VGF Server     │────│   Redis Store   │
│  - React App    │    │  - Game Logic   │    │  - Game State   │
│  - Voice Input  │    │  - Match Engine │    │  - User Data    │
│  - WebGL/Canvas │    │  - Socket.IO    │    │  - Sessions     │
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
  private ai: AIController;

  public processFrame(deltaTime: number): void;
  public handlePlayerAction(action: GameAction): void;
  public checkRules(): RuleViolation[];
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

### 3.3 Player AI System

#### 3.3.1 AI Decision Framework
```typescript
interface AIDecision
{
  playerId: string;
  action: PlayerAction;
  priority: number;
  reasoning: AIReasoning;
}

class AIController
{
  public evaluateOptions(player: Player, gameState: GameState): AIDecision[];
  public executeDecision(decision: AIDecision): void;
  public updatePlayerBehaviour(tacticalInstruction: TacticalCommand): void;
}
```

#### 3.3.2 Attribute-Based Calculations
```typescript
interface Player
{
  id: string;
  name: string;
  position: Position;
  attributes: PlayerAttributes;
  currentStats: CurrentStats;
  isCaptain: boolean;
}

interface PlayerAttributes
{
  // Physical (0.0 - 10.0)
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  jumpingReach: number;
  agility: number;
  balance: number;

  // Technical (0.0 - 10.0)
  ballControl: number;
  dribbling: number;
  passing: number;
  crossing: number;
  shooting: number;
  finishing: number;
  longShots: number;
  freeKickTaking: number;
  penaltyTaking: number;

  // Mental (0.0 - 10.0)
  decisions: number;
  composure: number;
  concentration: number;
  positioning: number;
  anticipation: number;
  vision: number;
  workRate: number;
  teamwork: number;
  leadership: number;

  // Defensive (0.0 - 10.0)
  tackling: number;
  marking: number;
  heading: number;
  interceptions: number;

  // Goalkeeping (0.0 - 10.0)
  handling: number;
  reflexes: number;
  aerialReach: number;
  oneOnOnes: number;
  distribution: number;

  // Overall rating
  overall: number;
}
```

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

### 11.5 Asset Specifications

#### 11.5.1 Technical Requirements

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