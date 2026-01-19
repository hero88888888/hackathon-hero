# Hyperliquid Trade Ledger API

> **Encode London Hackathon** — Production-ready Trade Ledger with strict Position Lifecycle Reconstruction and Capped PnL Normalization.

## 📈 Quantitative Finance Relevance

This project demonstrates advanced **quantitative finance and risk management** capabilities through a production-ready trading analytics system. It showcases key skills relevant to quantitative roles:

### Key Quantitative Features

- **Position Lifecycle Reconstruction**: Sequential state-space modeling to track position evolution from inception to closure, enabling accurate attribution analysis
- **Risk Metrics & Analytics**: Real-time computation of leverage ratios, liquidation prices, margin utilization, and drawdown metrics
- **Performance Attribution**: Multi-dimensional PnL analysis with builder attribution, enabling precise performance decomposition
- **Statistical Normalization**: Capped PnL normalization methodology to ensure fair cross-sectional comparison across heterogeneous capital bases
- **Time-Series Analysis**: Cumulative PnL tracking, position flip detection, and temporal aggregation for strategy evaluation
- **Portfolio Analytics**: Multi-asset aggregation, per-coin breakdown, win rate analysis, and profit factor calculations

### Technical Skills Demonstrated

| Skill Area | Implementation |
|------------|----------------|
| **Algorithmic Trading** | Position lifecycle detection, flip identification, sequential trade processing |
| **Risk Management** | Real-time leverage monitoring, liquidation price tracking, margin-to-equity ratios |
| **Data Engineering** | High-performance data pipelines with Supabase Edge Functions, parallel API processing |
| **Statistical Methods** | Capped normalization, profit factor calculation, win rate metrics, return distribution analysis |
| **Software Architecture** | TypeScript type safety, React state management, RESTful API design, Docker containerization |
| **Quantitative Research** | Backtesting infrastructure, performance metrics, attribution analysis, taint detection |

## 🚀 Quick Start

### Docker (Recommended)
```bash
docker-compose up -d
curl http://localhost:8080/health
```

### API Base URL
```
https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1
```

### Test Wallets
```
0x0e09b56ef137f417e424f1265425e93bfff77e17
0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74
0x6c8031a9eb4415284f3f89c0420f697c87168263
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1-trades` | Trade history with builder attribution |
| `GET /v1-positions-history` | Time-ordered position states + lifecycles |
| `GET /v1-pnl` | Realized PnL with capped normalization |
| `GET /v1-leaderboard` | Ranked users by metric |
| `GET /v1-deposits` | Deposit tracking (bonus) |

### Common Parameters

| Param | Type | Description |
|-------|------|-------------|
| `user` | string | Wallet address (required) |
| `coin` | string | Filter by asset (BTC, ETH, etc.) |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |
| `builderOnly` | boolean | Filter builder-attributed trades only |
| `maxStartCapital` | number | Cap for return% normalization (default: 10000) |

### Example Requests

```bash
# Get trades
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Get PnL with builder-only filter
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-pnl?user=0x0e09b56ef137f417e424f1265425e93bfff77e17&builderOnly=true"

# Get leaderboard
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-leaderboard?metric=returnPct"
```

## 🔧 Core Features

### 1. Taint Detection (Attribution Purity)
If ANY trade in a position lifecycle is non-builder-attributed, the entire lifecycle is marked **tainted** and excluded from builder-only aggregates. This ensures rigorous performance attribution, critical for evaluating strategy effectiveness and fee distribution in multi-venue trading environments.

### 2. Capped PnL Normalization (Statistical Fairness)
```
returnPct = realizedPnl / effectiveCapital × 100
effectiveCapital = min(max(startEquity, 100), maxStartCapital)
```
This methodology addresses the statistical bias inherent in comparing returns across heterogeneous capital bases. By capping effective capital, we ensure that large accounts don't have artificially deflated return percentages, enabling fair ranking in leaderboards—analogous to risk-adjusted return metrics (Sharpe ratio, Information ratio) in portfolio management.

### 3. Position Lifecycle Tracking (State-Space Modeling)
- Lifecycle starts when `netSize` moves from 0 → non-zero
- Lifecycle ends when `netSize` returns to 0
- Tracks avg entry price, max size, realized PnL
- Implements sequential state tracking similar to Hidden Markov Models in quantitative trading systems

