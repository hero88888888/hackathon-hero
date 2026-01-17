import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
  };
  assetPositions: Array<{
    position: {
      coin: string;
      szi: string;
      entryPx: string;
      positionValue: string;
      unrealizedPnl: string;
      leverage: { type: string; value: number };
    };
  }>;
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

async function fetchClearinghouseState(user: string): Promise<ClearinghouseState> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  if (!response.ok) throw new Error(`Failed to fetch clearinghouse state: ${response.status}`);
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
    const maxStartCapital = url.searchParams.get('maxStartCapital');
    const targetBuilder = Deno.env.get('TARGET_BUILDER_TAG') || '';

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'user parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch data
    const [fills, clearinghouseState] = await Promise.all([
      fetchUserFills(user),
      fetchClearinghouseState(user),
    ]);

    // Filter fills
    let filteredFills = [...fills];
    if (coin) {
      filteredFills = filteredFills.filter(f => f.coin === coin);
    }
    if (fromMs) {
      filteredFills = filteredFills.filter(f => f.time >= parseInt(fromMs));
    }
    if (toMs) {
      filteredFills = filteredFills.filter(f => f.time <= parseInt(toMs));
    }

    // Track builder attribution and tainting
    let hasBuilderTrades = false;
    let hasNonBuilderTrades = false;
    let realizedPnl = 0;
    let feesPaid = 0;
    let volume = 0;
    let tradeCount = 0;
    let builderTradeCount = 0;

    for (const fill of filteredFills) {
      const isBuilderTrade = targetBuilder ? 
        (fill.builder === targetBuilder || (fill.builderFee && parseFloat(fill.builderFee) > 0)) : 
        !!(fill.builder || (fill.builderFee && parseFloat(fill.builderFee) > 0));

      if (isBuilderTrade) {
        hasBuilderTrades = true;
        builderTradeCount++;
      } else {
        hasNonBuilderTrades = true;
      }

      // If builderOnly, only count builder trades
      if (builderOnly && !isBuilderTrade) continue;

      realizedPnl += parseFloat(fill.closedPnl);
      feesPaid += parseFloat(fill.fee);
      volume += parseFloat(fill.px) * parseFloat(fill.sz);
      tradeCount++;
    }

    // Calculate tainted status
    const tainted = builderOnly && hasBuilderTrades && hasNonBuilderTrades;

    // Calculate returnPct using capped normalization
    const accountValue = parseFloat(clearinghouseState?.marginSummary?.accountValue || '0');
    const unrealizedPnl = clearinghouseState?.assetPositions?.reduce(
      (sum, ap) => sum + parseFloat(ap.position.unrealizedPnl || '0'),
      0
    ) || 0;
    
    // Estimate starting equity (current equity minus realized PnL)
    const estimatedStartEquity = accountValue - realizedPnl + feesPaid;
    
    // Apply capped normalization
    const maxCap = maxStartCapital ? parseFloat(maxStartCapital) : 10000;
    const effectiveCapital = Math.min(Math.max(estimatedStartEquity, 100), maxCap);
    
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
        feesPaid,
        volume,
        tradeCount,
        builderTradeCount,
        tainted,
        effectiveCapital,
        currentEquity: accountValue,
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
