import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, X } from "lucide-react";

export function ImpersonationBanner() {
  const [info, setInfo] = useState<{ targetEmail: string; targetName: string; startedAt: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("impersonating");
    if (raw) {
      try { setInfo(JSON.parse(raw)); } catch { localStorage.removeItem("impersonating"); }
    }
  }, []);

  if (!info) return null;

  const handleExit = async () => {
    localStorage.removeItem("impersonating");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm font-semibold shadow-lg">
      <Shield className="h-4 w-4 shrink-0" />
      <span>Impersonating: {info.targetName || info.targetEmail}</span>
      <button
        onClick={handleExit}
        className="ml-2 flex items-center gap-1 rounded-md bg-destructive-foreground/20 px-3 py-1 text-xs font-bold hover:bg-destructive-foreground/30 transition-colors"
      >
        <X className="h-3 w-3" />
        Exit
      </button>
    </div>
  );
}
