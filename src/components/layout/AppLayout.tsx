import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar, TrailerContext } from "./TopBar";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";
import { HelpPanel } from "@/components/help/HelpPanel";
import { DemoBanner } from "./OrgSwitcher";
import { HelpCircle, LayoutDashboard, CalendarRange, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TRAILER_KEY = "traileros_selected_trailer";

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Events", url: "/events", icon: CalendarRange },
  { title: "Bookings", url: "/bookings", icon: ClipboardList },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(() => {
    return localStorage.getItem(TRAILER_KEY);
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();

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
        {/* Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <AppSidebar defaultCollapsed />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <DemoBanner />
          <TopBar />
          <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 lg:pb-6 scrollbar-thin">
            {children}
          </main>
        </div>
        <AIChatDrawer />
        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
        
        {/* Help FAB - adjust position for mobile bottom nav */}
        {!helpOpen && (
          <button
            onClick={() => setHelpOpen(true)}
            className="fixed bottom-20 lg:bottom-6 right-20 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground shadow-lg hover:bg-primary hover:text-primary-foreground transition-all"
            title="Help Center"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        )}

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card px-2 py-2 safe-bottom">
          {bottomNavItems.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </TrailerContext.Provider>
  );
}
