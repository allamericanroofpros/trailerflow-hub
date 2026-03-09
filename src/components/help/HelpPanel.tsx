import { useState } from "react";
import { HelpCircle, Search, X, ChevronRight, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  route?: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  // Getting Started
  { id: "first-steps", category: "Getting Started", title: "What should I do first?", content: "Start by adding your trailer, then build your menu. The setup checklist on your Dashboard guides you through each step — just follow the prompts!", route: "/" },
  { id: "trailer", category: "Getting Started", title: "How do I add my trailer?", content: "Go to Trailers and tap 'Add Trailer'. Give it a name, pick a type (food truck, concession, etc.), and add details like crew size and hourly costs.", route: "/trailers" },
  { id: "menu", category: "Getting Started", title: "How do I build my menu?", content: "Head to Menu and tap 'Add Item'. Set a name, price, and category. Pro tip: link inventory ingredients to each item so stock auto-deducts when you ring up orders.", route: "/menu" },
  { id: "demo", category: "Getting Started", title: "Can I try with sample data?", content: "Yes! On the Dashboard, look for the 'Load demo data' button in the setup checklist. It fills your account with sample menus, events, and orders so you can explore every feature before going live.", route: "/" },

  // POS & Payments
  { id: "pos-start", category: "POS & Payments", title: "How do I start selling?", content: "Tap 'Open for Business' on your Dashboard. You'll run through a quick Start of Day check (opening cash, pick your trailer), then you're ready to ring up orders.", route: "/pos" },
  { id: "pos-checkout", category: "POS & Payments", title: "How does checkout work?", content: "Tap menu items to add them to the cart, enter a customer name, then hit Charge. Pick Cash, Card, or Digital. For card, we process via Stripe — for cash, enter the amount tendered and we'll calculate change.", route: "/pos" },
  { id: "stripe", category: "POS & Payments", title: "How do I accept card payments?", content: "Go to Settings → Payments & Fees and connect your Stripe account. It takes about 5 minutes. Once connected, you can process card payments right from the POS.", route: "/settings?section=payments" },
  { id: "tax", category: "POS & Payments", title: "How do I set up sales tax?", content: "Go to Settings → Payments & Fees. Enable tax, enter your rate (e.g. 8.75%), and choose whether prices include tax or not. Tax applies automatically to every order.", route: "/settings?section=payments" },
  { id: "surcharge", category: "POS & Payments", title: "What about card surcharges?", content: "In Settings → Payments & Fees, turn on the card surcharge option. Set a percentage (usually 2.5-3.5%) to pass processing fees to card-paying customers.", route: "/settings?section=payments" },
  { id: "receipts", category: "POS & Payments", title: "How do customers get receipts?", content: "After each sale, a QR code appears on the confirmation screen. Customers scan it to view a mobile-friendly receipt — no printer needed!", route: "/pos" },

  // Events & Bookings
  { id: "events", category: "Events & Bookings", title: "How do I manage events?", content: "Events flow through stages: Lead → Applied → Tentative → Confirmed → Completed. Drag them through the pipeline, assign trailers and staff, and track revenue forecasts.", route: "/events" },
  { id: "bookings", category: "Events & Bookings", title: "How do catering bookings work?", content: "Clients submit requests through your public booking page. You'll see them in Bookings where you can confirm, set pricing, and track deposits.", route: "/bookings" },
  { id: "calendar", category: "Events & Bookings", title: "Where's my calendar?", content: "Tap Calendar in the sidebar to see all your events and bookings in a monthly or weekly view. Color-coded by stage so you can spot gaps at a glance.", route: "/calendar" },

  // Team
  { id: "staff-add", category: "Team", title: "How do I add team members?", content: "Go to Team and tap 'Add Staff'. Enter their name, email, hourly rate, and a 4-digit PIN for POS clock-in. You can also send email invites so they can log in to the app.", route: "/staff" },
  { id: "roles", category: "Team", title: "What do the roles mean?", content: "Owner: Full access to everything including billing. Manager: Operations, staff, events, and inventory. Staff: POS access, clock-in/out, and basic views only.", route: "/staff" },
  { id: "timeclock", category: "Team", title: "How does the time clock work?", content: "Staff enter their 4-digit PIN at the POS to clock in and out. Hours are tracked automatically and show up in your labor reports.", route: "/time-clock" },

  // Inventory
  { id: "inventory", category: "Inventory", title: "How does inventory tracking work?", content: "Add items with current stock levels and reorder points. Link them to menu items as recipe ingredients — when you ring up an order, stock deducts automatically based on your recipes.", route: "/inventory" },
  { id: "low-stock", category: "Inventory", title: "How do I know when I'm running low?", content: "Items below their reorder point show a warning badge. Check the Inventory page before events to see what needs restocking.", route: "/inventory" },
];

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export function HelpPanel({ open, onClose, onOpenChat }: HelpPanelProps) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = search.trim()
    ? HELP_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.content.toLowerCase().includes(search.toLowerCase()) ||
          a.category.toLowerCase().includes(search.toLowerCase())
      )
    : HELP_ARTICLES;

  const categories = [...new Set(filtered.map((a) => a.category))];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-xl flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-card-foreground">How can we help?</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 touch-manipulation">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for answers..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Articles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
            <div className="space-y-1">
              {filtered
                .filter((a) => a.category === cat)
                .map((article) => (
                  <HelpArticleItem key={article.id} article={article} />
                ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No results for "{search}"</p>
            <p className="text-xs text-muted-foreground mt-1">Try different keywords or ask the AI assistant below.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        {onOpenChat && (
          <button
            onClick={() => { onClose(); onOpenChat(); }}
            className="flex items-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors touch-manipulation active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with AI Assistant
          </button>
        )}
        <p className="text-xs text-center text-muted-foreground">
          Still stuck? The AI assistant knows your whole setup.
        </p>
      </div>
    </div>
  );
}

function HelpArticleItem({ article }: { article: HelpArticle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 text-left touch-manipulation"
      >
        <span className="text-sm font-medium text-foreground flex-1">{article.title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{article.content}</p>
        </div>
      )}
    </div>
  );
}
