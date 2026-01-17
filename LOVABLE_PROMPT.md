# Hyperliquid Trade Ledger API - Complete Implementation Guide for Lovable

## 🎯 CRITICAL GAPS TO ADDRESS

Your current implementation is a **React frontend only**. The hackathon requires a **dockerized backend API service**. You need to build an entirely new backend to meet the requirements.

---

## 📋 COMPREHENSIVE REQUIREMENTS CHECKLIST

### **PHASE 1: Backend API Service (MOST CRITICAL - 70% of score)**

#### 1.1 Create Node.js/Express Backend Service
```
Create a new backend service with:
- Express.js server (or Fastify for better performance)
- TypeScript for type safety
- Port configuration via environment variable (default: 3001)
- CORS enabled for frontend communication
- Error handling middleware
- Request logging
- Rate limiting for API protection
```

#### 1.2 Implement Data Source Abstraction Layer
```
Create a datasource abstraction so it can be swapped from public Hyperliquid API to Insilico-HL/HyperServe later:

1. Create interface: IDataSource with methods:
   - getUserFills(user, fromMs?, toMs?, coin?)
   - getClearinghouseState(user)
   - getUserDeposits(user, fromMs?, toMs?)

2. Implement: HyperliquidPublicDataSource
   - Uses current public API endpoints
   - Implements all IDataSource methods
   - Add proper error handling and retries

3. Create DataSourceFactory
   - Returns appropriate datasource based on env variable
   - Easy to extend for Insilico-HL later

Environment variable: DATA_SOURCE=hyperliquid (default)
```

#### 1.3 Implement Required REST API Endpoints

**Endpoint 1: GET /v1/trades**
```typescript
Query Parameters:
- user: string (required) - wallet address
- coin: string (optional) - filter by coin symbol
- fromMs: number (optional) - start timestamp in milliseconds
- toMs: number (optional) - end timestamp in milliseconds  
- builderOnly: boolean (optional, default: false)

Response Format:
{
  trades: [
    {
      timeMs: number,
      coin: string,
      side: "B" | "A", // Buy or Ask (sell)
      px: string,      // price
      sz: string,      // size
      fee: string,
      closedPnl: string,
      builder: string (optional) // builder address if available
    }
  ],
  count: number
}

Implementation Notes:
- Fetch fills from datasource
- Apply time filtering (fromMs, toMs)
- Apply coin filtering if specified
- Apply builder filtering if builderOnly=true
- Builder attribution: check if fill has builderFee > 0
- Sort by timeMs descending (most recent first)
```

**Endpoint 2: GET /v1/positions/history**
```typescript
Query Parameters:
- user: string (required)
- coin: string (optional)
- fromMs: number (optional)
- toMs: number (optional)
- builderOnly: boolean (optional, default: false)

Response Format:
{
  positions: [
    {
      timeMs: number,        // timestamp of position snapshot
      coin: string,
      netSize: string,       // current position size (+ for long, - for short)
      avgEntryPx: string,    // average entry price
      tainted: boolean       // only when builderOnly=true
    }
  ]
}

Implementation Notes:
- Build position history timeline from trades
- Track netSize changes over time
- Calculate avgEntryPx using average cost method
- Detect taint: if builderOnly=true AND position has non-builder trades, set tainted=true
- Filter by time range and coin
```

**Endpoint 3: GET /v1/pnl**
```typescript
Query Parameters:
- user: string (required)
- coin: string (optional)
- fromMs: number (optional)
- toMs: number (optional)
- builderOnly: boolean (optional, default: false)
- maxStartCapital: number (optional) - for capped normalization

Response Format:
{
  realizedPnl: number,    // sum of closedPnl from fills
  returnPct: number,      // relative return using capped normalization
  feesPaid: number,
  tradeCount: number,
  tainted: boolean        // when builderOnly=true
}

Implementation Notes:
- Sum closedPnl from all trades in range
- Sum fees from all trades
- Calculate returnPct with capped normalization:
  * If maxStartCapital provided: effectiveCapital = min(equityAtFromMs, maxStartCapital)
  * If not provided: effectiveCapital = equityAtFromMs
  * returnPct = (realizedPnl / effectiveCapital) * 100
- Taint detection: if builderOnly mode and mixed builder/non-builder trades exist
```

