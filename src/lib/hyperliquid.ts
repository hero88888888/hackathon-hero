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
export function calculateStats(
  trades: ProcessedTrade[],
  positions: ProcessedPosition[],
  state: ClearinghouseState | null,
  builderOnly: boolean = false,
  maxStartCapital: number = 10000 // Default cap for fair comparison
): ProcessedStats {
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const totalVolume = trades.reduce((sum, t) => sum + t.notionalValue, 0);
  const totalRealizedPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fee + t.builderFee, 0);
  const pnls = trades.map((t) => t.pnl);
  const builderTradeCount = trades.filter((t) => t.isBuilderTrade).length;
  
  // Calculate effective capital for returnPct (capped normalization)
  const accountValue = state ? parseFloat(state.marginSummary.accountValue) : 0;
  const effectiveCapital = Math.min(accountValue || maxStartCapital, maxStartCapital);
  const returnPct = effectiveCapital > 0 ? (totalRealizedPnL / effectiveCapital) * 100 : 0;
  
  // Taint detection: if builderOnly mode and there are non-builder trades affecting same positions
  const hasNonBuilderTrades = trades.some((t) => !t.isBuilderTrade);
  const tainted = builderOnly && hasNonBuilderTrades && builderTradeCount > 0;
  
  return {
    totalTrades: trades.length,
    tradeCount: trades.length,
    winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
    totalVolume,
    avgPnL: trades.length > 0 ? totalRealizedPnL / trades.length : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalFees,
    accountValue,
    returnPct,
    tainted,
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
export function buildPositionLifecycles(
  trades: ProcessedTrade[],
  builderOnly: boolean = false
): PositionLifecycle[] {
  const sortedTrades = [...trades].sort((a, b) => a.rawTime - b.rawTime);
  const lifecycles: PositionLifecycle[] = [];
  const activePositions: Map<string, {
    trades: ProcessedTrade[];
    side: "long" | "short";
    netSize: number;
  }> = new Map();
  
  sortedTrades.forEach((trade) => {
    const key = trade.coin;
    let position = activePositions.get(key);
    
    // Determine size change (positive for buys, negative for sells)
    const sizeChange = trade.side === "long" ? trade.size : -trade.size;
    
    if (!position) {
      // Start new position lifecycle
      position = {
        trades: [trade],
        side: trade.side,
        netSize: sizeChange,
      };
      activePositions.set(key, position);
    } else {
      position.trades.push(trade);
      position.netSize += sizeChange;
      
      // Check if position closed (netSize returned to ~0)
      if (Math.abs(position.netSize) < 0.0001) {
        // Position lifecycle complete
        const firstTrade = position.trades[0];
        const lastTrade = position.trades[position.trades.length - 1];
        const realizedPnl = position.trades.reduce((sum, t) => sum + t.pnl, 0);
        const maxSize = Math.max(...position.trades.map((t) => t.size));
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
          maxSize,
          realizedPnl,
          status: "closed",
          tradeCount: position.trades.length,
          tainted: builderOnly && hasNonBuilderTrades && hasBuilderTrades,
          avgEntryPx: position.trades.reduce((sum, t) => sum + t.price, 0) / position.trades.length,
        });
        
        activePositions.delete(key);
      }
    }
  });
  
  // Add remaining open positions
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
      closeTime: null,
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
  
  return lifecycles.sort((a, b) => {
    const timeA = new Date(a.openTime).getTime();
    const timeB = new Date(b.openTime).getTime();
    return timeB - timeA; // Most recent first
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
