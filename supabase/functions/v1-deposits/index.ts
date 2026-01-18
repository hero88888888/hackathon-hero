/**
 * Deposits Endpoint (GET /v1-deposits) - Bonus Feature
 * Tracks deposit/withdrawal history for fair competition filtering.
 * 
 * BONUS FEATURES:
 * - Net deposits calculation
 * - Withdrawal tracking
 * - Internal transfer detection
 * - Time-series deposit flow
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
  fee?: string;
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

    // Process all fund movements
    let deposits: any[] = [];
    let withdrawals: any[] = [];
    let internalTransfers: any[] = [];

    for (const u of updates) {
      const amount = parseFloat(u.usdc);
      const entry = {
        timeMs: u.time,
        amount: Math.abs(amount),
        txHash: u.hash,
        type: u.type,
        fee: parseFloat(u.fee || '0'),
      };

      if (u.type === 'deposit' || (u.type === 'internalTransfer' && amount > 0)) {
        deposits.push({ ...entry, direction: 'in' });
      } else if (u.type === 'withdraw' || (u.type === 'internalTransfer' && amount < 0)) {
        withdrawals.push({ ...entry, direction: 'out', amount: Math.abs(amount) });
      }

      if (u.type === 'internalTransfer') {
        internalTransfers.push(entry);
      }
    }

    // Apply time filters
    if (fromMs) {
      const from = parseInt(fromMs);
      deposits = deposits.filter(d => d.timeMs >= from);
      withdrawals = withdrawals.filter(d => d.timeMs >= from);
      internalTransfers = internalTransfers.filter(d => d.timeMs >= from);
    }
    if (toMs) {
      const to = parseInt(toMs);
      deposits = deposits.filter(d => d.timeMs <= to);
      withdrawals = withdrawals.filter(d => d.timeMs <= to);
      internalTransfers = internalTransfers.filter(d => d.timeMs <= to);
    }

    // Sort by time (most recent first)
    deposits.sort((a, b) => b.timeMs - a.timeMs);
    withdrawals.sort((a, b) => b.timeMs - a.timeMs);
    internalTransfers.sort((a, b) => b.timeMs - a.timeMs);

    const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
    const totalWithdrawals = withdrawals.reduce((s, d) => s + d.amount, 0);
    const netDeposits = totalDeposits - totalWithdrawals;

    // Time-series flow (daily aggregation)
    const dailyFlow: Record<string, { deposits: number; withdrawals: number; net: number }> = {};
    for (const d of deposits) {
      const day = new Date(d.timeMs).toISOString().split('T')[0];
      if (!dailyFlow[day]) dailyFlow[day] = { deposits: 0, withdrawals: 0, net: 0 };
      dailyFlow[day].deposits += d.amount;
      dailyFlow[day].net += d.amount;
    }
    for (const w of withdrawals) {
      const day = new Date(w.timeMs).toISOString().split('T')[0];
      if (!dailyFlow[day]) dailyFlow[day] = { deposits: 0, withdrawals: 0, net: 0 };
      dailyFlow[day].withdrawals += w.amount;
      dailyFlow[day].net -= w.amount;
    }

    const flowTimeSeries = Object.entries(dailyFlow)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return new Response(
      JSON.stringify({
        user,
        fromMs: fromMs ? parseInt(fromMs) : null,
        toMs: toMs ? parseInt(toMs) : null,
        // Core metrics
        totalDeposits,
        totalWithdrawals,
        netDeposits,
        depositCount: deposits.length,
        withdrawalCount: withdrawals.length,
        // Bonus: Transfer tracking
        internalTransferCount: internalTransfers.length,
        // Bonus: Time series
        flowTimeSeries,
        // Detail arrays
        deposits,
        withdrawals,
        internalTransfers,
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
