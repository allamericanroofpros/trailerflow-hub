import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import MenuPage from "./pages/MenuPage";
import InventoryPage from "./pages/InventoryPage";
import EventsHub from "./pages/EventsHub";
import Discover from "./pages/Discover";
import CalendarPage from "./pages/CalendarPage";
import Trailers from "./pages/Trailers";
import Staff from "./pages/Staff";
import Bookings from "./pages/Bookings";
import Financials from "./pages/Financials";
import Maintenance from "./pages/Maintenance";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ReceiptPage from "./pages/Receipt";
import PublicBooking from "./pages/PublicBooking";
import FleetOverview from "./pages/FleetOverview";
import OrdersQueue from "./pages/OrdersQueue";
import TimeClockPage from "./pages/TimeClockPage";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminSupport from "./pages/admin/AdminSupport";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrgProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ImpersonationBanner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/receipt/:orderId" element={<ReceiptPage />} />
              <Route path="/book" element={<PublicBooking />} />

              {/* Super Admin routes */}
              <Route path="/admin" element={<SuperAdminRoute><AdminOverview /></SuperAdminRoute>} />
              <Route path="/super-admin" element={<SuperAdminRoute><AdminOverview /></SuperAdminRoute>} />
              <Route path="/admin/organizations" element={<SuperAdminRoute><AdminOrganizations /></SuperAdminRoute>} />
              <Route path="/admin/users" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
              <Route path="/admin/analytics" element={<SuperAdminRoute><AdminAnalytics /></SuperAdminRoute>} />
              <Route path="/admin/settings" element={<SuperAdminRoute><AdminSettings /></SuperAdminRoute>} />
              <Route path="/admin/audit-log" element={<SuperAdminRoute><AdminAuditLog /></SuperAdminRoute>} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
              <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsHub /></ProtectedRoute>} />
              <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/trailers" element={<ProtectedRoute><Trailers /></ProtectedRoute>} />
              <Route path="/fleet" element={<ProtectedRoute><FleetOverview /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
              <Route path="/financials" element={<ProtectedRoute><Financials /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/orders-queue" element={<ProtectedRoute><OrdersQueue /></ProtectedRoute>} />
              <Route path="/time-clock" element={<ProtectedRoute><TimeClockPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrgProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
