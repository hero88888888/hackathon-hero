# Hyperliquid Trade Ledger API - Docker Configuration
# 
# This Dockerfile creates a containerized version of the Trade Ledger API
# using Deno for edge function execution.
#
# Build: docker build -t hl-trade-ledger .
# Run: docker run -p 8080:8080 -e TARGET_BUILDER_TAG=0x... hl-trade-ledger

FROM denoland/deno:1.40.0

WORKDIR /app

# Copy Supabase edge functions and shared modules
COPY supabase/functions/ ./functions/

# Create entrypoint script that runs all edge functions
RUN echo '#!/bin/sh\n\
echo "Starting Hyperliquid Trade Ledger API..."\n\
echo "Available endpoints:"\n\
echo "  - GET /v1-trades"\n\
echo "  - GET /v1-positions-history"\n\
echo "  - GET /v1-pnl"\n\
echo "  - GET /v1-leaderboard"\n\
echo "  - GET /v1-deposits"\n\
echo ""\n\
echo "Environment:"\n\
echo "  TARGET_BUILDER_TAG: ${TARGET_BUILDER_TAG:-not set}"\n\
echo "  MAX_START_CAPITAL: ${MAX_START_CAPITAL:-10000}"\n\
echo "  DATASOURCE_TYPE: ${DATASOURCE_TYPE:-public}"\n\
echo ""\n\
\n\
# Start the main API server\n\
deno run --allow-net --allow-env --allow-read /app/functions/server.ts\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Create unified server that handles all endpoints
RUN echo 'import { serve } from "https://deno.land/std@0.168.0/http/server.ts";\n\
\n\
const corsHeaders = {\n\
  "Access-Control-Allow-Origin": "*",\n\
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",\n\
};\n\
\n\
const HL_API_URL = "https://api.hyperliquid.xyz/info";\n\
\n\
async function fetchUserFills(user: string) {\n\
  const response = await fetch(HL_API_URL, {\n\
    method: "POST",\n\
    headers: { "Content-Type": "application/json" },\n\
    body: JSON.stringify({ type: "userFills", user }),\n\
  });\n\
  if (!response.ok) throw new Error(`Failed to fetch fills: ${response.status}`);\n\
  return response.json();\n\
}\n\
\n\
async function fetchClearinghouseState(user: string) {\n\
  const response = await fetch(HL_API_URL, {\n\
    method: "POST",\n\
    headers: { "Content-Type": "application/json" },\n\
    body: JSON.stringify({ type: "clearinghouseState", user }),\n\
  });\n\
  if (!response.ok) throw new Error(`Failed to fetch state: ${response.status}`);\n\
  return response.json();\n\
}\n\
\n\
const PORT = parseInt(Deno.env.get("PORT") || "8080");\n\
\n\
serve(async (req: Request) => {\n\
  const url = new URL(req.url);\n\
  \n\
  if (req.method === "OPTIONS") {\n\
    return new Response(null, { headers: corsHeaders });\n\
  }\n\
  \n\
  // Health check\n\
  if (url.pathname === "/health") {\n\
    return new Response(JSON.stringify({ status: "healthy", version: "1.0.0" }), {\n\
      headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
    });\n\
  }\n\
  \n\
  // API documentation\n\
  if (url.pathname === "/" || url.pathname === "/docs") {\n\
    return new Response(JSON.stringify({\n\
      name: "Hyperliquid Trade Ledger API",\n\
      version: "1.0.0",\n\
      endpoints: [\n\
        { path: "/v1-trades", method: "GET", params: ["user", "coin?", "fromMs?", "toMs?", "builderOnly?"] },\n\
        { path: "/v1-positions-history", method: "GET", params: ["user", "coin?", "fromMs?", "toMs?", "builderOnly?"] },\n\
        { path: "/v1-pnl", method: "GET", params: ["user", "coin?", "fromMs?", "toMs?", "builderOnly?", "maxStartCapital?"] },\n\
        { path: "/v1-leaderboard", method: "GET", params: ["users?", "metric?", "builderOnly?"] },\n\
        { path: "/v1-deposits", method: "GET", params: ["user", "fromMs?", "toMs?"] },\n\
      ],\n\
    }), {\n\
      headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
    });\n\
  }\n\
  \n\
  // Route to appropriate handler\n\
  try {\n\
    const user = url.searchParams.get("user");\n\
    const targetBuilder = Deno.env.get("TARGET_BUILDER_TAG") || "";\n\
    \n\
    if (url.pathname.startsWith("/v1-trades") || url.pathname.startsWith("/v1/trades")) {\n\
      if (!user) throw new Error("user parameter required");\n\
      const fills = await fetchUserFills(user);\n\
      return new Response(JSON.stringify({ user, count: fills.length, trades: fills }), {\n\
        headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
      });\n\
    }\n\
    \n\
    if (url.pathname.startsWith("/v1-pnl") || url.pathname.startsWith("/v1/pnl")) {\n\
      if (!user) throw new Error("user parameter required");\n\
      const [fills, state] = await Promise.all([fetchUserFills(user), fetchClearinghouseState(user)]);\n\
      const pnl = fills.reduce((sum: number, f: any) => sum + parseFloat(f.closedPnl), 0);\n\
      return new Response(JSON.stringify({ user, realizedPnl: pnl }), {\n\
        headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
      });\n\
    }\n\
    \n\
    return new Response(JSON.stringify({ error: "Not found" }), {\n\
      status: 404,\n\
      headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
    });\n\
  } catch (error) {\n\
    return new Response(JSON.stringify({ error: error.message }), {\n\
      status: 500,\n\
      headers: { ...corsHeaders, "Content-Type": "application/json" },\n\
    });\n\
  }\n\
}, { port: PORT });\n\
\n\
console.log(`Server running on port ${PORT}`);\n\
' > /app/functions/server.ts

EXPOSE 8080

ENV PORT=8080
ENV TARGET_BUILDER_TAG=""
ENV MAX_START_CAPITAL=10000
ENV DATASOURCE_TYPE=public

ENTRYPOINT ["/app/entrypoint.sh"]
