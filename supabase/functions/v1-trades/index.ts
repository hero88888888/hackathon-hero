/**
 * Trade History Endpoint (GET /v1-trades)
 * 
 * Returns normalized list of fills for a specific user.
 * Implements strict builder-only filtering with taint detection.
 */

import { createDataSource } from "../_shared/datasource.ts";
import { normalizeFills, reconstructLifecycles, filterTradesForOutput } from "../_shared/ledger-engine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Use datasource abstraction
    const dataSource = createDataSource();
    const fills = await dataSource.fetchUserFills(user);

    // Normalize fills with builder attribution
    let trades = normalizeFills(fills, targetBuilder);

    // Apply time/coin filters BEFORE lifecycle reconstruction
    if (coin) {
      trades = trades.filter(t => t.coin === coin);
    }
    if (fromMs) {
      trades = trades.filter(t => t.timeMs >= parseInt(fromMs));
    }
    if (toMs) {
      trades = trades.filter(t => t.timeMs <= parseInt(toMs));
    }

    // For builderOnly mode, we need lifecycle-aware filtering
    // to properly handle the taint virus effect
    let outputTrades = trades;
    if (builderOnly) {
      // Reconstruct lifecycles to detect tainting
      const lifecycles = reconstructLifecycles(trades, targetBuilder);
      // Filter out trades from tainted lifecycles AND non-builder trades
      outputTrades = filterTradesForOutput(trades, lifecycles, true);
    }

    // Sort by time descending (most recent first)
    outputTrades.sort((a, b) => b.timeMs - a.timeMs);

    // Calculate aggregate stats for response
    const totalVolume = outputTrades.reduce((sum, t) => sum + t.notionalValue, 0);
    const totalPnl = outputTrades.reduce((sum, t) => sum + t.closedPnl, 0);
    const totalFees = outputTrades.reduce((sum, t) => sum + t.fee, 0);

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        targetBuilder: targetBuilder || null,
        count: outputTrades.length,
        totalVolume,
        totalPnl,
        totalFees,
        trades: outputTrades.map(t => ({
          timeMs: t.timeMs,
          coin: t.coin,
          side: t.side,
          px: t.px,
          sz: t.sz,
          fee: t.fee,
          closedPnl: t.closedPnl,
          notionalValue: t.notionalValue,
          hash: t.hash,
          oid: t.oid,
          tid: t.tid,
          builder: t.builder,
          isBuilderTrade: t.isBuilderTrade,
        })),
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
