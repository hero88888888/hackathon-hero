import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { PositionLifecycle } from "@/lib/hyperliquid";

interface PositionLifecycleHistoryProps {
  lifecycles: PositionLifecycle[];
  builderOnly?: boolean;
}

export const PositionLifecycleHistory = ({ lifecycles, builderOnly = false }: PositionLifecycleHistoryProps) => {
  const closedPositions = lifecycles.filter((l) => l.status === "closed");
  const openPositions = lifecycles.filter((l) => l.status === "open");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="terminal-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-mono font-semibold text-foreground">
          Position Lifecycle History
        </h3>
        <div className="flex gap-2">
          <span className="text-xs font-mono px-2 py-1 bg-success/20 text-success rounded">
            {openPositions.length} Open
          </span>
          <span className="text-xs font-mono px-2 py-1 bg-muted text-muted-foreground rounded">
            {closedPositions.length} Closed
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {lifecycles.map((lifecycle, index) => (
          <motion.div
            key={lifecycle.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border ${
              lifecycle.status === "open"
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    lifecycle.side === "long"
                      ? "bg-success/20"
                      : "bg-destructive/20"
                  }`}
                >
                  {lifecycle.side === "long" ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold text-foreground">
                      {lifecycle.coin}
                    </p>
                    {lifecycle.tainted && builderOnly && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-mono rounded" title="Position has mixed builder/non-builder trades">
                        <AlertTriangle className="w-3 h-3" />
                        TAINTED
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {lifecycle.side.toUpperCase()} • {lifecycle.tradeCount} trades
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono font-bold ${
                    lifecycle.realizedPnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {lifecycle.realizedPnl >= 0 ? "+" : ""}${lifecycle.realizedPnl.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 justify-end">
                  {lifecycle.status === "open" ? (
                    <Clock className="w-3 h-3 text-primary" />
                  ) : (
                    <CheckCircle className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={`text-xs font-mono ${
                    lifecycle.status === "open" ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {lifecycle.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <p className="text-muted-foreground">Avg Entry</p>
                <p className="text-foreground">${lifecycle.avgEntryPx.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Size</p>
                <p className="text-foreground">{lifecycle.maxSize.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Opened</p>
                <p className="text-foreground">{lifecycle.openTime}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Closed</p>
                <p className="text-foreground">{lifecycle.closeTime || "—"}</p>
              </div>
            </div>
          </motion.div>
        ))}

        {lifecycles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground font-mono text-sm">
            No position lifecycles found for this address
          </div>
        )}
      </div>
    </motion.div>
  );
};
