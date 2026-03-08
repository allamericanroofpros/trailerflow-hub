import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search, Shield, UserPlus, Edit3, LogIn, Wrench, Unlink, Link2,
  Building2, Trash2, ShieldOff, ChevronLeft, ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 50;

const actionMeta: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  create_user: { label: "Created User", icon: UserPlus, color: "text-emerald-600 bg-emerald-100" },
  delete_user: { label: "Deleted User", icon: Trash2, color: "text-destructive bg-destructive/10" },
  change_global_role: { label: "Changed Role", icon: Shield, color: "text-primary bg-primary/10" },
  disable_user: { label: "Disabled User", icon: ShieldOff, color: "text-amber-600 bg-amber-100" },
  enable_user: { label: "Enabled User", icon: Shield, color: "text-emerald-600 bg-emerald-100" },
  update_profile: { label: "Updated Profile", icon: Edit3, color: "text-blue-600 bg-blue-100" },
  impersonate_start: { label: "Impersonated", icon: LogIn, color: "text-destructive bg-destructive/10" },
  add_membership: { label: "Added Membership", icon: Link2, color: "text-primary bg-primary/10" },
  remove_membership: { label: "Removed Membership", icon: Unlink, color: "text-amber-600 bg-amber-100" },
  change_org_role: { label: "Changed Org Role", icon: Building2, color: "text-blue-600 bg-blue-100" },
  update_org: { label: "Updated Org", icon: Building2, color: "text-blue-600 bg-blue-100" },
  repair_user: { label: "Repaired User", icon: Wrench, color: "text-emerald-600 bg-emerald-100" },
  repair_org_membership: { label: "Repaired Org", icon: Wrench, color: "text-emerald-600 bg-emerald-100" },
};

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: actorProfiles } = useQuery({
    queryKey: ["admin_audit_actors"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return new Map((data || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin_audit_log", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = logs?.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const actorName = actorProfiles?.get(log.actor_id)?.toLowerCase() || "";
    return (
      log.action.toLowerCase().includes(s) ||
      actorName.includes(s) ||
      (log.target_id || "").toLowerCase().includes(s) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            All high-risk admin actions are logged here for traceability.
          </p>
        </div>

        <div className="relative max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions, actors, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No audit entries found.</p>
          ) : (
            filtered?.map((log) => {
              const meta = actionMeta[log.action] || {
                label: log.action.replace(/_/g, " "),
                icon: Shield,
                color: "text-muted-foreground bg-muted",
              };
              const Icon = meta.icon;
              const details = log.details as Record<string, unknown> | null;
              const actorName = actorProfiles?.get(log.actor_id) || log.actor_id.slice(0, 8);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 sm:p-4"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                      {log.target_type && (
                        <Badge variant="outline" className="text-[10px] h-5 capitalize">
                          {log.target_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by <span className="font-medium text-foreground">{actorName}</span>
                      {log.target_id && (
                        <> · target: <span className="font-mono text-[10px]">{log.target_id.slice(0, 12)}...</span></>
                      )}
                    </p>
                    {details && Object.keys(details).length > 0 && (
                      <div className="mt-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground font-mono break-all">
                        {Object.entries(details).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-foreground/70">{k}:</span>{" "}
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5" title={format(new Date(log.created_at), "PPpp")}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={(logs?.length || 0) < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