**Endpoint 4: GET /v1/leaderboard**
```typescript
Query Parameters:
- coin: string (optional)
- fromMs: number (optional)
- toMs: number (optional)
- metric: "volume" | "pnl" | "returnPct" (required)
- builderOnly: boolean (optional, default: false)
- maxStartCapital: number (optional, default: 1000)

Response Format:
{
  leaderboard: [
    {
      rank: number,
      user: string,          // wallet address
      metricValue: number,   // value of the selected metric
      tradeCount: number,
      tainted: boolean       // when builderOnly=true
    }
  ]
}

Metrics:
- volume: total notional traded (sum of px * sz)
- pnl: absolute realized PnL
- returnPct: relative return with capped normalization

Implementation Notes:
- Store/cache data for multiple users (you'll need a test wallet list)
- Calculate metric for each user
- Sort by metric descending
- Exclude tainted entries from leaderboard when builderOnly=true
- Add rank numbers (1, 2, 3...)
```

**Endpoint 5: GET /v1/deposits (BONUS - adds 10%)**
```typescript
Query Parameters:
- user: string (required)
- fromMs: number (optional)
- toMs: number (optional)

Response Format:
{
  totalDeposits: number,
  depositCount: number,
  deposits: [
    {
      timeMs: number,
      amount: string,
      txHash: string
    }
  ]
}

Implementation Notes:
- Track USDC deposits to user address
- Filter by time range
- Important for competition fairness (can filter users who reloaded capital)
```

---

### **PHASE 2: Docker Containerization (MANDATORY - 15% of score)**

#### 2.1 Create Dockerfile for Backend
```dockerfile
# Create: Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY dist ./dist

# Expose API port
EXPOSE 3001

# Start server
CMD ["node", "dist/server.js"]
```

#### 2.2 Create Docker Compose
```yaml
# Create: docker-compose.yml

version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATA_SOURCE=hyperliquid
      - TARGET_BUILDER=${TARGET_BUILDER:-}
      - MAX_START_CAPITAL=1000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - api
    environment:
      - VITE_API_URL=http://api:3001
```

#### 2.3 Add Health Check Endpoint
```typescript
GET /health

Response:
{
  status: "ok",
  timestamp: number,
  dataSource: string
}
```

---

### **PHASE 3: Enhanced Features (BONUS - adds 15%)**

#### 3.1 Builder Attribution Enhancement
```
- Implement proper builder attribution tracking
- Document how builder info is obtained from public API
- Current limitation: builderFee > 0 indicates builder trade
- Document: "Builder attribution is derived from builderFee field in fills"
```

#### 3.2 Risk Fields on Position Endpoints
```
Add to position history response:
- liqPx: liquidation price
- marginUsed: margin allocated to position

These fields available from clearinghouse state
```

#### 3.3 Partial Closes and Flips
```
Handle correctly:
- Partial position closes (size reduction)
- Position flips (long → short or vice versa)
- Track in position lifecycle properly
```

#### 3.4 Multi-Coin Portfolio Aggregation
```
Add endpoint: GET /v1/portfolio/pnl

Aggregates PnL across all coins for a user
Query params: user, fromMs, toMs, builderOnly
```

---

### **PHASE 4: Documentation (CRITICAL - 10% of score)**

