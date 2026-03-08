import {
  LayoutDashboard,
  CalendarRange,
  Compass,
  Calendar,
  Truck,
  Users,
  ClipboardList,
  DollarSign,
  Wrench,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  Shield,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, viewKey: "dashboard" },
  // POS removed from sidebar — launched via Dashboard "Open for Business" button
  { title: "Menu", url: "/menu", icon: UtensilsCrossed, viewKey: "menu" },
  { title: "Inventory", url: "/inventory", icon: Package, viewKey: "inventory" },
  { title: "Events", url: "/events", icon: CalendarRange, viewKey: "events" },
  { title: "Calendar", url: "/calendar", icon: Calendar, viewKey: "calendar" },
  { title: "Fleet", url: "/fleet", icon: BarChart3, viewKey: "fleet" },
  { title: "Trailers", url: "/trailers", icon: Truck, viewKey: "trailers" },
  { title: "Team", url: "/staff", icon: Users, viewKey: "staff" },
  { title: "Bookings", url: "/bookings", icon: ClipboardList, viewKey: "bookings" },
  { title: "Financials", url: "/financials", icon: DollarSign, viewKey: "financials" },
  { title: "Maintenance", url: "/maintenance", icon: Wrench, viewKey: "maintenance" },
  { title: "Settings", url: "/settings", icon: Settings, viewKey: "settings" },
] as const;

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, canView } = useRoleAccess();

  const visibleItems = navItems.filter((item) => canView(item.viewKey));

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-warm">
          <Truck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight leading-tight">
              TrailerOS
            </span>
            {role && (
              <span className="text-[10px] font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-2.5 w-2.5" />
                {role}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);

          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sign out & collapse */}
      <div className="border-t border-sidebar-border">
        <button
          onClick={() => signOut()}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center p-3 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
