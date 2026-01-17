/**
 * Hyperliquid Trade Ledger API - Core Type Definitions
 * 
 * These interfaces define the "physics" of the trade ledger system,
 * implementing strict typing for position lifecycle tracking, taint detection,
 * and capped PnL normalization.
 */

// Raw fill from Hyperliquid API
export interface HyperliquidFill {
  coin: string;
  px: string;
  sz: string;
  side: 'B' | 'A'; // Bid (Buy) or Ask (Sell)
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
  feeToken: string;
  builderFee?: string;
  builder?: string;
}

// Clearinghouse state from Hyperliquid API
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
    position: {
      coin: string;
      szi: string;
      leverage: { type: string; value: number };
      entryPx: string;
      positionValue: string;
      unrealizedPnl: string;
      returnOnEquity: string;
      liquidationPx: string | null;
      marginUsed: string;
    };
  }>;
  withdrawable: string;
}

// Normalized trade for internal processing
export interface NormalizedTrade {
  timeMs: number;
  coin: string;
  side: 'B' | 'A';
  px: number;
  sz: number;
  fee: number;
  closedPnl: number;
  notionalValue: number;
  hash: string;
  oid: number;
  tid: number;
  builder: string | null;
  builderFee: number;
  isBuilderTrade: boolean;
}

// Position state at a point in time
export interface PositionState {
  timeMs: number;
  coin: string;
  netSize: number;
  avgEntryPx: number;
  side: 'long' | 'short' | 'flat';
  tainted: boolean;
  builderOnly: boolean;
}

// Complete position lifecycle from open to close
export interface PositionLifecycle {
  id: string;
  coin: string;
  side: 'long' | 'short';
  startTime: number;
  endTime: number | null;
  avgEntryPx: number;
  avgExitPx: number | null;
  maxSize: number;
  realizedPnl: number;
  feesPaid: number;
  tradeCount: number;
  isTainted: boolean; // TRUE if any trade in this lifecycle is NOT builder-attributed
  isBuilderOnly: boolean; // TRUE if ALL trades are builder-attributed
  status: 'open' | 'closed';
  trades: NormalizedTrade[];
}

// PnL calculation result with capped normalization
export interface PnLResult {
  user: string;
  coin: string | null;
  fromMs: number | null;
  toMs: number | null;
  builderOnly: boolean;
  realizedPnl: number;
  unrealizedPnl: number;
  returnPct: number; // Using capped normalization
  effectiveCapital: number;
  feesPaid: number;
  volume: number;
  tradeCount: number;
  builderTradeCount: number;
  tainted: boolean;
  currentEquity: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  user: string;
  metricValue: number;
  volume: number;
  pnl: number;
  returnPct: number;
  tradeCount: number;
  tainted: boolean;
}

// Deposit record for fair competition filtering
export interface DepositRecord {
  timeMs: number;
  amount: number;
  hash: string;
  usdc: number;
}

// Data source abstraction interface
export interface IDataSource {
  fetchUserFills(user: string): Promise<HyperliquidFill[]>;
  fetchClearinghouseState(user: string): Promise<ClearinghouseState>;
  fetchUserDeposits?(user: string): Promise<DepositRecord[]>;
}
