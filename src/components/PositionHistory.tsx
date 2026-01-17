import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { ProcessedPosition } from "@/lib/hyperliquid";

interface PositionHistoryProps {
  positions: ProcessedPosition[];
}

export const PositionHistory = ({ positions }: PositionHistoryProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="terminal-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-mono font-semibold text-foreground">
          Active Positions
        </h3>
        <div className="flex gap-2">
          <span className="text-xs font-mono px-2 py-1 bg-success/20 text-success rounded">
            {positions.length} Open
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {positions.map((position, index) => (
          <motion.div
            key={position.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg border bg-primary/5 border-primary/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    position.side === "long"
                      ? "bg-success/20"
                      : "bg-destructive/20"
                  }`}
                >
                  {position.side === "long" ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-mono font-semibold text-foreground">
                    {position.coin}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {position.leverage}x {position.side.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono font-bold ${
                    position.unrealizedPnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {position.unrealizedPnl >= 0 ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
                </p>
                <p
                  className={`text-xs font-mono ${
                    position.returnOnEquity >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {position.returnOnEquity >= 0 ? "+" : ""}{position.returnOnEquity.toFixed(2)}% ROE
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <p className="text-muted-foreground">Entry</p>
                <p className="text-foreground">${position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="text-foreground">{position.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Value</p>
                <p className="text-foreground">${position.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Liq. Px
                </p>
                <p className="text-foreground">
                  {position.liquidationPx
                    ? `$${position.liquidationPx.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                Margin Used: ${position.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-primary font-semibold">ACTIVE</span>
            </div>
          </motion.div>
        ))}

        {positions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground font-mono text-sm">
            No active positions for this address
          </div>
        )}
      </div>
    </motion.div>
  );
};
