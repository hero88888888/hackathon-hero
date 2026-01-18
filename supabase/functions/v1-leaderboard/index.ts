/**
 * Leaderboard Endpoint (GET /v1-leaderboard)
 * Ranks users by pnl, returnPct, or volume.
 * 
 * BONUS FEATURES:
 * - Win rate tracking
 * - Fees paid tracking
 * - Multi-coin breakdown per user
 * - Best/worst trade stats
 * - Risk-adjusted metrics
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

const DEFAULT_WALLETS = [
  "0x0e09b56ef137f417e424f1265425e93bfff77e17",
  "0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74",
  "0x6c8031a9eb4415284f3f89c0420f697c87168263",
];

interface UserMetrics {
  user: string;
  volume: number;
  pnl: number;
  returnPct: number;
  tradeCount: number;
  tainted: boolean;
  // Bonus fields
  winRate: number;
  winningTrades: number;
  losingTrades: number;
  feesPaid: number;
  bestTrade: number;
  worstTrade: number;
  avgPnl: number;
  uniqueCoins: number;
  coinBreakdown: Record<string, { volume: number; pnl: number; count: number }>;
  currentEquity: number;
  profitFactor: number; // gross profit / gross loss
}

async function getMetrics(
  user: string,
  coin: string | null,
  fromMs: number | null,
  toMs: number | null,
  builderOnly: boolean,
  maxCap: number,
  targetBuilder: string
): Promise<UserMetrics | null> {
  try {
    const [fillsRes, stateRes] = await Promise.all([
      fetch(HL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "userFills", user }),
      }),
      fetch(HL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clearinghouseState", user }),
      }),
    ]);

    if (!fillsRes.ok || !stateRes.ok) return null;

    const fills = await fillsRes.json();
    const state = await stateRes.json();

    let filtered = [...fills];
    if (coin) filtered = filtered.filter((f: any) => f.coin === coin);
    if (fromMs) filtered = filtered.filter((f: any) => f.time >= fromMs);
    if (toMs) filtered = filtered.filter((f: any) => f.time <= toMs);

    let hasBuilder = false;
    let hasNonBuilder = false;
    let pnl = 0;
    let fees = 0;
    let volume = 0;
    let tradeCount = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = 0;
    let worstTrade = 0;
    const coinBreakdown: Record<string, { volume: number; pnl: number; count: number }> = {};

    for (const fill of filtered) {
      const isBuilder = targetBuilder
        ? (fill.builder === targetBuilder || parseFloat(fill.builderFee || '0') > 0)
        : !!(fill.builder || parseFloat(fill.builderFee || '0') > 0);

      if (isBuilder) hasBuilder = true;
      else hasNonBuilder = true;

      if (builderOnly && !isBuilder) continue;

      const tradePnl = parseFloat(fill.closedPnl);
      const tradeFee = parseFloat(fill.fee);
      const tradeVolume = parseFloat(fill.px) * parseFloat(fill.sz);
      const coinName = fill.coin;

      pnl += tradePnl;
      fees += tradeFee;
      volume += tradeVolume;
      tradeCount++;

      if (tradePnl > 0) {
        winningTrades++;
        grossProfit += tradePnl;
      } else if (tradePnl < 0) {
        losingTrades++;
        grossLoss += Math.abs(tradePnl);
      }

      bestTrade = Math.max(bestTrade, tradePnl);
      worstTrade = Math.min(worstTrade, tradePnl);

      if (!coinBreakdown[coinName]) {
        coinBreakdown[coinName] = { volume: 0, pnl: 0, count: 0 };
      }
      coinBreakdown[coinName].volume += tradeVolume;
      coinBreakdown[coinName].pnl += tradePnl;
      coinBreakdown[coinName].count++;
    }

    const tainted = builderOnly && hasBuilder && hasNonBuilder;
    if (builderOnly && tainted) return null;

    const equity = parseFloat(state?.marginSummary?.accountValue || '0');
    const startEquity = equity - pnl + fees;
    const effectiveCap = Math.min(Math.max(startEquity, 100), maxCap);
    const returnPct = effectiveCap > 0 ? (pnl / effectiveCap) * 100 : 0;
    const winRate = tradeCount > 0 ? (winningTrades / tradeCount) * 100 : 0;
    const avgPnl = tradeCount > 0 ? pnl / tradeCount : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      user,
      volume,
      pnl,
      returnPct,
      tradeCount,
      tainted,
      winRate,
      winningTrades,
      losingTrades,
      feesPaid: fees,
      bestTrade,
      worstTrade,
      avgPnl,
      uniqueCoins: Object.keys(coinBreakdown).length,
      coinBreakdown,
      currentEquity: equity,
      profitFactor: profitFactor === Infinity ? 999 : profitFactor,
    };
  } catch (e) {
    console.error(`Error for ${user}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const coin = url.searchParams.get('coin');
    const fromMs = url.searchParams.get('fromMs');
    const toMs = url.searchParams.get('toMs');
    const metric = url.searchParams.get('metric') || 'pnl';
    const maxCap = parseFloat(url.searchParams.get('maxStartCapital') || '10000');
    const builderOnly = url.searchParams.get('builderOnly') === 'true';
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';

    const usersParam = url.searchParams.get('users');
    const users = usersParam ? usersParam.split(',').map(u => u.trim().toLowerCase()) : DEFAULT_WALLETS;

    const results = await Promise.all(
      users.map(u => getMetrics(u, coin, fromMs ? parseInt(fromMs) : null, toMs ? parseInt(toMs) : null, builderOnly, maxCap, targetBuilder))
    );

    const valid = results.filter((m): m is UserMetrics => m !== null);

    // Support multiple sort metrics
    valid.sort((a, b) => {
      if (metric === 'volume') return b.volume - a.volume;
      if (metric === 'returnPct') return b.returnPct - a.returnPct;
      if (metric === 'winRate') return b.winRate - a.winRate;
      if (metric === 'profitFactor') return b.profitFactor - a.profitFactor;
      if (metric === 'tradeCount') return b.tradeCount - a.tradeCount;
      return b.pnl - a.pnl;
    });

    const leaderboard = valid.map((m, i) => ({
      rank: i + 1,
      user: m.user,
      metricValue: metric === 'volume' ? m.volume 
        : metric === 'returnPct' ? m.returnPct 
        : metric === 'winRate' ? m.winRate
        : metric === 'profitFactor' ? m.profitFactor
        : metric === 'tradeCount' ? m.tradeCount
        : m.pnl,
      volume: m.volume,
      pnl: m.pnl,
      returnPct: m.returnPct,
      tradeCount: m.tradeCount,
      tainted: m.tainted,
      // Bonus fields
      winRate: m.winRate,
      winningTrades: m.winningTrades,
      losingTrades: m.losingTrades,
      feesPaid: m.feesPaid,
      bestTrade: m.bestTrade,
      worstTrade: m.worstTrade,
      avgPnl: m.avgPnl,
      uniqueCoins: m.uniqueCoins,
      currentEquity: m.currentEquity,
      profitFactor: m.profitFactor,
      coinBreakdown: m.coinBreakdown,
    }));

    // Aggregate stats
    const totalVolume = valid.reduce((s, m) => s + m.volume, 0);
    const totalPnl = valid.reduce((s, m) => s + m.pnl, 0);
    const totalTrades = valid.reduce((s, m) => s + m.tradeCount, 0);
    const avgWinRate = valid.length > 0 ? valid.reduce((s, m) => s + m.winRate, 0) / valid.length : 0;

    return new Response(
      JSON.stringify({
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        metric,
        builderOnly,
        count: leaderboard.length,
        // Bonus: Aggregate stats
        aggregateStats: {
          totalVolume,
          totalPnl,
          totalTrades,
          avgWinRate,
          participantCount: valid.length,
        },
        leaderboard,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v1-leaderboard:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
