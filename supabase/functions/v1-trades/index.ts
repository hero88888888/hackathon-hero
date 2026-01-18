/**
 * Trade History Endpoint (GET /v1-trades)
 * Returns normalized list of fills for a specific user.
 * 
 * BONUS FEATURES:
 * - Position direction tracking (dir field)
 * - Multi-coin aggregation per coin breakdown
 * - Enhanced trade metadata
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

async function fetchUserFills(user: string): Promise<HyperliquidFill[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch fills: ${response.status}`);
  return response.json();
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

    // Normalize and process fills
    let trades = fills.map(fill => {
      const builderFee = parseFloat(fill.builderFee || '0');
      const isBuilderTrade = targetBuilder
        ? (fill.builder === targetBuilder || builderFee > 0)
        : !!(fill.builder || builderFee > 0);

      return {
        timeMs: fill.time,
        coin: fill.coin,
        side: fill.side,
        dir: fill.dir, // Open Long, Close Short, etc.
        px: parseFloat(fill.px),
        sz: parseFloat(fill.sz),
        fee: parseFloat(fill.fee),
        closedPnl: parseFloat(fill.closedPnl),
        notionalValue: parseFloat(fill.px) * parseFloat(fill.sz),
        hash: fill.hash,
        oid: fill.oid,
        tid: fill.tid,
        crossed: fill.crossed, // Crossed the spread (taker)
        startPosition: parseFloat(fill.startPosition),
        builder: fill.builder || null,
        builderFee,
        isBuilderTrade,
      };
    });

    // Apply filters
    if (coin) trades = trades.filter(t => t.coin === coin);
    if (fromMs) trades = trades.filter(t => t.timeMs >= parseInt(fromMs));
    if (toMs) trades = trades.filter(t => t.timeMs <= parseInt(toMs));
    if (builderOnly) trades = trades.filter(t => t.isBuilderTrade);

    // Sort by time descending
    trades.sort((a, b) => b.timeMs - a.timeMs);

    // Multi-coin aggregation
    const coinBreakdown: Record<string, { volume: number; pnl: number; fees: number; count: number }> = {};
    for (const t of trades) {
      if (!coinBreakdown[t.coin]) {
        coinBreakdown[t.coin] = { volume: 0, pnl: 0, fees: 0, count: 0 };
      }
      coinBreakdown[t.coin].volume += t.notionalValue;
      coinBreakdown[t.coin].pnl += t.closedPnl;
      coinBreakdown[t.coin].fees += t.fee;
      coinBreakdown[t.coin].count++;
    }

    // Calculate win stats
    const winningTrades = trades.filter(t => t.closedPnl > 0).length;
    const losingTrades = trades.filter(t => t.closedPnl < 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        count: trades.length,
        totalVolume: trades.reduce((s, t) => s + t.notionalValue, 0),
        totalPnl: trades.reduce((s, t) => s + t.closedPnl, 0),
        totalFees: trades.reduce((s, t) => s + t.fee, 0),
        // Bonus: Win/loss stats
        winningTrades,
        losingTrades,
        winRate,
        // Bonus: Multi-coin breakdown
        coinBreakdown,
        uniqueCoins: Object.keys(coinBreakdown).length,
        trades,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v1-trades:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