#### 4.1 Update README.md
```markdown
# Hyperliquid Trade Ledger API

Dockerized service providing detailed trade history, position timelines, and PnL calculations for Hyperliquid users.

## Features
- ✅ Complete trade history with builder attribution
- ✅ Reconstructed position timelines
- ✅ Cumulative PnL with capped normalization
- ✅ Builder-only filtering with taint detection
- ✅ Leaderboard rankings
- ✅ Time-range filtering
- ✅ Data source abstraction

## Quick Start

### Prerequisites
- Docker and Docker Compose
- (Optional) Node.js 20+ for local development

### Running with Docker (ONE COMMAND)
\`\`\`bash
docker-compose up
\`\`\`

The API will be available at http://localhost:3001

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | API server port | 3001 | No |
| DATA_SOURCE | Data source type | hyperliquid | No |
| TARGET_BUILDER | Builder address for filtering | - | No |
| MAX_START_CAPITAL | Default capital cap for leaderboard | 1000 | No |
| NODE_ENV | Environment | production | No |

### API Endpoints

#### GET /v1/trades
Returns normalized trade fills.

**Query Parameters:**
- `user` (required): Wallet address
- `coin` (optional): Filter by coin symbol
- `fromMs` (optional): Start timestamp
- `toMs` (optional): End timestamp
- `builderOnly` (optional): Filter builder trades only

**Example:**
\`\`\`bash
curl "http://localhost:3001/v1/trades?user=0x123...&coin=BTC&builderOnly=false"
\`\`\`

#### GET /v1/positions/history
Returns time-ordered position states.

**Query Parameters:**
- `user` (required): Wallet address
- `coin` (optional): Filter by coin symbol
- `fromMs` (optional): Start timestamp
- `toMs` (optional): End timestamp
- `builderOnly` (optional): Filter builder positions

#### GET /v1/pnl
Returns PnL metrics with capped normalization.

**Query Parameters:**
- `user` (required): Wallet address
- `coin` (optional): Filter by coin symbol
- `fromMs` (optional): Start timestamp
- `toMs` (optional): End timestamp
- `builderOnly` (optional): Filter builder trades
- `maxStartCapital` (optional): Capital cap for returnPct

#### GET /v1/leaderboard
Returns ranked user list by metric.

**Query Parameters:**
- `coin` (optional): Filter by coin
- `fromMs` (optional): Start timestamp
- `toMs` (optional): End timestamp
- `metric` (required): "volume", "pnl", or "returnPct"
- `builderOnly` (optional): Builder-only mode
- `maxStartCapital` (optional): Capital cap (default: 1000)

#### GET /v1/deposits (Bonus)
Returns deposit history for user.

### Builder-Only Mode

**How Builder Attribution Works:**
- Builder trades are identified by the presence of `builderFee > 0` in the fill data
- When `builderOnly=true`, only trades with builder attribution are returned
- Currently sourced from public Hyperliquid API's `builderFee` field

**Taint Detection:**
A position is marked as "tainted" when:
1. `builderOnly=true` is specified
2. The position lifecycle contains both builder and non-builder trades

Tainted positions are excluded from leaderboard aggregates in builder-only mode.

**Limitations:**
- Builder attribution depends on public API data availability
- If the API doesn't expose builder info for certain fills, those trades cannot be attributed
- Best-effort implementation with clear documentation of limitations

### Data Source Abstraction

The service uses an abstraction layer for data ingestion:
- **Current:** Hyperliquid public Info/WS API
- **Future:** Can be swapped to Insilico-HL / HyperServe with minimal code changes

The abstraction is implemented via the `IDataSource` interface:
\`\`\`typescript
interface IDataSource {
  getUserFills(user: string, fromMs?: number, toMs?: number, coin?: string): Promise<Fill[]>;
  getClearinghouseState(user: string): Promise<ClearinghouseState>;
  getUserDeposits(user: string, fromMs?: number, toMs?: number): Promise<Deposit[]>;
}
\`\`\`

To switch data sources, set the `DATA_SOURCE` environment variable.

### Testing

Test wallet addresses:
- 0x0e09b56ef137f417e424f1265425e93bfff77e17
- 0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74
- 0x6c8031a9eb4415284f3f89c0420f697c87168263

### Architecture

\`\`\`
┌─────────────────┐
│  React Frontend │
│   (Port 80)     │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│  Express API    │
│  (Port 3001)    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │DataSource│
    │Abstraction│
    └────┬─────┘
         │
    ┌────▼─────────────┐
    │  Hyperliquid API │
    │  (Public)        │
    └──────────────────┘
\`\`\`

### Assumptions & Limitations

1. **Builder Attribution:** Based on `builderFee` field from public API
2. **Position Reconstruction:** Uses average cost method for entry prices
3. **Time Filtering:** All timestamps are in milliseconds (Unix epoch)
4. **Leaderboard:** Requires pre-configured list of wallet addresses to rank
5. **Rate Limiting:** Public API has rate limits; service implements caching
6. **WebSocket:** Not implemented in v1; uses polling for real-time updates

### Development

\`\`\`bash
# Install dependencies
npm install

# Run backend in dev mode
npm run dev:backend

# Run frontend in dev mode  
npm run dev:frontend

# Build for production
npm run build

# Run tests
npm test
\`\`\`

### Deployment

1. Build and start with Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

2. Check logs:
\`\`\`bash
docker-compose logs -f
\`\`\`

3. Stop services:
\`\`\`bash
docker-compose down
\`\`\`

## Demo Video

[Link to demo video showing all endpoints working]

## License

MIT
\`\`\`

#### 4.2 Add .env.example
```bash
# Create: .env.example

