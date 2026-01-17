import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

interface NonFundingDelta {
  time: number;
  hash: string;
  usdc: string;
  type: string;
}

async function fetchUserNonFundingLedgerUpdates(user: string): Promise<NonFundingDelta[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      type: "userNonFundingLedgerUpdates", 
      user,
      startTime: 0 
    }),
  });
  if (!response.ok) throw new Error(`Failed to fetch ledger updates: ${response.status}`);
  const data = await response.json();
  return data || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const user = url.searchParams.get('user');
    const fromMs = url.searchParams.get('fromMs');
    const toMs = url.searchParams.get('toMs');

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'user parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ledgerUpdates = await fetchUserNonFundingLedgerUpdates(user);

    // Filter for deposits (positive USDC transfers)
    let deposits = ledgerUpdates
      .filter(update => {
        const usdc = parseFloat(update.usdc);
        return usdc > 0 && (update.type === 'deposit' || update.type === 'internalTransfer');
      })
      .map(update => ({
        timeMs: update.time,
        amount: parseFloat(update.usdc),
        txHash: update.hash,
        type: update.type,
      }));

    // Apply time filters
    if (fromMs) {
      deposits = deposits.filter(d => d.timeMs >= parseInt(fromMs));
    }
    if (toMs) {
      deposits = deposits.filter(d => d.timeMs <= parseInt(toMs));
    }

    // Sort by time descending
    deposits.sort((a, b) => b.timeMs - a.timeMs);

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

    return new Response(
      JSON.stringify({
        user,
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        totalDeposits,
        depositCount: deposits.length,
        deposits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v1-deposits:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
