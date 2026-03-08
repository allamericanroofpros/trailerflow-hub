import { useInventoryItems, useLowStockItems } from "@/hooks/useInventory";
import { AlertTriangle, Package, Loader2, Search } from "lucide-react";
import { useState, forwardRef } from "react";

const POSInventoryView = forwardRef<HTMLDivElement>(function POSInventoryView(_props, ref) {
  const { data: items, isLoading } = useInventoryItems();
  const { data: lowStock } = useLowStockItems();
  const [search, setSearch] = useState("");

  const filtered = items?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading inventory...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-destructive">Low Stock Alert</p>
            <p className="text-sm text-muted-foreground mt-1">
              {lowStock.map((i) => i.name).join(", ")} — below reorder point
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-3 max-w-md">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory..."
          className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground font-medium"
        />
      </div>

      {/* Stock Grid */}
      {!filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 text-muted-foreground/20" />
          <p className="text-base font-bold">No inventory items</p>
          <p className="text-sm mt-1">Add items on the Inventory page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((item) => {
            const isLow = item.reorder_point && Number(item.current_stock) <= Number(item.reorder_point);
            const pct = item.par_level && Number(item.par_level) > 0
              ? Math.min(100, (Number(item.current_stock) / Number(item.par_level)) * 100)
              : null;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 bg-card p-4 ${
                  isLow ? "border-destructive/40" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-black text-card-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{item.unit}</p>
                  </div>
                  {isLow && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                </div>

                <p className={`text-3xl font-black ${isLow ? "text-destructive" : "text-card-foreground"}`}>
                  {Number(item.current_stock).toFixed(1)}
                </p>

                {pct !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Par: {Number(item.par_level).toFixed(1)}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct < 25 ? "bg-destructive" : pct < 50 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.supplier && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">📦 {item.supplier}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default POSInventoryView;
