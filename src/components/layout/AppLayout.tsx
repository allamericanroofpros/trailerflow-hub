import { ReactNode, useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar, TrailerContext } from "./TopBar";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";

const TRAILER_KEY = "traileros_selected_trailer";

export function AppLayout({ children }: { children: ReactNode }) {
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(() => {
    return localStorage.getItem(TRAILER_KEY);
  });

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
          <TopBar />
          <main className="flex-1 overflow-auto p-6 scrollbar-thin">
            {children}
          </main>
        </div>
        <AIChatDrawer />
      </div>
    </TrailerContext.Provider>
  );
}
