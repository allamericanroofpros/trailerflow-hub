import {
  LayoutDashboard,
  CalendarRange,
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
  ChevronDown,
  LogOut,
  Package,
  UtensilsCrossed,
  Shield,
  Briefcase,
  Clock,
  Compass,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useEntitlements } from "@/hooks/useEntitlements";
import { OrgSwitcher } from "./OrgSwitcher";
import vfLogo from "@/assets/vf-monogram.png";

type NavItem = {
  title: string;
  url: string;
  icon: any;
  viewKey: string;
  entitlementKey?: string;
};

type NavGroup = {
  title: string;
  icon: any;
  viewKey: string;
  children: NavItem[];
};

type SidebarEntry = NavItem | NavGroup;

const isGroup = (entry: SidebarEntry): entry is NavGroup => "children" in entry;

const sidebarEntries: SidebarEntry[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, viewKey: "dashboard" },
  { title: "Menu", url: "/menu", icon: UtensilsCrossed, viewKey: "menu" },
  { title: "Inventory", url: "/inventory", icon: Package, viewKey: "inventory" },
  { title: "Team", url: "/staff", icon: Users, viewKey: "staff" },
  { title: "Bookings", url: "/bookings", icon: ClipboardList, viewKey: "bookings" },
  { title: "Trailers", url: "/trailers", icon: Truck, viewKey: "trailers" },
  {
    title: "Management",
    icon: Briefcase,
    viewKey: "management",
    children: [
      { title: "Events", url: "/events", icon: CalendarRange, viewKey: "events" },
      { title: "Discover", url: "/discover", icon: Compass, viewKey: "discover", entitlementKey: "aiDiscovery" },
      { title: "Calendar", url: "/calendar", icon: Calendar, viewKey: "calendar" },
      { title: "Financials", url: "/financials", icon: DollarSign, viewKey: "financials" },
      { title: "Fleet", url: "/fleet", icon: BarChart3, viewKey: "fleet", entitlementKey: "fleetOverview" },
      { title: "Maintenance", url: "/maintenance", icon: Wrench, viewKey: "maintenance" },
      { title: "Time Clock", url: "/time-clock", icon: Clock, viewKey: "timeclock" },
    ],
  },
  { title: "Settings", url: "/settings", icon: Settings, viewKey: "settings" },
];

export function AppSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, canView } = useRoleAccess();
  const ent = useEntitlements();

  const isItemVisible = (item: NavItem): boolean => {
    if (!canView(item.viewKey)) return false;
    if (item.entitlementKey && !(ent as any)[item.entitlementKey]) return false;
    return true;
  };

  const mgmtGroup = sidebarEntries.find(e => isGroup(e)) as NavGroup | undefined;
  const isMgmtActive = mgmtGroup?.children.some(c => location.pathname.startsWith(c.url)) ?? false;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <img src={vfLogo} alt="VF" className="h-8 w-8 shrink-0 rounded-lg" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-sidebar-accent-foreground tracking-tight leading-tight">
              VendorFlow
            </span>
            {role && (
              <span className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-2.5 w-2.5" />
                {role}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Org Switcher */}
      <div className="border-b border-sidebar-border px-1 py-2">
        <OrgSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto scrollbar-thin">
        {sidebarEntries.map((entry) => {
          if (isGroup(entry)) {
            const visibleChildren = entry.children.filter(c => isItemVisible(c));
            if (visibleChildren.length === 0) return null;
            
            const groupOpen = mgmtOpen || isMgmtActive;

            return (
              <div key={entry.title}>
                <button
                  onClick={() => setMgmtOpen(!groupOpen)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                    isMgmtActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <entry.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{entry.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        groupOpen ? "rotate-0" : "-rotate-90"
                      )} />
                    </>
                  )}
                </button>
                {!collapsed && groupOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                    {visibleChildren.map((child) => {
                      const isActive = location.pathname.startsWith(child.url);
                      return (
                        <NavLink
                          key={child.title}
                          to={child.url}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span>{child.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (!isItemVisible(entry as NavItem)) return null;
          const isActive =
            entry.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(entry.url);

          return (
            <NavLink
              key={entry.title}
              to={entry.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <entry.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{entry.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-sidebar-border">
        {role === "super_admin" && (
          <NavLink
            to="/admin"
            className={cn(
              "flex w-full items-center gap-3 px-6 py-3 text-sm font-semibold text-sidebar-primary hover:bg-sidebar-accent transition-colors",
              collapsed && "justify-center px-3"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </NavLink>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center px-3"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => signOut()}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
