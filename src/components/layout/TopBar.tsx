import { ChevronDown, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TopBar() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, business_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" className="gap-2 text-sm font-medium">
          <div className="h-2 w-2 rounded-full bg-success" />
          {profile?.business_name || "My Trailer"}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>

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
