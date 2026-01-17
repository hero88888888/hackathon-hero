# 🎯 QUICK REFERENCE - Hyperliquid Trade Ledger API

## 📊 Your Current Status

```
┌─────────────────────────────────────────┐
│  CURRENT SCORE: 20/100                  │
│  STATUS: NOT SUBMISSION READY ⚠️        │
│  TIME TO FIX: 3-4 days                  │
└─────────────────────────────────────────┘
```

---

## 🚨 Top 5 Critical Issues

1. ❌ **NO BACKEND API SERVICE** (-35 pts) - Must build Express server with REST endpoints
2. ❌ **NO DOCKER** (-15 pts) - Must containerize with docker-compose
3. ❌ **ALL 4 ENDPOINTS MISSING** (-20 pts) - /v1/trades, /positions/history, /pnl, /leaderboard
4. ❌ **NO DATA ABSTRACTION** (-5 pts) - Direct API calls, not extensible
5. ❌ **INCOMPLETE DOCS & DEMO** (-20 pts) - Cannot document/demo what doesn't exist

---

## ✅ What You DO Have (Good News!)

- React frontend with beautiful UI
- Builder filtering logic (needs to move to backend)
- Position lifecycle tracking (needs to move to backend)
- PnL calculations (needs to move to backend)
- Taint detection (needs to move to backend)

**Translation:** You understand the domain, just packaged wrong. Need to rebuild as backend API.

---

## 🎯 Required API Endpoints (Copy-Paste Ready)

### 1. GET /v1/trades
```bash
curl "http://localhost:3001/v1/trades?user=0x123...&coin=BTC&fromMs=1234567890&toMs=1234567999&builderOnly=false"
```
Response: Array of trades with timeMs, coin, side, px, sz, fee, closedPnl, builder

### 2. GET /v1/positions/history
```bash
curl "http://localhost:3001/v1/positions/history?user=0x123...&coin=BTC&fromMs=1234567890&toMs=1234567999&builderOnly=false"
```
Response: Array of position states with timeMs, netSize, avgEntryPx, tainted

### 3. GET /v1/pnl
```bash
curl "http://localhost:3001/v1/pnl?user=0x123...&coin=BTC&fromMs=1234567890&toMs=1234567999&builderOnly=false&maxStartCapital=1000"
```
Response: realizedPnl, returnPct, feesPaid, tradeCount, tainted

### 4. GET /v1/leaderboard
```bash
curl "http://localhost:3001/v1/leaderboard?coin=BTC&fromMs=1234567890&toMs=1234567999&metric=pnl&builderOnly=true&maxStartCapital=1000"
```
Response: Array of ranked users with rank, user, metricValue, tradeCount, tainted

### 5. GET /v1/deposits (BONUS)
```bash
curl "http://localhost:3001/v1/deposits?user=0x123...&fromMs=1234567890&toMs=1234567999"
```
Response: totalDeposits, depositCount, deposits[]

---

## 🐳 Docker Quick Setup

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### docker-compose.yml
```yaml
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
```

### One Command to Run
```bash
docker-compose up
```

---

## 📁 Backend Folder Structure

```
/backend
  /src
    /routes
      - trades.ts           ← GET /v1/trades
      - positions.ts        ← GET /v1/positions/history
      - pnl.ts              ← GET /v1/pnl
      - leaderboard.ts      ← GET /v1/leaderboard
      - deposits.ts         ← GET /v1/deposits (bonus)
    /services
      - dataSourceFactory.ts       ← Creates data source based on env
      - hyperliquidDataSource.ts   ← Public API implementation
    /models
      - interfaces.ts              ← TypeScript interfaces
    /middleware
      - errorHandler.ts            ← Error handling
      - validator.ts               ← Input validation
    /utils
      - calculations.ts            ← PnL, returnPct calculations
      - taintDetection.ts          ← Builder-only taint logic
    - server.ts                    ← Express app entry point
  - package.json
  - tsconfig.json
```

---

## 🔧 Environment Variables

