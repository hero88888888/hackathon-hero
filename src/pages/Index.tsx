import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { AddressInput } from "@/components/AddressInput";
import { TradeHistory } from "@/components/TradeHistory";
import { PnLChart } from "@/components/PnLChart";
import { PositionHistory } from "@/components/PositionHistory";
import { StatsCards } from "@/components/StatsCards";
import { TradeDetailModal } from "@/components/TradeDetailModal";
import {
  fetchAddressData,
  type ProcessedTrade,
  type ProcessedPosition,
  type ProcessedStats,
  type PnLDataPoint,
} from "@/lib/hyperliquid";

const SAMPLE_ADDRESSES = [
  "0x0e09b56ef137f417e424f1265425e93bfff77e17",
  "0x186b7610ff3f2e3fd7985b95f525ee0e37a79a74",
  "0x6c8031a9eb4415284f3f89c0420f697c87168263",
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [builderFilter, setBuilderFilter] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");
  const [trades, setTrades] = useState<ProcessedTrade[]>([]);
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [positions, setPositions] = useState<ProcessedPosition[]>([]);
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<ProcessedTrade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (address: string) => {
    setIsLoading(true);
    setCurrentAddress(address);
    
    try {
      const data = await fetchAddressData(address, builderFilter);
      
      setTrades(data.trades);
      setPnlData(data.pnlData);
      setPositions(data.positions);
      setStats(data.stats);
      setHasSearched(true);
      
      toast.success(`Loaded ${data.trades.length} trades for ${address.slice(0, 8)}...`);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data. Please check the address and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradeClick = (trade: ProcessedTrade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const totalPnL = stats?.totalRealizedPnL || 0;
  const totalPnLPercent = stats?.accountValue ? (totalPnL / stats.accountValue) * 100 : 0;

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
            <div className="flex flex-wrap justify-center gap-4 text-sm font-mono mb-8">
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
                <span className="text-muted-foreground">Transaction Details</span>
              </div>
            </div>

            {/* Sample Addresses */}
            <div className="max-w-2xl mx-auto mb-8">
              <p className="text-xs font-mono text-muted-foreground mb-3">
                Try these sample addresses:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SAMPLE_ADDRESSES.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => handleSearch(addr)}
                    className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {addr.slice(0, 8)}...{addr.slice(-6)}
                  </button>
                ))}
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
          
          {hasSearched && (
            <p className="text-center text-xs font-mono text-muted-foreground mt-2">
              Showing data for:{" "}
              <span className="text-primary">{currentAddress}</span>
            </p>
          )}
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
                totalPnLPercent={totalPnLPercent}
              />

              {/* Position History */}
              <PositionHistory positions={positions} />
            </div>

            {/* Trade History */}
            <TradeHistory trades={trades} onTradeClick={handleTradeClick} />
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
              Fetching trade data from Hyperliquid...
            </p>
          </motion.div>
        )}
      </main>

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

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
