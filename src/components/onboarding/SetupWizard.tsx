import { useState } from "react";
import { Check, ChevronDown, Truck, Receipt, UtensilsCrossed, Package, Users, ClipboardList, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgId } from "@/hooks/useOrgId";
import { useCreateTrailer } from "@/hooks/useTrailers";
import { useCreateMenuItem } from "@/hooks/useMenuItems";
import { useCreateInventoryItem } from "@/hooks/useInventory";
import { useCreateStaffMember } from "@/hooks/useStaffMembers";
import { useCreateBooking } from "@/hooks/useBookings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  checkKey: string;
}

const STEPS: SetupStep[] = [
  { id: "trailer", title: "Add Your First Trailer", description: "Set up a trailer with its name, type, and details.", icon: Truck, checkKey: "trailers" },
  { id: "tax", title: "Configure Tax & Surcharge", description: "Set your sales tax rate and optional card fee pass-through.", icon: Receipt, checkKey: "tax" },
  { id: "menu", title: "Build Your Menu", description: "Add menu items with prices and categories.", icon: UtensilsCrossed, checkKey: "menu" },
  { id: "inventory", title: "Set Up Inventory", description: "Track ingredients and supplies with par levels.", icon: Package, checkKey: "inventory" },
  { id: "staff", title: "Add Team Members", description: "Invite your crew and assign roles.", icon: Users, checkKey: "staff" },
  { id: "bookings", title: "Configure Bookings", description: "Set up your public booking page for catering inquiries.", icon: ClipboardList, checkKey: "bookings" },
];

interface SetupWizardProps {
  completedSteps: Record<string, boolean>;
  onDismiss: () => void;
}

