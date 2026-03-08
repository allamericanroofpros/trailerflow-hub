import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Mail, Clock, Check, X, RefreshCw, Trash2 } from "lucide-react";

export function TeamInvitePanel() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("staff");

  const { data: invites, isLoading } = useQuery({
    queryKey: ["team_invites", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Email is required");
      if (!orgId || !user) throw new Error("Not authenticated");

      // Check for duplicate
      const existing = invites?.find(
        (i: any) => i.email === email.toLowerCase() && i.status === "pending"
      );
      if (existing) throw new Error("This email already has a pending invite");

      const { error } = await supabase.from("team_invites").insert({
        org_id: orgId,
        email: email.trim().toLowerCase(),
        role: role as any,
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite revoked");
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resendInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_invites")
        .update({ created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite refreshed");
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"><Clock className="h-3 w-3" /> Pending</span>;
      case "accepted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"><Check className="h-3 w-3" /> Accepted</span>;
      case "expired":
        return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><X className="h-3 w-3" /> Expired</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-card-foreground">Invite Team Members</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Send an invite link by email. When they sign up with this email, they'll automatically join your organization with the role you assign.
      </p>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="mt-1"
          />
        </div>
        <div className="w-32">
          <label className="text-xs font-medium text-muted-foreground">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <Button
          onClick={() => sendInvite.mutate()}
          disabled={sendInvite.isPending || !email.trim()}
          className="gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          {sendInvite.isPending ? "Sending..." : "Send"}
        </Button>
      </div>

      {/* Invite List */}
      {(invites?.length || 0) > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent Invites</p>
          {invites?.map((invite: any) => (
            <div key={invite.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{invite.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(invite.status)}
                {invite.status === "pending" && (
                  <>
                    <button
                      onClick={() => resendInvite.mutate(invite.id)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Resend invite"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => revokeInvite.mutate(invite.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Revoke invite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
