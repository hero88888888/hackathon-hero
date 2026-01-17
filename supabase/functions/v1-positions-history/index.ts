import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  fee: string;
  builder?: string;
  builderFee?: string;
}

interface PositionState {
  timeMs: number;
  coin: string;
  netSize: number;
  avgEntryPx: number;
  side: string;
  tainted: boolean;
  builderOnly: boolean;
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

function buildPositionHistory(fills: HyperliquidFill[], targetBuilder: string, builderOnly: boolean): PositionState[] {
  // Group by coin
  const byCoin: Record<string, HyperliquidFill[]> = {};
  for (const fill of fills) {
    if (!byCoin[fill.coin]) byCoin[fill.coin] = [];
    byCoin[fill.coin].push(fill);
  }

  const positionStates: PositionState[] = [];

  for (const [coin, coinFills] of Object.entries(byCoin)) {
    // Sort by time ascending
    coinFills.sort((a, b) => a.time - b.time);

    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let hasBuilderTrades = false;
    let hasNonBuilderTrades = false;

    for (const fill of coinFills) {
      const isBuilderTrade = targetBuilder ? 
        (fill.builder === targetBuilder || (fill.builderFee && parseFloat(fill.builderFee) > 0)) : 
        !!(fill.builder || (fill.builderFee && parseFloat(fill.builderFee) > 0));

      if (isBuilderTrade) hasBuilderTrades = true;
      else hasNonBuilderTrades = true;

      const fillSize = parseFloat(fill.sz);
      const fillPrice = parseFloat(fill.px);
      const direction = fill.side === 'B' ? 1 : -1;
      const signedSize = fillSize * direction;

      // Update position using average cost method
      if ((netSize >= 0 && direction > 0) || (netSize <= 0 && direction < 0)) {
        // Adding to position
        totalCost += fillPrice * fillSize;
        netSize += signedSize;
        avgEntryPx = Math.abs(netSize) > 0 ? totalCost / Math.abs(netSize) : 0;
      } else {
        // Reducing position
        const reduceSize = Math.min(Math.abs(netSize), fillSize);
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
        timeMs: fill.time,
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
  positionStates.sort((a, b) => b.timeMs - a.timeMs);
  return positionStates;
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

    const fills = await fetchUserFills(user);
    let positions = buildPositionHistory(fills, targetBuilder, builderOnly);

    // Apply filters
    if (coin) {
      positions = positions.filter(p => p.coin === coin);
    }
    if (fromMs) {
      positions = positions.filter(p => p.timeMs >= parseInt(fromMs));
    }
    if (toMs) {
      positions = positions.filter(p => p.timeMs <= parseInt(toMs));
    }

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        count: positions.length,
        positions,
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