Create `.env.example`:
```bash
# Server
PORT=3001
NODE_ENV=production

# Data Source
DATA_SOURCE=hyperliquid

# Builder Config
TARGET_BUILDER=0x...

# Leaderboard
MAX_START_CAPITAL=1000

# Logging
LOG_LEVEL=info
```

---

## ⚡ Implementation Priority

### Day 1 Morning (4 hours) - Core Setup
```
✓ Create backend folder structure
✓ Set up Express server with TypeScript
✓ Create IDataSource interface
✓ Implement HyperliquidPublicDataSource
✓ Add health check endpoint: GET /health
```

### Day 1 Afternoon (4 hours) - First 2 Endpoints
```
✓ Implement GET /v1/trades
✓ Implement GET /v1/pnl
✓ Test both endpoints with curl
✓ Add input validation
```

### Day 2 Morning (4 hours) - Last 2 Required Endpoints
```
✓ Implement GET /v1/positions/history
✓ Implement GET /v1/leaderboard
✓ Test all 4 endpoints
✓ Fix any bugs
```

### Day 2 Afternoon (4 hours) - Docker & Docs
```
✓ Create Dockerfile
✓ Create docker-compose.yml
✓ Test docker-compose up
✓ Write README.md
✓ Document all endpoints
```

### Day 3 Morning (3 hours) - Polish & Testing
```
✓ Test all endpoints with test wallets
✓ Test builder-only mode
✓ Test taint detection
✓ Test time filtering
✓ Add error handling
```

### Day 3 Afternoon (2 hours) - Demo Video
```
✓ Record docker-compose up
✓ Show curl requests to each endpoint
✓ Show builder-only filtering
✓ Show leaderboard working
✓ Upload video
```

### Day 4 (Optional) - Bonus Features
```
✓ Implement GET /v1/deposits
✓ Add risk fields (liqPx, marginUsed)
✓ Add comprehensive tests
✓ Add Swagger docs
✓ Polish error messages
```

---

## 🧪 Test Wallet Addresses

```
0x0e09b56ef137f417e424f1265425e93bfff77e17
0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74
0x6c8031a9eb4415284f3f89c0420f697c87168263
```

---

## 📝 README Template (Quick Start Section)

```markdown
# Hyperliquid Trade Ledger API

## Quick Start

### Prerequisites
- Docker and Docker Compose

### Running (ONE COMMAND)
```bash
docker-compose up
```

The API will be available at http://localhost:3001

### Test It
```bash
curl "http://localhost:3001/v1/trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"
```

### Environment Variables
See `.env.example` for all configuration options.

### API Documentation
- GET /v1/trades - Trade history
- GET /v1/positions/history - Position timeline
- GET /v1/pnl - PnL metrics
- GET /v1/leaderboard - User rankings

Full API docs below...
```
---

## 🎬 Demo Video Checklist

Record these in order (3-5 minutes total):

1. ✓ Show terminal with `docker-compose up` command
2. ✓ Wait for "Server running on port 3001" message
3. ✓ Show curl request to /v1/trades
4. ✓ Show curl request to /v1/positions/history
5. ✓ Show curl request to /v1/pnl
6. ✓ Show curl request to /v1/leaderboard
7. ✓ Show same endpoint with builderOnly=true vs false (different results)
8. ✓ Show tainted=true in response when mixed trades
9. ✓ Explain key features: data abstraction, builder filtering, taint detection
10. ✓ Show README.md with documentation

---

## 💡 Key Concepts to Implement

### Builder Attribution
```typescript
// A trade is builder-attributed if builderFee > 0
const isBuilderTrade = parseFloat(fill.builderFee || "0") > 0;
```

### Taint Detection
```typescript
// Position is tainted if builderOnly mode AND has mixed trades
const hasBuilderTrades = trades.some(t => t.isBuilderTrade);
const hasNonBuilderTrades = trades.some(t => !t.isBuilderTrade);
const tainted = builderOnly && hasBuilderTrades && hasNonBuilderTrades;
```

