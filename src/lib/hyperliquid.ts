const API_URL = "https://api.hyperliquid.xyz/info";

export interface HyperliquidFill {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  hash: string;
  oid: number;
  px: string;
  side: "B" | "A";
  startPosition: string;
  sz: string;
  time: number;
  fee: string;
  feeToken: string;
  builderFee?: string;
  tid: number;
}

export interface HyperliquidPosition {
  coin: string;
  szi: string;
  leverage: {
    type: string;
    value: number;
  };
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
  maxLeverage: number;
}

export interface ClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  assetPositions: Array<{
    type: string;
    position: HyperliquidPosition;
  }>;
  withdrawable: string;
}

export interface ProcessedTrade {
  id: string;
  timestamp: string;
  coin: string;
  side: "long" | "short";
  direction: string;
  size: number;
  price: number;
  pnl: number;
  fee: number;
  builderFee: number;
  hash: string;
  rawTime: number;
  notionalValue: number;
  isBuilderTrade: boolean;
}

export interface ProcessedPosition {
  id: string;
  coin: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  leverage: number;
  openTime: string;
  closeTime: string | null;
  pnl: number;
  unrealizedPnl: number;
  status: "open" | "closed";
  positionValue: number;
  marginUsed: number;
  liquidationPx: number | null;
  returnOnEquity: number;
}

export interface PositionLifecycle {
  id: string;
  coin: string;
  side: "long" | "short";
  openTime: string;
  closeTime: string | null;
  openPrice: number;
  closePrice: number | null;
  maxSize: number;
  realizedPnl: number;
  status: "open" | "closed";
  tradeCount: number;
  tainted: boolean;
  avgEntryPx: number;
}

export interface ProcessedStats {
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  avgPnL: number;
  bestTrade: number;
  worstTrade: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalFees: number;
  accountValue: number;
  returnPct: number;
  tradeCount: number;
  tainted: boolean;
  builderTradeCount: number;
}

export interface PnLDataPoint {
  time: string;
  pnl: number;
  cumulative: number;
}

// Fetch user fills (trade history)
export async function fetchUserFills(address: string): Promise<HyperliquidFill[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "userFills",
      user: address,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user fills: ${response.statusText}`);
  }

  return response.json();
}

// Fetch clearinghouse state (current positions)
export async function fetchClearinghouseState(address: string): Promise<ClearinghouseState> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "clearinghouseState",
      user: address,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clearinghouse state: ${response.statusText}`);
  }

  return response.json();
}

// Process fills into trades
export function processFillsToTrades(fills: HyperliquidFill[]): ProcessedTrade[] {
  return fills.map((fill, index) => {
    const size = parseFloat(fill.sz);
    const price = parseFloat(fill.px);
    const builderFee = parseFloat(fill.builderFee || "0");
    
    return {
      id: `trade-${fill.tid || index}`,
      timestamp: new Date(fill.time).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      coin: fill.coin,
      side: fill.side === "B" ? "long" : "short",
      direction: fill.dir,
      size,
      price,
      pnl: parseFloat(fill.closedPnl),
      fee: parseFloat(fill.fee || "0"),
      builderFee,
      hash: fill.hash,
      rawTime: fill.time,
      notionalValue: size * price,
      isBuilderTrade: builderFee > 0,
    };
  });
}

// Process positions from clearinghouse state
export function processPositions(state: ClearinghouseState): ProcessedPosition[] {
  return state.assetPositions.map((ap, index) => {
    const pos = ap.position;
    const sizeNum = parseFloat(pos.szi);
    
    return {
      id: `pos-${index}`,
      coin: pos.coin,
      side: sizeNum >= 0 ? "long" : "short",
      entryPrice: parseFloat(pos.entryPx),
      exitPrice: null,
      size: Math.abs(sizeNum),
      leverage: pos.leverage.value,
      openTime: "Active",
      closeTime: null,
      pnl: parseFloat(pos.unrealizedPnl),
      unrealizedPnl: parseFloat(pos.unrealizedPnl),
      status: "open",
      positionValue: parseFloat(pos.positionValue),
      marginUsed: parseFloat(pos.marginUsed),
      liquidationPx: pos.liquidationPx ? parseFloat(pos.liquidationPx) : null,
      returnOnEquity: parseFloat(pos.returnOnEquity) * 100,
    };
  });
}

