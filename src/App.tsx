import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoading } from "@/components/ui/page-loading";

// Eagerly load all public pages for instant navigation
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
import AdLanding from "./pages/AdLanding";
import SocialLanding from "./pages/SocialLanding";
import Resources from "./pages/Resources";
import ArticleDetail from "./pages/ArticleDetail";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

// Provider Panel - lazy load shell and pages
const ProviderShell = lazy(() => import("./components/provider/ProviderShell").then(m => ({ default: m.ProviderShell })));
const ProviderDashboardPage = lazy(() => import("./pages/provider/Dashboard"));
const ProviderListingPage = lazy(() => import("./pages/provider/Listing"));
const ProviderLeadsPage = lazy(() => import("./pages/provider/Leads"));
const ProviderAnalyticsPage = lazy(() => import("./pages/provider/Analytics"));
const ProviderBillingPage = lazy(() => import("./pages/provider/Billing"));
const ProviderSettingsPage = lazy(() => import("./pages/provider/Settings"));
const ProviderNotificationsPage = lazy(() => import("./pages/provider/Notifications"));
const ProviderHelpPage = lazy(() => import("./pages/provider/Help"));
const ProviderKnowledgeBasePage = lazy(() => import("./pages/provider/KnowledgeBase"));
const ProviderImageGuidelines = lazy(() => import("./pages/provider/ImageGuidelines"));
const ProviderAddLocation = lazy(() => import("./pages/provider/AddLocation"));

// Admin Panel - lazy load shell and pages
const AdminShell = lazy(() => import("./components/admin/AdminShell").then(m => ({ default: m.AdminShell })));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProviders = lazy(() => import("./pages/admin/AdminProviders"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminFeatured = lazy(() => import("./pages/admin/AdminFeatured"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFlaggedImages = lazy(() => import("./pages/admin/AdminFlaggedImages"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminLeadRouting = lazy(() => import("./pages/admin/AdminLeadRouting"));
const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));

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
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/rehab-centers" element={<RehabCenters />} />
            <Route path="/rehab-centers/:id" element={<TreatmentCenterProfile />} />
            <Route path="/center/:slug" element={<CenterProfile />} />
            <Route path="/treatment-types" element={<TreatmentTypes />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/request-help" element={<RequestHelp />} />
            <Route path="/lp/treatment" element={<AdLanding />} />
            <Route path="/lp/social" element={<SocialLanding />} />
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
              <Route path="image-guidelines" element={<ProviderImageGuidelines />} />
              <Route path="add-location" element={<ProviderAddLocation />} />
            </Route>
            
            {/* Admin Panel Routes - Nested under admin shell */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="lead-routing" element={<AdminLeadRouting />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="featured" element={<AdminFeatured />} />
              <Route path="flagged-images" element={<AdminFlaggedImages />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="security-logs" element={<AdminSecurityLogs />} />
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
