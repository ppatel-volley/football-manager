# Product Requirements Document: Soccer Manager: World Cup Edition

> **Note**: This document references canonical definitions in [docs/CANONICAL-DEFINITIONS.md](./CANONICAL-DEFINITIONS.md) for schemas, constants, and mappings.

## 1. Executive Summary

**Product Name**: Soccer Manager: World Cup Edition
**Version**: 1.0
**Date**: 12 August 2025

### 1.1 Product Vision
A voice-controlled football (soccer) simulation game featuring AI-controlled players that respond to tactical voice commands. Players manage teams through voice instructions during live matches with authentic football rules and mechanics. The game supports both single-player (human vs AI) and multiplayer (human vs human) modes.

### 1.2 Core Value Proposition
- **Accessibility**: Voice control removes barriers of traditional gaming interfaces
- **Immersion**: Feel like a real football manager on the touchline
- **Real-time Strategy**: Dynamic tactical changes during live gameplay
- **Authentic Football**: Based on official Laws of the Game
- **Flexible Play Modes**: Single-player practice against AI or competitive multiplayer matches

## 2. Product Overview

### 2.1 System Architecture Overview

**Top-Level Architecture**: The application follows a hierarchical architecture with three main components:

```
App Manager (Top Level)
├── FrontEnd Manager
│   ├── Title Screen
│   ├── Game Selection
│   ├── Team Customisation
│   └── Settings & Options
└── Game Manager
    ├── PreMatch Phase
    ├── Kick Off Phase 
    ├── First Half Phase
    ├── Half Time Phase
    ├── Second Half Phase
    └── Full Time Phase
```

**App Manager**: Handles the current global state such as showing the front end or playing the game, or something else we will add later. This is the top level of the application.

**FrontEnd Manager**: This major class will show things like the title screen and also allow users to select what type of game they want to play, team customisation, etc.

**Game Manager**: This is what will run the game of football. There are multiple states it will need to handle, managing game state transitions, player positioning, and real-time match events.

### 2.2 Target Audience
- **Primary**: Football enthusiasts aged 16-45 who enjoy tactical gameplay
- **Secondary**: Accessibility gaming community seeking voice-controlled experiences
- **Tertiary**: Casual sports game players looking for innovative mechanics

### 2.2 Platform
- Web-based application using VGF (Voice Gaming Framework)
- Primary target: FireTV and web-supporting TV devices
- Real-time multiplayer via Socket.IO

### 2.3 Success Metrics
- Player retention rate > 60% after 30 days
- Average match completion rate > 85%
- Voice command recognition accuracy > 90%
- Multiplayer match-making success rate > 95%

## 3. POC Scope and Functional Requirements

### 3.0 POC Scope Definition

#### 3.0.1 In-Scope for POC
- **Ball Physics**: Ball in/out detection on all four boundaries
- **Basic Restarts**: Throw-ins, corner kicks, goal kicks based on last touch and line crossed
- **Goals**: Ball completely crossing goal line with proper detection
- **Half-time**: Automatic transition with team switching and formation reset
- **Minimal Stats**: Possession percentage, shots taken, corners awarded
- **Simple 2D Physics**: Canvas 2D with basic friction, no Z-axis or height simulation
- **Minimal HUD**: Essential match information only (score, time, basic stats)
- **AI vs AI**: Autonomous team behaviour for evaluation purposes

#### 3.0.2 Out-of-Scope for POC
- **Voice Commands**: Deferred to Phase 2
- **Offside Detection**: Complex rule implementation deferred
- **Foul System**: Cards, free kicks, penalties deferred
- **Substitution System**: Player changes during match deferred
- **Replay System**: Match playback functionality deferred
- **Commentary/Audio**: Sound effects and match commentary deferred
- **Adaptive/Learning AI**: Advanced AI behaviour deferred
- **Multiplayer**: Real-time multiplayer functionality deferred

#### 3.0.3 Goal Kick Implementation

**Rule Implementation**: When a goal kick occurs, the referee only allows the game to commence once all opposing players have attempted to exit the penalty area, as per FIFA Laws of the Game.

**POC Behaviour**:
- Ball is placed within the defending team's goal area (6-yard box)
- All opposing players must move outside the penalty area before the kick can be taken
- If any opposing player remains in the penalty area, they must attempt to leave
- Ball becomes in play once kicked and clearly moves
- Quick goal kicks allowed if opposing players are actively leaving the penalty area

#### 3.0.4 Goalkeeper Ball Handling

**Goalkeeper Possession Types**:
- **At Feet**: Goalkeeper controls ball on ground, can dribble within penalty area
- **In Hands**: Goalkeeper catches/picks up ball, has 6 seconds to release (FIFA Law 12)

**Goalkeeper Distribution Methods**:
- **Drop Kick**: Goalkeeper drops ball and kicks it long (typically 40-60 yards)
- **Throw**: Short distribution by hand to nearby teammate (typically 10-20 yards)
- **Roll**: Ground distribution to feet of nearby teammate
- **Punt**: Direct kick from hands for maximum distance

**FIFA Law 12 Restrictions**:
- **Pass-back Rule**: Goalkeeper cannot handle ball directly from deliberate pass by teammate's foot
- **6-Second Rule**: Goalkeeper must release ball within 6 seconds when held in hands
- **Handling Area**: Goalkeeper may only handle ball within own penalty area
- **Protection Rule**: Outfield players cannot tackle or dispossess goalkeeper when ball is in hands (only when ball is at feet)