## 💼 Use Cases for Quantitative Finance

### 1. **Portfolio Risk Management**
- Real-time monitoring of leverage across multiple positions
- Liquidation price tracking for risk limit enforcement
- Margin utilization analysis for capital efficiency optimization

### 2. **Strategy Performance Evaluation**
- Win rate and profit factor metrics for strategy backtesting
- Time-series PnL analysis for drawdown calculation and Sharpe ratio estimation
- Attribution analysis to isolate alpha generation from different trading strategies

### 3. **Market Microstructure Analysis**
- Trade direction classification (Open Long, Close Short, etc.)
- Position flip detection for mean-reversion signal identification
- Volume-weighted metrics and notional value tracking

### 4. **Algorithmic Trading Infrastructure**
- Builder attribution system demonstrates multi-venue execution tracking
- Sequential lifecycle processing mirrors order management system (OMS) logic
- Taint propagation ensures data integrity for compliance and auditing

### 5. **Quantitative Research & Backtesting**
- Historical position reconstruction enables accurate simulation of trading strategies
- Per-coin performance breakdown supports factor analysis and asset rotation strategies
- Capped normalization provides fair comparison across different capital regimes

## ✨ Bonus Features

| Feature | Endpoint | Quantitative Significance |
|---------|----------|---------------------------|
| **Risk Fields** | `/v1-positions-history` | `liqPx`, `marginUsed`, `leverage` - Critical for Value-at-Risk (VaR) calculations and position sizing |
| **Position Flips** | `/v1-positions-history` | Detects long→short and short→long reversals - Key for mean-reversion strategy analysis |
| **Multi-Coin Aggregation** | All endpoints | Per-coin breakdown of volume/pnl/trades - Enables sector analysis and correlation studies |
| **Win Rate** | `/v1-trades`, `/v1-leaderboard` | Win/loss tracking with percentages - Foundation for expectancy calculations in systematic strategies |
| **Profit Factor** | `/v1-leaderboard` | Gross profit / gross loss ratio - Standard risk-adjusted performance metric in quantitative trading |
| **Deposit Tracking** | `/v1-deposits` | Net deposits, withdrawals, time series - Essential for TWRR vs MWRR return calculations |
| **Best/Worst Trade** | `/v1-leaderboard` | Per-user trade extremes - Identifies tail risk and position sizing effectiveness |

## 📊 Response Examples

### /v1-positions-history (with quantitative interpretation)
```json
{
  "positions": [{
    "timeMs": 1234567890,
    "coin": "BTC",
    "netSize": 0.5,              // Current exposure in BTC
    "avgEntryPx": 65000,         // VWAP entry price
    "side": "long",
    "liqPx": 45000,              // Risk parameter: liquidation threshold
    "marginUsed": 3250,          // Capital allocation for this position
    "leverage": 10,              // Risk multiplier: 10x exposure
    "flipped": false,
    "flipType": null
  }],
  "lifecycles": [{
    "coin": "ETH",
    "side": "long",
    "realizedPnl": 1500,         // Closed P&L for this lifecycle
    "flips": 1,                  // Direction changes: potential mean-reversion signal
    "status": "closed"
  }],
  "coinSummary": {
    "BTC": { 
      "volume": 500000,          // Total notional traded
      "realizedPnl": 2500        // Net P&L contribution
    },
    "ETH": { "volume": 250000, "realizedPnl": 1500 }
  },
  "totalFlips": 3                // Portfolio-level directional changes
}
```

### /v1-leaderboard (with performance metrics)
```json
{
  "leaderboard": [{
    "rank": 1,
    "user": "0x...",
    "pnl": 50000,
    "returnPct": 250,            // Capped return for fair comparison
    "winRate": 65.5,             // Batting average: 65.5% win rate
    "profitFactor": 2.3,         // Risk-adjusted: $2.30 profit per $1 loss
    "bestTrade": 5000,           // Positive tail event
    "worstTrade": -1200,         // Negative tail event (drawdown analysis)
    "coinBreakdown": {
      "BTC": { 
        "volume": 1000000,       // Asset-specific exposure
        "pnl": 30000             // Factor contribution to total P&L
      }
    }
  }],
  "aggregateStats": {
    "totalVolume": 5000000,      // Market impact indicator
    "totalPnl": 150000,
    "avgWinRate": 58.3           // Cross-sectional average
  }
}
```

