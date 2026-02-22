import { Bell, ChevronDown, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        {/* Trailer Selector */}
        <Button variant="outline" className="gap-2 text-sm font-medium">
          <div className="h-2 w-2 rounded-full bg-success" />
          Sweet Scoops Trailer
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>

        {/* AI Forecast Chip */}
        <div className="hidden md:flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI Forecast: <span className="font-semibold text-foreground">$12,400 projected this week</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
        </button>

        {/* User Profile */}
        <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-none">Jamie Rivera</p>
            <p className="text-xs text-muted-foreground">Owner</p>
          </div>
        </button>
      </div>
    </header>
  );
}