### Capped Normalization for returnPct
```typescript
// Fair comparison - prevents large accounts from dominating
const effectiveCapital = Math.min(accountValue, maxStartCapital || 1000);
const returnPct = (realizedPnl / effectiveCapital) * 100;
```

### Time Filtering
```typescript
// Filter trades by time range
const filtered = trades.filter(t => {
  if (fromMs && t.timeMs < fromMs) return false;
  if (toMs && t.timeMs > toMs) return false;
  return true;
});
```

### Position Lifecycle
```typescript
// Position starts when netSize moves from 0 → non-zero
// Position ends when netSize returns to ~0
if (Math.abs(netSize) < 0.0001) {
  // Position closed, create lifecycle entry
}
```

---

## 🚫 Common Mistakes to Avoid

1. ❌ Forgetting to implement backend (you only have frontend)
2. ❌ Skipping Docker (mandatory requirement)
3. ❌ Not implementing all 4 endpoints
4. ❌ Forgetting time filtering on endpoints
5. ❌ Wrong returnPct calculation (must use capped normalization)
6. ❌ No builder attribution tracking
7. ❌ No taint detection
8. ❌ Poor error handling (return proper HTTP status codes)
9. ❌ No input validation
10. ❌ Inadequate documentation

---

## 📊 Score Improvement Path

```
Current:   20/100 ████░░░░░░░░░░░░░░░░
+ Backend: 55/100 ███████████░░░░░░░░░
+ Docker:  70/100 ██████████████░░░░░░
+ Docs:    80/100 ████████████████░░░░
+ Demo:    90/100 ██████████████████░░
+ Bonus:  100/100 ████████████████████
```

---

## 🎯 Pre-Submission Checklist (Print This!)

**Backend:**
- [ ] Express server running on port 3001
- [ ] GET /v1/trades works
- [ ] GET /v1/positions/history works
- [ ] GET /v1/pnl works
- [ ] GET /v1/leaderboard works
- [ ] All endpoints accept query parameters
- [ ] Time filtering (fromMs, toMs) works
- [ ] Builder-only filtering works
- [ ] Taint detection works
- [ ] Error handling returns proper status codes
- [ ] Input validation implemented

**Docker:**
- [ ] Dockerfile exists
- [ ] docker-compose.yml exists
- [ ] `docker-compose up` starts everything
- [ ] API accessible at localhost:3001
- [ ] Health check endpoint works

**Documentation:**
- [ ] README.md has Quick Start section
- [ ] One-command run documented
- [ ] All endpoints documented with examples
- [ ] Environment variables documented
- [ ] Builder-only mode explained
- [ ] Limitations clearly stated
- [ ] .env.example file exists

**Testing:**
- [ ] All test wallet addresses work
- [ ] Builder-only returns different results
- [ ] Tainted flag appears correctly
- [ ] Leaderboard ranks correctly
- [ ] Time filtering filters correctly
- [ ] Error cases return graceful responses

**Demo:**
- [ ] Video recorded
- [ ] Shows docker-compose up
- [ ] Shows all endpoints working
- [ ] Shows builder-only mode
- [ ] Shows taint detection
- [ ] Clear and professional
- [ ] Under 5 minutes

**If all boxes checked: YOU'RE READY TO SUBMIT! 🏆**

---

## 📞 Need More Details?

1. **Quick Overview:** Read `GAP_ANALYSIS_SUMMARY.md`
2. **Full Implementation Guide:** Read `LOVABLE_PROMPT.md`
3. **This Cheat Sheet:** Keep for reference while coding

---

## 🚀 Start NOW!

```bash
# Step 1: Create backend folder
mkdir -p backend/src/{routes,services,models,middleware,utils}

# Step 2: Initialize backend
cd backend
npm init -y
npm install express cors dotenv

# Step 3: Start coding!
# Copy sections from LOVABLE_PROMPT.md into Lovable
```

**You got this! 💪 Focus, follow the plan, and you'll be submission-ready in 3 days!**
