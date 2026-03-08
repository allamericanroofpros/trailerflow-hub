import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
} from "lucide-react";

const adminNav = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Organizations", url: "/admin/organizations", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      {/* Header */}
      <div className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-4 w-4 text-destructive-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground tracking-tight leading-tight">
              TrailerOS
            </span>
            <span className="text-[10px] font-medium text-destructive uppercase tracking-wider">
              Super Admin
            </span>
          </div>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {adminNav.map((item) => {
          const isActive =
            item.url === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Back to App</span>
        </NavLink>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-border bg-card">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r border-border bg-card transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 sm:h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">Platform Administration</h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex items-center justify-around border-t border-border bg-card px-2 py-2 safe-bottom">
          {adminNav.slice(0, 4).map((item) => {
            const isActive =
              item.url === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
