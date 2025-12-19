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
import StatePage from "./pages/StatePage";
import CityPage from "./pages/CityPage";
import Locations from "./pages/Locations";
import TreatmentCenterProfile from "./pages/TreatmentCenterProfile";
import CenterProfile from "./pages/CenterProfile";
import TreatmentTypes from "./pages/TreatmentTypes";
import DrugAddictionTreatment from "./pages/treatment-types/DrugAddictionTreatment";
import AlcoholRehabilitation from "./pages/treatment-types/AlcoholRehabilitation";
import DualDiagnosisTreatment from "./pages/treatment-types/DualDiagnosisTreatment";
import ResidentialInpatient from "./pages/treatment-types/ResidentialInpatient";
import OutpatientPrograms from "./pages/treatment-types/OutpatientPrograms";
import HolisticTherapy from "./pages/treatment-types/HolisticTherapy";
import DetoxPrograms from "./pages/treatment-types/DetoxPrograms";
import StateDetoxPrograms from "./pages/treatment-types/StateDetoxPrograms";
import HowItWorks from "./pages/HowItWorks";
import ForProviders from "./pages/ForProviders";
import ProviderResources from "./pages/ProviderResources";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderForgotPassword from "./pages/ProviderForgotPassword";
import ProviderResetPassword from "./pages/ProviderResetPassword";
import ProviderSupport from "./pages/ProviderSupport";
import ProviderFAQ from "./pages/ProviderFAQ";
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

// Provider Panel - eagerly load for instant navigation
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
import ProviderImageGuidelines from "./pages/provider/ImageGuidelines";
import ProviderAddLocation from "./pages/provider/AddLocation";

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
const AdminCredentials = lazy(() => import("./pages/admin/AdminCredentials"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminLeadRouting = lazy(() => import("./pages/admin/AdminLeadRouting"));
const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));
const AdminLocationChanges = lazy(() => import("./pages/admin/AdminLocationChanges"));

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
            <Route path="/locations" element={<Locations />} />
            <Route path="/rehab-centers" element={<RehabCenters />} />
            <Route path="/rehab-centers/:stateSlug/:citySlug" element={<CityPage />} />
            <Route path="/rehab-centers/:stateSlug" element={<StatePage />} />
            <Route path="/center/:slug" element={<CenterProfile />} />
            <Route path="/treatment-types" element={<TreatmentTypes />} />
            <Route path="/treatment-types/drug-addiction" element={<DrugAddictionTreatment />} />
            <Route path="/treatment-types/alcohol-rehabilitation" element={<AlcoholRehabilitation />} />
            <Route path="/treatment-types/dual-diagnosis" element={<DualDiagnosisTreatment />} />
            <Route path="/treatment-types/residential-inpatient" element={<ResidentialInpatient />} />
            <Route path="/treatment-types/outpatient-programs" element={<OutpatientPrograms />} />
            <Route path="/treatment-types/holistic-therapy" element={<HolisticTherapy />} />
            <Route path="/treatment-types/detox-programs" element={<DetoxPrograms />} />
            <Route path="/treatment-types/detox-programs/:stateSlug" element={<StateDetoxPrograms />} />
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
            <Route path="/provider-faq" element={<ProviderFAQ />} />
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
              <Route path="credentials" element={<AdminCredentials />} />
              <Route path="flagged-images" element={<AdminFlaggedImages />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="security-logs" element={<AdminSecurityLogs />} />
              <Route path="location-changes" element={<AdminLocationChanges />} />
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
