import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PnLDataPoint {
  time: string;
  pnl: number;
  cumulative: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
  totalPnL: number;
  totalPnLPercent: number;
}

export const PnLChart = ({ data, totalPnL, totalPnLPercent }: PnLChartProps) => {
  const isPositive = totalPnL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="terminal-card"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-mono font-semibold text-foreground">
            Cumulative PnL
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Historical performance over time
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-2xl font-mono font-bold ${
              isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {isPositive ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm font-mono ${
              isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {isPositive ? "+" : ""}{totalPnLPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "hsl(145, 72%, 45%)" : "hsl(0, 72%, 55%)"}
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "hsl(145, 72%, 45%)" : "hsl(0, 72%, 55%)"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 10%)",
                border: "1px solid hsl(220, 15%, 18%)",
                borderRadius: "8px",
                fontFamily: "JetBrains Mono",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(180, 100%, 95%)" }}
              formatter={(value: number) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                "PnL",
              ]}
            />
            <ReferenceLine y={0} stroke="hsl(220, 15%, 25%)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={isPositive ? "hsl(145, 72%, 45%)" : "hsl(0, 72%, 55%)"}
              strokeWidth={2}
              fill="url(#pnlGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
