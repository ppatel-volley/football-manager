/**
 * Player Database Manager for Football Manager
 * Manages player data, attributes, and persistence
 * Integrates with VGF for consistent player state management
 */
import { GameRNG } from "../utils/GameRNG"
import type { Player, PlayerAttributes } from "../shared/types/GameState"

export class PlayerDatabaseManager
{
    private players: Map<string, Player> = new Map()
    private rng: GameRNG
    private nextPlayerId: number = 1

    constructor(seed: number = 42)
    {
        this.rng = new GameRNG(seed)
        this.initializeDefaultPlayers()
    }

    /**
     * Get player by ID
     */
    getPlayer(playerId: string): Player | null
    {
        return this.players.get(playerId) || null
    }

    /**
     * Get multiple players by IDs
     */
    getPlayers(playerIds: string[]): Player[]
    {
        return playerIds.map(id => this.getPlayer(id)).filter(Boolean) as Player[]
    }

    /**
     * Create a new player with generated attributes
     */
    createPlayer(data: {
        name: string
        squadNumber?: number
        team: 'HOME' | 'AWAY'
        playerType: 'GOALKEEPER' | 'OUTFIELD'
        position?: { x: number; y: number }
    }): Player
    {
        const playerId = this.generatePlayerId()
        
        const player: Player = {
            id: playerId,
            name: data.name,
            squadNumber: data.squadNumber || this.nextPlayerId,
            position: data.position || { x: 0.5, y: 0.5 },
            targetPosition: data.position || { x: 0.5, y: 0.5 },
            team: data.team,
            playerType: data.playerType,
            hasBall: false,
            attributes: this.generatePlayerAttributes(data.playerType === 'GOALKEEPER')
        }

        this.players.set(playerId, player)
        return player
    }

    /**
     * Update player attributes
     */
    updatePlayerAttributes(playerId: string, attributes: Partial<PlayerAttributes>): boolean
    {
        const player = this.players.get(playerId)
        if (!player)
        {
            return false
        }

        player.attributes = {
            ...player.attributes,
            ...attributes
        }

        return true
    }

    /**
     * Generate a full team of players
     */
    generateTeam(teamName: string, teamSide: 'HOME' | 'AWAY', formation: '4-4-2' | '4-3-3' = '4-4-2'): Player[]
    {
        const players: Player[] = []
        const formationData = this.getFormationData(formation, teamSide)

        formationData.forEach((positionData, index) =>
        {
            const player = this.createPlayer({
                name: this.generatePlayerName(),
                squadNumber: index + 1,
                team: teamSide,
                playerType: positionData.type,
                position: positionData.position
            })

            players.push(player)
        })

        return players
    }

    /**
     * Search players by criteria
     */
    searchPlayers(criteria: {
        team?: 'HOME' | 'AWAY'
        playerType?: 'GOALKEEPER' | 'OUTFIELD'
        minPace?: number
        minShooting?: number
        minPassing?: number
        minPositioning?: number
    }): Player[]
    {
        const results: Player[] = []

        for (const player of this.players.values())
        {
            if (criteria.team && player.team !== criteria.team) continue
            if (criteria.playerType && player.playerType !== criteria.playerType) continue
            if (criteria.minPace && player.attributes.pace < criteria.minPace) continue
            if (criteria.minShooting && player.attributes.shooting < criteria.minShooting) continue
            if (criteria.minPassing && player.attributes.passing < criteria.minPassing) continue
            if (criteria.minPositioning && player.attributes.positioning < criteria.minPositioning) continue

            results.push(player)
        }

        return results
    }

    /**
     * Get team's best player for a specific attribute
     */
    getBestPlayerForAttribute(team: 'HOME' | 'AWAY', attribute: keyof PlayerAttributes): Player | null
    {
        let bestPlayer: Player | null = null
        let bestValue = 0

        for (const player of this.players.values())
        {
            if (player.team === team && player.attributes[attribute] > bestValue)
            {
                bestValue = player.attributes[attribute]
                bestPlayer = player
            }
        }

        return bestPlayer
    }

    /**
     * Calculate team average for an attribute
     */
    getTeamAttributeAverage(team: 'HOME' | 'AWAY', attribute: keyof PlayerAttributes): number
    {
        const teamPlayers = this.getTeamPlayers(team)
        if (teamPlayers.length === 0) return 0

        const total = teamPlayers.reduce((sum, player) => sum + player.attributes[attribute], 0)
        return total / teamPlayers.length
    }

    /**
     * Get all players from a team
     */
    getTeamPlayers(team: 'HOME' | 'AWAY'): Player[]
    {
        const teamPlayers: Player[] = []

        for (const player of this.players.values())
        {
            if (player.team === team)
            {
                teamPlayers.push(player)
            }
        }

        return teamPlayers.sort((a, b) => a.squadNumber - b.squadNumber)
    }

    /**
     * Import players from external data
     */
    importPlayers(playersData: any[]): number
    {
        let imported = 0

        for (const data of playersData)
        {
            try
            {
                this.createPlayer({
                    name: data.name,
                    squadNumber: data.squadNumber,
                    team: data.team,
                    playerType: data.playerType,
                    position: data.position
                })
                imported++
            }
            catch (error)
            {
                console.warn(`Failed to import player: ${data.name}`, error)
            }
        }

        return imported
    }

