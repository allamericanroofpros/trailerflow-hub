import { AppLayout } from "@/components/layout/AppLayout";
import { Clock, Users, Timer, DollarSign, Loader2, Download } from "lucide-react";
import { useState, useMemo } from "react";
import { useClockEntries, useActiveClocks } from "@/hooks/useTimeClock";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TimeClockPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: entries, isLoading } = useClockEntries(selectedDate);
  const { data: activeClocks } = useActiveClocks();
  const { data: staffMembers } = useStaffMembers();

  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    staffMembers?.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [staffMembers]);

  const completedEntries = (entries || []).filter(e => e.clock_out);
  const totalHours = completedEntries.reduce((s, e) => {
    return s + (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
  }, 0);
  const totalCost = completedEntries.reduce((s, e) => {
    const hrs = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
    return s + hrs * Number(e.hourly_rate);
  }, 0);
  const totalTips = completedEntries.reduce((s, e) => s + Number(e.tips_earned || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Clock</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage staff clock-in/out records.</p>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Active Now</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{activeClocks?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Shifts</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{completedEntries.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-warning" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Labor Cost</span>
            </div>
            <p className="text-2xl font-bold text-warning">${totalCost.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Tips: ${totalTips.toFixed(1)}</p>
          </div>
        </div>

        {/* Active Clocks */}
        {(activeClocks?.length || 0) > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Currently Clocked In
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeClocks?.map(c => (
                <div key={c.id} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-bold text-foreground">{staffMap[c.staff_id] || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    Since {new Date(c.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}${Number(c.hourly_rate).toFixed(1)}/hr
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entries Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">
              Shift Records — {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : completedEntries.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No completed shifts for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Staff</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Clock In</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Clock Out</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hours</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Tips</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {completedEntries.map(e => {
                    const hrs = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
                    const cost = hrs * Number(e.hourly_rate);
                    return (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">{staffMap[e.staff_id] || "Unknown"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(e.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(e.clock_out!).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{hrs.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">${Number(e.hourly_rate).toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-semibold">${cost.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">${Number(e.tips_earned || 0).toFixed(1)}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{e.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
