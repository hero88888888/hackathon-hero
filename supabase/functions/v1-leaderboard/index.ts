import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

// Test wallet addresses for the hackathon
const TEST_WALLETS = [
  "0x0e09b56ef137f417e424f1265425e93bfff77e17",
  "0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74",
  "0x6c8031a9eb4415284f3f89c0420f697c87168263",
];

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
  marginSummary: {
    accountValue: string;
  };
}

async function fetchUserFills(user: string): Promise<HyperliquidFill[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch fills for ${user}`);
  return response.json();
}

async function fetchClearinghouseState(user: string): Promise<ClearinghouseState> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch state for ${user}`);
  return response.json();
}

interface UserMetrics {
  user: string;
  volume: number;
  pnl: number;
  returnPct: number;
  tradeCount: number;
  tainted: boolean;
}

async function calculateUserMetrics(
  user: string,
  coin: string | null,
  fromMs: number | null,
  toMs: number | null,
  builderOnly: boolean,
  maxStartCapital: number,
  targetBuilder: string
): Promise<UserMetrics | null> {
  try {
    const [fills, state] = await Promise.all([
      fetchUserFills(user),
      fetchClearinghouseState(user),
    ]);

    let filteredFills = [...fills];
    if (coin) filteredFills = filteredFills.filter(f => f.coin === coin);
    if (fromMs) filteredFills = filteredFills.filter(f => f.time >= fromMs);
    if (toMs) filteredFills = filteredFills.filter(f => f.time <= toMs);

    let hasBuilderTrades = false;
    let hasNonBuilderTrades = false;
    let volume = 0;
    let pnl = 0;
    let fees = 0;
    let tradeCount = 0;

    for (const fill of filteredFills) {
      const isBuilderTrade = targetBuilder
        ? fill.builder === targetBuilder || (fill.builderFee && parseFloat(fill.builderFee) > 0)
        : !!(fill.builder || (fill.builderFee && parseFloat(fill.builderFee) > 0));

      if (isBuilderTrade) hasBuilderTrades = true;
      else hasNonBuilderTrades = true;

      if (builderOnly && !isBuilderTrade) continue;

      volume += parseFloat(fill.px) * parseFloat(fill.sz);
      pnl += parseFloat(fill.closedPnl);
      fees += parseFloat(fill.fee);
      tradeCount++;
    }

    const tainted = builderOnly && hasBuilderTrades && hasNonBuilderTrades;

    // Exclude tainted users from builder-only leaderboard
    if (builderOnly && tainted) return null;

    const accountValue = parseFloat(state?.marginSummary?.accountValue || '0');
    const estimatedStartEquity = accountValue - pnl + fees;
    const effectiveCapital = Math.min(Math.max(estimatedStartEquity, 100), maxStartCapital);
    const returnPct = effectiveCapital > 0 ? (pnl / effectiveCapital) * 100 : 0;

    return {
      user,
      volume,
      pnl,
      returnPct,
      tradeCount,
      tainted,
    };
  } catch (error) {
    console.error(`Error fetching metrics for ${user}:`, error);
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
    const maxStartCapital = parseFloat(url.searchParams.get('maxStartCapital') || '10000');
    const builderOnly = url.searchParams.get('builderOnly') === 'true';
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';

    // Get additional users from query param or use test wallets
    const usersParam = url.searchParams.get('users');
    const users = usersParam ? usersParam.split(',') : TEST_WALLETS;

    // Fetch metrics for all users in parallel
    const metricsPromises = users.map(user =>
      calculateUserMetrics(
        user.toLowerCase(),
        coin,
        fromMs ? parseInt(fromMs) : null,
        toMs ? parseInt(toMs) : null,
        builderOnly,
        maxStartCapital,
        targetBuilder
      )
    );

    const allMetrics = await Promise.all(metricsPromises);
    const validMetrics = allMetrics.filter((m): m is UserMetrics => m !== null);

    // Sort by selected metric
    validMetrics.sort((a, b) => {
      switch (metric) {
        case 'volume':
          return b.volume - a.volume;
        case 'returnPct':
          return b.returnPct - a.returnPct;
        case 'pnl':
        default:
          return b.pnl - a.pnl;
      }
    });

    // Add ranks
    const rankedLeaderboard = validMetrics.map((m, index) => ({
      rank: index + 1,
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
        maxStartCapital,
        builderOnly,
        count: rankedLeaderboard.length,
        leaderboard: rankedLeaderboard,
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
