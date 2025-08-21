import { FootballManagerRuleset } from "../GameRuleset"
import type { GameState } from "../shared/types/GameState"
import { PhaseName } from "../shared/types/PhaseName"

describe("FootballManagerRuleset", () => 
{
    // Mock VGF context structure
    const createMockContext = (state: Partial<GameState> = {}): { session: { state: GameState } } => ({
        session: {
            state: {
                matchId: "test-match",
                matchSeed: 12345,
                gameTime: 0,
                footballTime: "00:00",
                footballHalf: 1 as const,
                homeTeam: {
                    id: "home",
                    name: "Test Home",
                    formation: "4-4-2" as const,
                    tacticalStyle: "BALANCE" as const,
                    players: []
                },
                awayTeam: {
                    id: "away", 
                    name: "Test Away",
                    formation: "4-4-2" as const,
                    tacticalStyle: "BALANCE" as const,
                    players: []
                },
                score: { home: 0, away: 0 },
                ball: {
                    position: { x: 0.5, y: 0.5 },
                    velocity: { x: 0, y: 0 },
                    isMoving: false,
                    possessor: null
                },
                ballPossession: null,
                stats: {
                    possessionSeconds: { HOME: 0, AWAY: 0 },
                    shots: { HOME: 0, AWAY: 0 },
                    corners: { HOME: 0, AWAY: 0 }
                },
                matchPhase: "pre_match" as const,
                phase: PhaseName.PreMatch,
                ...state
            }
        }
    })

    describe("setup", () => 
{
        it("should initialize game state correctly", () => 
{
            const result = FootballManagerRuleset.setup()
            
            expect(result).toBeDefined()
            expect(result.matchId).toBeDefined()
            expect(result.matchSeed).toBeDefined()
            expect(result.homeTeam.players).toHaveLength(11)
            expect(result.awayTeam.players).toHaveLength(11)
            expect(result.score).toEqual({ home: 0, away: 0 })
            expect(result.phase).toBe(PhaseName.PreMatch)
        })
    })

    describe("actions", () => 
{
        describe("tacticalCommand", () => 
{
            it("should update home team tactical style", () => 
{
                const ctx = createMockContext()
                const command = { type: "ATTACK", team: "HOME" as const }
                
                const result = FootballManagerRuleset.actions.tacticalCommand(ctx, command)
                
                expect(result.homeTeam.tacticalStyle).toBe("ATTACK")
                expect(result.lastCommand).toEqual({
                    type: "ATTACK",
                    team: "HOME",
                    timestamp: expect.any(Number) as number
                })
            })

            it("should update away team tactical style", () => 
{
                const ctx = createMockContext()
                const command = { type: "DEFEND", team: "AWAY" as const }
                
                const result = FootballManagerRuleset.actions.tacticalCommand(ctx, command)
                
                expect(result.awayTeam.tacticalStyle).toBe("DEFEND")
                expect(result.lastCommand).toEqual({
                    type: "DEFEND", 
                    team: "AWAY",
                    timestamp: expect.any(Number) as number
                })
            })
        })

        describe("startMatch", () => 
{
            it("should transition to kickoff phase", () => 
{
                const ctx = createMockContext()
                
                const result = FootballManagerRuleset.actions.startMatch(ctx)
                
                expect(result.matchPhase).toBe("kickoff")
            })
        })

        describe("takeKickoff", () => 
{
            it("should transition to first half phase", () => 
{
                const ctx = createMockContext({ matchPhase: "kickoff" })
                
                const result = FootballManagerRuleset.actions.takeKickoff(ctx)
                
                expect(result.matchPhase).toBe("first_half")
            })
        })

        describe("shootBall", () => 
{
            beforeEach(() => 
{
                // Mock Math.random for predictable testing
                jest.spyOn(Math, "random")
            })

            afterEach(() => 
{
                jest.restoreAllMocks()
            })

            it("should increase score when shot results in goal", () => 
{
                const ctx = createMockContext()
                ;(Math.random as jest.Mock).mockReturnValue(0.05) // Less than 0.1 = goal
                
                const result = FootballManagerRuleset.actions.shootBall(ctx, "HOME")
                
                expect(result.score.home).toBe(1)
                expect(result.score.away).toBe(0)
            })

            it("should increase shots stat when shot misses", () => 
{
                const ctx = createMockContext()
                ;(Math.random as jest.Mock).mockReturnValue(0.5) // Greater than 0.1 = miss
                
                const result = FootballManagerRuleset.actions.shootBall(ctx, "AWAY")
                
                expect(result.score.home).toBe(0)
                expect(result.score.away).toBe(0)
                expect(result.stats.shots.AWAY).toBe(1)
            })
        })

        describe("restartMatch", () => 
{
            it("should reset match to initial state", () => 
{
                const ctx = createMockContext({
                    matchPhase: "full_time",
                    score: { home: 2, away: 1 },
                    gameTime: 5400,
                    footballTime: "90:00",
                    footballHalf: 2
                })
                
                const result = FootballManagerRuleset.actions.restartMatch(ctx)
                
                expect(result.matchPhase).toBe("pre_match")
                expect(result.score).toEqual({ home: 0, away: 0 })
                expect(result.gameTime).toBe(0)
                expect(result.footballTime).toBe("00:00")
                expect(result.footballHalf).toBe(1)
            })
        })
    })

    describe("reducers", () => 
{
        describe("updateGameTime", () => 
{
            it("should update game time and format football time correctly for first half", () => 
{
                const state = createMockContext().session.state
                
                const result = FootballManagerRuleset.reducers.updateGameTime(state, 1800) // 30 minutes
                
                expect(result.gameTime).toBe(1800)
                expect(result.footballTime).toBe("30:00")
            })

            it("should show injury time in first half", () => 
{
                const state = createMockContext().session.state
                
                const result = FootballManagerRuleset.reducers.updateGameTime(state, 2820) // 47 minutes
                
                expect(result.gameTime).toBe(2820)
                expect(result.footballTime).toBe("45+2")
            })

            it("should format second half time correctly", () => 
{
                const state = createMockContext({ footballHalf: 2 }).session.state
                
                const result = FootballManagerRuleset.reducers.updateGameTime(state, 4500) // 75 minutes total (30 in second half)
                
                expect(result.gameTime).toBe(4500) 
                expect(result.footballTime).toBe("75:00")
            })
        })

        describe("updateScore", () => 
{
            it("should increment home team score", () => 
{
                const state = createMockContext().session.state
                
                const result = FootballManagerRuleset.reducers.updateScore(state, "HOME")
                
                expect(result.score.home).toBe(1)
                expect(result.score.away).toBe(0)
            })

            it("should increment away team score", () => 
{
                const state = createMockContext().session.state
                
                const result = FootballManagerRuleset.reducers.updateScore(state, "AWAY")
                
                expect(result.score.home).toBe(0)
                expect(result.score.away).toBe(1)
            })
        })

        describe("updateBallPossession", () => 
{
            it("should set ball possession to home team", () => 
{
                const state = createMockContext().session.state
                
                const result = FootballManagerRuleset.reducers.updateBallPossession(state, "HOME")
                
                expect(result.ballPossession).toBe("HOME")
            })

            it("should clear ball possession", () => 
{
                const state = createMockContext({ ballPossession: "HOME" }).session.state
                
                const result = FootballManagerRuleset.reducers.updateBallPossession(state, null)
                
                expect(result.ballPossession).toBeNull()
            })
        })
    })

    describe("phases", () => 
{
        it("should define all required phases", () => 
{
            expect(FootballManagerRuleset.phases[PhaseName.PreMatch]).toBeDefined()
            expect(FootballManagerRuleset.phases[PhaseName.Kickoff]).toBeDefined()
            expect(FootballManagerRuleset.phases[PhaseName.FirstHalf]).toBeDefined()
            expect(FootballManagerRuleset.phases[PhaseName.HalfTime]).toBeDefined()
            expect(FootballManagerRuleset.phases[PhaseName.SecondHalf]).toBeDefined()
            expect(FootballManagerRuleset.phases[PhaseName.FullTime]).toBeDefined()
        })
    })

    describe("thunks", () => 
{
        it("should have all defined thunks", () => 
{
            expect(FootballManagerRuleset.thunks.processMatchSimulation).toBeDefined()
            expect(FootballManagerRuleset.thunks.setupTacticalChange).toBeDefined()
            expect(FootballManagerRuleset.thunks.processAdvancedShoot).toBeDefined()
            expect(FootballManagerRuleset.thunks.setupMatchRestart).toBeDefined()
            expect(FootballManagerRuleset.thunks.processSubstitution).toBeDefined()
            expect(FootballManagerRuleset.thunks.updateMatchStatistics).toBeDefined()
        })
    })
})