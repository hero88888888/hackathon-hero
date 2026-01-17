import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Position {
  id: string;
  coin: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  leverage: number;
  openTime: string;
  closeTime: string | null;
  pnl: number;
  status: "open" | "closed";
}

interface PositionHistoryProps {
  positions: Position[];
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
          Position History
        </h3>
        <div className="flex gap-2">
          <span className="text-xs font-mono px-2 py-1 bg-success/20 text-success rounded">
            {positions.filter((p) => p.status === "open").length} Open
          </span>
          <span className="text-xs font-mono px-2 py-1 bg-muted text-muted-foreground rounded">
            {positions.filter((p) => p.status === "closed").length} Closed
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
            className={`p-4 rounded-lg border ${
              position.status === "open"
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/50 border-border"
            }`}
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
                    position.pnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                </p>
                <p
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    position.status === "open"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {position.status.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <p className="text-muted-foreground">Entry</p>
                <p className="text-foreground">${position.entryPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Exit</p>
                <p className="text-foreground">
                  {position.exitPrice
                    ? `$${position.exitPrice.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="text-foreground">{position.size.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{position.openTime}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
