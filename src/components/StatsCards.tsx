import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Percent, DollarSign, Wallet } from "lucide-react";
import type { ProcessedStats } from "@/lib/hyperliquid";

interface StatsCardsProps {
  stats: ProcessedStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
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
      label: "Account Value",
      value: `$${stats.accountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "primary",
    },
    {
      label: "Realized PnL",
      value: `${stats.totalRealizedPnL >= 0 ? "+" : ""}$${stats.totalRealizedPnL.toFixed(2)}`,
      icon: stats.totalRealizedPnL >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalRealizedPnL >= 0 ? "success" : "destructive",
    },
    {
      label: "Best Trade",
      value: `+$${stats.bestTrade.toFixed(2)}`,
      icon: TrendingUp,
      color: "success",
    },
    {
      label: "Worst Trade",
      value: `$${stats.worstTrade.toFixed(2)}`,
      icon: TrendingDown,
      color: "destructive",
    },
  ];

  return (
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
                : "text-foreground"
            }`}
          >
            {card.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
};
