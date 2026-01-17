/**
 * Deposits Endpoint (GET /v1-deposits) - Bonus Feature
 * Tracks deposit history for fair competition filtering.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

interface LedgerUpdate {
  time: number;
  hash: string;
  usdc: string;
  type: string;
}

async function fetchLedgerUpdates(user: string): Promise<LedgerUpdate[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userNonFundingLedgerUpdates", user, startTime: 0 }),
  });
  if (!response.ok) throw new Error(`Failed to fetch ledger: ${response.status}`);
  return response.json() || [];
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

    const updates = await fetchLedgerUpdates(user);

    // Filter for deposits (positive USDC)
    let deposits = updates
      .filter(u => parseFloat(u.usdc) > 0 && (u.type === 'deposit' || u.type === 'internalTransfer'))
      .map(u => ({
        timeMs: u.time,
        amount: parseFloat(u.usdc),
        txHash: u.hash,
        type: u.type,
      }));

    if (fromMs) deposits = deposits.filter(d => d.timeMs >= parseInt(fromMs));
    if (toMs) deposits = deposits.filter(d => d.timeMs <= parseInt(toMs));

    deposits.sort((a, b) => b.timeMs - a.timeMs);

    return new Response(
      JSON.stringify({
        user,
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        totalDeposits: deposits.reduce((s, d) => s + d.amount, 0),
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
