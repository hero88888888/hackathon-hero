# 🎬 Hyperliquid Trade Ledger API - Demo Video Script

**Target Duration:** 3-5 minutes  
**Tone:** Technical but accessible, confident  
**Focus:** Quantitative finance capabilities and risk management features

---

## 📍 INTRO (0:00 - 0:20)

**[Screen: Show the dashboard UI]**

> "Hi, I'm presenting the Hyperliquid Trade Ledger API - a production-ready quantitative trading analytics platform that demonstrates advanced skills in risk management, performance attribution, and algorithmic trading infrastructure."

**[Highlight the key stats on screen]**

> "This project showcases real-world applications of quantitative finance concepts including position lifecycle modeling, risk metrics calculation, and statistical performance normalization. Let me walk you through the five API endpoints and their quantitative significance."

---

## 📍 ENDPOINT 1: /v1-trades (0:20 - 1:00)

**[Screen: API call to /v1-trades with test wallet]**

```
GET /v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "First, the trades endpoint provides granular transaction data critical for quantitative analysis."

**[Highlight key fields in response]**

> "Each trade includes:
> - The coin, price, size, and side - fundamental inputs for position reconstruction
> - **isBuilderTrade** flag for attribution - essential for multi-venue execution analysis
> - **dir** field showing 'Open Long', 'Close Short', etc. - trade classification for order flow analysis
> - **startPosition** to track position size before the trade - enabling sequential state modeling"

**[Show coinBreakdown in response]**

> "The multi-asset aggregation provides factor-level analytics - here you can see BTC contributed $37K PnL across 824 trades, while ETH contributed $31K across 516 trades. This breakdown is crucial for understanding which instruments are driving portfolio performance."

---

## 📍 ENDPOINT 2: /v1-positions-history (1:00 - 1:50)

**[Screen: API call to /v1-positions-history]**

```
GET /v1-positions-history?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "The positions history endpoint implements state-space modeling to reconstruct complete position lifecycles from individual fills - analogous to how quant systems track strategy state evolution."

**[Highlight lifecycle object]**

> "Each lifecycle represents a complete round-trip trade, tracking:
> - Open and close times for holding period analysis
> - Max size reached - critical for understanding position sizing and risk management
> - Total realized PnL - the actual profit or loss when the position closed
> - **flips** - directional reversals that may indicate mean-reversion opportunities"

**[Point to ETH lifecycle showing flips: 3]**

> "Here's ETH with 3 flips - the trader went long, reversed to short, back to long, then short again. In quantitative terms, this suggests potential mean-reversion signals or adaptive position management."

**[Show risk fields]**

> "We also compute real-time risk metrics:
> - **liqPx** - liquidation price for stop-loss and risk limit enforcement
> - **leverage** - exposure multiplier crucial for VaR calculations
> - **marginUsed** - capital allocation tracking for portfolio optimization"

---

## 📍 ENDPOINT 3: /v1-pnl (1:50 - 2:30)

**[Screen: API call to /v1-pnl]**

