import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EventsHub from "./pages/EventsHub";
import Discover from "./pages/Discover";
import CalendarPage from "./pages/CalendarPage";
import Trailers from "./pages/Trailers";
import Staff from "./pages/Staff";
import Bookings from "./pages/Bookings";
import Financials from "./pages/Financials";
import Maintenance from "./pages/Maintenance";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<EventsHub />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/trailers" element={<Trailers />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
