/**
 * PnL Endpoint (GET /v1-pnl)
 * Returns realized PnL with capped normalization.
 * Formula: returnPct = realizedPnl / min(startEquity, maxCap) * 100
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
  builder?: string;
  builderFee?: string;
}

interface ClearinghouseState {
  marginSummary: { accountValue: string };
  assetPositions: Array<{ position: { unrealizedPnl: string } }>;
}

async function fetchUserFills(user: string): Promise<HyperliquidFill[]> {
  const res = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!res.ok) throw new Error(`Failed to fetch fills: ${res.status}`);
  return res.json();
}

async function fetchClearinghouseState(user: string): Promise<ClearinghouseState> {
  const res = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  if (!res.ok) throw new Error(`Failed to fetch state: ${res.status}`);
  return res.json();
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
    const maxCap = parseFloat(url.searchParams.get('maxStartCapital') || Deno.env.get('MAX_START_CAPITAL') || '10000');
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

    // Filter fills
    let filtered = [...fills];
    if (coin) filtered = filtered.filter(f => f.coin === coin);
    if (fromMs) filtered = filtered.filter(f => f.time >= parseInt(fromMs));
    if (toMs) filtered = filtered.filter(f => f.time <= parseInt(toMs));

    // Calculate metrics
    let hasBuilder = false;
    let hasNonBuilder = false;
    let realizedPnl = 0;
    let feesPaid = 0;
    let volume = 0;
    let tradeCount = 0;
    let builderCount = 0;

    for (const fill of filtered) {
      const isBuilder = targetBuilder
        ? (fill.builder === targetBuilder || parseFloat(fill.builderFee || '0') > 0)
        : !!(fill.builder || parseFloat(fill.builderFee || '0') > 0);

      if (isBuilder) { hasBuilder = true; builderCount++; }
      else hasNonBuilder = true;

      if (builderOnly && !isBuilder) continue;

      realizedPnl += parseFloat(fill.closedPnl);
      feesPaid += parseFloat(fill.fee);
      volume += parseFloat(fill.px) * parseFloat(fill.sz);
      tradeCount++;
    }

    const tainted = builderOnly && hasBuilder && hasNonBuilder;
    const currentEquity = parseFloat(state?.marginSummary?.accountValue || '0');
    const unrealizedPnl = state?.assetPositions?.reduce(
      (sum, ap) => sum + parseFloat(ap.position.unrealizedPnl || '0'), 0
    ) || 0;

    // Capped normalization
    const startEquity = currentEquity - realizedPnl + feesPaid;
    const effectiveCapital = Math.min(Math.max(startEquity, 100), maxCap);
    const returnPct = effectiveCapital > 0 ? (realizedPnl / effectiveCapital) * 100 : 0;

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        maxStartCapital: maxCap,
        realizedPnl,
        unrealizedPnl,
        returnPct,
        effectiveCapital,
        currentEquity,
        feesPaid,
        volume,
        tradeCount,
        builderTradeCount: builderCount,
        tainted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v1-pnl:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
