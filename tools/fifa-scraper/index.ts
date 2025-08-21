#!/usr/bin/env node

import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AttributeMapper } from './attribute-mapper.js';
import { PlayerTransformer } from './player-transformer.js';

interface ScrapingConfig
{
    baseUrl: string;
    rateLimit: number;
    batchSize: number;
    outputPath: string;
    testMode: boolean;
    playerLimit?: number;
    resumeFromId?: string;
}

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
    
    // Attribute categories
    pace: Record<string, number>;
    shooting: Record<string, number>;
    passing: Record<string, number>;
    dribbling: Record<string, number>;
    defending: Record<string, number>;
    physical: Record<string, number>;
    goalkeeping?: Record<string, number>; // Only for GK positions
}

interface ScrapedPlayer
{
    id: string;
    name: string;
    nationality: string;
    position: string;
    age: number;
    overall: number;
    attributes: any; // Will be mapped to canonical PlayerAttributes
    fifa: {
        originalOverall: number;
        team: string;
        height?: string;
        preferredFoot?: string;
        scrapedFrom: string;
    };
}

interface ScrapingProgress
{
    totalPlayers: number;
    scrapedPlayers: number;
    failedPlayers: string[];
    lastProcessedId?: string;
    startTime: Date;
    checkpoints: string[];
}

class FIFAPlayerScraper
{
    private config: ScrapingConfig;
    private browser: Browser | null = null;
    private attributeMapper: AttributeMapper;
    private playerTransformer: PlayerTransformer;
    private progress: ScrapingProgress;
    
    constructor(config: ScrapingConfig)
    {
        this.config = config;
        this.attributeMapper = new AttributeMapper();
        this.playerTransformer = new PlayerTransformer();
        this.progress = {
            totalPlayers: 0,
            scrapedPlayers: 0,
            failedPlayers: [],
            startTime: new Date(),
            checkpoints: []
        };
    }
    
