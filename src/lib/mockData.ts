export const generateMockTrades = () => {
  const coins = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "ARB-PERP", "DOGE-PERP"];
  const trades = [];

  for (let i = 0; i < 15; i++) {
    const side = Math.random() > 0.5 ? "long" : "short";
    const pnl = (Math.random() - 0.4) * 500;
    const basePrice = {
      "BTC-PERP": 97000,
      "ETH-PERP": 3400,
      "SOL-PERP": 190,
      "ARB-PERP": 0.75,
      "DOGE-PERP": 0.32,
    };
    const coin = coins[Math.floor(Math.random() * coins.length)];

    trades.push({
      id: `trade-${i}`,
      timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 24)
        .toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      coin,
      side: side as "long" | "short",
      size: Math.floor(Math.random() * 10000) + 100,
      price: basePrice[coin as keyof typeof basePrice] * (1 + (Math.random() - 0.5) * 0.02),
      pnl,
      fee: Math.random() * 5 + 1,
    });
  }

  return trades;
};

export const generateMockPnLData = () => {
  const data = [];
  let cumulative = 0;
  const days = ["Jan 10", "Jan 11", "Jan 12", "Jan 13", "Jan 14", "Jan 15", "Jan 16"];

  for (const day of days) {
    const pnl = (Math.random() - 0.35) * 1000;
    cumulative += pnl;
    data.push({
      time: day,
      pnl,
      cumulative,
    });
  }

  return data;
};

export const generateMockPositions = () => {
  return [
    {
      id: "pos-1",
      coin: "BTC-PERP",
      side: "long" as const,
      entryPrice: 96500,
      exitPrice: null,
      size: 5000,
      leverage: 10,
      openTime: "Jan 16, 14:30",
      closeTime: null,
      pnl: 245.50,
      status: "open" as const,
    },
    {
      id: "pos-2",
      coin: "ETH-PERP",
      side: "short" as const,
      entryPrice: 3420,
      exitPrice: 3380,
      size: 2500,
      leverage: 5,
      openTime: "Jan 15, 09:15",
      closeTime: "Jan 15, 16:45",
      pnl: 147.20,
      status: "closed" as const,
    },
    {
      id: "pos-3",
      coin: "SOL-PERP",
      side: "long" as const,
      entryPrice: 185,
      exitPrice: 178,
      size: 1000,
      leverage: 20,
      openTime: "Jan 14, 11:00",
      closeTime: "Jan 14, 23:30",
      pnl: -378.38,
      status: "closed" as const,
    },
    {
      id: "pos-4",
      coin: "ARB-PERP",
      side: "long" as const,
      entryPrice: 0.72,
      exitPrice: null,
      size: 8000,
      leverage: 3,
      openTime: "Jan 16, 08:00",
      closeTime: null,
      pnl: 89.60,
      status: "open" as const,
    },
  ];
};

export const generateMockStats = () => ({
  totalTrades: 247,
  winRate: 58.3,
  totalVolume: 1245890,
  avgPnL: 127.45,
  bestTrade: 2340.50,
  worstTrade: 890.25,
});
