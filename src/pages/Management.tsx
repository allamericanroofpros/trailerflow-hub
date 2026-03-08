import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Wrench, BarChart3, Calendar, CalendarRange } from "lucide-react";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy-load heavy pages to keep bundle light
const Financials = lazy(() => import("./Financials"));
const Maintenance = lazy(() => import("./Maintenance"));
const FleetOverview = lazy(() => import("./FleetOverview"));
const CalendarPage = lazy(() => import("./CalendarPage"));
const EventsHub = lazy(() => import("./EventsHub"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function Management() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financials, maintenance, fleet, calendar, and events in one place.
          </p>
        </div>

        <Tabs defaultValue="financials" className="w-full">
          <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="financials" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> Financials
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4" /> Events
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="fleet" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Fleet
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4" /> Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financials">
            <Suspense fallback={<LoadingFallback />}>
              <FinancialsInline />
            </Suspense>
          </TabsContent>
          <TabsContent value="events">
            <Suspense fallback={<LoadingFallback />}>
              <EventsInline />
            </Suspense>
          </TabsContent>
          <TabsContent value="calendar">
            <Suspense fallback={<LoadingFallback />}>
              <CalendarInline />
            </Suspense>
          </TabsContent>
          <TabsContent value="fleet">
            <Suspense fallback={<LoadingFallback />}>
              <FleetInline />
            </Suspense>
          </TabsContent>
          <TabsContent value="maintenance">
            <Suspense fallback={<LoadingFallback />}>
              <MaintenanceInline />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Wrapper components that render the page content without the AppLayout wrapper
// We import the pages lazily but they each wrap in AppLayout, so we need inline versions

// For now, since the sub-pages all use AppLayout, we'll render them directly
// and they'll nest — but that's bad. Instead, let's just embed them as-is
// and strip the layout. The simplest approach: render the page and it brings its own layout.
// Actually the Management page already has AppLayout, so we need the sub-pages WITHOUT layout.

// The cleanest approach: render each page component directly. They wrap in AppLayout which nests.
// To avoid double-layout, we render them without going through the lazy import.
// Instead we'll import the content inline.

// Actually the simplest fix: the sub-pages use AppLayout. We can't easily strip it.
// Let's just redirect to sub-routes via the sidebar. But user wants consolidated tabs.
// Best approach: create inline content components.

function FinancialsInline() {
  // Re-export of Financials content without AppLayout
  const FinancialsContent = lazy(() =>
    import("./Financials").then(mod => {
      // We can't strip AppLayout easily, so we'll just render the page
      return { default: mod.default };
    })
  );
  return <FinancialsContent />;
}

function EventsInline() {
  const Content = lazy(() => import("./EventsHub"));
  return <Content />;
}

function CalendarInline() {
  const Content = lazy(() => import("./CalendarPage"));
  return <Content />;
}

function FleetInline() {
  const Content = lazy(() => import("./FleetOverview"));
  return <Content />;
}

function MaintenanceInline() {
  const Content = lazy(() => import("./Maintenance"));
  return <Content />;
}
