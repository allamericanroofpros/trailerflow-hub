import { useState } from "react";
import { HelpCircle, Search, X, ChevronRight, MessageCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  { id: "tax", category: "Setup", title: "How to configure sales tax", content: "Go to Settings → Payments & Fees. Enable tax, set your rate (e.g. 8.75%), and choose whether prices are tax-inclusive. Tax will automatically apply to all POS orders." },
  { id: "surcharge", category: "Setup", title: "Setting up card surcharge", content: "In Settings → Payments & Fees, enable the card surcharge option. Set a percentage (typically 2.5-3.5%) to pass processing fees to card-paying customers. Cash payments are not affected." },
  { id: "trailer", category: "Getting Started", title: "Adding your first trailer", content: "Go to Trailers and click 'Add Trailer'. Enter the name, type (food truck, concession, etc.), and optional details like hourly cost and staff requirements. Trailers help organize your menu, events, and staff." },
  { id: "menu", category: "Getting Started", title: "Building your menu", content: "Navigate to Menu and click 'Add Item'. Set a name, price, category, and optional description. You can link inventory ingredients to auto-track costs and deduct stock when orders are placed." },
  { id: "staff", category: "Team", title: "Inviting team members", content: "Go to Team → Roles tab and use 'New Account' to create login credentials, or use the Invite panel to send email invitations. Assign roles: Owner (full access), Manager (operations), or Staff (POS & basic views)." },
  { id: "booking", category: "Bookings", title: "Setting up public bookings", content: "Your public booking page is available at /book. Clients can submit catering inquiries with event details. You'll see them in the Bookings page where you can confirm, edit pricing, and track deposits." },
  { id: "pos", category: "POS", title: "Using the Point of Sale", content: "Click 'Open for Business' on the Dashboard or navigate to POS. Select menu items, apply modifiers, and complete checkout with cash, card, or digital payment. Orders appear in the Orders Queue." },
  { id: "inventory", category: "Inventory", title: "Tracking inventory", content: "Add items in Inventory with current stock, par levels, and reorder points. Link them to menu items as recipe ingredients. Stock auto-deducts when POS orders are placed." },
  { id: "events", category: "Events", title: "Managing your event pipeline", content: "Events flow through stages: Lead → Applied → Tentative → Confirmed → Completed. Track revenue forecasts, assign trailers and staff, and use the calendar view for scheduling." },
  { id: "roles", category: "Team", title: "Understanding roles", content: "Owner: Full access to everything including billing and team management. Manager: Can manage operations, staff, events, and inventory. Staff: POS access, calendar view, and basic features only." },
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
          <h2 className="text-sm font-semibold text-card-foreground">Help Center</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
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
            placeholder="Search help articles..."
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
            <p className="text-sm text-muted-foreground">No articles found.</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or ask the AI assistant.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        {onOpenChat && (
          <button
            onClick={() => { onClose(); onOpenChat(); }}
            className="flex items-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI Assistant
          </button>
        )}
        <p className="text-xs text-center text-muted-foreground">
          Can't find what you need? The AI assistant can help.
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
        className="flex items-center gap-2 w-full p-3 text-left"
      >
        <span className="text-sm font-medium text-foreground flex-1">{article.title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{article.content}</p>
        </div>
      )}
    </div>
  );
}
