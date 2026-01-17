/**
 * Leaderboard Endpoint (GET /v1-leaderboard)
 * 
 * Ranks users by a selected metric (pnl, returnPct, volume).
 * Supports builder-only mode which excludes tainted users.
 */

import { createDataSource } from "../_shared/datasource.ts";
import { normalizeFills, reconstructLifecycles, calculatePnL } from "../_shared/ledger-engine.ts";
import type { LeaderboardEntry } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default test wallets for the hackathon
const DEFAULT_TEST_WALLETS = [
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
  builderTradeCount: number;
  tainted: boolean;
  lifecycleStats: {
    open: number;
    closed: number;
    tainted: number;
    total: number;
  };
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
    const dataSource = createDataSource();
    
    const [fills, state] = await Promise.all([
      dataSource.fetchUserFills(user),
      dataSource.fetchClearinghouseState(user),
    ]);

    // Normalize and reconstruct
    const trades = normalizeFills(fills, targetBuilder);
    const lifecycles = reconstructLifecycles(trades, targetBuilder);

    // Calculate PnL
    const result = calculatePnL(
      trades,
      lifecycles,
      state,
      user,
      coin,
      fromMs,
      toMs,
      builderOnly,
      maxStartCapital
    );

    // For builder-only leaderboard, exclude tainted users entirely
    if (builderOnly && result.tainted) {
      return null;
    }

    // Calculate lifecycle stats
    const relevantLifecycles = builderOnly 
      ? lifecycles.filter(l => l.isBuilderOnly && !l.isTainted)
      : lifecycles;

    return {
      user,
      volume: result.volume,
      pnl: result.realizedPnl,
      returnPct: result.returnPct,
      tradeCount: result.tradeCount,
      builderTradeCount: result.builderTradeCount,
      tainted: result.tainted,
      lifecycleStats: {
        open: relevantLifecycles.filter(l => l.status === 'open').length,
        closed: relevantLifecycles.filter(l => l.status === 'closed').length,
        tainted: lifecycles.filter(l => l.isTainted).length,
        total: relevantLifecycles.length,
      },
    };
  } catch (error) {
    console.error(`Error calculating metrics for ${user}:`, error);
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
    const maxStartCapitalParam = url.searchParams.get('maxStartCapital');
    const builderOnly = url.searchParams.get('builderOnly') === 'true';
    const excludeTainted = url.searchParams.get('excludeTainted') === 'true';
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';
    const envMaxStartCapital = Deno.env.get('MAX_START_CAPITAL');
    
    const maxStartCapital = maxStartCapitalParam 
      ? parseFloat(maxStartCapitalParam) 
      : envMaxStartCapital 
        ? parseFloat(envMaxStartCapital) 
        : 10000;

    // Get users list from query param or use defaults
    const usersParam = url.searchParams.get('users');
    const users = usersParam 
      ? usersParam.split(',').map(u => u.trim().toLowerCase())
      : DEFAULT_TEST_WALLETS;

    // Calculate metrics for all users in parallel
    const metricsPromises = users.map(user =>
      calculateUserMetrics(
        user,
        coin,
        fromMs ? parseInt(fromMs) : null,
        toMs ? parseInt(toMs) : null,
        builderOnly,
        maxStartCapital,
        targetBuilder
      )
    );

    const allMetrics = await Promise.all(metricsPromises);
    let validMetrics = allMetrics.filter((m): m is UserMetrics => m !== null);

    // Optionally exclude tainted users
    if (excludeTainted) {
      validMetrics = validMetrics.filter(m => !m.tainted);
    }

    // Sort by selected metric
    validMetrics.sort((a, b) => {
      switch (metric) {
        case 'volume':
          return b.volume - a.volume;
        case 'returnPct':
          return b.returnPct - a.returnPct;
        case 'tradeCount':
          return b.tradeCount - a.tradeCount;
        case 'pnl':
        default:
          return b.pnl - a.pnl;
      }
    });

    // Build ranked leaderboard
    const leaderboard: LeaderboardEntry[] = validMetrics.map((m, index) => ({
      rank: index + 1,
      user: m.user,
      metricValue: metric === 'volume' ? m.volume 
        : metric === 'returnPct' ? m.returnPct 
        : metric === 'tradeCount' ? m.tradeCount 
        : m.pnl,
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
        excludeTainted,
        count: leaderboard.length,
        totalUsersQueried: users.length,
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
