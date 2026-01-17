/**
 * Ledger Engine - Core Position Reconstruction & Taint Logic
 * 
 * This is the "brain" of the Trade Ledger API, implementing:
 * - Sequential position lifecycle tracking
 * - Strict taint detection (viral tainting of entire lifecycles)
 * - Capped normalization for fair PnL comparison
 * - Average entry price calculation using cost-basis method
 * 
 * CRITICAL: Taint logic is sequential - cannot be solved with simple SQL filtering.
 * If ANY trade in a lifecycle is non-builder, the ENTIRE lifecycle is tainted.
 */

import type { 
  HyperliquidFill, 
  NormalizedTrade, 
  PositionState, 
  PositionLifecycle,
  ClearinghouseState,
  PnLResult 
} from './types.ts';

/**
 * Normalize raw Hyperliquid fills into processed trades
 */
export function normalizeFills(
  fills: HyperliquidFill[], 
  targetBuilder: string
): NormalizedTrade[] {
  return fills.map(fill => {
    const builderFee = parseFloat(fill.builderFee || '0');
    
    // Builder attribution logic:
    // 1. If targetBuilder is specified, match against fill.builder
    // 2. Also consider builderFee > 0 as indicator of builder trade
    const isBuilderTrade = targetBuilder
      ? (fill.builder === targetBuilder || builderFee > 0)
      : !!(fill.builder || builderFee > 0);

    return {
      timeMs: fill.time,
      coin: fill.coin,
      side: fill.side as 'B' | 'A',
      px: parseFloat(fill.px),
      sz: parseFloat(fill.sz),
      fee: parseFloat(fill.fee),
      closedPnl: parseFloat(fill.closedPnl),
      notionalValue: parseFloat(fill.px) * parseFloat(fill.sz),
      hash: fill.hash,
      oid: fill.oid,
      tid: fill.tid,
      builder: fill.builder || null,
      builderFee,
      isBuilderTrade,
    };
  });
}

/**
 * Reconstruct position lifecycles from a stream of trades
 * 
 * This is the core algorithm implementing strict taint tracking:
 * - Lifecycle starts when netSize moves from 0 to non-zero
 * - Lifecycle ends when netSize returns to 0
 * - If ANY trade in the lifecycle is non-builder, entire lifecycle is TAINTED
 */
