/**
 * Transforms raw FIFA scraped data to canonical player format
 * Handles data validation, normalization, and database structure creation
 */

import { v4 as uuidv4 } from 'uuid';
import { AttributeMapper } from './attribute-mapper.js';

interface RawFIFAPlayer
{
    name: string;
    overall: number;
    position: string;
    nationality: string;
    team: string;
    age?: number;
    height?: string;
    preferredFoot?: string;
    
    pace: Record<string, number>;
    shooting: Record<string, number>;
    passing: Record<string, number>;
    dribbling: Record<string, number>;
    defending: Record<string, number>;
    physical: Record<string, number>;
    goalkeeping?: Record<string, number>;
}

interface CanonicalPlayer
{
    id: string;
    name: string;
    nationality: string;
    position: string;
    age: number;
    overall: number;
    attributes: any; // CanonicalPlayerAttributes from attribute-mapper
    
    fifa: {
        originalOverall: number;
        team: string;
        height?: string;
        preferredFoot?: string;
        scrapedFrom: string;
    };
}

interface PlayerDatabase
{
    metadata: {
        scrapedDate: string;
        totalPlayers: number;
        source: string;
        version: string;
        failedPlayers: string[];
    };
    players: Record<string, CanonicalPlayer>;
}

export class PlayerTransformer
{
    private attributeMapper: AttributeMapper;
    
    constructor()
    {
        this.attributeMapper = new AttributeMapper();
    }
    
    /**
     * Transforms a single raw FIFA player to canonical format
     */
    transformPlayer(raw: RawFIFAPlayer, playerSlug: string, sourceUrl: string): CanonicalPlayer
    {
        // Generate consistent ID based on name and nationality
        const playerId = this.generatePlayerId(raw.name, raw.nationality);
        
        // Normalize and validate basic fields
        const normalizedPlayer = this.normalizePlayerData(raw);
        
        // Map attributes using AttributeMapper
        const attributes = this.attributeMapper.mapAttributes(
            {
                pace: raw.pace,
                shooting: raw.shooting,
                passing: raw.passing,
                dribbling: raw.dribbling,
                defending: raw.defending,
                physical: raw.physical,
                goalkeeping: raw.goalkeeping
            },
            normalizedPlayer.position,
            normalizedPlayer.overall
        );
        
        // Validate attributes
        if (!this.attributeMapper.validateAttributes(attributes))
        {
            console.warn(`⚠️  Invalid attributes for ${raw.name}, using position defaults`);
            const defaults = this.attributeMapper.getPositionDefaults(normalizedPlayer.position);
            Object.assign(attributes, defaults);
        }
        
        return {
            id: playerId,
            name: normalizedPlayer.name,
            nationality: normalizedPlayer.nationality,
            position: normalizedPlayer.position,
            age: normalizedPlayer.age,
            overall: this.normalizeOverall(normalizedPlayer.overall),
            attributes,
            
            fifa: {
                originalOverall: normalizedPlayer.overall,
                team: normalizedPlayer.team,
                height: raw.height,
                preferredFoot: raw.preferredFoot,
                scrapedFrom: sourceUrl
            }
        };
    }
    
    /**
     * Creates a player database from array of transformed players
     */
    createPlayerDatabase(players: CanonicalPlayer[]): Record<string, CanonicalPlayer>
    {
        const database: Record<string, CanonicalPlayer> = {};
        
        for (const player of players)
        {
            // Handle duplicate IDs by appending suffix
            let finalId = player.id;
            let suffix = 1;
            
            while (database[finalId])
            {
                finalId = `${player.id}-${suffix}`;
                suffix++;
            }
            
            // Update player ID if changed
            if (finalId !== player.id)
            {
                console.warn(`⚠️  Duplicate ID for ${player.name}, using ${finalId}`);
                player.id = finalId;
            }
            
            database[finalId] = player;
        }
        
        return database;
    }
    
