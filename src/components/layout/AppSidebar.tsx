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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { OrgSwitcher } from "./OrgSwitcher";

type NavItem = {
  title: string;
  url: string;
  icon: any;
  viewKey: string;
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
      { title: "Calendar", url: "/calendar", icon: Calendar, viewKey: "calendar" },
      { title: "Financials", url: "/financials", icon: DollarSign, viewKey: "financials" },
      { title: "Fleet", url: "/fleet", icon: BarChart3, viewKey: "fleet" },
      { title: "Maintenance", url: "/maintenance", icon: Wrench, viewKey: "maintenance" },
      { title: "Time Clock", url: "/time-clock", icon: Clock, viewKey: "timeclock" },
    ],
  },
  { title: "Settings", url: "/settings", icon: Settings, viewKey: "settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, canView } = useRoleAccess();

  // Auto-open management group if current route is inside it
  const mgmtGroup = sidebarEntries.find(e => isGroup(e)) as NavGroup | undefined;
  const isMgmtActive = mgmtGroup?.children.some(c => location.pathname.startsWith(c.url)) ?? false;

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
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {sidebarEntries.map((entry) => {
          if (isGroup(entry)) {
            // Check if any child is visible
            const visibleChildren = entry.children.filter(c => canView(c.viewKey));
            if (visibleChildren.length === 0) return null;
            
            const groupOpen = mgmtOpen || isMgmtActive;

            return (
              <div key={entry.title}>
                <button
                  onClick={() => setMgmtOpen(!groupOpen)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
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
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
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

          // Regular nav item
          if (!canView(entry.viewKey)) return null;
          const isActive =
            entry.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(entry.url);

          return (
            <NavLink
              key={entry.title}
              to={entry.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
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

      {/* Super admin link + Sign out & collapse */}
      <div className="border-t border-sidebar-border">
        {role === "super_admin" && (
          <NavLink
            to="/admin"
            className={cn(
              "flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors",
              collapsed && "justify-center px-3"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </NavLink>
        )}
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
