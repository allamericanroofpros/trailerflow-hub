import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  BarChart3,
  CalendarRange,
  Truck,
  Users,
  Package,
  UtensilsCrossed,
  Wrench,
  Clock,
  Compass,
  Check,
  ArrowRight,
  Star,
  Zap,
  Shield,
  ChevronRight,
} from "lucide-react";
import vfLogo from "@/assets/vf-monogram.png";

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

/* ─── Pricing tiers ─── */
const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    highlight: false,
    planKey: "free",
    features: [
      "1 trailer",
      "2 staff accounts",
      "Full POS system",
      "Menu & inventory basics",
      "Booking system",
    ],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    highlight: false,
    planKey: "starter",
    features: [
      "Everything in Free",
      "AI Chat assistant",
      "5 staff accounts",
      "Basic reports & analytics",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    highlight: true,
    planKey: "pro",
    features: [
      "Everything in Starter",
      "Unlimited trailers & staff",
      "AI Forecasting & Discovery",
      "Fleet Overview & advanced analytics",
      "Time clock & labor tracking",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    highlight: false,
    planKey: "enterprise",
    features: [
      "Everything in Pro",
      "Multi-org management",
      "Custom API access",
      "White-label receipts",
      "Dedicated account manager",
    ],
  },
];

/* ─── Testimonials ─── */
const testimonials = [
  { name: "Marcus T.", role: "BBQ Truck Owner", quote: "VendorFlow replaced three apps I was paying for. The POS alone is worth it." },
  { name: "Sarah K.", role: "Taco Trailer Fleet", quote: "Managing 4 trailers used to be chaos. Now I see everything from one dashboard." },
  { name: "David R.", role: "Catering & Events", quote: "The AI event discovery found us a festival that became our best weekend ever." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/landing" className="flex items-center gap-2.5">
            <img src={vfLogo} alt="VendorFlow" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-extrabold tracking-tight">VendorFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Built for mobile food vendors
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Run your food truck like a{" "}
              <span className="text-gradient-brand">real business</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              POS, inventory, events, team management, and AI-powered insights — all in one platform designed for food trucks, trailers, and mobile vendors.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/signup">Start Free Today <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <a href="#features">See What's Included</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required · Free plan available</p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-border/60 bg-card/50">
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
      <section id="pricing" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you're ready. No contracts, cancel anytime.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 shadow-card card-hover flex flex-col ${
                  plan.highlight
                    ? "border-primary bg-card ring-2 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to="/signup">
                    {plan.price === "$0" ? "Get Started" : "Start Free Trial"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center mb-16">
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
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to level up your food truck?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of mobile vendors using VendorFlow to save time, make more money, and stress less.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/signup">Create Your Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Secure payments</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> Setup in 2 minutes</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={vfLogo} alt="VF" className="h-6 w-6 rounded" />
            <span className="text-sm font-bold">VendorFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VendorFlow. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