export function SetupWizard({ completedSteps, onDismiss }: SetupWizardProps) {
  const { user } = useAuth();
  const { currentOrg, refreshOrg } = useOrg();
  const orgId = useOrgId();
  const qc = useQueryClient();
  const completedCount = STEPS.filter((s) => completedSteps[s.checkKey]).length;
  const progress = (completedCount / STEPS.length) * 100;
  const allDone = completedCount === STEPS.length;

  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // --- Trailer form ---
  const createTrailer = useCreateTrailer();
  const [trailerName, setTrailerName] = useState("");
  const [trailerType, setTrailerType] = useState("food_truck");

  // --- Tax form ---
  const [taxEnabled, setTaxEnabled] = useState(() => (currentOrg as any)?.tax_enabled ?? true);
  const [taxPercent, setTaxPercent] = useState(() => String((currentOrg as any)?.tax_percent ?? "0"));
  const [surchargeEnabled, setSurchargeEnabled] = useState(() => (currentOrg as any)?.surcharge_enabled ?? false);
  const [surchargePercent, setSurchargePercent] = useState(() => String((currentOrg as any)?.surcharge_percent ?? "3.0"));

  const saveTax = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const { error } = await supabase.from("organizations").update({
        tax_enabled: taxEnabled,
        tax_percent: parseFloat(taxPercent) || 0,
        surcharge_enabled: surchargeEnabled,
        surcharge_percent: parseFloat(surchargePercent) || 3.0,
      } as any).eq("id", currentOrg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshOrg();
      toast.success("Tax settings saved");
      setExpandedStep(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Menu item form ---
  const createMenuItem = useCreateMenuItem();
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("entree");

  // --- Inventory form ---
  const createInventory = useCreateInventoryItem();
  const [invName, setInvName] = useState("");
  const [invUnit, setInvUnit] = useState("each");
  const [invStock, setInvStock] = useState("0");

  // --- Staff form ---
  const createStaff = useCreateStaffMember();
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");

  // --- Booking form ---
  const createBooking = useCreateBooking();
  const [bookingClient, setBookingClient] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingEvent, setBookingEvent] = useState("");
  const [bookingDate, setBookingDate] = useState("");

  if (allDone) return null;

  const handleToggle = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const handleTrailerSave = () => {
    if (!trailerName.trim()) { toast.error("Trailer name is required"); return; }
    createTrailer.mutate({
      name: trailerName.trim(),
      type: trailerType,
      owner_id: user!.id,
      org_id: orgId!,
    }, {
      onSuccess: () => { toast.success("Trailer added!"); setTrailerName(""); setExpandedStep(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleMenuSave = () => {
    if (!menuName.trim() || !menuPrice) { toast.error("Name and price required"); return; }
    createMenuItem.mutate({
      name: menuName.trim(),
      price: parseFloat(menuPrice),
      category: menuCategory as any,
      org_id: orgId!,
    }, {
      onSuccess: () => { toast.success("Menu item added!"); setMenuName(""); setMenuPrice(""); setExpandedStep(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleInventorySave = () => {
    if (!invName.trim()) { toast.error("Item name required"); return; }
    createInventory.mutate({
      name: invName.trim(),
      unit: invUnit as any,
      current_stock: parseFloat(invStock) || 0,
      org_id: orgId!,
    }, {
      onSuccess: () => { toast.success("Inventory item added!"); setInvName(""); setInvStock("0"); setExpandedStep(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleStaffSave = () => {
    if (!staffName.trim()) { toast.error("Name required"); return; }
    createStaff.mutate({
      name: staffName.trim(),
      email: staffEmail || null,
      org_id: orgId!,
    }, {
      onSuccess: () => { toast.success("Team member added!"); setStaffName(""); setStaffEmail(""); setExpandedStep(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleBookingSave = () => {
    if (!bookingClient.trim() || !bookingEmail.trim() || !bookingEvent.trim() || !bookingDate) {
      toast.error("All fields required"); return;
    }
    createBooking.mutate({
      client_name: bookingClient.trim(),
      client_email: bookingEmail.trim(),
      event_name: bookingEvent.trim(),
      event_date: bookingDate,
      org_id: orgId!,
    }, {
      onSuccess: () => { toast.success("Booking created!"); setBookingClient(""); setBookingEmail(""); setBookingEvent(""); setBookingDate(""); setExpandedStep(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const renderStepForm = (stepId: string) => {
    switch (stepId) {
      case "trailer":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trailer Name *</label>
              <Input value={trailerName} onChange={(e) => setTrailerName(e.target.value)} placeholder="e.g. Big Red BBQ" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select value={trailerType} onChange={(e) => setTrailerType(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="food_truck">Food Truck</option>
                <option value="trailer">Trailer</option>
                <option value="cart">Cart</option>
                <option value="pop_up">Pop-Up</option>
              </select>
            </div>
            <Button size="sm" onClick={handleTrailerSave} disabled={createTrailer.isPending}>
              {createTrailer.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Add Trailer"}
            </Button>
          </div>
        );

      case "tax":
        return (
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-card-foreground">Enable Tax</p></div>
              <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
            </label>
            {taxEnabled && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="30" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="mt-1" placeholder="8.75" />
              </div>
            )}
            <label className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-card-foreground">Card Surcharge</p></div>
              <Switch checked={surchargeEnabled} onCheckedChange={setSurchargeEnabled} />
            </label>
            {surchargeEnabled && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Surcharge (%)</label>
                <Input type="number" step="0.1" min="0" max="10" value={surchargePercent} onChange={(e) => setSurchargePercent(e.target.value)} className="mt-1" />
              </div>
            )}
            <Button size="sm" onClick={() => saveTax.mutate()} disabled={saveTax.isPending}>
              {saveTax.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Save Tax Settings"}
            </Button>
          </div>
        );

      case "menu":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Name *</label>
              <Input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="e.g. Classic Burger" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Price ($) *</label>
                <Input type="number" step="0.01" value={menuPrice} onChange={(e) => setMenuPrice(e.target.value)} className="mt-1" placeholder="12.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select value={menuCategory} onChange={(e) => setMenuCategory(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="entree">Entree</option>
                  <option value="appetizer">Appetizer</option>
                  <option value="side">Side</option>
                  <option value="dessert">Dessert</option>
                  <option value="drink">Drink</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
            </div>
            <Button size="sm" onClick={handleMenuSave} disabled={createMenuItem.isPending}>
              {createMenuItem.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Add Menu Item"}
            </Button>
          </div>
        );

      case "inventory":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Name *</label>
              <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="e.g. Burger Patties" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unit</label>
                <select value={invUnit} onChange={(e) => setInvUnit(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="each">Each</option>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="case">Case</option>
                  <option value="gal">Gallon</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Starting Stock</label>
                <Input type="number" value={invStock} onChange={(e) => setInvStock(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button size="sm" onClick={handleInventorySave} disabled={createInventory.isPending}>
              {createInventory.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Add Inventory Item"}
            </Button>
          </div>
        );

      case "staff":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Jane Doe" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
              <Input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="jane@example.com" className="mt-1" />
            </div>
            <Button size="sm" onClick={handleStaffSave} disabled={createStaff.isPending}>
              {createStaff.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Add Team Member"}
            </Button>
          </div>
        );

      case "bookings":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Name *</label>
                <Input value={bookingClient} onChange={(e) => setBookingClient(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Email *</label>
                <Input type="email" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Event Name *</label>
                <Input value={bookingEvent} onChange={(e) => setBookingEvent(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Event Date *</label>
                <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button size="sm" onClick={handleBookingSave} disabled={createBooking.isPending}>
              {createBooking.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</> : "Create Booking"}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Get Started with VendorFlow</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {STEPS.length} steps complete
          </p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Progress value={progress} className="h-1.5 mb-4" />

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completedSteps[step.checkKey];
          const isExpanded = expandedStep === step.id && !done;
          return (
            <div key={step.id} className="rounded-lg border overflow-hidden transition-all">
              <button
                onClick={() => !done && handleToggle(step.id)}
                className={`flex items-center gap-3 w-full p-3 text-left transition-all ${
                  done
                    ? "border-primary/20 bg-primary/5 opacity-70 cursor-default"
                    : "bg-background hover:bg-accent/50"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                  done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {done ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                {!done && (
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-border p-4 bg-muted/30">
                  {renderStepForm(step.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
