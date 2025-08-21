# FIFA Ratings Data Scraping Plan

> **Document Version**: 1.0
> **Date**: 21 August 2025
> **Target Source**: https://www.fifaratings.com/players
> **Purpose**: Populate master players.json database with real player data

## 1. Data Source Analysis

### 1.1 Website Structure
- **Player Listing**: https://www.fifaratings.com/players (Top 100+ players)
- **Individual Pages**: https://www.fifaratings.com/player/{player-slug}
- **Data Format**: HTML with structured player information
- **Pagination**: Limited to top players (expandable dataset)

### 1.2 Available Data Points
**From Player Listing:**
- Player Name
- Overall Rating (OVA)
- Position
- Nationality
- Current Team
- Player Image URL

**From Individual Player Pages:**
- Detailed attribute breakdown (6 categories, 24+ specific ratings)
- Enhanced metadata (age, height, weight, preferred foot)
- Historical ratings data
- Market value information

## 2. Attribute Mapping Strategy

### 2.1 FIFA → Canonical PlayerAttributes Mapping

```typescript
interface FIFAAttributes {
  // Pace Category
  acceleration: number;        // → PlayerAttributes.acceleration
  sprintSpeed: number;         // → PlayerAttributes.pace

  // Shooting Category
  positioning: number;         // → PlayerAttributes.positioning
  finishing: number;           // → PlayerAttributes.finishing
  shotPower: number;          // → PlayerAttributes.longShots
  longShots: number;          // → PlayerAttributes.longShots
  volleys: number;            // → PlayerAttributes.shooting (composite)
  penalties: number;          // → PlayerAttributes.penalties

  // Passing Category
  vision: number;             // → PlayerAttributes.vision
  crossing: number;           // → PlayerAttributes.crossing
  freeKickAccuracy: number;   // → PlayerAttributes.freeKicks
  shortPassing: number;       // → PlayerAttributes.passing
  longPassing: number;        // → PlayerAttributes.passing (weighted avg)
  curve: number;              // → PlayerAttributes.passing (modifier)

  // Dribbling Category
  agility: number;            // → PlayerAttributes.agility
  reactions: number;          // → PlayerAttributes.anticipation
  balance: number;            // → PlayerAttributes.balance
  dribbling: number;          // → PlayerAttributes.dribbling
  ballControl: number;        // → PlayerAttributes.dribbling (composite)
  composure: number;          // → PlayerAttributes.composure

  // Defensive Category
  interceptions: number;      // → PlayerAttributes.interceptions
  headingAccuracy: number;    // → PlayerAttributes.heading
  defensiveAwareness: number; // → PlayerAttributes.marking
  standingTackle: number;     // → PlayerAttributes.tackling
  slidingTackle: number;      // → PlayerAttributes.tackling (weighted)

  // Physical Category
  jumping: number;            // → PlayerAttributes.jumping
  stamina: number;            // → PlayerAttributes.stamina
  strength: number;           // → PlayerAttributes.strength
  aggression: number;         // → PlayerAttributes.leadership (partial)
}
```

### 2.2 Derived Attributes
```typescript
// Attributes we need to calculate from FIFA data
const derivedAttributes = {
  // Mental attributes (composite calculations)
  decisions: (positioning + vision + composure) / 3,
  concentration: (reactions + composure + defensiveAwareness) / 3,
  workRate: (stamina + aggression + defensiveAwareness) / 3,
  teamwork: (shortPassing + vision + positioning) / 3,

  // Missing attributes (position-based estimation)
  leadership: calculateLeadership(overall, experience, captaincy),

  // Goalkeeping (separate scrape for GK-specific pages)
  goalkeeping: scrapeGoalkeeperStats(playerSlug) // If position === 'GK'
};
```

## 3. Scraping Implementation Strategy

### 3.1 Technical Approach
**Language**: Node.js with TypeScript
**Libraries**:
- `puppeteer` - Browser automation for dynamic content
- `cheerio` - HTML parsing for static content
- `axios` - HTTP requests with rate limiting
- `fs/promises` - File system operations

