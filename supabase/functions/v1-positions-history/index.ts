/**
 * Position History Endpoint (GET /v1-positions-history)
 * 
 * Returns time-ordered position states with taint detection.
 * Each state represents the position at a point in time.
 */

import { createDataSource } from "../_shared/datasource.ts";
import { normalizeFills, buildPositionHistory, reconstructLifecycles } from "../_shared/ledger-engine.ts";

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
    const includeLifecycles = url.searchParams.get('includeLifecycles') === 'true';
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
    const trades = normalizeFills(fills, targetBuilder);

    // Build position history (time-ordered states)
    let positions = buildPositionHistory(trades, targetBuilder, builderOnly);

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

    // Optionally include full lifecycle data
    let lifecycles = null;
    if (includeLifecycles) {
      lifecycles = reconstructLifecycles(trades, targetBuilder);
      
      // Filter lifecycles if builderOnly
      if (builderOnly) {
        lifecycles = lifecycles.filter(l => l.isBuilderOnly && !l.isTainted);
      }
      
      // Apply coin/time filters to lifecycles
      if (coin) {
        lifecycles = lifecycles.filter(l => l.coin === coin);
      }
      if (fromMs) {
        lifecycles = lifecycles.filter(l => l.startTime >= parseInt(fromMs));
      }
      if (toMs) {
        lifecycles = lifecycles.filter(l => !l.endTime || l.endTime <= parseInt(toMs));
      }
    }

    return new Response(
      JSON.stringify({
        user,
        coin: coin || 'all',
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        builderOnly,
        count: positions.length,
        positions: positions.map(p => ({
          timeMs: p.timeMs,
          coin: p.coin,
          netSize: p.netSize,
          avgEntryPx: p.avgEntryPx,
          side: p.side,
          tainted: p.tainted,
          builderOnly: p.builderOnly,
        })),
        ...(lifecycles && {
          lifecycleCount: lifecycles.length,
          lifecycles: lifecycles.map(l => ({
            id: l.id,
            coin: l.coin,
            side: l.side,
            startTime: l.startTime,
            endTime: l.endTime,
            avgEntryPx: l.avgEntryPx,
            avgExitPx: l.avgExitPx,
            maxSize: l.maxSize,
            realizedPnl: l.realizedPnl,
            feesPaid: l.feesPaid,
            tradeCount: l.tradeCount,
            isTainted: l.isTainted,
            isBuilderOnly: l.isBuilderOnly,
            status: l.status,
          })),
        }),
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
