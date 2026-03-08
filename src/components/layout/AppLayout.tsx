import { ReactNode, useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar, TrailerContext } from "./TopBar";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";
import { HelpPanel } from "@/components/help/HelpPanel";
import { DemoBanner } from "./OrgSwitcher";
import { HelpCircle } from "lucide-react";

const TRAILER_KEY = "traileros_selected_trailer";

export function AppLayout({ children }: { children: ReactNode }) {
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(() => {
    return localStorage.getItem(TRAILER_KEY);
  });
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (selectedTrailerId) {
      localStorage.setItem(TRAILER_KEY, selectedTrailerId);
    } else {
      localStorage.removeItem(TRAILER_KEY);
    }
  }, [selectedTrailerId]);

  return (
    <TrailerContext.Provider value={{ selectedTrailerId, setSelectedTrailerId }}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <DemoBanner />
          <TopBar />
          <main className="flex-1 overflow-auto p-6 scrollbar-thin">
            {children}
          </main>
        </div>
        <AIChatDrawer />
        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
        {/* Help FAB */}
        {!helpOpen && (
          <button
            onClick={() => setHelpOpen(true)}
            className="fixed bottom-6 right-20 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground shadow-lg hover:bg-primary hover:text-primary-foreground transition-all"
            title="Help Center"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </TrailerContext.Provider>
  );
}