### 3.2 Implementation Architecture
```typescript
// Core scraping infrastructure
interface ScrapingConfig {
  baseUrl: string;
  rateLimit: number;           // ms between requests
  batchSize: number;           // players per batch
  outputPath: string;          // players.json location
  resumeFromId?: string;       // crash recovery
}

class FIFAPlayerScraper {
  private config: ScrapingConfig;
  private playerDatabase: PlayerDatabase;
  private progressTracker: ScrapingProgress;

  async scrapeAllPlayers(): Promise<void> {
    // 1. Get player list from main page
    const playerLinks = await this.discoverPlayerPages();

    // 2. Process in batches with rate limiting
    for (const batch of this.batchArray(playerLinks, this.config.batchSize)) {
      await this.processBatch(batch);
      await this.delay(this.config.rateLimit);
    }

    // 3. Generate final players.json
    await this.exportPlayerDatabase();
  }

  private async scrapeIndividualPlayer(playerSlug: string): Promise<ScrapedPlayer> {
    const url = `${this.config.baseUrl}/player/${playerSlug}`;

    // Use puppeteer for dynamic content
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Extract structured data
    const playerData = await page.evaluate(this.extractPlayerData);

    await page.close();
    return this.transformToCanonicalFormat(playerData);
  }
}
```

### 3.3 Data Extraction Functions
```typescript
// Browser-side extraction (runs in puppeteer context)
function extractPlayerData(): RawFIFAPlayer {
  return {
    name: document.querySelector('.player-name')?.textContent?.trim(),
    overall: parseInt(document.querySelector('.overall-rating')?.textContent),
    position: document.querySelector('.position')?.textContent,
    nationality: document.querySelector('.nationality')?.textContent,
    team: document.querySelector('.team-name')?.textContent,

    // Attribute categories
    pace: extractAttributeCategory('pace'),
    shooting: extractAttributeCategory('shooting'),
    passing: extractAttributeCategory('passing'),
    dribbling: extractAttributeCategory('dribbling'),
    defending: extractAttributeCategory('defending'),
    physical: extractAttributeCategory('physical'),

    // Metadata
    age: parseInt(document.querySelector('.age')?.textContent),
    height: document.querySelector('.height')?.textContent,
    preferredFoot: document.querySelector('.preferred-foot')?.textContent
  };
}

function extractAttributeCategory(category: string): Record<string, number> {
  const categoryElement = document.querySelector(`[data-category="${category}"]`);
  const attributes: Record<string, number> = {};

  categoryElement?.querySelectorAll('.attribute-row').forEach(row => {
    const name = row.querySelector('.attribute-name')?.textContent?.trim();
    const value = parseInt(row.querySelector('.attribute-value')?.textContent);
    if (name && value) attributes[name] = value;
  });

  return attributes;
}
```

## 4. Rate Limiting & Ethics

### 4.1 Respectful Scraping Guidelines
```typescript
const SCRAPING_CONFIG = {
  // Conservative rate limiting
  REQUEST_DELAY: 2000,         // 2 seconds between requests
  BATCH_SIZE: 50,              // Process 50 players per batch
  CONCURRENT_LIMIT: 1,         // Single concurrent request

  // Error handling
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,

  // Progress persistence
  CHECKPOINT_INTERVAL: 100,    // Save progress every 100 players
  RESUME_SUPPORT: true,

  // Headers
  USER_AGENT: 'Football-Manager-Game/1.0 (Educational Project)',
  RESPECT_ROBOTS_TXT: true
};
```

### 4.2 Legal Considerations
- Check robots.txt compliance
- Review terms of service
- Consider fair use for educational/game development
- Implement caching to avoid repeat requests
- Add attribution in game credits

## 5. Implementation Timeline

### 5.1 Phase 1: Core Infrastructure (Week 1)
```bash
# Setup scraping environment
cd apps/server
pnpm add puppeteer cheerio axios
pnpm add -D @types/puppeteer

# Create scraping utilities
mkdir -p src/data-scraping
touch src/data-scraping/fifa-scraper.ts
touch src/data-scraping/attribute-mapper.ts
touch src/data-scraping/player-transformer.ts
```

