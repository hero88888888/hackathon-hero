import { motion } from "framer-motion";
import { Activity, Zap } from "lucide-react";

export const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center glow-primary">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold text-gradient">
                HL Trade Ledger
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Hyperliquid Analytics API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full border border-success/30">
              <Zap className="w-3 h-3 text-success" />
              <span className="text-xs font-mono text-success">LIVE</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-mono">Block Speed</p>
              <p className="text-sm font-mono text-primary">~80ms</p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