export function reconstructLifecycles(
  trades: NormalizedTrade[],
  targetBuilder: string
): PositionLifecycle[] {
  // Sort trades chronologically (oldest first) - critical for accurate reconstruction
  const sortedTrades = [...trades].sort((a, b) => a.timeMs - b.timeMs);
  
  // Group by coin for per-asset lifecycle tracking
  const byCoin: Map<string, NormalizedTrade[]> = new Map();
  for (const trade of sortedTrades) {
    const existing = byCoin.get(trade.coin) || [];
    existing.push(trade);
    byCoin.set(trade.coin, existing);
  }
  
  const lifecycles: PositionLifecycle[] = [];
  
  for (const [coin, coinTrades] of byCoin) {
    // State machine for position tracking
    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let currentLifecycle: {
      trades: NormalizedTrade[];
      startTime: number;
      hasBuilderTrades: boolean;
      hasNonBuilderTrades: boolean;
      side: 'long' | 'short';
      maxSize: number;
      realizedPnl: number;
      feesPaid: number;
    } | null = null;
    
    for (const trade of coinTrades) {
      const fillSize = trade.sz;
      const fillPrice = trade.px;
      const direction = trade.side === 'B' ? 1 : -1;
      const signedSize = fillSize * direction;
      
      // Start new lifecycle if flat
      if (netSize === 0 && currentLifecycle === null) {
        currentLifecycle = {
          trades: [],
          startTime: trade.timeMs,
          hasBuilderTrades: false,
          hasNonBuilderTrades: false,
          side: direction > 0 ? 'long' : 'short',
          maxSize: 0,
          realizedPnl: 0,
          feesPaid: 0,
        };
        totalCost = 0;
        avgEntryPx = 0;
      }
      
      if (currentLifecycle) {
        // Track builder attribution
        if (trade.isBuilderTrade) {
          currentLifecycle.hasBuilderTrades = true;
        } else {
          currentLifecycle.hasNonBuilderTrades = true;
        }
        
        currentLifecycle.trades.push(trade);
        currentLifecycle.realizedPnl += trade.closedPnl;
        currentLifecycle.feesPaid += trade.fee;
        
        // Update position using average cost method
        if ((netSize >= 0 && direction > 0) || (netSize <= 0 && direction < 0)) {
          // Adding to position (same direction)
          totalCost += fillPrice * fillSize;
          netSize += signedSize;
          avgEntryPx = Math.abs(netSize) > 0 ? totalCost / Math.abs(netSize) : 0;
        } else {
          // Reducing/reversing position
          const reduceSize = Math.min(Math.abs(netSize), fillSize);
          totalCost -= avgEntryPx * reduceSize;
          netSize += signedSize;
          
          // If we crossed zero, recalculate for new position
          if (netSize !== 0 && Math.sign(netSize) !== Math.sign(netSize - signedSize)) {
            const remainingSize = Math.abs(netSize);
            totalCost = fillPrice * remainingSize;
            avgEntryPx = fillPrice;
          } else if (Math.abs(netSize) > 0) {
            avgEntryPx = totalCost / Math.abs(netSize);
          }
        }
        
        currentLifecycle.maxSize = Math.max(currentLifecycle.maxSize, Math.abs(netSize));
        
        // Check if position closed (returned to flat)
        if (Math.abs(netSize) < 0.00001) {
          netSize = 0;
          
          // Calculate taint status
          const isTainted = currentLifecycle.hasBuilderTrades && currentLifecycle.hasNonBuilderTrades;
          const isBuilderOnly = currentLifecycle.hasBuilderTrades && !currentLifecycle.hasNonBuilderTrades;
          
          // Calculate average entry and exit prices
          const entryTrades = currentLifecycle.trades.filter(t => 
            (currentLifecycle!.side === 'long' && t.side === 'B') ||
            (currentLifecycle!.side === 'short' && t.side === 'A')
          );
          const exitTrades = currentLifecycle.trades.filter(t => 
            (currentLifecycle!.side === 'long' && t.side === 'A') ||
            (currentLifecycle!.side === 'short' && t.side === 'B')
          );
          
          const avgEntry = entryTrades.length > 0
            ? entryTrades.reduce((sum, t) => sum + t.px * t.sz, 0) / entryTrades.reduce((sum, t) => sum + t.sz, 0)
            : 0;
          const avgExit = exitTrades.length > 0
            ? exitTrades.reduce((sum, t) => sum + t.px * t.sz, 0) / exitTrades.reduce((sum, t) => sum + t.sz, 0)
            : null;
          
          lifecycles.push({
            id: `lifecycle-${coin}-${currentLifecycle.startTime}`,
            coin,
            side: currentLifecycle.side,
            startTime: currentLifecycle.startTime,
            endTime: trade.timeMs,
            avgEntryPx: avgEntry,
            avgExitPx: avgExit,
            maxSize: currentLifecycle.maxSize,
            realizedPnl: currentLifecycle.realizedPnl,
            feesPaid: currentLifecycle.feesPaid,
            tradeCount: currentLifecycle.trades.length,
            isTainted,
            isBuilderOnly,
            status: 'closed',
            trades: currentLifecycle.trades,
          });
          
          // Reset for next lifecycle
          currentLifecycle = null;
          totalCost = 0;
          avgEntryPx = 0;
        }
      }
    }
    
    // Handle still-open position
    if (currentLifecycle && Math.abs(netSize) > 0.00001) {
      const isTainted = currentLifecycle.hasBuilderTrades && currentLifecycle.hasNonBuilderTrades;
      const isBuilderOnly = currentLifecycle.hasBuilderTrades && !currentLifecycle.hasNonBuilderTrades;
      
      const entryTrades = currentLifecycle.trades.filter(t => 
        (currentLifecycle!.side === 'long' && t.side === 'B') ||
        (currentLifecycle!.side === 'short' && t.side === 'A')
      );
      
      const avgEntry = entryTrades.length > 0
        ? entryTrades.reduce((sum, t) => sum + t.px * t.sz, 0) / entryTrades.reduce((sum, t) => sum + t.sz, 0)
        : avgEntryPx;
      
      lifecycles.push({
        id: `lifecycle-${coin}-${currentLifecycle.startTime}`,
        coin,
        side: currentLifecycle.side,
        startTime: currentLifecycle.startTime,
        endTime: null,
        avgEntryPx: avgEntry,
        avgExitPx: null,
        maxSize: currentLifecycle.maxSize,
        realizedPnl: currentLifecycle.realizedPnl,
        feesPaid: currentLifecycle.feesPaid,
        tradeCount: currentLifecycle.trades.length,
        isTainted,
        isBuilderOnly,
        status: 'open',
        trades: currentLifecycle.trades,
      });
    }
  }
  
  // Sort by most recent first
  return lifecycles.sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime));
}