**Modern Goalkeeper Roles**:
- **Sweeper-Keeper**: Modern goalkeepers act as auxiliary defenders, rushing out to intercept through balls
- **Distribution Specialist**: Quick, accurate distribution initiates counter-attacks and maintains possession
- **Command Area**: Goalkeeper commands penalty area, directing defensive positioning

**Tactical Impact**:
- **Opposing Team Response**: When goalkeeper gains possession (especially in hands), opposing players retreat toward own half to defend potential counter-attack
- **Distribution Speed**: Quick distribution (throw/roll) maintains attacking momentum, long distribution (drop kick/punt) creates counter-attack opportunities
- **Defensive Leadership**: Goalkeeper organises defensive line and communicates tactical adjustments

### 3.1 Match Phase System

#### 3.1.1 Game Manager States

The Game Manager orchestrates matches through six distinct phases, each with specific behaviours and transition conditions:

**PreMatch Phase**:
- Players walk onto pitch and take their positions
- Crowd from both teams will be cheering on their teams
- Commentary will be talking about both teams and hoping for a good game
- The side of the pitch the teams will be on is selected at random
- Duration: 30-45 seconds real-time

**Kick Off Phase**:
- One team selected randomly for initial kick-off
- All players positioned in regulation kick-off formation
- Ball placed at centre spot, players await referee whistle
- Transition trigger: Referee whistle blow

**First Half Phase**:
- Active gameplay for 45 minutes game time (2.25 minutes real-time)
- Kicking-off team initiates play with first ball touch
- Full football rules active (throw-ins, corners, goal kicks)
- Stoppage time added for significant interruptions

**Half Time Phase**:
- Triggered after 45 minutes + stoppage time
- Players walk off pitch (brief transition animation)
- Statistics display for first half performance
- Duration: Maximum 1 minute real-time
- Teams switch sides for second half

**Second Half Phase**:
- Team that didn't kick-off first half now kicks off
- Active gameplay for second 45 minutes game time
- Identical rules and mechanics to first half
- Additional stoppage time calculated independently

**Full Time Phase**:
- Final whistle after 90 minutes + total stoppage time
- Match statistics and final score display
- Player ratings and key match events summary
- Transition back to Frontend Manager for next action

### 3.2 FIFA-Compliant Pitch System

#### 3.2.1 Official FIFA Pitch Standards

Soccer Manager: World Cup Edition implements FIFA-compliant pitch markings to ensure authentic football simulation. All dimensions are based on FIFA Laws of the Game for professional football.

**Standard Pitch Dimensions**:
- **Length**: 110 metres (FIFA maximum allowed, range: 100-110m)
- **Width**: 68 metres (FIFA standard, range: 64-75m)

**Goal Specifications**:
- **Width**: 7.32 metres (8 yards)
- **Height**: 2.44 metres (8 feet) 
- **Post Width**: Maximum 12 centimetres (5 inches)

**Penalty Area (18-yard box)**:
- **Depth**: 16.5 metres (18 yards from goal line)
- **Width**: 40.32 metres (44 yards total width)

**Goal Area (6-yard box)**:
- **Depth**: 5.5 metres (6 yards from goal line)
- **Width**: 18.32 metres (20 yards total width)

**Circle and Arc Specifications**:
- **Center Circle**: 9.15 metres radius (10 yards)
- **Penalty Arc**: 9.15 metres radius (10 yards, extends outside penalty area)
- **Corner Arc**: 1 metre radius (1 yard)

**Spot Positioning**:
- **Penalty Spot**: 11 metres from goal line (12 yards)
- **Center Spot**: Pitch center for kick-off

#### 3.1.2 Visual Implementation Standards

**Proportional Accuracy**: All pitch markings maintain accurate proportions regardless of screen size or resolution, ensuring consistent gameplay experience across devices.

