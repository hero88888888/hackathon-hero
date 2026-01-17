/**
 * Leaderboard Endpoint (GET /v1-leaderboard)
 * Ranks users by pnl, returnPct, or volume.
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

    for (const fill of filtered) {
      const isBuilder = targetBuilder
        ? (fill.builder === targetBuilder || parseFloat(fill.builderFee || '0') > 0)
        : !!(fill.builder || parseFloat(fill.builderFee || '0') > 0);

      if (isBuilder) hasBuilder = true;
      else hasNonBuilder = true;

      if (builderOnly && !isBuilder) continue;

      pnl += parseFloat(fill.closedPnl);
      fees += parseFloat(fill.fee);
      volume += parseFloat(fill.px) * parseFloat(fill.sz);
      tradeCount++;
    }

    const tainted = builderOnly && hasBuilder && hasNonBuilder;
    if (builderOnly && tainted) return null;

    const equity = parseFloat(state?.marginSummary?.accountValue || '0');
    const startEquity = equity - pnl + fees;
    const effectiveCap = Math.min(Math.max(startEquity, 100), maxCap);
    const returnPct = effectiveCap > 0 ? (pnl / effectiveCap) * 100 : 0;

    return { user, volume, pnl, returnPct, tradeCount, tainted };
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

    valid.sort((a, b) => {
      if (metric === 'volume') return b.volume - a.volume;
      if (metric === 'returnPct') return b.returnPct - a.returnPct;
      return b.pnl - a.pnl;
    });

    const leaderboard = valid.map((m, i) => ({
      rank: i + 1,
      user: m.user,
      metricValue: metric === 'volume' ? m.volume : metric === 'returnPct' ? m.returnPct : m.pnl,
      volume: m.volume,
      pnl: m.pnl,
      returnPct: m.returnPct,
      tradeCount: m.tradeCount,
      tainted: m.tainted,
    }));

    return new Response(
      JSON.stringify({
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        metric,
        builderOnly,
        count: leaderboard.length,
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