    async initialize(): Promise<void>
    {
        console.log('🚀 Initializing FIFA Player Scraper...');
        
        // Create output directory
        const outputDir = path.dirname(this.config.outputPath);
        if (!existsSync(outputDir))
        {
            await mkdir(outputDir, { recursive: true });
        }
        
        // Load existing progress if resuming
        if (this.config.resumeFromId)
        {
            await this.loadProgress();
        }
        
        // Launch browser
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });
        
        console.log('✅ Browser initialized');
    }
    
    async scrapeAllPlayers(): Promise<void>
    {
        if (!this.browser)
        {
            throw new Error('Browser not initialized. Call initialize() first.');
        }
        
        try
        {
            // 1. Discover player pages
            console.log('🔍 Discovering player pages...');
            const playerSlugs = await this.discoverPlayerPages();
            this.progress.totalPlayers = playerSlugs.length;
            
            console.log(`📊 Found ${playerSlugs.length} players to scrape`);
            
            // 2. Process in batches
            const batches = this.batchArray(playerSlugs, this.config.batchSize);
            const scrapedPlayers: ScrapedPlayer[] = [];
            
            for (let i = 0; i < batches.length; i++)
            {
                const batch = batches[i];
                console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} players)`);
                
                const batchResults = await this.processBatch(batch);
                scrapedPlayers.push(...batchResults);
                
                // Save checkpoint
                await this.saveCheckpoint(scrapedPlayers);
                
                // Rate limiting
                if (i < batches.length - 1)
                {
                    console.log(`⏱️  Rate limiting: waiting ${this.config.rateLimit}ms...`);
                    await this.delay(this.config.rateLimit);
                }
            }
            
            // 3. Generate final database
            await this.exportPlayerDatabase(scrapedPlayers);
            
            console.log('✅ Scraping completed successfully!');
            console.log(`📈 Results: ${scrapedPlayers.length}/${this.progress.totalPlayers} players scraped`);
            if (this.progress.failedPlayers.length > 0)
            {
                console.log(`❌ Failed players: ${this.progress.failedPlayers.length}`);
            }
        }
        finally
        {
            await this.cleanup();
        }
    }
    
    private async discoverPlayerPages(): Promise<string[]>
    {
        const page = await this.browser!.newPage();
        
        try
        {
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            await page.goto(`${this.config.baseUrl}/players`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Extract player links
            const playerSlugs = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/player/"]'));
                return links
                    .map(link => link.getAttribute('href'))
                    .filter((href): href is string => href !== null)
                    .map(href => href.replace('/player/', ''))
                    .filter((slug, index, array) => array.indexOf(slug) === index); // Deduplicate
            });
            
            // Apply test mode limit
            if (this.config.testMode && this.config.playerLimit)
            {
                return playerSlugs.slice(0, this.config.playerLimit);
            }
            
            return playerSlugs;
        }
        finally
        {
            await page.close();
        }
    }
    
    private async processBatch(playerSlugs: string[]): Promise<ScrapedPlayer[]>
    {
        const results: ScrapedPlayer[] = [];
        
        for (const slug of playerSlugs)
        {
            try
            {
                console.log(`  🔍 Scraping: ${slug}`);
                const player = await this.scrapeIndividualPlayer(slug);
                results.push(player);
                this.progress.scrapedPlayers++;
                
                // Small delay between individual requests
                await this.delay(500);
            }
            catch (error)
            {
                console.error(`  ❌ Failed to scrape ${slug}:`, error);
                this.progress.failedPlayers.push(slug);
            }
        }
        
        return results;
    }
    
    private async scrapeIndividualPlayer(playerSlug: string): Promise<ScrapedPlayer>
    {
        const page = await this.browser!.newPage();
        
        try
        {
            const url = `${this.config.baseUrl}/player/${playerSlug}`;
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Extract player data
            const rawPlayer = await page.evaluate(this.extractPlayerData);
            
            // Transform to canonical format
            const player = this.playerTransformer.transformPlayer(rawPlayer, playerSlug, url);
            
            return player;
        }
        finally
        {
            await page.close();
        }
    }
    
    private extractPlayerData = (): RawFIFAPlayer => {
        // Helper function to extract attribute categories
        const extractAttributes = (selector: string): Record<string, number> => {
            const attributes: Record<string, number> = {};
            document.querySelectorAll(selector).forEach(element => {
                const label = element.querySelector('.attribute-label')?.textContent?.trim();
                const value = element.querySelector('.attribute-value')?.textContent?.trim();
                if (label && value)
                {
                    const numericValue = parseInt(value);
                    if (!isNaN(numericValue))
                    {
                        attributes[label.toLowerCase().replace(/\s+/g, '')] = numericValue;
                    }
                }
            });
            return attributes;
        };
        
        // Extract basic info
        const name = document.querySelector('h1, .player-name, .player-title')?.textContent?.trim() || '';
        const overallText = document.querySelector('.overall, .rating, .overall-rating')?.textContent?.trim() || '0';
        const overall = parseInt(overallText.replace(/\D/g, '')) || 0;
        
        const position = document.querySelector('.position')?.textContent?.trim() || '';
        const nationality = document.querySelector('.nationality, .country')?.textContent?.trim() || '';
        const team = document.querySelector('.team, .club')?.textContent?.trim() || '';
        
        // Extract metadata
        const ageText = document.querySelector('.age')?.textContent?.trim();
        const age = ageText ? parseInt(ageText.replace(/\D/g, '')) : undefined;
        
        const height = document.querySelector('.height')?.textContent?.trim();
        const preferredFoot = document.querySelector('.preferred-foot, .foot')?.textContent?.trim();
        
        return {
            name,
            overall,
            position,
            nationality,
            team,
            age,
            height,
            preferredFoot,
            
            // Extract attribute categories (these selectors may need adjustment based on actual HTML)
            pace: extractAttributes('.pace-attributes .attribute-row'),
            shooting: extractAttributes('.shooting-attributes .attribute-row'),
            passing: extractAttributes('.passing-attributes .attribute-row'),
            dribbling: extractAttributes('.dribbling-attributes .attribute-row'),
            defending: extractAttributes('.defending-attributes .attribute-row'),
            physical: extractAttributes('.physical-attributes .attribute-row')
        };
    };
    
    private async saveCheckpoint(players: ScrapedPlayer[]): Promise<void>
    {
        const checkpointPath = this.config.outputPath.replace('.json', '.checkpoint.json');
        const checkpoint = {
            progress: this.progress,
            players: players.slice(-100), // Keep last 100 players
            timestamp: new Date().toISOString()
        };
        
        await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    }
    
    private async loadProgress(): Promise<void>
    {
        const checkpointPath = this.config.outputPath.replace('.json', '.checkpoint.json');
        
        try
        {
            const data = await readFile(checkpointPath, 'utf-8');
            const checkpoint = JSON.parse(data);
            this.progress = checkpoint.progress;
            console.log(`📚 Loaded checkpoint: ${this.progress.scrapedPlayers} players completed`);
        }
        catch (error)
        {
            console.log('⚠️  No checkpoint found, starting fresh');
        }
    }
    
    private async exportPlayerDatabase(players: ScrapedPlayer[]): Promise<void>
    {
        // Transform to canonical format
        const database = {
            metadata: {
                scrapedDate: new Date().toISOString(),
                totalPlayers: players.length,
                source: "FIFA Ratings v26",
                version: "1.0",
                failedPlayers: this.progress.failedPlayers
            },
            players: this.playerTransformer.createPlayerDatabase(players)
        };
        
        await writeFile(this.config.outputPath, JSON.stringify(database, null, 2), 'utf-8');
        
        console.log(`💾 Player database saved: ${this.config.outputPath}`);
        console.log(`📊 Database stats: ${players.length} players, ${Math.round(Buffer.byteLength(JSON.stringify(database)) / 1024)}KB`);
    }
    
    private async cleanup(): Promise<void>
    {
        if (this.browser)
        {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }
    
    private batchArray<T>(array: T[], size: number): T[][]
    {
        const batches: T[][] = [];
        for (let i = 0; i < array.length; i += size)
        {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }
    
    private delay(ms: number): Promise<void>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI Entry point
async function main(): Promise<void>
{
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const playerLimit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
    
    const config: ScrapingConfig = {
        baseUrl: 'https://www.fifaratings.com',
        rateLimit: 2000, // 2 seconds between batches
        batchSize: 10,   // 10 players per batch
        outputPath: path.join(process.cwd(), '..', 'apps', 'server', 'data', 'players', 'players.json'),
        testMode,
        playerLimit
    };
    
    const scraper = new FIFAPlayerScraper(config);
    
    try
    {
        await scraper.initialize();
        await scraper.scrapeAllPlayers();
    }
    catch (error)
    {
        console.error('💥 Scraping failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`)
{
    main().catch(console.error);
}

export { FIFAPlayerScraper };