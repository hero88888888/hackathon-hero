# Hyperliquid Trade Ledger API

A production-ready backend service for the **Hyperliquid Trade Ledger API Challenge** (Encode London Hackathon). Provides RESTful API endpoints for trade history, position lifecycle tracking, PnL calculation, and competitive leaderboards with full builder-only attribution support.

## 🏆 Challenge Submission

This project implements all mandatory and bonus requirements:
- ✅ Normalized trade fills with builder attribution
- ✅ Time-ordered position lifecycle tracking
- ✅ Realized PnL with capped normalization (`returnPct`)
- ✅ Leaderboard rankings by volume, PnL, and returnPct
- ✅ Builder-only mode with tainted position filtering
- ✅ Deposit tracking (bonus feature)

## 🚀 Quick Start

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

### Example Requests

```bash
# Get trades for a wallet
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Get PnL with time range
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-pnl?user=0x0e09b56ef137f417e424f1265425e93bfff77e17&fromMs=1700000000000&toMs=1710000000000"

# Get leaderboard by returnPct
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-leaderboard?metric=returnPct&maxStartCapital=10000"

# Builder-only trades
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17&builderOnly=true"
```

## 📡 API Endpoints

### `GET /v1-trades`
Returns normalized trade fills from Hyperliquid.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | **Required.** Wallet address |
| `coin` | string | Filter by trading pair (e.g., "BTC", "ETH") |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |
| `builderOnly` | boolean | Filter to builder-attributed trades only |

**Response:**
```json
{
  "trades": [
    {
      "timeMs": 1700000000000,
      "coin": "BTC",
      "side": "B",
      "px": 42000.5,
      "sz": 0.1,
      "fee": 2.1,
      "closedPnl": 150.25,
      "builder": "0x...",
      "isBuilderTrade": true,
      "tainted": false
    }
  ],
  "count": 1
}
```

### `GET /v1-positions-history`
Returns time-ordered position lifecycle states.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | **Required.** Wallet address |
| `coin` | string | Filter by trading pair |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |
| `builderOnly` | boolean | Filter to builder-only positions |

**Response:**
```json
{
  "positions": [
    {
      "timeMs": 1700000000000,
      "coin": "BTC",
      "netSize": 0.5,
      "avgEntryPx": 42000.0,
      "unrealizedPnl": 250.0,
      "leverage": 10,
      "liqPx": 38000.0,
      "marginUsed": 2100.0,
      "tainted": false,
      "builderOnly": true
    }
  ],
  "count": 1
}
```

### `GET /v1-pnl`
Returns realized PnL with capped normalization for fair comparison.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | **Required.** Wallet address |
| `coin` | string | Filter by trading pair |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |
| `builderOnly` | boolean | Filter to builder-only activity |
| `maxStartCapital` | number | Cap for normalization (default: 100000) |

**Response:**
```json
{
  "realizedPnl": 5000.50,
  "returnPct": 25.5,
  "feesPaid": 150.25,
  "tradeCount": 42,
  "volume": 250000.0,
  "tainted": false,
  "startEquity": 20000.0,
  "effectiveCapital": 20000.0
}
```

**PnL Formula:**
```
effectiveCapital = min(max(startEquity, 100), maxStartCapital)
returnPct = (realizedPnl / effectiveCapital) * 100
```

### `GET /v1-leaderboard`
Returns ranked users by specified metric.