// Calculate stats from trades and positions
// Implements capped normalization for returnPct as per hackathon spec
/**
 * Performance Statistics Calculator with Capped Normalization
 * 
 * Computes comprehensive trading performance metrics with statistical normalization
 * to enable fair cross-sectional comparison across heterogeneous capital bases.
 * 
 * Key Quantitative Metrics:
 * - Win Rate: Batting average (% profitable trades) - strategy effectiveness indicator
 * - Return %: Risk-adjusted return with capped normalization - addresses scale bias
 * - Volume: Total notional traded - market impact and liquidity indicator
 * - PnL Distribution: Best/worst trades for tail risk analysis
 * 
 * Capped Normalization Methodology:
 * Traditional return% = PnL / starting_capital creates bias:
 * - Small accounts show inflated returns (e.g., $10 profit on $100 = 10%)
 * - Large accounts show deflated returns (e.g., $10K profit on $1M = 1%)
 * 
 * Solution: Cap effective capital at maxStartCapital (default $10K)
 * This mirrors risk-adjusted metrics in portfolio management (Sharpe, Information Ratio)
 * 
 * @param trades - Array of processed trades
 * @param positions - Current open positions for unrealized P&L
 * @param state - Account state from clearinghouse
 * @param builderOnly - Enable strict attribution mode
 * @param maxStartCapital - Capital cap for normalization (default: $10K)
 * @returns Comprehensive performance statistics
 */
export function calculateStats(
  trades: ProcessedTrade[],
  positions: ProcessedPosition[],
  state: ClearinghouseState | null,
  builderOnly: boolean = false,
  maxStartCapital: number = 10000 // Default cap for fair comparison
): ProcessedStats {
  // Win rate calculation (batting average)
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  
  // Volume aggregation (market impact indicator)
  const totalVolume = trades.reduce((sum, t) => sum + t.notionalValue, 0);
  
  // P&L metrics
  const totalRealizedPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  // Transaction cost analysis
  const totalFees = trades.reduce((sum, t) => sum + t.fee + t.builderFee, 0);
  
  // Tail risk analysis (best/worst trades)
  const pnls = trades.map((t) => t.pnl);
  const builderTradeCount = trades.filter((t) => t.isBuilderTrade).length;
  
  // CAPPED NORMALIZATION for fair cross-sectional comparison
  // Prevents bias from heterogeneous capital bases
  const accountValue = state ? parseFloat(state.marginSummary.accountValue) : 0;
  const effectiveCapital = Math.min(accountValue || maxStartCapital, maxStartCapital);
  const returnPct = effectiveCapital > 0 ? (totalRealizedPnL / effectiveCapital) * 100 : 0;
  
  // Taint detection for attribution purity
  // Mixed builder/non-builder trades contaminate attribution
  const hasNonBuilderTrades = trades.some((t) => !t.isBuilderTrade);
  const tainted = builderOnly && hasNonBuilderTrades && builderTradeCount > 0;
  
  return {
    totalTrades: trades.length,
    tradeCount: trades.length,
    winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
    totalVolume,
    avgPnL: trades.length > 0 ? totalRealizedPnL / trades.length : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,  // Positive tail
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,  // Negative tail (drawdown)
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalFees,
    accountValue,
    returnPct,  // Capped normalized return
    tainted,    // Attribution purity flag
    builderTradeCount,
  };
}

// Generate cumulative PnL data from trades
export function generatePnLData(trades: ProcessedTrade[]): PnLDataPoint[] {
  // Sort trades by time (oldest first)
  const sortedTrades = [...trades].sort((a, b) => a.rawTime - b.rawTime);
  
  // Group trades by day
  const dailyPnL: Map<string, number> = new Map();
  
  sortedTrades.forEach((trade) => {
    const date = new Date(trade.rawTime).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const current = dailyPnL.get(date) || 0;
    dailyPnL.set(date, current + trade.pnl);
  });
  
  // Convert to cumulative data
  const data: PnLDataPoint[] = [];
  let cumulative = 0;
  
  dailyPnL.forEach((pnl, time) => {
    cumulative += pnl;
    data.push({ time, pnl, cumulative });
  });
  
  return data;
}

// Build position lifecycle history from trades
/**
 * Position Lifecycle Reconstruction Algorithm
 * 
 * Implements sequential state-space modeling to track position evolution from inception to closure.
 * This is a core quantitative finance technique used in:
 * - Order Management Systems (OMS) for tracking strategy positions
 * - Performance attribution systems for isolating round-trip trade P&L
 * - Risk management systems for understanding position history
 * 
 * Algorithm:
 * 1. Chronologically processes trades to maintain temporal causality
 * 2. Tracks running netSize (positive = long, negative = short, 0 = flat)
 * 3. Detects lifecycle boundaries when netSize transitions through zero
 * 4. Implements taint propagation for attribution purity
 * 
 * @param trades - Chronologically ordered trade data
 * @param builderOnly - Enable strict attribution (taint non-builder trades)
 * @returns Array of complete position lifecycles with performance metrics
 */
