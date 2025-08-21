#!/usr/bin/env node

/**
 * Validates scraped FIFA player data and generates reports
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface PlayerDatabase
{
    metadata: {
        scrapedDate: string;
        totalPlayers: number;
        source: string;
        version: string;
        failedPlayers: string[];
    };
    players: Record<string, any>;
}

interface ValidationReport
{
    summary: {
        totalPlayers: number;
        validPlayers: number;
        invalidPlayers: number;
        duplicateIds: number;
        missingFields: number;
        attributeErrors: number;
    };
    errors: Array<{
        playerId: string;
        playerName: string;
        type: string;
        message: string;
    }>;
    warnings: Array<{
        playerId: string;
        playerName: string;
        message: string;
    }>;
    statistics: {
        positionDistribution: Record<string, number>;
        nationalityDistribution: Record<string, number>;
        averageOverall: number;
        ageDistribution: Record<string, number>;
    };
}

class PlayerDatabaseValidator
{
    async validateDatabase(databasePath: string): Promise<ValidationReport>
    {
        console.log(`🔍 Validating player database: ${databasePath}`);
        
        if (!existsSync(databasePath))
        {
            throw new Error(`Database file not found: ${databasePath}`);
        }
        
        const data = await readFile(databasePath, 'utf-8');
        const database: PlayerDatabase = JSON.parse(data);
        
        const report: ValidationReport = {
            summary: {
                totalPlayers: 0,
                validPlayers: 0,
                invalidPlayers: 0,
                duplicateIds: 0,
                missingFields: 0,
                attributeErrors: 0
            },
            errors: [],
            warnings: [],
            statistics: {
                positionDistribution: {},
                nationalityDistribution: {},
                averageOverall: 0,
                ageDistribution: {}
            }
        };
        
        // Validate metadata
        this.validateMetadata(database.metadata, report);
        
        // Validate players
        await this.validatePlayers(database.players, report);
        
        // Generate statistics
        this.generateStatistics(database.players, report);
        
        // Print summary
        this.printValidationSummary(report);
        
        return report;
    }
    
    private validateMetadata(metadata: any, report: ValidationReport): void
    {
        if (!metadata)
        {
            report.errors.push({
                playerId: 'metadata',
                playerName: 'Database Metadata',
                type: 'missing_metadata',
                message: 'Database metadata is missing'
            });
            return;
        }
        
        const requiredFields = ['scrapedDate', 'totalPlayers', 'source', 'version'];
        for (const field of requiredFields)
        {
            if (!(field in metadata))
            {
                report.errors.push({
                    playerId: 'metadata',
                    playerName: 'Database Metadata',
                    type: 'missing_field',
                    message: `Missing required field: ${field}`
                });
            }
        }
    }
    
    private async validatePlayers(players: Record<string, any>, report: ValidationReport): Promise<void>
    {
        const playerIds = Object.keys(players);
        report.summary.totalPlayers = playerIds.length;
        
        const seenIds = new Set<string>();
        const seenNames = new Map<string, string>();
        
        for (const playerId of playerIds)
        {
            const player = players[playerId];
            
            // Check for duplicate IDs
            if (seenIds.has(playerId))
            {
                report.summary.duplicateIds++;
                report.errors.push({
                    playerId,
                    playerName: player?.name || 'Unknown',
                    type: 'duplicate_id',
                    message: `Duplicate player ID: ${playerId}`
                });
                continue;
            }
            seenIds.add(playerId);
            
            // Validate individual player
            const playerValid = this.validatePlayer(player, playerId, report);
            
            if (playerValid)
            {
                report.summary.validPlayers++;
                
                // Check for duplicate names (warning only)
                const playerName = player.name.toLowerCase();
                if (seenNames.has(playerName))
                {
                    report.warnings.push({
                        playerId,
                        playerName: player.name,
                        message: `Possible duplicate player: ${player.name} (also seen as ${seenNames.get(playerName)})`
                    });
                }
                seenNames.set(playerName, playerId);
            }
            else
            {
                report.summary.invalidPlayers++;
            }
        }
    }
    
    private validatePlayer(player: any, playerId: string, report: ValidationReport): boolean
    {
        if (!player)
        {
            report.errors.push({
                playerId,
                playerName: 'Unknown',
                type: 'null_player',
                message: 'Player data is null or undefined'
            });
            return false;
        }
        
        let isValid = true;
        const playerName = player.name || 'Unknown';
        
        // Required fields
        const requiredFields = ['id', 'name', 'nationality', 'position', 'age', 'overall', 'attributes'];
        for (const field of requiredFields)
        {
            if (!(field in player) || player[field] == null)
            {
                report.summary.missingFields++;
                report.errors.push({
                    playerId,
                    playerName,
                    type: 'missing_field',
                    message: `Missing required field: ${field}`
                });
                isValid = false;
            }
        }
        
        // Validate field types and ranges
        if (typeof player.name !== 'string' || player.name.length === 0)
        {
            report.errors.push({
                playerId,
                playerName,
                type: 'invalid_name',
                message: 'Player name must be a non-empty string'
            });
            isValid = false;
        }
        
        if (typeof player.age !== 'number' || player.age < 16 || player.age > 45)
        {
            report.errors.push({
                playerId,
                playerName,
                type: 'invalid_age',
                message: `Invalid age: ${player.age} (must be 16-45)`
            });
            isValid = false;
        }
        
        if (typeof player.overall !== 'number' || player.overall < 0 || player.overall > 10)
        {
            report.errors.push({
                playerId,
                playerName,
                type: 'invalid_overall',
                message: `Invalid overall rating: ${player.overall} (must be 0-10)`
            });
            isValid = false;
        }
        
        // Validate position
        const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
        if (!validPositions.includes(player.position))
        {
            report.warnings.push({
                playerId,
                playerName,
                message: `Unusual position: ${player.position}`
            });
        }
        
        // Validate attributes
        if (!this.validatePlayerAttributes(player.attributes, playerId, playerName, report))
        {
            report.summary.attributeErrors++;
            isValid = false;
        }
        
        return isValid;
    }
    
    private validatePlayerAttributes(attributes: any, playerId: string, playerName: string, report: ValidationReport): boolean
    {
        if (!attributes || typeof attributes !== 'object')
        {
            report.errors.push({
                playerId,
                playerName,
                type: 'invalid_attributes',
                message: 'Attributes must be an object'
            });
            return false;
        }
        
        let isValid = true;
        
        // Required attribute fields
        const requiredAttributes = [
            'passing', 'shooting', 'dribbling', 'crossing', 'finishing', 'longShots',
            'freeKicks', 'penalties', 'pace', 'acceleration', 'stamina', 'strength',
            'jumping', 'agility', 'balance', 'decisions', 'composure', 'concentration',
            'positioning', 'anticipation', 'vision', 'workRate', 'teamwork', 'leadership',
            'tackling', 'marking', 'heading', 'interceptions'
        ];
        
        for (const attr of requiredAttributes)
        {
            if (!(attr in attributes))
            {
                report.errors.push({
                    playerId,
                    playerName,
                    type: 'missing_attribute',
                    message: `Missing attribute: ${attr}`
                });
                isValid = false;
            }
            else if (typeof attributes[attr] !== 'number' || attributes[attr] < 0 || attributes[attr] > 10)
            {
                report.errors.push({
                    playerId,
                    playerName,
                    type: 'invalid_attribute_value',
                    message: `Invalid ${attr}: ${attributes[attr]} (must be 0-10)`
                });
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    private generateStatistics(players: Record<string, any>, report: ValidationReport): void
    {
        const validPlayers = Object.values(players).filter(p => p && p.name);
        
        // Position distribution
        validPlayers.forEach(player => {
            const position = player.position || 'Unknown';
            report.statistics.positionDistribution[position] = 
                (report.statistics.positionDistribution[position] || 0) + 1;
        });
        
        // Nationality distribution
        validPlayers.forEach(player => {
            const nationality = player.nationality || 'Unknown';
            report.statistics.nationalityDistribution[nationality] = 
                (report.statistics.nationalityDistribution[nationality] || 0) + 1;
        });
        
        // Average overall
        const totalOverall = validPlayers.reduce((sum, player) => sum + (player.overall || 0), 0);
        report.statistics.averageOverall = validPlayers.length > 0 ? 
            Math.round((totalOverall / validPlayers.length) * 100) / 100 : 0;
        
        // Age distribution
        validPlayers.forEach(player => {
            const ageGroup = this.getAgeGroup(player.age);
            report.statistics.ageDistribution[ageGroup] = 
                (report.statistics.ageDistribution[ageGroup] || 0) + 1;
        });
    }
    
    private getAgeGroup(age: number): string
    {
        if (age < 20) return '16-19';
        if (age < 25) return '20-24';
        if (age < 30) return '25-29';
        if (age < 35) return '30-34';
        return '35+';
    }
    
    private printValidationSummary(report: ValidationReport): void
    {
        console.log('\n📊 VALIDATION SUMMARY');
        console.log('─'.repeat(50));
        console.log(`Total Players: ${report.summary.totalPlayers}`);
        console.log(`Valid Players: ${report.summary.validPlayers} (${this.percentage(report.summary.validPlayers, report.summary.totalPlayers)}%)`);
        console.log(`Invalid Players: ${report.summary.invalidPlayers} (${this.percentage(report.summary.invalidPlayers, report.summary.totalPlayers)}%)`);
        
        if (report.summary.duplicateIds > 0)
        {
            console.log(`🔴 Duplicate IDs: ${report.summary.duplicateIds}`);
        }
        
        if (report.summary.missingFields > 0)
        {
            console.log(`🟡 Missing Fields: ${report.summary.missingFields}`);
        }
        
        if (report.summary.attributeErrors > 0)
        {
            console.log(`🟡 Attribute Errors: ${report.summary.attributeErrors}`);
        }
        
        if (report.warnings.length > 0)
        {
            console.log(`⚠️  Warnings: ${report.warnings.length}`);
        }
        
        console.log('\n📈 STATISTICS');
        console.log('─'.repeat(50));
        console.log(`Average Overall Rating: ${report.statistics.averageOverall}/10`);
        
        console.log('\nTop Positions:');
        const topPositions = Object.entries(report.statistics.positionDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        topPositions.forEach(([pos, count]) => {
            console.log(`  ${pos}: ${count} players`);
        });
        
        console.log('\nTop Nationalities:');
        const topNationalities = Object.entries(report.statistics.nationalityDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        topNationalities.forEach(([nat, count]) => {
            console.log(`  ${nat}: ${count} players`);
        });
        
        if (report.errors.length > 0)
        {
            console.log('\n❌ SAMPLE ERRORS (showing first 5):');
            console.log('─'.repeat(50));
            report.errors.slice(0, 5).forEach(error => {
                console.log(`  ${error.type}: ${error.message} (${error.playerName})`);
            });
            
            if (report.errors.length > 5)
            {
                console.log(`  ... and ${report.errors.length - 5} more errors`);
            }
        }
    }
    
    private percentage(value: number, total: number): number
    {
        return total > 0 ? Math.round((value / total) * 100) : 0;
    }
}

// CLI Entry point
async function main(): Promise<void>
{
    const args = process.argv.slice(2);
    const databasePath = args[0] || path.join(process.cwd(), '..', 'apps', 'server', 'data', 'players', 'players.json');
    
    const validator = new PlayerDatabaseValidator();
    
    try
    {
        const report = await validator.validateDatabase(databasePath);
        
        // Exit with error code if validation failed
        if (report.summary.invalidPlayers > 0 || report.errors.length > 0)
        {
            console.log('\n❌ Validation failed with errors');
            process.exit(1);
        }
        else
        {
            console.log('\n✅ Validation passed successfully');
            process.exit(0);
        }
    }
    catch (error)
    {
        console.error('💥 Validation failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`)
{
    main().catch(console.error);
}

export { PlayerDatabaseValidator };