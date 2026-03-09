import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar, TrailerContext } from "./TopBar";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";
import { HelpPanel } from "@/components/help/HelpPanel";
import { DemoBanner } from "./OrgSwitcher";
import {
  HelpCircle, LayoutDashboard, CalendarRange, ClipboardList, Settings,
  MoreHorizontal, X, UtensilsCrossed, Package, Users, Truck, Calendar,
  DollarSign, BarChart3, Wrench, Clock, Compass, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useEntitlements } from "@/hooks/useEntitlements";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const TRAILER_KEY = "traileros_selected_trailer";

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Events", url: "/events", icon: CalendarRange },
  { title: "Bookings", url: "/bookings", icon: ClipboardList },
];

const moreMenuItems = [
  { title: "Menu", url: "/menu", icon: UtensilsCrossed, viewKey: "menu" },
  { title: "Inventory", url: "/inventory", icon: Package, viewKey: "inventory" },
  { title: "Team", url: "/staff", icon: Users, viewKey: "staff" },
  { title: "Trailers", url: "/trailers", icon: Truck, viewKey: "trailers" },
  { title: "Calendar", url: "/calendar", icon: Calendar, viewKey: "calendar" },
  { title: "Financials", url: "/financials", icon: DollarSign, viewKey: "financials" },
  { title: "Discover", url: "/discover", icon: Compass, viewKey: "discover", entitlementKey: "aiDiscovery" },
  { title: "Fleet", url: "/fleet", icon: BarChart3, viewKey: "fleet", entitlementKey: "fleetOverview" },
  { title: "Maintenance", url: "/maintenance", icon: Wrench, viewKey: "maintenance" },
  { title: "Time Clock", url: "/time-clock", icon: Clock, viewKey: "timeclock" },
  { title: "Settings", url: "/settings", icon: Settings, viewKey: "settings" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(() => {
    return localStorage.getItem(TRAILER_KEY);
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, canView } = useRoleAccess();
  const ent = useEntitlements();

  useEffect(() => {
    if (selectedTrailerId) {
      localStorage.setItem(TRAILER_KEY, selectedTrailerId);
    } else {
      localStorage.removeItem(TRAILER_KEY);
    }
  }, [selectedTrailerId]);

  // Filter menu items by role and entitlement
  const visibleMoreItems = moreMenuItems.filter((item) => {
    if (!canView(item.viewKey)) return false;
    if (item.entitlementKey && !(ent as any)[item.entitlementKey]) return false;
    return true;
  });

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
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </nav>

        {/* More menu sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl pb-safe">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg">Menu</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-3 py-4">
              {visibleMoreItems.map((item) => {
                const isActive = location.pathname.startsWith(item.url);
                return (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-center leading-tight">{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
            {role === "super_admin" && (
              <NavLink
                to="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-medium text-primary transition-all hover:bg-primary/10"
              >
                <Shield className="h-5 w-5" />
                <span>Admin Panel</span>
              </NavLink>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TrailerContext.Provider>
  );
}
