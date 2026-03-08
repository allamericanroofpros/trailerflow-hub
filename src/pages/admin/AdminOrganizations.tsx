import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Building2, Search, MoreHorizontal, Ban, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminOrganizations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*, organization_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase
        .from("organizations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_organizations"] });
      toast.success("Organization status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = orgs?.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage all customer accounts on the platform.
          </p>
        </div>

        <div className="relative max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mobile card layout */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No organizations found.</p>
          ) : (
            filtered?.map((org) => (
              <div key={org.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleStatus.mutate({ id: org.id, status: org.status })}
                      >
                        {org.status === "active" ? (
                          <><Ban className="h-4 w-4 mr-2" /> Suspend</>
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-2" /> Reactivate</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="secondary" className="capitalize text-xs">{org.plan}</Badge>
                  <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-xs">
                    {org.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(org as any).organization_members?.[0]?.count ?? 0} members
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(org.created_at).toLocaleDateString()}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organization</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Members</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered?.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No organizations found.</td></tr>
                ) : (
                  filtered?.map((org) => (
                    <tr key={org.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{org.name}</p>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{org.plan}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize">{org.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{(org as any).organization_members?.[0]?.count ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: org.id, status: org.status })}>
                              {org.status === "active" ? <><Ban className="h-4 w-4 mr-2" /> Suspend</> : <><CheckCircle className="h-4 w-4 mr-2" /> Reactivate</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
