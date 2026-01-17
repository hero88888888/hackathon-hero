/**
 * Position History Endpoint (GET /v1-positions-history)
 * Returns time-ordered position states with lifecycle tracking.
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

async function fetchUserFills(user: string): Promise<HyperliquidFill[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch fills: ${response.status}`);
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
}

function buildPositionHistory(
  fills: HyperliquidFill[],
  targetBuilder: string,
  builderOnly: boolean
): PositionState[] {
  const sorted = [...fills].sort((a, b) => a.time - b.time);
  const byCoin: Record<string, HyperliquidFill[]> = {};
  
  for (const fill of sorted) {
    if (!byCoin[fill.coin]) byCoin[fill.coin] = [];
    byCoin[fill.coin].push(fill);
  }

  const states: PositionState[] = [];

  for (const [coin, coinFills] of Object.entries(byCoin)) {
    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let hasBuilder = false;
    let hasNonBuilder = false;

    for (const fill of coinFills) {
      const isBuilder = targetBuilder
        ? (fill.builder === targetBuilder || parseFloat(fill.builderFee || '0') > 0)
        : !!(fill.builder || parseFloat(fill.builderFee || '0') > 0);

      if (isBuilder) hasBuilder = true;
      else hasNonBuilder = true;

      const sz = parseFloat(fill.sz);
      const px = parseFloat(fill.px);
      const dir = fill.side === 'B' ? 1 : -1;
      const signed = sz * dir;

      if ((netSize >= 0 && dir > 0) || (netSize <= 0 && dir < 0)) {
        totalCost += px * sz;
        netSize += signed;
        avgEntryPx = Math.abs(netSize) > 0 ? totalCost / Math.abs(netSize) : 0;
      } else {
        const reduce = Math.min(Math.abs(netSize), sz);
        totalCost -= avgEntryPx * reduce;
        netSize += signed;
        if (Math.abs(netSize) < 0.0001) {
          netSize = 0;
          avgEntryPx = 0;
          totalCost = 0;
          hasBuilder = false;
          hasNonBuilder = false;
        }
      }

      const tainted = hasBuilder && hasNonBuilder;
      const isBuilderOnlyPos = hasBuilder && !hasNonBuilder;

      if (builderOnly && (tainted || !isBuilderOnlyPos)) continue;

      states.push({
        timeMs: fill.time,
        coin,
        netSize,
        avgEntryPx,
        side: netSize > 0 ? 'long' : netSize < 0 ? 'short' : 'flat',
        tainted,
        builderOnly: isBuilderOnlyPos,
      });
    }
  }

  return states.sort((a, b) => b.timeMs - a.timeMs);
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

    if (coin) positions = positions.filter(p => p.coin === coin);
    if (fromMs) positions = positions.filter(p => p.timeMs >= parseInt(fromMs));
    if (toMs) positions = positions.filter(p => p.timeMs <= parseInt(toMs));

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
