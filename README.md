# Hyperliquid Trade Ledger API

A backend service for the **Hyperliquid Trade Ledger API Challenge** with RESTful API endpoints for trade history, PnL calculation, position tracking, and leaderboards.

## 🚀 Quick Start

**Test Wallets:**
```
0x0e09b56ef137f417e424f1265425e93bfff77e17
0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74
0x6c8031a9eb4415284f3f89c0420f697c87168263
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1-trades?user=&coin=&fromMs=&toMs=&builderOnly=` | Normalized trade fills |
| `GET /v1-positions-history?user=&coin=&fromMs=&toMs=&builderOnly=` | Time-ordered position states |
| `GET /v1-pnl?user=&coin=&fromMs=&toMs=&builderOnly=&maxStartCapital=` | Realized PnL with returnPct |
| `GET /v1-leaderboard?coin=&metric=&maxStartCapital=&builderOnly=` | Ranked users |
| `GET /v1-deposits?user=&fromMs=&toMs=` | Deposit tracking (bonus) |

## 🔧 Builder-Only Mode

Set `TARGET_BUILDER_TAG` env var. Tainted positions (mixed builder/non-builder trades) are flagged and excluded from builder-only leaderboards.

## 📊 PnL Calculation

Uses capped normalization: `returnPct = realizedPnl / min(max(startEquity, 100), maxStartCapital) * 100`

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Edge Functions (Deno), PostgreSQL
- **Data Source**: Hyperliquid Public API