# Server Configuration
PORT=3001
NODE_ENV=production

# Data Source
DATA_SOURCE=hyperliquid

# Builder Configuration (optional)
TARGET_BUILDER=0x...

# Leaderboard Configuration
MAX_START_CAPITAL=1000

# Logging
LOG_LEVEL=info
```

---

### **PHASE 5: Testing & Validation**

#### 5.1 Create Test Suite
```
Add tests for:
- Each API endpoint with various query params
- Data source abstraction layer
- Builder filtering logic
- Taint detection
- Time range filtering
- PnL calculations with capped normalization
- Leaderboard ranking
```

#### 5.2 Manual Testing Checklist
```
Test each endpoint with:
- Valid inputs
- Missing required params (should return 400)
- Invalid user address (should return 404 or empty)
- Time range filtering
- Builder-only mode on/off
- Coin filtering
```

---

## 🎬 DEMO VIDEO REQUIREMENTS

Create a video showing:
1. Starting service with one command: `docker-compose up`
2. Making API calls to each endpoint using curl or Postman
3. Showing responses with proper data
4. Demonstrating builder-only filtering
5. Showing taint detection working
6. Displaying leaderboard ranked by different metrics
7. Environment variable configuration

---

## 🏆 WINNING STRATEGY

To maximize your score (goal: win the hackathon):

### Must-Have (90% of score):
1. ✅ All 4 required API endpoints working correctly
2. ✅ Docker containerization with one-command startup
3. ✅ Proper builder-only filtering with taint detection
4. ✅ Comprehensive README documentation
5. ✅ Data source abstraction implemented
6. ✅ Time-range filtering working
7. ✅ Capped normalization for returnPct
8. ✅ Clear demo video

### Bonus Features (10% extra):
1. ✅ Deposits endpoint implemented
2. ✅ Risk fields (liqPx, marginUsed)
3. ✅ Multi-coin portfolio aggregation
4. ✅ Excellent code organization
5. ✅ Comprehensive error handling
6. ✅ API rate limiting
7. ✅ Proper logging

### Polish (makes you stand out):
1. ✅ TypeScript throughout
2. ✅ API documentation (Swagger/OpenAPI)
3. ✅ Docker health checks
4. ✅ Graceful error responses
5. ✅ Request validation
6. ✅ Performance optimization (caching)
7. ✅ Clean, maintainable code
8. ✅ Professional demo video

---

## 🚀 IMPLEMENTATION ORDER

### Day 1: Core Backend (8 hours)
1. Set up Express backend with TypeScript
2. Create data source abstraction layer
3. Implement HyperliquidPublicDataSource
4. Build /v1/trades endpoint
5. Build /v1/pnl endpoint

### Day 2: Advanced Features (8 hours)
1. Build /v1/positions/history endpoint
2. Build /v1/leaderboard endpoint
3. Implement builder-only filtering
4. Add taint detection logic
5. Add time-range filtering

### Day 3: Docker & Documentation (6 hours)
1. Create Dockerfile and docker-compose.yml
2. Test Docker deployment
3. Write comprehensive README
4. Add .env.example and configuration docs
5. Document builder-only limitations

### Day 4: Testing & Demo (4 hours)
1. Test all endpoints thoroughly
2. Fix any bugs found
3. Create demo video
4. Final polish and submission

---

## ⚠️ CRITICAL PITFALLS TO AVOID

1. **Don't forget the backend!** - You currently only have a frontend
2. **Docker is mandatory** - Must work with one command
3. **Builder attribution** - Document how you get it and limitations
4. **Taint detection** - Must work correctly for builder-only mode
5. **Leaderboard needs multiple users** - Need test wallet data
6. **Time filtering** - fromMs/toMs must work on all endpoints
7. **Capped normalization** - returnPct calculation is specific
8. **Data abstraction** - Must be easy to swap data sources
9. **Documentation** - Poor docs = low score even with working code
10. **Demo video** - Required for judging, show everything working

---

## 🎯 FINAL CHECKLIST BEFORE SUBMISSION

Backend:
- [ ] Express/Fastify server running
- [ ] All 4 required endpoints implemented
- [ ] Bonus deposits endpoint (optional)
- [ ] Data source abstraction working
- [ ] Builder filtering working
- [ ] Taint detection working
- [ ] Time range filtering working
- [ ] Error handling throughout
- [ ] Input validation

Docker:
- [ ] Dockerfile created
- [ ] docker-compose.yml created
- [ ] One-command startup works
- [ ] Health check endpoint
- [ ] Environment variables documented

Documentation:
- [ ] README with all sections complete
- [ ] How to run (single command)
- [ ] Environment variables documented
- [ ] API endpoints documented with examples
- [ ] Builder-only mode explained
- [ ] Limitations clearly stated
- [ ] .env.example file

Testing:
- [ ] All endpoints tested manually
- [ ] Builder-only mode tested
- [ ] Taint detection verified
- [ ] Time filtering verified
- [ ] Leaderboard ranking correct
- [ ] Error cases handled

Demo:
- [ ] Video recorded
- [ ] Shows docker-compose up
- [ ] Shows all endpoints working
- [ ] Shows builder-only filtering
- [ ] Clear and professional
- [ ] Under 5 minutes

---

## 💡 LOVABLE-SPECIFIC INSTRUCTIONS

When implementing this in Lovable:

1. **Create Backend Directory Structure:**
```
/backend
  /src
    /routes
      - trades.ts
      - positions.ts
      - pnl.ts
      - leaderboard.ts
      - deposits.ts (bonus)
    /services
      - dataSourceFactory.ts
      - hyperliquidDataSource.ts
    /models
      - interfaces.ts
    /middleware
      - errorHandler.ts
      - validator.ts
    /utils
      - calculations.ts
      - taintDetection.ts
    - server.ts
  - package.json
  - tsconfig.json
```

2. **Update Frontend:**
- Change API calls to use backend endpoints instead of direct Hyperliquid API
- Update environment variables to point to backend
- Keep existing UI components

3. **Add Docker Files:**
- Dockerfile (root)
- Dockerfile.frontend (root)
- docker-compose.yml (root)
- .dockerignore (root)

4. **Update Package Scripts:**
```json
{
  "scripts": {
    "dev:frontend": "vite",
    "dev:backend": "tsx watch backend/src/server.ts",
    "build:frontend": "vite build",
    "build:backend": "tsc -p backend/tsconfig.json",
    "build": "npm run build:backend && npm run build:frontend",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down"
  }
}
```

---

## 🎓 SUMMARY

**You are missing 80% of the requirements!** You have a beautiful frontend but no backend API service. To win this hackathon, you must:

1. Build a complete REST API backend with all 4 required endpoints
2. Dockerize everything for one-command deployment
3. Implement proper builder-only filtering with taint detection
4. Create comprehensive documentation
5. Record a demo video showing it all working

Focus on **correctness first** (50% of score), then **completeness** (20%), then **builder-only handling** (20%), and finally **demo quality** (10%).

Good luck! 🚀
