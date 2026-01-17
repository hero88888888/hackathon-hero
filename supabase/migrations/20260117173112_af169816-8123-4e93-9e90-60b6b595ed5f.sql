-- Create trades table for normalized fills
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  coin TEXT NOT NULL,
  time_ms BIGINT NOT NULL,
  side TEXT NOT NULL,
  px NUMERIC NOT NULL,
  sz NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  closed_pnl NUMERIC NOT NULL DEFAULT 0,
  notional_value NUMERIC NOT NULL DEFAULT 0,
  builder TEXT,
  is_builder_trade BOOLEAN NOT NULL DEFAULT false,
  position_lifecycle_id UUID,
  tainted BOOLEAN NOT NULL DEFAULT false,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create position_lifecycles table
CREATE TABLE public.position_lifecycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  coin TEXT NOT NULL,
  side TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  open_time BIGINT NOT NULL,
  close_time BIGINT,
  avg_entry_px NUMERIC NOT NULL DEFAULT 0,
  max_size NUMERIC NOT NULL DEFAULT 0,
  realized_pnl NUMERIC NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  builder_only BOOLEAN NOT NULL DEFAULT false,
  tainted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create positions table for time-ordered position states
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  coin TEXT NOT NULL,
  time_ms BIGINT NOT NULL,
  net_size NUMERIC NOT NULL DEFAULT 0,
  avg_entry_px NUMERIC NOT NULL DEFAULT 0,
  liq_px NUMERIC,
  margin_used NUMERIC,
  unrealized_pnl NUMERIC NOT NULL DEFAULT 0,
  leverage NUMERIC,
  tainted BOOLEAN NOT NULL DEFAULT false,
  builder_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pnl_snapshots table for aggregated PnL data
CREATE TABLE public.pnl_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  coin TEXT,
  time_ms BIGINT NOT NULL,
  realized_pnl NUMERIC NOT NULL DEFAULT 0,
  fees_paid NUMERIC NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  volume NUMERIC NOT NULL DEFAULT 0,
  equity_usd NUMERIC,
  tainted BOOLEAN NOT NULL DEFAULT false,
  builder_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposits table (bonus feature)
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  time_ms BIGINT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equity_snapshots table for tracking starting capital
CREATE TABLE public.equity_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  time_ms BIGINT NOT NULL,
  equity_usd NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_trades_user_coin ON public.trades(user_address, coin);
CREATE INDEX idx_trades_time ON public.trades(time_ms);
CREATE INDEX idx_trades_builder ON public.trades(is_builder_trade);
CREATE INDEX idx_position_lifecycles_user ON public.position_lifecycles(user_address, coin);
CREATE INDEX idx_positions_user_coin ON public.positions(user_address, coin);
CREATE INDEX idx_positions_time ON public.positions(time_ms);
CREATE INDEX idx_pnl_snapshots_user ON public.pnl_snapshots(user_address);
CREATE INDEX idx_deposits_user ON public.deposits(user_address);
CREATE INDEX idx_equity_snapshots_user ON public.equity_snapshots(user_address, time_ms);

-- Add foreign key for trades to position_lifecycles
ALTER TABLE public.trades 
ADD CONSTRAINT fk_trades_lifecycle 
FOREIGN KEY (position_lifecycle_id) 
REFERENCES public.position_lifecycles(id) 
ON DELETE SET NULL;

-- Enable Row Level Security (public read for hackathon demo)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_lifecycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

-- Create public read policies (for hackathon - data is public blockchain data)
CREATE POLICY "Public read access for trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Public read access for position_lifecycles" ON public.position_lifecycles FOR SELECT USING (true);
CREATE POLICY "Public read access for positions" ON public.positions FOR SELECT USING (true);
CREATE POLICY "Public read access for pnl_snapshots" ON public.pnl_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read access for deposits" ON public.deposits FOR SELECT USING (true);
CREATE POLICY "Public read access for equity_snapshots" ON public.equity_snapshots FOR SELECT USING (true);

-- Create insert policies (for edge functions using service role)
CREATE POLICY "Service insert for trades" ON public.trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert for position_lifecycles" ON public.position_lifecycles FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert for positions" ON public.positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert for pnl_snapshots" ON public.pnl_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert for deposits" ON public.deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert for equity_snapshots" ON public.equity_snapshots FOR INSERT WITH CHECK (true);

-- Create update/delete policies for edge functions
CREATE POLICY "Service update for trades" ON public.trades FOR UPDATE USING (true);
CREATE POLICY "Service delete for trades" ON public.trades FOR DELETE USING (true);
CREATE POLICY "Service update for position_lifecycles" ON public.position_lifecycles FOR UPDATE USING (true);
CREATE POLICY "Service delete for position_lifecycles" ON public.position_lifecycles FOR DELETE USING (true);
CREATE POLICY "Service update for positions" ON public.positions FOR UPDATE USING (true);
CREATE POLICY "Service delete for positions" ON public.positions FOR DELETE USING (true);
CREATE POLICY "Service update for pnl_snapshots" ON public.pnl_snapshots FOR UPDATE USING (true);
CREATE POLICY "Service delete for pnl_snapshots" ON public.pnl_snapshots FOR DELETE USING (true);