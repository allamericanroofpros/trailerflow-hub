import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";

type Permission =
  | "view_dashboard"
  | "view_pos"
  | "view_menu"
  | "view_inventory"
  | "view_events"
  | "view_discover"
  | "view_calendar"
  | "view_fleet"
  | "view_trailers"
  | "view_staff"
  | "view_bookings"
  | "view_financials"
  | "view_maintenance"
  | "view_settings"
  | "view_management"
  | "view_timeclock"
  | "manage_menu"
  | "manage_inventory"
  | "manage_events"
  | "manage_trailers"
  | "manage_staff"
  | "manage_bookings"
  | "manage_financials"
  | "manage_maintenance"
  | "manage_settings"
  | "manage_roles"
  | "delete_records"
  | "run_end_of_day"
  | "view_reports";

const rolePermissions: Record<string, Permission[]> = {
  owner: [
    "view_dashboard", "view_pos", "view_menu", "view_inventory", "view_events",
    "view_discover", "view_calendar", "view_fleet", "view_trailers", "view_staff",
    "view_bookings", "view_financials", "view_maintenance", "view_settings",
    "view_management", "view_timeclock",
    "manage_menu", "manage_inventory", "manage_events", "manage_trailers",
    "manage_staff", "manage_bookings", "manage_financials", "manage_maintenance",
    "manage_settings", "manage_roles", "delete_records", "run_end_of_day", "view_reports",
  ],
  manager: [
    "view_dashboard", "view_pos", "view_menu", "view_inventory", "view_events",
    "view_discover", "view_calendar", "view_fleet", "view_trailers", "view_staff",
    "view_bookings", "view_financials", "view_maintenance", "view_settings",
    "view_management", "view_timeclock",
    "manage_menu", "manage_inventory", "manage_events", "manage_trailers",
    "manage_staff", "manage_bookings", "manage_financials", "manage_maintenance",
    "manage_settings", "delete_records", "run_end_of_day", "view_reports",
  ],
  staff: [
    "view_dashboard", "view_pos", "view_menu", "view_inventory",
    "view_timeclock",
    "run_end_of_day",
  ],
};

export function useRoleAccess() {
  const { role: globalRole } = useAuth();
  const { orgRole } = useOrg();

  // Use org-scoped role as primary, fall back to global role for super_admin
  const effectiveRole = globalRole === "super_admin" ? "super_admin" : orgRole || globalRole;

  const hasPermission = (permission: Permission): boolean => {
    if (!effectiveRole) return false;
    if (effectiveRole === "super_admin") return true;
    return rolePermissions[effectiveRole]?.includes(permission) ?? false;
  };

  const canView = (page: string): boolean => {
    return hasPermission(`view_${page}` as Permission);
  };

  const canManage = (resource: string): boolean => {
    return hasPermission(`manage_${resource}` as Permission);
  };

  const isOwner = effectiveRole === "owner" || effectiveRole === "super_admin";
  const isManager = effectiveRole === "manager";
  const isStaff = effectiveRole === "staff";
  const isSuperAdmin = globalRole === "super_admin";

  return { role: effectiveRole, hasPermission, canView, canManage, isOwner, isManager, isStaff, isSuperAdmin };
}
