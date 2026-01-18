/**
 * Position History Endpoint (GET /v1-positions-history)
 * Returns time-ordered position states with lifecycle tracking.
 * 
 * BONUS FEATURES:
 * - liqPx, marginUsed risk fields
 * - Position flip detection (long→short, short→long)
 * - Multi-coin aggregation
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

interface HyperliquidFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  closedPnl: string;
  fee: string;
  hash: string;
  builder?: string;
  builderFee?: string;
}

interface ClearinghouseState {
  marginSummary: { accountValue: string; totalMarginUsed: string };
  assetPositions: Array<{
    position: {
      coin: string;
      szi: string;
      entryPx: string;
      liquidationPx: string | null;
      marginUsed: string;
      unrealizedPnl: string;
      leverage: { value: number };
    };
  }>;
}

async function fetchUserFills(user: string): Promise<HyperliquidFill[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch fills: ${response.status}`);
  return response.json();
}

async function fetchClearinghouseState(user: string): Promise<ClearinghouseState> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch state: ${response.status}`);
  return response.json();
}

interface PositionState {
  timeMs: number;
  coin: string;
  netSize: number;
  avgEntryPx: number;
  side: string;
  tainted: boolean;
  builderOnly: boolean;
  // Bonus: Risk fields
  liqPx: number | null;
  marginUsed: number;
  unrealizedPnl: number;
  leverage: number;
  // Bonus: Position flip detection
  flipped: boolean;
  flipType: string | null; // "long_to_short" | "short_to_long" | null
}

interface PositionLifecycle {
  coin: string;
  side: string;
  openTimeMs: number;
  closeTimeMs: number | null;
  avgEntryPx: number;
  maxSize: number;
  realizedPnl: number;
  feesPaid: number;
  tradeCount: number;
  status: string;
  tainted: boolean;
  builderOnly: boolean;
  flips: number; // Count of direction reversals
}

function buildPositionHistory(
  fills: HyperliquidFill[],
  currentPositions: Map<string, { liqPx: number | null; marginUsed: number; unrealizedPnl: number; leverage: number }>,
  targetBuilder: string,
  builderOnly: boolean
): { states: PositionState[]; lifecycles: PositionLifecycle[]; coinSummary: Record<string, any> } {
  const sorted = [...fills].sort((a, b) => a.time - b.time);
  const byCoin: Record<string, HyperliquidFill[]> = {};
  
  for (const fill of sorted) {
    if (!byCoin[fill.coin]) byCoin[fill.coin] = [];
    byCoin[fill.coin].push(fill);
  }

  const states: PositionState[] = [];
  const lifecycles: PositionLifecycle[] = [];
  const coinSummary: Record<string, any> = {};

  for (const [coin, coinFills] of Object.entries(byCoin)) {
    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let hasBuilder = false;
    let hasNonBuilder = false;
    let previousSide: string | null = null;
    
    // Lifecycle tracking
    let lifecycleStart: number | null = null;
    let lifecycleMaxSize = 0;
    let lifecyclePnl = 0;
    let lifecycleFees = 0;
    let lifecycleTradeCount = 0;
    let lifecycleFlips = 0;
    let lifecycleSide = '';
    let lifecycleHasBuilder = false;
    let lifecycleHasNonBuilder = false;

    // Coin summary
    let coinVolume = 0;
    let coinPnl = 0;
    let coinFeesPaid = 0;
    let coinTradeCount = 0;

    const currentPos = currentPositions.get(coin);

    for (const fill of coinFills) {
      const isBuilder = targetBuilder
        ? (fill.builder === targetBuilder || parseFloat(fill.builderFee || '0') > 0)
        : !!(fill.builder || parseFloat(fill.builderFee || '0') > 0);

      if (isBuilder) { hasBuilder = true; lifecycleHasBuilder = true; }
      else { hasNonBuilder = true; lifecycleHasNonBuilder = true; }

      const sz = parseFloat(fill.sz);
      const px = parseFloat(fill.px);
      const fee = parseFloat(fill.fee);
      const pnl = parseFloat(fill.closedPnl);
      const dir = fill.side === 'B' ? 1 : -1;
      const signed = sz * dir;

      coinVolume += px * sz;
      coinPnl += pnl;
      coinFeesPaid += fee;
      coinTradeCount++;
      lifecyclePnl += pnl;
      lifecycleFees += fee;
      lifecycleTradeCount++;

      // Start new lifecycle if flat
      if (lifecycleStart === null && netSize === 0) {
        lifecycleStart = fill.time;
        lifecycleSide = dir > 0 ? 'long' : 'short';
        lifecycleMaxSize = 0;
        lifecyclePnl = pnl;
        lifecycleFees = fee;
        lifecycleTradeCount = 1;
        lifecycleFlips = 0;
        lifecycleHasBuilder = isBuilder;
        lifecycleHasNonBuilder = !isBuilder;
      }

      const prevNetSize = netSize;

      if ((netSize >= 0 && dir > 0) || (netSize <= 0 && dir < 0)) {
        // Adding to position
        totalCost += px * sz;
        netSize += signed;
        avgEntryPx = Math.abs(netSize) > 0 ? totalCost / Math.abs(netSize) : 0;
      } else {
        // Reducing or flipping position
        const reduce = Math.min(Math.abs(netSize), sz);
        totalCost -= avgEntryPx * reduce;
        netSize += signed;
        
        // Check for flip (crossing zero)
        if ((prevNetSize > 0 && netSize < 0) || (prevNetSize < 0 && netSize > 0)) {
          lifecycleFlips++;
          // Reset entry for flipped portion
          const flipSize = Math.abs(netSize);
          totalCost = px * flipSize;
          avgEntryPx = px;
        }
        
        if (Math.abs(netSize) < 0.0001) {
          // Position closed - finalize lifecycle
          if (lifecycleStart !== null) {
            const tainted = lifecycleHasBuilder && lifecycleHasNonBuilder;
            const isBuilderOnlyLC = lifecycleHasBuilder && !lifecycleHasNonBuilder;
            
            if (!builderOnly || (isBuilderOnlyLC && !tainted)) {
              lifecycles.push({
                coin,
                side: lifecycleSide,
                openTimeMs: lifecycleStart,
                closeTimeMs: fill.time,
                avgEntryPx,
                maxSize: lifecycleMaxSize,
                realizedPnl: lifecyclePnl,
                feesPaid: lifecycleFees,
                tradeCount: lifecycleTradeCount,
                status: 'closed',
                tainted,
                builderOnly: isBuilderOnlyLC,
                flips: lifecycleFlips,
              });
            }
          }
          
          netSize = 0;
          avgEntryPx = 0;
          totalCost = 0;
          hasBuilder = false;
          hasNonBuilder = false;
          lifecycleStart = null;
          lifecycleMaxSize = 0;
          lifecyclePnl = 0;
          lifecycleFees = 0;
          lifecycleTradeCount = 0;
          lifecycleFlips = 0;
          lifecycleHasBuilder = false;
          lifecycleHasNonBuilder = false;
        }
      }

      lifecycleMaxSize = Math.max(lifecycleMaxSize, Math.abs(netSize));

      const currentSide = netSize > 0 ? 'long' : netSize < 0 ? 'short' : 'flat';
      const flipped = previousSide !== null && previousSide !== 'flat' && currentSide !== 'flat' && previousSide !== currentSide;
      const flipType = flipped
        ? (previousSide === 'long' && currentSide === 'short' ? 'long_to_short' : 'short_to_long')
        : null;
      previousSide = currentSide;

      const tainted = hasBuilder && hasNonBuilder;
      const isBuilderOnlyPos = hasBuilder && !hasNonBuilder;

      if (builderOnly && (tainted || !isBuilderOnlyPos)) continue;

      states.push({
        timeMs: fill.time,
        coin,
        netSize,
        avgEntryPx,
        side: currentSide,
        tainted,
        builderOnly: isBuilderOnlyPos,
        liqPx: currentPos?.liqPx ?? null,
        marginUsed: currentPos?.marginUsed ?? 0,
        unrealizedPnl: currentPos?.unrealizedPnl ?? 0,
        leverage: currentPos?.leverage ?? 0,
        flipped,
        flipType,
      });
    }

    // Handle open lifecycle
    if (lifecycleStart !== null && Math.abs(netSize) > 0.0001) {
      const tainted = lifecycleHasBuilder && lifecycleHasNonBuilder;
      const isBuilderOnlyLC = lifecycleHasBuilder && !lifecycleHasNonBuilder;
      
      if (!builderOnly || (isBuilderOnlyLC && !tainted)) {
        lifecycles.push({
          coin,
          side: lifecycleSide,
          openTimeMs: lifecycleStart,
          closeTimeMs: null,
          avgEntryPx,
          maxSize: lifecycleMaxSize,
          realizedPnl: lifecyclePnl,
          feesPaid: lifecycleFees,
          tradeCount: lifecycleTradeCount,
          status: 'open',
          tainted,
          builderOnly: isBuilderOnlyLC,
          flips: lifecycleFlips,
        });
      }
    }

    coinSummary[coin] = {
      volume: coinVolume,
      realizedPnl: coinPnl,
      feesPaid: coinFeesPaid,
      tradeCount: coinTradeCount,
      unrealizedPnl: currentPos?.unrealizedPnl ?? 0,
      currentSize: netSize,
      currentSide: netSize > 0 ? 'long' : netSize < 0 ? 'short' : 'flat',
    };
  }

  return {
    states: states.sort((a, b) => b.timeMs - a.timeMs),
    lifecycles: lifecycles.sort((a, b) => (b.closeTimeMs || b.openTimeMs) - (a.closeTimeMs || a.openTimeMs)),
    coinSummary,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const user = url.searchParams.get('user');
    const coin = url.searchParams.get('coin');
    const fromMs = url.searchParams.get('fromMs');
    const toMs = url.searchParams.get('toMs');
    const builderOnly = url.searchParams.get('builderOnly') === 'true';
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'user parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [fills, state] = await Promise.all([
      fetchUserFills(user),
      fetchClearinghouseState(user),
    ]);

    // Build current position map for risk fields
    const currentPositions = new Map<string, { liqPx: number | null; marginUsed: number; unrealizedPnl: number; leverage: number }>();
    for (const ap of state.assetPositions || []) {
      currentPositions.set(ap.position.coin, {
        liqPx: ap.position.liquidationPx ? parseFloat(ap.position.liquidationPx) : null,
        marginUsed: parseFloat(ap.position.marginUsed || '0'),
        unrealizedPnl: parseFloat(ap.position.unrealizedPnl || '0'),
        leverage: ap.position.leverage?.value || 0,
      });
    }

    const { states, lifecycles, coinSummary } = buildPositionHistory(fills, currentPositions, targetBuilder, builderOnly);
    
    let positions = states;
    let filteredLifecycles = lifecycles;

    if (coin) {
      positions = positions.filter(p => p.coin === coin);
      filteredLifecycles = filteredLifecycles.filter(l => l.coin === coin);
    }
    if (fromMs) {
      positions = positions.filter(p => p.timeMs >= parseInt(fromMs));
      filteredLifecycles = filteredLifecycles.filter(l => l.openTimeMs >= parseInt(fromMs));
    }
    if (toMs) {
      positions = positions.filter(p => p.timeMs <= parseInt(toMs));
      filteredLifecycles = filteredLifecycles.filter(l => (l.closeTimeMs || l.openTimeMs) <= parseInt(toMs));
    }

    // Multi-coin aggregation
    const totalFlips = lifecycles.reduce((sum, l) => sum + l.flips, 0);
    const openLifecycles = filteredLifecycles.filter(l => l.status === 'open').length;
    const closedLifecycles = filteredLifecycles.filter(l => l.status === 'closed').length;

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        count: positions.length,
        positions,
        // Bonus: Position lifecycles
        lifecycleCount: filteredLifecycles.length,
        openLifecycles,
        closedLifecycles,
        lifecycles: filteredLifecycles,
        // Bonus: Flip detection
        totalFlips,
        // Bonus: Multi-coin aggregation
        coinSummary: coin ? { [coin]: coinSummary[coin] } : coinSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v1-positions-history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
