import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Copy, Check, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import type { ProcessedTrade } from "@/lib/hyperliquid";

interface TradeDetailModalProps {
  trade: ProcessedTrade | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeDetailModal = ({ trade, isOpen, onClose }: TradeDetailModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!trade) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(trade.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = `https://app.hyperliquid.xyz/explorer/tx/${trade.hash}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full z-50"
          >
            <div className="terminal-card border-primary/30">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      trade.side === "long"
                        ? "bg-success/20"
                        : "bg-destructive/20"
                    }`}
                  >
                    {trade.side === "long" ? (
                      <ArrowUpRight className="w-5 h-5 text-success" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-mono font-semibold text-foreground">
                      {trade.coin}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {trade.direction}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Trade Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Side
                    </p>
                    <p
                      className={`font-mono font-semibold ${
                        trade.side === "long" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Size
                    </p>
                    <p className="font-mono font-semibold text-foreground">
                      {trade.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Price
                    </p>
                    <p className="font-mono font-semibold text-foreground">
                      ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Notional Value
                    </p>
                    <p className="font-mono font-semibold text-foreground">
                      ${(trade.size * trade.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Realized PnL
                    </p>
                    <p
                      className={`font-mono font-semibold ${
                        trade.pnl >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      Total Fees
                    </p>
                    <p className="font-mono font-semibold text-muted-foreground">
                      ${(trade.fee + trade.builderFee).toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    Timestamp
                  </p>
                  <p className="font-mono font-semibold text-foreground">
                    {trade.timestamp}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    Unix: {trade.rawTime}
                  </p>
                </div>

                {/* Transaction Hash */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    Transaction Hash
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-primary break-all">
                      {trade.hash}
                    </code>
                    <button
                      onClick={copyHash}
                      className="p-2 hover:bg-muted rounded transition-colors shrink-0"
                      title="Copy hash"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    Fee Breakdown
                  </p>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-muted-foreground">Trading Fee</span>
                    <span className="text-foreground">${trade.fee.toFixed(4)}</span>
                  </div>
                  {trade.builderFee > 0 && (
                    <div className="flex justify-between text-sm font-mono mt-1">
                      <span className="text-muted-foreground">Builder Fee</span>
                      <span className="text-primary">${trade.builderFee.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-mono text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-mono text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