### 5.2 Phase 2: Data Collection (Week 2)
- Implement player discovery and individual scraping
- Build attribute mapping functions
- Add progress tracking and crash recovery
- Test with small player subset (~50 players)

### 5.3 Phase 3: Data Processing (Week 3)
- Transform to canonical PlayerAttributes format
- Generate master players.json (target: 2000+ players)
- Create team definition files with player references
- Validate data integrity and completeness

### 5.4 Phase 4: Integration (Week 4)
- Integrate with existing player database architecture
- Update team selection system to use real player data
- Add fallback system for missing players
- Performance testing with full dataset

## 6. Expected Output Structure

### 6.1 Master Players Database
```typescript
// apps/server/data/players/players.json (~2-3MB)
interface PlayerDatabase {
  metadata: {
    scrapedDate: string;
    totalPlayers: number;
    source: "FIFA Ratings v26";
    version: "1.0";
  };
  players: Record<string, CanonicalPlayer>;
}

interface CanonicalPlayer {
  id: string;                    // Generated UUID
  name: string;                  // "Lionel Messi"
  nationality: string;           // "ARG"
  position: PlayerPosition;      // "RW" | "CF"
  age: number;                   // 37
  overall: number;               // 8.8 (scaled to 0-10)
  attributes: PlayerAttributes;   // Mapped from FIFA data

  // FIFA-specific metadata
  fifa: {
    originalOverall: number;     // 88 (FIFA scale)
    team: string;               // "Inter Miami"
    height: string;             // "170 cm"
    preferredFoot: string;      // "Left"
    scrapedFrom: string;        // Player page URL
  };
}
```

### 6.2 Team Integration
```typescript
// apps/server/data/teams/argentina.json
interface TeamDefinition {
  name: "Argentina";
  confederation: "CONMEBOL";
  playerIds: [
    "messi-lionel-uuid",
    "martinez-emiliano-uuid",
    // ... 21 more player UUIDs
  ];
  formation: "4-3-3";
  tactics: UberFormationReference;
}
```

## 7. Quality Assurance

### 7.1 Data Validation
```typescript
interface ValidationRules {
  // Required fields
  requiredFields: ['name', 'nationality', 'position', 'overall'];

  // Value ranges (FIFA uses 1-99, we normalize to 0-10)
  attributeRanges: {
    overall: [0, 10];
    individualAttributes: [0, 10];
  };

  // Data consistency
  positionValidation: validatePlayerPosition;
  nationalityValidation: validateISO3Country;
  nameFormatting: normalizePlayerNames;
}
```

### 7.2 Success Metrics
- **Coverage**: 2000+ players across major leagues
- **Accuracy**: 95%+ successful attribute mapping
- **Completeness**: All required PlayerAttributes fields populated
- **Performance**: Full database loads in <500ms
- **Integration**: Seamless team selection with real player data

## 8. Risk Mitigation

### 8.1 Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Rate Limiting/IP Blocking** | High | Conservative delays, rotating user agents, proxy rotation |
| **HTML Structure Changes** | Medium | Robust selectors, fallback extraction methods |
| **Incomplete Player Data** | Medium | Default value system, position-based estimation |
| **Performance Impact** | Low | Lazy loading, efficient indexing, caching |

### 8.2 Legal/Ethical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Terms of Service Violation** | High | Review ToS, seek permission, fair use justification |
| **Copyright Issues** | Medium | Data transformation, no direct reproduction |
| **Server Load Impact** | Low | Respectful rate limiting, off-peak scraping |

## 9. Post-Scraping Maintenance

### 9.1 Data Updates
- **Quarterly Updates**: New FIFA releases, roster changes
- **Transfer Updates**: Mid-season player movements
- **Rating Updates**: Performance-based adjustments

### 9.2 Automated Pipeline
```bash
# Scheduled data refresh
cron: "0 2 * * 0"  # Weekly Sunday 2 AM
script: pnpm run scrape:fifa:update
```

This comprehensive plan provides a structured approach to ethically scraping FIFA Ratings data while ensuring compatibility with our canonical player database architecture and maintaining respect for the source website's resources.