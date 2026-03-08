import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, LogIn, LogOut, Delete, User, DollarSign,
  Timer, Users, AlertCircle, CheckCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import {
  useActiveClocks, useClockIn, useClockOut,
  useStaffByPin, useSetStaffPin, useClockEntries,
} from "@/hooks/useTimeClock";
import { toast } from "sonner";

type Props = {
  eventId?: string | null;
  trailerId?: string | null;
};

type Step = "pin-entry" | "setup-pin" | "clocked-status" | "clock-out-confirm";

export default function POSTimeClock({ eventId, trailerId }: Props) {
  const { data: staffMembers } = useStaffMembers();
  const { data: activeClocks, refetch: refetchActive } = useActiveClocks();
  const { data: todayEntries } = useClockEntries(new Date().toISOString().split("T")[0]);
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const staffByPin = useStaffByPin();
  const setPin = useSetStaffPin();

  const [step, setStep] = useState<Step>("pin-entry");
  const [pin, setPin_] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupStaffId, setSetupStaffId] = useState<string | null>(null);
  const [setupStaffName, setSetupStaffName] = useState("");
  const [matchedStaff, setMatchedStaff] = useState<any>(null);
  const [matchedClock, setMatchedClock] = useState<any>(null);
  const [tipsInput, setTipsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [now, setNow] = useState(new Date());

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const appendDigit = (d: string) => {
    if (pin.length < 6) setPin_(pin + d);
  };
  const backspace = () => setPin_(pin.slice(0, -1));
  const clearPin = () => { setPin_(""); setMatchedStaff(null); setMatchedClock(null); setStep("pin-entry"); };

  const handlePinSubmit = async () => {
    if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
    try {
      const staff = await staffByPin.mutateAsync(pin);
      // Check if currently clocked in
      const activeClock = activeClocks?.find(c => c.staff_id === staff.id);
      setMatchedStaff(staff);
      if (activeClock) {
        setMatchedClock(activeClock);
        setStep("clock-out-confirm");
      } else {
        // Clock in
        await clockIn.mutateAsync({
          staff_id: staff.id,
          hourly_rate: Number(staff.hourly_rate) || 0,
          event_id: eventId || undefined,
          trailer_id: trailerId || undefined,
        });
        await refetchActive();
        setMatchedClock(null);
        setStep("clocked-status");
        toast.success(`${staff.name} clocked in!`);
      }
    } catch {
      toast.error("Invalid PIN. If you're new, ask your manager to add you to staff first.");
    }
  };

  const handleClockOut = async () => {
    if (!matchedClock) return;
    try {
      await clockOut.mutateAsync({
        id: matchedClock.id,
        tips_earned: Number(tipsInput) || 0,
        notes: notesInput || undefined,
      });
      await refetchActive();
      toast.success(`${matchedStaff?.name} clocked out!`);
      clearPin();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSetupPin = async () => {
    if (newPin.length < 4) return toast.error("PIN must be at least 4 digits");
    if (newPin !== confirmPin) return toast.error("PINs don't match");
    if (!setupStaffId) return;
    try {
      await setPin.mutateAsync({ staffId: setupStaffId, pin: newPin });
      toast.success("PIN set! You can now clock in.");
      setNewPin("");
      setConfirmPin("");
      setSetupStaffId(null);
      setStep("pin-entry");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Staff without PINs (for setup)
  const staffWithoutPin = staffMembers?.filter(s => !(s as any).pin && s.status === "active") || [];

  // Calculate hours/cost for active clocks
  const activeWithCost = useMemo(() => {
    return (activeClocks || []).map(c => {
      const start = new Date(c.clock_in);
      const hours = (now.getTime() - start.getTime()) / 3600000;
      const cost = hours * Number(c.hourly_rate);
      return { ...c, hours, cost };
    });
  }, [activeClocks, now]);

  const totalActiveCost = activeWithCost.reduce((s, c) => s + c.cost, 0);
  const totalActiveHours = activeWithCost.reduce((s, c) => s + c.hours, 0);

  // Today's completed shifts
  const completedToday = (todayEntries || []).filter(e => e.clock_out);
  const todayTotalHours = completedToday.reduce((s, e) => {
    const hrs = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
    return s + hrs;
  }, 0);
  const todayTotalCost = completedToday.reduce((s, e) => {
    const hrs = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
    return s + hrs * Number(e.hourly_rate);
  }, 0);
  const todayTotalTips = completedToday.reduce((s, e) => s + Number(e.tips_earned || 0), 0);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const sec = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
  };

  const numPad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Active Shifts Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Clock</span>
          </div>
          <p className="text-2xl font-black text-card-foreground">{activeWithCost.length}</p>
        </div>
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Hours</span>
          </div>
          <p className="text-2xl font-black text-card-foreground">{totalActiveHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-warning" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Running Cost</span>
          </div>
          <p className="text-2xl font-black text-warning">${totalActiveCost.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Labor</span>
          </div>
          <p className="text-lg font-black text-card-foreground">${(todayTotalCost + totalActiveCost).toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">{(todayTotalHours + totalActiveHours).toFixed(1)}h · Tips: ${todayTotalTips.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIN Entry / Clock Action */}
        <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black text-card-foreground">Time Clock</h3>
          </div>

          <AnimatePresence mode="wait">
            {step === "pin-entry" && (
              <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your PIN to clock in or out.</p>

                {/* PIN display */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-12 w-10 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                        i < pin.length ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-transparent"
                      }`}
                    >
                      {i < pin.length ? "•" : ""}
                    </div>
                  ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                  {numPad.map((key, i) => {
                    if (key === "") return <div key={i} />;
                    if (key === "back") return (
                      <button key={i} onClick={backspace}
                        className="h-14 rounded-xl border-2 border-border bg-background flex items-center justify-center hover:bg-secondary active:scale-95 touch-manipulation">
                        <Delete className="h-5 w-5 text-muted-foreground" />
                      </button>
                    );
                    return (
                      <button key={i} onClick={() => appendDigit(key)}
                        className="h-14 rounded-xl border-2 border-border bg-background text-lg font-black text-card-foreground hover:bg-secondary active:scale-95 touch-manipulation">
                        {key}
                      </button>
                    );
                  })}
                </div>

                <Button
                  className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation gap-2"
                  onClick={handlePinSubmit}
                  disabled={pin.length < 4 || staffByPin.isPending || clockIn.isPending}
                >
                  {(staffByPin.isPending || clockIn.isPending) ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  Submit PIN
                </Button>

                {/* Setup PIN link */}
                {staffWithoutPin.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">First time? Set up your PIN:</p>
                    <div className="flex flex-wrap gap-2">
                      {staffWithoutPin.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSetupStaffId(s.id); setSetupStaffName(s.name); setStep("setup-pin"); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold touch-manipulation"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === "setup-pin" && (
              <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-card-foreground">Setting PIN for {setupStaffName}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">New PIN (4-6 digits)</label>
                  <Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="h-12 text-center text-2xl font-black tracking-[0.5em] rounded-xl border-2" placeholder="••••" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Confirm PIN</label>
                  <Input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    className="h-12 text-center text-2xl font-black tracking-[0.5em] rounded-xl border-2" placeholder="••••" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={clearPin}>Cancel</Button>
                  <Button className="flex-1 h-12 font-black rounded-xl" onClick={handleSetupPin} disabled={setPin.isPending}>
                    {setPin.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Set PIN
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "clocked-status" && matchedStaff && (
              <motion.div key="status" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <p className="text-xl font-black text-success">{matchedStaff.name} Clocked In!</p>
                <p className="text-sm text-muted-foreground">Rate: ${Number(matchedStaff.hourly_rate).toFixed(2)}/hr</p>
                <Button variant="outline" className="h-12 font-bold rounded-xl w-full" onClick={clearPin}>Done</Button>
              </motion.div>
            )}

            {step === "clock-out-confirm" && matchedStaff && matchedClock && (
              <motion.div key="clockout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                  <p className="text-lg font-black text-card-foreground">{matchedStaff.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clocked in at {new Date(matchedClock.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-2xl font-black text-primary mt-2">
                    {formatDuration((now.getTime() - new Date(matchedClock.clock_in).getTime()) / 3600000)}
                  </p>
                  <p className="text-sm font-bold text-warning mt-1">
                    ${((now.getTime() - new Date(matchedClock.clock_in).getTime()) / 3600000 * Number(matchedClock.hourly_rate)).toFixed(2)} earned
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground">Tips Earned ($)</label>
                  <Input type="number" step="0.01" min="0" value={tipsInput} onChange={e => setTipsInput(e.target.value)}
                    placeholder="0.00" className="h-12 rounded-xl border-2 text-lg font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Notes (optional)</label>
                  <Input value={notesInput} onChange={e => setNotesInput(e.target.value)}
                    placeholder="e.g. Covered for Alex" className="h-12 rounded-xl border-2" />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={clearPin}>Cancel</Button>
                  <Button className="flex-1 h-12 font-black rounded-xl gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleClockOut} disabled={clockOut.isPending}>
                    {clockOut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                    Clock Out
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Shifts Panel */}
        <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black text-card-foreground">Active Shifts</h3>
            <span className="ml-auto text-xs font-bold text-muted-foreground">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {activeWithCost.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 text-muted-foreground/20" />
              <p className="text-sm font-medium">No one clocked in</p>
              <p className="text-xs mt-1">Staff enter their PIN to clock in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeWithCost.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-background border-2 border-border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-card-foreground truncate">{(c as any).staff_members?.name || "Staff"}</p>
                    <p className="text-xs text-muted-foreground">
                      In: {new Date(c.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{formatDuration(c.hours)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-warning">${c.cost.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">${Number(c.hourly_rate).toFixed(2)}/hr</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today's completed shifts */}
          {completedToday.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Completed Today</p>
              {completedToday.map(c => {
                const hrs = (new Date(c.clock_out!).getTime() - new Date(c.clock_in).getTime()) / 3600000;
                const cost = hrs * Number(c.hourly_rate);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 text-xs">
                    <span className="font-bold text-card-foreground">{(c as any).staff_members?.name}</span>
                    <span className="text-muted-foreground">
                      {new Date(c.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      –{new Date(c.clock_out!).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="ml-auto font-bold text-card-foreground">{hrs.toFixed(1)}h · ${cost.toFixed(2)}</span>
                    {Number(c.tips_earned) > 0 && <span className="text-success font-bold">+${Number(c.tips_earned).toFixed(2)} tips</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