**Quality Standards**:
- Line markings use FIFA-compliant white colour (#FFFFFF)
- Consistent line width throughout all markings
- Accurate measurement ratios maintained at all zoom levels
- Smooth rendering of curved elements (circles, arcs)

**Formation Editor Tool Integration**: The Formation Editor Tool uses identical FIFA specifications, ensuring formations designed in the editor translate accurately to match simulation.

### 3.3 Ball Physics System

#### 3.3.1 3D Physics with 2D Presentation

**Core Approach**: The ball uses full 3D physics simulation while maintaining 2D top-down visual presentation through clever visual techniques.

**3D Physics Properties**:
- **Height (Z-axis)**: Ball maintains altitude value for realistic trajectory simulation
- **Gravity**: Constant downward acceleration affects ball height
- **Air Resistance**: Height-dependent drag affects horizontal velocity
- **Bounce Physics**: Realistic bounce behaviour when ball contacts ground
- **Spin Effects**: Ball rotation affects trajectory and bounce characteristics

**2D Visual Presentation**:
- **Scaling Illusion**: Ball sprite scales larger when at higher altitudes (up to 130% max size)
- **Drop Shadow**: Dynamic shadow beneath ball indicates height and creates depth perception
- **Shadow Properties**: Shadow grows larger and becomes more diffuse with increased height
- **Colour Variation**: Ball becomes slightly brighter at higher altitudes

**Landing Position Calculation**:
```typescript
interface BallTrajectory {
  currentPosition: Vector3;  // x, y, height
  velocity: Vector3;         // velocity in all three dimensions
  landingPosition: Vector2;  // predicted ground contact point
  timeToLanding: number;     // seconds until ball hits ground
  gridSquare: string;        // formation grid cell ("x12_y8") where ball will land
}
```

**Formation Integration**: When the ball is kicked, we will calculate the landing position. This position will let us compute the grid square (from the formation editing tool) that the ball will land in. The players from both teams will use that square (or cell) to determine what position they should be in according to the formation data.

### 3.4 Formation System (Phase 2)

**Future Implementation**: A developer-only Formation Editor Tool will be delivered in Phase 2 to enable sophisticated tactical AI positioning. See `docs/FET-TDD.md` for complete technical specifications.

**POC Approach**: Use pre-defined formation templates (4-4-2, 4-3-3) with basic positioning rules.

### 3.2 POC Acceptance Criteria

#### 3.2.1 Ball Physics and Boundaries
- **Out-of-bounds Detection**: Accurate detection within 16ms of ball crossing any boundary
- **Restart Execution**: Correct restart type (throw-in, corner, goal kick) selected and executed within 3 seconds
- **Goal Detection**: Goals registered immediately when ball completely crosses goal line

#### 3.2.2 Match Flow
- **Half-time Transition**: Automatic progression from first to second half within 5 seconds
- **Formation Reset**: All players return to kick-off positions within 2 seconds of half-time
- **Match Completion**: Full 5-minute matches complete without crashes or game-breaking bugs

#### 3.2.3 AI Performance
- **Formation Adherence**: Players maintain formation shape within ±10% tolerance of target positions
- **Position Updates**: Player position changes respond within 100ms of ball movement
- **Possession Stability**: Possession percentage variance <5% across multiple identical scenario runs

#### 3.2.4 Technical Performance
- **Frame Rate**: Consistent 30+ FPS on FireTV Stick 4K Max during active gameplay
- **Memory Stability**: No memory leaks over 10+ consecutive matches
- **Restart Responsiveness**: UI updates within 200ms of out-of-play events

#### 3.2.5 Statistics Accuracy
- **Possession Tracking**: Accurate possession time calculation with <2% variance from ground truth
- **Event Counting**: Shots and corners counted correctly (100% accuracy in controlled tests)
- **Display Updates**: Statistics display updates within 500ms of events

### 3.3 Core Gameplay Loop

#### 3.1.1 Match Setup
- **Game Mode Selection**: Choose between single-player (vs AI) or multiplayer (vs human)
- **Team Selection**: Choose from user's current team or opponents in league
- **Formation Selection**: Choose tactical formation (4-4-2, 4-3-3, 3-5-2, etc.)
- **Match Type**: League matches, friendly matches, cup competitions, or practice matches
- **AI Difficulty** (Single-player): Beginner, Amateur, Professional, or World Class AI opponents
- **Team Generation**: New users receive auto-generated team with English National League quality players

#### 3.1.2 Live Match Experience
- **Real-time Duration**: 5 minutes real-time representing 90 minutes game time (18x acceleration).
- **Two Halves**: 45 minute halves - there is a brief pause between them which is tunable. 45 minutes of game time represents 2.25 minutes of real time
- **Stoppage Time**: Simple fixed addition (30 seconds per half for POC)
- **Top-down View**: Bird's eye view of football pitch with player positioning

#### 3.1.3 Match Outcome
- **Scoring System**: Team with most goals wins
- **Statistics**: Match stats including possession, shots, fouls, cards
- **Match Highlights**: Basic goal and key moment recording (future phase)

### 3.2 Team Management System

#### 3.2.1 Squad Structure
- **Starting XI**: 11 players in chosen formation
- **Substitutes**: 5 substitute players available
- **Player Roles**: Goalkeeper, Defenders, Midfielders, Attackers

**Detailed Sub-Role Taxonomy**:

**Defensive Sub-Roles**:
- **Centre-Back (CB)**: Central defensive positioning, aerial dominance, last line of defence
- **Sweeper (SW)**: Deep-lying defender who covers behind defensive line, rare in modern football
- **Full-Back (FB)**: Wide defensive positions (left-back/right-back), defensive stability with occasional attacking support
- **Wing-Back (WB)**: Advanced full-backs with significant attacking responsibilities, operate as wide midfielders in possession
- **Attacking Wing-Back**: Modern full-back variant prioritising overlapping runs and crossing delivery

**Midfield Sub-Roles**:
- **Defensive Midfielder (DM/CDM)**: Shield defence, break up play, simple distribution
- **Central Midfielder (CM)**: Box-to-box play, balanced attacking and defensive contribution
- **Attacking Midfielder (AM/CAM)**: Creative hub, through balls, support for strikers
- **Wide Midfielder (LM/RM)**: Patrol flanks, crossing, tracking opposing full-backs
- **Winger**: Pace-based wide players focusing on dribbling, crossing, and cutting inside
- **Inside Forward**: Wingers who cut inside to central areas for shooting opportunities
- **Playmaker**: Deep-lying creative midfielder dictating tempo and long-range passing

**Attacking Sub-Roles**:
- **Striker (ST)**: Primary goal threat, penalty area positioning, clinical finishing
- **Target Man**: Physical striker holding up play, aerial ability, bringing others into play
- **Poacher**: Instinctive finisher specialising in goal-scoring opportunities in the box
- **False 9**: Dropping deep from striker position to create space and link play
- **Supporting Striker (SS)**: Secondary striker supporting main striker, creative contribution
- **Attacking Winger**: Wide attackers primarily focused on pace, dribbling, and goal-scoring from wide areas

#### 3.2.2 Player Attributes System
**Rating Scale**: 0.0-10.0 scale for all attributes
**Overall Rating**: Comprehensive player rating summarising overall ability

**Team Captain Leadership System**:
- **Captain Selection**: Designated captain (typically highest-rated player) with leadership bonuses
- **Leadership Influence**: Captain provides team-wide bonuses during match situations
- **Morale Boost**: +5% attribute effectiveness for all teammates within 0.15 normalized distance of captain
- **Pressure Resistance**: Captain receives +2.0 composure bonus in high-pressure situations (penalty area, final minutes)
- **Tactical Communication**: Captain can override individual player positioning by up to 10% for tactical adjustments
- **Comeback Inspiration**: When team is losing, captain provides +10% stamina regeneration to all teammates
- **Set Piece Authority**: Captain takes priority for penalty kicks and free kicks when in range
- **Disciplinary Leadership**: Captain's presence reduces likelihood of teammate misconduct by 15%

**Physical Attributes**:
- Pace (sprint speed)
- Acceleration (reaching top speed)
- Stamina (match-long performance)
- Strength (physical duels)
- Jumping Reach (aerial ability)
- Agility (direction changes)
- Balance (stability)

**Technical Attributes**:
- Ball Control (first touch quality)
- Dribbling (maintaining possession whilst moving)
- Passing (accuracy and range)
- Crossing (wide delivery quality)
- Shooting (power and accuracy)
- Finishing (goal conversion)
- Long Shots (distance shooting)
- Free Kick Taking
- Penalty Taking

**Mental Attributes**:
- Decisions (choice quality)
- Composure (pressure performance)
- Concentration (focus maintenance)
- Positioning (tactical awareness)
- Anticipation (game reading)
- Vision (opportunity spotting)
- Work Rate (effort levels)
- Teamwork (collective play)
- Leadership (teammate influence)

**Defensive Attributes**:
- Tackling (ground challenges)
- Marking (opponent tracking)
- Heading (aerial defending)
- Interceptions (pass reading)

**Goalkeeping Attributes** (goalkeepers only):
- Handling (ball security)
- Reflexes (reaction time)
- Aerial Reach (cross claiming)
- One on Ones (close-range saves)
- Distribution (ball delivery)

**Player abilities**

**Passing Abilities**:
- **Short Passing**: Building up play through close-range distribution. Requires precision over power, quick decision-making, and accurate placement to feet or into space ahead of teammate
- **Long Passing**: Switching play across the field or finding teammates in distant positions. Requires power, accuracy, and vision to spot distant targets. Technical execution involves 30-degree approach angle and maintaining focus on ball throughout contact
- **Wall Pass (Give-and-Go)**: Breaking through defensive lines using quick combination play. Requires precise timing, immediate movement after passing, and understanding of teammate's runs
- **Through Pass**: Creating direct goal-scoring opportunities by exploiting defensive gaps. Ball played into space between or behind defenders. Requires exceptional vision, timing, and understanding of offside positioning
- **Cross-field Pass**: Long-range passes to switch the point of attack, typically used by defenders and central midfielders to change the tempo and direction of play

**Dribbling Abilities**:
- **Basic Step-Over**: Throw foot over ball to feint direction, then push ball with outside of other foot. Effective in 1v1 encounters for creating initial space
- **Simple Cut (Inside/Outside)**: Sharp directional change using inside or outside of foot. High success rate for creating space against pressing defenders
- **Body Feint**: Drop shoulder and lean to suggest direction before going opposite way. Effective in wing play and creating shooting angles
- **Nutmeg**: Push ball through opponent's legs and accelerate past them. High psychological impact but requires perfect timing
- **Cruyff Turn**: Fake pass/shot, drag ball behind standing leg with inside of foot, turn 180°. Excellent for escaping pressure and changing play direction
- **Stop and Go**: Sudden deceleration followed by explosive acceleration. Highly effective for breaking defensive lines
- **Marseille Turn/Roulette**: Drag ball back with sole, spin 360° whilst shielding, emerge with ball. Very high difficulty technique for central midfield pressure situations
- **Elastico/Flip Flap**: Touch ball outside with outside of foot, immediately snap inside with same foot. Extremely high difficulty technique for creating unpredictable wing play

**Header Abilities**:
- **Standing Header**: Ground-based execution with minimal vertical movement, relies on timing and head positioning. Used for quick redirections and close-range situations
- **Jumping Header**: Most common type requiring elevation and timing, combines vertical leap with precise head contact. Essential for competing in aerial duels
- **Diving Header**: Dynamic technique requiring full body commitment, used when ball is at lower height. High risk but potentially high reward execution
- **Defensive Headers**: Clearing danger from defensive zones and breaking up opponent attacks. Requires power for long clearances
- **Attacking Headers**: Converting crosses and corner kicks into goal-scoring opportunities. Requires accuracy and positioning
- **Flick Headers**: Subtle redirections to teammates, changing ball trajectory for tactical advantage

**Tackling Abilities**:
- **Standing Tackle**: Defender remains on feet throughout challenge, using either foot to dispossess opponent. Low risk technique allowing quick recovery and continued pressure
- **Sliding Tackle**: Most spectacular form involving sliding along ground with leg extended to hit ball away. High success rate when executed properly but significant risk if mistimed
- **Block Tackle**: Uses body positioning to obstruct ball movement, placing body between opponent and ball. Lower risk technique that maintains defensive positioning
- **Interception**: Reading play to cut out passes before they reach intended target. Requires anticipation and positioning rather than direct challenge
- **Shoulder Charge**: Legal physical challenge using shoulder-to-shoulder contact to dispossess opponent while both players are competing for ball
- **Recovery Tackle**: Last-ditch defensive action to prevent goal-scoring opportunity, often involving desperate lunges or blocks

### 3.3 Voice Command System (Out of Scope for POC)

**Future Implementation**: Voice commands will be the primary interface for tactical control in the full game, allowing natural language tactical instructions during live gameplay.

#### 3.3.1 Core Command Categories

**Tactical Style Commands**:
- **"Defend"**: Team adopts defensive posture, players rarely venture out of own half, making it difficult for opposition to score but also difficult for user's team to score
- **"Balance"**: Team maintains balanced approach, searching for scoring opportunities without leaving defense vulnerable
- **"Attack"**: Team adopts aggressive attacking posture, players venture into opposition half to score but become vulnerable defensively

**Positional Awareness Commands**:
- **"Watch the left!"**: Team increases defensive attention to left flank, adjusting formation to cover left-side attacks
- **"Watch the right!"**: Team increases defensive attention to right flank, adjusting formation to cover right-side attacks

**Immediate Action Commands**:
- **"Shoot!"**: Ball possessor attempts immediate shot on goal regardless of position or angle
- **"Close him down!"**: Nearest appropriate player aggressively pressures opponent ball carrier
- **"Get it up the pitch!"**: Ball possessor kicks ball upfield (potentially out of bounds) to relieve pressure or run down clock

#### 3.3.2 Command Processing Pipeline

```typescript
interface VoiceCommand {
  phrase: string;           // Raw speech input
  confidence: number;       // 0.0-1.0 recognition confidence
  commandType: CommandType; // Tactical, Positional, Action
  gameContext: GameContext; // When command was issued
  validationResult: boolean; // Whether command is contextually appropriate
}

enum CommandType {
  TACTICAL_STYLE = 'tactical_style',     // "Defend", "Attack", "Balance"
  POSITIONAL_ALERT = 'positional_alert', // "Watch the left/right"
  IMMEDIATE_ACTION = 'immediate_action',  // "Shoot", "Close him down", "Get it up the pitch"
}
```

**Command Context Validation**: Commands are validated against current game state. For example:
- "Shoot!" only valid when user's team has ball possession
- "Close him down!" only valid when opposition has ball possession
- Tactical style changes valid at any time but may take time to implement

**Natural Language Processing**: System interprets variations and similar phrases:
- "Defend" variations: "Fall back", "Defend deep", "Protect the goal"
- "Attack" variations: "Push forward", "Go on the attack", "Get forward"
- "Shoot" variations: "Take the shot", "Have a go", "Strike it"

**POC Approach**: AI teams will operate autonomously without voice input. Basic tactical behaviours corresponding to "Defend", "Balance", and "Attack" styles will be pre-programmed to demonstrate the foundation for voice-controlled gameplay.

*Note: Complete voice command specification and natural language processing details will be documented in Phase 2 planning.*

### 3.5 Player Positioning Algorithm

#### 3.5.1 Multi-Factor Positioning System

The players will use a number of factors to determine their *desired* position. The AI will calculate each factor and each factor will be weighted and then summed to determine the final desired position. Here are the factors:

**Factor 0: Loose Ball Priority**
Any time the ball is not in possession, the closest player to it from a team will aim to take possession. The actions the player takes once taking possession will depend on the circumstances. If a defender takes possession in his teams goal area, he will try and pass to a team mate further up the pitch or he will just try and launch it upfield so the opposition can't score. An attacking player will aim to take possession in the opposition teams goal area to try a shot on goal or pass to an onside team mate to try and score a goal.

**Factor 1: Formation Data Priority**
Based on the position of the ball on the pitch, every player will have a position that they should be in. The exception is for the ball possessor who, according to their characteristics, will try to run upfield or pass to a team mate in a better position. Note: we need to calculate the 'betterness' of team mates we can pass to and determine the best one.


#### 3.5.2 Goal Keeper Positioning

The goal keeper position should be calculated by drawing a line from the centre point of the goal to the ball. The distance from the mouth of the goal that the keeper should position himself along this line is computed by the characteristics of the player (from his stats).

### 3.6 AI Behaviour System

#### 3.6.1 Ball Passing

Football is a team sport and players will try and pass to team mates who are in a better position.

Intelligent players will try and make through balls for their team mates who are in or running towards the opposition goal area.

Defensive players will try and tackle opponents and pass the ball away to another team mate or into space as quickly as possible when they are close to their own goal. Mostly they will do medium to long range passes or head the ball away from goal. They may join in an attack and try to score goals too when their team is in an attacking posture.

Midfield players are good mix of defending and attacking. They will typically try and stop the opposition getting too close to the defence and will also try and set up attacks by passing the ball upfield unless there are no options in which case they may play the ball sideways or back to their defence. They are usually good at heading the ball too.

Wingers will patrol the flanks of the pitch and be involved in defence or attack. Once in possession they will run up and try a cross into the area or a shot on goal.

Strikers will aim to get into goal scoring positions and score goals whenever they can. They are shit at defending most of the time. They will take shots on goal, cross the ball into the opposition area, head the ball towards goal etc.

#### 3.6.2 Player Action

For ball possessors who are not the goal keeper, we will run a check to determine the best course of action. We will analyse the following:
- If there is space ahead of the player to run towards the opposition goal
- If there is a player in the opposition penalty box we will attempt to pass to them via a cross/whipped pass

### 3.7 Player Kick Types

- Regular Pass: The most basic pass to a teammate. This is along the ground and can be long or short.
- Lobbed Pass: Sends the ball through the air to a target player.
- Through Ball: Threads the ball through the defense for a teammate to run onto.
- Driven Pass: Used to connect plays from defense to attack or to find a striker in the box from the wing. Requires a good angle toward the receiver.
- Cross also known as a whipped pass: A type of cross with added curve. Most often completed successfully by players with high stats and are attacking minded. Usually carried out from the wing to send the ball towards the goal area for a waiting striker to attempt a shot on goal.

### 3.8 The Ball

While the game will be presented in 2D, the ball will be using 3D physics of sorts. It will use 2D scaling for the sprite so it appears bigger when in the air to give the illusion it's above the ground. A drop shadow will add to this illusion.

When the ball is kicked, we will calculate the landing position. This position will let us compute the grid square (from the formation editing tool) that the ball will land in. The players from both teams will use that square (or cell) to determine what position they should be in according to the formation data.

### 3.9 In Game Head Up Display (HUD)

This displays the current score, the names of the teams and the current time. It will also bring up text in very large letters saying "GOAL!" when a goal is scored. It will display text in not-so-large letters for kick off (with text for 1st or second half), free kicks, throw ins and penalties.

### 3.10 Match Officiating System

#### 3.10.1 Referee Implementation
- **Positioned Referee**: Virtual referee with line-of-sight mechanics
- **Foul Detection**: Automatic recognition of illegal challenges
- **Advantage Rule**: Allow play to continue when beneficial
- **Card System**: Yellow and red card disciplinary actions

#### 3.10.2 Assistant Referees
- **Offside Detection**: Automated offside violation recognition
- **Ball Out of Play**: Touchline and goal line decisions
- **Foul Flag**: Secondary official input for referee decisions

#### 3.10.3 Match Flow Control
**Comprehensive Whistle Usage Situations**:

**Brief Whistle (0.5 seconds)**:
- **Match Start**: Initial kick-off and second half kick-off
- **Goal Scored**: Immediate whistle when ball completely crosses goal line
- **Ball Out of Play**: Touchline crossings (throw-ins), goal line crossings (corners/goal kicks)
- **Restart Signals**: Resuming play after throw-ins, corner kicks, goal kicks
- **Foul Committed**: Stopping play for direct/indirect free kicks (Phase 2)
- **Offside Violation**: Flagged offside situations (Phase 2)
- **Misconduct**: Yellow card and red card incidents (Phase 2)
- **Substitution Complete**: Player replacement finalised (Phase 2)
- **Equipment Issues**: Player equipment adjustments or injuries (Phase 2)

**Extended Whistle (1.25 seconds)**:
- **Half-Time**: End of first 45 minutes plus stoppage time
- **Full-Time**: End of second 45 minutes plus stoppage time
- **Extra Time Periods**: End of additional periods if implemented (Future)

**No Whistle Situations**:
- **Advantage Play**: When fouled team maintains beneficial possession
- **Play Continuation**: Ball remains in active play during normal gameplay
- **Goalkeeper Distribution**: When goalkeeper releases ball normally

**Ball Out of Play Protocol**:
- **Immediate Response**: Referee blows whistle within 0.2 seconds of ball crossing boundary
- **Play Suspension**: All players must stop active play immediately upon whistle
- **Restart Determination**: Referee determines appropriate restart method based on last touch
- **Player Positioning**: Players move to required positions for restart
- **Restart Signal**: Brief whistle blow to resume active play once all players positioned correctly

**Advanced Whistle Mechanics (Phase 2)**:
- **Triple Whistle**: Serious misconduct requiring immediate attention
- **Prolonged Whistle**: Medical emergency or serious injury
- **Short Sharp Whistles**: Multiple quick blasts to gain player attention during disputes

### 3.11 Match Rules Implementation

#### 3.11.1 POC Minimal Ruleset
**Core Rules**:
- **Ball In/Out**: Complete ball crossing boundary lines
- **Goal Scoring**: Ball completely crossing goal line
- **Basic Restarts**: Throw-ins, corner kicks, goal kicks only

**Deferred for POC**:
- Offside detection and enforcement
- Foul system and disciplinary actions
- Free kicks and penalties
- Advanced restart procedures

**POC Focus**: Ensure smooth gameplay flow without complex rule interruptions that would hinder AI evaluation

#### 3.11.2 Half-Time Procedures
- **Automatic Transition**: Brief pause at 45 minutes, automatic progression to second half
- **Team Switch**: Team that didn't kick off first half kicks off second half  
- **Formation Reset**: Players return to kick-off positions
- **Simple UI**: Minimal "Half Time" notification (brief, non-blocking)

#### 3.11.3 POC Simplifications
- **No Stoppage Time Calculation**: Fixed 30-second addition per half
- **No Advantage Rule**: Immediate whistle for all infractions (when implemented)
- **Simplified Offside**: Deferred to Phase 2
- **No Disciplinary System**: No cards or player ejections in POC

## 4. Technical Requirements

### 4.1 Voice Recognition System
- **Speech-to-Text Engine**: Real-time voice command processing
- **Command Parsing**: Natural language interpretation for football commands
- **Multi-language Support**: Primary English, expandable to other languages
- **Background Noise Filtering**: Match audio separation from voice commands

### 4.2 Real-time Multiplayer Architecture
- **VGF Framework Integration**: Utilise existing VGF real-time capabilities
- **Socket.IO Transport**: Bidirectional communication
- **State Synchronisation**: Consistent game state across clients
- **Latency Management**: Sub-100ms command response time

### 4.3 Physics and Animation System
**POC Target**: 2D Canvas physics with no Z-axis simulation
- **Ball Physics**: Simple 2D movement with basic friction, no height or spin simulation
- **Player Movement**: 2D position interpolation with basic collision avoidance
- **Collision Detection**: Circular collision detection for player-to-player and player-to-ball interactions
- **Pitch Boundaries**: 2D boundary checking for ball out-of-play detection

**Explicit Non-Goals**: 3D physics, ball height/elevation, realistic spin effects, complex trajectory simulation

### 4.4 Performance Requirements
**FireTV Stick 4K Max Constraints**:
- **Frame Budget**: 33ms total per frame (simulation + rendering)
- **Canvas Operations**: <500 draw calls per frame
- **Texture Memory**: <128MB for all sprites and assets
- **JavaScript Heap**: <256MB peak usage during gameplay
- **Frame Rate**: Consistent 30+ FPS during active match simulation

**Performance Monitoring**: Built-in frame time measurement with developer overlay toggle

## 5. User Experience Requirements

### 5.1 User Interface Design
- **Minimal HUD**: Essential information only (score, time, player names)
- **Visual Feedback**: Clear indication of voice command recognition
- **Formation Display**: Real-time tactical formation visualisation
- **Match Statistics**: Live updating performance metrics
- **Game Phase Notification**: Brief notifications (≤2 seconds duration, 70% opacity) for kick-off, half-time, and final score with developer toggle to disable for AI evaluation

### 5.2 Accessibility Features (Phase 2)
**Future Implementation**:
- **Voice-First Design**: Complete game control via voice commands
- **Visual Indicators**: Clear visual feedback for voice command status
- **Text Alternatives**: Optional text display of recognised commands
- **Audio Cues**: Sound feedback for successful command execution

**POC Approach**: Focus on visual clarity and TV-optimised display

### 5.3 Onboarding Experience
- **Tutorial Mode**: Interactive voice command training
- **Practice Matches**: Single-player matches against AI
- **Command Reference**: In-game help system for voice commands
- **Progressive Complexity**: Gradually introduce advanced tactical concepts

## 6. Content Requirements

### 6.1 Teams and Players
- **League Structure**: 28 teams per league division
- **Player Database**: 22 players per team (11 starting + 5 subs + 6 reserves)
- **Team Names**: Inspired by English League and Premier League names, plus custom user-created names
- **Attribute Variation**: Realistic attribute distributions based on league tier (National League to Premier League quality)
- **Name Generation**: Authentic player names with cultural diversity
- **Team Captain**: Each team has a designated captain (usually highest-rated player)

### 6.2 Stadiums and Environments
- **Stadium Variations**: Multiple pitch environments with different atmospheres
- **League-Tiered Facilities**: Pitch and stadium quality improves with league progression:
  - **National League**: Basic grass pitch, smaller stadiums, minimal facilities
  - **League Two/One**: Improved pitch maintenance, better seating, enhanced lighting
  - **Championship**: Professional-grade facilities, larger capacity, modern amenities
  - **Premier League**: Pristine pitch conditions, premium stadiums, advanced technology
- **Weather Effects**: Impact on gameplay (rain affecting ball control, wind affecting long passes)
- **Crowd Audio**: Dynamic crowd reactions based on match events, crowd size varies by league tier
- **Pitch Conditions**: Surface variations affecting ball roll and player movement, higher leagues have superior pitch quality

### 6.3 Audio Design
- **Commentary System**: Dynamic match commentary responsive to events
- **Crowd Audio System**:
  - **Ambient Crowd Noise**: Continuous background crowd murmur varying by match intensity
  - **Event-Driven Reactions**: Specific crowd responses to match events:
    - **Goals**: Massive cheers for scoring team, groans from opposition supporters
    - **Near Misses**: Collective "Ooohs" and gasps for shots hitting post/crossbar
    - **Penalties**: Hushed anticipation during run-up, explosive reaction to outcome
    - **Red Cards**: Boos from affected team's supporters, cheers from opposition
    - **Yellow Cards**: Mixed reactions based on perceived fairness
    - **Fouls**: Boos for controversial decisions, cheers for good tackles
    - **Corners/Free Kicks**: Rising anticipation and expectation
    - **Substitutions**: Applause for popular players, mixed reactions for tactical changes
    - **Half-time/Full-time Whistle**: Varied reactions based on current score
  - **Team-Specific Support**: Home/away crowd bias affecting reaction intensity
  - **Match Context Awareness**: Crowd excitement increases with match importance and closeness
  - **Dynamic Chanting System**: Premier League-inspired crowd chants:
    - **Support Chants**: "Come on [Team Name]!", team name repetition with rhythmic clapping
    - **Player Chants**: "There's only one [Player Name]", "Super [Player Name]!"
    - **Situational Chants**: "DEE-FENSE!" during defensive pressure, "Attack! Attack!" during forward play
    - **Goal Celebrations**: Extended "Goooooooaal!" followed by team chanting
    - **Response Chants**: Crowd reactions to referee decisions and opposition
    - **Call-and-Response**: "What do we want? A goal! When do we want it? Now!"
    - **Rhythmic Clapping**: 4/4 beat patterns during tense moments
- **Sound Effects**: Ball kicks, whistle, crowd chants, goal celebrations, player communications
- **Musical Score**: Match intro/outro and menu background music

## 7. Platform and Infrastructure Requirements

### 7.1 Client Requirements
- **Primary Platform**: FireTV and web-supporting TV devices
- **Web Browser Support**: Chrome 90+, Firefox 88+, Safari 14+ (for FireTV Silk browser)
- **Device Requirements**: 2GB RAM minimum, modern GPU for rendering, TV remote/voice remote support
- **Input Methods**: Microphone access required (TV remote or dedicated voice remote), optional keyboard/mouse support
- **Network Connection**: Stable internet connection for multiplayer features
- **TV Display Optimisation**: 10-foot UI design for living room viewing

### 7.2 Server Infrastructure
- **VGF Server**: Node.js Express server with VGF integration
- **Redis Storage**: Session storage and match state persistence
- **Socket.IO Transport**: Real-time bidirectional communication
- **Scaling Capability**: Support for concurrent matches and users

### 7.3 Third-Party Integrations
- **Voice Recognition API**: Integration with speech recognition services
- **Analytics Platform**: User behaviour and performance tracking
- **Authentication System**: User account management and security
- **Content Delivery Network**: Asset delivery optimisation

## 8. Success Criteria and Metrics

### 8.1 User Engagement Metrics
- **Daily Active Users**: Target 1,000+ daily players by month 3
- **Session Duration**: Average 15+ minutes per session
- **Match Completion Rate**: 85%+ matches played to completion
- **Return Rate**: 60%+ users return within 7 days

### 8.2 Technical Performance Metrics
**POC-Focused Metrics**:
- **Frame Rate**: Consistent 30+ FPS during match simulation
- **AI Responsiveness**: Player position updates within 100ms of ball movement
- **Match Stability**: Matches complete without crashes or game-breaking bugs

**Deferred**: Voice recognition metrics (out of scope), server uptime targets

### 8.3 Gameplay Quality Metrics
**POC Success Criteria**:
- **AI Formation Adherence**: Players maintain formation shape within acceptable tolerance
- **Ball Physics Consistency**: Ball movement appears natural and predictable
- **Match Flow**: Full 5-minute matches complete with proper half-time and end-game states
- **Visual Clarity**: Player actions (pass, shot, tackle) are clearly distinguishable
- **Possession Tracking**: Match statistics (possession, shots) track accurately

**Key POC Question**: Does the AI behaviour and visual presentation demonstrate a viable foundation for the full game?

## 9. Questions Requiring Clarification

### 9.1 Monetisation Strategy
- **Free-to-play model confirmed** - no upfront cost
- In-app purchase options for cosmetic items or premium features?
- Virtual currency system for player transfers?

### 9.2 Player Progression System
- **League-based progression confirmed** - weekly leagues with promotion/relegation
- **Team development** through virtual currency earned from promotions
- **Player trading system** for team improvement (future phase)
- Skill-based matchmaking within league tiers?

### 9.3 Competitive Features
- Ranked competitive mode with leagues/divisions?
- Tournament structures (knockout, league format)?
- Leaderboards and achievement systems?

### 9.4 Social Features
- Friends system and private matches?
- Team sharing and custom formation creation?
- Spectator mode for watching other matches?

### 9.5 Content Expansion
- Regular content updates with new teams/players?
- Seasonal events tied to real-world football calendar?
- User-generated content capabilities?

### 9.6 Platform Expansion
- **Primary focus**: FireTV and TV device optimisation
- Secondary mobile/desktop browser support?
- Future console platform considerations?
- VR/AR integration potential for immersive management experience?

### 9.7 Voice Command Complexity
- Should the system support complex multi-part commands?
- Regional accent and dialect support requirements?
- Voice command customisation by individual users?

### 9.8 Match Customisation
- Custom match duration options?
- Weather and time-of-day selection?
- Difficulty level selection for AI opponents?

These questions will help refine the PRD and ensure all stakeholder requirements are properly addressed before development commences.

## 10. League System (Future Implementation)

### 10.1 League Structure
- **28-team leagues** across multiple divisions
- **Weekly league cycles** with promotion/relegation system
- **Top 2 teams promoted** to higher division at week's end
- **Virtual currency rewards** for promotion success
- **Relegation consequences** for bottom teams

### 10.2 Player Trading System (Future Implementation)
- **Buy/sell players** using earned virtual currency
- **Transfer market** with AI and human-controlled teams
- **Player contracts** and wage management
- **Scout system** for discovering talent

### 10.3 Team Progression
- **Starting tier**: National League equivalent quality
- **Progression path**: National League → League Two → League One → Championship → Premier League
- **Quality improvements** through promotion and player acquisitions
- **Long-term career mode** spanning multiple seasons

### 10.4 Team Customisation
- **Custom team names** alongside preset options inspired by English leagues
- **Team identity** development through success and playing style
- **Stadium upgrades** tied to league progression (better pitch quality, larger crowds, improved facilities)

## 11. Implementation Phases

### Phase 1: POC Match Engine (Months 1-3)
- Basic match engine with AI-controlled teams
- Single match functionality (human vs AI or AI vs AI)
- Top-down 2D visual presentation
- Minimal UI optimised for TV viewing
- Team and player generation system
- Basic statistics tracking (possession, shots, goals)

### Phase 2: Voice Commands & Rules (Months 4-6)
- Voice command system implementation
- Tactical instruction processing
- Expanded ruleset (offside, fouls, cards)
- Enhanced AI behaviour and formations
- Replay/highlight system

### Phase 3: League System Integration (Months 7-10)
- **28-team league structure**
- **Weekly league cycles**
- **Promotion/relegation mechanics**
- **Virtual currency system**
- **Player trading marketplace**
- **Career progression tracking**

### Phase 4: Polish & Launch (Months 11-12)
- Performance optimisation for TV devices
- Audio implementation and polish
- Tutorial and onboarding systems
- Beta testing and user feedback integration

This PRD provides a comprehensive foundation for developing Soccer Manager: World Cup Edition, an innovative voice-controlled football management game that combines authentic football rules with accessible voice-driven gameplay mechanics, league progression, and long-term team development.