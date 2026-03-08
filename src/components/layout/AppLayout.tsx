import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar, TrailerContext } from "./TopBar";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";

export function AppLayout({ children }: { children: ReactNode }) {
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);

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
