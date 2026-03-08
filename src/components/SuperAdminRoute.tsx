import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-destructive border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (role !== "super_admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
