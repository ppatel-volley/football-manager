# Football Manager - Data Scraping Tools

This directory contains tools for scraping and processing player data from FIFA Ratings to populate the Football Manager game database.

## Overview

These tools scrape real player data from https://www.fifaratings.com/players and transform it into the canonical player database format used by the game. The scraped data includes player names, ratings, positions, nationalities, and detailed attributes.

## Installation

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Chrome/Chromium browser (for Puppeteer)

### Setup
```bash
cd tools
pnpm install
```

This will install all required dependencies including:
- `puppeteer` - Browser automation for scraping
- `cheerio` - HTML parsing
- `axios` - HTTP requests
- `uuid` - ID generation
- `tsx` - TypeScript execution

## Usage

### Test Scraping (Recommended First)
Scrape a small sample of 10 players to test the setup:
```bash
pnpm scrape:fifa:test
```

This will:
- Scrape 10 players from FIFA Ratings
- Save results to `../apps/server/data/players/players.json`
- Display progress and any errors
- Take approximately 30-60 seconds

### Full Database Scraping  
Scrape the complete player database (2000+ players):
```bash
pnpm scrape:fifa
```

This will:
- Scrape all available players from FIFA Ratings
- Process in batches with 2-second delays (respectful rate limiting)
- Save progress checkpoints every 100 players
- Generate complete database (~2-3MB JSON file)
- Take approximately 60-90 minutes

### Data Validation
Validate the scraped database for errors and completeness:
```bash
pnpm validate:data
```

This will:
- Check for missing or invalid player data
- Validate attribute ranges (0-10 scale)
- Generate statistics report
- List any errors or warnings
- Exit with error code if validation fails

### Custom Scraping Options
```bash
# Scrape specific number of players
pnpm scrape:fifa -- --test --limit=50

# Resume from checkpoint (after interruption)
pnpm scrape:fifa -- --resume-from=last-checkpoint
```

## Output Structure

### Player Database
The scraping generates `../apps/server/data/players/players.json` with this structure:

```json
{
  "metadata": {
    "scrapedDate": "2025-08-21T15:30:00.000Z",
    "totalPlayers": 2157,
    "source": "FIFA Ratings v26",
    "version": "1.0",
    "failedPlayers": []
  },
  "players": {
    "messi-lionel-arg-a1b2c3": {
      "id": "messi-lionel-arg-a1b2c3",
      "name": "Lionel Messi", 
      "nationality": "ARG",
      "position": "RW",
      "age": 37,
      "overall": 8.8,
      "squadNumber": 10,
      "attributes": {
        "passing": 8.7,
        "shooting": 8.5,
        "dribbling": 9.3,
        // ... all canonical attributes
      },
      "fifa": {
        "originalOverall": 88,
        "team": "Inter Miami",
        "height": "170 cm",
        "preferredFoot": "Left",
        "scrapedFrom": "https://www.fifaratings.com/player/lionel-messi"
      }
    }
    // ... 2000+ more players
  }
}
```

### Checkpoint Files
Progress is automatically saved to `players.checkpoint.json` during scraping for crash recovery.

## Architecture

### Core Components

**`fifa-scraper/index.ts`** - Main scraper
- Browser automation with Puppeteer
- Rate-limited batch processing  
- Progress tracking and checkpoints
- Error handling and recovery

**`fifa-scraper/attribute-mapper.ts`** - Attribute transformation
- Maps FIFA ratings (1-99) to canonical scale (0-10)
- Handles 24+ specific attributes across 6 categories
- Position-based defaults for missing data
- Goalkeeping attribute specialization

**`fifa-scraper/player-transformer.ts`** - Data processing
- Validates and normalizes player data
- Generates consistent player IDs
- Handles duplicate detection
- Creates team definition files

**`validator/index.ts`** - Quality assurance
- Comprehensive data validation
- Statistical analysis and reporting
- Error detection and categorization
- Performance metrics

### Data Flow
```
FIFA Ratings Website
        ↓
    Puppeteer Scraping
        ↓
    Raw Player Data
        ↓
    Attribute Mapping
        ↓
    Data Transformation  
        ↓
    Validation & QA
        ↓
    Game Database
```

## Configuration

### Scraping Settings
Edit `fifa-scraper/index.ts` to modify:
- `rateLimit`: Delay between requests (default: 2000ms)
- `batchSize`: Players per batch (default: 10)
- `playerLimit`: Max players for testing (default: unlimited)

### Attribute Mapping
Edit `fifa-scraper/attribute-mapper.ts` to modify:
- FIFA → canonical attribute mappings
- Position-based defaults
- Rating scale transformations

## Troubleshooting

### Common Issues

**Browser/Puppeteer Errors:**
```bash
# Install Chrome dependencies on Linux
sudo apt-get install chromium-browser

# Set executable path if needed
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm scrape:fifa
```

**Rate Limiting:**
- Increase delays in scraping config
- Check FIFA Ratings terms of service
- Use VPN if IP blocked temporarily

**Data Validation Failures:**
```bash
# Check specific errors
pnpm validate:data | grep "ERROR"

# Regenerate with position defaults
rm ../apps/server/data/players/players.json
pnpm scrape:fifa:test
```

### Recovery from Interruption
If scraping is interrupted:
1. Check for `players.checkpoint.json` 
2. Resume with existing checkpoint:
   ```bash
   pnpm scrape:fifa -- --resume-from=checkpoint
   ```
3. Or restart fresh:
   ```bash
   rm ../apps/server/data/players/players.*
   pnpm scrape:fifa
   ```

## Legal & Ethical Considerations

### Responsible Scraping
- 2-second delays between requests (respectful rate limiting)
- Single concurrent request maximum
- User-Agent identifies as educational project
- No reproduction of copyrighted content (data transformation only)

### Terms of Service
- Review https://www.fifaratings.com/robots.txt before scraping
- Respect website terms of service
- Consider seeking permission for large-scale scraping
- Use data for educational/game development only

### Data Attribution
Generated database includes:
- Source attribution to FIFA Ratings
- Original URLs for each player
- Transformation acknowledgment in game credits

## Performance Metrics

### Expected Performance
- **Test scraping (10 players)**: 30-60 seconds
- **Full scraping (2000+ players)**: 60-90 minutes  
- **Database size**: 2-3MB JSON file
- **Memory usage**: ~200MB during scraping
- **Validation**: 5-10 seconds for full database

### Success Rates
- **Data completeness**: 95%+ players with all required fields
- **Attribute accuracy**: 90%+ successful FIFA → canonical mapping
- **Position validation**: 98%+ valid position assignments
- **Nationality mapping**: 95%+ successful country code assignment

## Integration with Game

The scraped database integrates with the Football Manager game:

1. **Player Loading**: `apps/server/data/players/players.json` loaded at startup
2. **Team Selection**: Players referenced by ID in team definitions
3. **Attribute Mapping**: Direct compatibility with game mechanics
4. **Formation System**: Players positioned using canonical attributes

### Using Scraped Data
```typescript
// Server: Load player database
const playerDB = await loadPlayerDatabase();
const messi = playerDB.players['messi-lionel-arg-a1b2c3'];

// Client: Display player in team selection
<PlayerCard 
  name={messi.name}
  overall={messi.overall}
  position={messi.position}
  nationality={messi.nationality}
/>
```

## Support

For issues or questions:
1. Check this README and troubleshooting section
2. Review console output for specific error messages
3. Test with small sample before full scraping
4. Validate data after successful scraping

## License

This tooling is part of the Football Manager project. Use responsibly and in compliance with source website terms of service.