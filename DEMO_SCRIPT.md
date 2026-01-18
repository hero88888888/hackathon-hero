# 🎬 Hyperliquid Trade Ledger API - Demo Video Script

**Target Duration:** 3-5 minutes  
**Tone:** Technical but accessible, confident

---

## 📍 INTRO (0:00 - 0:20)

**[Screen: Show the dashboard UI]**

> "Hi, I'm presenting the Hyperliquid Trade Ledger API - a complete trading analytics backend that tracks PnL, positions, and leaderboard rankings with full builder attribution support."

**[Highlight the key stats on screen]**

> "Let me walk you through the five API endpoints and the bonus features we've built."

---

## 📍 ENDPOINT 1: /v1-trades (0:20 - 1:00)

**[Screen: API call to /v1-trades with test wallet]**

```
GET /v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "First, the trades endpoint. It returns the complete trade history with builder attribution."

**[Highlight key fields in response]**

> "Each trade includes:
> - The coin, price, size, and side
> - **isBuilderTrade** flag for attribution
> - **dir** field showing 'Open Long', 'Close Short', etc.
> - **startPosition** to track position size before the trade"

**[Show coinBreakdown in response]**

> "We also aggregate by coin - here you can see BTC has 824 trades with $37K PnL, ETH has 516 trades with $31K PnL."

---

## 📍 ENDPOINT 2: /v1-positions-history (1:00 - 1:50)

**[Screen: API call to /v1-positions-history]**

```
GET /v1-positions-history?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "The positions history endpoint reconstructs position lifecycles from individual fills."

**[Highlight lifecycle object]**

> "Each lifecycle tracks:
> - Open and close times
> - Max size reached
> - Total realized PnL
> - **flips** - the number of times position direction changed"

**[Point to ETH lifecycle showing flips: 3]**

> "Here's ETH with 3 flips - meaning the trader went long, flipped short, back to long, and short again. This is a **bonus feature** for tracking complex position management."

**[Show risk fields]**

> "We also include **bonus risk fields**:
> - **liqPx** - liquidation price
> - **leverage** - current leverage
> - **marginUsed** - margin allocated"

---

## 📍 ENDPOINT 3: /v1-pnl (1:50 - 2:30)

**[Screen: API call to /v1-pnl]**

```
GET /v1-pnl?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "The PnL endpoint calculates normalized returns using the competition formula."

**[Highlight the formula visually]**

> "returnPct equals realizedPnl divided by the minimum of starting equity or max cap - defaulting to $10,000."

**[Point to response values]**

> "This wallet shows:
> - $69,198 realized PnL
> - 691% normalized return
> - $14,335 in fees paid
> - $47.8M total volume"

**[Show builderOnly parameter]**

> "Add `builderOnly=true` to filter only trades through your builder address."

---

## 📍 ENDPOINT 4: /v1-leaderboard (2:30 - 3:10)

**[Screen: API call to /v1-leaderboard with multiple wallets]**

```
GET /v1-leaderboard?users=0x0e09...,0xd11f...,0xa0b8...&metric=pnl
```

> "The leaderboard ranks multiple wallets by configurable metrics - PnL, return percentage, or volume."

**[Show leaderboard response]**

> "Each entry includes **bonus stats**:
> - **winRate** - percentage of profitable trades
> - **profitFactor** - ratio of gains to losses  
> - **bestTrade** and **worstTrade**
> - **coinBreakdown** showing per-asset performance"

**[Toggle metric parameter]**

> "Switch `metric=returnPct` to rank by percentage returns instead of absolute PnL."

---

## 📍 ENDPOINT 5: /v1-deposits (3:10 - 3:40)

**[Screen: API call to /v1-deposits]**

```
GET /v1-deposits?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "Finally, the deposits endpoint tracks fund flows."

**[Show response structure]**

> "It returns:
> - Total deposits and withdrawals
> - Net deposit amount
> - Internal transfers between spot and perp
> - **flowTimeSeries** - a time-bucketed view of capital movement"

---

## 📍 BUILDER-ONLY MODE (3:40 - 4:10)

**[Screen: Show environment variable configuration]**

> "For builder attribution, set the `TARGET_BUILDER_TAG` environment variable to your builder address."

**[Show API call with builderOnly=true]**

```
GET /v1-pnl?user=0x...&builderOnly=true
```

> "When `builderOnly=true`:
> - Only trades through your builder are counted
> - **tainted** flag marks positions with mixed builder/non-builder trades
> - Tainted positions are excluded from builder-only aggregates"

**[Visual: Show tainted lifecycle example]**

> "This ensures accurate attribution - if a position ever had a non-builder trade, the entire lifecycle is marked tainted."

---

## 📍 CLOSING (4:10 - 4:30)

**[Screen: Show Docker commands]**

```bash
docker-compose up
```

> "The entire API runs in Docker with a single command. All five endpoints are production-ready with proper error handling and CORS support."

**[Screen: Show GitHub repo / README]**

> "Check out the README for full documentation. Thanks for watching!"

---

## 🎯 KEY POINTS TO EMPHASIZE

1. **Correctness** - All required fields present, PnL formula matches spec
2. **Builder Attribution** - Sequential taint tracking, proper filtering
3. **Bonus Features** - Position flips, risk fields, multi-coin aggregation, win rate
4. **Production Ready** - Docker deployment, comprehensive error handling

## 📝 RECORDING TIPS

- Use a clean terminal with large font (16pt+)
- Have all API calls pre-typed, just hit enter
- Pause briefly on key response fields
- Keep energy up but speak clearly
- Test all endpoints work before recording!

## 🔗 TEST COMMANDS

```bash
# Trades
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Positions
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-positions-history?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# PnL
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-pnl?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Leaderboard
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-leaderboard?users=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Deposits
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-deposits?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"
```
