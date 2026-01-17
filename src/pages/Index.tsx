import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { AddressInput } from "@/components/AddressInput";
import { TradeHistory } from "@/components/TradeHistory";
import { PnLChart } from "@/components/PnLChart";
import { PositionHistory } from "@/components/PositionHistory";
import { StatsCards } from "@/components/StatsCards";
import {
  generateMockTrades,
  generateMockPnLData,
  generateMockPositions,
  generateMockStats,
} from "@/lib/mockData";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [builderFilter, setBuilderFilter] = useState(false);
  const [trades, setTrades] = useState<ReturnType<typeof generateMockTrades>>([]);
  const [pnlData, setPnlData] = useState<ReturnType<typeof generateMockPnLData>>([]);
  const [positions, setPositions] = useState<ReturnType<typeof generateMockPositions>>([]);
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);

  const handleSearch = async (address: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setTrades(generateMockTrades());
    setPnlData(generateMockPnLData());
    setPositions(generateMockPositions());
    setStats(generateMockStats());
    setHasSearched(true);
    setIsLoading(false);
  };

  const totalPnL = pnlData.length > 0 ? pnlData[pnlData.length - 1].cumulative : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none scanline opacity-50" />
      
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-mono font-bold mb-4">
              <span className="text-gradient">Hyperliquid</span>{" "}
              <span className="text-foreground">Trade Ledger</span>
            </h2>
            <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto mb-6">
              Complete trade history, position tracking, and cumulative PnL analytics
              — data that's missing from the public HL API.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-mono">
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow" />
                <span className="text-muted-foreground">Position History</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow" />
                <span className="text-muted-foreground">Cumulative PnL</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow" />
                <span className="text-muted-foreground">Builder Filtering</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow" />
                <span className="text-muted-foreground">Leaderboards</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Address Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <AddressInput
            onSearch={handleSearch}
            isLoading={isLoading}
            builderFilter={builderFilter}
            onBuilderFilterChange={setBuilderFilter}
          />
        </div>

        {/* Results */}
        {hasSearched && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats Overview */}
            <StatsCards stats={stats} />

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* PnL Chart */}
              <PnLChart
                data={pnlData}
                totalPnL={totalPnL}
                totalPnLPercent={(totalPnL / 10000) * 100}
              />

              {/* Position History */}
              <PositionHistory positions={positions} />
            </div>

            {/* Trade History */}
            <TradeHistory trades={trades} />
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground font-mono">
              Fetching trade data...
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">
              Built for Encode Hyperliquid London Community Hackathon
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                Powered by
              </span>
              <span className="text-xs font-mono text-primary font-semibold">
                Insilico Terminal
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
