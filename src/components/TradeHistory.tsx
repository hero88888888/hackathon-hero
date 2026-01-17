import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProcessedTrade } from "@/lib/hyperliquid";

interface TradeHistoryProps {
  trades: ProcessedTrade[];
  onTradeClick: (trade: ProcessedTrade) => void;
}

export const TradeHistory = ({ trades, onTradeClick }: TradeHistoryProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="terminal-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-mono font-semibold text-foreground">
          Trade History
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {trades.length} trades • Click for details
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground">
                TIME
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">
                COIN
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">
                SIDE
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">
                DIRECTION
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">
                SIZE
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">
                PRICE
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">
                PNL
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">
                FEE
              </TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-center">
                TX
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <motion.tr
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onTradeClick(trade)}
                className="border-border hover:bg-muted/50 cursor-pointer"
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {trade.timestamp}
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-foreground">
                  {trade.coin}
                </TableCell>
                <TableCell>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${
                      trade.side === "long"
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {trade.side === "long" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {trade.side.toUpperCase()}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {trade.direction}
                </TableCell>
                <TableCell className="font-mono text-sm text-right text-foreground">
                  {trade.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </TableCell>
                <TableCell className="font-mono text-sm text-right text-foreground">
                  ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </TableCell>
                <TableCell
                  className={`font-mono text-sm text-right font-medium ${
                    trade.pnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(4)}
                </TableCell>
                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                  ${trade.fee.toFixed(4)}
                </TableCell>
                <TableCell className="text-center">
                  <a
                    href={`https://app.hyperliquid.xyz/explorer/tx/${trade.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-primary/20 transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-3 h-3 text-primary" />
                  </a>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {trades.length === 0 && (
        <div className="text-center py-8 text-muted-foreground font-mono text-sm">
          No trades found for this address
        </div>
      )}
    </motion.div>
  );
};