/**
 * Build position history (time-ordered states) from trades
 */
export function buildPositionHistory(
  trades: NormalizedTrade[],
  targetBuilder: string,
  builderOnly: boolean
): PositionState[] {
  // Sort chronologically
  const sortedTrades = [...trades].sort((a, b) => a.timeMs - b.timeMs);
  
  // Group by coin
  const byCoin: Map<string, NormalizedTrade[]> = new Map();
  for (const trade of sortedTrades) {
    const existing = byCoin.get(trade.coin) || [];
    existing.push(trade);
    byCoin.set(trade.coin, existing);
  }
  
  const positionStates: PositionState[] = [];
  
  for (const [coin, coinTrades] of byCoin) {
    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let hasBuilderTrades = false;
    let hasNonBuilderTrades = false;
    
    for (const trade of coinTrades) {
      const direction = trade.side === 'B' ? 1 : -1;
      const signedSize = trade.sz * direction;
      
      // Track attribution
      if (trade.isBuilderTrade) hasBuilderTrades = true;
      else hasNonBuilderTrades = true;
      
      // Update position
      if ((netSize >= 0 && direction > 0) || (netSize <= 0 && direction < 0)) {
        totalCost += trade.px * trade.sz;
        netSize += signedSize;
        avgEntryPx = Math.abs(netSize) > 0 ? totalCost / Math.abs(netSize) : 0;
      } else {
        const reduceSize = Math.min(Math.abs(netSize), trade.sz);
        totalCost -= avgEntryPx * reduceSize;
        netSize += signedSize;
        
        if (Math.abs(netSize) < 0.0001) {
          netSize = 0;
          avgEntryPx = 0;
          totalCost = 0;
          hasBuilderTrades = false;
          hasNonBuilderTrades = false;
        }
      }
      
      const tainted = hasBuilderTrades && hasNonBuilderTrades;
      const isBuilderOnlyPosition = hasBuilderTrades && !hasNonBuilderTrades;
      
      // Skip if builderOnly filter and position is tainted or not builder-only
      if (builderOnly && (tainted || !isBuilderOnlyPosition)) continue;
      
      positionStates.push({
        timeMs: trade.timeMs,
        coin,
        netSize,
        avgEntryPx,
        side: netSize > 0 ? 'long' : netSize < 0 ? 'short' : 'flat',
        tainted,
        builderOnly: isBuilderOnlyPosition,
      });
    }
  }
  
  // Sort by time descending
  return positionStates.sort((a, b) => b.timeMs - a.timeMs);
}

/**
 * Calculate PnL with capped normalization
 * 
 * Formula: returnPct = realizedPnl / effectiveCapital * 100
 * Where: effectiveCapital = min(equityAtStart, maxStartCapital)
 * 
 * This prevents large accounts from having unfair advantage/disadvantage
 */