    /**
     * Export all players to JSON
     */
    exportPlayers(): any[]
    {
        return Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            squadNumber: player.squadNumber,
            team: player.team,
            playerType: player.playerType,
            attributes: player.attributes
        }))
    }

    /**
     * Reset database (clear all players)
     */
    reset(): void
    {
        this.players.clear()
        this.nextPlayerId = 1
        this.initializeDefaultPlayers()
    }

    /**
     * Get database statistics
     */
    getStats(): {
        totalPlayers: number
        homeTeamPlayers: number
        awayTeamPlayers: number
        goalkeepers: number
        outfieldPlayers: number
    }
    {
        let homeTeamPlayers = 0
        let awayTeamPlayers = 0
        let goalkeepers = 0
        let outfieldPlayers = 0

        for (const player of this.players.values())
        {
            if (player.team === 'HOME') homeTeamPlayers++
            else awayTeamPlayers++

            if (player.playerType === 'GOALKEEPER') goalkeepers++
            else outfieldPlayers++
        }

        return {
            totalPlayers: this.players.size,
            homeTeamPlayers,
            awayTeamPlayers,
            goalkeepers,
            outfieldPlayers
        }
    }

    // Private helper methods

    private generatePlayerId(): string
    {
        return `player_${this.nextPlayerId++}_${Date.now()}`
    }

    private generatePlayerAttributes(isGoalkeeper: boolean): PlayerAttributes
    {
        const clamp = (value: number) => Math.max(1, Math.min(10, Math.round(value)))

        if (isGoalkeeper)
        {
            return {
                pace: clamp(3 + this.rng.nextFloat(0, 4)), // 3-7
                passing: clamp(4 + this.rng.nextFloat(0, 4)), // 4-8
                shooting: clamp(1 + this.rng.nextFloat(0, 3)), // 1-4
                positioning: clamp(6 + this.rng.nextFloat(0, 4)) // 6-10
            }
        }
        else
        {
            return {
                pace: clamp(4 + this.rng.nextFloat(0, 6)), // 4-10
                passing: clamp(4 + this.rng.nextFloat(0, 6)), // 4-10
                shooting: clamp(3 + this.rng.nextFloat(0, 7)), // 3-10
                positioning: clamp(4 + this.rng.nextFloat(0, 6)) // 4-10
            }
        }
    }

    private generatePlayerName(): string
    {
        const firstNames = [
            'Alex', 'Ben', 'Charlie', 'David', 'Eddie', 'Frank', 'George', 'Harry',
            'Ivan', 'Jack', 'Kevin', 'Luke', 'Mike', 'Nick', 'Oliver', 'Paul',
            'Quinn', 'Ryan', 'Steve', 'Tom', 'Ulrich', 'Victor', 'Will', 'Xavier',
            'Yuki', 'Zack', 'Aaron', 'Brian', 'Connor', 'Daniel', 'Ethan', 'Felix'
        ]

        const lastNames = [
            'Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall',
            'Johnson', 'King', 'Lee', 'Miller', 'Nelson', 'Parker', 'Roberts', 'Smith',
            'Taylor', 'Walker', 'White', 'Wilson', 'Adams', 'Baker', 'Cooper', 'Davies',
            'Edwards', 'Foster', 'Garcia', 'Hughes', 'Jackson', 'Kelly', 'Lewis', 'Moore'
        ]

        const firstName = this.rng.pickRandom(firstNames)
        const lastName = this.rng.pickRandom(lastNames)
        return `${firstName} ${lastName}`
    }

    private getFormationData(formation: '4-4-2' | '4-3-3', teamSide: 'HOME' | 'AWAY'): Array<{
        type: 'GOALKEEPER' | 'OUTFIELD'
        position: { x: number; y: number }
    }>
    {
        // Using simplified formation data - in production this would use FIFA constants
        const isHome = teamSide === 'HOME'
        const baseX = isHome ? 0.2 : 0.8

        if (formation === '4-4-2')
        {
            return [
                { type: 'GOALKEEPER', position: { x: isHome ? 0.05 : 0.95, y: 0.5 } },
                { type: 'OUTFIELD', position: { x: baseX, y: 0.15 } }, // LB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.35 } }, // CB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.65 } }, // CB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.85 } }, // RB
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.2 : -0.2), y: 0.2 } }, // LM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.2 : -0.2), y: 0.4 } }, // CM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.2 : -0.2), y: 0.6 } }, // CM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.2 : -0.2), y: 0.8 } }, // RM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.45 : -0.45), y: 0.4 } }, // ST
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.45 : -0.45), y: 0.6 } }, // ST
            ]
        }
        else // 4-3-3
        {
            return [
                { type: 'GOALKEEPER', position: { x: isHome ? 0.05 : 0.95, y: 0.5 } },
                { type: 'OUTFIELD', position: { x: baseX, y: 0.1 } }, // LB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.35 } }, // CB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.65 } }, // CB
                { type: 'OUTFIELD', position: { x: baseX, y: 0.9 } }, // RB
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.15 : -0.15), y: 0.5 } }, // CDM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.25 : -0.25), y: 0.3 } }, // CM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.25 : -0.25), y: 0.7 } }, // CM
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.5 : -0.5), y: 0.15 } }, // LW
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.55 : -0.55), y: 0.5 } }, // ST
                { type: 'OUTFIELD', position: { x: baseX + (isHome ? 0.5 : -0.5), y: 0.85 } }, // RW
            ]
        }
    }

    private initializeDefaultPlayers(): void
    {
        // Create default teams for testing/demo purposes
        console.info('Initializing default players...')
        
        const homeTeam = this.generateTeam('Home Team', 'HOME', '4-4-2')
        const awayTeam = this.generateTeam('Away Team', 'AWAY', '4-4-2')
        
        console.info(`Created ${homeTeam.length} home players and ${awayTeam.length} away players`)
    }
}