    /**
     * Generates consistent player ID based on name and nationality
     */
    private generatePlayerId(name: string, nationality: string): string
    {
        // Create a deterministic ID based on name and nationality
        const normalizedName = name.toLowerCase()
            .replace(/[^a-z\s]/g, '') // Remove special characters
            .replace(/\s+/g, '-')      // Replace spaces with dashes
            .substring(0, 30);         // Limit length
        
        const normalizedNationality = nationality.toLowerCase().substring(0, 3);
        
        // Create a short hash for uniqueness
        const hash = this.simpleHash(`${name}-${nationality}`).toString(36).substring(0, 6);
        
        return `${normalizedName}-${normalizedNationality}-${hash}`;
    }
    
    private simpleHash(str: string): number
    {
        let hash = 0;
        for (let i = 0; i < str.length; i++)
        {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    /**
     * Normalizes and validates raw player data
     */
    private normalizePlayerData(raw: RawFIFAPlayer): Required<Omit<RawFIFAPlayer, 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'goalkeeping'>>
    {
        return {
            name: this.normalizeName(raw.name),
            overall: Math.max(1, Math.min(99, raw.overall || 50)),
            position: this.normalizePosition(raw.position),
            nationality: this.normalizeNationality(raw.nationality),
            team: raw.team?.trim() || 'Unknown',
            age: this.normalizeAge(raw.age),
            height: raw.height?.trim() || undefined,
            preferredFoot: this.normalizePreferredFoot(raw.preferredFoot)
        };
    }
    
    private normalizeName(name: string): string
    {
        if (!name || name.trim().length === 0)
        {
            throw new Error('Player name is required');
        }
        
        return name.trim()
            .replace(/\s+/g, ' ')      // Normalize whitespace
            .replace(/[^\w\s\-'\.]/g, '') // Keep only safe characters
            .substring(0, 50);         // Limit length
    }
    
    private normalizePosition(position: string): string
    {
        const positionMap: Record<string, string> = {
            // Goalkeeper
            'GK': 'GK',
            'GOALKEEPER': 'GK',
            
            // Defenders
            'CB': 'CB', 'CENTRE-BACK': 'CB', 'CENTER-BACK': 'CB',
            'LB': 'LB', 'LEFT-BACK': 'LB',
            'RB': 'RB', 'RIGHT-BACK': 'RB',
            'LWB': 'LB', 'RWB': 'RB', // Wing-backs map to full-backs
            
            // Midfielders
            'CDM': 'CDM', 'DEFENSIVE-MIDFIELDER': 'CDM',
            'CM': 'CM', 'CENTRAL-MIDFIELDER': 'CM',
            'CAM': 'CAM', 'ATTACKING-MIDFIELDER': 'CAM',
            'LM': 'CM', 'RM': 'CM', // Side midfielders to central
            
            // Wingers/Forwards
            'LW': 'LW', 'LEFT-WINGER': 'LW',
            'RW': 'RW', 'RIGHT-WINGER': 'RW',
            'ST': 'ST', 'STRIKER': 'ST',
            'CF': 'ST', 'CENTRE-FORWARD': 'ST' // Centre-forward to striker
        };
        
        const normalized = position?.toUpperCase().trim() || 'CM';
        return positionMap[normalized] || 'CM'; // Default to CM if unknown
    }
    
    private normalizeNationality(nationality: string): string
    {
        if (!nationality || nationality.trim().length === 0)
        {
            return 'Unknown';
        }
        
        // Common nationality mappings
        const nationalityMap: Record<string, string> = {
            'ENGLAND': 'ENG',
            'UNITED STATES': 'USA',
            'UNITED KINGDOM': 'ENG',
            'SPAIN': 'ESP',
            'FRANCE': 'FRA',
            'GERMANY': 'GER',
            'ITALY': 'ITA',
            'PORTUGAL': 'POR',
            'BRAZIL': 'BRA',
            'ARGENTINA': 'ARG',
            'NETHERLANDS': 'NED',
            'BELGIUM': 'BEL'
        };
        
        const normalized = nationality.toUpperCase().trim();
        
        // Return mapped nationality or first 3 characters
        return nationalityMap[normalized] || normalized.substring(0, 3);
    }
    
    private normalizeAge(age?: number): number
    {
        if (!age || age < 16 || age > 45)
        {
            // Generate realistic age based on position
            return Math.floor(Math.random() * 10) + 22; // 22-31 years old
        }
        
        return Math.floor(age);
    }
    
    private normalizePreferredFoot(foot?: string): string | undefined
    {
        if (!foot) return undefined;
        
        const normalized = foot.toLowerCase().trim();
        if (normalized.includes('left')) return 'Left';
        if (normalized.includes('right')) return 'Right';
        if (normalized.includes('both')) return 'Both';
        
        return undefined;
    }
    
    /**
     * Normalizes FIFA overall rating (1-99) to our scale (0-10)
     */
    private normalizeOverall(fifaOverall: number): number
    {
        const normalized = Math.max(0, Math.min(99, fifaOverall)) / 99 * 10;
        return Math.round(normalized * 10) / 10; // Round to 1 decimal place
    }
    
    /**
     * Validates a transformed player
     */
    validatePlayer(player: CanonicalPlayer): boolean
    {
        const requiredFields = ['id', 'name', 'nationality', 'position', 'age', 'overall', 'attributes'];
        
        for (const field of requiredFields)
        {
            if (!(field in player) || (player as any)[field] == null)
            {
                console.error(`❌ Missing required field: ${field} for player ${player.name}`);
                return false;
            }
        }
        
        // Validate ranges
        if (player.age < 16 || player.age > 45)
        {
            console.error(`❌ Invalid age: ${player.age} for player ${player.name}`);
            return false;
        }
        
        if (player.overall < 0 || player.overall > 10)
        {
            console.error(`❌ Invalid overall: ${player.overall} for player ${player.name}`);
            return false;
        }
        
        // Validate attributes exist
        if (!player.attributes || typeof player.attributes !== 'object')
        {
            console.error(`❌ Invalid attributes for player ${player.name}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Creates sample team definitions using the player database
     */
    createSampleTeamDefinitions(database: Record<string, CanonicalPlayer>): Record<string, any>
    {
        const players = Object.values(database);
        const teams: Record<string, any> = {};
        
        // Group players by nationality
        const playersByNationality = players.reduce((acc, player) => {
            if (!acc[player.nationality]) acc[player.nationality] = [];
            acc[player.nationality].push(player);
            return acc;
        }, {} as Record<string, CanonicalPlayer[]>);
        
        // Create team definitions for major nationalities
        const majorNationalities = ['ENG', 'USA', 'BRA', 'ARG', 'ESP', 'FRA', 'GER', 'ITA'];
        
        for (const nationality of majorNationalities)
        {
            const nationalPlayers = playersByNationality[nationality];
            if (nationalPlayers && nationalPlayers.length >= 23)
            {
                // Sort by overall rating and take top 23
                const topPlayers = nationalPlayers
                    .sort((a, b) => b.overall - a.overall)
                    .slice(0, 23);
                
                teams[nationality] = {
                    name: this.getNationalTeamName(nationality),
                    confederation: this.getConfederation(nationality),
                    playerIds: topPlayers.map(p => p.id),
                    formation: '4-3-3',
                    tactics: `default-${nationality.toLowerCase()}`
                };
            }
        }
        
        return teams;
    }
    
    private getNationalTeamName(code: string): string
    {
        const names: Record<string, string> = {
            'ENG': 'England',
            'USA': 'United States',
            'BRA': 'Brazil',
            'ARG': 'Argentina',
            'ESP': 'Spain',
            'FRA': 'France',
            'GER': 'Germany',
            'ITA': 'Italy'
        };
        
        return names[code] || code;
    }
    
    private getConfederation(nationality: string): string
    {
        const confederations: Record<string, string> = {
            'ENG': 'UEFA',
            'USA': 'CONCACAF',
            'BRA': 'CONMEBOL',
            'ARG': 'CONMEBOL',
            'ESP': 'UEFA',
            'FRA': 'UEFA',
            'GER': 'UEFA',
            'ITA': 'UEFA'
        };
        
        return confederations[nationality] || 'FIFA';
    }
}