import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search, MoreHorizontal, Shield, ShieldOff, Trash2, UserCog, LogIn,
  Mail, Plus, ArrowLeft, AlertTriangle, Wrench, Eye, ChevronRight,
  UserPlus, Building2, Link2, Unlink, Phone, Calendar, Copy,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const roleBadge: Record<string, { variant: "destructive" | "default" | "secondary" | "outline"; label: string }> = {
  super_admin: { variant: "destructive", label: "Super Admin" },
  owner: { variant: "default", label: "Owner" },
  manager: { variant: "secondary", label: "Manager" },
  staff: { variant: "outline", label: "Staff" },
};

const allRoles = ["super_admin", "owner", "manager", "staff"];
const orgRoles = ["owner", "manager", "staff"];

function invoke(action: string, body: Record<string, unknown> = {}) {
  return supabase.functions.invoke("admin-manage-user", { body: { action, ...body } });
}

// ─── User Detail View ───
function UserDetailView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["admin_user_profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      return data;
    },
  });

  const { data: authDetails } = useQuery({
    queryKey: ["admin_user_auth", userId],
    queryFn: async () => {
      const { data } = await invoke("get_user_details", { user_id: userId });
      return data;
    },
  });

  const { data: memberships } = useQuery({
    queryKey: ["admin_user_memberships", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, org_id, role, organization:organizations(id, name)")
        .eq("user_id", userId);
      return data || [];
    },
  });

  const { data: globalRole } = useQuery({
    queryKey: ["admin_user_global_role", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
      return data?.role || "staff";
    },
  });

  const { data: orgs } = useQuery({
    queryKey: ["admin_all_orgs_short"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      return data || [];
    },
  });

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [addOrgId, setAddOrgId] = useState("");
  const [addOrgRole, setAddOrgRole] = useState("staff");
  const [showAddOrg, setShowAddOrg] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const updateData: Record<string, string> = {};
      if (editName !== (profile?.full_name || "")) updateData.full_name = editName;
      if (editPhone !== (profile?.phone || "")) updateData.phone = editPhone;
      if (editEmail !== (authDetails?.user?.email || "")) updateData.email = editEmail;
      const { data, error } = await invoke("update_profile", { user_id: userId, data: updateData });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_user"] });
      qc.invalidateQueries({ queryKey: ["admin_users_full"] });
      toast.success("Profile updated");
      setEditMode(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const repairUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("repair_user", { user_id: userId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin_user"] });
      toast.success(data?.message || "Repair complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeOrgRole = useMutation({
    mutationFn: async ({ orgId, newRole }: { orgId: string; newRole: string }) => {
      const { data, error } = await invoke("change_org_role", { user_id: userId, org_id: orgId, org_role: newRole });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_user_memberships", userId] });
      toast.success("Org role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMembership = useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await invoke("remove_membership", { user_id: userId, org_id: orgId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_user_memberships", userId] });
      toast.success("Membership removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMembership = useMutation({
    mutationFn: async () => {
      if (!addOrgId) throw new Error("Select an organization");
      const { data, error } = await invoke("add_membership", { user_id: userId, org_id: addOrgId, org_role: addOrgRole });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_user_memberships", userId] });
      toast.success("Membership added");
      setShowAddOrg(false);
      setAddOrgId("");
      setAddOrgRole("staff");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const impersonate = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("impersonate", { user_id: userId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.token_hash) {
        localStorage.setItem("impersonating", JSON.stringify({
          targetEmail: data.target_email,
          targetName: data.target_name,
          startedAt: new Date().toISOString(),
        }));
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });
        if (otpError) throw otpError;
        window.location.href = "/";
      }
    },
    onError: (e: Error) => toast.error(`Impersonation failed: ${e.message}`),
  });

  const startEdit = () => {
    setEditName(profile?.full_name || "");
    setEditPhone(profile?.phone || "");
    setEditEmail(authDetails?.user?.email || "");
    setEditMode(true);
  };

  const memberOrgIds = new Set(memberships?.map((m: any) => m.org_id) || []);
  const availableOrgs = orgs?.filter((o) => !memberOrgIds.has(o.id)) || [];

  const section = "rounded-xl border border-border bg-card p-4 sm:p-5";

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {profile?.full_name || "Unnamed User"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{authDetails?.user?.email || "—"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => repairUser.mutate()} disabled={repairUser.isPending}>
            <Wrench className="h-3.5 w-3.5 mr-1.5" />Repair
          </Button>
          <Button variant="outline" size="sm" onClick={() => impersonate.mutate()} disabled={impersonate.isPending}>
            <LogIn className="h-3.5 w-3.5 mr-1.5" />Impersonate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Auth Info */}
        <div className={section}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />Auth & Account
          </h3>
          <div className="space-y-2 text-sm">
            <Row label="User ID">
              <span className="font-mono text-xs">{userId.slice(0, 8)}...</span>
              <button onClick={() => { navigator.clipboard.writeText(userId); toast.success("Copied"); }} className="text-primary hover:underline text-xs ml-1">
                <Copy className="h-3 w-3 inline" />
              </button>
            </Row>
            <Row label="Email">{authDetails?.user?.email || "—"}</Row>
            <Row label="Phone">{authDetails?.user?.phone || "—"}</Row>
            <Row label="Email Confirmed">{authDetails?.user?.email_confirmed_at ? "Yes" : <span className="text-destructive font-medium">No</span>}</Row>
            <Row label="Created">{authDetails?.user?.created_at ? new Date(authDetails.user.created_at).toLocaleDateString() : "—"}</Row>
            <Row label="Last Sign In">{authDetails?.user?.last_sign_in_at ? new Date(authDetails.user.last_sign_in_at).toLocaleString() : "Never"}</Row>
            <Row label="Status">
              {authDetails?.user?.banned_until && new Date(authDetails.user.banned_until) > new Date()
                ? <Badge variant="destructive" className="text-xs">Disabled</Badge>
                : <Badge variant="outline" className="text-xs text-green-600 border-green-200">Active</Badge>
              }
            </Row>
            <Row label="Global Role">
              <Badge variant={roleBadge[globalRole as string]?.variant || "secondary"} className="text-xs capitalize">
                {roleBadge[globalRole as string]?.label || globalRole}
              </Badge>
            </Row>
          </div>
        </div>

        {/* Profile Info */}
        <div className={section}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserCog className="h-4 w-4" />Profile
            </h3>
            {!editMode && (
              <Button variant="ghost" size="sm" onClick={startEdit} className="text-xs h-7">
                Edit
              </Button>
            )}
          </div>
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 h-9" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Full Name">{profile?.full_name || <span className="text-muted-foreground">Not set</span>}</Row>
              <Row label="Phone">{profile?.phone || <span className="text-muted-foreground">Not set</span>}</Row>
              <Row label="Business Name">{profile?.business_name || <span className="text-muted-foreground">Not set</span>}</Row>
              <Row label="Timezone">{profile?.timezone || "—"}</Row>
              <Row label="Currency">{profile?.currency || "—"}</Row>
            </div>
          )}
        </div>
      </div>

      {/* Org Memberships */}
      <div className={section}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />Organization Memberships ({memberships?.length || 0})
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowAddOrg(true)} className="text-xs h-7">
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
        {(!memberships || memberships.length === 0) ? (
          <div className="flex items-center gap-2 py-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Orphaned user — no organization membership. Add one or this user can't access data.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {memberships.map((m: any) => (
              <div key={m.org_id} className="flex items-center justify-between py-2 px-2 border-b border-border last:border-0 rounded-lg hover:bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{m.organization?.name || m.org_id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.role} onValueChange={(v) => changeOrgRole.mutate({ orgId: m.org_id, newRole: v })}>
                    <SelectTrigger className="h-7 w-24 text-xs border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Remove from ${m.organization?.name}?`)) removeMembership.mutate(m.org_id); }}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Linkage */}
      {authDetails?.staff_links && authDetails.staff_links.length > 0 && (
        <div className={section}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4" />Linked Staff Records
          </h3>
          <div className="space-y-2">
            {authDetails.staff_links.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.email}</span>
                </div>
                <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{s.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Org Dialog */}
      <Dialog open={showAddOrg} onOpenChange={setShowAddOrg}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Organization Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Organization</label>
              <Select value={addOrgId} onValueChange={setAddOrgId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select org..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={addOrgRole} onValueChange={setAddOrgRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOrg(false)}>Cancel</Button>
            <Button onClick={() => addMembership.mutate()} disabled={addMembership.isPending || !addOrgId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

// ─── Create User Dialog ───
function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgRole, setOrgRole] = useState("staff");

  const { data: orgs } = useQuery({
    queryKey: ["admin_all_orgs_short"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!email || !password) throw new Error("Email and password required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      const { data, error } = await invoke("create_user", {
        email, password, full_name: name, phone,
        org_id: orgId || undefined, org_role: orgId ? orgRole : undefined,
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users_full"] });
      toast.success("User created successfully");
      setName(""); setEmail(""); setPhone(""); setPassword(""); setOrgId(""); setOrgRole("staff");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Temporary Password *</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">User should change this on first login.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Organization (optional)</label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No org" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No organization</SelectItem>
                {orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {orgId && orgId !== "none" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Org Role</label>
              <Select value={orgRole} onValueChange={setOrgRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main AdminUsers ───
export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "orphaned" | "no_profile" | "disabled">("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users_full"],
    queryFn: async () => {
      const [profilesRes, rolesRes, membershipsRes, authRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("organization_members").select("user_id, org_id, role, organization:organizations(name)"),
        invoke("list_auth_users"),
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

  const { data: diagnostics } = useQuery({
    queryKey: ["admin_diagnostics"],
    queryFn: async () => {
      const { data } = await invoke("diagnose_users");
      return data;
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await invoke("change_role", { user_id, role });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("Role updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBan = useMutation({
    mutationFn: async ({ user_id, banned }: { user_id: string; banned: boolean }) => {
      const action = banned ? "enable_user" : "disable_user";
      const { data, error } = await invoke(action, { user_id });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await invoke("delete_user", { user_id });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_users_full"] }); toast.success("User deleted"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  let filtered = users?.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      u.orgs.some((o: any) => (o.organization?.name || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (filter === "orphaned") filtered = filtered?.filter((u) => u.orgs.length === 0);
  if (filter === "disabled") filtered = filtered?.filter((u) => u.banned);

  if (selectedUserId) {
    return (
      <AdminLayout>
        <UserDetailView userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
      </AdminLayout>
    );
  }

  const orphanCount = diagnostics?.orphaned_no_org?.length || 0;
  const noProfileCount = diagnostics?.auth_no_profile?.length || 0;
  const noRoleCount = diagnostics?.auth_no_role?.length || 0;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {users?.length || 0} users total · Click any user for full details
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />Create User
          </Button>
        </div>

        {/* Diagnostics Banner */}
        {(orphanCount > 0 || noProfileCount > 0 || noRoleCount > 0) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Integrity Issues Detected</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {orphanCount > 0 && (
                <button onClick={() => setFilter("orphaned")} className="text-amber-600 hover:underline font-medium">
                  {orphanCount} orphaned (no org)
                </button>
              )}
              {noProfileCount > 0 && <span className="text-amber-600 font-medium">{noProfileCount} auth users without profiles</span>}
              {noRoleCount > 0 && <span className="text-amber-600 font-medium">{noRoleCount} auth users without roles</span>}
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, or org..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "all" as const, label: "All" },
              { key: "orphaned" as const, label: `Orphaned${orphanCount ? ` (${orphanCount})` : ""}` },
              { key: "disabled" as const, label: "Disabled" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(key)}
                className="text-xs h-8"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading users...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No users found.</p>
          ) : (
            filtered?.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUserId(u.user_id)}
                className={`flex items-center gap-3 sm:gap-4 rounded-xl border bg-card p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-all ${
                  u.banned ? "border-destructive/30 opacity-60" : u.orgs.length === 0 ? "border-amber-500/30" : "border-border"
                }`}
              >
                {/* Avatar placeholder */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground font-bold text-sm">
                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{u.full_name || "Unnamed"}</span>
                    <Badge variant={roleBadge[u.globalRole]?.variant || "secondary"} className="text-[10px] h-5">
                      {roleBadge[u.globalRole]?.label || u.globalRole}
                    </Badge>
                    {u.banned && <Badge variant="destructive" className="text-[10px] h-5">Disabled</Badge>}
                    {u.orgs.length === 0 && <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300">No Org</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{u.email}</span>
                    {u.orgs.length > 0 && (
                      <span className="hidden sm:inline truncate">
                        {u.orgs.map((o: any) => o.organization?.name).filter(Boolean).join(", ") || "—"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setSelectedUserId(u.user_id)}>
                        <Eye className="h-4 w-4 mr-2" />View Details
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <UserCog className="h-4 w-4 mr-2" />Change Role
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {allRoles.map((r) => (
                            <DropdownMenuItem
                              key={r} disabled={r === u.globalRole}
                              onClick={() => changeRole.mutate({ user_id: u.user_id, role: r })}
                              className="capitalize"
                            >
                              {r === u.globalRole && "✓ "}{r.replace("_", " ")}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleBan.mutate({ user_id: u.user_id, banned: u.banned })}>
                        {u.banned ? <><Shield className="h-4 w-4 mr-2" />Enable</> : <><ShieldOff className="h-4 w-4 mr-2" />Disable</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget({ id: u.user_id, name: u.full_name || u.email })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and their auth account. Profile, memberships, and related data will be removed. This cannot be undone.
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

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </AdminLayout>
  );
}
