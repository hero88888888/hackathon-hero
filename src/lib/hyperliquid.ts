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
  return fills.map((fill, index) => ({
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
    size: parseFloat(fill.sz),
    price: parseFloat(fill.px),
    pnl: parseFloat(fill.closedPnl),
    fee: parseFloat(fill.fee || "0"),
    builderFee: parseFloat(fill.builderFee || "0"),
    hash: fill.hash,
    rawTime: fill.time,
  }));
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
export function calculateStats(
  trades: ProcessedTrade[],
  positions: ProcessedPosition[],
  state: ClearinghouseState | null
): ProcessedStats {
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const totalVolume = trades.reduce((sum, t) => sum + t.size * t.price, 0);
  const totalRealizedPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fee + t.builderFee, 0);
  const pnls = trades.map((t) => t.pnl);
  
  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
    totalVolume,
    avgPnL: trades.length > 0 ? totalRealizedPnL / trades.length : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalFees,
    accountValue: state ? parseFloat(state.marginSummary.accountValue) : 0,
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

// Main function to fetch all data for an address
export async function fetchAddressData(address: string, builderOnly: boolean = false) {
  const [fills, state] = await Promise.all([
    fetchUserFills(address),
    fetchClearinghouseState(address),
  ]);
  
  let processedFills = fills;
  
  // Filter for builder fills only if requested
  if (builderOnly) {
    processedFills = fills.filter(
      (fill) => fill.builderFee && parseFloat(fill.builderFee) > 0
    );
  }
  
  const trades = processFillsToTrades(processedFills);
  const positions = processPositions(state);
  const stats = calculateStats(trades, positions, state);
  const pnlData = generatePnLData(trades);
  
  return {
    trades,
    positions,
    stats,
    pnlData,
    rawFills: fills,
    rawState: state,
  };
}
