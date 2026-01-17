import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface AddressInputProps {
  onSearch: (address: string) => void;
  isLoading: boolean;
  builderFilter: boolean;
  onBuilderFilterChange: (value: boolean) => void;
}

export const AddressInput = ({
  onSearch,
  isLoading,
  builderFilter,
  onBuilderFilterChange,
}: AddressInputProps) => {
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="terminal-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-destructive" />
        <div className="w-2 h-2 rounded-full bg-warning" />
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-muted-foreground font-mono ml-2">
          address_lookup.sh
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="pl-10 font-mono text-sm bg-background border-border focus:border-primary focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono glow-primary"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Query"
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Switch
              checked={builderFilter}
              onCheckedChange={onBuilderFilterChange}
              className="data-[state=checked]:bg-primary"
            />
            <label className="text-sm font-mono text-muted-foreground">
              Builder-only filter (Insilico users)
            </label>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {builderFilter ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </form>
    </motion.div>
  );
};
