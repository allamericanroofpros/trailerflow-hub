import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: ReactNode;
  subtitle?: string;
}

export function MetricCard({ title, value, change, trend = "neutral", icon, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card card-hover">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
          {icon}
        </div>
      </div>
      {(change || subtitle) && (
        <div className="mt-3 flex items-center gap-1.5">
          {change && (
            <>
              {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-success" />}
              {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              {trend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            </>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