| Parameter | Type | Description |
|-----------|------|-------------|
| `coin` | string | Filter by trading pair (optional for portfolio-level) |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |
| `metric` | string | Ranking metric: `volume`, `pnl`, or `returnPct` |
| `maxStartCapital` | number | Cap for returnPct normalization |
| `builderOnly` | boolean | Exclude tainted accounts |

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": "0x...",
      "metricValue": 50000.0,
      "tradeCount": 150,
      "volume": 1000000.0,
      "tainted": false
    }
  ],
  "metric": "pnl",
  "count": 10
}
```

### `GET /v1-deposits` (Bonus)
Returns deposit history for filtering capital reloaders.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | **Required.** Wallet address |
| `fromMs` | number | Start timestamp (ms) |
| `toMs` | number | End timestamp (ms) |

**Response:**
```json
{
  "totalDeposits": 10000.0,
  "depositCount": 3,
  "deposits": [
    {
      "timeMs": 1700000000000,
      "amount": 5000.0,
      "txHash": "0x..."
    }
  ]
}
```

## 🔧 Builder-Only Mode

### Configuration
Set `TARGET_BUILDER_TAG` environment variable to enable builder attribution:
```
TARGET_BUILDER_TAG=0xYourBuilderAddress
```

### How It Works
1. **Trade Attribution**: Each trade is marked `isBuilderTrade: true` if it contains a builder tag matching `TARGET_BUILDER_TAG`
2. **Position Lifecycle Tracking**: A lifecycle starts when `netSize` moves from 0 to non-zero, ends when it returns to 0
3. **Tainting Rule**: If ANY non-builder trade affects a position lifecycle, that lifecycle is marked `tainted: true`
4. **Filtering**: When `builderOnly=true`:
   - Only builder-attributed trades are returned
   - Tainted accounts are excluded from leaderboards
   - PnL calculations exclude tainted activity

### Limitations
- Builder attribution relies on Hyperliquid's public API fill data
- If builder tags are not exposed in the public API, attribution may need manual configuration
- Cross-position tainting (e.g., funding affecting multiple positions) follows per-lifecycle isolation

## 📊 PnL Calculation

Follows Hyperliquid's official entry price and PnL methodology:

1. **Average Cost Entry**: Entry price is weighted average of all opening trades
2. **Closing Trades**: Trades reducing position size realize PnL against average entry
3. **Capped Normalization**: `returnPct` uses capped effective capital to prevent large accounts from having unfair advantage

```
# Example
Position: Long 1 BTC @ $40,000
Partial close: Sell 0.5 BTC @ $42,000
Realized PnL = 0.5 * ($42,000 - $40,000) = $1,000
```

## 🗄️ Database Schema

### Tables
- `trades` - Normalized trade fills with builder attribution
- `positions` - Current position states with risk fields
- `position_lifecycles` - Complete lifecycle tracking (open → close)
- `pnl_snapshots` - Aggregated PnL snapshots
- `equity_snapshots` - Historical equity for returnPct calculation
- `deposits` - Deposit tracking (bonus)

### Key Fields
- `tainted` (boolean) - Mixed builder/non-builder activity flag
- `is_builder_trade` (boolean) - Trade-level builder attribution
- `builder_only` (boolean) - Position-level builder filter
- `position_lifecycle_id` (FK) - Links trades to lifecycles

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL with Row Level Security
- **Data Source**: Hyperliquid Public Info API

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  React Frontend │────▶│  Edge Functions  │────▶│   PostgreSQL    │
│                 │     │  (v1-trades,     │     │   (trades,      │
│  - Dashboard    │     │   v1-pnl, etc.)  │     │   positions,    │
│  - Charts       │     │                  │     │   lifecycles)   │
│  - Leaderboard  │     └────────┬─────────┘     └─────────────────┘
│                 │              │
└─────────────────┘              ▼
                        ┌──────────────────┐
                        │                  │
                        │  Hyperliquid API │
                        │  (Info endpoint) │
                        │                  │
                        └──────────────────┘
```

## 📝 Assumptions & Limitations

1. **Data Source**: Uses Hyperliquid public Info API; no WebSocket streaming in current implementation
2. **Builder Tags**: If not exposed in public API, trades default to non-builder
3. **Equity Snapshots**: Starting equity derived from first snapshot in time window
4. **Multi-Coin Aggregation**: Portfolio-level queries aggregate across all coins when `coin` param omitted
5. **Rate Limits**: Respects Hyperliquid API rate limits with exponential backoff

## 🧪 Testing

Test the endpoints with the provided wallets:
```bash
# Run all endpoint tests
./scripts/test-endpoints.sh
```

## 📄 License

MIT License - See LICENSE file for details.

---

**Built for the Hyperliquid Trade Ledger API Challenge @ Encode London Hackathon**
