# Hyperliquid Trade Ledger - Technical Documentation

> **Complete technical breakdown from ground zero** — Every file, every function, every concept explained.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Directory Structure](#4-directory-structure)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
   - [Entry Point](#51-entry-point)
   - [Core Library: hyperliquid.ts](#52-core-library-hyperliquidts)
   - [Page Components](#53-page-components)
   - [UI Components](#54-ui-components)
6. [Backend Deep Dive (Edge Functions)](#6-backend-deep-dive-edge-functions)
   - [v1-trades](#61-v1-trades)
   - [v1-positions-history](#62-v1-positions-history)
   - [v1-pnl](#63-v1-pnl)
   - [v1-leaderboard](#64-v1-leaderboard)
   - [v1-deposits](#65-v1-deposits)
7. [Data Flow](#7-data-flow)
8. [Key Algorithms](#8-key-algorithms)
9. [API Reference](#9-api-reference)
10. [Glossary](#10-glossary)

---

## 1. Project Overview

### What This Project Does

This is a **Trade Ledger API + Dashboard** for [Hyperliquid](https://hyperliquid.xyz), a decentralized perpetual futures exchange. It provides data that's **missing from Hyperliquid's public API**:

- **Position History**: Track how positions change over time
- **Position Lifecycles**: When a position opens, how it grows, and when it closes
- **Cumulative PnL**: Running total of profits/losses over time
- **Builder Attribution**: Track which trades came through a specific frontend ("builder")
- **Taint Detection**: Identify when position data is "contaminated" by non-builder trades

### The Problem It Solves

Hyperliquid's API gives you:
- Current positions (real-time snapshot)
- Trade history (raw fills)

But it **doesn't** give you:
- How positions changed over time
- When positions opened/closed (lifecycle tracking)
- Cumulative PnL charts
- Attribution tracking for competition/leaderboard purposes

This project fills those gaps.

---

## 2. Technology Stack

### Frontend
| Technology | Purpose | File(s) |
|------------|---------|---------|
| **React 18** | UI framework | All `.tsx` files |
| **TypeScript** | Type safety | All `.ts`/`.tsx` files |
| **Vite** | Build tool & dev server | `vite.config.ts` |
| **Tailwind CSS** | Styling | `tailwind.config.ts`, `src/index.css` |
| **Framer Motion** | Animations | Used in components |
| **Recharts** | PnL charts | `src/components/PnLChart.tsx` |
| **shadcn/ui** | UI component library | `src/components/ui/*` |
| **React Router** | Page routing | `src/App.tsx` |
| **TanStack Query** | Server state management | `src/App.tsx` |
| **Sonner** | Toast notifications | Used throughout |

### Backend
| Technology | Purpose | File(s) |
|------------|---------|---------|
| **Supabase Edge Functions** | Serverless API endpoints | `supabase/functions/*` |
| **Deno** | Runtime for edge functions | Built into Supabase |
| **Hyperliquid Info API** | Data source | Called from edge functions |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      React Dashboard                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Address  │  │  Stats   │  │  PnL     │  │    Trade     │  │  │
│  │  │  Input   │  │  Cards   │  │  Chart   │  │   History    │  │  │
│  │  └────┬─────┘  └────▲─────┘  └────▲─────┘  └──────▲───────┘  │  │
│  │       │              │             │               │          │  │
│  │       ▼              │             │               │          │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │              hyperliquid.ts (Core Library)              │  │  │
│  │  │   fetchUserFills() │ fetchClearinghouseState()          │  │  │
│  │  │   processFillsToTrades() │ buildPositionLifecycles()    │  │  │
│  │  └────────────────────────────┬───────────────────────────┘  │  │
│  └───────────────────────────────┼───────────────────────────────┘  │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │
                                    ▼ HTTP POST
┌─────────────────────────────────────────────────────────────────────┐
│                    HYPERLIQUID INFO API                              │
│                  https://api.hyperliquid.xyz/info                    │
│  ┌─────────────┐  ┌─────────────────────┐  ┌────────────────────┐   │
│  │ userFills   │  │ clearinghouseState  │  │ userNonFunding...  │   │
│  │ (trades)    │  │ (current positions) │  │ (deposits)         │   │
│  └─────────────┘  └─────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                    ▲
                    │ Also called by:
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                           │
│  ┌───────────┐ ┌──────────────────┐ ┌───────┐ ┌────────────────────┐│
│  │ v1-trades │ │v1-positions-hist │ │v1-pnl │ │ v1-leaderboard     ││
│  └───────────┘ └──────────────────┘ └───────┘ └────────────────────┘│
│                                                ┌──────────────────┐ │
│                                                │   v1-deposits    │ │
│                                                └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Directory Structure

```
hyperliquid-trade-ledger/
├── src/                          # FRONTEND CODE
│   ├── main.tsx                  # React entry point (line 1-11)
│   ├── App.tsx                   # Router & providers (line 1-27)
│   ├── index.css                 # Global styles & Tailwind
│   │
│   ├── lib/
│   │   └── hyperliquid.ts        # ⭐ CORE LOGIC: API calls & processing (431 lines)
│   │
│   ├── pages/
│   │   └── Index.tsx             # Main dashboard page (230 lines)
│   │
│   └── components/
│       ├── AddressInput.tsx      # Wallet input + builder toggle
│       ├── StatsCards.tsx        # Win rate, volume, PnL cards
│       ├── PnLChart.tsx          # Cumulative PnL line chart
│       ├── TradeHistory.tsx      # Trade table with sorting
│       ├── PositionHistory.tsx   # Current open positions
│       ├── PositionLifecycleHistory.tsx  # Completed position lifecycles
│       ├── TradeDetailModal.tsx  # Click-through trade details
│       ├── Header.tsx            # Navigation header
│       └── ui/                   # shadcn UI primitives
│
├── supabase/
│   ├── config.toml               # Supabase configuration
│   └── functions/                # BACKEND CODE (Edge Functions)
│       ├── v1-trades/
│       │   └── index.ts          # Trade history endpoint (154 lines)
│       ├── v1-positions-history/
│       │   └── index.ts          # Position tracking endpoint (406 lines)
│       ├── v1-pnl/
│       │   └── index.ts          # PnL calculation endpoint (149 lines)
│       ├── v1-leaderboard/
│       │   └── index.ts          # Rankings endpoint (265 lines)
│       └── v1-deposits/
│           └── index.ts          # Deposit tracking endpoint (155 lines)
│
├── Dockerfile                    # Docker containerization
├── docker-compose.yml            # Docker orchestration
├── README.md                     # User-facing documentation
├── DEMO_SCRIPT.md               # Video demo narration
└── TECHNICAL_README.md          # This file
```

---

## 5. Frontend Deep Dive

### 5.1 Entry Point

#### `src/main.tsx` (Lines 1-11)
```typescript
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
```

**What it does**: 
- Mounts the React app to the `#root` DOM element
- Imports global CSS

#### `src/App.tsx` (Lines 1-27)
```typescript
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

**What each wrapper does**:
| Wrapper | Purpose |
|---------|---------|
| `QueryClientProvider` | Enables React Query for server state |
| `TooltipProvider` | Enables tooltips throughout app |
| `Toaster` / `Sonner` | Toast notification systems |
| `BrowserRouter` | Enables client-side routing |
| `Routes` | Defines URL → component mapping |

---

### 5.2 Core Library: `hyperliquid.ts`

**Location**: `src/lib/hyperliquid.ts`

This is the **brain** of the frontend. It handles:
1. Fetching data from Hyperliquid API
2. Processing raw data into useful formats
3. Building position lifecycles from trades

#### Key Constants (Line 1)
```typescript
const API_URL = "https://api.hyperliquid.xyz/info";
```

#### Type Definitions (Lines 3-130)

##### `HyperliquidFill` (Lines 3-19)
Raw trade data from Hyperliquid API:
```typescript
interface HyperliquidFill {
  closedPnl: string;    // Realized PnL from this trade
  coin: string;         // Asset traded (BTC, ETH, etc.)
  crossed: boolean;     // Did it cross the spread (taker)?
  dir: string;          // Direction: "Open Long", "Close Short", etc.
  hash: string;         // Transaction hash
  oid: number;          // Order ID
  px: string;           // Price (as string for precision)
  side: "B" | "A";      // "B" = Buy, "A" = Ask (Sell)
  startPosition: string;// Position size before this trade
  sz: string;           // Size of this trade
  time: number;         // Unix timestamp in milliseconds
  fee: string;          // Trading fee
  feeToken: string;     // Token used for fee
  builderFee?: string;  // Fee paid to builder (frontend)
  tid: number;          // Trade ID
}
```

##### `ProcessedTrade` (Lines 57-72)
Frontend-friendly trade format:
```typescript
interface ProcessedTrade {
  id: string;           // Unique identifier
  timestamp: string;    // Human-readable date
  coin: string;         // Asset name
  side: "long" | "short"; // Position direction
  direction: string;    // "Open Long", etc.
  size: number;         // Trade size (number, not string)
  price: number;        // Trade price
  pnl: number;          // Realized PnL
  fee: number;          // Trading fee
  builderFee: number;   // Builder fee
  hash: string;         // Transaction hash
  rawTime: number;      // Original timestamp
  notionalValue: number;// size × price
  isBuilderTrade: boolean; // Has builder attribution?
}
```

##### `PositionLifecycle` (Lines 93-107)
Tracks a position from open → close:
```typescript
interface PositionLifecycle {
  id: string;
  coin: string;
  side: "long" | "short";
  openTime: string;
  closeTime: string | null;  // null = still open
  openPrice: number;
  closePrice: number | null;
  maxSize: number;           // Largest size during lifecycle
  realizedPnl: number;       // Total PnL when closed
  status: "open" | "closed";
  tradeCount: number;        // How many trades in this lifecycle
  tainted: boolean;          // Has non-builder trades?
  avgEntryPx: number;        // Average entry price
}
```

#### API Functions (Lines 132-170)

##### `fetchUserFills()` (Lines 133-150)
```typescript
export async function fetchUserFills(address: string): Promise<HyperliquidFill[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "userFills",  // API endpoint type
      user: address,      // Wallet address
    }),
  });
  return response.json();
}
```

**What it does**: Gets all historical trades for a wallet address.

##### `fetchClearinghouseState()` (Lines 153-170)
```typescript
export async function fetchClearinghouseState(address: string): Promise<ClearinghouseState> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "clearinghouseState",
      user: address,
    }),
  });
  return response.json();
}
```

**What it does**: Gets current account state (open positions, equity, margin).

#### Processing Functions (Lines 172-302)

##### `processFillsToTrades()` (Lines 173-202)
Converts raw API fills to frontend format:
```typescript
export function processFillsToTrades(fills: HyperliquidFill[]): ProcessedTrade[] {
  return fills.map((fill, index) => {
    const size = parseFloat(fill.sz);      // String → Number
    const price = parseFloat(fill.px);
    const builderFee = parseFloat(fill.builderFee || "0");
    
    return {
      id: `trade-${fill.tid || index}`,
      timestamp: new Date(fill.time).toLocaleString(...),
      coin: fill.coin,
      side: fill.side === "B" ? "long" : "short",  // B=Buy=Long
      direction: fill.dir,
      size,
      price,
      pnl: parseFloat(fill.closedPnl),
      fee: parseFloat(fill.fee || "0"),
      builderFee,
      hash: fill.hash,
      rawTime: fill.time,
      notionalValue: size * price,
      isBuilderTrade: builderFee > 0,  // Has builder fee = builder trade
    };
  });
}
```

##### `calculateStats()` (Lines 233-273)
Computes aggregate statistics:
```typescript
export function calculateStats(
  trades: ProcessedTrade[],
  positions: ProcessedPosition[],
  state: ClearinghouseState | null,
  builderOnly: boolean = false,
  maxStartCapital: number = 10000  // Cap for fair % comparison
): ProcessedStats {
  // Count winning trades
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  
  // Sum volumes
  const totalVolume = trades.reduce((sum, t) => sum + t.notionalValue, 0);
  
  // Sum PnL
  const totalRealizedPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  
  // ⭐ CAPPED NORMALIZATION for fair comparison
  // Prevents $1M accounts from having lower return% than $100 accounts
  const accountValue = state ? parseFloat(state.marginSummary.accountValue) : 0;
  const effectiveCapital = Math.min(accountValue || maxStartCapital, maxStartCapital);
  const returnPct = effectiveCapital > 0 
    ? (totalRealizedPnL / effectiveCapital) * 100 
    : 0;
  
  // Taint detection
  const hasNonBuilderTrades = trades.some((t) => !t.isBuilderTrade);
  const tainted = builderOnly && hasNonBuilderTrades && builderTradeCount > 0;
  
  return { totalTrades, winRate, totalVolume, returnPct, tainted, ... };
}
```

##### `buildPositionLifecycles()` (Lines 305-397)
**THE CORE ALGORITHM**: Reconstructs position lifecycles from trades.

```typescript
export function buildPositionLifecycles(
  trades: ProcessedTrade[],
  builderOnly: boolean = false
): PositionLifecycle[] {
  // Sort trades by time (oldest first)
  const sortedTrades = [...trades].sort((a, b) => a.rawTime - b.rawTime);
  
  const lifecycles: PositionLifecycle[] = [];
  const activePositions: Map<string, {...}> = new Map();
  
  sortedTrades.forEach((trade) => {
    const key = trade.coin;
    let position = activePositions.get(key);
    
    // Calculate size change (+ve for buys, -ve for sells)
    const sizeChange = trade.side === "long" ? trade.size : -trade.size;
    
    if (!position) {
      // START NEW LIFECYCLE
      position = {
        trades: [trade],
        side: trade.side,
        netSize: sizeChange,
      };
      activePositions.set(key, position);
    } else {
      position.trades.push(trade);
      position.netSize += sizeChange;
      
      // CHECK IF POSITION CLOSED (netSize ≈ 0)
      if (Math.abs(position.netSize) < 0.0001) {
        // LIFECYCLE COMPLETE - add to results
        lifecycles.push({
          id: `lifecycle-${firstTrade.rawTime}`,
          coin: key,
          side: position.side,
          openTime: firstTrade.timestamp,
          closeTime: lastTrade.timestamp,
          realizedPnl: position.trades.reduce((sum, t) => sum + t.pnl, 0),
          tradeCount: position.trades.length,
          tainted: builderOnly && hasNonBuilderTrades && hasBuilderTrades,
          ...
        });
        
        activePositions.delete(key);  // Remove closed position
      }
    }
  });
  
  // Add any still-open positions as "open" lifecycles
  activePositions.forEach((position, coin) => {
    lifecycles.push({ ..., status: "open" });
  });
  
  return lifecycles;
}
```

**Example walkthrough**:
```
Trade 1: Buy 0.5 BTC @ $60,000   → netSize = +0.5 (OPEN LONG)
Trade 2: Buy 0.3 BTC @ $61,000   → netSize = +0.8 (ADD TO LONG)
Trade 3: Sell 0.8 BTC @ $65,000  → netSize = 0    (CLOSE - Lifecycle complete!)
Trade 4: Sell 0.2 BTC @ $64,000  → netSize = -0.2 (OPEN SHORT - new lifecycle)
```

#### Main Fetch Function (Lines 400-431)

##### `fetchAddressData()` 
The function called by the UI:
```typescript
export async function fetchAddressData(address: string, builderOnly: boolean = false) {
  // Fetch both APIs in parallel
  const [fills, state] = await Promise.all([
    fetchUserFills(address),
    fetchClearinghouseState(address),
  ]);
  
  // Process all data
  const allTrades = processFillsToTrades(fills);
  let filteredTrades = builderOnly 
    ? allTrades.filter((trade) => trade.isBuilderTrade) 
    : allTrades;
  
  const positions = processPositions(state);
  const stats = calculateStats(allTrades, positions, state, builderOnly);
  const pnlData = generatePnLData(filteredTrades);
  const positionLifecycles = buildPositionLifecycles(allTrades, builderOnly);
  
  return {
    trades: filteredTrades,
    allTrades,
    positions,
    stats,
    pnlData,
    positionLifecycles,
    rawFills: fills,
    rawState: state,
  };
}
```

---

### 5.3 Page Components

#### `src/pages/Index.tsx`

**State Management (Lines 27-38)**:
```typescript
const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [builderFilter, setBuilderFilter] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");
  const [trades, setTrades] = useState<ProcessedTrade[]>([]);
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [positions, setPositions] = useState<ProcessedPosition[]>([]);
  const [positionLifecycles, setPositionLifecycles] = useState<PositionLifecycle[]>([]);
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<ProcessedTrade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
};
```

**Search Handler (Lines 40-64)**:
```typescript
const handleSearch = async (address: string) => {
  setIsLoading(true);
  setCurrentAddress(address);
  
  try {
    const data = await fetchAddressData(address, builderFilter);
    
    setTrades(data.trades);
    setPnlData(data.pnlData);
    setPositions(data.positions);
    setPositionLifecycles(data.positionLifecycles);
    setStats(data.stats);
    setHasSearched(true);
    
    toast.success(`Loaded ${data.trades.length} trades...`);
  } catch (error) {
    toast.error("Failed to fetch data...");
  } finally {
    setIsLoading(false);
  }
};
```

**Render Structure (Lines 74-227)**:
```tsx
return (
  <div className="min-h-screen bg-background">
    <Header />
    
    <main>
      {/* Show hero when not searched yet */}
      {!hasSearched && <HeroSection />}
      
      {/* Always show search input */}
      <AddressInput onSearch={handleSearch} ... />
      
      {/* Show results after search */}
      {hasSearched && stats && (
        <>
          <StatsCards stats={stats} />
          <PnLChart data={pnlData} />
          <PositionHistory positions={positions} />
          <PositionLifecycleHistory lifecycles={positionLifecycles} />
          <TradeHistory trades={trades} onTradeClick={handleTradeClick} />
        </>
      )}
      
      {/* Loading spinner */}
      {isLoading && <LoadingSpinner />}
    </main>
    
    <TradeDetailModal trade={selectedTrade} isOpen={isModalOpen} ... />
  </div>
);
```

---

### 5.4 UI Components

#### `AddressInput.tsx` (89 lines)

**Purpose**: Wallet address input + builder filter toggle

**Key parts**:
- Lines 21-28: Form submission handler
- Lines 50-68: Input field with search icon
- Lines 71-85: Builder-only toggle switch

```typescript
// Line 73-76: The toggle
<Switch
  checked={builderFilter}
  onCheckedChange={onBuilderFilterChange}
/>
```

#### `StatsCards.tsx` (134 lines)

**Purpose**: Display key metrics in card grid

**Taint Warning (Lines 57-73)**:
```typescript
{stats.tainted && builderOnly && (
  <motion.div className="bg-yellow-500/10 border border-yellow-500/30">
    <AlertTriangle className="text-yellow-500" />
    <p>Tainted Data Warning</p>
    <p>Non-builder trades detected in position lifecycles...</p>
  </motion.div>
)}
```

**Stats Grid (Lines 91-131)**:
```typescript
const cards = [
  { label: "Total Trades", value: stats.totalTrades },
  { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
  { label: "Volume", value: formatVolume(stats.totalVolume) },
  { label: "Realized PnL", value: formatPnL(stats.totalRealizedPnL) },
  { label: "Return %", value: `${stats.returnPct.toFixed(2)}%` },
  { label: "Fees Paid", value: `$${stats.totalFees.toFixed(2)}` },
];
```

#### `TradeHistory.tsx` (162 lines)

**Purpose**: Sortable table of all trades

**Table Columns (Lines 39-72)**:
- TIME, COIN, SIDE, DIRECTION, SIZE, PRICE, NOTIONAL, PNL, FEE, BUILDER, TX

**Row Rendering (Lines 75-150)**:
```typescript
<motion.tr
  onClick={() => onTradeClick(trade)}  // Opens modal
  className="hover:bg-muted/50 cursor-pointer"
>
  <TableCell>{trade.timestamp}</TableCell>
  <TableCell>{trade.coin}</TableCell>
  <TableCell>
    <div className={trade.side === "long" ? "text-success" : "text-destructive"}>
      {trade.side.toUpperCase()}
    </div>
  </TableCell>
  // ... more cells
</motion.tr>
```

---

## 6. Backend Deep Dive (Edge Functions)

All edge functions follow the same pattern:
1. Handle CORS preflight
2. Parse query parameters
3. Fetch from Hyperliquid API
4. Process/filter data
5. Return JSON response

### 6.1 `v1-trades`

**Location**: `supabase/functions/v1-trades/index.ts` (154 lines)

**Purpose**: Get normalized trade history for a user

**CORS Headers (Lines 11-14)**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**HyperliquidFill Interface (Lines 18-35)**:
```typescript
interface HyperliquidFill {
  coin: string;
  px: string;         // Price
  sz: string;         // Size
  side: string;       // "B" or "A"
  time: number;       // Timestamp
  startPosition: string;
  dir: string;        // "Open Long", "Close Short", etc.
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
  feeToken: string;
  builderFee?: string;
  builder?: string;
}
```

**Main Handler (Lines 47-154)**:
```typescript
Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. Parse parameters
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const coin = url.searchParams.get('coin');
  const fromMs = url.searchParams.get('fromMs');
  const toMs = url.searchParams.get('toMs');
  const builderOnly = url.searchParams.get('builderOnly') === 'true';
  
  // 3. Validate
  if (!user) {
    return new Response(JSON.stringify({ error: 'user parameter is required' }), 
      { status: 400 });
  }
  
  // 4. Fetch from Hyperliquid
  const fills = await fetchUserFills(user);
  
  // 5. Normalize trades (lines 71-96)
  let trades = fills.map(fill => ({
    timeMs: fill.time,
    coin: fill.coin,
    side: fill.side,
    dir: fill.dir,
    px: parseFloat(fill.px),
    sz: parseFloat(fill.sz),
    closedPnl: parseFloat(fill.closedPnl),
    notionalValue: parseFloat(fill.px) * parseFloat(fill.sz),
    isBuilderTrade: builderFee > 0,
    ...
  }));
  
  // 6. Apply filters
  if (coin) trades = trades.filter(t => t.coin === coin);
  if (builderOnly) trades = trades.filter(t => t.isBuilderTrade);
  
  // 7. Build coin breakdown (lines 107-117)
  const coinBreakdown = {};
  for (const t of trades) {
    if (!coinBreakdown[t.coin]) {
      coinBreakdown[t.coin] = { volume: 0, pnl: 0, fees: 0, count: 0 };
    }
    coinBreakdown[t.coin].volume += t.notionalValue;
    coinBreakdown[t.coin].pnl += t.closedPnl;
  }
  
  // 8. Return response
  return new Response(JSON.stringify({
    user,
    count: trades.length,
    totalVolume: ...,
    totalPnl: ...,
    coinBreakdown,
    trades,
  }));
});
```

---

### 6.2 `v1-positions-history`

**Location**: `supabase/functions/v1-positions-history/index.ts` (406 lines)

**Purpose**: Track position states over time + lifecycle tracking

**This is the most complex endpoint.** It implements:
- Position state tracking (how size changes over time)
- Lifecycle detection (when positions open/close)
- Flip detection (long→short reversals)
- Taint propagation (if any trade in lifecycle is non-builder, whole lifecycle is tainted)

**Core Algorithm: `buildPositionHistory()` (Lines 100-315)**:

```typescript
function buildPositionHistory(
  fills: HyperliquidFill[],
  currentPositions: Map<string, {...}>,  // Current risk fields
  targetBuilder: string,
  builderOnly: boolean
): { states: PositionState[]; lifecycles: PositionLifecycle[]; coinSummary: Record<string, any> } {
  
  // Sort by time
  const sorted = [...fills].sort((a, b) => a.time - b.time);
  
  // Group by coin
  const byCoin: Record<string, HyperliquidFill[]> = {};
  for (const fill of sorted) {
    if (!byCoin[fill.coin]) byCoin[fill.coin] = [];
    byCoin[fill.coin].push(fill);
  }
  
  const states: PositionState[] = [];
  const lifecycles: PositionLifecycle[] = [];
  
  // Process each coin separately
  for (const [coin, coinFills] of Object.entries(byCoin)) {
    let netSize = 0;
    let avgEntryPx = 0;
    let totalCost = 0;
    let hasBuilder = false;
    let hasNonBuilder = false;
    let previousSide: string | null = null;
    
    // Lifecycle tracking variables
    let lifecycleStart: number | null = null;
    let lifecycleFlips = 0;
    // ... more tracking vars
    
    for (const fill of coinFills) {
      const isBuilder = ...; // Check builder attribution
      
      // Track builder/non-builder presence
      if (isBuilder) { hasBuilder = true; lifecycleHasBuilder = true; }
      else { hasNonBuilder = true; lifecycleHasNonBuilder = true; }
      
      const sz = parseFloat(fill.sz);
      const px = parseFloat(fill.px);
      const dir = fill.side === 'B' ? 1 : -1;  // Buy = +1, Sell = -1
      const signed = sz * dir;
      
      // Start new lifecycle if currently flat
      if (lifecycleStart === null && netSize === 0) {
        lifecycleStart = fill.time;
        lifecycleSide = dir > 0 ? 'long' : 'short';
      }
      
      const prevNetSize = netSize;
      
      if ((netSize >= 0 && dir > 0) || (netSize <= 0 && dir < 0)) {
        // ADDING to position (same direction)
        totalCost += px * sz;
        netSize += signed;
        avgEntryPx = totalCost / Math.abs(netSize);
      } else {
        // REDUCING or FLIPPING position
        const reduce = Math.min(Math.abs(netSize), sz);
        totalCost -= avgEntryPx * reduce;
        netSize += signed;
        
        // Check for FLIP (crossed zero)
        if ((prevNetSize > 0 && netSize < 0) || (prevNetSize < 0 && netSize > 0)) {
          lifecycleFlips++;
          // Reset entry for flipped portion
          totalCost = px * Math.abs(netSize);
          avgEntryPx = px;
        }
        
        // Check if position CLOSED
        if (Math.abs(netSize) < 0.0001) {
          // FINALIZE LIFECYCLE
          const tainted = lifecycleHasBuilder && lifecycleHasNonBuilder;
          
          if (!builderOnly || (!tainted)) {
            lifecycles.push({
              coin,
              side: lifecycleSide,
              openTimeMs: lifecycleStart,
              closeTimeMs: fill.time,
              realizedPnl: lifecyclePnl,
              tradeCount: lifecycleTradeCount,
              flips: lifecycleFlips,
              tainted,
              status: 'closed',
            });
          }
          
          // Reset for next lifecycle
          netSize = 0;
          lifecycleStart = null;
          // ... reset other vars
        }
      }
      
      // Record position state at this moment
      const currentSide = netSize > 0 ? 'long' : netSize < 0 ? 'short' : 'flat';
      const flipped = previousSide && previousSide !== currentSide;
      
      states.push({
        timeMs: fill.time,
        coin,
        netSize,
        avgEntryPx,
        side: currentSide,
        flipped,
        flipType: flipped ? `${previousSide}_to_${currentSide}` : null,
        tainted: hasBuilder && hasNonBuilder,
        // Risk fields from current state
        liqPx: currentPositions.get(coin)?.liqPx,
        leverage: currentPositions.get(coin)?.leverage,
      });
      
      previousSide = currentSide;
    }
  }
  
  return { states, lifecycles, coinSummary };
}
```

---

### 6.3 `v1-pnl`

**Location**: `supabase/functions/v1-pnl/index.ts` (149 lines)

**Purpose**: Calculate PnL with **capped normalization**

**The Capped Normalization Formula (Lines 115-118)**:
```typescript
// Calculate starting equity (reverse-engineer from current state)
const startEquity = currentEquity - realizedPnl + feesPaid;

// Cap the effective capital for fair comparison
// This prevents $1M accounts from having artificially low return%
const effectiveCapital = Math.min(Math.max(startEquity, 100), maxCap);

// Calculate return percentage
const returnPct = effectiveCapital > 0 
  ? (realizedPnl / effectiveCapital) * 100 
  : 0;
```

**Why capped normalization?**

Without capping:
- Trader A: $100 account, $50 profit → 50% return
- Trader B: $100,000 account, $5,000 profit → 5% return

With `maxCap = 10000`:
- Trader A: Capped at $100 → 50% return
- Trader B: Capped at $10,000 → 50% return

This makes leaderboard rankings fairer.

---

### 6.4 `v1-leaderboard`

**Location**: `supabase/functions/v1-leaderboard/index.ts` (265 lines)

**Purpose**: Rank users by various metrics

**Supported Metrics (Lines 194-201)**:
```typescript
valid.sort((a, b) => {
  if (metric === 'volume') return b.volume - a.volume;
  if (metric === 'returnPct') return b.returnPct - a.returnPct;
  if (metric === 'winRate') return b.winRate - a.winRate;
  if (metric === 'profitFactor') return b.profitFactor - a.profitFactor;
  if (metric === 'tradeCount') return b.tradeCount - a.tradeCount;
  return b.pnl - a.pnl;  // Default: sort by PnL
});
```

**Profit Factor Calculation (Line 142)**:
```typescript
const profitFactor = grossLoss > 0 
  ? grossProfit / grossLoss 
  : grossProfit > 0 ? Infinity : 0;
```

Profit factor measures risk-adjusted returns:
- `profitFactor = 2.0` means you make $2 for every $1 you lose
- Higher is better

---

### 6.5 `v1-deposits`

**Location**: `supabase/functions/v1-deposits/index.ts` (155 lines)

**Purpose**: Track deposits/withdrawals for fair competition filtering

**API Call (Lines 27-35)**:
```typescript
async function fetchLedgerUpdates(user: string): Promise<LedgerUpdate[]> {
  const response = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      type: "userNonFundingLedgerUpdates",  // Different endpoint!
      user, 
      startTime: 0 
    }),
  });
  return response.json();
}
```

**Classification (Lines 62-81)**:
```typescript
for (const u of updates) {
  const amount = parseFloat(u.usdc);
  
  if (u.type === 'deposit' || (u.type === 'internalTransfer' && amount > 0)) {
    deposits.push({ ...entry, direction: 'in' });
  } else if (u.type === 'withdraw' || (u.type === 'internalTransfer' && amount < 0)) {
    withdrawals.push({ ...entry, direction: 'out' });
  }
}
```

---

## 7. Data Flow

### Complete Request Flow

```
1. User enters wallet address in UI
                    ↓
2. AddressInput.tsx calls onSearch(address)
                    ↓
3. Index.tsx handleSearch() is triggered
                    ↓
4. fetchAddressData(address, builderOnly) called
                    ↓
5. hyperliquid.ts makes 2 parallel API calls:
   ├── fetchUserFills(address)      → POST /info {type: "userFills"}
   └── fetchClearinghouseState()    → POST /info {type: "clearinghouseState"}
                    ↓
6. Raw data is processed:
   ├── processFillsToTrades()       → Convert raw fills
   ├── processPositions()           → Convert position state  
   ├── calculateStats()             → Compute aggregates
   ├── generatePnLData()            → Build chart data
   └── buildPositionLifecycles()    → Track lifecycles
                    ↓
7. Processed data returned to Index.tsx
                    ↓
8. React state updated → UI re-renders
                    ↓
9. User sees: Stats Cards, PnL Chart, Trade Table, etc.
```

---

## 8. Key Algorithms

### 8.1 Position Lifecycle Detection

**Problem**: Given a list of trades, determine when positions opened and closed.

**Algorithm**:
```
1. Sort trades by timestamp
2. Group by coin
3. For each coin:
   a. Track running netSize (positive = long, negative = short)
   b. On each trade:
      - If netSize was 0 → Start new lifecycle
      - Update netSize based on trade direction
      - If netSize returns to 0 → Close lifecycle
      - If netSize crosses 0 → This is a "flip"
```

**Edge Cases Handled**:
- Multiple adds to same position
- Partial closes
- Position flips (long→short without closing)
- Multiple coins simultaneously

### 8.2 Taint Propagation

**Problem**: In builder-only mode, if a position lifecycle has ANY non-builder trade, the entire lifecycle's PnL cannot be attributed to the builder.

**Algorithm**:
```
For each lifecycle:
  hasBuilder = false
  hasNonBuilder = false
  
  For each trade in lifecycle:
    if (trade.isBuilderTrade):
      hasBuilder = true
    else:
      hasNonBuilder = true
  
  lifecycle.tainted = hasBuilder AND hasNonBuilder
```

**Why this matters**: Prevents gaming the system by mixing builder/non-builder trades.

### 8.3 Capped PnL Normalization

**Problem**: Comparing return% across different account sizes is unfair.

**Solution**:
```typescript
effectiveCapital = min(max(startEquity, 100), maxCap)
returnPct = realizedPnl / effectiveCapital * 100
```

- **Floor of 100**: Prevents tiny accounts from showing 10000% returns on $1
- **Cap of 10000**: Prevents large accounts from artificially low returns

---

## 9. API Reference

### Base URL
```
https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1
```

### Endpoints

| Endpoint | Method | Required Params | Optional Params |
|----------|--------|-----------------|-----------------|
| `/v1-trades` | GET | `user` | `coin`, `fromMs`, `toMs`, `builderOnly` |
| `/v1-positions-history` | GET | `user` | `coin`, `fromMs`, `toMs`, `builderOnly` |
| `/v1-pnl` | GET | `user` | `coin`, `fromMs`, `toMs`, `builderOnly`, `maxStartCapital` |
| `/v1-leaderboard` | GET | — | `users`, `metric`, `coin`, `fromMs`, `toMs`, `builderOnly` |
| `/v1-deposits` | GET | `user` | `fromMs`, `toMs` |

### Example Requests

```bash
# Get all trades for a user
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x0e09b56ef137f417e424f1265425e93bfff77e17"

# Get BTC-only trades in builder mode
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-trades?user=0x...&coin=BTC&builderOnly=true"

# Get leaderboard sorted by win rate
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-leaderboard?metric=winRate"

# Get PnL with custom capital cap
curl "https://vgfmhpatwxkcmqzdvnch.supabase.co/functions/v1/v1-pnl?user=0x...&maxStartCapital=50000"
```

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Fill** | A single trade execution from Hyperliquid API |
| **Position** | An open trading position (long or short) |
| **Lifecycle** | A position from open → close (may include multiple trades) |
| **Builder** | A frontend/interface that routes trades (earns fees) |
| **Builder Trade** | A trade that has a `builderFee > 0` |
| **Tainted** | A lifecycle with mixed builder/non-builder trades |
| **netSize** | Current position size (+ve = long, -ve = short, 0 = flat) |
| **Flip** | When a position changes direction (long→short or short→long) |
| **Closed PnL** | Realized profit/loss from closing part of a position |
| **Capped Normalization** | Limiting effective capital for fair % comparison |
| **Profit Factor** | Gross profit ÷ Gross loss (higher = better risk-adjusted returns) |
| **Liquidation Price** | Price at which position would be force-closed |
| **Margin Used** | Collateral locked for a position |
| **Leverage** | Position size ÷ Margin used |

---

## Contributing

1. Frontend changes: Edit files in `src/`
2. Backend changes: Edit files in `supabase/functions/`
3. Edge functions auto-deploy on push
4. Test locally with Vite: `npm run dev`

---

*Built for Encode Hyperliquid London Community Hackathon*
