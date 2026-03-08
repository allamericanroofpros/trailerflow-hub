import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, MoreHorizontal, Shield, ShieldOff, Trash2, UserCog, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const roleBadge: Record<string, { variant: "destructive" | "default" | "secondary" | "outline"; label: string }> = {
  super_admin: { variant: "destructive", label: "Super Admin" },
  owner: { variant: "default", label: "Owner" },
  manager: { variant: "secondary", label: "Manager" },
  staff: { variant: "outline", label: "Staff" },
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch profiles + roles + org memberships + auth details (email, last sign in, banned)
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users_full"],
    queryFn: async () => {
      const [profilesRes, rolesRes, membershipsRes, authRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("organization_members").select("user_id, org_id, role, organization:organizations(name)"),
        supabase.functions.invoke("admin-manage-user", { body: { action: "list_auth_users" } }),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const memberships = membershipsRes.data || [];
      const authUsers: any[] = authRes.data?.users || [];

      return profiles.map((p) => {
        const auth = authUsers.find((a: any) => a.id === p.user_id);
        return {
          ...p,
          globalRole: roles.find((r) => r.user_id === p.user_id)?.role || "staff",
          orgs: memberships.filter((m) => m.user_id === p.user_id) || [],
          email: auth?.email || "—",
          last_sign_in: auth?.last_sign_in_at,
          banned: !!auth?.banned_until && new Date(auth.banned_until) > new Date(),
        };
      });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "change_role", user_id, role },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleBan = useMutation({
    mutationFn: async ({ user_id, banned }: { user_id: string; banned: boolean }) => {
      const action = banned ? "enable_user" : "disable_user";
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, user_id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("User status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete_user", user_id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("User deleted"); setDeleteTarget(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const impersonate = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "impersonate", user_id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.token_hash) {
        // Use verifyOtp with the token_hash
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });
        if (otpError) throw otpError;
        window.location.href = "/";
      }
    },
    onError: (e: any) => toast.error(`Impersonation failed: ${e.message}`),
  });

  const filtered = users?.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const allRoles = ["super_admin", "owner", "manager", "staff"];

  const UserActions = ({ u }: { u: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCog className="h-4 w-4 mr-2" />Change Role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {allRoles.map((r) => (
              <DropdownMenuItem
                key={r}
                disabled={r === u.globalRole}
                onClick={() => changeRole.mutate({ user_id: u.user_id, role: r })}
                className="capitalize"
              >
                {r === u.globalRole && "✓ "}{r.replace("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => impersonate.mutate(u.user_id)}>
          <LogIn className="h-4 w-4 mr-2" />Impersonate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleBan.mutate({ user_id: u.user_id, banned: u.banned })}>
          {u.banned ? <><Shield className="h-4 w-4 mr-2" />Enable User</> : <><ShieldOff className="h-4 w-4 mr-2" />Disable User</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteTarget({ id: u.user_id, name: u.full_name || u.email })}
        >
          <Trash2 className="h-4 w-4 mr-2" />Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage all registered users — change roles, disable, or impersonate.
          </p>
        </div>

        <div className="relative max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            filtered?.map((u) => (
              <div key={u.id} className={`rounded-xl border bg-card p-4 shadow-sm ${u.banned ? "border-destructive/30 opacity-60" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={roleBadge[u.globalRole]?.variant || "secondary"} className="text-xs">
                      {roleBadge[u.globalRole]?.label || u.globalRole}
                    </Badge>
                    <UserActions u={u} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {u.banned && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                  {u.orgs.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No organizations</span>
                  ) : (
                    u.orgs.map((o: any) => (
                      <Badge key={o.org_id} variant="outline" className="text-xs">
                        {o.organization?.name || o.org_id.slice(0, 8)}
                      </Badge>
                    ))
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    Last login: {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : "Never"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organizations</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered?.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
                ) : (
                  filtered?.map((u) => (
                    <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${u.banned ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{u.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadge[u.globalRole]?.variant || "secondary"} className="capitalize">
                          {roleBadge[u.globalRole]?.label || u.globalRole}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.orgs.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            u.orgs.map((o: any) => (
                              <Badge key={o.org_id} variant="outline" className="text-xs">
                                {o.organization?.name || o.org_id.slice(0, 8)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.banned ? (
                          <Badge variant="destructive" className="text-xs">Disabled</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {u.last_sign_in ? new Date(u.last_sign_in).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActions u={u} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
