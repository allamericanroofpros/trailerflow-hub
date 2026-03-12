import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, BarChart3, CalendarRange, Truck, Users, Package,
  UtensilsCrossed, Wrench, Clock, Compass, Check, ArrowRight,
  Star, Zap, Shield, ChevronRight, Play, TrendingUp, Award, Flame, Loader2,
} from "lucide-react";
import vfLogo from "@/assets/vf-monogram.png";
import { useFoundersStatus } from "@/hooks/useFoundersStatus";
import { FOUNDERS_TIER, TIERS } from "@/config/tiers";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Feature data ─── */
const features = [
  { icon: ShoppingCart, title: "Point of Sale", desc: "Fast, mobile-ready POS built for outdoor events. Accept cash, card, and digital payments." },
  { icon: UtensilsCrossed, title: "Menu Management", desc: "Build menus with modifiers, link ingredients, and track food cost in real time." },
  { icon: Package, title: "Inventory Tracking", desc: "Par levels, reorder alerts, and automatic deductions when orders are placed." },
  { icon: CalendarRange, title: "Event Pipeline", desc: "Track leads → confirmed → completed. Forecast revenue before you commit." },
  { icon: Compass, title: "AI Event Discovery", desc: "Find profitable events near you with AI-powered recommendations and scoring." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Real-time dashboards, end-of-day summaries, and benchmark comparisons." },
  { icon: Users, title: "Team & Labor", desc: "Staff scheduling, time clock, hourly rates, and labor cost tracking per event." },
  { icon: Truck, title: "Fleet Management", desc: "Manage multiple trailers, assign to events, and track maintenance schedules." },
  { icon: Wrench, title: "Maintenance Logs", desc: "Preventive and corrective maintenance records with cost tracking." },
  { icon: Clock, title: "Bookings & Calendar", desc: "Accept catering bookings, manage deposits, and sync everything to your calendar." },
];

/* ─── How it works ─── */
const steps = [
  { step: "01", title: "Set up your trailer", desc: "Add your trailer details, upload your menu, and configure your pricing in minutes." },
  { step: "02", title: "Find & confirm events", desc: "Discover profitable events with AI recommendations, then track every lead through confirmation." },
  { step: "03", title: "Run your service", desc: "Use the mobile POS, clock in staff, track inventory, and collect payments — all from one app." },
  { step: "04", title: "Review & grow", desc: "Analyze your profitability, compare against industry benchmarks, and make smarter decisions." },
];

/* ─── Stats ─── */
const stats = [
  { value: "2 min", label: "Average setup time" },
  { value: "3×", label: "Faster end-of-day close" },
  { value: "$29", label: "Founders pricing/mo" },
  { value: "10+", label: "Tools in one platform" },
];

/* ─── Testimonials ─── */
const testimonials = [
  { name: "Marcus T.", role: "BBQ Truck Owner", quote: "VendorFlow replaced three apps I was paying for. The POS alone is worth it." },
  { name: "Sarah K.", role: "Taco Trailer Fleet", quote: "Managing 4 trailers used to be chaos. Now I see everything from one dashboard." },
  { name: "David R.", role: "Catering & Events", quote: "The AI event discovery found us a festival that became our best weekend ever." },
];

/* ─── JSON-LD structured data ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "VendorFlow",
  "applicationCategory": "BusinessApplication",
  "description": "All-in-one business management platform for food trucks, trailers, and mobile vendors. POS, inventory, events, team management, and AI-powered insights.",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "29",
    "priceCurrency": "USD",
  },
};

export default function Landing() {
  const { foundersEnabled, foundersRemaining, foundersMonthlyPrice, foundersAnnualPrice } = useFoundersStatus();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const showFounders = foundersEnabled && foundersRemaining > 0;

  const handleCheckout = async (priceId: string, label: string) => {
    setCheckoutLoading(label);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signup");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId, billingInterval },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to create checkout session");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error(msg);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPriceId = (tier: "pro" | "enterprise") => {
    if (billingInterval === "annual" && TIERS[tier].annual_price_id) {
      return TIERS[tier].annual_price_id;
    }
    return TIERS[tier].price_id;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>VendorFlow — Food Truck & Mobile Vendor Management</title>
        <meta name="description" content="Run your food truck like a real business. POS, inventory, events, team management, and AI-powered insights — all in one platform for mobile vendors." />
        <link rel="canonical" href="https://getvendorflow.app/" />
        <meta property="og:title" content="VendorFlow — Food Truck & Mobile Vendor Management" />
        <meta property="og:description" content="All-in-one platform for food trucks, trailers, and mobile vendors. Start today." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={vfLogo} alt="VendorFlow logo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-extrabold tracking-tight">VendorFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" aria-label="Hero">
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            {showFounders && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                Founders pricing — {foundersRemaining} of 100 spots left
              </div>
            )}
            {!showFounders && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-accent" />
                Built for mobile food vendors
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Run your food truck like a{" "}
              <span className="text-gradient-brand">real business</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              POS, inventory, events, team management, and AI-powered insights — all in one platform designed for food trucks, trailers, and mobile vendors.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link to={showFounders ? "/signup?plan=founders" : "/signup"}>
                  {showFounders ? "Claim Founders Pricing" : "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <a href="#how-it-works"><Play className="mr-2 h-4 w-4" />See How It Works</a>
              </Button>
            </div>
            {showFounders && (
              <p className="mt-4 text-sm text-muted-foreground">Enterprise features at ${foundersMonthlyPrice}/mo — <strong>price locked for life</strong></p>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border/60 bg-card/50" aria-label="Platform statistics">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Get up and running in minutes</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              VendorFlow is built for operators who are busy running events, not setting up software.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.step} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-primary/20 tabular-nums">{step.step}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-b border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything you need, nothing you don't</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built tools for mobile food vendors — from your first taco truck to a fleet of 20.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-5 shadow-card card-hover"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No free trials, no hidden fees. Pick a plan and start running your business today.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                billingInterval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                billingInterval === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual <span className="text-xs opacity-75">(2 months free)</span>
            </button>
          </div>

          <div className={`grid gap-6 ${showFounders ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 max-w-3xl mx-auto"}`}>
            {/* Founders card */}
            {showFounders && (
              <div className="relative rounded-xl border-2 border-orange-500/40 p-6 shadow-card card-hover flex flex-col bg-gradient-to-b from-orange-500/5 to-card ring-2 ring-orange-500/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                  First 100 Only
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-bold">Founders</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Enterprise features — price locked for life</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    ${billingInterval === "monthly" ? foundersMonthlyPrice : foundersAnnualPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                {billingInterval === "annual" && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                    Save ${foundersMonthlyPrice * 2}/yr (2 months free)
                  </p>
                )}
                <div className="mt-2 mb-4 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                  <Shield className="h-3 w-3" />
                  LOCKED FOR LIFE
                </div>
                <ul className="mt-2 flex-1 space-y-2.5">
                  {FOUNDERS_TIER.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-4 mb-3 text-center font-medium">
                  {foundersRemaining} of 100 spots remaining
                </p>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={checkoutLoading === "founders"}
                  onClick={() => handleCheckout(FOUNDERS_TIER.price_id, "founders")}
                >
                  {checkoutLoading === "founders" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    <>Claim Founders Spot<ChevronRight className="ml-1 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            )}

            {/* Pro */}
            <div className={`relative rounded-xl border p-6 shadow-card card-hover flex flex-col ${!showFounders ? "border-primary ring-2 ring-primary/20 bg-card" : "border-border bg-card"}`}>
              {!showFounders && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold">Pro</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  ${billingInterval === "monthly" ? TIERS.pro.price : TIERS.pro.annualPrice}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{billingInterval === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              {billingInterval === "annual" && (
                <p className="text-xs text-primary font-medium mt-1">
                  Save ${TIERS.pro.price * 2}/yr (2 months free)
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5">
                {TIERS.pro.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={!showFounders ? "default" : "outline"}
                disabled={checkoutLoading === "pro"}
                onClick={() => handleCheckout(getPriceId("pro"), "pro")}
              >
                {checkoutLoading === "pro" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <>Get Pro<ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </div>

            {/* Enterprise */}
            <div className="relative rounded-xl border border-border p-6 shadow-card card-hover flex flex-col bg-card">
              <h3 className="text-lg font-bold">Enterprise</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  ${billingInterval === "monthly" ? TIERS.enterprise.price : TIERS.enterprise.annualPrice}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{billingInterval === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              {billingInterval === "annual" && (
                <p className="text-xs text-primary font-medium mt-1">
                  Save ${TIERS.enterprise.price * 2}/yr (2 months free)
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5">
                {TIERS.enterprise.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant="outline"
                disabled={checkoutLoading === "enterprise"}
                onClick={() => handleCheckout(getPriceId("enterprise"), "enterprise")}
              >
                {checkoutLoading === "enterprise" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <>Get Enterprise<ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include the full POS, menu management, inventory tracking, and booking system.
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="border-b border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(s => <Star key={s} className="h-5 w-5 fill-warning text-warning" />)}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Vendors love VendorFlow</h2>
            <p className="mt-4 text-lg text-muted-foreground">Don't take our word for it.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-card card-hover">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section aria-label="Call to action">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            {showFounders ? (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                {foundersRemaining} Founders spots remaining
              </div>
            ) : (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-accent" />
                Join hundreds of vendors
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to level up your food truck?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of mobile vendors using VendorFlow to save time, make more money, and stress less.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link to={showFounders ? "/signup?plan=founders" : "/signup"}>
                  {showFounders ? "Claim Founders Pricing" : "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={vfLogo} alt="VendorFlow" className="h-6 w-6 rounded" />
            <span className="text-sm font-bold">VendorFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VendorFlow.{" "}<Link to="/terms" className="underline hover:text-white/80">Terms</Link>{" · "}<Link to="/privacy" className="underline hover:text-white/80">Privacy</Link></p>
        </div>
      </footer>
    </div>
  );
}
