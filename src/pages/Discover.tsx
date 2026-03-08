import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Search, MapPin, Calendar, Sparkles, Plus, SlidersHorizontal, Loader2 } from "lucide-react";
import { useAIDiscovery } from "@/hooks/useAIDiscovery";
import { toast } from "sonner";
import { useCreateEvent } from "@/hooks/useEvents";

const fallbackOpportunities = [
  { name: "Bay Area Food Truck Rally", date: "Jun 8–9", location: "San Francisco, CA", type: "Festival", profitEstimate: "$3,400–$5,100", aiRank: 96, attendance: "15,000", reasoning: "" },
  { name: "Sunset Concert Series", date: "Jun 14", location: "Santa Cruz, CA", type: "Concert", profitEstimate: "$1,800–$2,600", aiRank: 88, attendance: "4,000", reasoning: "" },
  { name: "Tech Park Lunch Pop-up", date: "Jun 18", location: "Palo Alto, CA", type: "Corporate", profitEstimate: "$900–$1,400", aiRank: 82, attendance: "500", reasoning: "" },
];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | undefined>();
  const { data: aiEvents, isLoading, isFetching } = useAIDiscovery(submittedQuery);
  const createEvent = useCreateEvent();

  const opportunities = aiEvents?.length ? aiEvents : fallbackOpportunities;

  const handleSearch = () => {
    setSubmittedQuery(searchQuery || undefined);
  };

  const addToPipeline = (opp: typeof opportunities[0]) => {
    createEvent.mutate(
      {
        name: opp.name,
        event_type: opp.type,
        location: opp.location,
        stage: "lead",
        source: "ai-discovery",
        confidence: opp.aiRank,
      },
      {
        onSuccess: () => toast.success(`"${opp.name}" added to pipeline`),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover Events</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered event discovery to grow your business.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search events, locations..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Search
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Claude is analyzing events for you...</span>
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opp) => (
            <div key={opp.name} className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{opp.name}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {opp.date}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {opp.location}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">{opp.aiRank}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-background border border-border p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Profitability Est.</p>
                  <p className="text-sm font-semibold text-card-foreground">{opp.profitEstimate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Attendance</p>
                  <p className="text-sm font-semibold text-card-foreground">{opp.attendance}</p>
                </div>
              </div>

              {opp.reasoning && (
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{opp.reasoning}</p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{opp.type}</span>
                <div className="flex-1" />
                <button
                  onClick={() => addToPipeline(opp)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add to Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
