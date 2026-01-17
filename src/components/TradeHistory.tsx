import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Trade {
  id: string;
  timestamp: string;
  coin: string;
  side: "long" | "short";
  size: number;
  price: number;
  pnl: number;
  fee: number;
}

interface TradeHistoryProps {
  trades: Trade[];
}

export const TradeHistory = ({ trades }: TradeHistoryProps) => {
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
          {trades.length} trades
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <motion.tr
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-border hover:bg-muted/50"
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
                <TableCell className="font-mono text-sm text-right text-foreground">
                  {trade.size.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-sm text-right text-foreground">
                  ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell
                  className={`font-mono text-sm text-right font-medium ${
                    trade.pnl >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                  ${trade.fee.toFixed(2)}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};