```
GET /v1-pnl?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "The PnL endpoint implements a critical statistical methodology - capped normalization - to enable fair comparison across heterogeneous capital bases."

**[Highlight the formula visually]**

> "The formula: returnPct equals realizedPnl divided by effectiveCapital, where effectiveCapital is capped at a maximum threshold.
>
> This addresses a key statistical bias - without capping, a $1 million account with $10K profit shows only 1% return, while a $100 account with $10 profit shows 10% return. The cap ensures fair ranking, similar to how Sharpe ratios normalize for risk in portfolio management."

**[Point to response values]**

> "This wallet shows:
> - $69,198 realized PnL - absolute performance
> - 691% normalized return - risk-adjusted metric for leaderboard ranking
> - $14,335 in fees paid - transaction cost analysis
> - $47.8M total volume - market impact indicator"

**[Show builderOnly parameter]**

> "The `builderOnly=true` parameter enables attribution analysis - isolating performance from specific execution venues, critical for evaluating multi-broker or multi-exchange strategies."

---

## 📍 ENDPOINT 4: /v1-leaderboard (2:30 - 3:10)

**[Screen: API call to /v1-leaderboard with multiple wallets]**

```
GET /v1-leaderboard?users=0x0e09...,0xd11f...,0xa0b8...&metric=pnl
```

> "The leaderboard implements comprehensive performance analytics with configurable ranking metrics - essential for strategy evaluation and portfolio manager selection."

**[Show leaderboard response]**

> "Each entry includes quantitative performance metrics:
> - **winRate** - batting average, the percentage of profitable trades
> - **profitFactor** - risk-adjusted metric: gross gains divided by gross losses. A factor above 2.0 indicates $2 earned for every $1 risked
> - **bestTrade** and **worstTrade** - tail event analysis for understanding risk distribution
> - **coinBreakdown** - factor-level attribution showing which assets drive performance"

**[Toggle metric parameter]**

> "Switch `metric=returnPct` to rank by risk-adjusted returns instead of absolute PnL - critical for comparing strategies across different capital scales. You can also rank by winRate or profitFactor for different perspectives on performance quality."

---

## 📍 ENDPOINT 5: /v1-deposits (3:10 - 3:40)

**[Screen: API call to /v1-deposits]**

```
GET /v1-deposits?user=0x0e09b56ef137f417e424f1265425e93bfff77e17
```

> "The deposits endpoint tracks capital flows - essential for calculating true time-weighted returns versus money-weighted returns, a critical distinction in performance measurement."

**[Show response structure]**

> "It returns:
> - Total deposits and withdrawals - for net capital flow analysis
> - Net deposit amount - the total capital injected or withdrawn
> - Internal transfers between spot and perp - for understanding capital allocation
> - **flowTimeSeries** - time-bucketed capital movements enabling TWRR calculations and identifying periods of capital deployment"

> "In quantitative terms, this data separates manager skill from investor behavior - critical for evaluating strategy alpha versus simply riding deposits."

---

## 📍 BUILDER-ONLY MODE (3:40 - 4:10)

**[Screen: Show environment variable configuration]**

> "For execution venue attribution, set the `TARGET_BUILDER_TAG` environment variable to your builder address."

**[Show API call with builderOnly=true]**

```
GET /v1-pnl?user=0x...&builderOnly=true
```

> "The `builderOnly=true` parameter implements rigorous attribution logic:
> - Only trades through your builder are counted - isolating venue-specific performance
> - **tainted** flag marks positions with mixed builder/non-builder trades - ensuring attribution purity
> - Tainted positions are excluded from builder-only aggregates - preventing contamination of performance metrics"

**[Visual: Show tainted lifecycle example]**

> "This taint propagation is critical for accurate attribution analysis. If a position lifecycle contains even one non-builder trade, the entire lifecycle's PnL cannot be definitively attributed to the builder. This is similar to how quantitative funds track strategy-level attribution to ensure accurate fee calculations and performance reporting."

---

## 📍 CLOSING (4:10 - 4:30)

**[Screen: Show Docker commands]**

```bash
docker-compose up
```

> "The entire quantitative analytics platform runs in Docker with a single command - demonstrating production-ready infrastructure. All five endpoints implement robust error handling, CORS support, and efficient data processing."

**[Screen: Show GitHub repo / README]**

> "This project demonstrates the intersection of quantitative finance, algorithmic trading, and modern software engineering - key skills for quant roles. From statistical normalization to risk metrics calculation, from position lifecycle modeling to performance attribution, it showcases real-world applications of quantitative methods in trading systems. Check out the README for full documentation. Thanks for watching!"

---

## 🎯 KEY POINTS TO EMPHASIZE

1. **Quantitative Methods** - Capped normalization, profit factor, win rate, statistical fairness
2. **Risk Management** - Leverage tracking, liquidation prices, margin analysis, VaR inputs
3. **Performance Attribution** - Builder tracking, taint propagation, venue-specific analysis
4. **State-Space Modeling** - Position lifecycle reconstruction, sequential processing
5. **Production Infrastructure** - Docker deployment, TypeScript type safety, comprehensive error handling
6. **Quant Finance Skills** - Time-series analysis, portfolio analytics, risk-adjusted returns

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
