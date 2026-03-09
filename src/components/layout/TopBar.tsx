import { ChevronDown, Sparkles, User, Truck, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTrailers } from "@/hooks/useTrailers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, createContext, useContext } from "react";

// Context for selected trailer across the app
const TrailerContext = createContext<{
  selectedTrailerId: string | null;
  setSelectedTrailerId: (id: string | null) => void;
}>({ selectedTrailerId: null, setSelectedTrailerId: () => {} });

export function useSelectedTrailer() {
  return useContext(TrailerContext);
}

export { TrailerContext };

export function TopBar() {
  const { user } = useAuth();
  const { data: trailers } = useTrailers();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, business_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { selectedTrailerId, setSelectedTrailerId } = useSelectedTrailer();
  const selectedTrailer = trailers?.find(t => t.id === selectedTrailerId);
  const displayName = selectedTrailer?.name || profile?.business_name || "All Trailers";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 text-sm font-medium">
              <div className={`h-2 w-2 rounded-full ${selectedTrailer ? (selectedTrailer.status === "active" ? "bg-success" : "bg-warning") : "bg-primary"}`} />
              {displayName}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Select Trailer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSelectedTrailerId(null)}
              className="flex items-center gap-2"
            >
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1">All Trailers</span>
              {!selectedTrailerId && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {trailers?.map(t => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setSelectedTrailerId(t.id)}
                className="flex items-center gap-2"
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${t.status === "active" ? "bg-success" : t.status === "maintenance" ? "bg-warning" : "bg-muted-foreground"}`} />
                <span className="flex-1 truncate">{t.name}</span>
                {selectedTrailerId === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            {(!trailers || trailers.length === 0) && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">No trailers yet</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI Forecast: <span className="font-semibold text-foreground">$12,400 projected this week</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationDropdown />

        <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-none">{profile?.full_name || user?.email?.split("@")[0] || "User"}</p>
            <p className="text-xs text-muted-foreground">Owner</p>
          </div>
        </button>
      </div>
    </header>
  );
}