export function calculatePnL(
  trades: NormalizedTrade[],
  lifecycles: PositionLifecycle[],
  clearinghouseState: ClearinghouseState | null,
  user: string,
  coin: string | null,
  fromMs: number | null,
  toMs: number | null,
  builderOnly: boolean,
  maxStartCapital: number = 10000
): PnLResult {
  // Filter trades
  let filteredTrades = [...trades];
  if (coin) filteredTrades = filteredTrades.filter(t => t.coin === coin);
  if (fromMs) filteredTrades = filteredTrades.filter(t => t.timeMs >= fromMs);
  if (toMs) filteredTrades = filteredTrades.filter(t => t.timeMs <= toMs);
  
  // Calculate metrics respecting taint logic
  let hasBuilderTrades = false;
  let hasNonBuilderTrades = false;
  let realizedPnl = 0;
  let feesPaid = 0;
  let volume = 0;
  let tradeCount = 0;
  let builderTradeCount = 0;
  
  // Get tainted lifecycle IDs for filtering
  const taintedLifecycleIds = new Set(
    lifecycles.filter(l => l.isTainted).map(l => l.id)
  );
  
  for (const trade of filteredTrades) {
    if (trade.isBuilderTrade) {
      hasBuilderTrades = true;
      builderTradeCount++;
    } else {
      hasNonBuilderTrades = true;
    }
    
    // If builderOnly, skip non-builder trades
    if (builderOnly && !trade.isBuilderTrade) continue;
    
    // For strict builder-only, also skip trades from tainted lifecycles
    // This requires finding which lifecycle the trade belongs to
    if (builderOnly) {
      const tradeLifecycle = lifecycles.find(l => 
        l.trades.some(lt => lt.hash === trade.hash)
      );
      if (tradeLifecycle && tradeLifecycle.isTainted) continue;
    }
    
    realizedPnl += trade.closedPnl;
    feesPaid += trade.fee;
    volume += trade.notionalValue;
    tradeCount++;
  }
  
  // Calculate tainted status
  const tainted = builderOnly && hasBuilderTrades && hasNonBuilderTrades;
  
  // Get current equity
  const currentEquity = clearinghouseState 
    ? parseFloat(clearinghouseState.marginSummary.accountValue) 
    : 0;
  
  const unrealizedPnl = clearinghouseState?.assetPositions?.reduce(
    (sum, ap) => sum + parseFloat(ap.position.unrealizedPnl || '0'),
    0
  ) || 0;
  
  // Estimate starting equity (current equity minus realized gains, plus fees paid)
  const estimatedStartEquity = currentEquity - realizedPnl + feesPaid;
  
  // Apply capped normalization for fair comparison
  const effectiveCapital = Math.min(
    Math.max(estimatedStartEquity, 100), // Floor of $100 to prevent division issues
    maxStartCapital
  );
  
  const returnPct = effectiveCapital > 0 ? (realizedPnl / effectiveCapital) * 100 : 0;
  
  return {
    user,
    coin,
    fromMs,
    toMs,
    builderOnly,
    realizedPnl,
    unrealizedPnl,
    returnPct,
    effectiveCapital,
    feesPaid,
    volume,
    tradeCount,
    builderTradeCount,
    tainted,
    currentEquity,
  };
}

/**
 * Filter trades based on builderOnly mode and taint status
 */
export function filterTradesForOutput(
  trades: NormalizedTrade[],
  lifecycles: PositionLifecycle[],
  builderOnly: boolean
): NormalizedTrade[] {
  if (!builderOnly) return trades;
  
  // Get trades that are NOT in tainted lifecycles
  const taintedTradeHashes = new Set<string>();
  for (const lifecycle of lifecycles) {
    if (lifecycle.isTainted) {
      for (const trade of lifecycle.trades) {
        taintedTradeHashes.add(trade.hash);
      }
    }
  }
  
  return trades.filter(t => t.isBuilderTrade && !taintedTradeHashes.has(t.hash));
}
