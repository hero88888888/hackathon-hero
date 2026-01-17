import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Percent, DollarSign, Wallet, AlertTriangle, BarChart3 } from "lucide-react";
import type { ProcessedStats } from "@/lib/hyperliquid";

interface StatsCardsProps {
  stats: ProcessedStats;
  builderOnly?: boolean;
}

export const StatsCards = ({ stats, builderOnly = false }: StatsCardsProps) => {
  const cards = [
    {
      label: "Total Trades",
      value: stats.totalTrades.toLocaleString(),
      icon: Activity,
      color: "primary",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Percent,
      color: stats.winRate >= 50 ? "success" : "destructive",
    },
    {
      label: "Volume",
      value: `$${stats.totalVolume >= 1000000 
        ? `${(stats.totalVolume / 1000000).toFixed(2)}M` 
        : stats.totalVolume >= 1000 
        ? `${(stats.totalVolume / 1000).toFixed(1)}K` 
        : stats.totalVolume.toFixed(2)}`,
      icon: BarChart3,
      color: "primary",
    },
    {
      label: "Realized PnL",
      value: `${stats.totalRealizedPnL >= 0 ? "+" : ""}$${stats.totalRealizedPnL.toFixed(2)}`,
      icon: stats.totalRealizedPnL >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalRealizedPnL >= 0 ? "success" : "destructive",
    },
    {
      label: "Return %",
      value: `${stats.returnPct >= 0 ? "+" : ""}${stats.returnPct.toFixed(2)}%`,
      icon: Percent,
      color: stats.returnPct >= 0 ? "success" : "destructive",
    },
    {
      label: "Fees Paid",
      value: `$${stats.totalFees.toFixed(2)}`,
      icon: DollarSign,
      color: "muted",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Taint Warning */}
      {stats.tainted && builderOnly && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-sm font-mono font-semibold text-yellow-500">
              Tainted Data Warning
            </p>
            <p className="text-xs font-mono text-yellow-500/80">
              Non-builder trades detected in position lifecycles. PnL may include non-builder activity.
            </p>
          </div>
        </motion.div>
      )}
      
      {/* Builder Stats Badge */}
      {builderOnly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-mono rounded-full">
            Builder-Only Mode
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {stats.builderTradeCount} builder trades of {stats.tradeCount} total
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="terminal-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon
                className={`w-4 h-4 ${
                  card.color === "success"
                    ? "text-success"
                    : card.color === "destructive"
                    ? "text-destructive"
                    : card.color === "muted"
                    ? "text-muted-foreground"
                    : "text-primary"
                }`}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p
              className={`text-xl font-mono font-bold ${
                card.color === "success"
                  ? "text-success"
                  : card.color === "destructive"
                  ? "text-destructive"
                  : card.color === "muted"
                  ? "text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
