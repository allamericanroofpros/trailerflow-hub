import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useEntitlements } from "@/hooks/useEntitlements";

const routeToViewKey: Record<string, string> = {
  "/": "dashboard",
  "/pos": "pos",
  "/menu": "menu",
  "/inventory": "inventory",
  "/events": "events",
  "/discover": "discover",
  "/calendar": "calendar",
  "/fleet": "fleet",
  "/trailers": "trailers",
  "/staff": "staff",
  "/bookings": "bookings",
  "/financials": "financials",
  "/maintenance": "maintenance",
  "/settings": "settings",
};

/** Routes that require a specific entitlement boolean to be true */
const routeToEntitlement: Record<string, string> = {
  "/discover": "aiDiscovery",
  "/fleet": "fleetOverview",
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { canView } = useRoleAccess();
  const ent = useEntitlements();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Role-based gating
  const viewKey = routeToViewKey[location.pathname];
  if (viewKey && !canView(viewKey)) {
    return <Navigate to="/" replace />;
  }

  // Plan-based gating — redirect to dashboard (page will show upgrade banner if accessed directly)
  const entKey = routeToEntitlement[location.pathname];
  if (entKey && !(ent as any)[entKey]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
