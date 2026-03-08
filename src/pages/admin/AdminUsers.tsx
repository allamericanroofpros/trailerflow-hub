import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("user_id, org_id, role, organization:organizations(name)")
        .in("user_id", userIds);

      return profiles.map((p) => ({
        ...p,
        globalRole: roles?.find((r) => r.user_id === p.user_id)?.role || "staff",
        orgs: memberships?.filter((m) => m.user_id === p.user_id) || [],
      }));
    },
  });

  const filtered = users?.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.includes(search)
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All registered users across the platform.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Global Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organizations</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              ) : (
                filtered?.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{u.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{u.phone || "No phone"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={(u.globalRole as string) === "super_admin" ? "destructive" : "secondary"}
                        className="capitalize"
                      >
                        {u.globalRole}
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
