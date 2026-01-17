/**
 * PnL Endpoint (GET /v1-pnl)
 * 
 * Returns realized PnL and return percentage with capped normalization.
 * Implements the formula: returnPct = realizedPnl / effectiveCapital * 100
 * Where: effectiveCapital = min(equityAtStart, maxStartCapital)
 */

import { createDataSource } from "../_shared/datasource.ts";
import { normalizeFills, reconstructLifecycles, calculatePnL } from "../_shared/ledger-engine.ts";

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
    const maxStartCapitalParam = url.searchParams.get('maxStartCapital');
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';
    const envMaxStartCapital = Deno.env.get('MAX_START_CAPITAL');
    
    // Priority: query param > env var > default
    const maxStartCapital = maxStartCapitalParam 
      ? parseFloat(maxStartCapitalParam) 
      : envMaxStartCapital 
        ? parseFloat(envMaxStartCapital) 
        : 10000;

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'user parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use datasource abstraction
    const dataSource = createDataSource();
    
    // Fetch data in parallel
    const [fills, clearinghouseState] = await Promise.all([
      dataSource.fetchUserFills(user),
      dataSource.fetchClearinghouseState(user),
    ]);

    // Normalize fills with builder attribution
    const trades = normalizeFills(fills, targetBuilder);

    // Reconstruct lifecycles for taint-aware PnL calculation
    const lifecycles = reconstructLifecycles(trades, targetBuilder);

    // Calculate PnL with capped normalization
    const result = calculatePnL(
      trades,
      lifecycles,
      clearinghouseState,
      user,
      coin,
      fromMs ? parseInt(fromMs) : null,
      toMs ? parseInt(toMs) : null,
      builderOnly,
      maxStartCapital
    );

    // Calculate lifecycle statistics
    const relevantLifecycles = builderOnly 
      ? lifecycles.filter(l => l.isBuilderOnly && !l.isTainted)
      : lifecycles;
    
    const openLifecycles = relevantLifecycles.filter(l => l.status === 'open').length;
    const closedLifecycles = relevantLifecycles.filter(l => l.status === 'closed').length;
    const taintedLifecycles = lifecycles.filter(l => l.isTainted).length;

    return new Response(
      JSON.stringify({
        user: result.user,
        coin: result.coin || 'all',
        fromMs: result.fromMs,
        toMs: result.toMs,
        builderOnly: result.builderOnly,
        maxStartCapital,
        
        // Core metrics
        realizedPnl: result.realizedPnl,
        unrealizedPnl: result.unrealizedPnl,
        returnPct: result.returnPct,
        
        // Normalization details
        effectiveCapital: result.effectiveCapital,
        currentEquity: result.currentEquity,
        
        // Trade stats
        feesPaid: result.feesPaid,
        volume: result.volume,
        tradeCount: result.tradeCount,
        builderTradeCount: result.builderTradeCount,
        
        // Taint status
        tainted: result.tainted,
        
        // Lifecycle stats
        lifecycleStats: {
          open: openLifecycles,
          closed: closedLifecycles,
          tainted: taintedLifecycles,
          total: relevantLifecycles.length,
        },
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
