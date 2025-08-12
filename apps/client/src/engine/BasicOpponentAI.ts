import type { GameState, BasicTacticalCommand } from "../types/POCTypes"

type AIDifficulty = 'BEGINNER'

export class BasicOpponentAI 
{
    private difficulty: AIDifficulty
    private reactionDelay: number
    private lastDecision: number = 0
    private currentTactic: 'ATTACK' | 'DEFEND' | 'BALANCE' = 'BALANCE'

    constructor(difficulty: AIDifficulty) 
    {
        this.difficulty = difficulty
        this.reactionDelay = 3000 // 3 seconds for beginner AI
    }

    public makeSimpleDecision(gameState: GameState): BasicTacticalCommand | null 
    {
        const currentTime = Date.now()
        
        // Only make decisions after reaction delay
        if (currentTime - this.lastDecision < this.reactionDelay) 
        {
            return null
        }

        const newTactic = this.evaluateGameSituation(gameState)
        
        // Only change if different from current tactic
        if (newTactic !== this.currentTactic) 
        {
            this.currentTactic = newTactic
            this.lastDecision = currentTime
            
            return {
                type: newTactic,
                team: 'AI',
                timestamp: currentTime
            }
        }
        
        return null
    }

    private evaluateGameSituation(gameState: GameState): 'ATTACK' | 'DEFEND' | 'BALANCE' 
    {
        const blueTeam = gameState.teams.find(team => team.color === 'BLUE')
        const redTeam = gameState.teams.find(team => team.color === 'RED')
        
        if (!blueTeam || !redTeam) return 'BALANCE'

        // Simple decision logic for beginner AI
        const scoresDifference = gameState.score.away - gameState.score.home // AI is away team
        const timeRemaining = 300 - gameState.gameTime // 5 minutes total
        const blueHasBall = blueTeam.players.some(player => player.hasBall)
        const redHasBall = redTeam.players.some(player => player.hasBall)

        // If AI is winning by 2+ goals, defend
        if (scoresDifference >= 2) 
        {
            return 'DEFEND'
        }

        // If AI is losing and time is running out (last 2 minutes), attack
        if (scoresDifference < 0 && timeRemaining < 120) 
        {
            return 'ATTACK'
        }

        // If red team (human) is attacking aggressively, defend
        if (redTeam.tacticalStyle === 'ATTACK' && redHasBall) 
        {
            return 'DEFEND'
        }

        // If AI has the ball and is losing or tied, attack
        if (blueHasBall && scoresDifference <= 0) 
        {
            return 'ATTACK'
        }

        // If red team is defending, try to attack
        if (redTeam.tacticalStyle === 'DEFEND') 
        {
            return 'ATTACK'
        }

        // Default to balanced approach
        return 'BALANCE'
    }

    public reactToPlayerCommand(command: BasicTacticalCommand): void 
    {
        // Simple reactive logic - do opposite of human player sometimes
        if (this.difficulty === 'BEGINNER') 
        {
            // Beginner AI doesn't react immediately or intelligently
            // This will be enhanced in later phases
            console.log(`AI notices human command: ${command.type} but doesn't react immediately`)
        }
    }
}