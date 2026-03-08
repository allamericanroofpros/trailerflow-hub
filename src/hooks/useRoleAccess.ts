import { useAuth } from "@/contexts/AuthContext";

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
    "manage_staff", "manage_bookings", "manage_maintenance",
    "run_end_of_day", "view_reports",
  ],
  staff: [
    "view_dashboard", "view_pos", "view_menu", "view_inventory", "view_calendar",
    "view_bookings", "view_maintenance", "view_management", "view_timeclock",
    "run_end_of_day",
  ],
};

export function useRoleAccess() {
  const { role } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    if (role === "super_admin") return true; // Super admins have all permissions
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const canView = (page: string): boolean => {
    return hasPermission(`view_${page}` as Permission);
  };

  const canManage = (resource: string): boolean => {
    return hasPermission(`manage_${resource}` as Permission);
  };

  const isOwner = role === "owner" || role === "super_admin";
  const isManager = role === "manager";
  const isStaff = role === "staff";
  const isSuperAdmin = role === "super_admin";

  return { role, hasPermission, canView, canManage, isOwner, isManager, isStaff, isSuperAdmin };
}
