# Hyperliquid Trade Ledger API

> **Encode London Hackathon** — Production-ready Trade Ledger with strict Position Lifecycle Reconstruction and Capped PnL Normalization.

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
| `GET /v1-positions-history` | Time-ordered position states |
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

## 🔧 Key Features

### 1. Taint Detection
If ANY trade in a position lifecycle is non-builder-attributed, the entire lifecycle is marked **tainted** and excluded from builder-only aggregates.

### 2. Capped PnL Normalization
```
returnPct = realizedPnl / effectiveCapital × 100
effectiveCapital = min(max(startEquity, 100), maxStartCapital)
```

### 3. Position Lifecycle Tracking
- Lifecycle starts when `netSize` moves from 0 → non-zero
- Lifecycle ends when `netSize` returns to 0
- Tracks avg entry price, max size, realized PnL

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
│   ├── v1-trades/          # Trade history endpoint
│   ├── v1-positions-history/ # Position state tracking
│   ├── v1-pnl/             # PnL with capped normalization
│   ├── v1-leaderboard/     # Competitive rankings
│   └── v1-deposits/        # Deposit tracking (bonus)
├── src/                    # React dashboard
├── Dockerfile
└── docker-compose.yml
```

## 📝 License

MIT — Built for Encode Hyperliquid London Community Hackathon
