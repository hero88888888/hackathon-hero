# Hyperliquid Trade Ledger API - Docker Configuration
FROM denoland/deno:1.40.0

WORKDIR /app

# Copy edge functions
COPY supabase/functions/ ./functions/

# Create unified server
RUN cat > /app/functions/server.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HL_API_URL = "https://api.hyperliquid.xyz/info";

async function fetchFills(user: string) {
  const res = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user }),
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function fetchState(user: string) {
  const res = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

const PORT = parseInt(Deno.env.get("PORT") || "8080");

serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", version: "1.0.0" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/" || url.pathname === "/docs") {
    return new Response(JSON.stringify({
      name: "Hyperliquid Trade Ledger API",
      version: "1.0.0",
      endpoints: ["/v1-trades", "/v1-positions-history", "/v1-pnl", "/v1-leaderboard", "/v1-deposits"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const user = url.searchParams.get("user");
    const targetBuilder = Deno.env.get("TARGET_BUILDER_TAG") || "";

    if (url.pathname.includes("trades")) {
      if (!user) throw new Error("user required");
      const fills = await fetchFills(user);
      const trades = fills.map((f: any) => ({
        timeMs: f.time,
        coin: f.coin,
        side: f.side,
        px: parseFloat(f.px),
        sz: parseFloat(f.sz),
        closedPnl: parseFloat(f.closedPnl),
        isBuilderTrade: !!(f.builder || parseFloat(f.builderFee || "0") > 0),
      }));
      return new Response(JSON.stringify({ user, count: trades.length, trades }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname.includes("pnl")) {
      if (!user) throw new Error("user required");
      const [fills, state] = await Promise.all([fetchFills(user), fetchState(user)]);
      const pnl = fills.reduce((s: number, f: any) => s + parseFloat(f.closedPnl), 0);
      const equity = parseFloat(state?.marginSummary?.accountValue || "0");
      return new Response(JSON.stringify({ user, realizedPnl: pnl, currentEquity: equity }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { port: PORT });

console.log(`Server running on port ${PORT}`);
EOF

EXPOSE 8080

ENV PORT=8080
ENV TARGET_BUILDER_TAG=""
ENV MAX_START_CAPITAL=10000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "/app/functions/server.ts"]