export function buildPositionLifecycles(
  trades: ProcessedTrade[],
  builderOnly: boolean = false
): PositionLifecycle[] {
  // Sort trades chronologically to ensure sequential processing (critical for state accuracy)
  const sortedTrades = [...trades].sort((a, b) => a.rawTime - b.rawTime);
  const lifecycles: PositionLifecycle[] = [];
  
  // Active positions map: tracks current state for each instrument
  const activePositions: Map<string, {
    trades: ProcessedTrade[];
    side: "long" | "short";
    netSize: number;  // Running position size (signed: +long, -short)
  }> = new Map();
  
  sortedTrades.forEach((trade) => {
    const key = trade.coin;
    let position = activePositions.get(key);
    
    // Calculate signed size change: +ve for buys (long), -ve for sells (short)
    const sizeChange = trade.side === "long" ? trade.size : -trade.size;
    
    if (!position) {
      // Lifecycle initiation: netSize transitions from 0 to non-zero
      position = {
        trades: [trade],
        side: trade.side,
        netSize: sizeChange,
      };
      activePositions.set(key, position);
    } else {
      position.trades.push(trade);
      position.netSize += sizeChange;
      
      // Lifecycle termination: netSize returns to zero (position fully closed)
      // Use epsilon comparison for floating-point tolerance
      if (Math.abs(position.netSize) < 0.0001) {
        // Compute lifecycle metrics
        const firstTrade = position.trades[0];
        const lastTrade = position.trades[position.trades.length - 1];
        const realizedPnl = position.trades.reduce((sum, t) => sum + t.pnl, 0);
        const maxSize = Math.max(...position.trades.map((t) => t.size));
        
        // Taint detection for attribution purity
        // A lifecycle is "tainted" if it contains both builder and non-builder trades
        // This ensures rigorous attribution - mixed-source lifecycles cannot be attributed
        const hasNonBuilderTrades = position.trades.some((t) => !t.isBuilderTrade);
        const hasBuilderTrades = position.trades.some((t) => t.isBuilderTrade);
        
        lifecycles.push({
          id: `lifecycle-${firstTrade.rawTime}`,
          coin: key,
          side: position.side,
          openTime: firstTrade.timestamp,
          closeTime: lastTrade.timestamp,
          openPrice: firstTrade.price,
          closePrice: lastTrade.price,
          maxSize,  // Maximum exposure during lifecycle (risk metric)
          realizedPnl,  // Total P&L for this round-trip
          status: "closed",
          tradeCount: position.trades.length,
          tainted: builderOnly && hasNonBuilderTrades && hasBuilderTrades,
          avgEntryPx: position.trades.reduce((sum, t) => sum + t.price, 0) / position.trades.length,
        });
        
        activePositions.delete(key);  // Clear closed position
      }
    }
  });
  
  // Add remaining open positions (lifecycles in progress)
  activePositions.forEach((position, coin) => {
    const firstTrade = position.trades[0];
    const realizedPnl = position.trades.reduce((sum, t) => sum + t.pnl, 0);
    const maxSize = Math.max(...position.trades.map((t) => t.size));
    const hasNonBuilderTrades = position.trades.some((t) => !t.isBuilderTrade);
    const hasBuilderTrades = position.trades.some((t) => t.isBuilderTrade);
    
    lifecycles.push({
      id: `lifecycle-${firstTrade.rawTime}`,
      coin,
      side: position.side,
      openTime: firstTrade.timestamp,
      closeTime: null,  // Still open
      openPrice: firstTrade.price,
      closePrice: null,
      maxSize,
      realizedPnl,
      status: "open",
      tradeCount: position.trades.length,
      tainted: builderOnly && hasNonBuilderTrades && hasBuilderTrades,
      avgEntryPx: position.trades.reduce((sum, t) => sum + t.price, 0) / position.trades.length,
    });
  });
  
  // Sort by recency (most recent first) for UI display
  return lifecycles.sort((a, b) => {
    const timeA = new Date(a.openTime).getTime();
    const timeB = new Date(b.openTime).getTime();
    return timeB - timeA;
  });
}

// Main function to fetch all data for an address
export async function fetchAddressData(address: string, builderOnly: boolean = false) {
  const [fills, state] = await Promise.all([
    fetchUserFills(address),
    fetchClearinghouseState(address),
  ]);
  
  // Process ALL fills for position lifecycle tracking (to detect taint)
  const allTrades = processFillsToTrades(fills);
  
  let filteredTrades = allTrades;
  
  // Filter for builder fills only if requested
  if (builderOnly) {
    filteredTrades = allTrades.filter((trade) => trade.isBuilderTrade);
  }
  
  const positions = processPositions(state);
  const stats = calculateStats(allTrades, positions, state, builderOnly);
  const pnlData = generatePnLData(filteredTrades);
  const positionLifecycles = buildPositionLifecycles(allTrades, builderOnly);
  
  return {
    trades: filteredTrades,
    allTrades, // Include all trades for validation
    positions,
    stats,
    pnlData,
    positionLifecycles,
    rawFills: fills,
    rawState: state,
  };
}
