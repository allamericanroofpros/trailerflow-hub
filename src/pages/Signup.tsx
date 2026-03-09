import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Crown } from "lucide-react";
import { TIERS, type TierKey } from "@/config/tiers";
import { BrandLogo } from "@/components/BrandLogo";

const VENDOR_TYPES = [
  "Food Truck",
  "Concession Trailer",
  "Coffee Cart",
  "Ice Cream Trailer",
  "Kettle Corn",
  "Shaved Ice",
  "Other",
];

const USE_CASES = [
  { value: "pos", label: "Point of Sale" },
  { value: "events", label: "Event Management" },
  { value: "bookings", label: "Bookings & Catering" },
  { value: "staff", label: "Staff Management" },
  { value: "inventory", label: "Inventory Tracking" },
  { value: "all-in-one", label: "All-in-One" },
];

const TEAM_SIZES = ["Just me", "2-3", "4-7", "8-15", "16+"];

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  free: { name: "Free", price: "$0" },
  starter: { name: "Starter", price: "$29/mo" },
  pro: { name: "Pro", price: "$79/mo" },
  enterprise: { name: "Enterprise", price: "$199/mo" },
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "free";
  const planInfo = PLAN_LABELS[selectedPlan] || PLAN_LABELS.free;
  const isPaid = selectedPlan !== "free";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Step 1: Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Business
  const [businessName, setBusinessName] = useState("");
  const [vendorType, setVendorType] = useState("");
  const [trailerCount, setTrailerCount] = useState("1");
  const [teamSize, setTeamSize] = useState("Just me");

  // Step 3: Preferences
  const [useCase, setUseCase] = useState("all-in-one");
  const [referral, setReferral] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const validateStep1 = () => {
    if (!fullName.trim()) { toast.error("Full name is required"); return false; }
    if (!email.trim()) { toast.error("Email is required"); return false; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!businessName.trim()) { toast.error("Business name is required"); return false; }
    if (!vendorType) { toast.error("Please select your vendor type"); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!agreeTerms) { toast.error("Please agree to the terms"); return false; }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const redirectToStripe = async () => {
    try {
      const tier = TIERS[selectedPlan as TierKey];
      if (!tier) throw new Error("Invalid plan");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: tier.price_id,
          plan_tier: selectedPlan,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Stripe redirect error:", err);
      toast.error("Could not start checkout. You can upgrade from Settings later.");
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          business_name: businessName,
          phone,
          vendor_type: vendorType,
          trailer_count: trailerCount,
          team_size: teamSize,
          primary_use_case: useCase,
          referral_source: referral || null,
          selected_plan: selectedPlan,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (isPaid) {
      // For paid plans: show confirmation then redirect to Stripe
      setSent(true);
      toast.success("Account created! Redirecting to payment...");
    } else {
      setSent(true);
      toast.success("Check your email to confirm your account!");
    }
    setLoading(false);
  };

  // After signup, if paid plan, attempt Stripe redirect once session is ready
  useEffect(() => {
    if (!sent || !isPaid) return;

    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await redirectToStripe();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sent, isPaid]);

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Check className="h-8 w-8 text-primary" />
          </div>
          {isPaid ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">Account created!</h1>
              <p className="text-sm text-muted-foreground">
                Redirecting you to Stripe to complete your <strong>{planInfo.name}</strong> subscription...
              </p>
              <p className="text-xs text-muted-foreground">
                If you're not redirected, check your email to confirm your account first, then upgrade from Settings.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and start setting up {businessName}.
              </p>
            </>
          )}
          <Link to="/login" className="text-sm text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">VendorFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && "Create your account"}
            {step === 2 && "Tell us about your business"}
            {step === 3 && "Almost there!"}
          </p>
        </div>

        {/* Selected plan badge */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm">
            <Crown className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{planInfo.name} Plan</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-primary">{planInfo.price}</span>
            <Link to="/landing#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">
              Change
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">Step {step} of {totalSteps}</p>
        </div>

        <form onSubmit={step === totalSteps ? handleSignup : (e) => { e.preventDefault(); nextStep(); }} className="space-y-4">
          {/* Step 1: Account Info */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Jane Rivera" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Min 6 characters" />
              </div>
            </>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Business Name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Rivera's Taco Truck" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Vendor Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {VENDOR_TYPES.map((v) => (
                    <button key={v} type="button" onClick={() => setVendorType(v)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        vendorType === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Trailers</label>
                  <select value={trailerCount} onChange={(e) => setTrailerCount(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30">
                    {["1", "2", "3", "4", "5+"].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Team Size</label>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30">
                    {TEAM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What do you need most?</label>
                <div className="grid grid-cols-2 gap-2">
                  {USE_CASES.map((u) => (
                    <button key={u.value} type="button" onClick={() => setUseCase(u.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        useCase === u.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">How did you hear about us?</label>
                <input type="text" value={referral} onChange={(e) => setReferral(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Google, friend, event, etc." />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  I agree to the <span className="text-primary">Terms of Service</span> and <span className="text-primary">Privacy Policy</span>
                </span>
              </label>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {step < totalSteps ? (
                <>Continue <ChevronRight className="h-4 w-4" /></>
              ) : loading ? "Creating account..." : isPaid ? `Create Account & Pay ${planInfo.price}` : "Start Free Plan"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
