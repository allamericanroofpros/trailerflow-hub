import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, Plus, ArrowLeft, MessageSquare, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Edit3, Building2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";

// Use semantic token-friendly status/priority indicators
const statusConfig: Record<string, { label: string; colorClass: string }> = {
  open: { label: "Open", colorClass: "text-warning bg-warning/10" },
  in_progress: { label: "In Progress", colorClass: "text-info bg-info/10" },
  resolved: { label: "Resolved", colorClass: "text-success bg-success/10" },
  closed: { label: "Closed", colorClass: "text-muted-foreground bg-muted" },
};

const priorityConfig: Record<string, { label: string; colorClass: string }> = {
  low: { label: "Low", colorClass: "text-muted-foreground border-border" },
  medium: { label: "Medium", colorClass: "text-warning border-warning/30" },
  high: { label: "High", colorClass: "text-destructive border-destructive/30" },
  urgent: { label: "Urgent", colorClass: "text-destructive bg-destructive/10" },
};

const statuses = ["open", "in_progress", "resolved", "closed"];
const priorities = ["low", "medium", "high", "urgent"];
const categories = ["support", "bug", "feature_request", "billing", "onboarding", "other"];

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [fields, setFields] = useState<Record<string, any>>({});

  const { data: ticket, refetch } = useQuery({
    queryKey: ["admin_ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").eq("id", ticketId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: org } = useQuery({
    queryKey: ["admin_ticket_org", ticket?.org_id],
    enabled: !!ticket?.org_id,
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("name").eq("id", ticket!.org_id!).single();
      return data;
    },
  });

  const startEdit = () => {
    if (!ticket) return;
    setFields({ ...ticket });
    setEditMode(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {
        subject: fields.subject, description: fields.description, status: fields.status,
        priority: fields.priority, category: fields.category, assigned_to: fields.assigned_to,
        resolution: fields.resolution,
      };
      if (fields.status === "resolved" && ticket?.status !== "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["admin_support_tickets"] }); toast.success("Ticket updated"); setEditMode(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const section = "rounded-xl border border-border bg-card p-4 sm:p-5";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{ticket?.subject || "..."}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {ticket && <>
              <Badge className={`text-[10px] capitalize ${statusConfig[ticket.status]?.colorClass}`}>{statusConfig[ticket.status]?.label || ticket.status}</Badge>
              <Badge variant="outline" className={`text-[10px] capitalize ${priorityConfig[ticket.priority]?.colorClass}`}>{ticket.priority}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{ticket.category.replace("_", " ")}</Badge>
            </>}
          </div>
        </div>
        {!editMode && <Button variant="ghost" size="sm" onClick={startEdit} className="text-xs h-7"><Edit3 className="h-3 w-3 mr-1" />Edit</Button>}
      </div>

      {editMode ? (
        <div className={`${section} space-y-3`}>
          <div><label className="text-xs font-medium text-muted-foreground">Subject</label><Input value={fields.subject || ""} onChange={(e) => setFields({ ...fields, subject: e.target.value })} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={fields.description || ""} onChange={(e) => setFields({ ...fields, description: e.target.value })} className="mt-1" rows={4} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={fields.status} onValueChange={(v) => setFields({ ...fields, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={fields.priority} onValueChange={(v) => setFields({ ...fields, priority: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={fields.category} onValueChange={(v) => setFields({ ...fields, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Assigned To</label><Input value={fields.assigned_to || ""} onChange={(e) => setFields({ ...fields, assigned_to: e.target.value })} className="mt-1" /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Resolution</label><Textarea value={fields.resolution || ""} onChange={(e) => setFields({ ...fields, resolution: e.target.value })} className="mt-1" rows={2} /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        </div>
      ) : ticket ? (
        <div className={section}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Organization</span><span className="font-medium">{org?.name || ticket.org_id?.slice(0, 8) || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span className="font-medium">{ticket.assigned_to || "Unassigned"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{format(new Date(ticket.created_at), "PPp")}</span></div>
            {ticket.resolved_at && <div className="flex justify-between"><span className="text-muted-foreground">Resolved</span><span className="font-medium">{format(new Date(ticket.resolved_at), "PPp")}</span></div>}
            {ticket.description && <div className="pt-3 border-t border-border"><p className="text-xs text-muted-foreground font-medium mb-1">Description</p><p className="text-sm whitespace-pre-wrap">{ticket.description}</p></div>}
            {ticket.resolution && <div className="pt-3 border-t border-border"><p className="text-xs text-muted-foreground font-medium mb-1">Resolution</p><p className="text-sm whitespace-pre-wrap">{ticket.resolution}</p></div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminSupport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrgId, setNewOrgId] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("support");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin_support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*, org:organizations(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orgs } = useQuery({
    queryKey: ["admin_all_orgs_short"],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("id, name").order("name"); return data || []; },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim()) throw new Error("Subject required");
      const { error } = await supabase.from("support_tickets").insert({
        subject: newSubject.trim(), description: newDesc.trim() || null,
        org_id: newOrgId && newOrgId !== "none" ? newOrgId : null,
        reporter_user_id: user?.id || null,
        priority: newPriority, category: newCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      toast.success("Ticket created");
      setShowCreate(false); setNewSubject(""); setNewDesc(""); setNewOrgId(""); setNewPriority("medium"); setNewCategory("support");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (selectedId) {
    return <AdminLayout><TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} /></AdminLayout>;
  }

  let filtered = tickets?.filter((t: any) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.org?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.assigned_to || "").toLowerCase().includes(search.toLowerCase())
  );
  if (filterStatus !== "all") filtered = filtered?.filter((t: any) => t.status === filterStatus);

  const openCount = tickets?.filter((t: any) => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter((t: any) => t.status === "in_progress").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {tickets?.length || 0} tickets · {openCount} open · {inProgressCount} in progress
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="shrink-0"><Plus className="h-4 w-4 mr-1.5" />New Ticket</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subject, org, assignee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...statuses].map((s) => (
              <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} className="text-xs h-8 capitalize">
                {s === "all" ? "All" : s.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No tickets found.</p>
          ) : (
            filtered?.map((t: any) => (
              <div key={t.id} onClick={() => setSelectedId(t.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-all">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusConfig[t.status]?.colorClass || "bg-muted"}`}>
                  {t.status === "open" ? <AlertTriangle className="h-4 w-4" /> : t.status === "resolved" ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm truncate">{t.subject}</span>
                    <Badge variant="outline" className={`text-[10px] capitalize ${priorityConfig[t.priority]?.colorClass}`}>{t.priority}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{t.category.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {t.org?.name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.org.name}</span>}
                    <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                    {t.assigned_to && <span className="hidden sm:inline">→ {t.assigned_to}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Subject *</label><Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Organization</label>
                <Select value={newOrgId} onValueChange={setNewOrgId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select org..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createTicket.mutate()} disabled={createTicket.isPending || !newSubject.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
