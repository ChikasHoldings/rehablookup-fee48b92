import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import RehabCenters from "./pages/RehabCenters";
import TreatmentCenterProfile from "./pages/TreatmentCenterProfile";
import CenterProfile from "./pages/CenterProfile";
import TreatmentTypes from "./pages/TreatmentTypes";
import HowItWorks from "./pages/HowItWorks";
import ForProviders from "./pages/ForProviders";
import ProviderResources from "./pages/ProviderResources";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderForgotPassword from "./pages/ProviderForgotPassword";
import ProviderResetPassword from "./pages/ProviderResetPassword";
import ProviderSupport from "./pages/ProviderSupport";
import ProviderSignup from "./pages/ProviderSignup";
import RequestHelp from "./pages/RequestHelp";
import { ProviderShell } from "./components/provider/ProviderShell";
import ProviderDashboardPage from "./pages/provider/Dashboard";
import ProviderListingPage from "./pages/provider/Listing";
import ProviderLeadsPage from "./pages/provider/Leads";
import ProviderAnalyticsPage from "./pages/provider/Analytics";
import ProviderBillingPage from "./pages/provider/Billing";
import ProviderSettingsPage from "./pages/provider/Settings";
import ProviderNotificationsPage from "./pages/provider/Notifications";
import ProviderHelpPage from "./pages/provider/Help";
import ProviderKnowledgeBasePage from "./pages/provider/KnowledgeBase";
import Resources from "./pages/Resources";
import ArticleDetail from "./pages/ArticleDetail";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { AdminShell } from "./components/admin/AdminShell";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminFeatured from "./pages/admin/AdminFeatured";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFlaggedImages from "./pages/admin/AdminFlaggedImages";
import AdminProfile from "./pages/admin/AdminProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/rehab-centers" element={<RehabCenters />} />
          <Route path="/rehab-centers/:id" element={<TreatmentCenterProfile />} />
          <Route path="/center/:slug" element={<CenterProfile />} />
          <Route path="/treatment-types" element={<TreatmentTypes />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/request-help" element={<RequestHelp />} />
          <Route path="/for-providers" element={<ForProviders />} />
          <Route path="/provider-resources" element={<ProviderResources />} />
          <Route path="/provider-login" element={<ProviderLogin />} />
          <Route path="/provider-forgot-password" element={<ProviderForgotPassword />} />
          <Route path="/provider-reset-password" element={<ProviderResetPassword />} />
          <Route path="/provider-support" element={<ProviderSupport />} />
          <Route path="/provider-signup" element={<ProviderSignup />} />
          
          {/* Provider Panel Routes - Nested under persistent shell */}
          <Route path="/provider-dashboard" element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="/provider" element={<ProviderShell />}>
            <Route path="dashboard" element={<ProviderDashboardPage />} />
            <Route path="listing" element={<ProviderListingPage />} />
            <Route path="leads" element={<ProviderLeadsPage />} />
            <Route path="analytics" element={<ProviderAnalyticsPage />} />
            <Route path="billing" element={<ProviderBillingPage />} />
            <Route path="settings" element={<ProviderSettingsPage />} />
            <Route path="notifications" element={<ProviderNotificationsPage />} />
            <Route path="help" element={<ProviderHelpPage />} />
            <Route path="knowledge-base" element={<ProviderKnowledgeBasePage />} />
          </Route>
          
          {/* Admin Panel Routes - Nested under admin shell */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="providers" element={<AdminProviders />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="featured" element={<AdminFeatured />} />
            <Route path="flagged-images" element={<AdminFlaggedImages />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
          
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/:id" element={<ArticleDetail />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