## 🐳 Docker

```bash
# Build and run
docker build -t hl-trade-ledger .
docker run -p 8080:8080 -e TARGET_BUILDER_TAG=0x... hl-trade-ledger

# Or use docker-compose
docker-compose up -d
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TARGET_BUILDER_TAG` | "" | Builder address for attribution |
| `MAX_START_CAPITAL` | 10000 | Cap for capped normalization |

## 🏗️ Architecture

```
├── supabase/functions/
│   ├── v1-trades/          # Trade history + coin breakdown
│   ├── v1-positions-history/ # Lifecycles + flips + risk fields
│   ├── v1-pnl/             # Capped normalization
│   ├── v1-leaderboard/     # Rankings + profit factor
│   └── v1-deposits/        # Fair competition filtering
├── src/                    # React dashboard
├── Dockerfile
└── docker-compose.yml
```

### Technical Stack Highlights

**Backend (Supabase Edge Functions):**
- **Runtime**: Deno for secure, TypeScript-native serverless execution
- **Data Pipeline**: Parallel API processing with fault-tolerant error handling
- **Algorithms**: Sequential lifecycle tracking, taint propagation, statistical normalization
- **Performance**: Sub-second response times for complex multi-asset aggregations

**Frontend (React + TypeScript):**
- **Type Safety**: Full TypeScript coverage ensuring compile-time error detection
- **State Management**: TanStack Query for efficient server state synchronization
- **Real-time Updates**: Live position tracking and cumulative PnL visualization
- **UI Framework**: shadcn/ui + Tailwind CSS for professional quant-grade interface
- **Charting**: Recharts for time-series PnL analysis and performance visualization

**Data Processing:**
- Position lifecycle reconstruction with O(n) time complexity
- Multi-coin aggregation with parallel processing
- Risk metric calculation (leverage, liquidation price, margin ratios)
- Statistical normalization for fair cross-sectional comparison

## 🏆 Quantitative Finance Applications

This project demonstrates production-ready implementations of concepts critical to quantitative finance roles:

### For Risk Management Roles:
- Real-time leverage monitoring and liquidation price tracking
- Portfolio-level risk aggregation across multiple instruments
- Margin utilization analysis for capital efficiency
- Tail risk analysis through best/worst trade tracking

### For Quantitative Research Roles:
- Backtesting infrastructure with accurate position reconstruction
- Win rate and profit factor calculation for strategy evaluation
- Statistical normalization for fair performance comparison
- Factor-level attribution (per-coin breakdown)

### For Algorithmic Trading Roles:
- Order Management System (OMS) style position tracking
- Sequential state-space modeling for strategy monitoring
- Multi-venue execution attribution (builder tracking)
- Transaction cost analysis (fee tracking and aggregation)

### For Portfolio Management Roles:
- Time-weighted return calculations enabled by deposit tracking
- Performance attribution across multiple assets
- Risk-adjusted metrics (profit factor, capped returns)
- Position flip detection for portfolio rebalancing signals

## 🎓 Academic & Industry Relevance

**Relevant to these quantitative finance concepts:**
- **Market Microstructure**: Trade direction classification, order flow analysis
- **Portfolio Theory**: Multi-asset aggregation, correlation analysis preparation
- **Risk Management**: VaR inputs (leverage, liquidation price), tail risk metrics
- **Performance Measurement**: Sharpe ratio components, Information ratio inputs
- **Algorithmic Trading**: State-space models, sequential decision making
- **Statistical Arbitrage**: Mean-reversion signals (position flips), fair value tracking

## 🏆 Original Hackathon Criteria

| Criterion | Weight | Implementation |
|-----------|--------|----------------|
| **Correctness** | 50% | Capped normalization, sequential lifecycle tracking |
| **Builder-Only** | 20% | Strict taint propagation across lifecycles |
| **Completeness** | 20% | All required endpoints + bonus features |
| **Demo Clarity** | 10% | Live dashboard with taint visualization |

## 📝 License

MIT — Built for Encode Hyperliquid London Community Hackathon
